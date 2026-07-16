import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { claimId, dreamId, claimantId } = req.body;

    // Supabase RPC fonksiyonunu çağır (Önceki adımda yazdığımız güvenli transfer fonksiyonu)
    const { data, error } = await supabaseAdmin.rpc('approve_bounty_claim', {
      p_claim_id: claimId,
      p_dream_id: dreamId,
      p_claimant_id: claimantId,
      p_owner_id: user.id
    });

    if (error) throw error;
    if (data.success === false) return res.status(400).json(data);

    return res.status(200).json({ ok: true, data });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}