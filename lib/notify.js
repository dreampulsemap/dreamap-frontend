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
