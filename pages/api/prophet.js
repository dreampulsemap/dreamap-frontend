export default async function handler(req, res) {
  const GROQ_KEY = process.env.GROQ_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase bilgileri eksik' });
  }

  // Supabase client oluştur
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const today = new Date().toISOString().split('T')[0];

  // Önce bugünün kehaneti var mı kontrol et
  const { data: existing } = await supabase
    .from('daily_prophecy')
    .select('*')
    .eq('prophecy_date', today)
    .single();

  if (existing) {
    return res.status(200).json({ 
      success: true, 
      prophecy: existing,
      message: "Bugünün kehaneti zaten var"
    });
  }

  // Groq API ile kehanet üret
  const prompt = `You are Prophet AI, a mystical Jungian oracle. Generate TODAY'S collective dream prophecy.

Create a powerful, poetic prophecy that includes:
1. The dominant Jungian archetype active today (Shadow/Anima/Animus/Self/Persona/etc.)
2. The collective emotional tone
3. A warning or guidance for dreamers
4. A symbolic image description
5. Specific advice for working with dreams today

Make it MYSTICAL, DEEP, and ACTIONABLE. Not generic horoscope - real Jungian wisdom.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "archetype": "Main archetype",
  "tone": "Emotional tone",
  "content_en": "English prophecy (100-150 words)",
  "content_tr": "Turkish prophecy",
  "content_ru": "Russian prophecy",
  "content_es": "Spanish prophecy",
  "content_ar": "Arabic prophecy",
  "content_hi": "Hindi prophecy",
  "content_zh": "Chinese prophecy",
  "content_de": "German prophecy",
  "symbol": "Symbolic image description (for AI image generation)",
  "ai_advice": "Practical advice (50 words)"
}`;

  if (!GROQ_KEY) {
    // Groq key yoksa test kehaneti kullan
    const testProphecy = {
      prophecy_date: today,
      archetype: "Shadow",
      content_en: "Today the Shadow archetype is active. Pay attention to your dreams tonight.",
      content_tr: "Bugün Gölge arketipi aktif. Bu gece rüyalarınıza dikkat edin.",
      content_ru: "Сегодня активен архетип Тени.",
      content_es: "Hoy el arquetipo de la Sombra está activo.",
      content_ar: "اليوم نشط archetype الظل.",
      content_hi: "आज छाया archetype सक्रिय है।",
      content_zh: "今天阴影原型活跃。",
      content_de: "Heute ist der Schatten-Archetyp aktiv.",
      archetypes: ["Shadow"],
      sentiment: "Introspective",
      ai_advice: "Bu gece rüyalarınızı not edin.",
      image_url: "https://image.pollinations.ai/prompt/dark%20mirror?width=768&height=768"
    };

    await supabase.from('daily_prophecy').insert([testProphecy]);

    return res.status(200).json({ 
      success: true, 
      prophecy: testProphecy,
      message: "Test prophecy (no Groq key)"
    });
  }

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
            content: 'You are a mystical Jungian oracle. Return ONLY valid JSON, no markdown, no code blocks.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Groq API yanıt vermedi');
    }

    const prophecy = JSON.parse(data.choices[0].message.content);
    
    // Görsel URL oluştur
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prophecy.symbol || 'mystical dream')}?width=768&height=768`;

    // Veritabanına kaydet
    const dbProphecy = {
      prophecy_date: today,
      archetype: prophecy.archetype,
      content_en: prophecy.content_en,
      content_tr: prophecy.content_tr,
      content_ru: prophecy.content_ru,
      content_es: prophecy.content_es,
      content_ar: prophecy.content_ar,
      content_hi: prophecy.content_hi,
      content_zh: prophecy.content_zh,
      content_de: prophecy.content_de,
      archetypes: [prophecy.archetype],
      sentiment: prophecy.tone,
      ai_advice: prophecy.ai_advice,
      image_url: imageUrl
    };

    const { error } = await supabase.from('daily_prophecy').insert([dbProphecy]);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      prophecy: dbProphecy,
      message: "Prophecy generated with Groq AI"
    });
  } catch (error) {
    console.error('Groq error:', error);
    
    // Hata olursa test kehaneti kullan
    const fallbackProphecy = {
      prophecy_date: today,
      archetype: "Shadow",
      content_en: "Today the Shadow archetype is active.",
      content_tr: "Bugün Gölge arketipi aktif.",
      content_ru: "Сегодня активен архетип Тени.",
      content_es: "Hoy el arquetipo de la Sombra está activo.",
      content_ar: "اليوم نشط archetype الظل.",
      content_hi: "आज छाया archetype सक्रिय है।",
      content_zh: "今天阴影原型活跃。",
      content_de: "Heute ist der Schatten-Archetyp aktiv.",
      archetypes: ["Shadow"],
      sentiment: "Introspective",
      ai_advice: "Bu gece rüyalarınızı not edin.",
      image_url: "https://image.pollinations.ai/prompt/dark%20mirror?width=768&height=768"
    };

    await supabase.from('daily_prophecy').insert([fallbackProphecy]);

    return res.status(200).json({ 
      success: true, 
      prophecy: fallbackProphecy,
      message: "Fallback prophecy (Groq error)"
    });
  }
}
