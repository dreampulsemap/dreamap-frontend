import Link from 'next/link'
import { ImageOff } from 'lucide-react'
import AdminAuthGate, { useAdminAuth } from '@/components/admin/AdminAuthGate'

function AdminHome() {
  const { logout } = useAdminAuth()

  return (
    <div className="min-h-screen bg-[#0c0e14] text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold">Lunosfer Yönetim</h1>
            <p className="text-slate-500 text-sm mt-0.5">Uygulama dışı, yalnızca sana özel araçlar.</p>
          </div>
          <button onClick={logout} className="text-xs text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors">
            Çıkış
          </button>
        </div>

        <Link
          href="/admin/dream-images"
          className="group flex items-center gap-4 bg-[#141822] border border-white/10 rounded-2xl p-5 hover:border-amber-500/40 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <ImageOff size={20} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-white group-hover:text-amber-300 transition-colors">Rüya Yönetimi</h2>
            <p className="text-slate-500 text-sm mt-0.5">Görsel ekle (Pixabay/cihaz), içerik-etiket-görünürlük düzenle, sil.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default function AdminIndexPage() {
  return (
    <AdminAuthGate>
      <AdminHome />
    </AdminAuthGate>
  )
}
