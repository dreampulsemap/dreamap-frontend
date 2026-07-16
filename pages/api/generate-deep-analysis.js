import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { dreamId, lang } = req.body;
    const { data: dream } = await supabaseAdmin.from('dreams').select('*').eq('id', dreamId).single();
    const { data: profile } = await supabaseAdmin.from('user_profiles').select('premium_analysis_auras').eq('id', user.id).single();

    if (Number(profile?.premium_analysis_auras || 0) < 8) return res.status(402).json({ error: 'no_auras' });

    // ANALİZ (PLAN A: Gemini 1.5 Flash)
    let analysis;
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Analyze this dream in ${lang} and return JSON format...`;
      const result = await model.generateContent(prompt);
      analysis = JSON.parse(result.response.text());
    } catch (e) {
      // PLAN C: OpenAI (Yedek)
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Analyze..." }]
      });
      analysis = JSON.parse(completion.choices[0].message.content);
    }

    // GÖRSEL (PLAN A: Replicate -> PLAN C: DALL-E 3)
    let imageUrl = null;
    try {
        // ... (Replicate veya DALL-E isteği burada)
    } catch (e) { ... }

    // Finalize
    await supabaseAdmin.from('user_profiles').update({ premium_analysis_auras: profile.premium_analysis_auras - 8 }).eq('id', user.id);
    await supabaseAdmin.from('dreams').update({ premium_deep_analysis: analysis, ai_image_url: imageUrl }).eq('id', dreamId);

    return res.status(200).json({ ok: true, analysis, imageUrl });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}