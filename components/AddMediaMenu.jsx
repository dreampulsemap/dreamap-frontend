import { useRef } from 'react'
import { Video, ImagePlus, Search } from 'lucide-react'
import { useModalA11y } from '@/lib/useModalA11y'

// "+ Ekle" tıklanınca açılan kaynak seçim menüsü — cihazdan video, cihazdan
// görsel, Pixabay. Önceden VisionVideoEditor.jsx içinde tanımlıydı; artık
// CreateGoalModal (vizyon oluştururken medya seçimi) de kullandığı için
// ayrı bir dosyaya çıkarıldı. Stiller BİLEREK scoped `<style jsx>` (global
// değil) — VisionVideoEditor hiç mount olmamış olsa bile (ör. yeni vizyon
// oluşturma akışında) kendi kendine düzgün görünsün diye.
//
// Reels/CapCut'taki "+" sayfası gibi: alttan açılan cam yüzeyli bir sheet,
// üstte sürükleme tutamacı, her seçenek ikon rozetiyle. VisionVideoEditor.jsx
// içindeki gradyanla aynı fuchsia→mor→cyan tonları burada da (hardcoded,
// çünkü bu dosya bilerek vve-* CSS değişkenlerine bağımlı değil).
export default function AddMediaMenu({ lang, onPickVideo, onPickImage, onPickPixabay, onClose }) {
  const ref = useRef(null)
  useModalA11y(ref, onClose)
  const tr = lang === 'tr'
  return (
    <div
      ref={ref}
      className="amm-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div className="amm-menu">
        <div className="amm-handle" />
        <button className="amm-item" onClick={onPickVideo}>
          <span className="amm-icon"><Video size={18} /></span>
          {tr ? 'Cihazdan Video' : 'Video from Device'}
        </button>
        <button className="amm-item" onClick={onPickImage}>
          <span className="amm-icon"><ImagePlus size={18} /></span>
          {tr ? 'Cihazdan Görsel' : 'Image from Device'}
        </button>
        <button className="amm-item" onClick={onPickPixabay}>
          <span className="amm-icon"><Search size={18} /></span>
          {tr ? "Pixabay'den Ara" : 'Search Pixabay'}
        </button>
      </div>
      <style jsx>{`
        .amm-backdrop{ position:fixed; inset:0; background:rgba(4,6,14,0.65); backdrop-filter:blur(2px); z-index:215; display:flex; align-items:flex-end; justify-content:center; }
        .amm-menu{ background:#141822; border:1px solid rgba(255,255,255,0.1); border-radius:20px 20px 0 0; width:100%; max-width:420px; padding:8px 10px calc(10px + env(safe-area-inset-bottom, 0px)); display:flex; flex-direction:column; gap:4px; }
        .amm-handle{ width:36px; height:4px; border-radius:2px; background:rgba(255,255,255,0.18); align-self:center; margin:6px 0 8px; }
        @media(min-width:640px){ .amm-backdrop{ align-items:center; } .amm-menu{ border-radius:20px; } .amm-handle{ display:none; } }
        .amm-item{ background:transparent; border:none; color:#fff; text-align:left; padding:14px 12px; border-radius:12px; font-size:14.5px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:12px; font-family:inherit; transition:background 0.15s ease, transform 0.12s ease; }
        .amm-item:hover, .amm-item:active{ background:rgba(255,255,255,0.08); }
        .amm-item:active{ transform:scale(0.98); }
        .amm-icon{ width:36px; height:36px; border-radius:11px; background:linear-gradient(135deg, #d946ef 0%, #a855f7 60%, #22d3ee 100%); display:flex; align-items:center; justify-content:center; flex:0 0 auto; color:#fff; }
      `}</style>
    </div>
  )
}
