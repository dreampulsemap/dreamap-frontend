import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const MAX_DREAMS = 50 // Reasonable limit
const MAX_DURATION_MS = 45000 // 45s timeout (Vercel limit is 60s)

export default async function handler(req, res) {
  const GROQ_KEY = process.env.GROQ_KEY
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase info missing' })
  }

  const today = new Date().toISOString().split('T')[0]

  try {
    // Check if today's prophecy exists
    const { data: existing } = await supabase
      .from('daily_prophecy')
      .select('*')
      .eq('prophecy_date', today)
      .single()

    if (existing) {
      return res.status(200).json({
        success: true,
        prophecy: existing,
        message: 'Today\'s prophecy already generated'
      })
    }

    if (!GROQ_KEY) {
      return res.status(500).json({ error: 'Groq API key missing' })
    }

    // Get last 7 days of dreams - OPTIMIZED: select only needed columns
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentDreams, error: fetchError } = await supabase
      .from('dreams')
      .select('id, ai_archetypes, ai_sentiment, content')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(MAX_DREAMS) // Add explicit limit

    if (fetchError || !recentDreams || recentDreams.length === 0) {
      console.error('No recent dreams found:', fetchError)
      return res.status(400).json({ error: 'not_enough_dreams' })
    }

    // Analyze archetypes and emotions efficiently
    const archetypeCount = {}
    const emotionCount = {}
    let totalArchetypes = 0

    recentDreams.forEach(dream => {
      if (dream.ai_archetypes && Array.isArray(dream.ai_archetypes)) {
        dream.ai_archetypes.forEach(arch => {
          archetypeCount[arch] = (archetypeCount[arch] || 0) + 1
          totalArchetypes++
        })
      }
      if (dream.ai_sentiment) {
        emotionCount[dream.ai_sentiment] = (emotionCount[dream.ai_sentiment] || 0) + 1
      }
    })

    const dominantArchetype = Object.entries(archetypeCount)
      .sort((a, b) => b[1] - a[1])[0]
    const dominantArchetypeName = dominantArchetype ? dominantArchetype[0] : 'Shadow'
    const dominantArchetypeCount = dominantArchetype ? dominantArchetype[1] : 0
    const archetypePercentage = totalArchetypes > 0
      ? Math.round((dominantArchetypeCount / totalArchetypes) * 100)
      : 0

    const dominantEmotion = Object.entries(emotionCount)
      .sort((a, b) => b[1] - a[1])[0]
    const dominantEmotionName = dominantEmotion ? dominantEmotion[0] : 'Mystery'

    console.log(`📊 Analysis: ${recentDreams.length} dreams, ${totalArchetypes} archetypes`)

    // Call Groq with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), MAX_DURATION_MS)

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are Prophet AI, a Jungian oracle. Return ONLY valid JSON.'
            },
            {
              role: 'user',
              content: `Dominant archetype: ${dominantArchetypeName} (${archetypePercentage}%). Emotion: ${dominantEmotionName}. Create a prophecy.`
            }
          ]
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Groq error: ${response.status}`)
      }

      const data = await response.json()
      const prophecyContent = data?.choices?.[0]?.message?.content || 'A mystery unfolds...'

      const { data: savedProphecy, error: saveError } = await supabase
        .from('daily_prophecy')
        .insert({
          prophecy_date: today,
          prophecy_content: prophecyContent,
          dominant_archetype: dominantArchetypeName,
          dominant_emotion: dominantEmotionName
        })
        .select()
        .single()

      if (saveError) throw saveError

      return res.status(200).json({ success: true, prophecy: savedProphecy })
    } catch (err) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: 'prophecy_generation_timeout' })
      }
      throw err
    }
  } catch (error) {
    console.error('Prophet error:', error)
    return res.status(500).json({ error: error.message })
  }
}
