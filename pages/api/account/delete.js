// pages/api/account/delete.js
//
// Google Play "Hesap Silme" politikası (2023) gereği: kullanıcı hesabını
// ve buna bağlı kişisel verileri kalıcı olarak siler. Hem Android
// uygulamasından (POST, Authorization: Bearer <token>) hem de
// pages/delete-account.js web sayfasından çağrılır.
//
// Bu dosyanın önceki bir sürümü, canlı veritabanına (pg_constraint +
// information_schema) doğrudan bağlanıp auth.users / user_profiles /
// goals'a referans veren foreign key'lerin ON DELETE kuralını tek tek
// doğruladı. Bulgular (özet):
//
//   - user_profiles.id -> auth.users                          CASCADE
//   - (goal_comments, goal_reactions, goal_saves, goal_reports, goal_slides,
//      micro_goals, daily_seeds) -> goals                      CASCADE
//   - (daily_seeds, diary_entries, diary_views x2, fcm_tokens, goal_comments,
//      goal_reactions, goal_saves, goal_slide_saves, goals, image_credit_
//      transactions, lunos_points_ledger, mental_wall_reports, messages x2,
//      notifications.user_id, referrals x2, user_period_summaries,
//      bounty_claims) -> user_profiles                         CASCADE
//   - friendships (user_id, friend_id) -> auth.users            CASCADE
//   - push_subscriptions.user_id -> auth.users                  CASCADE
//   - weekly_prophecies.user_id -> auth.users                   CASCADE
//   - comments.user_id / likes.user_id -> public.profiles       NO ACTION
//     (public.profiles, user_profiles'tan AYRI, eski/legacy bir tablo;
//     cascade yok, bu yüzden burada elle siliniyor)
//   - google_play_purchases.user_id -> auth.users  eskiden NO ACTION idi,
//     migration 011 ile ON DELETE SET NULL'a çevrildi (satın alma kaydı
//     muhasebe için korunur, kişisel bağ kalkar)
//   - dreams.user_id -> auth.users               SET NULL (KASITLI: rüya
//     silinmez, sahibi anonimleşir — collective_predictions/daily_prophecy
//     gibi toplu özelliklere katkısı ve başkalarının yorum/beğenisi korunur)
//   - notifications.actor_id -> user_profiles     SET NULL (KASITLI:
//     başkasının bildirim geçmişindeki kayıt kalır, sadece aktör anonimleşir)
//
// BU SÜRÜMDEKİ YAKLAŞIM: yukarıdaki doğrulama bu oturumda tekrar
// çalıştırılamadığından (bu ortamda canlı DB bağlantısı yok), "cascade var"
// denen tablolar için de aşağıda AYRICA elle silme sorgusu bırakıldı.
// Cascade doğruysa bu sorgular 0 satır bulup no-op olur; yanlışsa ya da
// ileride migration'la bozulursa veri sessizce ortada kalmaz. Tek
// istisna: dreams ve notifications.actor_id — bunlar kasıtlı olarak
// SET NULL/anonimleştirme davranışı olduğu için elle SİLİNMİYOR (silersek
// ürün kararını bozmuş oluruz).
//
// Silme sırası: önce Storage (DB cascade dosya silmez), sonra alt/yaprak
// tablolar, sonra goals/legacy profiles, sonra user_profiles, en son
// auth.users. auth.users silinmeden önce user_profiles'ı silmek cascade'e
// güvenmemek için kasıtlı.
//
// Yanıt formatı Android tarafının (GenericSuccessResponse: success veya ok)
// beklediğiyle uyumlu: { success: true } veya { success: false, error: '...' }.

import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// {userId}/... önekiyle tutulan bucket'lar (bkz. lib/uploadDreamCoverImage.js,
// uploadVisionVideo.js, uploadDiaryMedia.js, goals/generate-cover.js,
// messages/send.js'deki message-attachments prefix kontrolü). 'avatars'
// persistRemoteImage.js yorumunda geçiyor ama kodda hiç .storage.from
// çağrısı bulunamadı — var olup olmadığından emin değiliz, listede tutmak
// zararsız (bucket yoksa veya boşsa list() sessizce boş döner).
// Alt klasörlü olabilirler (ör. dream-images/{userId}/{dreamId}/dosya) —
// bu yüzden recursive siliniyor.
const USER_PREFIXED_BUCKETS = ['dream-images', 'goal-videos', 'diary-media', 'goal-covers', 'message-attachments', 'avatars']

async function deleteUserFolderRecursive(bucket, prefix) {
  const { data: entries, error } = await supabaseAdmin.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error || !entries?.length) return

  const filePaths = []
  for (const entry of entries) {
    const fullPath = `${prefix}/${entry.name}`
    // Supabase Storage'da "klasör" kavramı yoktur; id'si null olan
    // girdiler alt klasör anlamına gelir (bkz. Supabase JS SDK davranışı).
    if (entry.id === null) {
      await deleteUserFolderRecursive(bucket, fullPath)
    } else {
      filePaths.push(fullPath)
    }
  }
  if (filePaths.length) {
    await supabaseAdmin.storage.from(bucket).remove(filePaths)
  }
}

// Hata olsa da diğer tabloların silinmesini engellemez — sonunda tek tek
// loglanır. table.column = userId deseninin dışında kalanlar (iki farklı
// kolon, ör. friendships.user_id VE friendships.friend_id) ayrı ayrı
// çağrılır.
async function safeDelete(table, column, userId) {
  try {
    const { error } = await supabaseAdmin.from(table).delete().eq(column, userId)
    if (error) console.error(`[account/delete] ${table}.${column} silinirken hata:`, error.message)
  } catch (e) {
    console.error(`[account/delete] ${table}.${column} beklenmeyen hata:`, e.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ success: false, error: 'unauthorized' })

  const userId = user.id

  try {
    // 1) Storage — DB cascade dosyaları silmez, önce bunlar gitmeli.
    for (const bucket of USER_PREFIXED_BUCKETS) {
      await deleteUserFolderRecursive(bucket, userId)
    }

    // 2) goals altındaki doğrudan bağlı tablolar. Doğrulamaya göre goals
    //    silinince bunlar zaten cascade ile gider; goals'tan önce elle
    //    siliniyor çünkü goals silindikten sonra goal_id'ler artık
    //    sorgulanamaz hale gelir (id listesi kaybolur).
    const { data: userGoals } = await supabaseAdmin.from('goals').select('id').eq('user_id', userId)
    const goalIds = (userGoals || []).map((g) => g.id)
    if (goalIds.length) {
      await supabaseAdmin.from('micro_goals').delete().in('goal_id', goalIds)
      await supabaseAdmin.from('daily_seeds').delete().in('goal_id', goalIds)
      await supabaseAdmin.from('goal_slides').delete().in('goal_id', goalIds)
    }
    await safeDelete('goal_comments', 'user_id', userId)
    await safeDelete('goal_reactions', 'sender_id', userId)
    await safeDelete('goal_reports', 'reporter_id', userId)
    await safeDelete('goal_saves', 'user_id', userId)
    await safeDelete('goal_slide_saves', 'user_id', userId)
    await safeDelete('goals', 'user_id', userId)

    // 3) user_profiles'a doğrudan bağlı diğer tablolar (doğrulamaya göre
    //    cascade var, yine de burada ayrıca elle temizleniyor).
    await safeDelete('diary_entries', 'user_id', userId)
    await safeDelete('diary_views', 'viewer_id', userId)
    await safeDelete('diary_views', 'owner_id', userId)
    await safeDelete('fcm_tokens', 'user_id', userId)
    await safeDelete('image_credit_transactions', 'user_id', userId)
    await safeDelete('lunos_points_ledger', 'user_id', userId)
    await safeDelete('mental_wall_reports', 'user_id', userId)
    await safeDelete('messages', 'sender_id', userId)
    await safeDelete('messages', 'recipient_id', userId)
    await safeDelete('notifications', 'user_id', userId)
    await safeDelete('referrals', 'inviter_id', userId)
    await safeDelete('referrals', 'invited_user_id', userId)
    await safeDelete('user_period_summaries', 'user_id', userId)
    await safeDelete('bounty_claims', 'claimant_id', userId)
    await safeDelete('friendships', 'user_id', userId)
    await safeDelete('friendships', 'friend_id', userId)
    await safeDelete('push_subscriptions', 'user_id', userId)
    await safeDelete('weekly_prophecies', 'user_id', userId)

    // NOT: dreams.user_id ve notifications.actor_id KASITLI olarak elle
    // silinmiyor — bunlar SET NULL ile anonimleşiyor, ürün kararı bu.
    // google_play_purchases da migration 011 sonrası SET NULL, elle
    // dokunulmuyor (satın alma kaydı muhasebe için korunmalı).

    // 4) Legacy comments/likes -> public.profiles (NO ACTION, cascade yok).
    //    profiles satırını silmeden önce bu ikisi gitmeli, yoksa adım 5
    //    foreign-key hatası verir.
    await safeDelete('comments', 'user_id', userId)
    await safeDelete('likes', 'user_id', userId)

    // 5) Legacy profiles tablosu — user_profiles'tan ayrı, hiçbir cascade
    //    ona ulaşmıyor, bu yüzden elle siliniyor.
    await safeDelete('profiles', 'id', userId)

    // 6) user_profiles — auth.users silinmeden önce elle siliniyor (cascade
    //    zaten varsa no-op, yoksa/bozulursa veri ortada kalmaz).
    await safeDelete('user_profiles', 'id', userId)

    // 7) Son adım — geri alınamaz.
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('[account/delete] auth.admin.deleteUser hatası:', authError.message)
      return res.status(500).json({ success: false, error: 'Hesap silinemedi.' })
    }

    return res.status(200).json({ success: true })
  } catch (e) {
    console.error('[account/delete] beklenmeyen hata:', e)
    return res.status(500).json({ success: false, error: e.message || 'internal_error' })
  }
}
