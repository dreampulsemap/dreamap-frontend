import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    if (req.method === 'POST') {
      const { subscription } = req.body || {}
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ error: 'invalid_subscription' })
      }

      const { error } = await supabaseAdmin
        .from('push_subscriptions')
        .upsert(
          [
            {
              user_id: user.id,
              endpoint: subscription.endpoint,
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
            }
          ],
          { onConflict: 'endpoint' }
        )

      if (error) throw error
      return res.status(200).json({ success: true })
    }

    if (req.method === 'DELETE') {
      const { endpoint } = req.body || {}
      if (!endpoint) return res.status(400).json({ error: 'endpoint_required' })

      const { error } = await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint)

      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'method_not_allowed' })
  } catch (error) {
    console.error('push subscribe error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
