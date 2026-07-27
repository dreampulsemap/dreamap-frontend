import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = { maxDuration: 60 };

const REPLICATE_MODEL_URL =
  'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions';

// Bağlantı kopmaları veya geçici ağ hatalarına karşı yeniden deneme (retry) mekanizması
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status < 500) return res;
      if (i === retries - 1) return res;
    } catch (err) {
      if (i === retries - 1) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, backoff * Math.pow(2, i)));
  }
}

function collapseSpaces(str) {
  let result = str;
  while (result.indexOf('  ') !== -1) {
    result = result.split('  ').join(' ');
  }
  return result;
}

function cleanDreamText(text = '') {
  const NEWLINE = String.fromCharCode(10);
  const CARRIAGE = String.fromCharCode(13);
  const TAB = String.fromCharCode(9);

  const replaced = String(text)
    .split(NEWLINE).join(' ')
    .split(CARRIAGE).join(' ')
    .split(TAB).join(' ');

  return collapseSpaces(replaced).trim();
}

function truncateText(text = '', max = 1800) {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max)}...`;
}

async function extractDreamScene(dreamContent) {
  const cleaned = truncateText(cleanDreamText(dreamContent), 1800);

  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: `
You convert dream narratives into image-safe, scene-faithful structured outputs.

Your job:
- Read the user's dream narrative.
- Identify the SINGLE most vivid visual moment.
- Preserve concrete setting, actions, characters, emotional tone, and dreamlike distortions.
- Avoid generic fantasy replacements unless the dream explicitly contains them.
- Do NOT add castles, temples, heavenly clouds, cosmic scenes, wings, floating islands, or glowing portals unless explicitly described.
- Prefer realistic environments with subtle surreal distortion if the dream is grounded.
- Output strict JSON only.

JSON schema:
{
  "scene_title": string,
  "primary_scene": string,
  "setting": string,
  "characters": string,
  "action": string,
  "mood": string,
  "visual_symbols": string[],
  "style_guidance": string,
  "negative_elements": string[],
  "composition_notes": string
}
        `.trim()
      },
      {
        role: 'user',
        content: `Dream narrative:\n${cleaned}`
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'dream_scene_extraction',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            scene_title: { type: 'string' },
            primary_scene: { type: 'string' },
            setting: { type: 'string' },
            characters: { type: 'string' },
            action: { type: 'string' },
            mood: { type: 'string' },
            visual_symbols: {
              type: 'array',
              items: { type: 'string' }
            },
            style_guidance: { type: 'string' },
            negative_elements: {
              type: 'array',
              items: { type: 'string' }
            },
            composition_notes: { type: 'string' }
          },
          required: [
            'scene_title',
            'primary_scene',
            'setting',
            'characters',
            'action',
            'mood',
            'visual_symbols',
            'style_guidance',
            'negative_elements',
            'composition_notes'
          ]
        }
      }
    }
  });

  const raw = response.output_text || '{}';
  return JSON.parse(raw);
}

function buildImagePrompt(scene, originalDream) {
  const symbols = Array.isArray(scene.visual_symbols) && scene.visual_symbols.length
    ? scene.visual_symbols.join(', ')
    : 'subtle dreamlike details';

  const negativeElements = Array.isArray(scene.negative_elements) && scene.negative_elements.length
    ? scene.negative_elements.join(', ')
    : 'castles, temples, heavenly clouds, floating islands, angelic light rays, abstract fantasy landscapes';

  const originalSnippet = truncateText(cleanDreamText(originalDream), 600);

  const prompt = `
Create a single cinematic image that faithfully represents the most vivid moment from this dream.

SCENE TITLE:
${scene.scene_title}

PRIMARY SCENE:
${scene.primary_scene}

SETTING:
${scene.setting}

CHARACTERS:
${scene.characters}

ACTION:
${scene.action}

MOOD:
${scene.mood}

VISUAL SYMBOLS:
${symbols}

COMPOSITION:
${scene.composition_notes}

STYLE:
${scene.style_guidance}

IMPORTANT RULES:
- Stay faithful to the dream's literal events.
- Prefer concrete environments over generic fantasy scenery.
- If the dream is realistic, keep it realistic with only subtle surreal distortion.
- Show narrative tension and recognizably human action.
- Do not replace the dream with an unrelated mystical landscape.
- Avoid symbolic over-interpretation unless visually grounded in the dream.
- No text, watermark, logo, frame, collage, split panel, or multiple scenes in one image.
- One coherent moment only.

NEGATIVE PROMPT:
${negativeElements}

ORIGINAL DREAM FOR REFERENCE:
${originalSnippet}
  `.trim();

  return {
    prompt,
    negativePrompt: negativeElements
  };
}

async function pollPrediction(getUrl, maxWaitMs = 25_000) {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const poll = await fetchWithRetry(getUrl, {
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` }
    });
    const data = await poll.json();

    if (data?.status === 'succeeded') {
      if (Array.isArray(data?.output) && data.output[0]) return data.output[0];
      if (typeof data?.output === 'string') return data.output;
      throw new Error('Replicate succeeded but returned no output');
    }

    if (data?.status === 'failed' || data?.status === 'canceled') {
      throw new Error(data?.error || `Replicate prediction ${data.status}`);
    }
  }

  throw new Error('Replicate prediction timed out while polling');
}

async function generateWithReplicate(prompt, negativePrompt) {
  const rep = await fetchWithRetry(REPLICATE_MODEL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=20'
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: '1:1',
        output_format: 'jpg',
        output_quality: 90,
        go_fast: true,
        prompt_strength: 0.8,
        negative_prompt: negativePrompt
      }
    })
  });

  const data = await rep.json();

  if (!rep.ok) {
    throw new Error(data?.detail || data?.error || JSON.stringify(data));
  }

  if (Array.isArray(data?.output) && data.output[0]) {
    return data.output[0];
  }

  if (typeof data?.output === 'string') {
    return data.output;
  }

  if (data?.urls?.get && (data?.status === 'starting' || data?.status === 'processing')) {
    return pollPrediction(data.urls.get);
  }

  throw new Error(data?.detail || 'Replicate did not return an image URL');
}

async function generateWithOpenAI(prompt) {
  const image = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard'
  });

  const imageUrl = image?.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('OpenAI did not return an image URL');
  }

  return imageUrl;
}

async function refundAuras(userId, amount) {
  const { data, error } = await supabaseAdmin.rpc('refund_auras', {
    p_user_id: userId,
    p_amount: amount
  });

  if (error) {
    throw new Error(`refund_failed: ${error.message}`);
  }

  const refund = data?.[0];
  if (!refund?.success) {
    throw new Error('refund_failed_user_not_found');
  }

  return refund.remaining;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { dreamId } = req.body || {};
    if (!dreamId) {
      return res.status(400).json({ error: 'dream_id_required' });
    }

    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select('*')
      .eq('id', dreamId)
      .single();

    if (dreamError || !dream) {
      return res.status(404).json({ error: 'dream_not_found' });
    }

    if (!dream.content || !String(dream.content).trim()) {
      return res.status(400).json({ error: 'dream_content_empty' });
    }

    const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
      p_user_id: user.id,
      p_amount: 2
    });

    if (spendError) throw spendError;

    const spend = spendResult?.[0];
    if (!spend?.success) {
      return res.status(402).json({ error: 'no_auras' });
    }

    let scene;
    try {
      scene = await extractDreamScene(dream.content);
    } catch (sceneError) {
      try {
        await refundAuras(user.id, 2);
      } catch (refundError) {
        console.error('Refund Error:', refundError);
      }

      return res.status(502).json({
        error: 'scene_extraction_failed',
        details: sceneError.message
      });
    }

    const { prompt, negativePrompt } = buildImagePrompt(scene, dream.content);

    let imageUrl = null;
    let provider = null;
    let generationError = null;

    if (process.env.REPLICATE_API_TOKEN) {
      try {
        imageUrl = await generateWithReplicate(prompt, negativePrompt);
        provider = 'replicate_flux_schnell';
      } catch (err) {
        generationError = err;
      }
    }

    if (!imageUrl) {
      try {
        imageUrl = await generateWithOpenAI(prompt);
        provider = 'openai_dalle_3';
      } catch (err) {
        try {
          await refundAuras(user.id, 2);
        } catch (refundError) {
          console.error('Refund Error:', refundError);
        }

        const details = generationError?.message || err?.message || 'unknown_generation_error';
        return res.status(502).json({
          error: 'image_generation_failed',
          details
        });
      }
    }

    const { error: updateDreamError } = await supabaseAdmin
      .from('dreams')
      .update({
        ai_image_url: imageUrl
      })
      .eq('id', dreamId);

    if (updateDreamError) {
      try {
        await refundAuras(user.id, 2);
      } catch (refundError) {
        console.error('Refund Error:', refundError);
      }

      return res.status(500).json({
        error: 'failed_to_save_image_url',
        details: updateDreamError.message
      });
    }

    return res.status(200).json({
      ok: true,
      imageUrl,
      aurasLeft: spend.remaining,
      provider,
      promptPreview: prompt.slice(0, 700),
      scene
    });
  } catch (error) {
    return res.status(500).json({
      error: 'internal_server_error',
      details: error.message
    });
  }
}
