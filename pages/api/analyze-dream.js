import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { dreamId, content } = req.body

  if (!dreamId || !content) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  const GROQ_KEY = process.env.GROQ_KEY
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!GROQ_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'API anahtarları eksik' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  try {
    // Groq ile AI analizi
    const prompt = `Analyze this dream using Jungian psychology. Return ONLY valid JSON (no markdown, no backticks):

DREAM: "${content}"

Return format:
{
  "archetypes": ["Archetype1", "Archetype2"],
  "sentiment": "Fear|Joy|Sadness|Anger|Peace|Awe|Anxiety|Confusion|Surprise|Disgust|Mystery|Introspective",
  "summary": "Jungian analysis in 2-3 sentences"
}

Common Jungian archetypes: Shadow, Anima, Animus, Wise Old Man, Great Mother, Hero, Trickster, Self, Persona, Child, Snake, Water, Forest, Door, Tower

Choose the MOST RELEVANT archetypes (1-3 max).
Choose ONE dominant sentiment.`

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
            content: 'You are a Jungian psychology expert. Analyze dreams using archetypes and collective unconscious theory. Return ONLY JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: 'json_object' }
      })
    })

    const data = await response.json()
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Groq API yanıt vermedi')
    }

    const content2 = data.choices[0].message.content.trim()
    const cleanContent = content2.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    
    let analysis
    try {
      analysis = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw content:', content2)
      throw new Error('JSON parse failed')
    }

    // Görsel URL oluştur (Pollinations AI)
    const imagePrompt = `${analysis.archetypes?.[0] || 'Dream'} archetype mystical surreal ${analysis.sentiment || 'mysterious'} atmosphere`
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}`

    // Supabase'e kaydet
    const { error } = await supabase
      .from('dreams')
      .update({
        ai_archetypes: analysis.archetypes || [],
        ai_sentiment: analysis.sentiment || 'Mystery',
        ai_summary: analysis.summary || '',
        ai_image_url: imageUrl
      })
      .eq('id', dreamId)

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      analysis: analysis,
      imageUrl: imageUrl
    })
  } catch (error) {
    console.error('Analyze error:', error)
    return res.status(500).json({ error: 'Analiz hatası: ' + error.message })
  }
                                 }
