import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { dreamId } = req.body
    const BOOST_COST = 3 // 3 Aura Maliyet

    // 1. Aura Kontrolü
    const { data: profile } = await supabaseAdmin.from('user_profiles').select('premium_analysis_auras').eq('id', user.id).single()
    if (Number(profile?.premium_analysis_auras || 0) < BOOST_COST) {
      return res.status(402).json({ error: 'no_auras' })
    }

    // 2. Rüya Mülkiyeti Kontrolü
    const { data: dream } = await supabaseAdmin.from('dreams').select('user_id').eq('id', dreamId).single()
    if (dream?.user_id !== user.id) return res.status(403).json({ error: 'forbidden' })

    // 3. İşlem (Bakiye Düş + Rüyayı 24 Saat Boostla)
    const nextAuras = profile.premium_analysis_auras - BOOST_COST
    const expireDate = new Date()
    expireDate.setHours(expireDate.getHours() + 24) // 24 Saatlik parlama

    await supabaseAdmin.from('user_profiles').update({ premium_analysis_auras: nextAuras }).eq('id', user.id)
    await supabaseAdmin.from('dreams').update({ is_boosted: true, boost_expires_at: expireDate.toISOString() }).eq('id', dreamId)

    return res.status(200).json({ ok: true, aurasLeft: nextAuras })
  } catch (error) {
    return res.status(500).json({ error: 'internal_server_error' })
  }
}