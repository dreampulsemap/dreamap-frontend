import { signDiaryMedia } from '@/lib/diaryMediaUrl'
import { clip, sharePath } from '@/lib/shareUtils'

export { clip, sharePath }

// Rüya / günce / vizyon paylaşımı için tek kaynak.
//
// Kural: bir içeriği yalnızca SAHİBİ ya da içerik herkese açıksa (visibility
// 'public') herkes paylaşabilir. Arkadaşa özel / gizli bir içeriği sahibi
// dışında biri DM ile iletemez — aksi halde kart, içeriği görme yetkisi
// olmayan birine metin + görsel olarak sızardı.
//
// Kartın metnini istemci değil sunucu üretir (messages.shared_ref); böylece
// "şu kişi şunu paylaştı" diye sahte içerikli kart gönderilemez.

export const SHARE_TYPES = ['dream', 'diary', 'vision']
export const SITE_URL = 'https://lunosfer.com'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DREAM_ID_RE = /^\d{1,18}$/

function firstLine(text, max) {
  const line = String(text || '').split(/\r?\n/).find((l) => l.trim()) || ''
  return clip(line, max)
}

export function isValidShareId(type, id) {
  const value = String(id ?? '')
  if (type === 'dream') return DREAM_ID_RE.test(value)
  if (type === 'diary' || type === 'vision') return UUID_RE.test(value)
  return false
}

/**
 * İçeriği ham haliyle yükler. Bulunamazsa null.
 * Dönen imageUrl, günce için bucket yolunu taşıyan saklı değerdir;
 * gösterilmeden önce signSharedImages / signDiaryMedia ile imzalanmalı.
 */
export async function loadShareable(supabaseAdmin, type, id) {
  if (!SHARE_TYPES.includes(type) || !isValidShareId(type, id)) return null

  if (type === 'dream') {
    const { data } = await supabaseAdmin
      .from('dreams')
      .select('id, user_id, ai_title, content, ai_image_url, image_status, visibility, created_at')
      .eq('id', Number(id))
      .maybeSingle()
    if (!data) return null
    return {
      type,
      id: String(data.id),
      ownerId: data.user_id,
      // RLS (dreams_select_policy) NULL'u herkese açık saymıyor; burada da kapalı say.
      visibility: data.visibility || 'private',
      title: clip(data.ai_title || firstLine(data.content, 80), 80),
      excerpt: clip(data.content, 280),
      imageUrl: data.image_status === 'broken' ? null : data.ai_image_url || null,
      createdAt: data.created_at,
    }
  }

  if (type === 'diary') {
    const { data } = await supabaseAdmin
      .from('diary_entries')
      .select('id, user_id, caption, media_type, media_url, poster_url, visibility, created_at')
      .eq('id', id)
      .maybeSingle()
    if (!data) return null
    return {
      type,
      id: data.id,
      ownerId: data.user_id,
      visibility: data.visibility || 'private',
      title: firstLine(data.caption, 80),
      excerpt: clip(data.caption, 280),
      imageUrl: data.media_type === 'photo' ? data.media_url || null : data.poster_url || null,
      mediaType: data.media_type,
      createdAt: data.created_at,
    }
  }

  const { data } = await supabaseAdmin
    .from('goals')
    .select('id, user_id, title, description, cover_image_url, visibility, status, believers_count, created_at')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  return {
    type,
    id: data.id,
    ownerId: data.user_id,
    visibility: data.visibility || 'public',
    title: clip(data.title, 80),
    excerpt: clip(data.description, 280),
    imageUrl: data.cover_image_url || null,
    believersCount: data.believers_count || 0,
    status: data.status,
    createdAt: data.created_at,
  }
}

export async function loadOwnerProfile(supabaseAdmin, userId) {
  if (!userId) return null
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  return data || null
}

export function ownerDisplayName(profile) {
  return profile?.display_name || profile?.username || null
}

/**
 * DM'e eklenecek anlık görüntüyü üretir.
 * @returns {{ ok: true, snapshot: object } | { ok: false, status: number, error: string }}
 */
export async function buildShareSnapshot(supabaseAdmin, { type, id, sharerId }) {
  if (!SHARE_TYPES.includes(type)) return { ok: false, status: 400, error: 'invalid_share_type' }
  if (!isValidShareId(type, id)) return { ok: false, status: 400, error: 'invalid_share_id' }

  const item = await loadShareable(supabaseAdmin, type, String(id))
  if (!item) return { ok: false, status: 404, error: 'share_not_found' }

  const isOwner = item.ownerId === sharerId
  if (!isOwner && item.visibility !== 'public') {
    return { ok: false, status: 403, error: 'not_shareable' }
  }

  const owner = await loadOwnerProfile(supabaseAdmin, item.ownerId)
  return {
    ok: true,
    snapshot: {
      type,
      id: item.id,
      title: item.title || null,
      excerpt: item.excerpt || null,
      image_url: item.imageUrl || null,
      owner_id: item.ownerId || null,
      owner_name: ownerDisplayName(owner),
      visibility: item.visibility,
    },
  }
}

/** Mesaj listesindeki günce kartlarının görsellerini taze imzalı URL'e çevirir. */
export async function signSharedImages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return messages
  const diary = messages.filter((m) => m?.shared_ref?.type === 'diary' && m.shared_ref.image_url)
  if (diary.length === 0) return messages

  const signed = await signDiaryMedia(diary.map((m) => m.shared_ref), ['image_url'])
  const byId = new Map(diary.map((m, i) => [m.id, signed[i]]))
  return messages.map((m) => (byId.has(m.id) ? { ...m, shared_ref: byId.get(m.id) } : m))
}
