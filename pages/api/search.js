// Pixabay arama proxy'si. API anahtarını istemciye hiç göndermeden
// Pixabay'in /api/ endpoint'ine sunucu tarafında istek atar ve sonucu
// uygulamamızın ihtiyacı olan sade bir formata indirger.
//
// Gerekli env var: PIXABAY_API_KEY (bkz. MIGRATION_NOTES_pixabay.md)
// Ücretsiz key: https://pixabay.com/api/docs/

const PER_PAGE = 24

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const apiKey = process.env.PIXABAY_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'pixabay_not_configured' })

  const { q = '', page = '1', lang = 'en', category } = req.query
  const pageNum = Math.max(1, parseInt(page, 10) || 1)

  const params = new URLSearchParams({
    key: apiKey,
    image_type: 'photo',
    safesearch: 'true',
    per_page: String(PER_PAGE),
    page: String(pageNum),
    lang: lang === 'tr' ? 'tr' : 'en',
  })

  const cleanQuery = String(q || '').trim().slice(0, 100)
  if (cleanQuery) params.set('q', cleanQuery)
  if (category && typeof category === 'string') params.set('category', category)

  try {
    const pixabayRes = await fetch(`https://pixabay.com/api/?${params.toString()}`)
    if (!pixabayRes.ok) {
      // Pixabay 400 döner (ör. çok kısa/geçersiz sorgu) — kullanıcıya boş sonuç
      // gibi davranmak, ham hata koduyla uğraştırmaktan daha iyi bir UX.
      if (pixabayRes.status === 400) {
        return res.status(200).json({ hits: [], total: 0, totalHits: 0, page: pageNum, hasMore: false })
      }
      return res.status(502).json({ error: 'pixabay_error' })
    }

    const data = await pixabayRes.json()
    const hits = (data.hits || []).map((h) => ({
      id: h.id,
      previewURL: h.previewURL,
      webformatURL: h.webformatURL,
      largeImageURL: h.largeImageURL,
      width: h.imageWidth,
      height: h.imageHeight,
      tags: (h.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      user: h.user,
      pageURL: h.pageURL,
    }))

    return res.status(200).json({
      hits,
      total: data.total || 0,
      totalHits: data.totalHits || 0,
      page: pageNum,
      hasMore: pageNum * PER_PAGE < (data.totalHits || 0),
    })
  } catch (error) {
    console.error('pixabay/search error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
