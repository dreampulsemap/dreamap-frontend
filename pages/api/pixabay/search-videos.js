// Pixabay video arama proxy'si — search.js (görsel) ile aynı mantık,
// Pixabay'in ayrı /api/videos/ endpoint'ine gidiyor.

const PER_PAGE = 24

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const apiKey = process.env.PIXABAY_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'pixabay_not_configured' })

  const { q = '', page = '1', lang = 'en', category } = req.query
  const pageNum = Math.max(1, parseInt(page, 10) || 1)

  const params = new URLSearchParams({
    key: apiKey,
    safesearch: 'true',
    per_page: String(PER_PAGE),
    page: String(pageNum),
    lang: lang === 'tr' ? 'tr' : 'en',
  })

  const cleanQuery = String(q || '').trim().slice(0, 100)
  if (cleanQuery) params.set('q', cleanQuery)
  if (category && typeof category === 'string') params.set('category', category)

  try {
    const pixabayRes = await fetch(`https://pixabay.com/api/videos/?${params.toString()}`)
    if (!pixabayRes.ok) {
      if (pixabayRes.status === 400) {
        return res.status(200).json({ hits: [], total: 0, totalHits: 0, page: pageNum, hasMore: false })
      }
      return res.status(502).json({ error: 'pixabay_error' })
    }

    const data = await pixabayRes.json()
    const hits = (data.hits || []).map((h) => ({
      id: h.id,
      // 'tiny' hem küçük hem hafif — grid önizlemesi için ideal
      previewURL: h.videos?.tiny?.url || h.videos?.small?.url,
      // İndirip kalıcı olarak sakladığımız kalite: 'small' (dosya boyutu makul,
      // görsel kalite vizyon panosu için yeterli). 'large' kasıtlı kullanılmıyor
      // — storage maliyetini kontrol altında tutmak için.
      downloadURL: h.videos?.small?.url || h.videos?.medium?.url || h.videos?.tiny?.url,
      width: h.videos?.small?.width,
      height: h.videos?.small?.height,
      duration: h.duration,
      tags: (h.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
      user: h.user,
      pageURL: h.pageURL,
    })).filter((h) => h.previewURL && h.downloadURL)

    return res.status(200).json({
      hits,
      total: data.total || 0,
      totalHits: data.totalHits || 0,
      page: pageNum,
      hasMore: pageNum * PER_PAGE < (data.totalHits || 0),
    })
  } catch (error) {
    console.error('pixabay/search-videos error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
