// TASARIM KARARI (sosyal medya davranış psikolojisi):
// 1) VARSAYILAN "Tümü" (karışık akış) — tek türe kilitli bir akış hızla
//    tekdüzeleşip oturum süresini kısaltır; değişkenlik (variable content)
//    scroll'u sürdürme isteğini artıran temel mekanizmalardan biri. Instagram/
//    TikTok'un beslemeleri hiçbir zaman tek içerik tipiyle başlamaz.
// 2) Segmentli PILL kontrolü (dropdown/hamburger DEĞİL) — her zaman görünür,
//    tek dokunuşla değişir, mevcut durumu anında gösterir. Gizli bir menüde
//    filtre = çoğu kullanıcının hiç keşfetmeyeceği bir özellik demektir.
// 3) Seçim sessionStorage'da kalıcı — kullanıcı bir kez "sadece Rüyalar"
//    seçtiyse her ziyarette yeniden seçmeye zorlanmaz (gereksiz sürtünme),
//    ama varsayılan hâlâ "Tümü" olduğu için YENİ kullanıcılar karışık akışla
//    başlar (etkileşim/keşif için en sağlıklı varsayılan).
// 4) Kompakt, içerikle yarışmayan boyut — akışın kendisi odak noktası kalsın.
const OPTIONS = [
  { value: 'all', tr: 'Tümü', en: 'All' },
  { value: 'dreams', tr: 'Rüyalar', en: 'Dreams' },
  { value: 'visions', tr: 'Vizyonlar', en: 'Visions' },
]

export default function HomeFeedFilter({ value, onChange, lang = 'en' }) {
  return (
    <div className="flex justify-center py-2">
      <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              value === opt.value
                ? 'bg-white text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'tr' ? opt.tr : opt.en}
          </button>
        ))}
      </div>
    </div>
  )
}
