import MiniGlobe from './MiniGlobe';

export default function Hero() {
  return (
    <div className="relative min-h-[85vh] flex items-center justify-center pt-24 px-6 overflow-hidden">
      
      {/* CSS'ten Gelen Arka Plan Efektleri */}
      <div className="starry-bg"></div>
      <div className="floating-orb orb-1"></div>
      <div className="floating-orb orb-2"></div>

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
        
        {/* Sol Metin Alanı */}
        <div className="space-y-6 text-center lg:text-left">
          <div className="inline-block archetype-badge">
            🌌 Kolektif Bilinçaltı Keşfi
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-white">
            Rüyalarının Derinliğini <br />
            <span className="gradient-text glow-text">Jungian Analiz</span> ile Çöz
          </h1>

          {/* Typewriter Efektli Alt Başlık */}
          <div className="w-max max-w-full mx-auto lg:mx-0">
            <p className="typewriter text-purple-300 font-medium tracking-wide text-sm sm:text-base">
              Arketiplerini keşfet, kolektif öngörülere katıl...
            </p>
          </div>

          <p className="text-white/70 max-w-lg mx-auto lg:mx-0 text-base leading-relaxed">
            Luverse, dünyanın dört bir yanından girilen rüya verilerini yapay zeka ile analiz ederek insanlığın ortak rüya haritasını ve sembolizmini ortaya çıkarır.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
            <button className="glass-card px-6 py-3 bg-purple-600/20 border-purple-500 text-white font-semibold shadow-lg hover:bg-purple-600/40 transition-all transform hover:-translate-y-1">
              🔮 Rüyandaki Detayı Sor
            </button>
            <a href="/globe" className="glass-card px-6 py-3 text-white/80 hover:text-white transition-all">
              Haritayı İncele →
            </a>
          </div>
        </div>

        {/* Sağ Küre Alanı */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            {/* Kürenin arkasına mistik bir parlama efekti */}
            <div className="absolute inset-0 bg-purple-500/10 rounded-full filter blur-3xl animate-pulse pointer-events-none"></div>
            <MiniGlobe />
          </div>
          <p className="text-xs text-white/40 italic tracking-wider animate-pulse">
            ● Canlı rüya akışı küre üzerinde dönmektedir
          </p>
        </div>

      </div>
    </div>
  );
            }
