import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const MAX_DREAMS = 50 // Reasonable limit
const MAX_DURATION_MS = 45000 // 45s timeout (Vercel limit is 60s)

// Bug #5 kök nedeni: bu route `daily_prophecy` tablosuna INSERT/UPDATE
// yaparken var OLMAYAN kolon adları kullanıyordu ("prophecy_content",
// "dominant_archetype", "dominant_emotion") — gerçek tablo şeması
// (bkz. content_{lang} çok-dilli kolonlar, archetype, sentiment) tamamen
// farklı. Var olmayan bir kolona INSERT etmek Postgres'te "column does not
// exist" hatası fırlatıyor, bu da her çağrıda 500 ile sonuçlanıyordu.
// Ayrıca Android'in gönderdiği "lang" parametresi hiç okunmuyordu.
const SUPPORTED_LANGS = ['en', 'tr', 'ru', 'ar', 'es', 'hi', 'zh', 'de']

function contentColumn(lang) {
  return `content_${SUPPORTED_LANGS.includes(lang) ? lang : 'en'}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const GROQ_KEY = process.env.GROQ_KEY
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase info missing' })
  }

  const { lang: rawLang = 'tr' } = req.body || {}
  const lang = String(rawLang).toLowerCase().split('-')[0]
  const col = contentColumn(lang)

  const today = new Date().toISOString().split('T')[0]

  try {
    // Check if today's prophecy exists
    const { data: existing } = await supabase
      .from('daily_prophecy')
      .select('*')
      .eq('prophecy_date', today)
      .maybeSingle()

    if (existing && existing[col]) {
      return res.status(200).json({
        ok: true,
        success: true,
        prophecy: existing[col],
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

    const LANG_NAME = {
      en: 'English', tr: 'Turkish', ru: 'Russian', ar: 'Arabic',
      es: 'Spanish', hi: 'Hindi', zh: 'Chinese', de: 'German'
    }
    const langName = LANG_NAME[lang] || LANG_NAME.en

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
              content: `You are Prophet AI, a Jungian oracle. Respond ONLY in ${langName}, written as a native speaker would. Return ONLY valid JSON: {"prophecy": "..."}`
            },
            {
              role: 'user',
              content: `Dominant archetype: ${dominantArchetypeName} (${archetypePercentage}%). Emotion: ${dominantEmotionName}. Create a short prophecy in ${langName}.`
            }
          ]
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Groq error: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      const rawContent = data?.choices?.[0]?.message?.content || ''
      let prophecyContent
      try {
        prophecyContent = JSON.parse(rawContent.replace(/```json|```/g, '').trim()).prophecy
      } catch {
        prophecyContent = rawContent.trim()
      }
      if (!prophecyContent) prophecyContent = 'A mystery unfolds...'

      let savedProphecy
      if (existing) {
        // Row for today already exists (another language was generated
        // earlier today) — fill in this language's column instead of
        // inserting a duplicate row (prophecy_date is unique per day).
        const { data: updated, error: updateError } = await supabase
          .from('daily_prophecy')
          .update({ [col]: prophecyContent })
          .eq('id', existing.id)
          .select()
          .single()
        if (updateError) throw updateError
        savedProphecy = updated
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('daily_prophecy')
          .insert({
            prophecy_date: today,
            [col]: prophecyContent,
            archetype: dominantArchetypeName,
            sentiment: dominantEmotionName,
            dream_count: recentDreams.length
          })
          .select()
          .single()
        if (insertError) {
          // prophecy_date UNIQUE çakışması: eş zamanlı bir istek bugünün
          // satırını az önce oluşturmuş olabilir — o satırı bu dil için
          // güncelleyerek devam ediyoruz.
          if (insertError.code === '23505') {
            const { data: raceRow } = await supabase
              .from('daily_prophecy')
              .select('*')
              .eq('prophecy_date', today)
              .single()
            if (raceRow) {
              const { data: updated, error: updateError } = await supabase
                .from('daily_prophecy')
                .update({ [col]: prophecyContent })
                .eq('id', raceRow.id)
                .select()
                .single()
              if (updateError) throw updateError
              savedProphecy = updated
            } else {
              throw insertError
            }
          } else {
            throw insertError
          }
        } else {
          savedProphecy = inserted
        }
      }

      return res.status(200).json({ ok: true, success: true, prophecy: savedProphecy[col] || prophecyContent })
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
