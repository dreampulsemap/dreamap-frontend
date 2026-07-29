import { supabaseAdmin } from '@/lib/supabaseAdmin'

const PREMIUM_FEATURE_CODE = 'premium_membership'
const WEEKLY_VIDEO_MS = 7 * 24 * 60 * 60 * 1000

// Bir kullanıcının: (a) premium üyeliği aktif mi, (b) değilse haftalık ücretsiz
// video hakkını kullanabilir mi, (c) kullanamıyorsa ne zaman tekrar hakkı olacak
// bilgisini tek yerden hesaplar. Hem UI'da (picker açılmadan önce) hem de
// add-video-from-pixabay endpoint'inde (gerçek güvenlik kontrolü için) kullanılır.
export async function getPremiumVideoStatus(userId) {
  const { data: entitlement } = await supabaseAdmin
    .from('feature_entitlements')
    .select('active, ends_at')
    .eq('user_id', userId)
    .eq('feature_code', PREMIUM_FEATURE_CODE)
    .maybeSingle()

  const isPremium = !!(entitlement?.active && (!entitlement.ends_at || new Date(entitlement.ends_at) > new Date()))

  if (isPremium) {
    return { isPremium: true, canPickVideo: true, nextAvailableAt: null }
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('last_pixabay_video_pick_at')
    .eq('id', userId)
    .maybeSingle()

  const lastPick = profile?.last_pixabay_video_pick_at ? new Date(profile.last_pixabay_video_pick_at) : null
  const nextAvailableAt = lastPick ? new Date(lastPick.getTime() + WEEKLY_VIDEO_MS) : null
  const canPickVideo = !nextAvailableAt || nextAvailableAt <= new Date()

  return { isPremium: false, canPickVideo, nextAvailableAt: canPickVideo ? null : nextAvailableAt.toISOString() }
}
