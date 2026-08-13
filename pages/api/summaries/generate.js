import OpenAI from 'openai';
import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// daily-compass.js / daily-seeds/generate.js ile aynı desen: ham dil kodu
// yerine gerçek dil adı kullanılıyor, model buna çok daha iyi uyuyor.
const LANG_NAME = {
  en: 'English', tr: 'Turkish', es: 'Spanish', fr: 'French',
  de: 'German', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
  ar: 'Arabic', hi: 'Hindi', zh: 'Chinese',
};

const WINDOW_DAYS = { weekly: 7, monthly: 30 };
const RATE_LIMIT_HOURS = 20; // daily-compass'taki günlük limitle aynı ruh

const toDateOnly = (d) => d.toISOString().split('T')[0];

// Android'deki SummaryData.kt: periodStart/periodEnd/dreamCount/
// dominantArchetypes/dominantSentiment/createdAt alanlarının snake_case
// karşılığı YOK — yalnızca camelCase okunuyor (periodType ve summaryText'in
// aksine). Bu yüzden ham DB satırını döndürmek yerine yanıtı elle
// camelCase'e eşliyoruz, yoksa Android tarafında bu alanlar null gelir.
function toSummaryData(row) {
  return {
    id: row.id,
    periodType: row.period_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    summaryText: row.summary_text,
    dreamCount: row.dream_count,
    dominantArchetypes: row.dominant_archetypes || [],
    dominantSentiment: row.dominant_sentiment,
    createdAt: row.created_at,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { periodType } = req.body || {};
    if (!WINDOW_DAYS[periodType]) {
      return res.status(400).json({ error: 'invalid_period_type' });
    }

    // Hız sınırı: bu periyot türü için son RATE_LIMIT_HOURS içinde zaten bir
    // özet üretildiyse, tekrar AI çağrısı yapmadan onu döndür (maliyet
    // koruması — Generate butonuna art arda basmak her seferinde OpenAI'ye
    // gitmesin).
    const { data: recent } = await supabaseAdmin
      .from('user_period_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_type', periodType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      const ageHours = (Date.now() - new Date(recent.created_at).getTime()) / 36e5;
      if (ageHours < RATE_LIMIT_HOURS) {
        return res.status(200).json({ ok: true, summary: toSummaryData(recent) });
      }
    }

    // Takvim haftası/ayı DEĞİL, "bugünden geriye N gün" kayan pencere —
    // daily-seeds/daily-compass'ın basit gün-tabanlı mantığıyla tutarlı,
    // kısmi hafta/ay kenar durumlarından kaçınıyor.
    const days = WINDOW_DAYS[periodType];
    const periodEndDate = new Date();
    const periodStartDate = new Date(periodEndDate.getTime() - (days - 1) * 86400000);
    const periodStart = toDateOnly(periodStartDate);
    const periodEnd = toDateOnly(periodEndDate);

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('language')
      .eq('id', user.id)
      .maybeSingle();
    const lang = (profile?.language || 'en').toLowerCase();
    const langName = LANG_NAME[lang] || LANG_NAME.en;

    // Soft-delete edilmiş (in_feed=false) rüyalar bilerek dahil — bu
    // kişisel bir özet, akıştan kaldırılmış olması kullanıcının kendi
    // yansımasından çıkarılması gerektiği anlamına gelmiyor.
    const { data: dreams, error: dreamsError } = await supabaseAdmin
      .from('dreams')
      .select('content, ai_archetypes, ai_sentiment, created_at')
      .eq('user_id', user.id)
      .gte('created_at', `${periodStart}T00:00:00.000Z`)
      .lte('created_at', `${periodEnd}T23:59:59.999Z`)
      .order('created_at', { ascending: false })
      .limit(30);

    if (dreamsError) throw dreamsError;

    const dreamCount = dreams?.length || 0;

    if (dreamCount === 0) {
      const emptyText = lang === 'tr'
        ? 'Bu dönemde henüz bir rüya kaydetmemişsin. İlk adımı atmak için bu gece bir niyet belirle.'
        : "You haven't logged any dreams in this period yet. Set an intention tonight to take the first step.";

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('user_period_summaries')
        .upsert({
          user_id: user.id,
          period_type: periodType,
          period_start: periodStart,
          period_end: periodEnd,
          summary_text: emptyText,
          dream_count: 0,
          dominant_archetypes: [],
          dominant_sentiment: null,
        }, { onConflict: 'user_id,period_type,period_start' })
        .select('*')
        .single();

      if (insertError) throw insertError;
      return res.status(200).json({ ok: true, summary: toSummaryData(inserted) });
    }

    const dreamLines = dreams.map((d, i) => {
      const truncated = (d.content || '').slice(0, 400);
      const meta = [d.ai_sentiment, ...(Array.isArray(d.ai_archetypes) ? d.ai_archetypes : [])]
        .filter(Boolean).join(', ');
      return `${i + 1}. (${meta || 'no metadata'}) ${truncated}`;
    }).join('\n');

    const prompt = `You are a warm, insightful dream journal analyst inside a Reality Transurfing-inspired app. Below are ${dreamCount} dream journal entries from the user's past ${days} days, each prefixed with any known sentiment/archetype tags.

${dreamLines}

Write a native ${langName} reflection (not a translation, write as a native speaker would) that notices recurring themes or emotional patterns and offers one gentle, encouraging insight connected to Reality Transurfing ideas (like intention or "the pendulum"). Stay warm and non-clinical. 3-5 sentences.

Return ONLY JSON: {"summaryText": "...", "dominantArchetypes": ["...", "..."] (max 3, drawn from the tags above or inferred), "dominantSentiment": "..."}`;

    let aiResult;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    aiResult = JSON.parse(completion.choices[0].message.content.replace(/```json|```/g, '').trim());

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('user_period_summaries')
      .upsert({
        user_id: user.id,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        summary_text: aiResult.summaryText || '',
        dream_count: dreamCount,
        dominant_archetypes: Array.isArray(aiResult.dominantArchetypes) ? aiResult.dominantArchetypes.slice(0, 5) : [],
        dominant_sentiment: aiResult.dominantSentiment || null,
      }, { onConflict: 'user_id,period_type,period_start' })
      .select('*')
      .single();

    if (insertError) throw insertError;

    return res.status(200).json({ ok: true, summary: toSummaryData(inserted) });
  } catch (error) {
    console.error('summaries/generate error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'internal_error' });
  }
}
