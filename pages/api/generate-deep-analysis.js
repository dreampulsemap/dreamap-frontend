import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const LANG_MAP = { en: 'English', tr: 'Turkish (Türkçe)', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese' }

const SYSTEM_PROMPT = `You are an elite, world-class Jungian dream analyst writing for Lunosfer.
Provide a breathtakingly insightful, compassionate, and psychologically profound analysis.
Sections "shadow_focus", "core_conflict", "individuation_path", and "symbolic_reading" MUST be very detailed (minimum 2-3 paragraphs each).
Respond with valid JSON only.`;

function buildShape() {
  return {
    title: '', summary: '', motiv: '', sentiment: '', visual_prompt_en: '',
    archetypes: [], shadow_focus: '', core_conflict: '', individuation_path: '',
    symbolic_reading: '', reflection_questions: ["Q1", "Q2", "Q3"],
    persona_profile: { name: '', tagline: '', archetypal_style: '', public_self: '', hidden_self: '', strengths: [], shadow_sides: [], core_fears: [], emotional_needs: [] },
    symbols: [{ symbol: '', meaning: '', emotional_charge: '', intensity: 0, color: '' }],
    emotions: [{ emotion: '', score: 0 }],
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { dreamId, lang = 'en' } = req.body;
    const { data: dream } = await supabaseAdmin.from('dreams').select('*').eq('id', dreamId).single();
    if (!dream) return res.status(404).json({ error: 'dream_not_found' });

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('premium_analysis_auras').eq('id', user.id).single();
    const auras = Number(profile?.premium_analysis_auras || 0);
    if (auras < 8) return res.status(402).json({ error: 'no_auras' });

    await supabaseAdmin.from('dreams').update({ premium_deep_analysis_status: 'generating' }).eq('id', dream.id);

    const { data: pastDreams } = await supabaseAdmin.from('dreams').select('content, premium_deep_analysis').eq('user_id', user.id).eq('premium_deep_analysis_status', 'generated').neq('id', dreamId).order('premium_deep_analysis_generated_at', { ascending: false }).limit(3);
    const pastContext = pastDreams?.map(d => `[Past Dream] Content: "${d.content}"\nPast Shadow: "${d.premium_deep_analysis?.shadow_focus || ""}"`).join("\n\n") || "";

    const prompt = `
      ${SYSTEM_PROMPT}
      Target Language: ${LANG_MAP[lang] || 'English'}
      Past History: ${pastContext}
      Current Dream: ${dream.content}
      Return JSON: ${JSON.stringify(buildShape())}
    `;

    // 1. MALİYET OPTİMİZASYONU: maxOutputTokens: 2000 (Maksimum çıkış kelimesini kısıtlar)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { 
        maxOutputTokens: 2000, 
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text());

    // 2. REPLICATE GÖRSEL ÜRETİMİ (Kalıcı Kayıtlı)
    let finalImageUrl = null;
    let imagePrompt = `${analysis.visual_prompt_en || dream.content.slice(0, 150)}, mystical surrealism style, dark cosmic tarot card aesthetic, deep indigo, fuchsia, glowing gold accents, ethereal lighting, masterpiece, octane render.`;

    try {
      const replicateRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json', 'Prefer': 'wait=15' },
        body: JSON.stringify({ input: { prompt: imagePrompt, aspect_ratio: "1:1", output_format: "webp", output_quality: 90, num_inference_steps: 4 } })
      });

      const replicateData = await replicateRes.json();
      if (replicateRes.ok && replicateData?.output?.[0]) {
        const tempUrl = replicateData.output[0];
        try {
          const imageFetchRes = await fetch(tempUrl);
          if (imageFetchRes.ok) {
            const buffer = Buffer.from(await imageFetchRes.arrayBuffer());
            const fileName = `${dreamId}-${Date.now()}.webp`;
            const { error: uploadError } = await supabaseAdmin.storage.from('dream_images').upload(fileName, buffer, { contentType: 'image/webp', upsert: true });
            if (!uploadError) finalImageUrl = supabaseAdmin.storage.from('dream_images').getPublicUrl(fileName).data.publicUrl;
            else finalImageUrl = tempUrl;
          }
        } catch (e) { finalImageUrl = tempUrl; }
      }
    } catch (err) {
      console.error('Image gen error:', err);
    }

    const nextAuras = auras - 8;
    await supabaseAdmin.from('user_profiles').update({ premium_analysis_auras: nextAuras }).eq('id', user.id);
    await supabaseAdmin.from('dreams').update({ 
      premium_deep_analysis: analysis, 
      premium_deep_analysis_status: 'generated',
      ai_image_url: finalImageUrl,
      ai_image_prompt: imagePrompt
    }).eq('id', dreamId);

    return res.status(200).json({ ok: true, analysis, aurasLeft: nextAuras, imageUrl: finalImageUrl });

  } catch (error) {
    console.error('Gemini Analysis Error:', error);
    return res.status(500).json({ error: 'internal_server_error' });
  }
}