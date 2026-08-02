import { useRef } from 'react'
import { X } from 'lucide-react'
import { useModalA11y } from '@/lib/useModalA11y'

// Basit tam ekran video oynatıcı — goal.vision_video_url doluysa "izle" /
// "vizyona dokun" akışları artık SlidesViewer yerine bunu açıyor.
// GoalDetailModal.jsx, vision-board.js, profile.js ve pages/u/[userId].js
// hepsi bunu kullanıyor — her yerde ayrı ayrı tanımlamak yerine tek yer.
export default function VisionVideoPlayer({ videoUrl, lang, onClose }) {
  const ref = useRef(null)
  useModalA11y(ref, onClose)
  return (
    <div ref={ref} className="fixed inset-0 z-[100] bg-black select-none touch-none flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
      >
        <X size={26} />
      </button>
      <video src={videoUrl} controls autoPlay playsInline className="max-h-full max-w-full rounded-xl" />
    </div>
  )
}
