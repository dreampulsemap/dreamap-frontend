import { translateText } from '../../lib/translator'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Tek istekte cevrilecek metin ust siniri — endpoint auth'suz, maliyeti sinirlar.
const MAX_TEXT_LENGTH = 8000

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { analysisText, targetLang, dreamId } = req.body || {};
  // Android `text` gonderip `translatedText` okuyor, web `dreamText`/`translated`.
  const dreamText = req.body?.dreamText ?? req.body?.text;

  if (typeof dreamText !== 'string' || !dreamText.trim() || !targetLang) {
    return res.status(400).json({ error: 'Eksik parametreler' });
  }
  if (dreamText.length > MAX_TEXT_LENGTH || (analysisText && String(analysisText).length > MAX_TEXT_LENGTH)) {
    return res.status(413).json({ error: 'text_too_long', max: MAX_TEXT_LENGTH });
  }

  try {
    // Cache yalnizca gonderilen metin rüyanin gercek iceriğiyle eslesirse
    // kullanilir: aksi halde herkes baska bir rüyaya sahte ceviri yazabilir
    // ya da dreamId tahmin ederek gizli rüyalarin cevirisini okuyabilirdi.
    // Tablo artik sadece service role ile erisilebilir (migration 012).
    let cacheable = false
    let analysisCacheable = false
    if (dreamId) {
      const { data: dream } = await supabaseAdmin
        .from('dreams')
        .select('*')
        .eq('id', dreamId)
        .maybeSingle()
      cacheable = !!dream && (dream.content || '').trim() === dreamText.trim()
      analysisCacheable = cacheable && !!analysisText && Object.entries(dream)
        .some(([k, v]) => k.startsWith('ai_summary') && typeof v === 'string' && v.trim() === String(analysisText).trim())
    }

    if (cacheable) {
      const { data: cached } = await supabaseAdmin
        .from('dream_translations')
        .select('*')
        .eq('dream_id', dreamId)
        .eq('target_lang', targetLang)
        .maybeSingle();

      if (cached && (!analysisText || cached.translated_analysis)) {
        return res.status(200).json({
          translated: cached.translated_content,
          translatedText: cached.translated_content,
          analysisTranslated: cached.translated_analysis,
          fromCache: true
        });
      }
    }

    const translatedDream = await translateText(dreamText, targetLang, 'dream')

    let translatedAnalysis = null
    if (analysisText) {
      translatedAnalysis = await translateText(String(analysisText), targetLang, 'analysis')
    }

    if (cacheable) {
      await supabaseAdmin.from('dream_translations').upsert({
        dream_id: dreamId,
        target_lang: targetLang,
        translated_content: translatedDream,
        translated_analysis: analysisCacheable ? translatedAnalysis : null
      }, {
        onConflict: 'dream_id,target_lang'
      });
    }

    return res.status(200).json({
      translated: translatedDream,
      translatedText: translatedDream,
      analysisTranslated: translatedAnalysis,
      fromCache: false
    });
  } catch (error) {
    console.error('Translation error:', error)
    return res.status(500).json({ error: 'Çeviri hatası: ' + error.message })
  }
}
