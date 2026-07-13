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

const CREDIT_AMOUNT = 10
const ALLOWED_PRODUCT_ID = process.env.GUMROAD_SINGLE_PRODUCT_ID

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
      .from('gumroad_webhook_events')
      .select('sale_id, credits_added, status')
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

    if (ALLOWED_PRODUCT_ID && productId !== ALLOWED_PRODUCT_ID) {
      const { error: ignoredInsertError } = await supabase
        .from('gumroad_webhook_events')
        .insert({
          sale_id: saleId,
          email: email || null,
          product_id: productId,
          product_name: productName,
          product_permalink: permalink,
          raw_payload: payload,
          user_profile_id: null,
          credits_added: 0,
          status: 'ignored_product_not_matched',
        })

      if (ignoredInsertError) {
        console.error('gumroad ignored sale insert failed', ignoredInsertError)
        return res.status(500).json({
          error: 'ignored_sale_insert_failed',
          details: ignoredInsertError.message,
          code: ignoredInsertError.code || null,
          hint: ignoredInsertError.hint || null,
        })
      }

      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: 'product_not_matched',
        productId,
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
        return res.status(500).json({
          error: 'profile_lookup_failed',
          details: profileError.message,
          code: profileError.code || null,
          hint: profileError.hint || null,
        })
      }

      if (profile) {
        userProfileId = profile.id

        const nextCredits =
          Number(profile.premium_analysis_credits || 0) + CREDIT_AMOUNT

        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ premium_analysis_credits: nextCredits })
          .eq('id', profile.id)

        if (updateError) {
          console.error('gumroad credit update failed', updateError)
          return res.status(500).json({
            error: 'credit_update_failed',
            details: updateError.message,
            code: updateError.code || null,
            hint: updateError.hint || null,
          })
        }

        creditsAdded = CREDIT_AMOUNT
        status = isTest ? 'test_credited' : 'credited'
      } else {
        status = isTest ? 'test_no_user_match' : 'pending_user_match'
      }
    } else if (refunded) {
      status = isTest ? 'test_refunded_ignored' : 'refunded_ignored'
    }

    const { error: insertSaleError } = await supabase
      .from('gumroad_webhook_events')
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
      return res.status(500).json({
        error: 'sale_insert_failed',
        details: insertSaleError.message,
        code: insertSaleError.code || null,
        hint: insertSaleError.hint || null,
      })
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
    return res.status(500).json({
      error: 'internal_server_error',
      details: error.message || 'Unknown error',
    })
  }
}