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
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { lang = 'en' } = req.body;

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('last_compass_check_in').eq('id', user.id).single();
    const today = new Date().toISOString().split('T')[0];
    if (profile?.last_compass_check_in?.split('T')[0] === today) {
      return res.status(429).json({ error: 'already_used_today' });
    }

    // YENİ KÜTÜPHANE FORMATI: v1beta yerine stabil kanalı kullanır
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
    });

    const prompt = `You are a mystical Jungian oracle. Generate the user's daily subconscious compass.
    MUST BE WRITTEN IN: ${LANG_MAP[lang] || 'English'}.
    Return ONLY a JSON object with this structure:
    {
      "reading": "One short profound esoteric advice (max 12 words).",
      "archetype": "The Jungian Archetype",
      "color": "A hex code like #8b5cf6"
    }`;

    // Yeni sürümde JSON modunu bu şekilde güvenli alıyoruz
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON temizleme (Markdown işaretleri varsa kaldırır)
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const compassData = JSON.parse(cleanJson);

    await supabaseAdmin.from('user_profiles').update({ last_compass_check_in: new Date().toISOString() }).eq('id', user.id);

    return res.status(200).json({ ok: true, data: compassData });

  } catch (error) {
    console.error('Compass Error:', error);
    return res.status(500).json({ error: error.message });
  }
}