import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: 'unauthorized' });

    const { dreamId } = req.body;
    const { data: dream } = await supabaseAdmin.from('dreams').select('*').eq('id', dreamId).single();

    if (dream.ai_image_url) return res.status(200).json({ ok: true, imageUrl: dream.ai_image_url });

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('premium_analysis_auras').eq('id', user.id).single();
    if (Number(profile?.premium_analysis_auras || 0) < 2) return res.status(402).json({ error: 'no_auras' });

    const prompt = `A breathtaking dreamscape scene: ${dream.content.slice(0, 200)}, mystical surrealism, dark cosmic tarot aesthetic, deep indigo and glowing gold accents, cinematic lighting, masterpiece, high-art.`;

    let imageUrl = null;

    // PLAN A: REPLICATE (Flux)
    try {
      const rep = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { prompt, aspect_ratio: "1:1" } })
      });
      const data = await rep.json();
      if (data.output) imageUrl = data.output[0];
    } catch (e) {
      console.error("Replicate failed, fallback to DALL-E 3");
    }

    // PLAN B: OPENAI (DALL-E 3)
    if (!imageUrl) {
      const image = await openai.images.generate({ model: "dall-e-3", prompt, n: 1, size: "1024x1024" });
      imageUrl = image.data[0].url;
    }

    // Storage'a yükle ve güncelle
    const nextAuras = profile.premium_analysis_auras - 2;
    await supabaseAdmin.from('user_profiles').update({ premium_analysis_auras: nextAuras }).eq('id', user.id);
    await supabaseAdmin.from('dreams').update({ ai_image_url: imageUrl }).eq('id', dreamId);

    return res.status(200).json({ ok: true, imageUrl, aurasLeft: nextAuras });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}