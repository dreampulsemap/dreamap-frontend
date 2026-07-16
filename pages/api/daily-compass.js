import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const getGeminiClient = () => {
  const key = process.env.GEMINI_FREE_KEY || process.env.GEMINI_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Kimlik doğrulama
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    // Günlük limit kontrolü (sunucu tarafı - localStorage'a güvenilmez)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('last_compass_check_in')
      .eq('id', user.id)
      .maybeSingle();

    const today = new Date().toISOString().split('T')[0];
    if (profile?.last_compass_check_in && profile.last_compass_check_in.split('T')[0] === today) {
      return res.status(429).json({ error: 'already_used_today' });
    }

    const { lang = 'en' } = req.body;
    const prompt = `You are a mystical Jungian oracle. Provide a profound psychological advice in ${lang}. Return ONLY JSON: {"reading": "...", "archetype": "...", "color": "#8b5cf6"}`;

    let compassData;

    // PLAN A: Gemini ile üretmeyi dene
    try {
      const genAI = getGeminiClient();
      if (!genAI) throw new Error("No Gemini Keys");
      const interaction = await genAI.interactions.create({
        model: "gemini-3.5-flash",
        input: prompt,
      });
      compassData = JSON.parse(interaction.output_text.replace(/```json|```/g, '').trim());
    } catch (e) {
      console.error("Gemini failed, trying OpenAI...", e);
      // PLAN B: OpenAI Fallback
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      });
      compassData = JSON.parse(completion.choices[0].message.content.replace(/```json|```/g, '').trim());
    }

    // Günlük check-in'i kaydet
    await supabaseAdmin
      .from('user_profiles')
      .update({ last_compass_check_in: new Date().toISOString() })
      .eq('id', user.id);

    return res.status(200).json({ ok: true, data: compassData });
  } catch (error) {
    console.error('Daily Compass Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
