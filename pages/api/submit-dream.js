import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase Environment Variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Hard Limit (Maliyet Güvenliği İçin Karakter Sınırı)
const MAX_CHARACTERS = 12000; 

function normalizeText(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  return trimmed || null
}

function getBaseUrl(req) {
  const forwardedProto = req.headers['x-forwarded-proto']
  const forwardedHost = req.headers['x-forwarded-host']
  const host = forwardedHost || req.headers.host
  const proto = typeof forwardedProto === 'string' && forwardedProto.length ? forwardedProto : process.env.NODE_ENV === 'development' ? 'http' : 'https'
  return `${proto}://${host}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  try {
    const {
      content,
      title,
      dream_date,
      location_name,
      original_language,
      user_selected_sentiment,
      user_id,
      visibility,
      map_detail,
      in_feed,
      latitude,
      longitude,
    } = req.body || {}

    // 1. BACKEND MALİYET KORUMASI (Spam Engelleme)
    if (content && content.length > MAX_CHARACTERS) {
      return res.status(413).json({ 
        error: 'payload_too_large', 
        message: `Dream text exceeds the maximum allowed length of ${MAX_CHARACTERS} characters.` 
      });
    }

    const cleanContent = normalizeText(content);

    if (!cleanContent) {
      return res.status(400).json({ error: 'content is required' })
    }

    const insertPayload = {
      user_id: normalizeText(user_id) || null,
      content: cleanContent,
      original_language: normalizeText(original_language) || 'en',
      location_name: normalizeText(location_name),
      dream_date: dream_date || null,
      user_selected_sentiment: normalizeText(user_selected_sentiment), // Artık virgülle ayrılmış çoklu duygu tutar
      ai_title: normalizeText(title),
      visibility: ['public', 'friends', 'private'].includes(visibility) ? visibility : 'public',
      map_detail: ['full', 'summary'].includes(map_detail) ? map_detail : 'full',
      in_feed: typeof in_feed === 'boolean' ? in_feed : true,
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      analysis_status: 'processing',
      updated_at: new Date().toISOString(),
    }

    const { data: insertedDream, error: insertError } = await supabase
      .from('dreams')
      .insert(insertPayload)
      .select('*')
      .single()

    if (insertError) {
      return res.status(500).json({ error: insertError.message || 'Failed to create dream' })
    }

    let analyzedDream = insertedDream

    try {
      const baseUrl = getBaseUrl(req)
      const analyzeResponse = await fetch(`${baseUrl}/api/analyze-dream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamId: insertedDream.id }),
      })

      if (analyzeResponse.ok) {
        const analyzeData = await analyzeResponse.json();
        analyzedDream = analyzeData?.dream || insertedDream;
      }
    } catch (analyzeError) {
      console.error('submit-dream teaser analysis error:', analyzeError)
    }

    return res.status(200).json({ dream: analyzedDream })
  } catch (error) {
    console.error('submit-dream unexpected error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}