// pages/api/account/delete.js
//
// Google Play "Hesap Silme" politikası (2023) gereği: kullanıcı hesabını
// ve buna bağlı kişisel verileri kalıcı olarak siler. Hem Android
// uygulamasından (POST, Authorization: Bearer <token>) hem de
// pages/delete-account.js web sayfasından çağrılır.
//
// Bu dosya CANLI veritabanına (pg_constraint + information_schema) doğrudan
// bağlanıp auth.users / user_profiles / goals'a referans veren TÜM foreign
// key'lerin gerçek ON DELETE kuralı tek tek doğrulanarak yazıldı — tahmin
// değil. Özetle:
//
//   - user_profiles.id -> auth.users            ON DELETE CASCADE
//   - (goal_comments, goal_reactions, goal_saves, goal_reports, goal_slides,
//      micro_goals, daily_seeds) -> goals        ON DELETE CASCADE
//   - (daily_seeds, diary_entries, diary_views x2, fcm_tokens, goal_comments,
//      goal_reactions, goal_saves, goal_slide_saves, goals, image_credit_
//      transactions, lunos_points_ledger, mental_wall_reports, messages x2,
//      notifications.user_id, referrals x2, user_period_summaries,
//      bounty_claims) -> user_profiles           ON DELETE CASCADE
//   - friendships (user_id, friend_id) -> auth.users            CASCADE
//   - push_subscriptions.user_id -> auth.users                   CASCADE
//   - weekly_prophecies.user_id -> auth.users                    CASCADE
//   => YUKARIDAKİLERİN HİÇBİRİNİ elle silmemize gerek yok — auth.users
//      silinince hepsi otomatik gider.
//
//   - dreams.user_id -> auth.users               ON DELETE SET NULL
//     (KASITLI: rüya SİLİNMEZ, sahibi anonimleşir — collective_predictions/
//     daily_prophecy gibi toplu özelliklere katkısı ve başkalarının
//     yorum/beğenisi korunur. Elle silmiyoruz.)
//   - notifications.actor_id -> user_profiles     ON DELETE SET NULL
//     (KASITLI: "X seni beğendi" gibi başkasının bildirim geçmişindeki
//     kayıt kalır, sadece aktör anonimleşir. Elle silmiyoruz.)
//   - gumroad_sales / gumroad_webhook_events -> user_profiles     SET NULL
//     (zaten doğru kurulmuş, dokunmuyoruz.)
//
//   - comments.user_id -> profiles(!)             NO ACTION  <- eski/legacy
//   - likes.user_id -> profiles(!)                NO ACTION  <- tablo
//     (public.profiles, public.user_profiles'tan AYRI, eski bir tablo;
//     comments/likes hâlâ ona referans veriyor. Cascade YOK — bu yüzden
//     kullanıcının kendi comments/likes satırlarını ve profiles satırını
//     BURADA elle siliyoruz.)
//
//   - google_play_purchases.user_id -> auth.users  NO ACTION idi, bu görev
//     kapsamında migration 011 ile ON DELETE SET NULL'a çevrildi (satın
//     alma kaydı muhasebe için korunur, kişisel bağ kalkar).
//
// Elle yapılması gereken TEK ŞEY: Storage dosyaları (DB cascade dosya
// silmez) + legacy comments/likes/profiles temizliği. Gerisi auth.users
// silinince otomatik.
//
// Yanıt formatı Android tarafının (GenericSuccessResponse) beklediğiyle
// uyumlu: { success: true } veya { success: false, error: '...' }.

import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// {userId}/... önekiyle tutulan bucket'lar (bkz. lib/uploadDreamCoverImage.js,
// uploadVisionVideo.js, uploadDiaryMedia.js, goals/generate-cover.js).
// Alt klasörlü olabilirler (ör. dream-images/{userId}/{dreamId}/dosya) —
// bu yüzden recursive siliyoruz.
const USER_PREFIXED_BUCKETS = ['dream-images', 'goal-videos', 'diary-media', 'goal-covers', 'message-attachments']

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

    // 2) Legacy comments/likes -> public.profiles (NO ACTION, cascade yok).
    //    profiles satırını silmeden önce bu ikisi gitmeli, yoksa adım 3
    //    foreign-key hatası verir.
    await safeDelete('comments', 'user_id', userId)
    await safeDelete('likes', 'user_id', userId)

    // 3) Legacy profiles tablosu — user_profiles'tan ayrı, hiçbir cascade
    //    ona ulaşmıyor, bu yüzden elle siliyoruz.
    await safeDelete('profiles', 'id', userId)

    // 4) Son adım — geri alınamaz. Doğrulanmış cascade zinciri (yukarıdaki
    //    yorum) user_profiles ve ona bağlı ~20 tabloyu otomatik temizler;
    //    dreams ve notifications.actor_id kasıtlı olarak SET NULL ile
    //    anonimleşir, silinmez. google_play_purchases artık (migration 011)
    //    SET NULL olduğu için satın alma geçmişi olan kullanıcılar da
    //    buraya kadar sorunsuz gelir.
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
