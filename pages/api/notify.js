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
