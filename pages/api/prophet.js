export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_KEY = process.env.GEMINI_KEY;
  
  // Basit test yanıtı (Gemini olmadan)
  const testProphecy = {
    archetype: "Shadow",
    tone: "Introspective",
    prophecy_en: "Today the Shadow archetype is active. Pay attention to your dreams tonight. The unconscious mind seeks to reveal hidden truths through symbolic imagery.",
    prophecy_tr: "Bugün Gölge arketipi aktif. Bu gece rüyalarınıza dikkat edin. Bilinçdışı zihin, sembolik imgeler aracılığıyla gizli gerçekleri ortaya çıkarmak istiyor.",
    prophecy_ru: "Сегодня активен архетип Тени. Обратите внимание на свои сны сегодня вечером. Бессознательный разум стремится раскрыть скрытые истины через символические образы.",
    prophecy_es: "Hoy el arquetipo de la Sombra está activo. Presta atención a tus sueños esta noche. La mente inconsciente busca revelar verdades ocultas a través de imágenes simbólicas.",
    symbol: "dark mirror reflecting inner shadows",
    advice: "Journal your dreams tonight and notice recurring symbols. The Shadow often appears in dreams as dark figures or unknown places."
  };

  // Eğer Gemini key varsa, gerçek API'yi çağır
  if (GEMINI_KEY) {
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
  "prophecy_en": "English prophecy (100-150 words)",
  "prophecy_tr": "Turkish prophecy",
  "prophecy_ru": "Russian prophecy",
  "prophecy_es": "Spanish prophecy",
  "symbol": "Symbolic image description",
  "advice": "Practical advice (50 words)"
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const prophecy = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
      
      return res.status(200).json({ 
        success: true, 
        prophecy,
        source: "Gemini AI"
      });
    } catch (error) {
      console.error('Gemini error:', error);
      // Hata olursa test kehanetini döndür
      return res.status(200).json({ 
        success: true, 
        prophecy: testProphecy,
        source: "Fallback (Gemini error)"
      });
    }
  }

  // Gemini key yoksa test kehanetini döndür
  return res.status(200).json({ 
    success: true, 
    prophecy: testProphecy,
    source: "Test Mode (No Gemini Key)"
  });
}
