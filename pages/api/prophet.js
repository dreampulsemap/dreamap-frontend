export default async function handler(req, res) {
  const GROQ_KEY = process.env.GROQ_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase bilgileri eksik' });
  }

  const { createClient } = await import('@supabase/supabase-js');
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
    // Fallback: En azından bir kehanet üret
    return await generateFallbackProphecy(supabase, today);
  }

  // ARKETİP ANALİZİ
  const archetypeCount = {};
  const emotionCount = {};
  let totalArchetypes = 0;

  recentDreams.forEach(dream => {
    // Arketipleri say
    if (dream.ai_archetypes && Array.isArray(dream.ai_archetypes)) {
      dream.ai_archetypes.forEach(arch => {
        archetypeCount[arch] = (archetypeCount[arch] || 0) + 1;
        totalArchetypes++;
      });
    }
    
    // Duyguları say
    if (dream.ai_sentiment) {
      emotionCount[dream.ai_sentiment] = (emotionCount[dream.ai_sentiment] || 0) + 1;
    }
  });

  // EN BASKIN ARKETİPİ BUL
  const dominantArchetype = Object.entries(archetypeCount)
    .sort((a, b) => b[1] - a[1])[0];
  
  const dominantArchetypeName = dominantArchetype ? dominantArchetype[0] : 'Shadow';
  const dominantArchetypeCount = dominantArchetype ? dominantArchetype[1] : 0;
  const archetypePercentage = totalArchetypes > 0 
    ? Math.round((dominantArchetypeCount / totalArchetypes) * 100) 
    : 0;

  // EN BASKIN DUYGUYU BUL
  const dominantEmotion = Object.entries(emotionCount)
    .sort((a, b) => b[1] - a[1])[0];
  
  const dominantEmotionName = dominantEmotion ? dominantEmotion[0] : 'Mystery';

  // ÖRNEK RÜYA METİNLERİ TOPLA (ilk 10)
  const sampleDreams = recentDreams.slice(0, 10).map(d => ({
    content: d.content?.substring(0, 200),
    archetype: d.ai_archetypes?.[0] || 'Unknown',
    emotion: d.ai_sentiment || 'Unknown'
  }));

  console.log(`📊 ANALİZ: ${recentDreams.length} rüya, ${totalArchetypes} arketip`);
  console.log(`🏆 Baskın arketip: ${dominantArchetypeName} (${archetypePercentage}%, ${dominantArchetypeCount} kez)`);
  console.log(`💭 Baskın duygu: ${dominantEmotionName}`);

  // GROQ İLE GERÇEK VERİYE DAYALI KEHANET ÜRET
  const prompt = `You are Prophet AI, analyzing the collective unconscious from ${recentDreams.length} real dreams shared in the last 7 days.

DATA ANALYSIS:
- Total dreams analyzed: ${recentDreams.length}
- Total archetypes found: ${totalArchetypes}
- DOMINANT ARCHETYPE: ${dominantArchetypeName} (appeared ${dominantArchetypeCount} times, ${archetypePercentage}% of all archetypes)
- DOMINANT EMOTION: ${dominantEmotionName}
- Sample dream themes: ${sampleDreams.map(d => d.archetype).join(', ')}

Based on this REAL DATA, generate TODAY'S prophecy:

1. Explain why ${dominantArchetypeName} is dominating the collective unconscious right now
2. What does this ${archetypePercentage}% dominance tell us about humanity's current psychological state?
3. How does the ${dominantEmotionName} emotion connect to this archetype?
4. What should dreamers pay attention to TODAY based on this pattern?
5. Practical advice for working with ${dominantArchetypeName} energy

Make it MYSTICAL yet GROUNDED in the data. Deep Jungian wisdom, not generic horoscope.

Return ONLY valid JSON (no markdown, no backticks):
{
  "content_en": "English prophecy (150-200 words) analyzing the real data...",
  "content_tr": "Turkish prophecy...",
  "content_ru": "Russian prophecy...",
  "content_es": "Spanish prophecy...",
  "content_ar": "Arabic prophecy...",
  "content_hi": "Hindi prophecy...",
  "content_zh": "Chinese prophecy...",
  "content_de": "German prophecy...",
  "ai_advice": "Practical advice based on ${dominantArchetypeName} (50-70 words)",
  "symbol": "Visual description of ${dominantArchetypeName} archetype (English, 20-30 words)"
}

IMPORTANT: Return ONLY the JSON object, nothing else.`;

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
            content: 'You are a data-driven Jungian oracle. Analyze real dream data and return ONLY valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Groq API yanıt vermedi');
    }

    const content = data.choices[0].message.content.trim();
    const cleanContent = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    
    let prophecy;
    try {
      prophecy = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('JSON parse failed');
    }
    
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prophecy.symbol || dominantArchetypeName + ' archetype')}`;

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
      archetypes: [dominantArchetypeName],
      sentiment: dominantEmotionName,
      ai_advice: prophecy.ai_advice,
      image_url: imageUrl,
      // İstatistikleri kaydet
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
      message: `Prophecy generated from ${recentDreams.length} real dreams`,
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
    archetypes: [archetype],
    sentiment: emotion,
    ai_advice: 'Journal your dreams and notice recurring patterns.',
    image_url: `https://image.pollinations.ai/prompt/${archetype}%20archetype`
  };

  await supabase.from('daily_prophecy').insert([fallbackProphecy]);

  return {
    success: true,
    prophecy: fallbackProphecy,
    message: "Fallback prophecy"
  };
}
