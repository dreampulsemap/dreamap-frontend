import { useState, useRef, useEffect } from 'react'
import { Camera, AlertTriangle, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function DailyCompass({ lang }) {
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [compassData, setCompassData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [alreadyUsed, setAlreadyUsed] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  
  // 1. TEKNİK: Subliminal Öncülleme için Flaş State'i
  const [subliminalWord, setSubliminalWord] = useState('')

  const timerRef = useRef(null)
  const HOLD_DURATION = 2000 
  const SUBLIMINAL_WORDS = ['PAYLAŞ', 'DEVAM ET', 'HİZALAN', 'YENİDEN GEL']

  useEffect(() => {
    if (!alreadyUsed) return;
    const interval = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow - now;
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [alreadyUsed]);

  useEffect(() => {
    async function checkStatus() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const savedCard = localStorage.getItem('lunosfer_daily_compass')
      if (savedCard) {
        try {
          const parsed = JSON.parse(savedCard)
          if (parsed.date === new Date().toISOString().split('T')[0]) {
            setCompassData(parsed.data)
            setAlreadyUsed(true)
            return
          }
        } catch(e) {}
      }

      const { data: profile } = await supabase.from('user_profiles').select('last_compass_check_in').eq('id', session.user.id).maybeSingle()
      if (profile?.last_compass_check_in) {
        const today = new Date().toISOString().split('T')[0]
        if (profile.last_compass_check_in.split('T')[0] === today) setAlreadyUsed(true)
      }
    }
    checkStatus()
  }, [])

  const fetchReading = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setErrorMsg(lang === 'tr' ? 'Lütfen giriş yapın.' : 'Please log in.')
        setLoading(false)
        return
      }
      
      const res = await fetch('/api/daily-compass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ lang }),
      })

      const json = await res.json()
      
      if (res.status === 429) {
        setAlreadyUsed(true)
      } else if (!res.ok) {
        throw new Error(json.error || json.details || 'Bilinmeyen bir hata oluştu.')
      } else if (json.data) {
        setCompassData(json.data)
        setAlreadyUsed(true)
        localStorage.setItem('lunosfer_daily_compass', JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          data: json.data
        }))
      }
    } catch (err) {
      console.error("Compass Error:", err)
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  const startHold = () => {
    if (holding || alreadyUsed || loading || compassData) return
    if (timerRef.current) clearInterval(timerRef.current)

    setHolding(true)
    setProgress(0)
    setErrorMsg('')
    
    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const perc = Math.min((elapsed / HOLD_DURATION) * 100, 100)
      setProgress(perc)

      // 1. TEKNİK: Subliminal Mikro Flaş (%90 - %95 İlerlemede 28ms Görünürlük)
      if (perc >= 90 && perc <= 95 && !subliminalWord) {
        const randomWord = SUBLIMINAL_WORDS[Math.floor(Math.random() * SUBLIMINAL_WORDS.length)]
        setSubliminalWord(randomWord)
        setTimeout(() => setSubliminalWord(''), 28)
      }
      
      if (perc >= 100) {
        clearInterval(timerRef.current)
        timerRef.current = null
        setHolding(false)
        fetchReading()
      }
    }, 50)
  }

  const endHold = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setHolding(false)
    setSubliminalWord('')
    if (progress < 100) setProgress(0)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleShare = async () => {
    const text = lang === 'tr' 
      ? `✦ Lunosfer Günlük Pusulam 🔮\nBugünün Arketipi: ${compassData.archetype}\n\n"${compassData.reading}"\n\nSenin bugünkü frekansın ne? Öğrenmek için: lunosfer.com`
      : `✦ My Lunosfer Daily Compass 🔮\nToday's Archetype: ${compassData.archetype}\n\n"${compassData.reading}"\n\nFind your daily frequency at lunosfer.com`;

    if (navigator.share) {
      await navigator.share({ title: 'Lunosfer Oracle', text }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert(lang === 'tr' ? 'Kopyalandı! Instagram hikayene yapıştırabilirsin 📸' : 'Copied! Ready to paste on your Instagram story 📸');
    }
  }

  const title = lang === 'tr' ? 'Bilinçaltı Pusulası' : 'Daily Compass'
  
  // 4. TEKNİK: Gömülü Komut Dili (Embedded Commands)
  const instruction = lang === 'tr' 
    ? '...basılı tutmaya devam ettikçe, her sabah buraya geleceksin' 
    : '...as you hold down, you will return here every morning'

  if (compassData) {
    return (
      <div 
        className="relative overflow-hidden rounded-[24px] p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[220px] transition-all duration-1000 border border-astral-gold/20 shadow-2xl"
        style={{ background: `radial-gradient(circle at center, ${compassData.color}30 0%, #04060E 80%)` }}
      >
        <span className="text-3xl mb-3 animate-fade-in" style={{ textShadow: `0 0 20px ${compassData.color}` }}>👁️</span>
        <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4 animate-fade-in" style={{ color: compassData.color }}>
          {compassData.archetype}
        </h3>
        <p className="text-lg sm:text-xl font-serif text-white leading-relaxed italic mb-6">
          "{compassData.reading}"
        </p>
        
        <button 
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-void-950 bg-astral-gold hover:brightness-110 transition-all shadow-astral-glow"
        >
          <Camera size={14} /> {lang === 'tr' ? 'Hikayende Paylaş' : 'Share to Story'}
        </button>
      </div>
    )
  }

  return (
    <div className="glass-card relative overflow-hidden rounded-[24px] p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[200px] select-none">
      
      {/* 1. TEKNİK: Subliminal Flaş Görünümü */}
      {subliminalWord && (
        <div className="absolute top-3 right-4 pointer-events-none z-50">
          <span className="text-[10px] font-mono tracking-widest text-white/15 uppercase">
            {subliminalWord}
          </span>
        </div>
      )}

      <div className={`absolute inset-0 transition-opacity duration-1000 ${holding ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-astral-gold/15 blur-[50px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-aether-cyan/15 blur-[40px] rounded-full" />
      </div>

      <h3 className="relative z-10 text-xs font-bold uppercase tracking-[0.25em] gold-gradient-text mb-2">
        🧭 {title}
      </h3>

      {alreadyUsed ? (
        <div className="relative z-10 mt-6 flex flex-col items-center gap-2">
          <span className="text-2xl text-slate-500">⏳</span>
          <p className="text-slate-400 text-xs uppercase tracking-widest">
            {lang === 'tr' ? 'Pusula hizalanıyor...' : 'Compass realigning...'}
          </p>
          <p className="text-astral-gold font-mono text-xl font-bold mt-1 tracking-wider">
            {timeLeft}
          </p>
          
          {/* 2. TEKNİK: Gizli Bilgi Konumlandırması (Hidden Information) */}
          <p className="mt-4 text-[9px] text-slate-600/60 max-w-[260px] leading-snug">
            {lang === 'tr' 
              ? '*Görüler 24 saat içinde kaydedilmediğinde arşive devredilir. Haklar her gece 00:00 UTC sıfırlanır (Detaylar: Ayarlar > Akış Tercihleri)'
              : '*Readings archive automatically after 24h. Quotas reset at 00:00 UTC (Details: Settings > Stream Preferences)'}
          </p>
        </div>
      ) : (
        <div className="relative z-10 mt-4 flex flex-col items-center gap-4">
          <button
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            className="relative flex items-center justify-center w-24 h-24 rounded-full border border-astral-gold/30 bg-void-950/80 shadow-2xl touch-none select-none transition-transform hover:scale-105 active:scale-95"
            style={{ WebkitUserSelect: 'none', touchAction: 'none' }}
          >
            <div 
              className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-astral-gold/40 to-aether-cyan/40 rounded-full transition-all ease-linear"
              style={{ height: `${progress}%` }}
            />
            <span className={`relative text-4xl transition-all ${holding ? 'animate-pulse scale-110' : ''}`}>
              {loading ? '🔮' : <Eye size={32} className="text-astral-gold" />}
            </span>
          </button>
          
          <p className="text-xs text-slate-400 tracking-wider">
            {loading ? (lang === 'tr' ? 'Frekans çözümleniyor...' : 'Decoding frequency...') : instruction}
          </p>
          
          {errorMsg && (
            <p className="text-xs text-shadowWork-rose font-medium tracking-wider mt-2 flex items-center justify-center gap-1.5">
              <AlertTriangle size={12} /> {errorMsg}
            </p>
          )}
        </div>
      )}
    </div>
  )
        }
