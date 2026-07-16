import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js'

export const config = {
  maxDuration: 60,
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const LANG_MAP = {
  en: 'English', tr: 'Turkish (Türkçe)', es: 'Spanish', fr: 'French', 
  de: 'German', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese'
}

const SYSTEM_PROMPT = `You are an elite Jungian dream analyst for Lunosfer.
Respond with valid JSON ONLY. No markdown, no backticks.
Sections "shadow_focus", "core_conflict", "individuation_path", and "symbolic_reading" MUST be very detailed (2-3 long paragraphs each).`;

function buildShape() {
  return {
    title: '', summary: '', motiv: '', sentiment: '', archetypes: [],
    shadow_focus: '', core_conflict: '', individuation_path: '',
    symbolic_reading: '', reflection_questions: [],
    persona_profile: { name: '', public_self: '', hidden_self: '', strengths: [], core_fears: [], emotional_needs: [] },
    symbols: [{ symbol: '', meaning: '', intensity: 0 }],
    emotions: [{ emotion: '', score: 0 }],
    visual_prompt_en: '' 
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!token) return res.status(401).json({ error: 'missing_token' })

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) return res.status(401).json({ error: 'unauthorized' })

    const { dreamId, lang = 'en' } = req.body || {}
    if (!dreamId) return res.status(400).json({ error: 'missing_dream_id' })

    const { data: dream } = await supabaseAdmin.from('dreams').select('*').eq('id', dreamId).single()
    if (!dream) return res.status(404).json({ error: 'dream_not_found' })

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('premium_analysis_auras').eq('id', user.id).single()
    if (Number(profile?.premium_analysis_auras || 0) < 8) return res.status(402).json({ error: 'no_auras' })

    // Geçmiş rüya hafızasını çek
    const { data: pastDreams } = await supabaseAdmin
      .from('dreams')
      .select('content, premium_deep_analysis')
      .eq('user_id', user.id)
      .eq('premium_deep_analysis_status', 'generated')
      .neq('id', dreamId)
      .order('premium_deep_analysis_generated_at', { ascending: false })
      .limit(3)

    const pastContext = pastDreams?.map(d => d.content).join("\n---\n") || "No previous dreams."

    // Gemini 1.5 Flash Model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      ${SYSTEM_PROMPT}
      Translate/Write in: ${LANG_MAP[lang] || 'English'}
      
      Past History: ${pastContext}
      Current Dream: ${dream.content}
      
      Return JSON: ${JSON.stringify(buildShape())}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const analysis = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, ''));

    // ... (Replicate görsel üretimi ve Supabase kayıt süreçleri aynı kalabilir) ...
    // ... Görsel üretildikten sonra:

    const nextAuras = Number(profile.premium_analysis_auras) - 8
    await supabaseAdmin.from('user_profiles').update({ premium_analysis_auras: nextAuras }).eq('id', user.id)
    await supabaseAdmin.from('dreams').update({ 
      premium_deep_analysis: analysis, 
      premium_deep_analysis_status: 'generated',
      // ai_image_url: ... (buraya üretim sonucu gelecek)
    }).eq('id', dream.id)

    return res.status(200).json({ ok: true, analysis, aurasLeft: nextAuras })

  } catch (error) {
    console.error('Gemini Analysis Error:', error)
    return res.status(500).json({ error: 'internal_server_error' })
  }
}