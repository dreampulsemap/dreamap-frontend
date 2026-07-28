export default function UserDreamList({ dreams, onEdit, onDelete }) {
  if (!dreams || dreams.length === 0) {
    return (
      <div className="glass-card p-8 text-center rounded-card">
        <p className="text-sm text-slate-400 font-sans">Henüz kayıtlı bir rüya bulunmuyor.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 font-sans">
      {dreams.map((dream, index) => (
        <article key={dream.id} className="glass-card p-6 rounded-card border border-white/5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-astral-gold/30 bg-astral-gold/10 text-astral-gold">
              Rüya #{dreams.length - index}
            </span>
            <span className="text-xs text-slate-500">
              {new Date(dream.created_at).toLocaleDateString()}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-slate-200 mb-4">{dream.content}</p>

          <div className="flex justify-end gap-2">
            <button onClick={() => onEdit(dream)} className="px-4 py-1.5 rounded-xl bg-white/5 text-xs text-slate-300 hover:bg-white/10">
              Düzenle
            </button>
            <button onClick={() => onDelete(dream)} className="px-4 py-1.5 rounded-xl bg-shadowWork-rose/20 text-xs text-shadowWork-rose hover:bg-shadowWork-rose/30">
              Sil
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}