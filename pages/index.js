import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import DreamCard from '../components/DreamCard';

export default function Home() {
  const lang = 'tr'; 
  
  // State Yönetimi
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [translatingDreams, setTranslatingDreams] = useState({});
  const [onlineCount, setOnlineCount] = useState(4532);
  const [currentUser, setCurrentUser] = useState(null);

  // 🎛️ GELİŞMİŞ FİLTRE VE ALGORİTMA STATELERİ
  const [activeTab, setActiveTab] = useState('resonance'); // resonance (algoritmik), fresh (zaman), friends (arkadaşlar)
  const [selectedArchetype, setSelectedArchetype] = useState('all'); // Gölge, Anima, Bilge Yaşlı vb.
  const [resonanceMatch, setResonanceMatch] = useState(87); // Dinamik senkronizasyon oranı

  // Mevcut kullanıcıyı al (Arkadaş filtresi için şart)
  useEffect(() => {
    const session = supabase.auth.session ? supabase.auth.session() : null; // Supabase v1/v2 uyumluluğuna göre gerekirse güncellenir
    setCurrentUser(session?.user || null);
  }, []);

  // Canlı Sayaç ve Sahte Senkronizasyon Efekti (Bağımlılık Tetikleyici)
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount(prev => prev + (Math.floor(Math.random() * 13) - 6));
      setResonanceMatch(() => Math.floor(Math.random() * (99 - 75 + 1)) + 75);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // 🔮 GELİŞMİŞ ALGORİTMİK VERİ ÇEKME FONKSİYONU
  useEffect(() => {
    async function fetchDreams() {
      try {
        setLoading(true);
        
        // Temel sorgu
        let query = supabase.from('dreams').select('*');

        // 1. FİLTRE: Sadece Arkadaşlar Filtresi aktifse
        if (activeTab === 'friends' && currentUser) {
          // Önce arkadaş listesini çekiyoruz
          const { data: friendsData } = await supabase
            .from('friends')
            .select('friend_id')
            .eq('user_id', currentUser.id)
            .eq('status', 'accepted');
          
          const friendIds = friendsData?.map(f => f.friend_id) || [];
          // Akışta arkadaş rüyalarını filtrele (kendi rüyaları da dahil olsun)
          query = query.in('user_id', [...friendIds, currentUser.id]);
        }

        // 2. FİLTRE: Belli Başlı Arketip Filtresi
        if (selectedArchetype !== 'all') {
          // Veritabanındaki 'dominant_archetype' veya 'archetypes' kolonuna göre filtreler
          query = query.eq('dominant_archetype', selectedArchetype);
        }

        // 3. ALGORİTMA VE SIRALAMA (Hitap Eden ve Etkileşim Alan Rüyalar)
        if (activeTab === 'resonance') {
          // SQL düzeyinde karmaşık bir formül yerine (Supabase RPC yazmadıysak) 
          // En çok beğeni, yorum ve hitap oranına göre sıralayıp getiriyoruz
          query = query.order('likes_count', { ascending: false }).order('comments_count', { ascending: false });
        } else {
          // En Yeniler (Zamana Göre Sıralama)
          query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query.limit(30);
        if (error) throw error;

        setDreams(data || []);
      } catch (err) {
        console.error('Rüyalar filtrelenirken hata oluştu:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDreams();
  }, [activeTab, selectedArchetype, currentUser]);

  async function handleTranslateDream(dream) {
    const dreamId = dream.id;
    if (translatingDreams[dreamId]?.translated) {
      setTranslatingDreams(prev => ({ ...prev, [dreamId]: { ...prev[dreamId], translated: false } }));
      return;
    }
    setTranslatingDreams(prev => ({ ...prev, [dreamId]: { ...prev[dreamId], loading: true } }));
    try {
      const analysisText = dream[`ai_summary_tr`] || dream.ai_summary || '';
      setTranslatingDreams(prev => ({
        ...prev,
        [dreamId]: { translated: true, translatedContent: dream.content, translatedAnalysis: analysisText }
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setTranslatingDreams(prev => ({ ...prev, [dreamId]: { ...prev[dreamId], loading: false } }));
    }
  }

  return (
    <div className="min-h-screen text-[#e0e0ff] bg-[#020208] relative overflow-x-hidden selection:bg-pink-500/30 font-sans">
      <div className="starry-bg"></div>
      
      <Navbar />
      <Hero />

      <main className="max-w-7xl mx-auto px-4 pb-24 relative z-10 -mt-6">
        
        {/* 🔥 BAĞIMLILIK TETİKLEYİCİ: SENKRONİZASYON BANNERI */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-pink-900/20 to-black/40 border border-purple-500/20 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔮</span>
            <div>
              <h4 className="text-sm font-bold text-white">Bilinçaltı Rezonansı Yakalandı!</h4>
              <p className="text-xs text-white/60">Şu an küresel rüya ağında senin zihinsel frekansına sahip insanlarla senkronizasyonun: <span className="text-pink-400 font-bold">%{resonanceMatch}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
            <span><strong className="text-green-400 tabular-nums">{onlineCount.toLocaleString()}</strong> Kişi Rüya Görüyor</span>
          </div>
        </div>

        {/* 🎛️ ANA FİLTRE PANELİ */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-8 bg-white/5 border border-white/10 p-3 rounded-2xl backdrop-blur-md">
          
          {/* Akış Türü Seçimi */}
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <button 
              onClick={() => setActiveTab('resonance')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'resonance' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-pink-500/20 scale-105' : 'text-white/60 hover:bg-white/5'
              }`}
            >
              🔥 Popüler Rezonans (Algoritmik)
            </button>
            <button 
              onClick={() => setActiveTab('fresh')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'fresh' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-pink-500/20 scale-105' : 'text-white/60 hover:bg-white/5'
              }`}
            >
              ⚡ Canlı Akış (Zaman)
            </button>
            <button 
              onClick={() => {
                if(!currentUser) alert('Sadece arkadaşları görmek için giriş yapmalısın!');
                else setActiveTab('friends');
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'friends' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-pink-500/20 scale-105' : 'text-white/60 hover:bg-white/5'
              }`}
            >
              👥 Sadece Arkadaşlar
            </button>
          </div>

          {/* Arketip Seçim Filtresi */}
          <div className="flex items-center gap-2 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-white/10">
            <span className="text-xs font-bold text-white/40 uppercase whitespace-nowrap">Arketip Filtresi:</span>
            <select 
              value={selectedArchetype}
              onChange={(e) => setSelectedArchetype(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-pink-400 focus:outline-none focus:border-pink-500 w-full lg:w-auto"
            >
              <option value="all">👁️ Tüm Bilinçaltı Dalgaları</option>
              <option value="Shadow">👤 Gölge (Korku / Bastırılmış)</option>
              <option value="Anima">🌊 Anima/Animus (Denge / İlişki)</option>
              <option value="Persona">🎭 Persona (Sosyal Maskeler)</option>
              <option value="Wise Old Man">🧙‍♂️ Bilge Yaşlı (Rehberlik / Bilgelik)</option>
              <option value="Trickster">🃏 Düzenbaz (Kaos / Değişim)</option>
            </select>
          </div>

        </div>

        {/* RÜYA LİSTELEME ALANI */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-pink-400 text-xs font-bold tracking-widest uppercase animate-pulse">Bilinçaltı Dalgaları Ayıklanıyor...</p>
          </div>
        ) : dreams.length === 0 ? (
          <div className="glass-card p-12 text-center max-w-md mx-auto border border-white/10 rounded-3xl bg-white/5">
            <span className="text-5xl block mb-3 animate-bounce">💤</span>
            <h3 className="text-xl font-bold text-white mb-2">Bu Frekansta Kimse Yok</h3>
            <p className="text-white/60 text-sm mb-6">Seçtiğin kriterlere uyan rüya bulunamadı. İlk dalgayı sen başlatmak ister misin?</p>
            <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-sm text-white">Rüyamı Gönder</button>
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
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      <footer className="w-full text-center py-8 text-white/30 text-xs font-bold tracking-widest border-t border-white/5 relative z-10 bg-black/40">
        ⚡ LUNOSFER • KOLEKTİF BİLİNÇALTI MATRİXİ
      </footer>
    </div>
  );
    }
    
