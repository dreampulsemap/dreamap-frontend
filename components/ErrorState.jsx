import { AlertTriangle } from 'lucide-react'

// Önceden hata durumları ya hiç ele alınmıyordu (kullanıcı sonsuz spinner
// görüyordu) ya da her component kendi rose-400 text'ini elle yazıyordu.
export default function ErrorState({ message, onRetry, lang = 'en' }) {
  return (
    <div className="glass-card rounded-card p-8 text-center max-w-md mx-auto mt-10">
      <AlertTriangle size={24} className="inline-block text-amber-400" />
      <p className="text-body-sm text-rose-400 mt-3">
        {message || (lang === 'tr' ? 'Bir şeyler ters gitti.' : 'Something went wrong.')}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-pill bg-white/10 text-slate-200 text-label hover:bg-white/20"
        >
          {lang === 'tr' ? 'Tekrar Dene' : 'Retry'}
        </button>
      )}
    </div>
  )
}
