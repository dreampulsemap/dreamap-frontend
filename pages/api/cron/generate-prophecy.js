import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const GROQ_KEY = process.env.GROQ_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY || !GROQ_KEY) {
    return new Response('Missing env vars', { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const today = new Date().toISOString().split('T')[0];

  console.log(`🔮 Cron: Generating prophecy for ${today}`);

  // Zaten var mı?
  const { data: existing } = await supabase
    .from('daily_prophecy')
    .select('*')
    .eq('prophecy_date', today)
    .single();

  if (existing) {
    return new Response(JSON.stringify({ success: true, message: 'Already exists' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Son 7 gün rüyaları
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentDreams } = await supabase
    .from('dreams')
    .select('*')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (!recentDreams || recentDreams.length === 0) {
    return new Response(JSON.stringify({ success: false, message: 'No dreams' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Analiz
  const archetypeCount = {};
  const emotionCount = {};
  let totalArchetypes = 0;

  recentDreams.forEach(dream => {
    if (dream.ai_archetypes && Array.isArray(dream.ai_archetypes)) {
      dream.ai_archetypes.forEach(arch => {
        archetypeCount[arch] = (archetypeCount[arch] || 0) + 1;
        totalArchetypes++;
      });
    }
    if (dream.ai_sentiment) {
      emotionCount[dream.ai_sentiment] = (emotionCount[dream.ai_sentiment] || 0) + 1;
    }
  });

  const dominantArchetype = Object.entries(archetypeCount).sort((a, b) => b[1] - a[1])[0];
  const dominantArchetypeName = dominantArchetype ? dominantArchetype[0] : 'Shadow';
  const dominantArchetypeCount = dominantArchetype ? dominantArchetype[1] : 0;
  const archetypePercentage = totalArchetypes > 0
    ? Math.round((dominantArchetypeCount / totalArchetypes) * 100)
    : 0;

  const dominantEmotion = Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0];
  const dominantEmotionName = dominantEmotion ? dominantEmotion[0] : 'Mystery';

  // Groq ile 8 dilde kehanet üret
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are Prophet AI. Return ONLY valid JSON, no markdown, no backticks.'
          },
          {
            role: 'user',
            content: `Generate TODAY'S collective dream prophecy from ${recentDreams.length} real dreams.

DATA:
- Total dreams: ${recentDreams.length}
- DOMINANT ARCHETYPE: ${dominantArchetypeName} (${dominantArchetypeCount} times, ${archetypePercentage}%)
- DOMINANT EMOTION: ${dominantEmotionName}

Write in NATIVE language for each. Return ONLY JSON:
{
  "content_en": "English prophecy (100-150 words)...",
  "content_tr": "Turkish prophecy in Turkish (100-150 words)...",
  "content_ru": "Russian prophecy in Russian (100-150 words)...",
  "content_es": "Spanish prophecy in Spanish (100-150 words)...",
  "content_ar": "Arabic prophecy in Arabic (100-150 words)...",
  "content_hi": "Hindi prophecy in Hindi (100-150 words)...",
  "content_zh": "Chinese prophecy in Chinese (100-150 words)...",
  "content_de": "German prophecy in German (100-150 words)...",
  "advice_en": "English advice (40-60 words)...",
  "advice_tr": "Turkish advice in Turkish (40-60 words)...",
  "advice_ru": "Russian advice in Russian (40-60 words)...",
  "advice_es": "Spanish advice in Spanish (40-60 words)...",
  "advice_ar": "Arabic advice in Arabic (40-60 words)...",
  "advice_hi": "Hindi advice in Hindi (40-60 words)...",
  "advice_zh": "Chinese advice in Chinese (40-60 words)...",
  "advice_de": "German advice in German (40-60 words)...",
  "symbol": "Visual description for AI image (English, 20-30 words)"
}`
          }
        ],
        temperature: 0.8,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    const cleanContent = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const prophecy = JSON.parse(cleanContent);

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prophecy.symbol || dominantArchetypeName)}`;

    const dbProphecy = {
      prophecy_date: today,
      archetype: dominantArchetypeName,
      content_en: prophecy.content_en,
      content_tr: prophecy.content_tr,
      content_ru: prophecy.content_ru,
      content_es: prophecy.content_es,
      content_ar: prophecy.content_ar,
      content_hi: prophecy.content_hi,
      content_zh: prophecy.content_zh,
      content_de: prophecy.content_de,
      advice_en: prophecy.advice_en,
      advice_tr: prophecy.advice_tr,
      advice_ru: prophecy.advice_ru,
      advice_es: prophecy.advice_es,
      advice_ar: prophecy.advice_ar,
      advice_hi: prophecy.advice_hi,
      advice_zh: prophecy.advice_zh,
      advice_de: prophecy.advice_de,
      archetypes: [dominantArchetypeName],
      sentiment: dominantEmotionName,
      ai_advice: prophecy.advice_tr,
      image_url: imageUrl,
      ai_stats: {
        totalDreams: recentDreams.length,
        dominantArchetype: dominantArchetypeName,
        dominancePercentage: archetypePercentage,
        dominantEmotion: dominantEmotionName
      }
    };

    await supabase.from('daily_prophecy').insert([dbProphecy]);

    console.log('✅ Prophecy generated!');

    return new Response(JSON.stringify({ success: true, prophecy: dbProphecy }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
            }
