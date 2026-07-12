import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      content,
      title,
      dream_date,
      location_name,
      original_language,
      user_selected_sentiment,
    } = req.body || {}

    const cleanContent = typeof content === 'string' ? content.trim() : ''

    if (!cleanContent) {
      return res.status(400).json({ error: 'content is required' })
    }

    const payload = {
      content: cleanContent,
      original_language:
        typeof original_language === 'string' && original_language.trim()
          ? original_language.trim()
          : 'tr',
      dream_date: dream_date || null,
      location_name:
        typeof location_name === 'string' && location_name.trim()
          ? location_name.trim()
          : null,
      user_selected_sentiment:
        typeof user_selected_sentiment === 'string' && user_selected_sentiment.trim()
          ? user_selected_sentiment.trim()
          : null,
      ai_title:
        typeof title === 'string' && title.trim()
          ? title.trim()
          : null,
      analysis_status: 'pending',
      in_feed: true,
      visibility: 'public',
      map_detail: 'full',
      updated_at: new Date().toISOString(),
    }

    const { data: dream, error } = await supabase
      .from('dreams')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return res.status(500).json({
        error: error.message || 'Failed to create dream',
        details: error.details || null,
        hint: error.hint || null,
        code: error.code || null,
      })
    }

    return res.status(200).json({ dream })
  } catch (error) {
    console.error('submit-dream unexpected error:', error)
    return res.status(500).json({
      error: error?.message || 'Unexpected server error',
    })
  }
}