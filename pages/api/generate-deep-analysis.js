import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getGeminiClient = () => {
  const key = process.env.GEMINI_FREE_KEY || process.env.GEMINI_KEY;
  return key ? new GoogleGenerativeAI(key) : null;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { dreamId, lang = 'en' } = req.body;
    
    // Analiz Üretimi (Gemini -> OpenAI Fallback)
    let analysis;
    const prompt = `Perform profound Jungian analysis in ${lang}. Return JSON.`;

    try {
      const genAI = getGeminiClient();
      if (!genAI) throw new Error("No Gemini");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      analysis = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
    } catch (e) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      });
      analysis = JSON.parse(completion.choices[0].message.content.replace(/```json|```/g, '').trim());
    }

    // Görsel Üretimi (Flux Schnell -> DALL-E 3 Fallback)
    let imageUrl = null;
    try {
        const rep = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json', 'Prefer': 'wait=15' },
            body: JSON.stringify({ input: { prompt: analysis.visual_prompt_en || "Mystical dream", aspect_ratio: "1:1" } })
        });
        const data = await rep.json();
        imageUrl = data.output?.[0];
    } catch (e) {
        const image = await openai.images.generate({ model: "dall-e-3", prompt: analysis.visual_prompt_en, n: 1, size: "1024x1024" });
        imageUrl = image.data[0].url;
    }

    // Supabase kaydı...
    await supabaseAdmin.from('dreams').update({ premium_deep_analysis: analysis, ai_image_url: imageUrl }).eq('id', dreamId);

    return res.status(200).json({ ok: true, analysis, imageUrl });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}