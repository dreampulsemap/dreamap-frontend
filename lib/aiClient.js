/**
 * AI API Client with Timeout & Retry Logic
 */

const DEFAULT_TIMEOUT = 45000 // 45 seconds
const MAX_RETRIES = 2
const RETRY_BACKOFF = 1000 // 1 second

// Code-review fix (reuse): prophet.js ve mental-wall/generate.js aynı
// ```json ... ``` temizleme regex'ini iki ayrı yerde tekrar ediyordu.
// response_format:{type:'json_object'} çoğu modelde bunu zaten önlüyor ama
// tüm sağlayıcılar (ör. Groq) için garanti değil, o yüzden savunma amaçlı
// temizleme burada tek yerde tutuluyor.
export function stripJsonFence(text) {
  if (typeof text !== 'string') return text
  return text.replace(/```json|```/g, '').trim()
}

export async function generateWithAI(prompt, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    maxRetries = MAX_RETRIES,
    model = 'gpt-4o-mini',
    temperature = 0.7
  } = options

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          temperature,
          // response_format olmadan gpt-4o-mini "sadece JSON döndür" talimatına
          // rağmen çoğu zaman çıktıyı ```json ... ``` bloğuna sarıyordu — çağıran
          // taraf (mental-wall/generate.js) ham JSON.parse() yaptığı için bu,
          // her seferinde yakalanmayan bir SyntaxError'a ve dolayısıyla kullanıcıya
          // düz bir HTTP 500 olarak yansıyan "çalışmıyor" hissine yol açıyordu.
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'Return only valid JSON. Be concise and precise.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data?.choices?.[0]?.message?.content
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('AI request timeout')
      }

      if (attempt < maxRetries) {
        await new Promise(resolve =>
          setTimeout(resolve, RETRY_BACKOFF * Math.pow(2, attempt))
        )
        continue
      }

      throw err
    }
  }
}
