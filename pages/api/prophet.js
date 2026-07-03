import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_KEY = process.env.GEMINI_KEY;
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'Gemini API key eksik' });
  }

  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  // Jungian kehanet prompt'u
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
  "prophecy_en": "English prophecy (100-150 words)",
  "prophecy_tr": "Turkish prophecy",
  "prophecy_ru": "Russian prophecy",
  "prophecy_es": "Spanish prophecy",
  "symbol": "Symbolic image description",
  "advice": "Practical advice (50 words)"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON'u ayıkla
    const prophecy = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    
    // Bugünün tarihini ekle
    const today = new Date().toISOString().split('T')[0];
    
    // Veritabanına kaydet (Supabase)
    const { supabase } = await import('@supabase/supabase-js');
    const supabaseClient = supabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabaseClient
      .from('daily_prophecy')
      .insert([{
        prophecy_date: today,
        content_en: prophecy.prophecy_en,
        content_tr: prophecy.prophecy_tr,
        content_ru: prophecy.prophecy_ru,
        content_es: prophecy.prophecy_es,
        archetypes: [prophecy.archetype],
        sentiment: prophecy.tone,
        image_url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prophecy.symbol)}?width=768&height=768`,
      }]);

    if (error) throw error;

    return res.status(200).json({ success: true, prophecy });
  } catch (error) {
    console.error('Prophet AI error:', error);
    return res.status(500).json({ error: error.message });
  }
}
