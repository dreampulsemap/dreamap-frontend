import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const GROQ_KEY = process.env.GROQ_KEY;
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

  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'Groq API key eksik' });
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

  console.log(`📊 ANALİZ: ${recentDreams.length} rüya, ${totalArchetypes} arketip`);
  console.log(`🏆 Baskın arketip: ${dominantArchetypeName} (${archetypePercentage}%)`);
  console.log(`💭 Baskın duygu: ${dominantEmotionName}`);

  // GROQ İLE KEHANET ÜRET (İNGİLİZCE)
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
            content: 'You are Prophet AI, a mystical Jungian oracle. Return ONLY valid JSON, no markdown.' 
          },
          {
            role: 'user',
            content: `You are analyzing the collective unconscious from ${recentDreams.length} real dreams in the last 7 days.

DATA:
- Total dreams: ${recentDreams.length}
- Total archetypes: ${totalArchetypes}
- DOMINANT ARCHETYPE: ${dominantArchetypeName} (${dominantArchetypeCount} times, ${archetypePercentage}%)
- DOMINANT EMOTION: ${dominantEmotionName}

Generate TODAY'S prophecy:
1. Explain why ${dominantArchetypeName} dominates the collective unconscious
2. What this ${archetypePercentage}% dominance means for humanity
3. Connect to ${dominantEmotionName} emotion
4. Give specific, actionable advice for dreamers

Return ONLY JSON:
{
  "content_en": "English prophecy (150-200 words, mystical and data-grounded)...",
  "advice_en": "English practical advice (50-70 words)...",
  "symbol": "Visual description of ${dominantArchetypeName} archetype (English, 20-30 words)"
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Groq API yanıt vermedi');
    }

    const prophecy = JSON.parse(data.choices[0].message.content);
    
    // ÇEVİRİ API'SİNİ ÇAĞIR (8 DİLDE)
    const translations = await Promise.all([
      translateText(prophecy.content_en, 'tr'),
      translateText(prophecy.content_en, 'ru'),
      translateText(prophecy.content_en, 'es'),
      translateText(prophecy.content_en, 'ar'),
      translateText(prophecy.content_en, 'hi'),
      translateText(prophecy.content_en, 'zh'),
      translateText(prophecy.content_en, 'de'),
      translateText(prophecy.advice_en, 'tr'),
      translateText(prophecy.advice_en, 'ru'),
      translateText(prophecy.advice_en, 'es'),
      translateText(prophecy.advice_en, 'ar'),
      translateText(prophecy.advice_en, 'hi'),
      translateText(prophecy.advice_en, 'zh'),
      translateText(prophecy.advice_en, 'de')
    ]);

    const [
      content_tr, content_ru, content_es, content_ar, content_hi, content_zh, content_de,
      advice_tr, advice_ru, advice_es, advice_ar, advice_hi, advice_zh, advice_de
    ] = translations;

    // Görsel URL
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prophecy.symbol || dominantArchetypeName + ' archetype mystical')}`;

    // Veritabanına kaydet
    const dbProphecy = {
      prophecy_date: today,
      archetype: dominantArchetypeName,
      content_en: prophecy.content_en,
      content_tr: content_tr,
      content_ru: content_ru,
      content_es: content_es,
      content_ar: content_ar,
      content_hi: content_hi,
      content_zh: content_zh,
      content_de: content_de,
      advice_en: prophecy.advice_en,
      advice_tr: advice_tr,
      advice_ru: advice_ru,
      advice_es: advice_es,
      advice_ar: advice_ar,
      advice_hi: advice_hi,
      advice_zh: advice_zh,
      advice_de: advice_de,
      archetypes: [dominantArchetypeName],
      sentiment: dominantEmotionName,
      ai_advice: advice_tr, // Varsayılan Türkçe
      image_url: imageUrl,
      ai_stats: {
        totalDreams: recentDreams.length,
        totalArchetypes: totalArchetypes,
        dominantArchetype: dominantArchetypeName,
        dominancePercentage: archetypePercentage,
        dominantEmotion: dominantEmotionName
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
      message: `Prophecy generated from ${recentDreams.length} real dreams with Groq AI`,
      analysis: {
        totalDreams: recentDreams.length,
        dominantArchetype: dominantArchetypeName,
        dominancePercentage: archetypePercentage,
        dominantEmotion: dominantEmotionName
      }
    });
  } catch (error) {
    console.error('Groq error:', error);
    return await generateFallbackProphecy(supabase, today, dominantArchetypeName, dominantEmotionName);
  }
}

// Çeviri fonksiyonu
async function translateText(text, targetLang) {
  try {
    const res = await fetch('https://dreamap-frontend.vercel.app/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dreamText: 'Translate',
        analysisText: text,
        targetLang: targetLang
      })
    });
    const data = await res.json();
    return data.analysisTranslated || data.translated || text;
  } catch (e) {
    console.error(`Translation to ${targetLang} failed:`, e);
    return text;
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
