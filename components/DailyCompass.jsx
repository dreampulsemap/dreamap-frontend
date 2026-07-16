import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DailyCompass({ lang }) {
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [compassData, setCompassData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [alreadyUsed, setAlreadyUsed] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [streak, setStreak] = useState(0) // YENİ: Seri (Streak) Sistemi 🔥
  
  const timerRef = useRef(null)
  const HOLD_DURATION = 2000 

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

      // Cihazdan geçmiş gün sayısını (Streak) çek
      const savedStreak = parseInt(localStorage.getItem('lunosfer_streak') || '0', 10);
      setStreak(savedStreak);

      const savedCard = localStorage.getItem('lunosfer_daily_compass')
      if (savedCard) {
        const parsed = JSON.parse(savedCard)
        const today = new Date().toISOString().split('T')[0];
        
        // Eğer dün girmiş ama bugün girmemişse seriyi koru, 2 gün girmemişse sıfırla
        const lastDate = new Date(parsed.date);
        const currentDate = new Date(today);
        const diffDays = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
          setStreak(0);
          localStorage.setItem('lunosfer_streak', '0');
        }

        if (parsed.date === today) {
          setCompassData(parsed.data)
          setAlreadyUsed(true)
          return
        }
      }

      const { data: profile } = await supabase.from('user_profiles').select('last_compass_check_in').eq('id', session.user.id).single()
      if (profile?.last_compass_check_in) {
        const today = new Date().toISOString().split('T')[0]
        if (profile.last_compass_check_in.split('T')[0] === today) setAlreadyUsed(true)
      }
    }
    checkStatus()
  }, [])

  const fetchReading = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/daily-compass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ lang }),
      })

      const json = await res.json()
      if (res.status === 429) {
        setAlreadyUsed(true)
      } else if (json.data) {
        setCompassData(json.data)
        setAlreadyUsed(true)
        
        // Seriyi (Streak) 1 artır
        const newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem('lunosfer_streak', newStreak.toString());

        localStorage.setItem('lunosfer_daily_compass', JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          data: json.data
        }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const startHold = () => {
    if (alreadyUsed || loading || compassData) return
    setHolding(true)
    setProgress(0)
    
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
      ? `✦ Lunosfer Günlük Pusulam 🔮\nBugünün Arketipi: ${compassData.archetype} (Seri: ${streak}🔥)\n\n"${compassData.reading}"\n\nSenin bugünkü frekansın ne? Öğrenmek için: lunosfer.com`
      : `✦ My Lunosfer Daily Compass 🔮\nToday's Archetype: ${compassData.archetype} (Streak: ${streak}🔥)\n\n"${compassData.reading}"\n\nFind your daily frequency at lunosfer.com`;

    if (navigator.share) {
      await navigator.share({ title: 'Lunosfer Oracle', text }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert(lang === 'tr' ? 'Kopyalandı! Instagram hikayene yapıştırabilirsin 📸' : 'Copied! Ready to paste on your Instagram story 📸');
    }
  }

  const title = lang === 'tr' ? 'Bilinçaltı Pusulası' : 'Daily Compass'
  const instruction = lang === 'tr' ? 'Günün frekansını almak için basılı tut' : 'Hold to align with today’s frequency'

  if (compassData) {
    return (
      <div 
        className="relative overflow-hidden rounded-[24px] p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[220px] transition-all duration-1000 border border-white/10 shadow-2xl"
        style={{ background: `radial-gradient(circle at center, ${compassData.color}40 0%, #050711 80%)` }}
      >
        <div className="absolute top-4 right-5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 shadow-lg animate-fade-in">
          <span className="text-orange-400 text-sm">🔥</span>
          <span className="text-white font-bold font-mono text-xs">{streak}</span>
        </div>

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
    <div className="glass-card relative overflow-hidden rounded-[24px] p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[200px] shadow-[0_0_40px_rgba(34,211,238,0.05)]">
      {streak > 0 && (
        <div className="absolute top-4 right-5 bg-white/5 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
          <span className="text-orange-400/50 text-sm grayscale">🔥</span>
          <span className="text-white/50 font-bold font-mono text-xs">{streak}</span>
        </div>
      )}

      <div className={`absolute inset-0 transition-opacity duration-1000 ${holding ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-fuchsia-500/20 blur-[50px] rounded-full" />
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
            className="relative flex items-center justify-center w-24 h-24 rounded-full border border-white/20 bg-black/50 shadow-xl touch-none select-none transition-transform hover:scale-105 active:scale-95"
            style={{ WebkitUserSelect: 'none' }}
          >
            <div 
              className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-fuchsia-500/80 to-cyan-500/80 rounded-full transition-all ease-linear"
              style={{ height: `${progress}%` }}
            />
            <span className={`relative text-4xl transition-all ${holding ? 'animate-pulse scale-110' : ''}`}>
              {loading ? '🔮' : '👁️'}
            </span>
          </button>
          
          <p className="text-xs text-white/50 tracking-wider">
            {loading ? (lang === 'tr' ? 'Frekans çözümleniyor...' : 'Decoding frequency...') : instruction}
          </p>
        </div>
      )}
    </div>
  )
}