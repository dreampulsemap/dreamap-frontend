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

    // DİNAMİK AURA HESAPLAMA (X Dolar Ödeme = X Aura)
    // Gumroad ödeme miktarını cent bazında gönderir (Örn: $9 = 900 cent, $15 = 1500 cent)
    const amountInCents = payload.amount 
      ? Number(payload.amount) 
      : (Number(payload.price || 0) * Number(payload.quantity || 1))
    
    let calculatedAuras = Math.floor(amountInCents / 100)

    // Eğer test pinglemesi ise ve ücret 0 ise, testlerinizin aksamaması için varsayılan 10 Aura ekleyelim
    if (isTest && calculatedAuras === 0) {
      calculatedAuras = 10
    }

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
          amountInCents,
          calculatedAuras,
          payload,
        },
        null,
        2
      )
    )

    const { data: existingSale, error: existingSaleError } = await supabase
      .from('gumroad_webhook_events')
      .select('sale_id, auras_added, status')
      .eq('sale_id', saleId)
      .maybeSingle()

    if (existingSaleError) {
      console.error('gumroad existing sale lookup failed', existingSaleError)
      return res.status(500).json({
        error: 'existing_sale_lookup_failed',
        details: existingSaleError.message,
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
          auras_added: 0,
          status: 'ignored_product_not_matched',
        })

      if (ignoredInsertError) {
        console.error('gumroad ignored sale insert failed', ignoredInsertError)
        return res.status(500).json({
          error: 'ignored_sale_insert_failed',
          details: ignoredInsertError.message,
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
    let aurasAdded = 0
    let status = 'received'

    if (email && !refunded) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, premium_analysis_auras')
        .ilike('email', email)
        .maybeSingle()

      if (profileError) {
        console.error('gumroad profile lookup failed', profileError)
        return res.status(500).json({
          error: 'profile_lookup_failed',
          details: profileError.message,
        })
      }

      if (profile) {
        userProfileId = profile.id

        const nextAuras =
          Number(profile.premium_analysis_auras || 0) + calculatedAuras

        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ premium_analysis_auras: nextAuras })
          .eq('id', profile.id)

        if (updateError) {
          console.error('gumroad aura bakiye update failed', updateError)
          return res.status(500).json({
            error: 'aura_update_failed',
            details: updateError.message,
          })
        }

        aurasAdded = calculatedAuras
        status = isTest ? 'test_aura_added' : 'aura_added'
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
        auras_added: aurasAdded,
        status,
      })

    if (insertSaleError) {
      console.error('gumroad sale insert failed', insertSaleError)
      return res.status(500).json({
        error: 'sale_insert_failed',
        details: insertSaleError.message,
      })
    }

    return res.status(200).json({
      ok: true,
      saleId,
      email,
      productId,
      status,
      aurasAdded,
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