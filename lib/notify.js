import { sendPushToUser } from './webPush'

// Rüya analizinin sonucu (başarılı/başarısız) için hem uygulama-içi bildirim
// (notifications tablosu → Navbar zil ikonu) hem de gerçek push bildirimi gönderir.
export async function notifyAnalysisOutcome(supabaseAdmin, { userId, dreamId, status, lang = 'tr' }) {
  const type = status === 'generated' ? 'analysis_ready' : 'analysis_failed'

  try {
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: userId,
        actor_id: userId,
        type,
        dream_id: dreamId,
        is_read: false
      }
    ])
  } catch (err) {
    console.error('in-app notification insert error:', err)
  }

  const isTr = lang === 'tr'
  const title = status === 'generated'
    ? (isTr ? 'Analiziniz hazır ✨' : 'Your analysis is ready ✨')
    : (isTr ? 'Analiz oluşturulamadı' : 'Analysis could not be generated')

  const body = status === 'generated'
    ? (isTr ? 'Derinlemesine rüya analiziniz tamamlandı. Görmek için dokunun.' : 'Your deep dream analysis is complete. Tap to view it.')
    : (isTr ? 'Auralarınız iade edildi. Tekrar denemek için dokunun.' : 'Your auras have been refunded. Tap to try again.')

  try {
    await sendPushToUser(supabaseAdmin, userId, {
      title,
      body,
      url: `/dream/${dreamId}`,
      tag: `deep-analysis-${dreamId}`
    })
  } catch (err) {
    console.error('push notification error:', err)
  }
}

async function getActorName(supabaseAdmin, actorId, lang) {
  const { data: actorProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('username, display_name')
    .eq('id', actorId)
    .maybeSingle()
  return actorProfile?.display_name || actorProfile?.username || (lang === 'tr' ? 'Biri' : 'Someone')
}

// Biri seni takip ettiğinde (açık profil → anında; gizli profil → istek olarak)
// hem uygulama-içi bildirim hem push gönderir. Önceden bu satırlar hiç
// çağrılmıyordu — Navbar zili "takip isteği" mesajını göstermeye hazırdı ama
// tetikleyen kod eksikti.
export async function notifyFollow(supabaseAdmin, { userId, actorId, accepted, lang = 'tr' }) {
  const type = accepted ? 'new_follower' : 'friend_request'
  const isTr = lang === 'tr'

  try {
    await supabaseAdmin.from('notifications').insert([
      { user_id: userId, actor_id: actorId, type, is_read: false }
    ])
  } catch (err) {
    console.error('in-app notification insert error (follow):', err)
  }

  const actorName = await getActorName(supabaseAdmin, actorId, lang)
  const title = accepted
    ? (isTr ? 'Yeni takipçi 🌙' : 'New follower 🌙')
    : (isTr ? 'Takip isteği 👋' : 'Follow request 👋')
  const body = accepted
    ? (isTr ? `${actorName} seni takip etmeye başladı.` : `${actorName} started following you.`)
    : (isTr ? `${actorName} sana takip isteği gönderdi.` : `${actorName} sent you a follow request.`)

  try {
    await sendPushToUser(supabaseAdmin, userId, { title, body, url: `/u/${actorId}`, tag: `follow-${actorId}` })
  } catch (err) {
    console.error('push notification error (follow):', err)
  }
}

// Bug #10 düzeltmesi: goal_comments/goal_reactions tablolarındaki DB trigger'ları
// (notify_goal_comment, notify_mana_received) SADECE "notifications" tablosuna
// satır ekliyordu (zil ikonu için) — bu satırlar bir Postgres trigger'ı
// içinden çalıştığı için gerçek push göndermek (webPush/FCM, JS tarafında)
// mümkün değildi. Sonuç: kullanıcı zilde bildirimi görüyor ama cihazına
// hiçbir push düşmüyordu ("bildirim var diyor ama telefona bir şey
// gelmiyor"). DB trigger zaten in-app satırını oluşturduğu için burada
// SADECE push gönderiyoruz, ikinci bir "notifications" satırı EKLEMİYORUZ
// (aksi halde zilde aynı bildirim iki kez görünürdü).
export async function notifyGoalComment(supabaseAdmin, { goalOwnerId, actorId, goalId, lang = 'tr' }) {
  if (goalOwnerId === actorId) return // kendi hedefine yorum yapan kişiye push gitmesin
  const isTr = lang === 'tr'
  const actorName = await getActorName(supabaseAdmin, actorId, lang)

  try {
    await sendPushToUser(supabaseAdmin, goalOwnerId, {
      title: isTr ? 'Yeni yorum 💬' : 'New comment 💬',
      body: isTr ? `${actorName} vizyonuna yorum yaptı.` : `${actorName} commented on your vision.`,
      url: `/goal/${goalId}`,
      tag: `goal-comment-${goalId}`
    })
  } catch (err) {
    console.error('push notification error (goal comment):', err)
  }
}

export async function notifyManaReceived(supabaseAdmin, { goalOwnerId, actorId, goalId, lang = 'tr' }) {
  if (goalOwnerId === actorId) return
  const isTr = lang === 'tr'
  const actorName = await getActorName(supabaseAdmin, actorId, lang)

  try {
    await sendPushToUser(supabaseAdmin, goalOwnerId, {
      title: isTr ? 'Mana aldın ✨' : 'You received mana ✨',
      body: isTr ? `${actorName} vizyonuna mana gönderdi.` : `${actorName} sent mana to your vision.`,
      url: `/goal/${goalId}`,
      tag: `goal-mana-${goalId}`
    })
  } catch (err) {
    console.error('push notification error (mana received):', err)
  }
}

// Bug #13: Günlük/Hikaye (diary_entries) fotoğraf gönderilerine yorum
// yapıldığında girdi sahibine hem zil bildirimi hem push gönderir. Bu tablo
// için (goal_comments'in aksine) bir DB trigger'ı yok, o yüzden hem in-app
// satırını hem push'u burada, tek yerde ekliyoruz.
export async function notifyDiaryComment(supabaseAdmin, { entryOwnerId, actorId, diaryEntryId, lang = 'tr' }) {
  if (entryOwnerId === actorId) return
  const isTr = lang === 'tr'

  try {
    await supabaseAdmin.from('notifications').insert([
      { user_id: entryOwnerId, actor_id: actorId, type: 'diary_comment', reference_type: 'diary_entry', reference_id: diaryEntryId, is_read: false }
    ])
  } catch (err) {
    console.error('in-app notification insert error (diary comment):', err)
  }

  const actorName = await getActorName(supabaseAdmin, actorId, lang)

  try {
    await sendPushToUser(supabaseAdmin, entryOwnerId, {
      title: isTr ? 'Yeni yorum 💬' : 'New comment 💬',
      body: isTr ? `${actorName} paylaşımına yorum yaptı.` : `${actorName} commented on your post.`,
      url: `/diary/${diaryEntryId}`,
      tag: `diary-comment-${diaryEntryId}`
    })
  } catch (err) {
    console.error('push notification error (diary comment):', err)
  }
}

// Bekleyen bir takip isteği kabul edildiğinde, isteği gönderen tarafa haber verir.
export async function notifyFollowAccepted(supabaseAdmin, { userId, actorId, lang = 'tr' }) {
  const isTr = lang === 'tr'

  try {
    await supabaseAdmin.from('notifications').insert([
      { user_id: userId, actor_id: actorId, type: 'follow_accepted', is_read: false }
    ])
  } catch (err) {
    console.error('in-app notification insert error (follow accepted):', err)
  }

  const actorName = await getActorName(supabaseAdmin, actorId, lang)

  try {
    await sendPushToUser(supabaseAdmin, userId, {
      title: isTr ? 'Takip isteğin kabul edildi ✅' : 'Follow request accepted ✅',
      body: isTr ? `${actorName} takip isteğini kabul etti.` : `${actorName} accepted your follow request.`,
      url: `/u/${actorId}`,
      tag: `follow-accepted-${actorId}`
    })
  } catch (err) {
    console.error('push notification error (follow accepted):', err)
  }
}
