export async function getFriends(userId) {
  const [friendsRes, pendingRes] = await Promise.all([
    fetch(`/api/friends/list?userId=${userId}&type=accepted`),
    fetch(`/api/friends/list?userId=${userId}&type=pending`),
  ])

  const friendsData = await friendsRes.json()
  const pendingData = await pendingRes.json()

  if (!friendsRes.ok) throw new Error(friendsData.error || 'Arkadaşlar alınamadı')
  if (!pendingRes.ok) throw new Error(pendingData.error || 'Bekleyen istekler alınamadı')

  return {
    friends: friendsData.friendships || [],
    pending: pendingData.friendships || [],
  }
}

export async function searchUsers(query, userId) {
  const res = await fetch(
    `/api/friends/search?query=${encodeURIComponent(query)}&userId=${userId}`
  )
  const data = await res.json()

  if (!res.ok) throw new Error(data.error || 'Kullanıcı arama hatası')
  return data.users || []
}

export async function sendFriendRequest(userId, friendId) {
  const res = await fetch('/api/friends/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, friendId }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Arkadaşlık isteği gönderilemedi')
  return data
}

export async function respondToFriendRequest(friendshipId, userId, action) {
  const res = await fetch('/api/friends/respond', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendshipId, userId, action }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'İstek yanıtlanamadı')
  return data
}