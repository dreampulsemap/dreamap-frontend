// ============================================
// ÇEVİRİ SERVİSİ - Modüler Yapı
// ============================================
// Gelecekte kolayca değiştirebilirsin:
// - groq (şu an, ücretsiz)
// - openai (GPT-4o-mini, ~$0.08/ay)
// - deepl (DeepL Pro, ~$7/ay)
// ============================================

const TRANSLATION_PROVIDER = process.env.TRANSLATION_PROVIDER || 'groq'

// Ana çeviri fonksiyonu
export async function translateText(text, targetLang, type = 'dream') {
  if (TRANSLATION_PROVIDER === 'deepl') {
    return deeplTranslate(text, targetLang)
  }
  
  if (TRANSLATION_PROVIDER === 'openai') {
    return openaiTranslate(text, targetLang)
  }
  
  // Varsayılan: Groq
  return groqTranslate(text, targetLang, type)
}

// Groq ile çeviri (şu anki)
async function groqTranslate(text, targetLang, type) {
  const GROQ_KEY = process.env.GROQ_KEY
  
  const langNames = {
    'tr': 'Turkish', 'en': 'English', 'ru': 'Russian',
    'ar': 'Arabic', 'es': 'Spanish', 'hi': 'Hindi',
    'zh': 'Chinese (Simplified)', 'de': 'German'
  }

  const targetLanguage = langNames[targetLang] || 'Turkish'
  
  const prompt = `Translate to ${targetLanguage}. Maintain tone and emotion. Return ONLY JSON:
{
  "translation": "translated text here"
}

Text: "${text}"`

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
    })

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    return result.translation
  } catch (error) {
    console.error('Groq translation error:', error)
    return text // Hata olursa orijinalini döndür
  }
}

// OpenAI GPT-4o-mini ile çeviri (gelecek)
async function openaiTranslate(text, targetLang) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY
  
  const langNames = {
    'tr': 'Turkish', 'en': 'English', 'ru': 'Russian',
    'ar': 'Arabic', 'es': 'Spanish', 'hi': 'Hindi',
    'zh': 'Chinese (Simplified)', 'de': 'German'
  }

  const targetLanguage = langNames[targetLang] || 'Turkish'

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate to ${targetLanguage}. Return ONLY JSON: {"translation": "text"}`
          },
          {
            role: 'user',
            content: `Translate: "${text}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      })
    })

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    return result.translation
  } catch (error) {
    console.error('OpenAI translation error:', error)
    return text
  }
}

// DeepL ile çeviri (gelecek)
async function deeplTranslate(text, targetLang) {
  const DEEPL_KEY = process.env.DEEPL_API_KEY
  
  // DeepL dil kodları
  const deeplLangs = {
    'tr': 'TR', 'en': 'EN-US', 'ru': 'RU',
    'ar': null, // DeepL Arapça desteklemiyor
    'es': 'ES', 'hi': null, // DeepL Hintçe desteklemiyor
    'zh': 'ZH', 'de': 'DE'
  }

  const targetLangCode = deeplLangs[targetLang]
  
  if (!targetLangCode) {
    console.warn(`DeepL does not support ${targetLang}, falling back to Groq`)
    return groqTranslate(text, targetLang, 'dream')
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
    })

    const data = await response.json()
    return data.translations[0].text
  } catch (error) {
    console.error('DeepL translation error:', error)
    return groqTranslate(text, targetLang, 'dream') // Fallback
  }
        }
