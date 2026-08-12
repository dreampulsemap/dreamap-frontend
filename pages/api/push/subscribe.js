import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// Native Android istemcisinden gelen FCM cihaz token'ını kaydeder.
// pages/api/subscribe.js (tarayıcı Web Push aboneliği: endpoint/p256dh/auth
// üçlüsü) ile KARIŞTIRMA — bu, farklı bir kanal (FCM) için ayrı bir uç.
// İkisini aynı endpoint altında birleştirmek yerine ayrı tutmak, iki farklı
// payload şeklini birbirine karıştırmayı önlüyor. lib/webPush.js >
// sendPushToUser() ikisini de aynı anda okuyup gönderiyor.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { token } = req.body || {}
    const cleanToken = String(token || '').trim()
    if (!cleanToken) return res.status(400).json({ error: 'token_required' })
    if (cleanToken.length > 4096) return res.status(400).json({ error: 'invalid_token' })

    // upsert(on_conflict: token): aynı fiziksel token farklı bir hesaba
    // geçerse (cihazda çıkış yapıp başka biriyle giriş yapılırsa), token'ı
    // otomatik olarak YENİ kullanıcıya taşır — eski hesap o cihazdan
    // bildirim almaya devam etmez (bkz. migration 010'daki not).
    const { error } = await supabaseAdmin
      .from('fcm_tokens')
      .upsert(
        { user_id: user.id, token: cleanToken, updated_at: new Date().toISOString() },
        { onConflict: 'token' }
      )

    if (error) throw error

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('push/subscribe error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
