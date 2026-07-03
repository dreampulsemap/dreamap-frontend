export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, targetLang } = req.body;

  if (!text || !targetLang) {
    return res.status(400).json({ error: 'Eksik parametreler' });
  }

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'API anahtarı eksik' });
  }

  const prompt = `Translate the following text to ${targetLang}. Maintain the original tone, emotion, and meaning. Do not add any explanations, notes, or quotes. Just return the translated text directly.

Text to translate:
"${text}"`;

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
        max_tokens: 1024
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      const translated = data.choices[0].message.content.trim();
      return res.status(200).json({ translated });
    } else {
      return res.status(500).json({ error: 'Çeviri başarısız oldu' });
    }
  } catch (error) {
    console.error('Çeviri hatası:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
}
