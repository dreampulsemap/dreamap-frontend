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
    req.on('data', (chunk) => {
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

    const saleId = payload.sale_id || `test-${Date.now()}`
    const email = normalizeEmail(payload.email)
    const productId = payload.product_id || null
    const productName = payload.product_name || null
    const permalink = payload.product_permalink || null
    const refunded = payload.refunded === 'true' || payload.refunded === '1'
    const isTest =
      payload.test === 'true' ||
      payload.test === '1' ||
      payload.test === true

    console.log(
      JSON.stringify(
        {
          tag: 'gumroad_webhook_received',
          saleId,
          email,
          productId,
          productName,
          permalink,
          refunded,
          isTest,
          payload,
        },
        null,
        2
      )
    )

    const { data: existingSale, error: existingSaleError } = await supabase
      .from('gumroad_sales')
      .select('id, sale_id, credits_added, status')
      .eq('sale_id', saleId)
      .maybeSingle()

if (existingSaleError) {
  console.error('gumroad existing sale lookup failed', existingSaleError)
  return res.status(500).json({
    error: 'existing_sale_lookup_failed',
    details: existingSaleError.message,
    code: existingSaleError.code || null,
    hint: existingSaleError.hint || null,
  })
}

    if (existingSale) {
      return res.status(200).json({
        ok: true,
        duplicate: true,
        saleId,
        status: existingSale.status,
      })
    }

    let userProfileId = null
    let creditsAdded = 0
    let status = 'received'

    if (email && !refunded) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, premium_analysis_credits')
        .ilike('email', email)
        .maybeSingle()

      if (profileError) {
        console.error('gumroad profile lookup failed', profileError)
        return res.status(500).json({ error: 'profile_lookup_failed' })
      }

      if (profile) {
        userProfileId = profile.id

        if (!isTest) {
          const nextCredits = Number(profile.premium_analysis_credits || 0) + 1

          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ premium_analysis_credits: nextCredits })
            .eq('id', profile.id)

          if (updateError) {
            console.error('gumroad credit update failed', updateError)
            return res.status(500).json({ error: 'credit_update_failed' })
          }

          creditsAdded = 1
          status = 'credited'
        } else {
          status = 'test_matched_user'
        }
      } else {
        status = isTest ? 'test_no_user_match' : 'pending_user_match'
      }
    }

    const { error: insertSaleError } = await supabase
      .from('gumroad_sales')
      .insert({
        sale_id: saleId,
        email: email || null,
        product_id: productId,
        product_name: productName,
        product_permalink: permalink,
        raw_payload: payload,
        user_profile_id: userProfileId,
        credits_added: creditsAdded,
        status,
      })

    if (insertSaleError) {
      console.error('gumroad sale insert failed', insertSaleError)
      return res.status(500).json({ error: 'sale_insert_failed' })
    }

    return res.status(200).json({
      ok: true,
      saleId,
      email,
      productId,
      status,
      creditsAdded,
      isTest,
    })
  } catch (error) {
    console.error('gumroad webhook fatal', error)
    return res.status(500).json({ error: 'internal_server_error' })
  }
}
