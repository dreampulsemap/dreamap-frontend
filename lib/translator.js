// ============================================
// ÇEVİRİ SERVİSİ - Modüler Yapı
// ============================================

// fr/pt/ja bu haritada YOKTU ve bilinmeyen bir dil sessizce 'Turkish'e
// dusuyordu — yani Fransizca'ya cevir dendiginde Turkce metin donuyordu.
// Tek bir yerde tutuluyor; desteklenmeyen dil artik cevrilmeden geri
// donuyor (bkz. translateText).
export const LANG_NAMES = {
  en: 'English',
  tr: 'Turkish',
  ru: 'Russian',
  ar: 'Arabic',
  es: 'Spanish',
  hi: 'Hindi',
  zh: 'Chinese (Simplified)',
  de: 'German',
  fr: 'French',
  pt: 'Portuguese',
  ja: 'Japanese',
}

const TRANSLATION_PROVIDER = process.env.TRANSLATION_PROVIDER || 'groq'

export async function translateText(text, targetLang, type = 'dream') {
  // Desteklenmeyen hedef dilde ceviri denemek yerine kaynagi aynen don:
  // yanlis dilde metin gostermektense orijinali gostermek dogru.
  if (!LANG_NAMES[targetLang]) return text

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
  
  const langNames = LANG_NAMES;

  const targetLanguage = langNames[targetLang]

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
        // llama-3.1-8b-instant Groq'da 16 Ağustos 2026'da (free/developer tier)
        // kullanımdan kaldırıldı — her çağrı "model_not_found" 404 ile
        // başarısız oluyordu. Groq'un resmi önerdiği yerine geçen model
        // openai/gpt-oss-20b.
        model: 'openai/gpt-oss-20b',
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
  
  const langNames = LANG_NAMES;

  const targetLanguage = langNames[targetLang]

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

/**
 * Bir nesnedeki tum metin alanlarini TEK bir cagride hedef dile cevirir.
 * analyze-dream 5 alani 10 dile cevirmek zorunda; alan basina ayri istek
 * 50'yi asar ve Vercel'in 60sn tavanina sigmaz.
 *
 * Herhangi bir hata/eksik alan durumunda o alan icin kaynak metin aynen
 * doner — cagiran taraf icin davranis her zaman "en kotu ihtimalle
 * cevrilmemis", asla bos degil.
 */
export async function translateFields(fields, targetLang, { sourceLang = null } = {}) {
  const entries = Object.entries(fields).filter(([, v]) => typeof v === 'string' && v.trim())
  if (!entries.length) return { ...fields }
  if (!LANG_NAMES[targetLang]) return { ...fields }

  const GROQ_KEY = process.env.GROQ_KEY
  if (!GROQ_KEY) return { ...fields }

  const source = Object.fromEntries(entries)
  const from = sourceLang && LANG_NAMES[sourceLang] ? ` from ${LANG_NAMES[sourceLang]}` : ''
  const prompt = `Translate every value in this JSON object${from} into ${LANG_NAMES[targetLang]}.

RULES:
- Keep the JSON keys exactly as they are. Translate only the values.
- "simple" must stay plain, everyday language — short sentences, no jargon, no poetry.
- The other fields are a Jungian dream reading: keep the evocative tone and the terminology.
- Write natural, idiomatic ${LANG_NAMES[targetLang]}, not word-for-word translation.
- Use the correct script (Arabic script for Arabic, Devanagari for Hindi, simplified characters for Chinese).

JSON:
${JSON.stringify(source)}

Return ONLY the translated JSON object, same keys.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'You are a professional translator. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content
    if (!raw) return { ...fields }

    const parsed = JSON.parse(raw)
    const out = { ...fields }
    let echoed = 0
    for (const [k, v] of entries) {
      const t = typeof parsed?.[k] === 'string' ? parsed[k].trim() : ''
      if (!t) {
        out[k] = v
        continue
      }
      // Model bazen (ozellikle tr -> zh/ja) metni cevirmeden aynen geri
      // veriyor ve hicbir hata firlatmadigi icin bu sessizce geciyordu.
      if (t === v.trim()) echoed += 1
      out[k] = t
    }

    if (echoed === entries.length) {
      console.warn(`translateFields(${targetLang}): model echoed the source, retrying once`)
      return { ...fields, __echoed: true }
    }

    return out
  } catch (error) {
    console.error(`translateFields(${targetLang}) failed:`, error.message)
    return { ...fields }
  }
}

/** translateFields + echo durumunda bir kez daha dene. */
export async function translateFieldsWithRetry(fields, targetLang, opts = {}) {
  const first = await translateFields(fields, targetLang, opts)
  if (!first.__echoed) return first
  delete first.__echoed
  const second = await translateFields(fields, targetLang, opts)
  delete second.__echoed
  return second
}
