import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin';

// summaries/generate.js ile aynı eşleme — SummaryData.kt çoğu alanı
// yalnızca camelCase okuyor, bkz. o dosyadaki not.
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
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { periodType } = req.query;
    if (periodType !== 'weekly' && periodType !== 'monthly') {
      return res.status(400).json({ error: 'invalid_period_type' });
    }

    const { data: row, error } = await supabaseAdmin
      .from('user_period_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_type', periodType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    // summary: null → Android'de SummaryData nullable, "henüz özet yok"
    // durumunu zaten karşılıyor, ayrı bir hata değil.
    return res.status(200).json({ ok: true, summary: row ? toSummaryData(row) : null });
  } catch (error) {
    console.error('summaries/latest error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'internal_error' });
  }
}
