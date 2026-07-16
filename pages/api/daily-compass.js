import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';

const getGeminiClient = () => {
  const key = process.env.GEMINI_FREE_KEY || process.env.GEMINI_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { lang = 'en' } = req.body;
  const prompt = `You are a mystical Jungian oracle. Provide a profound psychological advice in ${lang}. Return ONLY JSON: {"reading": "...", "archetype": "...", "color": "#8b5cf6"}`;

  let compassData;

  // PLAN A: Gemini ile üretmeyi dene
  try {
    const genAI = getGeminiClient();
    if (!genAI) throw new Error("No Gemini Keys");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    compassData = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error("Gemini failed, trying OpenAI...", e);
    // PLAN B: OpenAI Fallback
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });
    compassData = JSON.parse(completion.choices[0].message.content.replace(/```json|```/g, '').trim());
  }

  return res.status(200).json({ ok: true, data: compassData });
}