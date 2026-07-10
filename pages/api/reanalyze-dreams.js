import { createClient } from '@supabase/supabase-js'

const DEFAULT_BATCH_SIZE = 10
const MAX_BATCH_SIZE = 25

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ADMIN_TOKEN = process.env.ADMIN_REANALYZE_TOKEN
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`

  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!ADMIN_TOKEN || bearerToken !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({
      error: 'Supabase env eksik',
      debug: {
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_KEY,
      },
    })
  }

  if (!APP_URL) {
    return res.status(500).json({
      error: 'APP_URL eksik. NEXT_PUBLIC_APP_URL veya VERCEL_URL tanımla.',
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const requestedLimit = Number(req.body?.limit || DEFAULT_BATCH_SIZE)
  const limit = Math.min(
    MAX_BATCH_SIZE,
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? requestedLimit
      : DEFAULT_BATCH_SIZE
  )

  try {
    const { data: dreams, error } = await supabase
      .from('dreams')
      .select('id, content, original_language, analysis_status, created_at')
      .eq('analysis_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Pending dreams alınamadı: ${error.message}`)
    }

    if (!dreams || dreams.length === 0) {
      return res.status(200).json({
        success: true,
        processed: 0,
        message: 'Reanalyze bekleyen rüya yok.',
        results: [],
      })
    }

    const results = []

    for (const dream of dreams) {
      try {
        const response = await fetch(`${APP_URL}/api/analyze-dream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dreamId: dream.id,
            content: dream.content,
            language: dream.original_language || 'en',
          }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          results.push({
            dreamId: dream.id,
            success: false,
            error: data?.error || `HTTP ${response.status}`,
          })
          continue
        }

        results.push({
          dreamId: dream.id,
          success: true,
          sentiment: data?.analysis?.sentiment || null,
          archetypes: data?.analysis?.archetypes || [],
        })
      } catch (err) {
        results.push({
          dreamId: dream.id,
          success: false,
          error: err.message,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    return res.status(200).json({
      success: true,
      processed: results.length,
      successCount,
      failCount,
      results,
    })
  } catch (error) {
    console.error('Reanalyze batch error:', error)

    return res.status(500).json({
      error: `Batch analiz hatası: ${error.message}`,
    })
  }
}