export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dreamText, analysisText, targetLang } = req.body;

  if (!dreamText || !targetLang) {
    return res.status(400).json({ error: 'Eksik parametreler' });
  }

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'API anahtarı eksik' });
  }

  // Dil kodlarını tam isimlere çevir
  const langNames = {
    'tr': 'Turkish',
    'en': 'English',
    'ru': 'Russian',
    'ar': 'Arabic',
    'es': 'Spanish',
    'hi': 'Hindi',
    'zh': 'Chinese (Simplified)',
    'de': 'German'
  };

  const targetLanguage = langNames[targetLang] || 'Turkish';

  const prompt = `You are a professional translator. Translate the following dream content and Jungian analysis to ${targetLanguage}.

IMPORTANT RULES:
1. Translate BOTH the dream text AND the Jungian analysis
2. Maintain the original tone, emotion, and psychological depth
3. Keep Jungian terminology (Shadow, Anima, Archetype, etc.) in their original form or use commonly accepted translations
4. Do NOT add any explanations, notes, or comments
5. Return ONLY a JSON object with the translations

Dream Text:
"${dreamText}"

${analysisText ? `Jungian Analysis:
"${analysisText}"` : ''}

Return format (JSON):
{
  "dreamTranslation": "translated dream text here",
  "analysisTranslation": "translated analysis text here"
}

If no analysis text provided, set analysisTranslation to null.`;

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
            content: 'You are a professional translator specializing in dream content and Jungian psychology. Provide accurate, natural translations.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      const result = JSON.parse(data.choices[0].message.content);
      
      return res.status(200).json({ 
        translated: result.dreamTranslation,
        analysisTranslated: result.analysisTranslation || null
      });
    } else {
      return res.status(500).json({ error: 'Çeviri başarısız oldu' });
    }
  } catch (error) {
    console.error('Çeviri hatası:', error);
    return res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
  }
}
