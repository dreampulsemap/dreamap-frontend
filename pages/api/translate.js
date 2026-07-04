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

  const prompt = `You are a PROFESSIONAL translator specializing in dream interpretation and Jungian psychology.

Translate the following dream content and Jungian analysis to ${targetLanguage}.

CRITICAL RULES:
1. MAINTAIN the mystical, poetic tone
2. PRESERVE Jungian terminology (use culturally appropriate translations)
3. Keep the EMOTIONAL DEPTH and psychological nuance
4. Do NOT simplify or summarize - translate fully
5. Use NATIVE, natural-sounding language (not literal word-for-word)
6. For Arabic: Use proper Arabic script and grammar
7. For Chinese: Use simplified Chinese characters
8. For Hindi: Use Devanagari script

DREAM TEXT:
"${dreamText}"

${analysisText ? `JUNGIAN ANALYSIS:
"${analysisText}"` : ''}

Return ONLY valid JSON (no markdown, no explanation):
{
  "dreamTranslation": "Complete ${targetLanguage} translation of the dream",
  "analysisTranslation": "Complete ${targetLanguage} translation of the analysis"
}`;

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
            content: 'You are a professional translator expert in dream interpretation, Jungian psychology, and mystical literature. Provide accurate, nuanced, culturally-sensitive translations that maintain the original tone and depth.' 
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
      console.error('Groq error:', data);
      return res.status(500).json({ error: 'Translation failed' });
    }
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
