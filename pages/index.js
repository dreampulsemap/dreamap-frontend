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

  // 1. Supabase'den Akışta Görünecek Rüyaları Çekme[span_0](start_span)[span_0](end_span)
  useEffect(() => {
    async function fetchDreams() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('dreams')
          .select('*')
          .eq('in_feed', true)
          .order('created_at', { ascending: false })
          .limit(24); // Estetik bir grid dizilimi için 3'ün katı (24 rüya) getiriyoruz[span_1](start_span)[span_1](end_span)

        if (error) throw error;
        setDreams(data || []);
      } catch (err) {
        console.error('Rüyalar yüklenirken hata oluştu:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDreams();
  }, []);

  // 2. DreamCard İçindeki Çeviri Fonksiyonu[span_2](start_span)[span_2](end_span)[span_3](start_span)[span_3](end_span)
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
    <div className="min-h-screen text-[#e0e0ff] bg-[#0a0a1a] relative overflow-x-hidden selection:bg-purple-500/30 font-sans">
      
      {/* Sabit CSS Arka Plan Efektleri[span_6](start_span)[span_6](end_span) */}
      <div className="starry-bg"></div>
      <div className="floating-orb orb-3"></div>

      {/* Üst Navigasyon Barı */}
      <Navbar />
      
      {/* Giriş Küresi ve Başlık Alanı */}
      <Hero />

      {/* İndikatör / Aşağı Kaydır Simgesi */}
      <div className="flex justify-center -mt-8 mb-16 animate-bounce pointer-events-none">
        <span className="text-white/30 text-sm tracking-widest font-serif uppercase">
          ✦ Kolektif Akışa Geç ✦
        </span>
      </div>
      
      {/* Rüyalar Akışı Ana Gövde */}
      <main className="max-w-7xl mx-auto px-6 pb-24 relative z-10">
        
        {/* Tasarım Harikası Mini İstatistik Paneli */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          <div className="glass-card p-4 text-center border border-purple-500/20 bg-purple-950/10">
            <span className="text-xs text-purple-300 uppercase tracking-widest block mb-1">Baskın Arketip</span>
            <span className="text-lg font-serif font-bold text-white tracking-wide">🔮 Bilge / Gezgin</span>
          </div>
          <div className="glass-card p-4 text-center border border-pink-500/20 bg-pink-950/10">
            <span className="text-xs text-pink-300 uppercase tracking-widest block mb-1">Küresel Rüya Frekansı</span>
            <span className="text-lg font-serif font-bold text-white tracking-wide">✨ %87 Berraklık</span>
          </div>
          <div className="glass-card p-4 text-center border border-blue-500/20 bg-blue-950/10">
            <span className="text-xs text-blue-300 uppercase tracking-widest block mb-1">Aktif Bağlantı</span>
            <span className="text-lg font-serif font-bold text-white tracking-wide">🌌 {dreams.length}+ Bilinç</span>
          </div>
        </div>

        {/* Başlık Bölümü */}
        <div className="flex flex-col items-center text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-serif gradient-text glow-text mb-3">
            Son Paylaşılan Kolektif Rüyalar
          </h2>
          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent mb-4"></div>
          <p className="text-white/60 text-sm max-w-md">
            Lunosfer rüya ağında beliren semboller ve yapay zeka destekli Jungian arketipleri[span_7](start_span)[span_7](end_span)[span_8](start_span)[span_8](end_span).
          </p>
        </div>

        {/* Yüklenme ve Boş Durum Kontrolleri */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-purple-300 text-xs tracking-widest animate-pulse uppercase">Kolektif havuz taranıyor...</p>
          </div>
        ) : dreams.length === 0 ? (
          <div className="glass-card p-12 text-center max-w-md mx-auto border border-white/10">
            <span className="text-5xl block mb-4">🌙</span>
            <h3 className="text-lg font-serif font-semibold text-white mb-2">Henüz Rüya Görünmüyor</h3>
            <p className="text-white/50 text-sm mb-6">Evren sessizliğe bürünmüş durumda. İlk rüyayı sen fısıldayabilirsin.</p>
            <button className="archetype-badge px-6 py-2 text-sm">Rüya Ekle</button>[span_9](start_span)[span_9](end_span)
          </div>
        ) : (
          /* Kusursuz Hizalanmış Rüya Grid Akışı */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {dreams.map((dream) => {
              const transState = translatingDreams[dream.id] || {};
              return (
                <DreamCard 
                  key={dream.id} 
                  dream={dream} 
                  lang={lang}
                  translating={transState.loading || false}
                  translated={transState.translated || false}
                  translatedContent={transState.translatedContent || ''}
                  translatedAnalysis={transState.translatedAnalysis || ''}
                  onTranslate={handleTranslateDream}
                />
              );
            })}
          </div>
        )}
      </main>
      
      {/* Sayfa Altı Süsleme Çizgisi */}
      <footer className="w-full text-center py-8 text-white/20 text-xs font-serif tracking-widest border-t border-white/5 relative z-10">
        © 2026 LUNOSFER • TÜM BİLİNÇALTI BAĞLANTILARI KORUNMAKTADIR
      </footer>
    </div>
  );
}
