import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Doğrudan "başlık + açıklama" metnini görsel modele vermek çok alakasız
// sonuçlar üretiyordu (model, jenerik "vision board" klişelerine — gün
// doğumu, gökyüzüne uzanan eller, ışık huzmeleri — kaçıyordu). Bunun yerine
// önce hedefi SOMUT bir sahneye çeviriyoruz (generate-dream-image.js'deki
// extractDreamScene ile aynı desen), sonra o sahneyi tarif eden bir prompt
// kuruyoruz — modelin hedefin ne olduğunu "anlamasını" sağlıyor.
export async function extractGoalScene(title, description) {
  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: `
You are a behaviour psychologist and social engineer. You convert a personal goal (title + optional description) into a concrete, image-safe visual scene description for a vision-board image.

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

export function buildGoalImagePrompt(scene, fallbackSubject) {
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

// Bir prompt'tan Replicate (Flux) → başarısızsa OpenAI DALL-E 3 fallback'i ile
// TEK bir görsel üretir. Kapak yenileme ve slayt görseli üretimi bunu paylaşır.
export async function generateOneImage(prompt) {
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
