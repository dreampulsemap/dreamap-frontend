import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import DreamCard from '../components/DreamCard';

export default function Home() {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';
  
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [translatingDreams, setTranslatingDreams] = useState({});
  const [activeTab, setActiveTab] = useState('trending'); 

  // CANLI SAYAÇ İÇİN STATE MECHANISM
  const [onlineCount, setOnlineCount] = useState(4532);

  // 1. Dinamik Çevrimiçi Kişi Simülasyonu (Fare Kapanı Etkisi)
  useEffect(() => {
    // Sayfa ilk açıldığında rastgele gerçekçi bir taban sayı ata
    setOnlineCount(Math.floor(Math.random() * (4900 - 4200 + 1)) + 4200);

    // Her 4 saniyede bir sayıyı doğal bir şekilde dalgalandır (-5 ile +7 arası)
    const interval = setInterval(() => {
      setOnlineCount(prev => {
        const change = Math.floor(Math.random() * 13) - 5; // -5, -4 ... +7
        const newCount = prev + change;
        // Sayının aşırı uçlara kaçmasını engellemek için sınır koyuyoruz
        return newCount < 4000 || newCount > 5200 ? prev - change : newCount;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // 2. Supabase'den Akışta Görünecek Rüyaları Çekme[span_0](start_span)[span_0](end_span)
  useEffect(() => {
    async function fetchDreams() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('dreams')
          .select('*')
          .eq('in_feed', true)
          .order(activeTab === 'trending' ? 'likes_count' : 'created_at', { ascending: false })
          .limit(24);[span_1](start_span)[span_1](end_span)

        if (error) throw error;
        setDreams(data || []);
      } catch (err) {
        console.error('Rüyalar yüklenirken hata oluştu:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDreams();
  }, [activeTab]);

  // 3. Çeviri Yönetimi[span_2](start_span)[span_2](end_span)[span_3](start_span)[span_3](end_span)
  async function handleTranslateDream(dream) {
    const dreamId = dream.id;
    
    if (translatingDreams[dreamId]?.translated) {
      setTranslatingDreams(prev => ({
        ...prev,
        [dreamId]: { ...prev[dreamId], translated: false }
      }));
      return;
    }

    setTranslatingDreams(prev => ({
      ...prev,
      [dreamId]: { ...prev[dreamId], loading: true }
    }));

    try {
      const getDreamAnalysis = () => dream[`ai_summary_${lang}`] || dream.ai_summary || dream.ai_summary_en || '';[span_4](start_span)[span_4](end_span)[span_5](start_span)[span_5](end_span)

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamText: dream.content,
          analysisText: getDreamAnalysis(),
          targetLang: lang,
          dreamId: dream.id
        })
      });
      
      const data = await res.json();
      
      if (data.translated) {
        setTranslatingDreams(prev => ({
          ...prev,
          [dreamId]: { 
            translated: true,
            translatedContent: data.translated,
            translatedAnalysis: data.analysisTranslated 
          }
        }));
      }
    } catch (err) {
      console.error('Çeviri hatası:', err);
    } finally {
      setTranslatingDreams(prev => ({
        ...prev,
        [dreamId]: { ...prev[dreamId], loading: false }
      }));
    }
  }

  return (
    <div className="min-h-screen text-[#e0e0ff] bg-[#020208] relative overflow-x-hidden selection:bg-pink-500/30 font-sans">
      
      <div className="starry-bg"></div>[span_6](start_span)[span_6](end_span)
      <div className="floating-orb orb-2" style={{ background: 'radial-gradient(circle, #ec4899, transparent)', opacity: 0.15 }}></div>[span_7](start_span)[span_7](end_span)

      <Navbar />
      <Hero />

      <main className="max-w-7xl mx-auto px-4 pb-24 relative z-10 -mt-6">
        
        {/* AKTİF VE DEĞİŞKEN SAYAÇLI GEZİNTİ BARBARI */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 bg-white/5 border border-white/10 p-2 rounded-2xl backdrop-blur-md">
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('trending')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'trending' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-pink-500/20 scale-105' 
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              🔥 Popüler Kehanetler
            </button>
            <button 
              onClick={() => setActiveTab('fresh')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'fresh' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-pink-500/20 scale-105' 
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              ⚡ Canlı Rüya Akışı
            </button>
          </div>

          {/* SAYAÇ ARTIK BURADA CANLI OLARAK DEĞİŞİYOR */}
          <div className="flex gap-4 text-xs font-bold tracking-wider uppercase text-white/80 w-full sm:w-auto justify-around sm:justify-end px-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span>
                <strong className="text-red-400 transition-all duration-500 tabular-nums">
                  {onlineCount.toLocaleString()}
                </strong> rüya gören çevrimiçi
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 border-l border-white/10 pl-4">
              <span>🔮 Günün Gizemi: <strong className="text-purple-400 animate-pulse">Analiz Ediliyor</strong></span>
            </div>
          </div>

        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-pink-400 text-xs font-bold tracking-widest uppercase animate-pulse">Bilinçaltı Dalgaları Yakalanıyor...</p>
          </div>
        ) : dreams.length === 0 ? (
          <div className="glass-card p-12 text-center max-w-md mx-auto border border-white/10 rounded-3xl">[span_8](start_span)[span_8](end_span)
            <span className="text-5xl block mb-3 animate-bounce">💤</span>
            <h3 className="text-xl font-bold text-white mb-2">Henüz Kimse Uyumadı mı?</h3>
            <p className="text-white/60 text-sm mb-6">İlk gizemli rüyayı sen gönder, akışı hemen başlat!</p>
            <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-sm text-white">Rüyamı Çöz</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {dreams.map((dream) => {
              const transState = translatingDreams[dream.id] || {};
              return (
                <div key={dream.id} className="relative group transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <DreamCard 
                    dream={dream} 
                    lang={lang}
                    translating={transState.loading || false}
                    translated={transState.translated || false}
                    translatedContent={transState.translatedContent || ''}
                    translatedAnalysis={transState.translatedAnalysis || ''}
                    onTranslate={handleTranslateDream}
                  />[span_9](start_span)[span_9](end_span)
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="w-full text-center py-8 text-white/30 text-xs font-bold tracking-widest border-t border-white/5 relative z-10 bg-black/40">
        ⚡ LUNOSFER • DÜNYANIN ORTAK BİLİNÇALTI AĞI
      </footer>
    </div>
  );
                }
                
