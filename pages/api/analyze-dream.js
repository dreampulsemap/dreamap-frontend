import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { dreamId, content, language = 'tr' } = req.body

  if (!dreamId || !content) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  const GROQ_KEY = process.env.GROQ_KEY
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!GROQ_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'API anahtarları eksik' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // 8 dilde analiz için prompt
    const languages = {
      tr: 'Turkish',
      en: 'English',
      ru: 'Russian',
      es: 'Spanish',
      ar: 'Arabic',
      hi: 'Hindi',
      zh: 'Chinese',
      de: 'German'
    }

    const prompt = `Analyze this dream using Jungian psychology in ALL 8 languages. Return ONLY valid JSON:

DREAM: "${content}"

Return format:
{
  "archetypes": ["Archetype1", "Archetype2"],
  "sentiment": "Fear|Joy|Sadness|Anger|Peace|Awe|Anxiety|Confusion",
  "summary": {
    "tr": "Türkçe Jungian analiz (2-3 cümle)",
    "en": "English Jungian analysis (2-3 sentences)",
    "ru": "Russian Jungian analysis (2-3 sentences)",
    "es": "Spanish Jungian analysis (2-3 sentences)",
    "ar": "Arabic Jungian analysis (2-3 sentences)",
    "hi": "Hindi Jungian analysis (2-3 sentences)",
    "zh": "Chinese Jungian analysis (2-3 sentences)",
    "de": "German Jungian analysis (2-3 sentences)"
  },
  "motiv": {
    "tr": "Türkçe motivasyon mesajı",
    "en": "English motivational message",
    "ru": "Russian motivational message",
    "es": "Spanish motivational message",
    "ar": "Arabic motivational message",
    "hi": "Hindi motivational message",
    "zh": "Chinese motivational message",
    "de": "German motivational message"
  }
}

Common Jungian archetypes: Shadow, Anima, Animus, Wise Old Man, Great Mother, Hero, Trickster, Self, Persona, Child, Snake, Water, Forest, Door, Tower

Choose 1-3 most relevant archetypes.
Choose ONE dominant sentiment.`

    console.log('Groq API çağrılıyor...')
    
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
            content: 'You are a Jungian psychology expert. Analyze dreams in 8 languages. Return ONLY JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2048,
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
      throw new Error('JSON parse failed')
    }

    // Görsel URL oluştur (daha iyi prompt)
    const archetype = analysis.archetypes?.[0] || 'Dream'
    const sentiment = analysis.sentiment || 'Mysterious'
    const imagePrompt = `${archetype} archetype, ${sentiment} atmosphere, mystical, surreal, dark fantasy art, detailed, cinematic lighting`
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1200&height=630&nologo=true`

    console.log('Görsel URL:', imageUrl)

    // Supabase'e 8 dilde kaydet
    const updates = {
      ai_archetypes: analysis.archetypes || [],
      ai_sentiment: analysis.sentiment || 'Mystery',
      ai_summary: analysis.summary?.[language] || analysis.summary?.en || '',
      ai_summary_en: analysis.summary?.en || '',
      ai_summary_tr: analysis.summary?.tr || '',
      ai_summary_ru: analysis.summary?.ru || '',
      ai_summary_es: analysis.summary?.es || '',
      ai_summary_ar: analysis.summary?.ar || '',
      ai_summary_hi: analysis.summary?.hi || '',
      ai_summary_zh: analysis.summary?.zh || '',
      ai_summary_de: analysis.summary?.de || '',
      ai_motiv: analysis.motiv?.[language] || analysis.motiv?.en || '',
      ai_motiv_en: analysis.motiv?.en || '',
      ai_motiv_tr: analysis.motiv?.tr || '',
      ai_motiv_ru: analysis.motiv?.ru || '',
      ai_motiv_es: analysis.motiv?.es || '',
      ai_motiv_ar: analysis.motiv?.ar || '',
      ai_motiv_hi: analysis.motiv?.hi || '',
      ai_motiv_zh: analysis.motiv?.zh || '',
      ai_motiv_de: analysis.motiv?.de || '',
      ai_image_prompt: imagePrompt,
      ai_image_url: imageUrl
    }

    const { error } = await supabase
      .from('dreams')
      .update(updates)
      .eq('id', dreamId)

    if (error) {
      throw new Error('Supabase güncelleme hatası: ' + error.message)
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
