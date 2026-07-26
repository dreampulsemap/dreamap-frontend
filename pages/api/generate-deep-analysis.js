import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

function buildSceneExtractionPrompt(dreamText) {
  return `
You are an expert visual scene extractor for dream-to-image generation.

Your task is to convert a dream into ONE single vivid visual scene for image generation.

RULES:
1. Return JSON only.
2. Output must be in English.
3. Choose the single most visually concrete and narratively important moment.
4. Stay faithful to the literal events of the dream.
5. Do not invent castles, clouds, temples, celestial scenes, fantasy landscapes, angels, cosmic symbolism, or mystical scenery unless explicitly present in the dream.
6. If the dream is mundane, keep it mundane but visually strong.
7. Focus on place, action, tension, characters, and mood.
8. Prefer one frozen cinematic moment rather than a collage of many scenes.

Return this JSON shape:
{
  "scene_title": "",
  "scene_description": "",
  "characters": [],
  "location": "",
  "mood": "",
  "important_objects": [],
  "negative_prompt": ""
}

Dream:
${dreamText}
  `.trim();
}

function buildImagePrompt(sceneData) {
  const description = cleanDreamText(sceneData?.scene_description || '');
  const location = cleanDreamText(sceneData?.location || '');
  const mood = cleanDreamText(sceneData?.mood || '');
  const characters = Array.isArray(sceneData?.characters) ? sceneData.characters.join(', ') : '';
  const objects = Array.isArray(sceneData?.important_objects) ? sceneData.important_objects.join(', ') : '';
  const negativePrompt = cleanDreamText(sceneData?.negative_prompt || '');

  return [
    'A visually coherent cinematic dream scene, faithful to the literal dream content.',
    description,
    location ? `Location: ${location}.` : '',
    characters ? `Characters present: ${characters}.` : '',
    objects ? `Important objects: ${objects}.` : '',
    mood ? `Emotional atmosphere: ${mood}.` : '',
    'Realistic or subtly surreal only if needed by the dream logic.',
    'Strong narrative composition, clear subject, grounded environment, detailed storytelling moment.',
    'No generic fantasy scenery, no symbolic abstraction unless explicitly present in the dream.',
    negativePrompt ? `Avoid: ${negativePrompt}.` : ''
  ]
    .filter(Boolean)
    .join(' ');
}

async function extractSceneWithLLM(dreamText) {
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1'
  });

  const response = await client.chat.completions.create({
    model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
    temperature: 0.4,
    response_format: { type: 'json_object' },
    extra_headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://dreamap.app',
      'X-Title': 'Dreamap Dream Image'
    },
    messages: [
      {
        role: 'system',
        content: 'Return only valid JSON in English.'
      },
      {
        role: 'user',
        content: buildSceneExtractionPrompt(dreamText)
      }
    ]
  });

  const raw = response?.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);

  return {
    scene_title: parsed?.scene_title || '',
    scene_description: parsed?.scene_description || '',
    characters: Array.isArray(parsed?.characters) ? parsed.characters : [],
    location: parsed?.location || '',
    mood: parsed?.mood || '',
    important_objects: Array.isArray(parsed?.important_objects) ? parsed.important_objects : [],
    negative_prompt: parsed?.negative_prompt || ''
  };
}

async function generateWithFlux(prompt) {
  const rep = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=15'
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: '1:1'
      }
    })
  });

  const data = await rep.json();

  if (!rep.ok) {
    throw new Error(data?.detail || data?.error || 'flux_generation_failed');
  }

  return data?.output?.[0] || null;
}

async function generateWithDalle(prompt) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1024'
  });

  return response?.data?.[0]?.url || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
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

    const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
      p_user_id: user.id,
      p_amount: 8
    });

    if (spendError) throw spendError;

    const spend = spendResult?.[0];
    if (!spend?.success) {
      return res.status(402).json({ error: 'no_auras' });
    }

    const cleanedDream = cleanDreamText(dream.content || '');
    if (!cleanedDream) {
      try {
        await refundAuras(user.id, 8);
      } catch (refundError) {
        console.error('Refund Error:', refundError);
      }

      return res.status(400).json({ error: 'empty_dream_content' });
    }

    let sceneData;
    try {
      sceneData = await extractSceneWithLLM(cleanedDream);
    } catch (sceneError) {
      try {
        await refundAuras(user.id, 8);
      } catch (refundError) {
        console.error('Refund Error:', refundError);
      }

      return res.status(502).json({
        error: 'scene_extraction_failed',
        details: sceneError.message
      });
    }

    const finalPrompt = buildImagePrompt(sceneData);

    let imageUrl = null;
    let imageProvider = null;

    try {
      imageUrl = await generateWithFlux(finalPrompt);
      imageProvider = 'replicate_flux_schnell';
    } catch (fluxError) {
      console.error('Flux Failed:', fluxError);

      try {
        imageUrl = await generateWithDalle(finalPrompt);
        imageProvider = 'openai_gpt_image_1';
      } catch (dalleError) {
        console.error('DALL-E Fallback Failed:', dalleError);

        try {
          await refundAuras(user.id, 8);
        } catch (refundError) {
          console.error('Refund Error:', refundError);
        }

        return res.status(502).json({
          error: 'image_generation_failed',
          details: dalleError.message || fluxError.message
        });
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('dreams')
      .update({
        ai_image_prompt: finalPrompt,
        ai_image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', dreamId);

    if (updateError) {
      try {
        await refundAuras(user.id, 8);
      } catch (refundError) {
        console.error('Refund Error:', refundError);
      }

      return res.status(500).json({
        error: 'failed_to_save_image',
        details: updateError.message
      });
    }

    return res.status(200).json({
      ok: true,
      imageUrl,
      prompt: finalPrompt,
      sceneData,
      provider: imageProvider,
      aurasLeft: spend.remaining
    });
  } catch (error) {
    console.error('Dream Image Error:', error);
    return res.status(500).json({
      error: 'internal_server_error',
      details: error.message
    });
  }
    }
