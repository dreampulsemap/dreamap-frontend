import { supabase } from '../lib/supabase'

export async function getUserDreams(userId) {
  if (!userId) return []

  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getUserDreams error:', error)
    throw error
  }

  console.log('getUserDreams result:', {
    userId,
    count: data?.length || 0,
  })

  return data || []
}

export async function removeDreamFromFeed(dreamId, userId) {
  const res = await fetch('/api/delete-dream', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dreamId,
      userId,
      softDelete: true,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Feed kaldırma hatası')
  return data
}

export async function deleteDreamPermanently(dreamId, userId) {
  const res = await fetch('/api/delete-dream', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dreamId,
      userId,
      softDelete: false,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Silme hatası')
  return data
}

export async function updateDream(dreamId, userId, updates) {
  const res = await fetch('/api/update-dream', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dreamId,
      userId,
      ...updates,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Güncelleme hatası')
  return data
}