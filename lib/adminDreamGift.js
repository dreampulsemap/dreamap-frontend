import { sendPushToUser } from './webPush'
import { recipientLang, pushText } from './pushI18n'

// Rüya sahibine hem uygulama-içi bildirim (notifications tablosu → Navbar
// zili) hem push bildirimi gönderir. notify.js'deki notifyAnalysisOutcome
// ile aynı desen: gerçek bir "actor" yok (bu bir admin eylemi), o yüzden
// actor_id kendisi. notifications.type constraint'i bu değeri kabul etsin
// diye 008_admin_dream_image_gift.sql migration'ı gerekiyor (uygulandı).
//
// Hem admin'in Pixabay'den elle seçtiği hem cihazdan yüklediği görseller
// için ortak kullanılır (pages/api/admin/dreams/attach-image.js ve
// upload-image.js).
export async function notifyDreamImageGift(supabaseAdmin, { userId, dreamId, lang = 'tr' }) {
  try {
    await supabaseAdmin.from('notifications').insert([
      { user_id: userId, actor_id: userId, type: 'dream_image_gift', dream_id: dreamId, is_read: false },
    ])
  } catch (err) {
    console.error('in-app notification insert error (dream_image_gift):', err)
  }

  const rLang = await recipientLang(supabaseAdmin, userId)
  try {
    await sendPushToUser(supabaseAdmin, userId, {
      title: pushText(rLang, 'gift_title'),
      body: pushText(rLang, 'gift_body'),
      url: `/dream/${dreamId}`,
      tag: `dream-image-gift-${dreamId}`,
    })
  } catch (err) {
    console.error('push notification error (dream_image_gift):', err)
  }
}
