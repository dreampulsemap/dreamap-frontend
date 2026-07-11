import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, username, display_name, avatar_url } = req.body || {}

  if (!userId) {
    return res.status(400).json({ error: 'Eksik userId' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  try {
    const payload = {
      username: username?.trim() || null,
      display_name: display_name?.trim() || null,
      avatar_url: avatar_url?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, profile: data })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}