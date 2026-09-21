import { getAuthedUser, supabaseAdmin } from '@/lib/supabaseAdmin'
import { isPremiumMember, getAuraBalance } from '@/lib/premiumMembership'
import {
  buildPersonalContext,
  buildCollectiveContext,
  generateFreeProphecy,
  generatePremiumProphecy
} from '@/lib/prophetEngine'

// =====================================================================
// KAHIN
//
// ONCEKI HALI NE YAPIYORDU: Android `question` gonderiyordu ama route
// sadece `lang` okuyordu (`const { lang: rawLang = 'tr' } = req.body`).
// Uretilen sey aslinda "gunluk kolektif kehanet"ti: son 7 gunde TUM
// kullanicilarin ruyalarindan baskin arketip cikarilip gunde bir metin
// uretiliyor ve daily_prophecy'de tarihe gore onbellege aliniyordu. Yani
// kullanici ne yazarsa yazsin o gun herkese verilen ayni metni aliyordu,
// ustelik ayni gun tekrar sorunca birebir aynisini.
//
// SIMDI: istek kimlik dogrulamali ve KISISEL.
//   mode=general -> kullanicinin KENDI ruya + vizyonlarindan kehanet
//   mode=ask     -> kullanicinin yazdigi soruya, yine kendi materyali
//                   uzerinden cevap
// Onbellek yok; her istek taze uretiliyor.
//
// Ucretsiz kullanici mod basina gunde FREE_DAILY_LIMIT istek yapabilir
// (sunucu tarafinda sayilir, bkz. 011_prophet_daily_quota.sql). Premium
// uye sinirsiz ve Claude Opus 5 ile daha uzun/gerekceli cevap alir.
//
// GERIYE DONUK UYUMLULUK: token gondermeyen eski istemciler 401 yerine
// eski davranisi (gunluk kolektif, onbellekli metin) almaya devam eder.
// =====================================================================

export const config = { maxDuration: 60 }

const FREE_DAILY_LIMIT = 3
// "Daha derin bir yorum ister misin?" — premium uyeye bedava, degilse bu
// kadar Aura. mental-wall/generate.js ile ayni fiyat ve ayni desen.
const DEEP_AURA_COST = 10
const MAX_QUESTION_LENGTH = 500
const RECENT_DREAMS = 12
const RECENT_GOALS = 8

const SUPPORTED_LANGS = ['en', 'tr', 'ru', 'ar', 'es', 'hi', 'zh', 'de', 'fr', 'pt', 'ja']

function normalizeLang(raw) {
  const lang = String(raw || 'tr').toLowerCase().split('-')[0]
  return SUPPORTED_LANGS.includes(lang) ? lang : 'en'
}

// AI cagrisi patlarsa dusulen hakki geri ver — kullanici hicbir sey
// almadigi bir istek icin kota kaybetmesin.
async function refundProphetQuota(userId, mode) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: row } = await supabaseAdmin
      .from('prophet_usage')
      .select('used_count')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .eq('mode', mode)
      .maybeSingle()

    if (row && row.used_count > 0) {
      await supabaseAdmin
        .from('prophet_usage')
        .update({ used_count: row.used_count - 1 })
        .eq('user_id', userId)
        .eq('usage_date', today)
        .eq('mode', mode)
    }
  } catch (err) {
    // Iade basarisiz olursa istegi patlatma; kullanici zaten hata aliyor.
    console.error('prophet quota refund failed:', err)
  }
}

// Token'siz eski istemciler icin: eski kolektif davranis, gune gore
// onbellekli. Yeni AI maliyeti dogurmaz (gunde en fazla bir uretim).
async function legacyCollectiveProphecy(lang, res) {
  const col = `content_${lang}`
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabaseAdmin
    .from('daily_prophecy')
    .select('*')
    .eq('prophecy_date', today)
    .maybeSingle()

  if (existing && existing[col]) {
    return res.status(200).json({ ok: true, success: true, prophecy: existing[col], mode: 'general' })
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // GIZLILIK: burada ruya ICERIGI cekilmiyor. Bu metin herkese ayni sekilde
  // gosteriliyor; tek bir kullanicinin ozel ruya metni baskalarinin ekranina
  // dusmesin diye yalnizca arketip/duygu etiketleri okunuyor.
  const { data: recentDreams } = await supabaseAdmin
    .from('dreams')
    .select('ai_archetypes, ai_sentiment')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(30)

  if (!recentDreams || recentDreams.length === 0) {
    return res.status(400).json({ error: 'not_enough_dreams' })
  }

  const context = buildCollectiveContext(recentDreams)
  const prophecy = await generateFreeProphecy({ mode: 'general', question: null, lang, context })

  if (existing) {
    await supabaseAdmin.from('daily_prophecy').update({ [col]: prophecy }).eq('id', existing.id)
  } else {
    // prophecy_date UNIQUE: es zamanli bir istek satiri az once olusturmus
    // olabilir, o yuzden catismayi yut ve yine de metni don.
    await supabaseAdmin
      .from('daily_prophecy')
      .insert({ prophecy_date: today, [col]: prophecy, dream_count: recentDreams.length })
  }

  return res.status(200).json({ ok: true, success: true, prophecy, mode: 'general' })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const { mode: rawMode, question: rawQuestion, lang: rawLang, deep: rawDeep } = req.body || {}
  const wantsDeep = rawDeep === true || rawDeep === 'true'
  const lang = normalizeLang(rawLang)

  // Eski istemciler `mode` gondermiyor — varsayilan 'general'.
  const mode = rawMode === 'ask' ? 'ask' : 'general'

  try {
    const user = await getAuthedUser(req)
    if (!user) {
      return await legacyCollectiveProphecy(lang, res)
    }

    const question = String(rawQuestion || '').trim().slice(0, MAX_QUESTION_LENGTH)
    if (mode === 'ask' && !question) {
      return res.status(400).json({ error: 'question_required' })
    }

    const premium = await isPremiumMember(user.id)

    // Derin yorum istendiyse ve kullanici premium degilse: kota yerine
    // Aura dusuyoruz. Yetersizse istegi hic uretmeden 402 donuyoruz ki
    // kullanici karsiliksiz hak/para kaybetmesin.
    let aurasSpent = 0
    if (wantsDeep && !premium) {
      const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
        p_user_id: user.id,
        p_amount: DEEP_AURA_COST
      })
      if (spendError) throw spendError
      const spend = spendResult?.[0]
      if (!spend?.success) {
        return res.status(402).json({
          ok: false,
          error: 'insufficient_auras',
          cost: DEEP_AURA_COST,
          auras: await getAuraBalance(user.id)
        })
      }
      aurasSpent = DEEP_AURA_COST
    }

    // Kotayi AI cagrisindan ONCE ve atomik olarak dus (paralel istekler
    // limiti asamasin). Premium uyede ve Aura ile alinan derin yorumda
    // kota islemiyor.
    let remaining = null
    if (!premium && !aurasSpent) {
      const { data: quota, error: quotaError } = await supabaseAdmin.rpc('consume_prophet_quota', {
        p_user_id: user.id,
        p_mode: mode,
        p_limit: FREE_DAILY_LIMIT
      })
      if (quotaError) throw quotaError

      const row = quota?.[0]
      remaining = row?.remaining ?? 0

      if (!row?.allowed) {
        return res.status(200).json({
          ok: true,
          success: false,
          mode,
          isPremium: false,
          detailed: false,
          limitReached: true,
          remaining: 0,
          dailyLimit: FREE_DAILY_LIMIT,
          error: 'free_limit_reached'
        })
      }
    }

    // Kullanicinin KENDI materyali.
    const [{ data: dreams }, { data: goals }] = await Promise.all([
      supabaseAdmin
        .from('dreams')
        .select('content, ai_archetypes, ai_sentiment')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(RECENT_DREAMS),
      supabaseAdmin
        .from('goals')
        .select('title, description, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(RECENT_GOALS)
    ])

    const context = buildPersonalContext({ dreams: dreams || [], goals: goals || [] })

    if (context.dreamCount === 0 && context.goalCount === 0) {
      if (aurasSpent) await supabaseAdmin.rpc('add_auras', { p_user_id: user.id, p_amount: aurasSpent })
      else if (!premium) await refundProphetQuota(user.id, mode)
      return res.status(200).json({
        ok: true,
        success: false,
        mode,
        isPremium: premium,
        detailed: false,
        needsContent: true,
        error: 'no_personal_content'
      })
    }

    let prophecy
    let detailed = false

    if (premium || aurasSpent) {
      try {
        prophecy = await generatePremiumProphecy({ mode, question, lang, context })
        detailed = true
      } catch (err) {
        console.error('premium prophecy failed:', err)
        if (aurasSpent) {
          // Aura ile ODENMIS derin yorum uretilemedi: ucretsiz metne
          // dusurup parayi yemek yerine iade et ve hatayi don.
          await supabaseAdmin.rpc('add_auras', { p_user_id: user.id, p_amount: aurasSpent })
          throw err
        }
        // Abonelikli uyeyi bos ekranla birakma: ucretsiz uretece dus.
        prophecy = await generateFreeProphecy({ mode, question, lang, context })
      }
    } else {
      try {
        prophecy = await generateFreeProphecy({ mode, question, lang, context })
      } catch (err) {
        await refundProphetQuota(user.id, mode)
        throw err
      }
    }

    return res.status(200).json({
      ok: true,
      success: true,
      mode,
      prophecy,
      isPremium: premium,
      detailed,
      limitReached: false,
      remaining,
      dailyLimit: premium ? null : FREE_DAILY_LIMIT,
      deepCost: DEEP_AURA_COST,
      aurasLeft: premium ? null : await getAuraBalance(user.id)
    })
  } catch (error) {
    console.error('Prophet error:', error)
    return res.status(500).json({ ok: false, error: error.message || 'internal_error' })
  }
}
