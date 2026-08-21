import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Flag, Trash2, Check, X as XIcon, Video, Images } from 'lucide-react'
import AdminAuthGate, { useAdminAuth } from '@/components/admin/AdminAuthGate'
import Seo from '@/components/Seo'

const STATUS_TABS = [
  { value: 'pending', label: 'Bekleyen' },
  { value: 'reviewed', label: 'İncelendi' },
  { value: 'dismissed', label: 'Reddedildi' },
  { value: 'all', label: 'Tümü' },
]

const REASON_LABELS = {
  spam: 'Spam',
  inappropriate: 'Uygunsuz içerik',
  harassment: 'Taciz veya zorbalık',
  misinformation: 'Yanlış bilgi',
  hate_speech: 'Nefret söylemi',
  other: 'Diğer',
}

function reasonLabel(reason) {
  return REASON_LABELS[reason] || reason
}

function ownerLabel(profile) {
  if (!profile) return 'Bilinmeyen kullanıcı'
  return profile.display_name || profile.username || profile.id
}

function ReportCard({ report, onMarkStatus, onDeleteGoal, busy }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const goal = report.goal

  return (
    <div className="bg-[#141822] border border-white/10 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Vizyon önizlemesi */}
        <div className="shrink-0 w-full sm:w-28 h-28 rounded-xl overflow-hidden bg-black/30 border border-white/10 relative">
          {goal ? (
            goal.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={goal.cover_image_url} alt={goal.title || ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                {goal.vision_video_url ? <Video size={22} /> : <Images size={22} />}
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px] text-center px-2">
              Vizyon silinmiş
            </div>
          )}
          {goal?.vision_video_url && (
            <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-1">
              <Video size={10} className="text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{goal?.title || '(silinmiş vizyon)'}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Sahibi: {ownerLabel(goal?.owner)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 text-[11px] font-bold text-rose-300 uppercase tracking-wide">
              <Flag size={10} />
              {reasonLabel(report.reason)}
            </span>
            <span className="text-[11px] text-slate-500">
              {ownerLabel(report.reporter)} tarafından · {new Date(report.created_at).toLocaleString('tr-TR')}
            </span>
          </div>

          {report.note && (
            <p className="mt-2 text-xs text-slate-300 bg-black/20 border border-white/5 rounded-lg p-2.5 whitespace-pre-wrap break-words">
              {report.note}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {report.status !== 'reviewed' && (
              <button
                onClick={() => onMarkStatus(report.id, 'reviewed')}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
              >
                <Check size={12} /> İncelendi
              </button>
            )}
            {report.status !== 'dismissed' && (
              <button
                onClick={() => onMarkStatus(report.id, 'dismissed')}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-40"
              >
                <XIcon size={12} /> Reddet
              </button>
            )}
            {report.status !== 'pending' && (
              <button
                onClick={() => onMarkStatus(report.id, 'pending')}
                disabled={busy}
                className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-40"
              >
                Bekleyene al
              </button>
            )}

            {goal && (
              <div className="ml-auto">
                {confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-rose-300">Vizyon kalıcı silinecek.</span>
                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      disabled={busy}
                      className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-400 disabled:opacity-40"
                    >
                      Evet, Sil
                    </button>
                    <button onClick={() => setConfirmingDelete(false)} className="text-xs text-slate-400 hover:text-slate-200">
                      Vazgeç
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-40"
                  >
                    <Trash2 size={12} /> Vizyonu Sil
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportsManagement() {
  const { token, logout } = useAdminAuth()

  const [status, setStatus] = useState('pending')
  const [reports, setReports] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const authedFetch = useCallback(
    (url, options = {}) =>
      fetch(url, {
        ...options,
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      }),
    [token]
  )

  const load = useCallback(
    async (pageNum, replace) => {
      replace ? setLoading(true) : setLoadingMore(true)
      setError('')
      try {
        const res = await authedFetch(`/api/admin/reports/list?status=${status}&page=${pageNum}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'error')
        setReports((prev) => (replace ? json.reports : [...prev, ...json.reports]))
        setHasMore(json.hasMore)
        setTotal(json.total)
        setPage(pageNum)
      } catch (err) {
        setError(err.message || 'Yüklenemedi.')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [authedFetch, status]
  )

  useEffect(() => {
    load(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const handleMarkStatus = async (reportId, newStatus) => {
    setBusyId(reportId)
    setError('')
    try {
      const res = await authedFetch('/api/admin/reports/update-status', {
        method: 'POST',
        body: JSON.stringify({ reportId, status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'error')
      // Aktif sekmeden farklı bir duruma taşındıysa listeden kaldır,
      // aynı duruma taşındıysa (ör. "all" sekmesinde) yerinde güncelle.
      setReports((prev) =>
        status === 'all'
          ? prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
          : prev.filter((r) => r.id !== reportId)
      )
      setTotal((t) => (t !== null && status !== 'all' ? Math.max(0, t - 1) : t))
    } catch (err) {
      setError(err.message || 'Güncellenemedi.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteGoal = async (goalId) => {
    setBusyId(goalId)
    setError('')
    try {
      const res = await authedFetch('/api/admin/reports/delete-goal', {
        method: 'POST',
        body: JSON.stringify({ goalId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'error')
      // Aynı vizyona ait tüm bildirimler cascade ile silindi — hepsini
      // listeden çıkar (birden fazla kişi aynı vizyonu bildirmiş olabilir).
      setReports((prev) => prev.filter((r) => r.goal?.id !== goalId))
      setTotal((t) => (t !== null ? null : t))
    } catch (err) {
      setError(err.message || 'Silinemedi.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0e14] text-white">
      <Seo title="Bildirim Yönetimi — Yönetim" noindex />
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-bold">Bildirim Yönetimi</h1>
              <p className="text-slate-500 text-xs mt-0.5">{total !== null ? `${total} bildirim` : '\u00A0'}</p>
            </div>
          </div>
          <button onClick={logout} className="text-xs text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors">
            Çıkış
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                status === tab.value ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <p className="text-rose-400 text-sm mb-4">{error}</p>}

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={22} className="text-slate-600 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            {status === 'pending' ? 'Bekleyen bildirim yok.' : 'Bu kategoride bildirim yok.'}
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onMarkStatus={handleMarkStatus}
                onDeleteGoal={handleDeleteGoal}
                busy={busyId === report.id || busyId === report.goal?.id}
              />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => load(page + 1, false)}
              disabled={loadingMore}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-40"
            >
              {loadingMore ? 'Yükleniyor…' : 'Daha Fazla'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminReportsPage() {
  return (
    <AdminAuthGate>
      <ReportsManagement />
    </AdminAuthGate>
  )
}
