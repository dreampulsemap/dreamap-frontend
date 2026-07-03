import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const GEMINI_KEY = process.env.GEMINI_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase bilgileri eksik' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const today = new Date().toISOString().split('T')[0];

  // Önce bugünün kehaneti var mı kontrol et
  const { data: existing } = await supabase
    .from('daily_prophecy')
    .select('*')
    .eq('prophecy_date', today)
    .single();

  if (existing) {
    return res.status(200).json({ 
      success: true, 
      prophecy: existing,
      message: "Bugünün kehaneti zaten var"
    });
  }

  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'Gemini API key eksik' });
  }

  // SON 7 GÜNÜN RÜYALARINI ÇEK
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: recentDreams, error: fetchError } = await supabase
    .from('dreams')
    .select('*')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (fetchError || !recentDreams || recentDreams.length === 0) {
    console.error('No recent dreams found:', fetchError);
    return await generateFallbackProphecy(supabase, today);
  }

  // ARKETİP ANALİZİ
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

  // EN BASKIN ARKETİP VE DUYGU
  const dominantArchetype = Object.entries(archetypeCount)
    .sort((a, b) => b[1] - a[1])[0];
  const dominantArchetypeName = dominantArchetype ? dominantArchetype[0] : 'Shadow';
  const dominantArchetypeCount = dominantArchetype ? dominantArchetype[1] : 0;
  const archetypePercentage = totalArchetypes > 0 
    ? Math.round((dominantArchetypeCount / totalArchetypes) * 100) 
    : 0;

  const dominantEmotion = Object.entries(emotionCount)
    .sort((a, b) => b[1] - a[1])[0];
  const dominantEmotionName = dominantEmotion ? dominantEmotion[0] : 'Mystery';

  // ÖRNEK RÜYA METİNLERİ
  const sampleDreams = recentDreams.slice(0, 10).map(d => ({
    content: d.content?.substring(0, 300),
    archetype: d.ai_archetypes?.[0] || 'Unknown',
    emotion: d.ai_sentiment || 'Unknown',
    language: d.original_language || 'en'
  }));

  console.log(`📊 ANALİZ: ${recentDreams.length} rüya, ${totalArchetypes} arketip`);
  console.log(`🏆 Baskın arketip: ${dominantArchetypeName} (${archetypePercentage}%)`);
  console.log(`💭 Baskın duygu: ${dominantEmotionName}`);

  // GEMINI İLE KEHANET ÜRET
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are Prophet AI, a mystical Jungian oracle analyzing the collective unconscious.

REAL DATA FROM LAST 7 DAYS:
- Total dreams analyzed: ${recentDreams.length}
- Total archetypes found: ${totalArchetypes}
- DOMINANT ARCHETYPE: ${dominantArchetypeName} (appeared ${dominantArchetypeCount} times, ${archetypePercentage}% of all archetypes)
- DOMINANT EMOTION: ${dominantEmotionName}
- Top 5 archetypes: ${Object.entries(archetypeCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(([k,v]) => `${k}(${v})`).join(', ')}

SAMPLE DREAM THEMES:
${sampleDreams.map((d, i) => `${i+1}. [${d.language}] ${d.archetype} / ${d.emotion}: "${d.content}"`).join('\n')}

Based on this REAL DATA, generate TODAY'S collective dream prophecy in ALL 8 languages.

RULES:
1. The prophecy must be MYSTICAL, DEEP, and GROUNDED in the real data
2. Explain WHY ${dominantArchetypeName} is dominating the collective unconscious
3. Connect the ${dominantEmotionName} emotion to this archetype
4. Give SPECIFIC, ACTIONABLE advice for dreamers today
5. Each language version must be CULTURALLY ADAPTED, not just translated
6. The advice must be in EACH language separately

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "content_en": "English prophecy (150-200 words, mystical and data-grounded)...",
  "content_tr": "Turkish prophecy (150-200 words, culturally adapted)...",
  "content_ru": "Russian prophecy (150-200 words)...",
  "content_es": "Spanish prophecy (150-200 words)...",
  "content_ar": "Arabic prophecy (150-200 words)...",
  "content_hi": "Hindi prophecy (150-200 words)...",
  "content_zh": "Chinese prophecy (150-200 words)...",
  "content_de": "German prophecy (150-200 words)...",
  "advice_en": "English practical advice (50-70 words)...",
  "advice_tr": "Turkish practical advice (50-70 words)...",
  "advice_ru": "Russian practical advice (50-70 words)...",
  "advice_es": "Spanish practical advice (50-70 words)...",
  "advice_ar": "Arabic practical advice (50-70 words)...",
  "advice_hi": "Hindi practical advice (50-70 words)...",
  "advice_zh": "Chinese practical advice (50-70 words)...",
  "advice_de": "German practical advice (50-70 words)...",
  "symbol": "Visual description of ${dominantArchetypeName} archetype for AI image generation (English, 20-30 words)"
}

IMPORTANT: Return ONLY the JSON object, nothing else. No markdown formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON'u temizle
    const cleanContent = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    
    let prophecy;
    try {
      prophecy = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', text);
      throw new Error('JSON parse failed');
    }
    
    // Görsel URL
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prophecy.symbol || dominantArchetypeName + ' archetype mystical')}`;

    // Veritabanına kaydet
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
      ai_advice: prophecy.advice_tr || prophecy.advice_en, // Varsayılan Türkçe
      image_url: imageUrl,
      ai_stats: {
        totalDreams: recentDreams.length,
        totalArchetypes: totalArchetypes,
        dominantArchetype: dominantArchetypeName,
        dominancePercentage: archetypePercentage,
        dominantEmotion: dominantEmotionName,
        topArchetypes: Object.entries(archetypeCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(([k,v]) => ({name: k, count: v}))
      }
    };

    const { error } = await supabase.from('daily_prophecy').insert([dbProphecy]);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      prophecy: dbProphecy,
      message: `Prophecy generated from ${recentDreams.length} real dreams with Gemini AI`,
      analysis: {
        totalDreams: recentDreams.length,
        dominantArchetype: dominantArchetypeName,
        dominancePercentage: archetypePercentage,
        dominantEmotion: dominantEmotionName
      }
    });
  } catch (error) {
    console.error('Gemini error:', error);
    return await generateFallbackProphecy(supabase, today, dominantArchetypeName, dominantEmotionName);
  }
}

// Fallback fonksiyonu
async function generateFallbackProphecy(supabase, today, archetype = 'Shadow', emotion = 'Mystery') {
  const fallbackProphecy = {
    prophecy_date: today,
    archetype: archetype,
    content_en: `The ${archetype} archetype is active in the collective unconscious. Pay attention to your dreams.`,
    content_tr: `Kolektif bilinçdışında ${archetype} arketipi aktif. Rüyalarınıza dikkat edin.`,
    content_ru: `Архетип ${archetype} активен в коллективном бессознательном.`,
    content_es: `El arquetipo ${archetype} está activo en el inconsciente colectivo.`,
    content_ar: `Archetyp ${archetype} نشط في اللاوعي الجمعي.`,
    content_hi: `सामूहिक अवचेतन में ${archetype} archetype सक्रिय है।`,
    content_zh: `集体无意识中${archetype}原型活跃。`,
    content_de: `Der ${archetype}-Archetyp ist im kollektiven Unbewussten aktiv.`,
    advice_en: `Journal your dreams and notice ${archetype} symbols.`,
    advice_tr: `Rüyalarınızı not edin ve ${archetype} sembollerine dikkat edin.`,
    advice_ru: `Записывайте сны и замечайте символы ${archetype}.`,
    advice_es: `Registra tus sueños y nota símbolos de ${archetype}.`,
    advice_ar: `دوّن أحلامك ولاحظ رموز ${archetype}.`,
    advice_hi: `अपने सपनों को लिखें और ${archetype} प्रतीकों पर ध्यान दें।`,
    advice_zh: `记录你的梦，注意${archetype}象征。`,
    advice_de: `Notiere deine Träume und achte auf ${archetype} Symbole.`,
    archetypes: [archetype],
    sentiment: emotion,
    ai_advice: `Rüyalarınızı not edin ve ${archetype} sembollerine dikkat edin.`,
    image_url: `https://image.pollinations.ai/prompt/${archetype}%20archetype%20mystical`,
    ai_stats: {
      totalDreams: 0,
      totalArchetypes: 0,
      dominantArchetype: archetype,
      dominancePercentage: 0,
      dominantEmotion: emotion
    }
  };

  await supabase.from('daily_prophecy').insert([fallbackProphecy]);

  return {
    success: true,
    prophecy: fallbackProphecy,
    message: "Fallback prophecy"
  };
    }
