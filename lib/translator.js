// ============================================
// ÇEVİRİ SERVİSİ - Modüler Yapı
// ============================================

const TRANSLATION_PROVIDER = process.env.TRANSLATION_PROVIDER || 'groq'

export async function translateText(text, targetLang, type = 'dream') {
  if (TRANSLATION_PROVIDER === 'deepl') {
    return deeplTranslate(text, targetLang)
  }
  
  if (TRANSLATION_PROVIDER === 'openai') {
    return openaiTranslate(text, targetLang)
  }
  
  // Varsayılan: Groq (ücretsiz)
  return groqTranslate(text, targetLang, type)
}

// Groq ile çeviri (şu anki, ücretsiz)
async function groqTranslate(text, targetLang, type) {
  const GROQ_KEY = process.env.GROQ_KEY
  
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

Translate the following ${type === 'analysis' ? 'Jungian analysis' : 'dream content'} to ${targetLanguage}.

CRITICAL RULES:
1. MAINTAIN the mystical, poetic tone
2. PRESERVE Jungian terminology
3. Keep the EMOTIONAL DEPTH
4. Use NATIVE, natural-sounding language
5. For Arabic: Use proper Arabic script
6. For Chinese: Use simplified Chinese characters
7. For Hindi: Use Devanagari script

TEXT:
"${text}"

Return ONLY JSON: {"translation": "complete translation"}`;

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
            content: 'You are a professional translator expert in dream interpretation, Jungian psychology, and mystical literature.' 
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
      return result.translation;
    }
    return text;
  } catch (error) {
    console.error('Groq translation error:', error);
    return text;
  }
}

// OpenAI ile çeviri (düşük maliyetli)
async function openaiTranslate(text, targetLang) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY
  const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  
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

Translate to ${targetLanguage}.

RULES:
1. MAINTAIN mystical, poetic tone
2. PRESERVE Jungian terminology
3. Keep EMOTIONAL DEPTH
4. Use NATIVE language
5. For Arabic: proper script
6. For Chinese: simplified characters
7. For Hindi: Devanagari script

TEXT:
"${text}"

Return ONLY JSON: {"translation": "complete translation"}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,  // Değişken model
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional translator expert in dream interpretation, Jungian psychology, and mystical literature.' 
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
      return result.translation;
    }
    return text;
  } catch (error) {
    console.error('OpenAI translation error:', error);
    return text;
  }
}

// DeepL ile çeviri (gelecek)
async function deeplTranslate(text, targetLang) {
  const DEEPL_KEY = process.env.DEEPL_API_KEY
  
  const deeplLangs = {
    'tr': 'TR', 'en': 'EN-US', 'ru': 'RU',
    'ar': null, 'es': 'ES', 'hi': null,
    'zh': 'ZH', 'de': 'DE'
  };

  const targetLangCode = deeplLangs[targetLang];
  
  if (!targetLangCode) {
    console.warn(`DeepL does not support ${targetLang}, falling back to Groq`);
    return groqTranslate(text, targetLang, 'dream');
  }

  try {
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLangCode
      })
    });

    const data = await response.json();
    return data.translations[0].text;
  } catch (error) {
    console.error('DeepL translation error:', error);
    return groqTranslate(text, targetLang, 'dream');
  }
}
