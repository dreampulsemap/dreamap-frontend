import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Kullanıcının bugünkü tüm Daily Seed'lerini getirir (Vision Board ana ekranında
      // "bugün yapman gerekenler" listesi için)
      const user = await getAuthedUser(req)
      if (!user) return res.status(401).json({ error: 'unauthorized' })

      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabaseAdmin
        .from('daily_seeds')
        .select('*, goals(id, title, status)')
        .eq('user_id', user.id)
        .eq('seed_date', today)
        .order('created_at', { ascending: true })

      if (error) throw error
      return res.status(200).json({ seeds: data || [] })
    }

    if (req.method === 'POST') {
      const user = await getAuthedUser(req)
      if (!user) return res.status(401).json({ error: 'unauthorized' })

      const { seedId } = req.body || {}
      if (!seedId) return res.status(400).json({ error: 'seedId_required' })

      const { data: seed, error: fetchError } = await supabaseAdmin
        .from('daily_seeds')
        .select('id, user_id, is_completed')
        .eq('id', seedId)
        .single()

      if (fetchError || !seed) return res.status(404).json({ error: 'seed_not_found' })
      if (seed.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('daily_seeds')
        .update({ is_completed: !seed.is_completed })
        .eq('id', seedId)
        .select('*')
        .single()

      if (updateError) throw updateError
      return res.status(200).json({ seed: updated })
    }

    return res.status(405).json({ error: 'method_not_allowed' })
  } catch (error) {
    console.error('daily-seeds/complete error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
