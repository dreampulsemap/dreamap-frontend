import React, { useMemo } from 'react'
import { getTranslation } from '../lib/translations'
import { useTranslation } from 'react-i18next'

function normalizeLang(lang) {
  if (!lang) return 'en'
  const short = String(lang).toLowerCase().split('-')[0]
  return short
}

export default function DreamAnalysisView({ dream, lang }) {
  const { i18n } = useTranslation()
  const currentLang = normalizeLang(lang || i18n.language || 'en')

  const analysis =
    dream?.premium_deep_analysis || dream?.ai_jungian_analysis || {}

  const summary =
    analysis?.summary?.[currentLang] ||
    analysis?.summary?.en ||
    ''
  const motiv =
    analysis?.motiv?.[currentLang] ||
    analysis?.motiv?.en ||
    ''
  const shadowFocus =
    analysis?.shadow_focus?.[currentLang] ||
    analysis?.shadow_focus?.en ||
    ''
  const coreConflict =
    analysis?.core_conflict?.[currentLang] ||
    analysis?.core_conflict?.en ||
    ''
  const individuationPath =
    analysis?.individuation_path?.[currentLang] ||
    analysis?.individuation_path?.en ||
    ''
  const symbolicReading =
    analysis?.symbolic_reading?.[currentLang] ||
    analysis?.symbolic_reading?.en ||
    ''

  const personaProfile = analysis?.persona_profile || {}
  const symbols = Array.isArray(analysis?.symbols) ? analysis.symbols : []
  const emotions = Array.isArray(analysis?.emotions) ? analysis.emotions : []

  const reflectionQuestions =
    analysis?.reflection_questions?.[currentLang] ||
    analysis?.reflection_questions?.en ||
    []

  const visualTheme = analysis?.visual_theme || {}
  const sectionThemes = analysis?.section_themes || {}

  const title =
    dream?.[`ai_title_${currentLang}`] ||
    dream?.ai_title ||
    analysis?.title?.[currentLang] ||
    analysis?.title?.en ||
    getTranslation('feed.jungianAnalysis', currentLang)

  const isPremium = Boolean(dream?.premium_deep_analysis)

  const sentimentLabel = useMemo(() => {
    if (!analysis?.sentiment) return null
    const key = String(analysis.sentiment).toLowerCase()
    return getTranslation(`emotion.${key}`, currentLang)
  }, [analysis?.sentiment, currentLang])

  const bgColor = visualTheme.background_color || '#050814'
  const textColor = visualTheme.text_color || '#F8F5EF'
  const primaryColor = visualTheme.primary_color || '#C8A96B'
  const secondaryColor = visualTheme.secondary_color || '#8FD3C1'
  const accentColor = visualTheme.accent_color || '#A259FF'

  const personaTheme = sectionThemes.persona || {}
  const shadowTheme = sectionThemes.shadow || {}
  const transformationTheme = sectionThemes.transformation || {}

  return (
    <div
      className="px-5 pb-6 pt-2 sm:px-8 sm:pb-8 sm:pt-5"
      style={{
        background: bgColor,
        color: textColor,
      }}
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">
            {isPremium
              ? currentLang === 'tr'
                ? 'Premium Jungiyen Derin Analiz'
                : currentLang === 'es'
                ? 'Análisis profundo junguiano premium'
                : currentLang === 'fr'
                ? 'Analyse junguienne profonde premium'
                : currentLang === 'de'
                ? 'Premium-jungianische Tiefenanalyse'
                : currentLang === 'pt'
                ? 'Análise profunda junguiana premium'
                : currentLang === 'ru'
                ? 'Премиум глубинный юнгианский анализ'
                : currentLang === 'ja'
                ? 'プレミアム・ユング派ディープ分析'
                : 'Premium Jungian Deep Analysis'
              : getTranslation('feed.jungianAnalysis', currentLang)}
          </p>
          <h2 className="text-xl font-semibold text-white/92 sm:text-2xl">
            {title}
          </h2>
        </div>

        {sentimentLabel && (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/30 px-3 py-1.5 text-xs text-white/75">
            <span>☯</span>
            <span>{sentimentLabel}</span>
          </div>
        )}
      </header>

      {summary && (
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/4 p-4">
          <h3 className="mb-2 text-xs uppercase tracking-[0.16em] text-white/60">
            {currentLang === 'tr'
              ? 'Rüyanın Özeti'
              : currentLang === 'es'
              ? 'Resumen del sueño'
              : currentLang === 'fr'
              ? 'Résumé du rêve'
              : currentLang === 'de'
              ? 'Zusammenfassung des Traums'
              : currentLang === 'pt'
              ? 'Resumo do sonho'
              : currentLang === 'ru'
              ? 'Краткое содержание сна'
              : currentLang === 'ja'
              ? '夢の概要'
              : 'Dream Summary'}
          </h3>
          <p className="text-sm leading-7 text-white/85">{summary}</p>
        </section>
      )}

      {motiv && (
        <section className="mb-6 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4">
          <h3 className="mb-2 text-xs uppercase tracking-[0.16em] text-amber-100/80">
            {currentLang === 'tr'
              ? 'Rüyanın Ana Motifi'
              : currentLang === 'es'
              ? 'Motivo principal del sueño'
              : currentLang === 'fr'
              ? 'Motif principal du rêve'
              : currentLang === 'de'
              ? 'Hauptmotiv des Traums'
              : currentLang === 'pt'
              ? 'Motivo principal do sonho'
              : currentLang === 'ru'
              ? 'Главный мотив сна'
              : currentLang === 'ja'
              ? '夢の主要モチーフ'
              : 'Key Motif'}
          </h3>
          <p className="text-sm leading-7 text-amber-50/92">{motiv}</p>
        </section>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        {shadowFocus && (
          <div className="rounded-2xl border border-rose-300/20 bg-rose-500/8 p-4">
            <h3 className="mb-2 text-xs uppercase tracking-[0.16em] text-rose-100/82">
              {currentLang === 'tr'
                ? 'Gölge Alanı'
                : currentLang === 'es'
                ? 'Zona de sombra'
                : currentLang === 'fr'
                ? 'Zone d’ombre'
                : currentLang === 'de'
                ? 'Schattenbereich'
                : currentLang === 'pt'
                ? 'Zona de sombra'
                : currentLang === 'ru'
                ? 'Область тени'
                : currentLang === 'ja'
                ? 'シャドウ領域'
                : 'Shadow Focus'}
            </h3>
            <p className="text-sm leading-7 text-rose-50/92">{shadowFocus}</p>
          </div>
        )}

        {coreConflict && (
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/8 p-4">
            <h3 className="mb-2 text-xs uppercase tracking-[0.16em] text-cyan-100/82">
              {currentLang === 'tr'
                ? 'Çekirdek Çatışma'
                : currentLang === 'es'
                ? 'Conflicto central'
                : currentLang === 'fr'
                ? 'Conflit central'
                : currentLang === 'de'
                ? 'Kernkonflikt'
                : currentLang === 'pt'
                ? 'Conflito central'
                : currentLang === 'ru'
                ? 'Основной конфликт'
                : currentLang === 'ja'
                ? '核となる葛藤'
                : 'Core Conflict'}
            </h3>
            <p className="text-sm leading-7 text-cyan-50/92">{coreConflict}</p>
          </div>
        )}
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        {individuationPath && (
          <div
            className="rounded-2xl border border-emerald-300/20 bg-emerald-500/8 p-4"
            style={{
              borderColor: transformationTheme.primary_color || undefined,
              background:
                transformationTheme.secondary_color
                  ? `${transformationTheme.secondary_color}14`
                  : undefined,
            }}
          >
            <h3 className="mb-2 text-xs uppercase tracking-[0.16em] text-emerald-100/82">
              {currentLang === 'tr'
                ? 'Bireyleşme Yolu'
                : currentLang === 'es'
                ? 'Camino de individuación'
                : currentLang === 'fr'
                ? 'Chemin d’individuation'
                : currentLang === 'de'
                ? 'Individuationsweg'
                : currentLang === 'pt'
                ? 'Caminho de individuação'
                : currentLang === 'ru'
                ? 'Путь индивидуации'
                : currentLang === 'ja'
                ? '個性化への道筋'
                : 'Individuation Path'}
            </h3>
            <p className="text-sm leading-7 text-emerald-50/92">
              {individuationPath}
            </p>
          </div>
        )}

        {symbolicReading && (
          <div
            className="rounded-2xl border border-violet-300/20 bg-violet-500/8 p-4"
            style={{
              borderColor: sectionThemes?.persona?.primary_color || undefined,
            }}
          >
            <h3 className="mb-2 text-xs uppercase tracking-[0.16em] text-violet-100/82">
              {currentLang === 'tr'
                ? 'Sembolik Okuma'
                : currentLang === 'es'
                ? 'Lectura simbólica'
                : currentLang === 'fr'
                ? 'Lecture symbolique'
                : currentLang === 'de'
                ? 'Symbolische Deutung'
                : currentLang === 'pt'
                ? 'Leitura simbólica'
                : currentLang === 'ru'
                ? 'Символическое прочтение'
                : currentLang === 'ja'
                ? '象徴的な読み解き'
                : 'Symbolic Reading'}
            </h3>
            <p className="text-sm leading-7 text-violet-50/92">
              {symbolicReading}
            </p>
          </div>
        )}
      </section>

      {personaProfile && Object.keys(personaProfile).length > 0 && (
        <section
          className="mb-6 rounded-2xl border border-white/12 bg-white/3 p-4 sm:p-5"
          style={{
            borderColor: personaTheme.primary_color || undefined,
          }}
        >
          <h3 className="mb-3 text-xs uppercase tracking-[0.16em] text-white/65">
            {currentLang === 'tr'
              ? 'Rüya Persona Portresi'
              : currentLang === 'es'
              ? 'Retrato de la persona onírica'
              : currentLang === 'fr'
              ? 'Portrait de la persona onirique'
              : currentLang === 'de'
              ? 'Traumpersona-Porträt'
              : currentLang === 'pt'
              ? 'Retrato da persona do sonho'
              : currentLang === 'ru'
              ? 'Портрет персона сна'
              : currentLang === 'ja'
              ? '夢のペルソナのポートレート'
              : 'Dream Persona Portrait'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white/85">
                {personaProfile.name?.[currentLang] ||
                  personaProfile.name?.en ||
                  ''}
              </p>
              <p className="text-xs italic text-white/70">
                {personaProfile.tagline?.[currentLang] ||
                  personaProfile.tagline?.en ||
                  ''}
              </p>
              <p className="text-xs text-white/60">
                {personaProfile.archetypal_style?.[currentLang] ||
                  personaProfile.archetypal_style?.en ||
                  ''}
              </p>
            </div>

            <div className="space-y-2 text-xs text-white/72">
              <p>
                <span className="font-semibold">
                  {currentLang === 'tr'
                    ? 'Görünür ben: '
                    : currentLang === 'es'
                    ? 'Yo visible: '
                    : currentLang === 'fr'
                    ? 'Moi visible : '
                    : currentLang === 'de'
                    ? 'Sichtbares Ich: '
                    : currentLang === 'pt'
                    ? 'Eu visível: '
                    : currentLang === 'ru'
                    ? 'Видимое Я: '
                    : currentLang === 'ja'
                    ? '見える自分: '
                    : 'Public self: '}
                </span>
                {personaProfile.public_self?.[currentLang] ||
                  personaProfile.public_self?.en ||
                  ''}
              </p>
              <p>
                <span className="font-semibold">
                  {currentLang === 'tr'
                    ? 'Gizli ben: '
                    : currentLang === 'es'
                    ? 'Yo oculto: '
                    : currentLang === 'fr'
                    ? 'Moi caché : '
                    : currentLang === 'de'
                    ? 'Verborgenes Ich: '
                    : currentLang === 'pt'
                    ? 'Eu oculto: '
                    : currentLang === 'ru'
                    ? 'Скрытое Я: '
                    : currentLang === 'ja'
                    ? '隠された自分: '
                    : 'Hidden self: '}
                </span>
                {personaProfile.hidden_self?.[currentLang] ||
                  personaProfile.hidden_self?.en ||
                  ''}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-white/70">
                {currentLang === 'tr'
                  ? 'Güçlü Yanlar'
                  : currentLang === 'es'
                  ? 'Fortalezas'
                  : currentLang === 'fr'
                  ? 'Forces'
                  : currentLang === 'de'
                  ? 'Stärken'
                  : currentLang === 'pt'
                  ? 'Forças'
                  : currentLang === 'ru'
                  ? 'Сильные стороны'
                  : currentLang === 'ja'
                  ? '強み'
                  : 'Strengths'}
              </p>
              <ul className="space-y-1 text-xs text-white/76">
                {(personaProfile.strengths?.[currentLang] ||
                  personaProfile.strengths?.en ||
                  []
                ).map((item, idx) => (
                  <li key={`strength-${idx}`}>• {item}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-white/70">
                {currentLang === 'tr'
                  ? 'Gölge Yanlar'
                  : currentLang === 'es'
                  ? 'Lados sombra'
                  : currentLang === 'fr'
                  ? 'Parties d’ombre'
                  : currentLang === 'de'
                  ? 'Schattenseiten'
                  : currentLang === 'pt'
                  ? 'Lados sombra'
                  : currentLang === 'ru'
                  ? 'Теневые стороны'
                  : currentLang === 'ja'
                  ? 'シャドウ面'
                  : 'Shadow sides'}
              </p>
              <ul className="space-y-1 text-xs text-white/76">
                {(personaProfile.shadow_sides?.[currentLang] ||
                  personaProfile.shadow_sides?.en ||
                  []
                ).map((item, idx) => (
                  <li key={`shadow-${idx}`}>• {item}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-white/70">
                {currentLang === 'tr'
                  ? 'Temel Korkular'
                  : currentLang === 'es'
                  ? 'Miedos centrales'
                  : currentLang === 'fr'
                  ? 'Peurs centrales'
                  : currentLang === 'de'
                  ? 'Grundängste'
                  : currentLang === 'pt'
                  ? 'Medos centrais'
                  : currentLang === 'ru'
                  ? 'Основные страхи'
                  : currentLang === 'ja'
                  ? '根本的な恐れ'
                  : 'Core fears'}
              </p>
              <ul className="space-y-1 text-xs text-white/76">
                {(personaProfile.core_fears?.[currentLang] ||
                  personaProfile.core_fears?.en ||
                  []
                ).map((item, idx) => (
                  <li key={`fear-${idx}`}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold text-white/70">
              {currentLang === 'tr'
                ? 'Duygusal İhtiyaçlar'
                : currentLang === 'es'
                ? 'Necesidades emocionales'
                : currentLang === 'fr'
                ? 'Besoins émotionnels'
                : currentLang === 'de'
                ? 'Emotionale Bedürfnisse'
                : currentLang === 'pt'
                ? 'Necessidades emocionais'
                : currentLang === 'ru'
                ? 'Эмоциональные потребности'
                : currentLang === 'ja'
                ? '感情的ニーズ'
                : 'Emotional needs'}
            </p>
            <ul className="space-y-1 text-xs text-white/76">
              {(personaProfile.emotional_needs?.[currentLang] ||
                personaProfile.emotional_needs?.en ||
                []
              ).map((item, idx) => (
                <li key={`need-${idx}`}>• {item}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {symbols.length > 0 && (
        <section className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
          <h3 className="mb-3 text-xs uppercase tracking-[0.16em] text-white/65">
            {currentLang === 'tr'
              ? 'Rüyanın Ana Sembolleri'
              : currentLang === 'es'
              ? 'Símbolos clave del sueño'
              : currentLang === 'fr'
              ? 'Symboles clés du rêve'
              : currentLang === 'de'
              ? 'Zentrale Traumsymbole'
              : currentLang === 'pt'
              ? 'Símbolos principais do sonho'
              : currentLang === 'ru'
              ? 'Ключевые символы сна'
              : currentLang === 'ja'
              ? '夢の主要なシンボル'
              : 'Key Symbols'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {symbols.map((s, idx) => (
              <div
                key={`symbol-${idx}`}
                className="rounded-xl border border-white/12 bg-white/3 p-3"
              >
                <p className="mb-1 text-xs font-semibold text-white/85">
                  {s.symbol}
                </p>
                <p className="mb-1 text-xs text-white/70">
                  {currentLang === 'tr'
                    ? s.meaning_tr || s.meaning_en
                    : s.meaning_en || s.meaning_tr}
                </p>
                {s.emotional_charge && (
                  <p className="text-[11px] text-white/55">
                    {currentLang === 'tr'
                      ? `Duygusal yük: ${s.emotional_charge}`
                      : currentLang === 'es'
                      ? `Carga emocional: ${s.emotional_charge}`
                      : currentLang === 'fr'
                      ? `Charge émotionnelle : ${s.emotional_charge}`
                      : currentLang === 'de'
                      ? `Emotionale Ladung: ${s.emotional_charge}`
                      : currentLang === 'pt'
                      ? `Carga emocional: ${s.emotional_charge}`
                      : currentLang === 'ru'
                      ? `Эмоциональный заряд: ${s.emotional_charge}`
                      : currentLang === 'ja'
                      ? `感情的な負荷: ${s.emotional_charge}`
                      : `Emotional charge: ${s.emotional_charge}`}
                  </p>
                )}
                {typeof s.intensity === 'number' && (
                  <p className="mt-1 text-[11px] text-white/55">
                    {currentLang === 'tr'
                      ? `Şiddet: ${s.intensity}/10`
                      : currentLang === 'es'
                      ? `Intensidad: ${s.intensity}/10`
                      : currentLang === 'fr'
                      ? `Intensité : ${s.intensity}/10`
                      : currentLang === 'de'
                      ? `Intensität: ${s.intensity}/10`
                      : currentLang === 'pt'
                      ? `Intensidade: ${s.intensity}/10`
                      : currentLang === 'ru'
                      ? `Интенсивность: ${s.intensity}/10`
                      : currentLang === 'ja'
                      ? `強度: ${s.intensity}/10`
                      : `Intensity: ${s.intensity}/10`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {emotions.length > 0 && (
        <section className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
          <h3 className="mb-3 text-xs uppercase tracking-[0.16em] text-white/65">
            {currentLang === 'tr'
              ? 'Duygusal Manzara'
              : currentLang === 'es'
              ? 'Paisaje emocional'
              : currentLang === 'fr'
              ? 'Paysage émotionnel'
              : currentLang === 'de'
              ? 'Emotionale Landschaft'
              : currentLang === 'pt'
              ? 'Paisagem emocional'
              : currentLang === 'ru'
              ? 'Эмоциональный ландшафт'
              : currentLang === 'ja'
              ? '感情の風景'
              : 'Emotional Landscape'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {emotions.map((e, idx) => (
              <div
                key={`emotion-${idx}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/3 px-3 py-1.5 text-xs text-white/80"
              >
                <span>{getTranslation(`emotion.${String(e.emotion).toLowerCase()}`, currentLang)}</span>
                {typeof e.score === 'number' && (
                  <span className="text-[11px] text-white/55">
                    {currentLang === 'tr'
                      ? `yoğunluk: ${e.score}/10`
                      : currentLang === 'es'
                      ? `intensidad: ${e.score}/10`
                      : currentLang === 'fr'
                      ? `intensité : ${e.score}/10`
                      : currentLang === 'de'
                      ? `Intensität: ${e.score}/10`
                      : currentLang === 'pt'
                      ? `intensidade: ${e.score}/10`
                      : currentLang === 'ru'
                      ? `интенсивность: ${e.score}/10`
                      : currentLang === 'ja'
                      ? `強度: ${e.score}/10`
                      : `intensity: ${e.score}/10`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {reflectionQuestions.length > 0 && (
        <section className="mb-2 rounded-2xl border border-white/12 bg-white/3 p-4 sm:p-5">
          <h3 className="mb-3 text-xs uppercase tracking-[0.16em] text-white/65">
            {currentLang === 'tr'
              ? 'Kendine Sorular'
              : currentLang === 'es'
              ? 'Preguntas para ti mismo'
              : currentLang === 'fr'
              ? 'Questions pour vous-même'
              : currentLang === 'de'
              ? 'Fragen an dich selbst'
              : currentLang === 'pt'
              ? 'Perguntas para si mesmo'
              : currentLang === 'ru'
              ? 'Вопросы себе'
              : currentLang === 'ja'
              ? '自分への問い'
              : 'Questions for reflection'}
          </h3>
          <ul className="space-y-2 text-sm text-white/82">
            {reflectionQuestions.map((q, idx) => (
              <li key={`reflection-${idx}`}>• {q}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}