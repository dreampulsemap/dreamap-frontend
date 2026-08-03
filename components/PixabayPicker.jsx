import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Loader2, Lock, Crown, Check } from 'lucide-react'
import { useModalA11y } from '@/lib/useModalA11y'

// Vizyon panosuna Pixabay'den görsel/video seçmek için arama modalı.
// Gerçek indirme/kaydetme işini onPickImage / onPickVideo (parent'ta tanımlı,
// async fonksiyonlar, başarıda true döner) yapar — bu bileşen sadece
// arama/seçim UI'ı + erişim kilidi.
//
// multiSelect=false (varsayılan): dokunma = anında ekle + kapan (GoalDetailModal'ın
// tekli kapak/galeri akışı, DEĞİŞMEDİ).
// multiSelect=true (VisionVideoEditor): dokunma = işaretle/kaldır, seçim
// Görsel↔Video sekmeleri arasında korunur (mediaType:id ile anahtarlanıyor),
// alttaki "Ekle (N)" barına basınca hepsi SIRAYLA (paralel değil — haftalık
// video hakkı sunucuda kontrol edildiği için paralel istek yarış durumu
// yaratıp limiti aşırtabilir) onPickImage/onPickVideo'ya gönderilir. Başarılı
// olanlar seçimden düşer, başarısızlar (ör. video hakkı bittiyse) seçili
// kalır ki kullanıcı tekrar deneyebilsin.
//
// videoStatus: { isPremium, canPickVideo, nextAvailableAt } — parent
// /api/user/premium-status'tan çekip buraya geçiriyor.

const QUICK_TAGS = {
  tr: ['hayaller', 'hedefler', 'motivasyon', 'doğa', 'seyahat', 'başarı', 'meditasyon'],
  en: ['dreams', 'goals', 'motivation', 'nature', 'travel', 'success', 'meditation'],
}

// TODO: uygulama içi bir /premium sayfası oluşunca buradaki direkt Gumroad
// linki yerine o sayfaya yönlendirilebilir.
const PREMIUM_UPGRADE_URL = 'https://elsuilgen.gumroad.com/l/dmtasl'

function formatNextAvailable(iso, lang) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long' })
  } catch {
    return ''
  }
}

function selectionKey(mediaType, hit) {
  return `${mediaType}:${hit.id}`
}

export default function PixabayPicker({ lang = 'en', videoStatus, videoEnabled = true, multiSelect = false, onPickImage, onPickVideo, onClose }) {
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)

  const [mediaType, setMediaType] = useState('image') // 'image' | 'video'
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectingId, setSelectingId] = useState(null)
  const [lockedNotice, setLockedNotice] = useState(false)
  const [selected, setSelected] = useState(new Map()) // key -> { key, hit, mediaType }
  const [confirming, setConfirming] = useState(false)
  const [processingKey, setProcessingKey] = useState(null)
  const debounceRef = useRef(null)

  const isPremium = !!videoStatus?.isPremium
  const canPickVideo = isPremium || !!videoStatus?.canPickVideo
  const nextAvailableAt = videoStatus?.nextAvailableAt

  const search = useCallback(
    async (type, q, targetPage, replace) => {
      setLoading(true)
      setError('')
      setLockedNotice(false)
      try {
        const endpoint = type === 'video' ? '/api/pixabay/search-videos' : '/api/pixabay/search'
        const params = new URLSearchParams({ q, page: String(targetPage), lang })
        const res = await fetch(`${endpoint}?${params.toString()}`)
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || 'error')
          return
        }
        setHits((prev) => (replace ? json.hits || [] : [...prev, ...(json.hits || [])]))
        setHasMore(!!json.hasMore)
        setPage(targetPage)
      } catch {
        setError('network_error')
      } finally {
        setLoading(false)
      }
    },
    [lang]
  )

  // Not: önceden ilk açılışta otomatik "hayaller/dreams" araması yapılıyordu —
  // kullanıcı istemeden alakasız, tek bir konuya özel sonuçlarla karşılaşıyordu.
  // Onun yerine boş sorguyla arıyoruz: /api/pixabay/search boş q'da 400
  // vermiyor, Pixabay'in kendi kürasyonlu/trend sonuçlarını döndürüyor (bkz.
  // pages/api/pixabay/search.js) — yani konuya özel değil ama YİNE DE ekran
  // hiçbir zaman boş açılmıyor, kullanıcı hemen bir şey görüp seçebiliyor.
  useEffect(() => {
    search(mediaType, '', 1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function switchTab(type) {
    if (type === mediaType) return
    setMediaType(type)
    setLockedNotice(false)
    search(type, query.trim(), 1, true)
  }

  function handleQueryChange(value) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(mediaType, value.trim(), 1, true)
    }, 450)
  }

  function handleQuickTag(tag) {
    setQuery(tag)
    search(mediaType, tag, 1, true)
  }

  function toggleSelected(hit) {
    const key = selectionKey(mediaType, hit)
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(key)) next.delete(key)
      else next.set(key, { key, hit, mediaType })
      return next
    })
  }

  function clearSelection() {
    setSelected(new Map())
  }

  async function handleSelect(hit) {
    if (mediaType === 'video' && !canPickVideo) {
      setLockedNotice(true)
      return
    }

    if (multiSelect) {
      toggleSelected(hit)
      return
    }

    if (selectingId) return
    setSelectingId(hit.id)
    try {
      const ok = mediaType === 'video' ? await onPickVideo(hit) : await onPickImage(hit)
      if (ok) onClose?.()
    } finally {
      setSelectingId(null)
    }
  }

  // Seçilenleri SIRAYLA gönderir (Promise.all değil): paralel gönderilirse
  // haftalık video hakkı kontrolü sunucuda her istek için ayrı ayrı
  // "canPickVideo" görür ve limiti aşırtabilir — sırayla her istek DB'yi
  // güncelledikten sonra bir sonraki başlar. Başarılı olan seçimden düşer,
  // başarısız kalan (ör. hak bitti, ağ hatası) seçili kalır — hata zaten
  // parent'ın kendi toast'ıyla gösteriliyor (onPickImage/onPickVideo içinde),
  // burada ayrıca bir hata UI'ı tekrarlamıyoruz.
  async function handleConfirmSelection() {
    if (confirming || selected.size === 0) return
    setConfirming(true)
    let allOk = true
    for (const item of Array.from(selected.values())) {
      setProcessingKey(item.key)
      const ok = item.mediaType === 'video' ? await onPickVideo(item.hit) : await onPickImage(item.hit)
      if (ok) {
        setSelected((prev) => {
          const next = new Map(prev)
          next.delete(item.key)
          return next
        })
      } else {
        allOk = false
      }
    }
    setProcessingKey(null)
    setConfirming(false)
    if (allOk) onClose?.()
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Pixabay"
        className="glass-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto animate-scale-in"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-white font-bold text-lg">
              {lang === 'tr' ? 'Pixabay\u2019dan Seç' : 'Choose From Pixabay'}
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              {lang === 'tr' ? 'Telifsiz, ücretsiz kullanılabilir içerikler.' : 'Free-to-use, royalty-free content.'}
            </p>
          </div>
          <button onClick={onClose} aria-label={lang === 'tr' ? 'Kapat' : 'Close'} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {videoEnabled && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => switchTab('image')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                mediaType === 'image' ? 'bg-fuchsia-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {lang === 'tr' ? 'Görseller' : 'Images'}
            </button>
            <button
              onClick={() => switchTab('video')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                mediaType === 'video' ? 'bg-fuchsia-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {lang === 'tr' ? 'Videolar' : 'Videos'}
              {isPremium && <Crown size={12} className="text-amber-300" />}
              {!isPremium && !canPickVideo && <Lock size={12} className="text-slate-500" />}
            </button>
          </div>
        )}

        {videoEnabled && mediaType === 'video' && !isPremium && (
          <div className={`mb-4 p-3 rounded-xl border text-xs ${canPickVideo ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'}`}>
            {canPickVideo ? (
              lang === 'tr'
                ? 'Ücretsiz üyelikte haftada 1 video seçebilirsin.'
                : 'Free plan includes 1 video pick per week.'
            ) : (
              <>
                {lang === 'tr'
                  ? `Bu haftaki ücretsiz video hakkını kullandın. ${formatNextAvailable(nextAvailableAt, lang)} tarihinde tekrar hakkın olacak.`
                  : `You've used this week's free video pick. Available again on ${formatNextAvailable(nextAvailableAt, lang)}.`}{' '}
                <a href={PREMIUM_UPGRADE_URL} target="_blank" rel="noopener noreferrer" className="underline font-bold text-amber-300">
                  {lang === 'tr' ? 'Premium\u2019a geç, sınırsız seç' : 'Go Premium for unlimited picks'}
                </a>
              </>
            )}
          </div>
        )}

        {lockedNotice && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
            {lang === 'tr'
              ? 'Bu videoyu eklemek için haftalık hakkını beklemen ya da Premium\u2019a geçmen gerekiyor.'
              : 'Adding this video requires your weekly pick to reset, or a Premium upgrade.'}
          </div>
        )}

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={lang === 'tr' ? 'Ara...' : 'Search...'}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {(QUICK_TAGS[lang] || QUICK_TAGS.en).map((tag) => (
            <button
              key={tag}
              onClick={() => handleQuickTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                query === tag ? 'bg-fuchsia-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {error && !loading && (
          <p className="text-rose-400 text-xs mb-3">{lang === 'tr' ? 'İçerikler yüklenemedi.' : 'Could not load content.'}</p>
        )}

        {!error && !loading && hits.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">
            {query.trim()
              ? (lang === 'tr' ? 'Sonuç bulunamadı.' : 'No results found.')
              : (lang === 'tr' ? 'Aramaya başla ya da bir etiket seç.' : 'Start searching or pick a tag.')}
          </p>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {hits.map((hit) => {
            const locked = mediaType === 'video' && !canPickVideo
            const key = selectionKey(mediaType, hit)
            const isSelected = multiSelect && selected.has(key)
            const isProcessing = multiSelect ? processingKey === key : selectingId === hit.id
            return (
              <button
                key={hit.id}
                onClick={() => handleSelect(hit)}
                disabled={multiSelect ? confirming : !!selectingId}
                className={`relative aspect-square rounded-lg overflow-hidden bg-black/30 group disabled:opacity-60 ${isSelected ? 'ring-2 ring-fuchsia-500' : ''}`}
              >
                {mediaType === 'video' ? (
                  <video
                    src={hit.previewURL}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={hit.previewURL}
                    alt={hit.tags?.join(', ') || 'Pixabay'}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                {locked && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Lock size={16} className="text-white/80" />
                  </div>
                )}
                {isSelected && !isProcessing && (
                  <>
                    <div className="absolute inset-0 bg-fuchsia-500/20" />
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-fuchsia-500 flex items-center justify-center shadow">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  </>
                )}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 size={20} className="text-white animate-spin" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="text-slate-500 animate-spin" />
          </div>
        )}

        {!loading && hasMore && hits.length > 0 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => search(mediaType, query.trim(), page + 1, false)}
              className="px-6 py-2 rounded-full bg-white/5 text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10"
            >
              {lang === 'tr' ? 'Daha Fazla' : 'Load More'}
            </button>
          </div>
        )}

        <p className="text-slate-600 text-[10px] text-center mt-5">
          {lang === 'tr' ? 'İçerikler Pixabay tarafından sağlanmaktadır.' : 'Content provided by Pixabay.'}
        </p>

        {multiSelect && selected.size > 0 && (
          <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 px-6 py-3 bg-[#141822]/97 backdrop-blur border-t border-white/10 flex items-center justify-between gap-3">
            <button
              onClick={clearSelection}
              disabled={confirming}
              className="text-slate-400 text-xs font-semibold hover:text-white disabled:opacity-50 shrink-0"
            >
              {lang === 'tr' ? 'Temizle' : 'Clear'}
            </button>
            <button
              onClick={handleConfirmSelection}
              disabled={confirming}
              className="flex-1 sm:flex-none sm:min-w-[180px] px-6 py-2.5 rounded-full bg-fuchsia-500 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {confirming && <Loader2 size={16} className="animate-spin" />}
              {confirming
                ? (lang === 'tr' ? 'Ekleniyor…' : 'Adding…')
                : (lang === 'tr' ? `Ekle (${selected.size})` : `Add (${selected.size})`)}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
