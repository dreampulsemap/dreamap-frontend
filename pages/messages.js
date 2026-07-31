import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { useEffect, useState, useRef, useCallback } from 'react'
import { ArrowLeft, MessageCircle, Send, Paperclip, X, FileText, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const POLL_INTERVAL_MS = 5000

// Sunucudaki (007_message_attachments.sql) bucket sınırlarıyla AYNI olmalı —
// burada kontrol etmek yalnızca hızlı geri bildirim için; asıl sınır Storage'da.
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024 // 20 MB
const ACCEPTED_ATTACHMENT_TYPES =
  'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,application/zip,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function attachmentKindFor(mimeType) {
  if (mimeType?.startsWith('image/')) return 'image'
  if (mimeType?.startsWith('video/')) return 'video'
  return 'file'
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function attachmentPreviewLabel(type, lang) {
  if (type === 'image') return lang === 'tr' ? '📷 Fotoğraf' : '📷 Photo'
  if (type === 'video') return lang === 'tr' ? '🎥 Video' : '🎥 Video'
  if (type === 'file') return lang === 'tr' ? '📎 Dosya' : '📎 File'
  return ''
}

export default function MessagesPage() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n?.language || 'en').split('-')[0] : 'en'

  const [viewer, setViewer] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  const [conversations, setConversations] = useState([])
  const [loadingConversations, setLoadingConversations] = useState(true)

  const [activeOtherId, setActiveOtherId] = useState(null)
  const [activeOtherUser, setActiveOtherUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [attachedFile, setAttachedFile] = useState(null)
  const [attachedPreviewUrl, setAttachedPreviewUrl] = useState('')
  const [attachmentError, setAttachmentError] = useState('')
  const [uploading, setUploading] = useState(false)

  const pollRef = useRef(null)
  const scrollRef = useRef(null)
  const cursorRef = useRef(null) // polling için "en son gördüğüm mesaj zamanı"
  const fileInputRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setViewer(session?.user || null)
      setAuthChecked(true)
    })
  }, [])

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
  }, [])

  const loadConversations = useCallback(async () => {
    const headers = await authHeaders()
    try {
      const res = await fetch('/api/messages/conversations', { headers })
      const json = await res.json()
      if (res.ok) setConversations(json.conversations || [])
    } catch (err) {
      console.error('loadConversations error:', err)
    } finally {
      setLoadingConversations(false)
    }
  }, [authHeaders])

  useEffect(() => {
    if (viewer) loadConversations()
  }, [viewer, loadConversations])

  const loadThread = useCallback(async (otherId) => {
    if (!otherId) return
    setLoadingThread(true)
    const headers = await authHeaders()
    try {
      const res = await fetch(`/api/messages/thread?with=${otherId}`, { headers })
      const json = await res.json()
      if (res.ok) {
        const msgs = json.messages || []
        setMessages(msgs)
        setActiveOtherUser(json.otherUser || null)
        setHasMore(!!json.hasMore)
        // Thread boşsa bile "şu andan itibaren" polling yapabilmek için zamanı işaretliyoruz.
        cursorRef.current = msgs.length > 0 ? msgs[msgs.length - 1].created_at : new Date().toISOString()
        // Sunucu bu thread'deki mesajları okundu işaretledi (bkz. thread.js);
        // Mesaj ikonundaki rozetin bir sonraki poll'u (20sn) beklemeden hemen
        // düşmesi için Navbar/BottomNav'a haber ver.
        window.dispatchEvent(new Event('messages-read-updated'))
      }
    } catch (err) {
      console.error('loadThread error:', err)
    } finally {
      setLoadingThread(false)
    }
  }, [authHeaders])

  // URL'deki ?with= parametresini takip et (profil sayfasındaki "Mesaj"
  // butonu ve bildirim tıklamaları buradan geliyor)
  useEffect(() => {
    if (!router.isReady) return
    const withId = typeof router.query.with === 'string' ? router.query.with : null
    if (withId && withId !== activeOtherId) {
      setActiveOtherId(withId)
      setMessages([])
      setDraft('')
      removeAttachment()
      loadThread(withId)
    } else if (!withId && activeOtherId) {
      setActiveOtherId(null)
      setActiveOtherUser(null)
      setMessages([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.with])

  function openThread(otherId) {
    router.push(`/messages?with=${otherId}`, undefined, { shallow: true })
  }

  function closeThread() {
    router.push('/messages', undefined, { shallow: true })
  }

  // Açık thread'de yeni mesajları düzenli aralıklarla kontrol et. Gerçek zamanlı
  // websocket/Supabase Realtime kurulmadı — bu basit ama güvenilir bir polling.
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!activeOtherId) return

    pollRef.current = setInterval(async () => {
      if (!cursorRef.current) return
      const headers = await authHeaders()
      try {
        const res = await fetch(
          `/api/messages/thread?with=${activeOtherId}&after=${encodeURIComponent(cursorRef.current)}`,
          { headers }
        )
        const json = await res.json()
        if (res.ok && json.messages && json.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const fresh = json.messages.filter((m) => !existingIds.has(m.id))
            return fresh.length > 0 ? [...prev, ...fresh] : prev
          })
          cursorRef.current = json.messages[json.messages.length - 1].created_at
          loadConversations()
        }
      } catch (err) {
        // sessiz — bir sonraki pollde tekrar denenir
      }
    }, POLL_INTERVAL_MS)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeOtherId, authHeaders, loadConversations])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length, activeOtherId])

  async function loadOlder() {
    if (!activeOtherId || messages.length === 0) return
    setLoadingOlder(true)
    const oldest = messages[0]
    const headers = await authHeaders()
    try {
      const res = await fetch(
        `/api/messages/thread?with=${activeOtherId}&before=${encodeURIComponent(oldest.created_at)}`,
        { headers }
      )
      const json = await res.json()
      if (res.ok) {
        setMessages((prev) => [...(json.messages || []), ...prev])
        setHasMore(!!json.hasMore)
      }
    } catch (err) {
      console.error('loadOlder error:', err)
    } finally {
      setLoadingOlder(false)
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // aynı dosyayı art arda seçebilmek için input'u sıfırla
    if (!file) return
    setAttachmentError('')

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachmentError(lang === 'tr' ? 'Dosya çok büyük (maks. 20 MB).' : 'File is too large (max 20 MB).')
      return
    }
    if (!ACCEPTED_ATTACHMENT_TYPES.split(',').includes(file.type)) {
      setAttachmentError(lang === 'tr' ? 'Bu dosya türü desteklenmiyor.' : 'This file type is not supported.')
      return
    }

    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl)
    setAttachedFile(file)
    setAttachedPreviewUrl(attachmentKindFor(file.type) === 'image' ? URL.createObjectURL(file) : '')
  }

  function removeAttachment() {
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl)
    setAttachedFile(null)
    setAttachedPreviewUrl('')
    setAttachmentError('')
  }

  // Dosyayı doğrudan Supabase Storage'a (avatars/goal-covers ile aynı desen)
  // yükler ve herkese-açık URL'ini döner. Vercel'in API route body limitini
  // (birkaç MB) atlamak için bu yükleme /api/messages/send'den GEÇMİYOR —
  // istemci doğrudan Storage'a yazıyor, sunucuya yalnızca sonuçtaki URL gidiyor.
  async function uploadAttachment(file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100)
    const path = `${viewer.id}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('message-attachments').getPublicUrl(path)
    if (!data?.publicUrl) throw new Error('public_url_missing')

    return {
      attachmentUrl: data.publicUrl,
      attachmentType: attachmentKindFor(file.type),
      attachmentName: file.name,
      attachmentMime: file.type,
      attachmentSize: file.size,
    }
  }

  async function handleSend() {
    const content = draft.trim()
    if ((!content && !attachedFile) || !activeOtherId || sending || uploading) return

    let attachmentPayload = {}
    if (attachedFile) {
      setUploading(true)
      try {
        attachmentPayload = await uploadAttachment(attachedFile)
      } catch (err) {
        console.error('uploadAttachment error:', err)
        setAttachmentError(lang === 'tr' ? 'Dosya yüklenemedi, tekrar dener misin?' : 'Upload failed, please try again.')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    setSending(true)
    const headers = await authHeaders()
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ recipientId: activeOtherId, content, lang, ...attachmentPayload }),
      })
      const json = await res.json()
      if (res.ok && json.message) {
        setMessages((prev) => [...prev, json.message])
        cursorRef.current = json.message.created_at
        loadConversations()
        // Yalnızca BAŞARILI gönderimde taslağı/eki temizliyoruz — başarısız
        // olursa kullanıcı hiçbir şey kaybetmeden tekrar deneyebilsin.
        setDraft('')
        removeAttachment()
      }
    } catch (err) {
      // sessiz — draft ve ek olduğu gibi kalır, tekrar denenebilir
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (authChecked && !viewer) {
    return (
      <>
        <Head><title>{lang === 'tr' ? 'Mesajlar — Lunosfer' : 'Messages — Lunosfer'}</title></Head>
        <main className="min-h-[70vh] flex items-center justify-center px-6 py-16">
          <div className="glass-card max-w-sm w-full p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-aether-violet/30 bg-aether-violet/10 text-aether-violet">
              <MessageCircle size={24} />
            </div>
            <h1 className="text-lg font-bold font-serif text-white mb-2">
              {lang === 'tr' ? 'Mesajları görmek için giriş yap' : 'Sign in to see your messages'}
            </h1>
            <Link href="/auth" className="inline-block mt-4 px-5 py-2 rounded-full bg-cyan-500 text-black text-xs font-bold uppercase tracking-widest hover:bg-cyan-400 transition-colors">
              {lang === 'tr' ? 'Giriş Yap' : 'Sign in'}
            </Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Head><title>{lang === 'tr' ? 'Mesajlar — Lunosfer' : 'Messages — Lunosfer'}</title></Head>
      <main className="min-h-screen bg-black">
        <div className="max-w-5xl mx-auto sm:px-4 sm:py-8">
          <div className="flex h-[calc(100vh-8.5rem)] sm:h-[640px] glass-card overflow-hidden sm:rounded-card">

            {/* KONUŞMA LİSTESİ */}
            <div className={`w-full sm:w-80 border-r border-white/10 flex-col overflow-y-auto ${activeOtherId ? 'hidden sm:flex' : 'flex'}`}>
              <div className="p-4 border-b border-white/10 flex-shrink-0">
                <h1 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                  {lang === 'tr' ? 'Mesajlar' : 'Messages'}
                </h1>
              </div>
              {loadingConversations ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-16 px-6 text-white/40 text-sm">
                  {lang === 'tr'
                    ? 'Henüz bir konuşman yok. Bir profile gidip "Mesaj" butonuna dokunarak başlayabilirsin.'
                    : 'No conversations yet. Visit a profile and tap "Message" to start one.'}
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.otherUser.id}
                    onClick={() => openThread(c.otherUser.id)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${activeOtherId === c.otherUser.id ? 'bg-white/5' : ''}`}
                  >
                    {c.otherUser.avatar_url ? (
                      <img src={c.otherUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {(c.otherUser.display_name || c.otherUser.username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${c.unreadCount > 0 ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                          {c.otherUser.display_name || c.otherUser.username}
                        </p>
                        {c.unreadCount > 0 && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400" />}
                      </div>
                      <p className={`truncate text-xs ${c.unreadCount > 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                        {c.lastMessage?.content || attachmentPreviewLabel(c.lastMessage?.attachment_type, lang)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* AKTİF SOHBET */}
            <div className={`flex-1 flex-col ${activeOtherId ? 'flex' : 'hidden sm:flex'}`}>
              {!activeOtherId ? (
                <div className="flex-1 flex items-center justify-center text-white/30 text-sm px-6 text-center">
                  {lang === 'tr' ? 'Görüntülemek için bir konuşma seç.' : 'Select a conversation to view it.'}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
                    <button onClick={closeThread} className="sm:hidden text-slate-400 hover:text-white" aria-label={lang === 'tr' ? 'Geri' : 'Back'}>
                      <ArrowLeft size={18} />
                    </button>
                    {activeOtherUser && (
                      <Link href={`/u/${activeOtherUser.id}`} className="flex items-center gap-2 hover:opacity-80 min-w-0">
                        {activeOtherUser.avatar_url ? (
                          <img src={activeOtherUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(activeOtherUser.display_name || activeOtherUser.username || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate text-sm font-semibold text-white">
                          {activeOtherUser.display_name || activeOtherUser.username}
                        </span>
                      </Link>
                    )}
                  </div>

                  <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                    {loadingThread ? (
                      <div className="flex justify-center py-10">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
                      </div>
                    ) : (
                      <>
                        {hasMore && (
                          <div className="text-center pb-2">
                            <button onClick={loadOlder} disabled={loadingOlder} className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-50">
                              {loadingOlder
                                ? (lang === 'tr' ? 'Yükleniyor...' : 'Loading...')
                                : (lang === 'tr' ? 'Daha eski mesajları yükle' : 'Load earlier messages')}
                            </button>
                          </div>
                        )}
                        {messages.length === 0 ? (
                          <div className="text-center py-16 text-white/30 text-sm">
                            {lang === 'tr' ? 'Henüz mesaj yok. İlk mesajı sen gönder.' : 'No messages yet. Send the first one.'}
                          </div>
                        ) : (
                          messages.map((m) => {
                            const mine = m.sender_id === viewer?.id
                            const hasAttachment = !!m.attachment_type
                            return (
                              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl text-sm overflow-hidden ${mine ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white'}`}>
                                  {m.attachment_type === 'image' && (
                                    <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="block">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={m.attachment_url} alt={m.attachment_name || ''} className="max-h-72 w-full object-cover" />
                                    </a>
                                  )}
                                  {m.attachment_type === 'video' && (
                                    <video src={m.attachment_url} controls className="block max-h-72 w-full bg-black" />
                                  )}
                                  {m.attachment_type === 'file' && (
                                    <a
                                      href={m.attachment_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 px-3.5 py-2.5 transition-colors ${mine ? 'hover:bg-black/10' : 'hover:bg-white/5'}`}
                                    >
                                      <FileText size={22} className="flex-shrink-0" />
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{m.attachment_name || (lang === 'tr' ? 'Dosya' : 'File')}</span>
                                        {m.attachment_size ? (
                                          <span className={`block text-[10px] ${mine ? 'text-black/60' : 'text-white/50'}`}>{formatBytes(m.attachment_size)}</span>
                                        ) : null}
                                      </span>
                                      <Download size={16} className="flex-shrink-0" />
                                    </a>
                                  )}
                                  <div className={hasAttachment ? 'px-3.5 pt-1.5 pb-2' : 'px-3.5 py-2'}>
                                    {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                                    <p className={`text-[10px] ${m.content ? 'mt-1' : ''} ${mine ? 'text-black/50' : 'text-white/40'}`}>
                                      {new Date(m.created_at).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </>
                    )}
                  </div>

                  {(attachedFile || attachmentError) && (
                    <div className="px-3 pt-2 flex-shrink-0">
                      {attachedFile && (
                        <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5 max-w-full">
                          {attachedPreviewUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={attachedPreviewUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                              <FileText size={16} className="text-white/60" />
                            </div>
                          )}
                          <span className="min-w-0 text-xs text-white/70 truncate max-w-[160px]">{attachedFile.name}</span>
                          <button
                            onClick={removeAttachment}
                            aria-label={lang === 'tr' ? 'Eki kaldır' : 'Remove attachment'}
                            className="flex-shrink-0 text-white/40 hover:text-white"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )}
                      {attachmentError && <p className="text-[11px] text-rose-400 mt-1">{attachmentError}</p>}
                    </div>
                  )}

                  <div className="flex items-end gap-2 p-3 border-t border-white/10 flex-shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_ATTACHMENT_TYPES}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending || uploading}
                      aria-label={lang === 'tr' ? 'Dosya ekle' : 'Attach file'}
                      className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-slate-300 hover:bg-white/10 disabled:opacity-40 transition-colors"
                    >
                      <Paperclip size={18} />
                    </button>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={lang === 'tr' ? 'Bir mesaj yaz...' : 'Write a message...'}
                      maxLength={4000}
                      rows={1}
                      className="flex-1 resize-none bg-black/40 border border-white/20 rounded-2xl px-4 py-2.5 text-white text-sm max-h-28"
                    />
                    <button
                      onClick={handleSend}
                      disabled={(!draft.trim() && !attachedFile) || sending || uploading}
                      aria-label={lang === 'tr' ? 'Gönder' : 'Send'}
                      className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500 text-black disabled:opacity-40 hover:bg-cyan-400 transition-colors"
                    >
                      {uploading || sending ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-transparent" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
