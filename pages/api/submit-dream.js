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

function normalizeText(value, maxLen = 4000) {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLen)
}

function getBaseUrl(req) {
  const forwardedProto = req.headers['x-forwarded-proto']
  const forwardedHost = req.headers['x-forwarded-host']
  const host = forwardedHost || req.headers.host

  const proto =
    typeof forwardedProto === 'string' && forwardedProto.length
      ? forwardedProto
      : process.env.NODE_ENV === 'development'
      ? 'http'
      : 'https'

  if (!host) {
    throw new Error('Host header not found')
  }

  return `${proto}://${host}`
}

async function updateDreamStatus(id, patch) {
  const { data, error } = await supabase
    .from('dreams')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
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

    const cleanContent = normalizeText(content, 12000)

    if (!cleanContent) {
      return res.status(400).json({ error: 'content is required' })
    }

    const insertPayload = {
      user_id: normalizeText(user_id, 100) || null,
      content: cleanContent,
      original_language: normalizeText(original_language, 10) || 'tr',
      location_name: normalizeText(location_name, 200),
      dream_date: dream_date || null,
      user_selected_sentiment: normalizeText(user_selected_sentiment, 40),
      ai_title: normalizeText(title, 200),
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
      console.error('submit-dream insert error:', insertError)
      return res.status(500).json({
        error: insertError.message || 'Failed to create dream',
        details: insertError.details || null,
        hint: insertError.hint || null,
        code: insertError.code || null,
      })
    }

    let analyzedDream = insertedDream

    try {
      const baseUrl = getBaseUrl(req)
      const analyzeResponse = await fetchWithTimeout(
        `${baseUrl}/api/analyze-dream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            dreamId: insertedDream.id,
          }),
        },
        25000
      )

      const analyzeText = await analyzeResponse.text()
      let analyzeData = null

      try {
        analyzeData = analyzeText ? JSON.parse(analyzeText) : null
      } catch {
        throw new Error(analyzeText || 'Analyze route returned invalid JSON')
      }

      if (!analyzeResponse.ok) {
        throw new Error(analyzeData?.error || 'Analyze route failed')
      }

      analyzedDream =
        analyzeData?.dream ||
        analyzeData?.data ||
        analyzeData?.result ||
        insertedDream
    } catch (analyzeError) {
      const isAbort = analyzeError?.name === 'AbortError'
      console.error('submit-dream analyze error:', analyzeError)

      try {
        analyzedDream = await updateDreamStatus(insertedDream.id, {
          analysis_status: 'failed',
          analysis_error: isAbort
            ? 'analysis_timed_out'
            : analyzeError?.message || 'Analyze step failed',
        })
      } catch (updateError) {
        console.error('submit-dream status update error:', updateError)
        analyzedDream = {
          ...insertedDream,
          analysis_status: 'failed',
          analysis_error: isAbort
            ? 'analysis_timed_out'
            : analyzeError?.message || 'Analyze step failed',
        }
      }
    }

    return res.status(200).json({ dream: analyzedDream })
  } catch (error) {
    console.error('submit-dream unexpected error:', error)
    return res.status(500).json({
      error: error?.message || 'Unexpected server error',
    })
  }
        }
