// Önceden her sayfa kendi boş-durum bloğunu elle yazıyordu (index.js,
// explore.js, vision-board.js hepsinde farklı yapı/spacing/ikon boyutu).
// Tek bir standart bileşen: ikon + başlık + opsiyonel aksiyon butonu.
export default function EmptyState({ icon = '🌌', title, description, actionLabel, onAction }) {
  return (
    <div className="glass-card rounded-card p-12 text-center max-w-md mx-auto mt-10">
      <span className="text-3xl">{icon}</span>
      <h3 className="text-h3 text-white mt-4">{title}</h3>
      {description && <p className="text-body-sm text-slate-400 mt-2">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-5 py-2.5 rounded-pill bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-label"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
