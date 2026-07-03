import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Hem GET hem POST kabul et (kolay test için)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_KEY = process.env.GEMINI_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase bilgileri eksik' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const today = new Date().toISOString().split('T')[0];

  // Önce bugünün kehaneti var mı kontrol et
  const { data: existing, error: checkError } = await supabase
    .from('daily_prophecy')
    .select('*')
    .eq('prophecy_date', today)
    .single();

  if (existing && !checkError) {
    return res.status(200).json({ 
      success: true, 
      prophecy: existing,
      message: "Bugünün kehaneti zaten var"
    });
  }

  // Gemini API ile kehanet üret
  if (!GEMINI_KEY) {
    // Gemini yoksa test kehaneti kullan
    const testProphecy = {
      prophecy_date: today,
      archetype: "Shadow",
      content_en: "Today the Shadow archetype is active. Pay attention to your dreams tonight. The unconscious mind seeks to reveal hidden truths through symbolic imagery.",
      content_tr: "Bugün Gölge arketipi aktif. Bilinçdışı zihniniz, gizli korkularınızla yüzleşmeniz için size işaretler gönderiyor. Rüyalarınızda karanlık figürler veya bilinmeyen yerler görebilirsiniz.",
      content_ru: "Сегодня активен архетип Тени. Обратите внимание на свои сны сегодня вечером. Бессознательный разум стремится раскрыть скрытые истины через символические образы.",
      content_es: "Hoy el arquetipo de la Sombra está activo. Presta atención a tus sueños esta noche. La mente inconsciente busca revelar verdades ocultas a través de imágenes simbólicas.",
      content_ar: "اليوم نشط archetype الظل. انتبه لأحلامك الليلة. يسعى العقل الباطن للكشف عن الحقائق المخفية من خلال الصور الرمزية.",
      content_hi: "आज छाया archetype सक्रिय है। आज रात अपने सपनों पर ध्यान दें। अवचेतन मन प्रतीकात्मक छवियों के माध्यम से छिपी सच्चाइयों को प्रकट करना चाहता है।",
      content_zh: "今天阴影原型活跃。今晚注意你的梦。潜意识心灵试图通过象征性图像揭示隐藏的真相。",
      content_de: "Heute ist der Schatten-Archetyp aktiv. Achte heute Nacht auf deine Träume. Der unbewusste Geist versucht, verborgene Wahrheiten durch symbolische Bilder zu enthüllen.",
      archetypes: ["Shadow"],
      sentiment: "Introspective",
      ai_advice: "Journal your dreams tonight and notice recurring symbols. The Shadow often appears in dreams as dark figures or unknown places.",
      image_url: "https://image.pollinations.ai/prompt/dark%20mirror%20reflecting%20inner%20shadows?width=768&height=768"
    };

    const { data, error } = await supabase
      .from('daily_prophecy')
      .insert([testProphecy]);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      prophecy: testProphecy,
      message: "Test prophecy created (no Gemini key)"
    });
  }

  // Gemini API ile gerçek kehanet üret
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are Prophet AI, a mystical Jungian oracle. Generate TODAY'S collective dream prophecy.

Create a powerful, poetic prophecy that includes:
1. The dominant Jungian archetype active today (Shadow/Anima/Animus/Self/Persona/etc.)
2. The collective emotional tone
3. A warning or guidance for dreamers
4. A symbolic image description
5. Specific advice for working with dreams today

Make it MYSTICAL, DEEP, and ACTIONABLE. Not generic horoscope - real Jungian wisdom.

Return ONLY a JSON object:
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON'u ayıkla
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Gemini');
    }

    const prophecy = JSON.parse(jsonMatch[0]);
    
    // Görsel URL oluştur
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prophecy.symbol || 'mystical dream')}`;

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

    const { data, error } = await supabase
      .from('daily_prophecy')
      .insert([dbProphecy]);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      prophecy: dbProphecy,
      message: "Prophecy generated with Gemini AI"
    });
  } catch (error) {
    console.error('Gemini error:', error);
    
    // Hata olursa test kehaneti kullan
    const fallbackProphecy = {
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
      ai_advice: "Journal your dreams tonight.",
      image_url: "https://image.pollinations.ai/prompt/dark%20mirror?width=768&height=768"
    };

    const { data, error: dbError } = await supabase
      .from('daily_prophecy')
      .insert([fallbackProphecy]);

    if (dbError) {
      return res.status(500).json({ error: dbError.message });
    }

    return res.status(200).json({ 
      success: true, 
      prophecy: fallbackProphecy,
      message: "Fallback prophecy created (Gemini error)"
    });
  }
}
