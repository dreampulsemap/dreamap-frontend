import { createClient } from '@supabase/supabase-js'

// =====================================================================
// "PARLAT" (boost)
//
// ONCEKI HALI NEDEN CALISMIYORDU (iki ayri kok neden, ikisi de sessiz):
//  1. `dreams.is_boosted` ve `dreams.boost_expires_at` kolonlari
//     veritabaninda HIC yoktu. supabase-js update() hata FIRLATMAZ,
//     { error } dondurur; kod donen error'u hic kontrol etmiyordu.
//  2. Aura dususu ayri bir UPDATE ile yapiliyordu (oku-hesapla-yaz),
//     yani hem yarista kaybolabiliyor hem de 1. maddedeki hatadan
//     bagimsiz olarak dusuluyordu.
//  Sonuc: kullanicidan 3 Aura gidiyor, ruya parlamiyor, yanit ok:true.
//
// SIMDI: atomik spend_auras + her yazmanin error kontrolu + basarisizlikta
// add_auras ile atomik iade (generate-cover.js / mental-wall ile ayni desen).
// =====================================================================

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BOOST_COST = 3
const BOOST_HOURS = 24

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { dreamId } = req.body || {}
    if (!dreamId) return res.status(400).json({ error: 'dream_id_required' })

    // Mulkiyet kontrolu Aura harcamadan ONCE.
    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select('id, user_id, is_boosted, boost_expires_at')
      .eq('id', dreamId)
      .maybeSingle()

    if (dreamError) throw dreamError
    if (!dream) return res.status(404).json({ error: 'dream_not_found' })
    if (dream.user_id !== user.id) return res.status(403).json({ error: 'forbidden' })

    // Zaten parliyorsa Aura alma — kullanici bosa odemesin.
    const stillBoosted =
      dream.is_boosted &&
      dream.boost_expires_at &&
      new Date(dream.boost_expires_at) > new Date()

    if (stillBoosted) {
      return res.status(200).json({
        ok: true,
        alreadyBoosted: true,
        boostExpiresAt: dream.boost_expires_at,
      })
    }

    const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
      p_user_id: user.id,
      p_amount: BOOST_COST,
    })
    if (spendError) throw spendError

    const spend = spendResult?.[0]
    if (!spend?.success) {
      return res.status(402).json({ error: 'insufficient_auras', cost: BOOST_COST })
    }

    const expiresAt = new Date(Date.now() + BOOST_HOURS * 60 * 60 * 1000).toISOString()

    const { error: boostError } = await supabaseAdmin
      .from('dreams')
      .update({ is_boosted: true, boost_expires_at: expiresAt })
      .eq('id', dreamId)
      .eq('user_id', user.id)

    if (boostError) {
      await supabaseAdmin.rpc('add_auras', { p_user_id: user.id, p_amount: BOOST_COST })
      throw boostError
    }

    return res.status(200).json({
      ok: true,
      aurasLeft: spend.remaining,
      boostExpiresAt: expiresAt,
    })
  } catch (error) {
    console.error('boost-dream error:', error)
    return res.status(500).json({ error: 'internal_server_error' })
  }
}
