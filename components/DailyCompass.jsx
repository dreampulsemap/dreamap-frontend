import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DailyCompass({ lang }) {
  const [mounted, setMounted] = useState(false)
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [compassData, setCompassData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [alreadyUsed, setAlreadyUsed] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [errorMsg, setErrorMsg] = useState('') // Hata mesajı için yeni state
  
  const timerRef = useRef(null)
  const HOLD_DURATION = 2000 // 2 saniye basılı tutma gereksinimi

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // MOBİL VE MASAÜSTÜ KUSURSUZ JEST DENETİMİ
  const startHold = () => {
    if (alreadyUsed || loading || compassData) return
    setHolding(true)
    setProgress(0)
    setErrorMsg('')
    
    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const perc = Math.min((elapsed / HOLD_DURATION) * 100, 100)
      setProgress(perc)
      
      if (perc >= 100) {
        clearInterval(timerRef.current)
        setHolding(false)
        fetchReading()
      }
    }, 50)
  }

  const endHold = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setHolding(false)
    if (progress < 100) setProgress(0)
  }

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
  const instruction = lang === 'tr' ? 'Günün frekansını almak için basılı tut' : 'Hold to align with today’s frequency'

  if (!mounted) {
    return (
      <div className="glass-card relative overflow-hidden rounded-[24px] p-6 sm:p-8 min-h-[200px] animate-pulse">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-8 rounded-full bg-white/5" />
          <div className="w-24 h-24 rounded-full bg-white/5" />
          <div className="w-40 h-4 rounded bg-white/5" />
        </div>
      </div>
    )
  }

  if (compassData) {
    return (
      <div 
        className="relative overflow-hidden rounded-[24px] p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[220px] transition-all duration-1000 border border-white/10 shadow-2xl"
        style={{ background: `radial-gradient(circle at center, ${compassData.color}40 0%, #050711 80%)` }}
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
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-white transition-all hover:scale-105 shadow-lg"
          style={{ backgroundColor: compassData.color }}
        >
          <span>📸</span> {lang === 'tr' ? 'Hikayende Paylaş' : 'Share to Story'}
        </button>
      </div>
    )
  }

  return (
    <div className="glass-card relative overflow-hidden rounded-[24px] p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[200px] shadow-[0_0_40px_rgba(34,211,238,0.05)] select-none">
      <div className={`absolute inset-0 transition-opacity duration-1000 ${holding ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-fuchsia-500/20 blur-[50px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-400/20 blur-[40px] rounded-full" />
      </div>

      <h3 className="relative z-10 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300 mb-2">
        🧭 {title}
      </h3>

      {alreadyUsed ? (
        <div className="relative z-10 mt-6 flex flex-col items-center gap-2">
          <span className="text-2xl text-slate-500">⏳</span>
          <p className="text-slate-400 text-xs uppercase tracking-widest">
            {lang === 'tr' ? 'Pusula hizalanıyor...' : 'Compass realigning...'}
          </p>
          <p className="text-fuchsia-400 font-mono text-xl font-bold mt-1 tracking-wider">
            {timeLeft}
          </p>
        </div>
      ) : (
        <div className="relative z-10 mt-4 flex flex-col items-center gap-4">
          <button
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
            onTouchCancel={endHold}
            className="relative flex items-center justify-center w-24 h-24 rounded-full border border-white/20 bg-black/50 shadow-xl touch-none select-none transition-transform hover:scale-105 active:scale-95"
            style={{ WebkitUserSelect: 'none', touchAction: 'none' }}
          >
            <div 
              className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-fuchsia-500/50 to-cyan-500/50 rounded-full transition-all ease-linear"
              style={{ height: `${progress}%` }}
            />
            <span className={`relative text-4xl transition-all ${holding ? 'animate-pulse scale-110' : ''}`}>
              {loading ? '🔮' : '👁️'}
            </span>
          </button>
          
          <p className="text-xs text-white/50 tracking-wider">
            {loading ? (lang === 'tr' ? 'Frekans çözümleniyor...' : 'Decoding frequency...') : instruction}
          </p>
          
          {/* HATA VARSA EKRANA BAS */}
          {errorMsg && (
            <p className="text-xs text-rose-400 font-medium tracking-wider mt-2">
              ⚠️ {errorMsg}
            </p>
          )}
        </div>
      )}
    </div>
  )
}