import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { dreamId, interpretation } = req.body;

    // 1. Kendi rüyasına yorum yapıp ödül almasını engelle
    const { data: dream } = await supabaseAdmin.from('dreams').select('user_id, aura_bounty').eq('id', dreamId).single();
    if (dream.user_id === user.id) return res.status(403).json({ error: 'cannot_hunt_own_dream' });
    if (dream.aura_bounty <= 0) return res.status(400).json({ error: 'no_active_bounty' });

    // 2. Yorumu kaydet
    const { data, error } = await supabaseAdmin
      .from('bounty_claims')
      .insert([{
        dream_id: dreamId,
        claimant_id: user.id,
        interpretation: interpretation
      }])
      .select().single();

    if (error) throw error;
    return res.status(200).json({ ok: true, data });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}