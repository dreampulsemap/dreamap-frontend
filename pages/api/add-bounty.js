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

    const { dreamId, bountyAmount } = req.body
    const amount = Number(bountyAmount)

    if (!amount || amount < 1) return res.status(400).json({ error: 'invalid_amount' })

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('premium_analysis_auras').eq('id', user.id).single()
    if (Number(profile?.premium_analysis_auras || 0) < amount) {
      return res.status(402).json({ error: 'no_auras' })
    }

    const { data: dream } = await supabaseAdmin.from('dreams').select('user_id, aura_bounty').eq('id', dreamId).single()
    if (dream?.user_id !== user.id) return res.status(403).json({ error: 'forbidden' })

    // Bakiye Düş ve Rüyaya Ödül Ekle
    const nextAuras = profile.premium_analysis_auras - amount
    const newBounty = Number(dream.aura_bounty || 0) + amount

    await supabaseAdmin.from('user_profiles').update({ premium_analysis_auras: nextAuras }).eq('id', user.id)
    await supabaseAdmin.from('dreams').update({ aura_bounty: newBounty }).eq('id', dreamId)

    return res.status(200).json({ ok: true, aurasLeft: nextAuras, newBounty })
  } catch (error) {
    return res.status(500).json({ error: 'internal_server_error' })
  }
}