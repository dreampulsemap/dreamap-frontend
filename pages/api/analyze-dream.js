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

function normalizeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function makeFallbackAnalysis(dream) {
  const text = normalizeText(dream?.content)
  const shortText = text.slice(0, 220)

  const titleTr = dream?.ai_title || 'Bilinçdışının Eşiğinde'
  const titleEn = dream?.ai_title_en || 'At the Threshold of the Unconscious'

  return {
    title: {
      tr: titleTr,
      en: titleEn,
      es: titleEn,
      fr: titleEn,
      de: titleEn,
      pt: titleEn,
      ru: titleEn,
      ja: titleEn,
    },
    summary: {
      tr:
        `Bu rüya, bilinçdışının bastırılmış duyguları ve iç gerilimleri semboller üzerinden sahneye taşıdığı bir alan gibi görünüyor. ` +
        `Rüyanın temel hareketi, kişinin dış dünyaya sunduğu benlik ile daha derinde saklı ihtiyaçları arasındaki ayrımı görünür kılıyor. ` +
        `Özellikle şu içerik dikkat çekiyor: "${shortText}".`,
      en:
        `This dream appears to stage repressed feelings and inner tensions through symbolic imagery. ` +
        `Its central movement suggests a split between the self presented to the world and deeper unmet inner needs. ` +
        `A notable fragment is: "${shortText}".`,
    },
    motiv: {
      tr: 'Bu rüya senden korkuyu bastırmak yerine onun hangi ihtiyacı örttüğünü anlamanı istiyor olabilir.',
      en: 'This dream may be asking you not to suppress fear, but to understand what need it is covering.',
    },
    shadow_focus: {
      tr: 'Geri plana itilmiş kırılganlık, kontrol ihtiyacı ve duygusal savunmalar öne çıkıyor.',
      en: 'Disowned vulnerability, the need for control, and emotional defenses stand out.',
    },
    core_conflict: {
      tr: 'Kontrol etme arzusu ile içsel teslimiyet ihtiyacı arasında bir gerilim var.',
      en: 'There is tension between the wish to control and the need for inner surrender.',
    },
    individuation_path: {
      tr: 'Rüya, bastırılmış duygulara daha dürüst yaklaşmayı ve sembollerin taşıdığı çağrıyı dinlemeyi öneriyor.',
      en: 'The dream suggests approaching repressed emotions more honestly and listening to what the symbols are asking of you.',
    },
    symbolic_reading: {
      tr: 'Semboller burada yalnızca olay örgüsü değil, psişenin kendi dili gibi çalışıyor. Rüyanın atmosferi, bilinçli tutumun tek başına yetmediğini ve daha derindeki bir duygusal gerçeğin tanınmak istediğini düşündürüyor.',
      en: 'The symbols here function not merely as plot elements but as the language of the psyche itself. The dream atmosphere suggests that the conscious attitude is no longer sufficient and that a deeper emotional truth seeks recognition.',
    },
    persona_profile: {
      name: {
        tr: 'Eşiği Bekleyen Benlik',
        en: 'The Self at the Threshold',
        es: 'The Self at the Threshold',
        fr: 'The Self at the Threshold',
        de: 'The Self at the Threshold',
        pt: 'The Self at the Threshold',
        ru: 'The Self at the Threshold',
        ja: 'The Self at the Threshold',
      },
      tagline: {
        tr: 'Dışarıda güçlü, içeride çözülmeyi bekleyen bir düğüm.',
        en: 'Strong on the outside, inwardly holding an unresolved knot.',
        es: 'Strong on the outside, inwardly holding an unresolved knot.',
        fr: 'Strong on the outside, inwardly holding an unresolved knot.',
        de: 'Strong on the outside, inwardly holding an unresolved knot.',
        pt: 'Strong on the outside, inwardly holding an unresolved knot.',
        ru: 'Strong on the outside, inwardly holding an unresolved knot.',
        ja: 'Strong on the outside, inwardly holding an unresolved knot.',
      },
      archetypal_style: {
        tr: 'Koruyucu ama tetikte bir yapı; geri çekilmeden önce çevreyi okumaya çalışıyor.',
        en: 'A protective yet watchful structure; it tries to read the environment before yielding.',
      },
      public_self: {
        tr: 'Dış dünyada daha kontrollü, işlevsel ve düzen kurucu bir yüz gösteriliyor.',
        en: 'In the outer world, a more controlled, functional, and organizing face is presented.',
      },
      hidden_self: {
        tr: 'İçeride daha kırılgan, görülmek isteyen ama kendini saklayan bir duygusal alan var.',
        en: 'Inside, there is a more vulnerable emotional field that wants to be seen yet remains concealed.',
      },
      strengths: {
        tr: ['Dayanıklılık', 'Sembolik sezgi', 'İç gözlem kapasitesi'],
        en: ['Resilience', 'Symbolic intuition', 'Capacity for introspection'],
      },
      shadow_sides: {
        tr: ['Aşırı kontrol', 'Duygusal geri çekilme', 'Savunmacı sertlik'],
        en: ['Overcontrol', 'Emotional withdrawal', 'Defensive hardness'],
      },
      core_fears: {
        tr: ['Dağılmak', 'Anlaşılmamak', 'Savunmasız kalmak'],
        en: ['Falling apart', 'Being misunderstood', 'Being left unprotected'],
      },
      emotional_needs: {
        tr: ['Güven', 'Duygusal tanınma', 'İçsel istikrar'],
        en: ['Safety', 'Emotional recognition', 'Inner stability'],
      },
      defenses: {
        tr: ['Mesafe koyma', 'Aşırı zihinselleştirme', 'Kontrolü elde tutma'],
        en: ['Distancing', 'Over-intellectualization', 'Holding control tightly'],
      },
    },
    visual_theme: {
      overall_mood: 'dark introspective',
      aura: 'velvet shadow, moonlit depth, restrained tension',
      primary_color: '#312E81',
      secondary_color: '#111827',
      accent_color: '#C084FC',
      background_color: '#050816',
      text_color: '#F9FAFB',
      gradient_suggestion: 'indigo shadow into midnight blue',
      texture_hint: 'soft grain with low-contrast cosmic haze',
      highlight_style: 'subtle amethyst glow',
      card_style: 'glass-dark with cinematic depth',
    },
    section_themes: {
      persona: {
        aura: 'reflective, poised, enigmatic',
        primary_color: '#1F3A5F',
        secondary_color: '#111827',
        accent_color: '#93C5FD',
        gradient_suggestion: 'deep steel blue into night',
      },
      shadow: {
        aura: 'dense, buried, magnetic',
        primary_color: '#3B0764',
        secondary_color: '#111827',
        accent_color: '#C084FC',
        gradient_suggestion: 'violet shadow into abyssal navy',
      },
      transformation: {
        aura: 'emergence, breath, integration',
        primary_color: '#0F766E',
        secondary_color: '#164E63',
        accent_color: '#99F6E4',
        gradient_suggestion: 'teal rebirth into blue light',
      },
    },
    archetypes: ['Seeker', 'Shadow Bearer'],
    sentiment: dream?.user_selected_sentiment || 'Confusion',
    symbols: [
      {
        symbol: 'Eşik',
        meaning_tr: 'Psikolojik geçiş alanı; eski tutumdan yenisine geçiş.',
        meaning_en: 'A psychological threshold; movement from an old attitude to a new one.',
        emotional_charge: 'Tension, uncertainty, transformation',
        intensity: 82,
        color: '#C084FC',
      },
      {
        symbol: 'Gölge',
        meaning_tr: 'Bastırılmış içeriklerin görünür olma çabası.',
        meaning_en: 'The effort of repressed contents to become visible.',
        emotional_charge: 'Fear, gravity, exposure',
        intensity: 76,
        color: '#7C3AED',
      },
      {
        symbol: 'Yol',
        meaning_tr: 'Bireyleşme yönünde ilerleme ve içsel hareket.',
        meaning_en: 'Movement and progress in the direction of individuation.',
        emotional_charge: 'Search, uncertainty, becoming',
        intensity: 68,
        color: '#22D3EE',
      },
    ],
    emotions: [
      { emotion: dream?.user_selected_sentiment || 'Confusion', score: 76 },
      { emotion: 'Fear', score: 48 },
      { emotion: 'Awe', score: 41 },
    ],
    reflection_questions: {
      tr: [
        'Bu rüyada en çok hangi sembol seni rahatsız etti ya da çekti?',
        'Dışarıda gösterdiğin benlik ile içeride yaşadığın duygu arasında nasıl bir fark var?',
        'Kontrolü bıraksan hangi duygu görünür hale gelir?',
      ],
      en: [
        'Which symbol in this dream disturbed or attracted you most?',
        'What is the difference between the self you show outside and the feeling you carry inside?',
        'If you loosened control, which emotion would become visible?',
      ],
    },
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const dreamId = req.body?.dreamId

    if (!dreamId) {
      return res.status(400).json({ error: 'dreamId is required' })
    }

    const { data: dream, error: fetchError } = await supabase
      .from('dreams')
      .select('*')
      .eq('id', dreamId)
      .single()

    if (fetchError || !dream) {
      return res.status(404).json({ error: 'Dream not found' })
    }

    const analysis = makeFallbackAnalysis(dream)

    const updatePayload = {
      ai_title: analysis.title.tr || analysis.title.en,
      ai_title_en: analysis.title.en,
      ai_title_tr: analysis.title.tr,
      ai_summary: analysis.summary.tr || analysis.summary.en,
      ai_summary_en: analysis.summary.en,
      ai_summary_tr: analysis.summary.tr,
      ai_motiv: analysis.motiv.tr || analysis.motiv.en,
      ai_motiv_en: analysis.motiv.en,
      ai_motiv_tr: analysis.motiv.tr,
      ai_archetypes: analysis.archetypes,
      ai_symbols: analysis.symbols,
      ai_emotions: analysis.emotions,
      ai_jungian_analysis: analysis,
      ai_sentiment: analysis.sentiment,
      analysis_model: 'fallback-local',
      analysis_version: 'fallback-v1',
      analysis_status: 'completed',
      analysis_error: null,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: updatedDream, error: updateError } = await supabase
      .from('dreams')
      .update(updatePayload)
      .eq('id', dreamId)
      .select('*')
      .single()

    if (updateError) {
      return res.status(500).json({ error: updateError.message || 'Failed to update dream' })
    }

    return res.status(200).json({ dream: updatedDream })
  } catch (error) {
    console.error('analyze-dream error:', error)
    return res.status(500).json({
      error: error?.message || 'Unexpected server error',
    })
  }
}