import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LANG_MAP = { en: 'English', tr: 'Turkish', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return res.status(401).json({ error: 'missing_token' });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: 'unauthorized' });

    const { lang = 'en' } = req.body;

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('last_compass_check_in')
      .eq('id', user.id)
      .single();

    const today = new Date().toISOString().split('T')[0];
    const lastCheckIn = profile?.last_compass_check_in ? profile.last_compass_check_in.split('T')[0] : null;

    if (lastCheckIn === today) {
      return res.status(429).json({ error: 'already_used_today' });
    }

    // KÜTÜPHANE GÜNCELLENDİĞİ İÇİN ARTIK BUNU KULLANABİLİRİZ
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are a mystical Jungian oracle. Generate the user's daily subconscious compass.
    MUST BE WRITTEN IN: ${LANG_MAP[lang] || 'English'}.
    Return ONLY a JSON object with:
    {
      "reading": "One short, profound, esoteric psychological advice (max 12 words). No quotes.",
      "archetype": "The Jungian Archetype guiding them today (e.g. The Magician, The Explorer)",
      "color": "A hex color code representing this energy (use dark/neon magical colors like #8b5cf6, #ec4899, #06b6d4, etc.)"
    }`;

    const result = await model.generateContent(prompt);
    const compassData = JSON.parse(result.response.text());

    await supabaseAdmin
      .from('user_profiles')
      .update({ last_compass_check_in: new Date().toISOString() })
      .eq('id', user.id);

    return res.status(200).json({ ok: true, data: compassData });

  } catch (error) {
    console.error('Daily Compass Error:', error);
    return res.status(500).json({ error: error.message || 'internal_server_error' });
  }
}