import OpenAI from 'openai'
import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { persistRemoteImage } from '@/lib/persistRemoteImage'

export const config = { maxDuration: 60 }

const AURA_COST = 2 // generate-dream-image.js'deki tekli görsel üretim maliyetiyle tutarlı
// Yeni bir vizyon oluşturulurken (goalId YOK) AI artık tek bir kapak değil,
// başlangıç slayt destesi üretiyor — bkz. handler'daki dallanma.
const SLIDE_IMAGE_COUNT = 3

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Doğrudan "başlık + açıklama" metnini görsel modele vermek çok alakasız
// sonuçlar üretiyordu (model, jenerik "vision board" klişelerine — gün
// doğumu, gökyüzüne uzanan eller, ışık huzmeleri — kaçıyordu). Bunun yerine
// önce hedefi SOMUT bir sahneye çeviriyoruz (generate-dream-image.js'deki
// extractDreamScene ile aynı desen), sonra o sahneyi tarif eden bir prompt
// kuruyoruz — modelin hedefin ne olduğunu "anlamasını" sağlıyor.
async function extractGoalScene(title, description) {
  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: `
You are a behaviour psychologist and social engineer. You convert a personal goal (title + optional description) into a concrete, image-safe visual scene description for a vision-board cover image.

Your job:
- Identify what this goal is LITERALLY about (a skill, an object, a place, an
  activity, a milestone, a lifestyle change, etc).
- Describe ONE concrete, specific, photographable moment that represents
  someone actively living or achieving this exact goal — not an abstract
  metaphor for "achievement" in general.
- Create images which will make people want to see more.
- Prefer showing the real subject matter of the goal (the actual instrument,
  the actual sport, the actual place, the actual object, the actual activity)
  over generic symbolism.
- AVOID generic vision-board clichés unless the goal is literally about them:
  no sunrises over mountains, no silhouettes with arms raised, no hands
  reaching for glowing light, no vague "success" imagery, no glowing paths,
  no abstract galaxies/cosmic backgrounds.
- If the goal is abstract (e.g. "inner peace", "more confidence"), ground it
  in one concrete, everyday, human scene that visibly implies that state,
  rather than a mystical/abstract one.
- Be optimistic 
- Output strict JSON only.

JSON schema:
{
  "concrete_subject": string,
  "primary_scene": string,
  "setting": string,
  "subject_action": string,
  "mood": string,
  "key_visual_elements": string[],
  "negative_elements": string[]
}
        `.trim()
      },
      {
        role: 'user',
        content: `Goal title: ${String(title || '').slice(0, 200)}\nGoal description: ${String(description || '').slice(0, 600)}`
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'goal_scene_extraction',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            concrete_subject: { type: 'string' },
            primary_scene: { type: 'string' },
            setting: { type: 'string' },
            subject_action: { type: 'string' },
            mood: { type: 'string' },
            key_visual_elements: { type: 'array', items: { type: 'string' } },
            negative_elements: { type: 'array', items: { type: 'string' } }
          },
          required: [
            'concrete_subject',
            'primary_scene',
            'setting',
            'subject_action',
            'mood',
            'key_visual_elements',
            'negative_elements'
          ]
        }
      }
    }
  })

  const raw = response.output_text || '{}'
  return JSON.parse(raw)
}

function buildGoalImagePrompt(scene, fallbackSubject) {
  if (!scene) {
    return `An inspiring, cinematic vision board image representing this personal goal: ${String(fallbackSubject).slice(0, 200)}. Aspirational, warm light, photorealistic, high-art, no text.`
  }

  const elements = Array.isArray(scene.key_visual_elements) && scene.key_visual_elements.length
    ? scene.key_visual_elements.join(', ')
    : 'concrete, goal-specific details'

  const negativeElements = Array.isArray(scene.negative_elements) && scene.negative_elements.length
    ? scene.negative_elements.join(', ')
    : 'sunrise over mountains, silhouette with raised arms, hands reaching for light, glowing paths, abstract cosmic backgrounds, generic motivational stock imagery'

  return `
A cinematic, photorealistic image representing this exact personal goal: ${scene.concrete_subject}.

SCENE:
${scene.primary_scene}

SETTING:
${scene.setting}

SUBJECT / ACTION:
${scene.subject_action}

MOOD:
${scene.mood}

KEY VISUAL ELEMENTS TO INCLUDE:
${elements}

STYLE:
Warm natural light, photorealistic, high production value, single coherent moment, no text, no watermark, no collage, no split panels.

AVOID:
${negativeElements}
  `.trim()
}

// Replicate (Flux) → başarısızsa OpenAI DALL-E 3 fallback'i ile TEK bir görsel
// üretir. Hem tekli kapak akışı hem de çoklu slayt akışı bunu kullanıyor.
async function generateOneImage(prompt) {
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
      return { imageUrl: null, details: e.message }
    }
  }

  return { imageUrl, details: null }
}

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

    // ATOMİK aura düşüşü — image_credits yerine Aura kullanıyoruz (kullanıcının
    // zaten bol bulunan ve rüya analizi/görsel üretiminde alıştığı para birimi;
    // image_credits ayrı ve neredeyse hiç bakiyesi olmayan bir sistemdi, kafa
    // karıştırıyordu). generate-dream-image.js'deki TOCTOU deseni yerine
    // (bkz. migration 005) atomik RPC kullanıyoruz.
    // Mevcut hedefin kapağını yenilerken 1 görsel, yeni vizyon için başlangıç
    // slayt destesi üretirken SLIDE_IMAGE_COUNT kadar görsel — maliyet buna göre.
    const imageCount = goalId ? 1 : SLIDE_IMAGE_COUNT
    const totalCost = AURA_COST * imageCount

    const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
      p_user_id: user.id,
      p_amount: totalCost,
    })
    if (spendError) throw spendError
    const spend = spendResult?.[0]
    if (!spend?.success) {
      return res.status(402).json({ error: 'insufficient_auras', cost: totalCost })
    }

    const promptSubject = promptDescription
      ? `${promptTitle} — ${promptDescription}`
      : promptTitle

    let scene = null
    try {
      scene = await extractGoalScene(promptTitle, promptDescription)
    } catch (e) {
      console.error('goals/generate-cover scene extraction error:', e)
      // sahne çıkarımı başarısız olursa eski jenerik prompt'a düşüyoruz —
      // görsel üretimi tamamen durmasın diye.
    }
    const prompt = buildGoalImagePrompt(scene, promptSubject)

    // Aynı prompt'tan paralel N üretim — Flux/DALL-E stokastik olduğu için
    // aynı prompt bile her seferinde farklı bir kompozisyon veriyor, bu yüzden
    // sahneyi N kere farklılaştırmaya gerek yok (1 GPT çağrısı + N görsel).
    const generations = await Promise.all(
      Array.from({ length: imageCount }, () => generateOneImage(prompt))
    )

    const succeeded = generations.filter((g) => g.imageUrl)
    const failedCount = imageCount - succeeded.length

    if (succeeded.length === 0) {
      // Hiçbiri başarılı olmadı — krediyi TAMAMEN GERİ VER.
      await supabaseAdmin
        .from('user_profiles')
        .update({ premium_analysis_auras: spend.remaining + totalCost })
        .eq('id', user.id)
      return res.status(502).json({ error: 'image_generation_failed', details: generations[0]?.details })
    }

    if (failedCount > 0) {
      // Kısmi başarı — sadece başarısız olanların bedelini iade et.
      const { data: refreshed } = await supabaseAdmin
        .from('user_profiles')
        .select('premium_analysis_auras')
        .eq('id', user.id)
        .single()
      const currentBalance = Number(refreshed?.premium_analysis_auras ?? spend.remaining)
      await supabaseAdmin
        .from('user_profiles')
        .update({ premium_analysis_auras: currentBalance + AURA_COST * failedCount })
        .eq('id', user.id)
    }

    // Sağlayıcı URL'leri (Replicate/DALL-E) geçicidir — kullanıcının kendi
    // yüklediği kapaklarla aynı bucket'a (goal-covers) kalıcı olarak
    // kopyalıyoruz, yol deseni de CreateGoalModal'daki istemci yüklemesiyle
    // aynı (${userId}/${timestamp}-${i}.ext).
    const persistedUrls = await Promise.all(
      succeeded.map((g, i) =>
        persistRemoteImage(g.imageUrl, { bucket: 'goal-covers', path: `${user.id}/${Date.now()}-${i}.jpg` })
      )
    )

    const { data: freshProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('premium_analysis_auras')
      .eq('id', user.id)
      .single()
    const aurasLeft = Number(freshProfile?.premium_analysis_auras ?? spend.remaining)

    if (goalId) {
      const { data: updatedGoal, error: updateError } = await supabaseAdmin
        .from('goals')
        .update({ cover_image_url: persistedUrls[0], cover_image_source: 'ai_generated' })
        .eq('id', goalId)
        .select('*')
        .single()

      if (updateError) throw updateError
      return res.status(200).json({ goal: updatedGoal, imageUrl: persistedUrls[0], aurasLeft })
    }

    // Hedef henüz yok — üretilen görsel(ler)i döndür. İstemci ilkini kapak
    // olarak kullanıp hepsini goal oluştuktan sonra otomatik slayt olarak ekliyor.
    return res.status(200).json({ images: persistedUrls, aurasLeft })
  } catch (error) {
    console.error('goals/generate-cover error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
