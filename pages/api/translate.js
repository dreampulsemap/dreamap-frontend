import { translateText } from '../../lib/translator'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dreamText, analysisText, targetLang } = req.body;

  if (!dreamText || !targetLang) {
    return res.status(400).json({ error: 'Eksik parametreler' });
  }

  try {
    const translatedDream = await translateText(dreamText, targetLang, 'dream')
    
    let translatedAnalysis = null
    if (analysisText) {
      translatedAnalysis = await translateText(analysisText, targetLang, 'analysis')
    }

    return res.status(200).json({
      translated: translatedDream,
      analysisTranslated: translatedAnalysis
    })
  } catch (error) {
    console.error('Translation error:', error)
    return res.status(500).json({ error: 'Çeviri hatası: ' + error.message })
  }
}
