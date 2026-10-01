import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MAX_BOUNTY = 50

// Önceki hali bakiyeyi oku-hesapla-yaz ile düşüyordu (eşzamanlı iki istekte
// biri kayboluyor) ve hiçbir yazmanın hatasını kontrol etmiyordu: ödül
// yazılamasa da Aura gidiyordu. Artık boost-dream.js ile aynı desen:
// mülkiyet kontrolü -> atomik spend_auras -> yazma -> hata olursa add_auras iadesi.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { dreamId, bountyAmount } = req.body || {}
    const amount = Number(bountyAmount)
    if (!dreamId || !Number.isInteger(amount) || amount < 1 || amount > MAX_BOUNTY) {
      return res.status(400).json({ error: 'invalid_amount' })
    }

    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams').select('user_id, aura_bounty').eq('id', dreamId).maybeSingle()
    if (dreamError) throw dreamError
    if (!dream) return res.status(404).json({ error: 'dream_not_found' })
    if (dream.user_id !== user.id) return res.status(403).json({ error: 'forbidden' })

    const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
      p_user_id: user.id,
      p_amount: amount,
    })
    if (spendError) throw spendError
    const spend = spendResult?.[0]
    if (!spend?.success) return res.status(402).json({ error: 'no_auras' })

    const newBounty = Number(dream.aura_bounty || 0) + amount
    const { error: updateError } = await supabaseAdmin
      .from('dreams').update({ aura_bounty: newBounty }).eq('id', dreamId).eq('user_id', user.id)
    if (updateError) {
      await supabaseAdmin.rpc('add_auras', { p_user_id: user.id, p_amount: amount })
      throw updateError
    }

    return res.status(200).json({ ok: true, aurasLeft: spend.remaining, newBounty })
  } catch (error) {
    console.error('add-bounty error:', error)
    return res.status(500).json({ error: 'internal_server_error' })
  }
}
