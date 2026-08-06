import { useRef } from 'react'
import { useModalA11y } from '@/lib/useModalA11y'

// "+ Ekle" tıklanınca açılan kaynak seçim menüsü — cihazdan video, cihazdan
// görsel, Pixabay. Önceden VisionVideoEditor.jsx içinde tanımlıydı; artık
// CreateGoalModal (vizyon oluştururken medya seçimi) de kullandığı için
// ayrı bir dosyaya çıkarıldı. Stiller BİLEREK scoped `<style jsx>` (global
// değil) — VisionVideoEditor hiç mount olmamış olsa bile (ör. yeni vizyon
// oluşturma akışında) kendi kendine düzgün görünsün diye.
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
        <button className="amm-item" onClick={onPickVideo}>🎬 {tr ? 'Cihazdan Video' : 'Video from Device'}</button>
        <button className="amm-item" onClick={onPickImage}>🖼️ {tr ? 'Cihazdan Görsel' : 'Image from Device'}</button>
        <button className="amm-item" onClick={onPickPixabay}>🔎 {tr ? "Pixabay'den Ara" : 'Search Pixabay'}</button>
      </div>
      <style jsx>{`
        .amm-backdrop{ position:fixed; inset:0; background:rgba(4,6,14,0.6); z-index:215; display:flex; align-items:flex-end; justify-content:center; }
        .amm-menu{ background:#141822; border:1px solid rgba(255,255,255,0.1); border-radius:16px 16px 0 0; width:100%; max-width:420px; padding:10px; display:flex; flex-direction:column; gap:4px; }
        @media(min-width:640px){ .amm-backdrop{ align-items:center; } .amm-menu{ border-radius:16px; } }
        .amm-item{ background:transparent; border:none; color:#fff; text-align:left; padding:14px 12px; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:10px; font-family:inherit; }
        .amm-item:hover{ background:rgba(255,255,255,0.08); }
      `}</style>
    </div>
  )
}
