import { sendPushToUser } from './webPush'
import { recipientLang, pushText } from './pushI18n'

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

  // Metin her zaman ALICININ dilinde (bkz. lib/pushI18n.js).
  const rLang = await recipientLang(supabaseAdmin, userId)
  const ok = status === 'generated'
  const title = pushText(rLang, ok ? 'analysis_ready_title' : 'analysis_failed_title')
  const body = pushText(rLang, ok ? 'analysis_ready_body' : 'analysis_failed_body')

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
  return actorProfile?.display_name || actorProfile?.username || pushText(lang, 'someone')
}

// Biri seni takip ettiğinde (açık profil → anında; gizli profil → istek olarak)
// hem uygulama-içi bildirim hem push gönderir. Önceden bu satırlar hiç
// çağrılmıyordu — Navbar zili "takip isteği" mesajını göstermeye hazırdı ama
// tetikleyen kod eksikti.
export async function notifyFollow(supabaseAdmin, { userId, actorId, accepted, friendshipId, lang = 'tr' }) {
  const type = accepted ? 'new_follower' : 'friend_request'

  try {
    // Bug #4 düzeltmesi: bekleyen bir takip isteği bildirimi, kabul/red için
    // gereken friendships.id'yi hiç taşımıyordu — bu yüzden Bildirimler
    // ekranındaki satırın kendi üzerinde Kabul/Reddet gösterecek hiçbir yolu
    // yoktu (kullanıcı bunun için ayrı bir ekrana gitmesi gerektiğini
    // bilmiyordu). diary_comment'teki reference_type/reference_id deseniyle
    // aynı şekilde, sadece "pending" (friend_request) durumunda saklıyoruz —
    // "accepted" (new_follower) durumunda zaten onaylanacak bir şey yok.
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: userId,
        actor_id: actorId,
        type,
        is_read: false,
        ...(type === 'friend_request' && friendshipId
          ? { reference_type: 'friendship', reference_id: friendshipId }
          : {})
      }
    ])
  } catch (err) {
    console.error('in-app notification insert error (follow):', err)
  }

  const rLang = await recipientLang(supabaseAdmin, userId)
  const actorName = await getActorName(supabaseAdmin, actorId, rLang)
  const title = pushText(rLang, accepted ? 'follow_new_title' : 'follow_request_title')
  const body = pushText(rLang, accepted ? 'follow_new_body' : 'follow_request_body', { name: actorName })

  try {
    await sendPushToUser(supabaseAdmin, userId, { title, body, url: `/u/${actorId}`, type: 'profile', id: actorId, tag: `follow-${actorId}` })
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
  const rLang = await recipientLang(supabaseAdmin, goalOwnerId)
  const actorName = await getActorName(supabaseAdmin, actorId, rLang)

  try {
    await sendPushToUser(supabaseAdmin, goalOwnerId, {
      title: pushText(rLang, 'goal_comment_title'),
      body: pushText(rLang, 'goal_comment_body', { name: actorName }),
      url: `/goal/${goalId}`,
      tag: `goal-comment-${goalId}`
    })
  } catch (err) {
    console.error('push notification error (goal comment):', err)
  }
}

export async function notifyManaReceived(supabaseAdmin, { goalOwnerId, actorId, goalId, lang = 'tr' }) {
  if (goalOwnerId === actorId) return
  const rLang = await recipientLang(supabaseAdmin, goalOwnerId)
  const actorName = await getActorName(supabaseAdmin, actorId, rLang)

  try {
    await sendPushToUser(supabaseAdmin, goalOwnerId, {
      title: pushText(rLang, 'mana_title'),
      body: pushText(rLang, 'mana_body', { name: actorName }),
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

  try {
    await supabaseAdmin.from('notifications').insert([
      { user_id: entryOwnerId, actor_id: actorId, type: 'diary_comment', reference_type: 'diary_entry', reference_id: diaryEntryId, is_read: false }
    ])
  } catch (err) {
    console.error('in-app notification insert error (diary comment):', err)
  }

  const rLang = await recipientLang(supabaseAdmin, entryOwnerId)
  const actorName = await getActorName(supabaseAdmin, actorId, rLang)

  try {
    await sendPushToUser(supabaseAdmin, entryOwnerId, {
      title: pushText(rLang, 'diary_comment_title'),
      body: pushText(rLang, 'diary_comment_body', { name: actorName }),
      // Web'de /diary sayfası yok; Android günlüğü diary_journal/{sahip} ile açar.
      url: '/profile',
      type: 'diary',
      id: entryOwnerId,
      tag: `diary-comment-${diaryEntryId}`
    })
  } catch (err) {
    console.error('push notification error (diary comment):', err)
  }
}

// Rüya beğeni/yorumları HİÇBİR bildirim üretmiyordu — ne zil ikonu ne push.
// goal_comments/goal_reactions'ın aksine 'likes'/'comments' (rüya) için hiç
// DB trigger'ı yok, diary_comment'teki gibi hem in-app satırını hem push'u
// burada, tek yerde ekliyoruz. pages/api/like.js ve pages/api/comment.js'in
// POST dallarından çağrılır.
export async function notifyDreamLike(supabaseAdmin, { dreamOwnerId, actorId, dreamId, lang = 'tr' }) {
  if (dreamOwnerId === actorId) return

  try {
    await supabaseAdmin.from('notifications').insert([
      { user_id: dreamOwnerId, actor_id: actorId, type: 'dream_like', dream_id: dreamId, is_read: false }
    ])
  } catch (err) {
    console.error('in-app notification insert error (dream like):', err)
  }

  const rLang = await recipientLang(supabaseAdmin, dreamOwnerId)
  const actorName = await getActorName(supabaseAdmin, actorId, rLang)

  try {
    await sendPushToUser(supabaseAdmin, dreamOwnerId, {
      title: pushText(rLang, 'dream_like_title'),
      body: pushText(rLang, 'dream_like_body', { name: actorName }),
      url: `/dream/${dreamId}`,
      type: 'dream',
      id: String(dreamId),
      tag: `dream-like-${dreamId}`
    })
  } catch (err) {
    console.error('push notification error (dream like):', err)
  }
}

export async function notifyDreamComment(supabaseAdmin, { dreamOwnerId, actorId, dreamId, lang = 'tr' }) {
  if (dreamOwnerId === actorId) return

  try {
    await supabaseAdmin.from('notifications').insert([
      { user_id: dreamOwnerId, actor_id: actorId, type: 'dream_comment', dream_id: dreamId, is_read: false }
    ])
  } catch (err) {
    console.error('in-app notification insert error (dream comment):', err)
  }

  const rLang = await recipientLang(supabaseAdmin, dreamOwnerId)
  const actorName = await getActorName(supabaseAdmin, actorId, rLang)

  try {
    await sendPushToUser(supabaseAdmin, dreamOwnerId, {
      title: pushText(rLang, 'dream_comment_title'),
      body: pushText(rLang, 'dream_comment_body', { name: actorName }),
      url: `/dream/${dreamId}`,
      type: 'dream',
      id: String(dreamId),
      tag: `dream-comment-${dreamId}`
    })
  } catch (err) {
    console.error('push notification error (dream comment):', err)
  }
}

// Bekleyen bir takip isteği kabul edildiğinde, isteği gönderen tarafa haber verir.
export async function notifyFollowAccepted(supabaseAdmin, { userId, actorId, lang = 'tr' }) {

  try {
    await supabaseAdmin.from('notifications').insert([
      { user_id: userId, actor_id: actorId, type: 'follow_accepted', is_read: false }
    ])
  } catch (err) {
    console.error('in-app notification insert error (follow accepted):', err)
  }

  const rLang = await recipientLang(supabaseAdmin, userId)
  const actorName = await getActorName(supabaseAdmin, actorId, rLang)

  try {
    await sendPushToUser(supabaseAdmin, userId, {
      title: pushText(rLang, 'follow_accepted_title'),
      body: pushText(rLang, 'follow_accepted_body', { name: actorName }),
      url: `/u/${actorId}`,
      type: 'profile',
      id: actorId,
      tag: `follow-accepted-${actorId}`
    })
  } catch (err) {
    console.error('push notification error (follow accepted):', err)
  }
}
