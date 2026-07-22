import OpenAI from 'openai'
import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const CREDIT_COST = 1

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, title: rawTitle, description: rawDescription } = req.body || {}

    let goal = null
    let promptTitle = rawTitle
    let promptDescription = rawDescription

    if (goalId) {
      // MEVCUT AKIŞ: GoalDetailModal'dan — zaten var olan bir hedefin kapağını
      // (yeniden) üretiyoruz, sonucu doğrudan o hedefe kaydediyoruz.
      const { data: existingGoal, error: goalError } = await supabaseAdmin
        .from('goals')
        .select('id, user_id, title, description')
        .eq('id', goalId)
        .single()

      if (goalError || !existingGoal) return res.status(404).json({ error: 'goal_not_found' })
      if (existingGoal.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

      goal = existingGoal
      promptTitle = existingGoal.title
      promptDescription = existingGoal.description
    } else {
      // YENİ AKIŞ: CreateGoalModal'dan — hedef henüz VERİTABANINDA YOK
      // (kullanıcı formu dolduruyor). Bu yüzden goalId de yok. Başlığı
      // doğrudan istek gövdesinden alıyoruz, üretilen görseli hiçbir hedefe
      // kaydetmiyoruz — sadece URL'i döndürüyoruz, istemci onu form
      // state'inde tutup goal oluşturma isteğine ekliyor.
      const cleanTitle = typeof promptTitle === 'string' ? promptTitle.trim() : ''
      if (!cleanTitle) return res.status(400).json({ error: 'title_required' })
    }

    // ATOMİK kredi düşüşü — generate-dream-image.js'deki SELECT-sonra-UPDATE
    // TOCTOU deseni yerine (bkz. migration 005 notu).
    const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_image_credits', {
      p_user_id: user.id,
      p_amount: CREDIT_COST,
    })
    if (spendError) throw spendError
    const spend = spendResult?.[0]
    if (!spend?.success) {
      return res.status(402).json({ error: 'insufficient_credits', cost: CREDIT_COST })
    }

    const promptSubject = promptDescription
      ? `${promptTitle} — ${promptDescription}`
      : promptTitle
    const prompt = `An inspiring, cinematic vision board image representing this personal goal: ${String(promptSubject).slice(0, 200)}. Aspirational, warm light, photorealistic, high-art, no text.`

    let imageUrl = null
    let details = 'Unknown error'

    // PLAN A: Replicate (Flux)
    try {
      const rep = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json', Prefer: 'wait=15' },
        body: JSON.stringify({ input: { prompt, aspect_ratio: '3:4' } }),
      })
      const data = await rep.json()
      if (data.output) imageUrl = data.output[0]
      else details = data.detail || JSON.stringify(data)
    } catch (e) {
      details = e.message
    }

    // PLAN B: OpenAI DALL-E 3 (Fallback)
    if (!imageUrl) {
      try {
        const image = await openai.images.generate({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024' })
        imageUrl = image.data[0].url
      } catch (e) {
        // İkisi de başarısız oldu — krediyi GERİ VER, kullanıcı karşılıksız harcamış olmasın.
        await supabaseAdmin
          .from('user_profiles')
          .update({ image_credits: spend.remaining + CREDIT_COST })
          .eq('id', user.id)
        return res.status(502).json({ error: 'image_generation_failed', details })
      }
    }

    if (goalId) {
      const { data: updatedGoal, error: updateError } = await supabaseAdmin
        .from('goals')
        .update({ cover_image_url: imageUrl, cover_image_source: 'ai_generated' })
        .eq('id', goalId)
        .select('*')
        .single()

      if (updateError) throw updateError
      return res.status(200).json({ goal: updatedGoal, imageUrl, creditsLeft: spend.remaining })
    }

    // Hedef henüz yok — sadece üretilen görseli döndür.
    return res.status(200).json({ imageUrl, creditsLeft: spend.remaining })
  } catch (error) {
    console.error('goals/generate-cover error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
