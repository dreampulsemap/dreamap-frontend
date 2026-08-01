import { useState, useEffect, useMemo, useRef } from 'react'
import { AlertTriangle, Image as ImageIcon, Upload, X } from 'lucide-react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { tAddDream, normalizeAddDreamLang } from '@/lib/addDreamTranslations'
import TagInput from '@/components/TagInput'
import PixabayPicker from '@/components/PixabayPicker'
import { uploadDreamCoverImage, getDreamUploadErrorMessage } from '@/lib/uploadDreamCoverImage'

export default function AddDreamPage() {
  const { i18n } = useTranslation()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const lang = useMemo(() => {
    return mounted ? normalizeAddDreamLang(i18n.resolvedLanguage || i18n.language) : 'en'
  }, [mounted, i18n.resolvedLanguage, i18n.language])

  const [user, setUser] = useState(null)
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [inFeed, setInFeed] = useState(true)
  const [visibility, setVisibility] = useState('public')
  const [selectedEmotions, setSelectedEmotions] = useState([])
  const [tags, setTags] = useState([])
  const [coverImage, setCoverImage] = useState(null) // { url, width, height, source: 'pixabay' | 'user_upload' }
  const [showPixabayPicker, setShowPixabayPicker] = useState(false)
  const [coverImageError, setCoverImageError] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)
  const committedFinalRef = useRef('')
  const coverFileInputRef = useRef(null)

  // 12.000 Karakter limiti (Yaklaşık 1500-2000 kelime / Optimize edilmiş token sınırı)
  const CHAR_LIMIT = 12000
  const charCount = content.length

  const emotions = useMemo(
    () => [
      { value: 'Joy', emoji: '😊', label: tAddDream('emotion.joy', lang) },
      { value: 'Peace', emoji: '😌', label: tAddDream('emotion.peace', lang) },
      { value: 'Love', emoji: '🥰', label: tAddDream('emotion.love', lang) },
      { value: 'Hope', emoji: '✨', label: tAddDream('emotion.hope', lang) },
      { value: 'Awe', emoji: '😲', label: tAddDream('emotion.awe', lang) },
      { value: 'Surprise', emoji: '😮', label: tAddDream('emotion.surprise', lang) },
      { value: 'Curiosity', emoji: '🤔', label: tAddDream('emotion.curiosity', lang) },
      { value: 'Confusion', emoji: '😕', label: tAddDream('emotion.confusion', lang) },
      { value: 'Fear', emoji: '😨', label: tAddDream('emotion.fear', lang) },
      { value: 'Anxiety', emoji: '😰', label: tAddDream('emotion.anxiety', lang) },
      { value: 'Sadness', emoji: '😢', label: tAddDream('emotion.sadness', lang) },
      { value: 'Loneliness', emoji: '🫥', label: tAddDream('emotion.loneliness', lang) },
      { value: 'Anger', emoji: '😡', label: tAddDream('emotion.anger', lang) },
      { value: 'Shame', emoji: '😞', label: tAddDream('emotion.shame', lang) },
      { value: 'Disgust', emoji: '🤢', label: tAddDream('emotion.disgust', lang) },
      { value: 'Relief', emoji: '😮‍💨', label: tAddDream('emotion.relief', lang) }
    ],
    [lang]
  )

  useEffect(() => {
    let active = true
    async function checkUser() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          router.push('/auth')
          return
        }
        if (!active) return
        setUser(currentUser)
        fetchLocationFromIP()
      } catch (err) {
        router.push('/auth')
      }
    }
    checkUser()
    return () => { active = false }
  }, [router])

  async function fetchLocationFromIP() {
    try {
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()
      if (data?.city && data?.country_name) {
        setLocation(`${data.city}, ${data.country_name}`)
      }
    } catch (err) {
      console.error('Location could not be fetched:', err)
    }
  }

  // Sesli Giriş Motoru (Web Speech API)
  const toggleSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(lang === 'tr' ? "Tarayıcınız ses tanımayı desteklemiyor." : "Browser does not support speech recognition.");
      return;
    }

    // Zaten çalışan bir motor varsa gerçekten durdur (sadece state değil).
    // Eskiden burada sadece setIsListening(false) çağrılıyordu; asıl SpeechRecognition
    // nesnesi hiç durdurulmadığı için arka planda çalışmaya devam ediyordu. Kullanıcı
    // mikrofona tekrar bastığında ikinci bir motor daha başlatılıyor, ikisi de aynı
    // konuşmayı ayrı ayrı "final" olarak algılayıp metne ekliyordu — kelimelerin
    // 2-3 kez tekrar etmesinin sebebi buydu.
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'tr' ? 'tr-TR' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      committedFinalRef.current = '';
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      // Sadece resultIndex'ten itibaren değil, dizideki TÜM final sonuçları
      // yeniden birleştirip önceden eklediğimiz kısımla karşılaştırıyoruz.
      // Bazı mobil tarayıcılarda "continuous" modda motor arka planda sessizce
      // yeniden başlayıp results dizisini resetleyebiliyor; sadece resultIndex'e
      // güvenmek bu durumda aynı cümlenin ikinci kez eklenmesine yol açabiliyordu.
      let fullFinal = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          fullFinal += event.results[i][0].transcript + ' ';
        }
      }

      if (fullFinal && fullFinal !== committedFinalRef.current) {
        const newPart = fullFinal.startsWith(committedFinalRef.current)
          ? fullFinal.slice(committedFinalRef.current.length)
          : fullFinal; // motor sonuç dizisini sıfırladıysa güvenli geri dönüş

        committedFinalRef.current = fullFinal;

        if (newPart.trim()) {
          setContent(prev => {
            const newContent = prev + newPart;
            return newContent.length > CHAR_LIMIT ? newContent.slice(0, CHAR_LIMIT) : newContent;
          });
        }
      }
    };

    recognition.onerror = (e) => {
      console.error(e);
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Sayfadan ayrılırken mikrofon açık kaldıysa motoru kapat (memory leak / unmount
  // sonrası setState uyarılarını önler).
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  async function handlePickPixabayImage(hit) {
    setCoverImageError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/dreams/pixabay-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          pixabayId: hit.id,
          imageUrl: hit.largeImageURL || hit.webformatURL,
          tags: hit.tags,
          pixabayUser: hit.user,
          width: hit.width,
          height: hit.height,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setCoverImageError(json.error || 'error')
        return false
      }
      setCoverImage({ url: json.url, width: json.width, height: json.height, source: 'pixabay' })
      return true
    } catch (err) {
      setCoverImageError('network_error')
      return false
    }
  }

  async function handleDeviceCoverUpload(e) {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file) return

    setCoverImageError('')
    setUploadingCover(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setCoverImageError(tAddDream('common.errorGeneric', lang))
        return
      }
      // Rüya henüz oluşturulmadı — dreamId geçmiyoruz, kullanıcı klasörünün
      // köküne yükleniyor (bkz. lib/uploadDreamCoverImage.js).
      const result = await uploadDreamCoverImage({ file, userId: session.user.id })
      setCoverImage(result)
    } catch (err) {
      setCoverImageError(getDreamUploadErrorMessage(err, lang))
    } finally {
      setUploadingCover(false)
    }
  }

  const toggleEmotion = (val) => {
    setSelectedEmotions(prev => 
      prev.includes(val) ? prev.filter(e => e !== val) : [...prev, val]
    );
  };

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!content.trim()) {
      setError(tAddDream('dream.validationContent', lang))
      return
    }

    if (charCount > CHAR_LIMIT) {
      setError(lang === 'tr' ? `Metin çok uzun! Maksimum ${CHAR_LIMIT} karakter.` : `Text too long! Maximum ${CHAR_LIMIT} characters.`);
      return;
    }

    if (!user?.id) {
      setError(tAddDream('common.errorGeneric', lang))
      return
    }

    setLoading(true)

    try {
      const { data, error: insertError } = await supabase
        .from('dreams')
        .insert([{
            user_id: user.id,
            content: content.trim(),
            location_name: location.trim() || tAddDream('location.unknown', lang),
            in_feed: inFeed,
            visibility,
            user_selected_sentiment: selectedEmotions.join(', '), // Çoklu Duygular Virgülle Ayrılır
            dream_date: new Date().toISOString().split('T')[0],
            original_language: lang,
            tags,
            ...(coverImage ? {
              ai_image_url: coverImage.url,
              image_source: coverImage.source || 'pixabay',
              image_width: coverImage.width || null,
              image_height: coverImage.height || null,
              // Pixabay/cihaz yüklemesi her zaman kalıcı depoya (image-library
              // ya da dream-images bucket'ı) iniyor, bu yüzden doğrudan 'ok'.
              // reanalyze-dreams.js (teaser analiz) artık zaten dolu olan
              // ai_image_url'in üzerine yazmıyor — kullanıcının seçtiği
              // görsel korunuyor.
              image_status: 'ok',
              image_checked_at: new Date().toISOString(),
            } : {}),
        }])
        .select()
        .single()

      if (insertError) throw insertError
      if (!data?.id) throw new Error(tAddDream('dream.createFailed', lang))

      // API Üzerinden Teaser Analizi Tetikleme
      fetch('/api/analyze-dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamId: data.id, content: content.trim(), lang })
      }).catch(console.error)

      router.push(`/profile?highlightDream=${data.id}`)
    } catch (err) {
      console.error('Add dream failed:', err)
      setError(err?.message || tAddDream('common.errorGeneric', lang))
    } finally {
      setLoading(false)
    }
  }

  if (!user || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-brand-primary-300 text-sm tracking-widest uppercase font-bold animate-pulse">
          {mounted ? tAddDream('auth.loading', lang) : <span className="inline-block h-4 w-24 rounded bg-white/10 align-middle" />}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050711] text-white overflow-x-hidden pb-24">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 mt-6">
        <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-white/10 bg-slate-900/40 shadow-[0_30px_100px_rgba(0,0,0,0.4)]">
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-brand-primary-500/10 border border-brand-primary-500/20 text-[10px] uppercase tracking-widest text-brand-primary-300 mb-3">
              ✦ LUNOSFER JOURNAL
            </span>
            <h1 className="text-3xl font-bold font-serif text-white">
              {tAddDream('dream.addTitle', lang)}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* RÜYA METNİ & SESLİ GİRİŞ */}
            <div className="relative">
              <div className="flex justify-between items-end mb-2">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                  {tAddDream('dream.dreamText', lang)}
                </label>
                <span className={`text-[10px] font-mono ${charCount > CHAR_LIMIT * 0.9 ? 'text-semantic-danger-400' : 'text-slate-500'}`}>
                  {charCount} / {CHAR_LIMIT}
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-3xl p-5 text-sm leading-relaxed text-slate-200 focus:border-brand-primary-500/50 focus:ring-1 focus:ring-brand-primary-500/50 outline-none min-h-[220px] transition-all resize-none"
                required
                placeholder={tAddDream('dream.placeholder', lang)}
              />
              <button
                type="button"
                onClick={toggleSpeech}
                title={lang === 'tr' ? 'Sesli Dikte' : 'Voice Dictation'}
                className={`absolute bottom-5 right-5 h-10 w-10 flex items-center justify-center rounded-full transition-all shadow-lg ${
                  isListening ? 'bg-semantic-danger-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                🎤
              </button>
            </div>

            {/* DUYGU SEÇİMİ (ÇOKLU) */}
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-4">
                {tAddDream('dream.emotions', lang)}
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {emotions.map((emotion) => (
                  <button
                    key={emotion.value}
                    type="button"
                    onClick={() => toggleEmotion(emotion.value)}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-2xl border transition-all ${
                      selectedEmotions.includes(emotion.value)
                        ? 'bg-brand-primary-500/20 border-brand-primary-400/50 shadow-[0_0_15px_rgba(240,73,214,0.15)]'
                        : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/5 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className="text-xl mb-1">{emotion.emoji}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-300 truncate w-full px-1 text-center">
                      {emotion.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ETİKETLER (MAX 10) */}
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl">
              <TagInput tags={tags} onChange={setTags} lang={lang} />
            </div>

            {/* KAPAK GÖRSELİ (CİHAZDAN YÜKLE / PIXABAY'DEN SEÇ) */}
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-3">
                {lang === 'tr' ? 'Kapak Görseli (opsiyonel)' : 'Cover Image (optional)'}
              </label>
              {coverImage ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
                  <img src={coverImage.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    aria-label={lang === 'tr' ? 'Görseli kaldır' : 'Remove image'}
                    className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 py-6 text-sm text-slate-400 hover:border-brand-primary-400/40 hover:text-brand-primary-200 transition-all disabled:opacity-50"
                  >
                    <Upload size={16} />
                    {uploadingCover
                      ? (lang === 'tr' ? 'Yükleniyor...' : 'Uploading...')
                      : (lang === 'tr' ? 'Cihazından Yükle' : 'Upload From Device')}
                  </button>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingCover}
                    onChange={handleDeviceCoverUpload}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPixabayPicker(true)}
                    disabled={uploadingCover}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 py-6 text-sm text-slate-400 hover:border-brand-primary-400/40 hover:text-brand-primary-200 transition-all disabled:opacity-50"
                  >
                    <ImageIcon size={16} />
                    {lang === 'tr' ? "Pixabay'dan Seç" : 'From Pixabay'}
                  </button>
                </div>
              )}
              {coverImageError && (
                <p className="mt-2 text-[10px] text-semantic-danger-400">
                  {coverImageError}
                </p>
              )}
              <p className="mt-2 text-[10px] text-slate-600">
                {lang === 'tr'
                  ? 'Seçmezsen rüyan analiz edildiğinde otomatik bir görsel üretilir.'
                  : "If you skip this, an image will be generated automatically once your dream is analyzed."}
              </p>
            </div>

            {/* KONUM VE GÖRÜNÜRLÜK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-3">
                  {tAddDream('dream.location', lang)}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-brand-primary-500/50 focus:outline-none"
                  placeholder={tAddDream('dream.locationPlaceholder', lang)}
                />
              </div>

              <div className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl">
                <label className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-3">
                  {tAddDream('dream.visibility', lang)}
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-brand-primary-500/50 focus:outline-none appearance-none"
                >
                  <option value="public">{tAddDream('dream.public', lang)}</option>
                  <option value="friends">{tAddDream('dream.friends', lang)}</option>
                  <option value="private">{tAddDream('dream.private', lang)}</option>
                </select>
              </div>
            </div>

            {/* AKIŞ PAYLAŞIMI */}
            <label className="flex items-center justify-center gap-3 p-4 border border-white/5 rounded-2xl bg-white/[0.01] cursor-pointer">
              <input
                type="checkbox"
                checked={inFeed}
                onChange={(e) => setInFeed(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 text-brand-primary-500 focus:ring-0 focus:ring-offset-0 bg-black"
              />
              <span className="text-sm text-slate-300 font-medium">
                {tAddDream('dream.shareInFeed', lang)}
              </span>
            </label>

            {error && (
              <div className="text-semantic-danger-400 text-xs text-center bg-semantic-danger-500/10 p-3 rounded-xl border border-semantic-danger-500/20 font-medium flex items-center justify-center gap-1.5">
                <AlertTriangle size={13} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || content.trim().length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-primary-600 to-indigo-600 px-6 py-4 text-sm font-bold text-white transition hover:scale-[1.02] hover:brightness-110 shadow-[0_0_20px_rgba(240,73,214,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span>{loading ? '⏳' : '✦'}</span>
              <span>{loading ? tAddDream('auth.loading', lang) : tAddDream('dream.submit', lang)}</span>
            </button>
            
          </form>
        </div>
      </div>

      {showPixabayPicker && (
        <PixabayPicker
          lang={lang}
          videoEnabled={false}
          onPickImage={handlePickPixabayImage}
          onClose={() => setShowPixabayPicker(false)}
        />
      )}
    </div>
  )
}