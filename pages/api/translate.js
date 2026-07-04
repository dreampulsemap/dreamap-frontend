import { translateText } from '../../lib/translator'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dreamText, analysisText, targetLang, dreamId } = req.body;

  if (!dreamText || !targetLang) {
    return res.status(400).json({ error: 'Eksik parametreler' });
  }

  // Supabase client oluştur
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    // 1. Önce cache'de var mı kontrol et
    if (dreamId) {
      const { data: cached } = await supabase
        .from('dream_translations')
        .select('*')
        .eq('dream_id', dreamId)
        .eq('target_lang', targetLang)
        .single();

      if (cached) {
        // Cache bulundu! ✅
        return res.status(200).json({
          translated: cached.translated_content,
          analysisTranslated: cached.translated_analysis,
          fromCache: true
        });
      }
    }

    // 2. Cache yok, çeviri yap
    const translatedDream = await translateText(dreamText, targetLang, 'dream')
    
    let translatedAnalysis = null
    if (analysisText) {
      translatedAnalysis = await translateText(analysisText, targetLang, 'analysis')
    }

    // 3. Supabase'e kaydet (eğer dreamId varsa)
    if (dreamId) {
      await supabase.from('dream_translations').upsert({
        dream_id: dreamId,
        target_lang: targetLang,
        translated_content: translatedDream,
        translated_analysis: translatedAnalysis
      }, {
        onConflict: 'dream_id,target_lang'
      });
    }

    return res.status(200).json({
      translated: translatedDream,
      analysisTranslated: translatedAnalysis,
      fromCache: false
    });
  } catch (error) {
    console.error('Translation error:', error)
    return res.status(500).json({ error: 'Çeviri hatası: ' + error.message })
  }
}
