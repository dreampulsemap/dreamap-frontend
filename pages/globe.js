import dynamic from 'next/dynamic'

// Globe bileşenini dynamic import et (SSR sorunlarını önlemek için)
const DreamGlobe = dynamic(() => import('../components/DreamGlobe'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-white text-xl">Loading 3D Globe...</div>
    </div>
  )
})

export default function GlobePage() {
  return <DreamGlobe />
}
