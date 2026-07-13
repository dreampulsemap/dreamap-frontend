import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rawBody = await readRawBody(req)
    const params = new URLSearchParams(rawBody)
    const payload = Object.fromEntries(params.entries())

    console.log('GUMROAD_WEBHOOK_RAW:', rawBody)
    console.log('GUMROAD_WEBHOOK_PARSED:', payload)

    const saleId = payload.sale_id || null
    const email = normalizeEmail(payload.email)
    const productId = payload.product_id || null
    const productName = payload.product_name || null
    const permalink = payload.product_permalink || null
    const isTest =
      payload.test === 'true' ||
      payload.test === true ||
      payload.test === '1'

    if (isTest) {
      return res.status(200).json({
        ok: true,
        mode: 'test',
        payload,
      })
    }

    if (!saleId || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        saleId,
        email,
      })
    }

    const { data: existingSale, error: existingSaleError } = await supabase
      .from('gumroad_sales')
      .select('id, sale_id')
      .eq('sale_id', saleId)
      .maybeSingle()

    if (existingSaleError) {
      console.error('existingSaleError:', existingSaleError)
      return res.status(500).json({ error: 'Failed checking existing sale' })
    }

    if (existingSale) {
      return res.status(200).json({
        ok: true,
        duplicate: true,
        saleId,
      })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, premium_analysis_credits')
      .ilike('email', email)
      .maybeSingle()

    if (profileError) {
      console.error('profileError:', profileError)
      return res.status(500).json({ error: 'Failed looking up user profile' })
    }

    let userProfileId = null
    let creditsAdded = 0

    if (profile) {
      userProfileId = profile.id
      const nextCredits = Number(profile.premium_analysis_credits || 0) + 1

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          premium_analysis_credits: nextCredits,
        })
        .eq('id', profile.id)

      if (updateError) {
        console.error('updateError:', updateError)
        return res.status(500).json({ error: 'Failed updating credits' })
      }

      creditsAdded = 1
    }

    const { error: insertSaleError } = await supabase
      .from('gumroad_sales')
      .insert({
        sale_id: saleId,
        email,
        product_id: productId,
        product_name: productName,
        product_permalink: permalink,
        raw_payload: payload,
        user_profile_id: userProfileId,
        credits_added: creditsAdded,
        status: profile ? 'credited' : 'pending_user_match',
      })

    if (insertSaleError) {
      console.error('insertSaleError:', insertSaleError)
      return res.status(500).json({ error: 'Failed saving sale' })
    }

    return res.status(200).json({
      ok: true,
      saleId,
      email,
      matchedUser: !!profile,
      creditsAdded,
      productId,
      permalink,
    })
  } catch (error) {
    console.error('gumroad webhook fatal error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}