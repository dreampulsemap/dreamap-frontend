import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// Vercel limitlerini aşmamak için maksimum süre
export const config = { maxDuration: 60 };

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LANG_MAP = { 
  en: 'English', tr: 'Turkish', es: 'Spanish', fr: 'French', 
  de: 'German', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese' 
};

// Yüksek derinlikli analiz için Sistem Promptu
const SYSTEM_PROMPT = `You are a world-class Jungian dream analyst for Lunosfer.
Provide an insightful, compassionate, and psychologically profound analysis.
Structure your response EXACTLY as the requested JSON.
Ensure "shadow_focus", "core_conflict", "individuation_path", and "symbolic_reading" sections contain at least 2 long, comprehensive paragraphs of high-density Jungian insight. 
Always return VALID JSON only. Do not wrap in markdown backticks.`;

function buildShape() {
  return {
    title: "",
    summary: "",
    motiv: "",
    sentiment: "",
    visual_prompt_en: "",
    archetypes: [],
    shadow_focus: "",
    core_conflict: "",
    individuation_path: "",
    symbolic_reading: "",
    reflection_questions: ["", "", ""],
    persona_profile: { name: "", tagline: "", public_self: "", hidden_self: "", strengths: [], core_fears: [], emotional_needs: [] },
    symbols: [{ symbol: "", meaning: "", intensity: 0 }],
    emotions: [{ emotion: "", score: 0 }]
  };
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

    // Bakiye kontrolü
    const { data: profile } = await supabaseAdmin.from('user_profiles').select('premium_analysis_auras').eq('id', user.id).single();
    if (Number(profile?.premium_analysis_auras || 0) < 8) return res.status(402).json({ error: 'no_auras' });

    // Geçmiş rüyaları hafıza (Context) olarak çek
    const { data: pastDreams } = await supabaseAdmin
      .from('dreams')
      .select('content, premium_deep_analysis')
      .eq('user_id', user.id)
      .eq('premium_deep_analysis_status', 'generated')
      .neq('id', dreamId)
      .order('premium_deep_analysis_generated_at', { ascending: false })
      .limit(3);

    const pastContext = pastDreams?.map(d => `Content: "${d.content}"\nShadow focus: "${d.premium_deep_analysis?.shadow_focus}"`).join("\n---\n") || "No past history.";

    // Gemini 2.5 Flash ile Analiz
    const prompt = `
      ${SYSTEM_PROMPT}
      Analyze this dream for a user who previously experienced these patterns: ${pastContext}
      Dream text: ${dream.content}
      Language: ${LANG_MAP[lang] || 'English'}
      Required JSON format: ${JSON.stringify(buildShape())}
    `;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const rawText = result.text;
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(cleanJson);

    // Görsel Üretimi (Replicate / Flux)
    let imageUrl = null;
    try {
      const rep = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json', 'Prefer': 'wait=15' },
        body: JSON.stringify({ input: { prompt: analysis.visual_prompt_en, aspect_ratio: "1:1" } })
      });
      const data = await rep.json();
      imageUrl = data.output?.[0] || null;
    } catch (e) { console.error("Flux Failed", e); }

    // Final Kayıt
    const nextAuras = profile.premium_analysis_auras - 8;
    await supabaseAdmin.from('user_profiles').update({ premium_analysis_auras: nextAuras }).eq('id', user.id);
    await supabaseAdmin.from('dreams').update({ 
      premium_deep_analysis: analysis, 
      premium_deep_analysis_status: 'generated',
      ai_image_url: imageUrl 
    }).eq('id', dreamId);

    return res.status(200).json({ ok: true, analysis, aurasLeft: nextAuras, imageUrl });

  } catch (error) {
    console.error('Deep Analysis Error:', error);
    return res.status(500).json({ error: error.message });
  }
}