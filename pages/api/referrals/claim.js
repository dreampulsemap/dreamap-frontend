import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const REWARD_AMOUNT = 3 // "Arkadaşını davet et, 3 ekstra Flux görsel üretim kredisi kazan"

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    // Davet edilen (yeni) kullanıcı kendi oturumuyla bu endpoint'i çağırır
    const invitedUser = await getAuthedUser(req)
    if (!invitedUser) return res.status(401).json({ error: 'unauthorized' })

    const { inviterCode } = req.body || {}
    if (!inviterCode) return res.status(400).json({ error: 'inviterCode_required' })

    // Referral kodu = davet edenin user_profiles.id'si
    if (inviterCode === invitedUser.id) {
      return res.status(400).json({ error: 'cannot_refer_self' })
    }

    const { data: inviter, error: inviterError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', inviterCode)
      .single()

    if (inviterError || !inviter) return res.status(404).json({ error: 'inviter_not_found' })

    // invited_user_id unique kısıtı: bir kullanıcı yalnızca BİR kez referral olarak kaydedilebilir
    const { data: referral, error: insertError } = await supabaseAdmin
      .from('referrals')
      .insert({
        inviter_id: inviter.id,
        invited_user_id: invitedUser.id,
        reward_amount: REWARD_AMOUNT,
        reward_granted: false,
      })
      .select('*')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(400).json({ error: 'already_referred' })
      }
      throw insertError
    }

    // Ödülü ver: davet edenin image_credits bakiyesini artır + hareketi kaydet.
    // Bu iki adım tek bir DB transaction'ı olmadığı için (Supabase JS client'ta yok),
    // önce ledger'a yaz, sonra bakiyeyi güncelle — ledger her zaman "gerçek kaynak"
    // olarak kalır, bakiye tutarsız olsa bile ledger'dan yeniden hesaplanabilir.
    await supabaseAdmin.from('image_credit_transactions').insert({
      user_id: inviter.id,
      delta: REWARD_AMOUNT,
      reason: 'referral_bonus',
      reference_type: 'referral',
      reference_id: referral.id,
    })

    const { data: inviterProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('image_credits')
      .eq('id', inviter.id)
      .single()

    await supabaseAdmin
      .from('user_profiles')
      .update({ image_credits: (inviterProfile?.image_credits || 0) + REWARD_AMOUNT })
      .eq('id', inviter.id)

    await supabaseAdmin
      .from('referrals')
      .update({ reward_granted: true })
      .eq('id', referral.id)

    return res.status(200).json({ referral: { ...referral, reward_granted: true } })
  } catch (error) {
    console.error('referrals/claim error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
