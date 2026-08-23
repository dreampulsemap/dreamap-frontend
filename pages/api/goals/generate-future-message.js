import OpenAI from 'openai'
import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// summaries/generate.js ile aynı liste — ham dil kodu yerine gerçek dil adı
// kullanmak modelin çok daha iyi uyduğu bir desen.
const LANG_NAME = {
  en: 'English', tr: 'Turkish', es: 'Spanish', fr: 'French',
  de: 'German', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
  ar: 'Arabic', hi: 'Hindi', zh: 'Chinese',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, force } = req.body || {}
    if (!goalId) return res.status(400).json({ error: 'goal_id_required' })

    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id, title, description, target_date, ai_future_message')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) return res.status(404).json({ error: 'goal_not_found' })
    // Sadece sahibi üretebilir — description gibi ham içerik prompt'a giriyor,
    // başka bir kullanıcının hedefine karşı tetiklenebilir bir uç olmamalı.
    if (goal.user_id !== user.id) return res.status(403).json({ error: 'forbidden' })

    // goals/create.js'te olmayan bir maliyet koruması: mesaj zaten üretilmişse
    // ve force geçilmemişse tekrar AI çağırma, olanı döndür. Bir goal'ın
    // başlığı/açıklaması summaries'teki rüya penceresi gibi sık değişmiyor,
    // o yüzden zaman tabanlı değil "zaten var mı" tabanlı — daha basit ve
    // bu durumda daha doğru.
    if (goal.ai_future_message && !force) {
      return res.status(200).json({ ok: true, goal })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('language')
      .eq('id', user.id)
      .maybeSingle()
    const lang = (profile?.language || 'en').toLowerCase()
    const langName = LANG_NAME[lang] || LANG_NAME.en

    const prompt = `A person is working toward this goal:

Title: ${goal.title}
${goal.description ? `Description: ${goal.description}` : ''}
${goal.target_date ? `Target date: ${goal.target_date}` : ''}

Write ONE short, evocative sentence in native ${langName} (not a translation — write as a native speaker would), spoken as if from this person's future self who has already achieved the goal, addressed directly to them right now. Warm, specific to what they're actually pursuing, not generic manifestation-speak. Max 25 words.

Return ONLY JSON: {"message": "..."}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    })

    let aiResult
    try {
      aiResult = JSON.parse(completion.choices[0].message.content)
    } catch {
      return res.status(500).json({ error: 'invalid_json_from_model' })
    }

    const message = typeof aiResult.message === 'string' ? aiResult.message.trim() : ''
    if (!message) return res.status(500).json({ error: 'empty_message_from_model' })

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('goals')
      .update({ ai_future_message: message })
      .eq('id', goalId)
      .select('*')
      .single()

    if (updateError) throw updateError

    return res.status(200).json({ ok: true, goal: updated })
  } catch (error) {
    console.error('goals/generate-future-message error:', error)
    return res.status(500).json({ ok: false, error: error.message || 'internal_error' })
  }
}
