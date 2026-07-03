export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dreamText, analysisText, targetLang } = req.body;

  if (!dreamText || !targetLang) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'API key missing' });
  }

  const langNames = {
    'tr': 'Turkish', 'en': 'English', 'ru': 'Russian',
    'ar': 'Arabic', 'es': 'Spanish', 'hi': 'Hindi',
    'zh': 'Chinese (Simplified)', 'de': 'German'
  };

  const targetLanguage = langNames[targetLang] || 'Turkish';

  const prompt = `Translate the following to ${targetLanguage}. Maintain tone and emotion. Return ONLY JSON:
{
  "dreamTranslation": "translated dream",
  "analysisTranslation": "translated analysis"
}

Dream: "${dreamText}"
${analysisText ? `Analysis: "${analysisText}"` : ''}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
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
    }
    
    return res.status(500).json({ error: 'Translation failed' });
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
