import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  getDreamUiText,
  normalizeLang,
  pickLocalized,
  safeArray,
} from '../lib/dreamAnalysisI18n'

function SectionCard({ title, children, colors = {}, dark = false }) {
  const bg = colors?.primary_color || (dark ? '#161925' : '#1f2433')
  const secondary = colors?.secondary_color || '#2b3245'
  const accent = colors?.accent_color || '#c8a96b'

  return (
    <section
      style={{
        background: `linear-gradient(135deg, ${bg} 0%, ${secondary} 100%)`,
        border: `1px solid ${accent}33`,
        borderRadius: 24,
        padding: 24,
        boxShadow: `0 10px 30px ${accent}22`,
        color: '#F8F5EF',
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: 16,
          fontSize: 24,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h2>
      <div style={{ color: '#EDE7DC', lineHeight: 1.75 }}>{children}</div>
    </section>
  )
}

function Badge({ children, color = '#c8a96b', bg = '#ffffff14' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        color,
        background: bg,
        border: `1px solid ${color}44`,
        backdropFilter: 'blur(8px)',
      }}
    >
      {children}
    </span>
  )
}

function BulletList({ items = [] }) {
  if (!items?.length) return null
  return (
    <ul style={{ margin: 0, paddingLeft: 20 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 8 }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

function SymbolGrid({ symbols = [], lang = 'en' }) {
  if (!symbols.length) return null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
      }}
    >
      {symbols.map((symbol, i) => (
        <div
          key={i}
          style={{
            borderRadius: 20,
            padding: 18,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${symbol.color || '#ffffff22'}`,
            boxShadow: `0 6px 24px ${(symbol.color || '#ffffff')}22`,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 8,
              color: symbol.color || '#F8F5EF',
            }}
          >
            {symbol.symbol}
          </div>
          <div style={{ fontSize: 14, opacity: 0.95, marginBottom: 10 }}>
            {lang === 'tr' ? symbol.meaning_tr : symbol.meaning_en}
          </div>
          {symbol.emotional_charge ? (
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
              {symbol.emotional_charge}
            </div>
          ) : null}
          <div
            style={{
              marginTop: 10,
              height: 8,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.12)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${symbol.intensity || 0}%`,
                height: '100%',
                borderRadius: 999,
                background: symbol.color || '#c8a96b',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmotionRow({ emotions = [] }) {
  if (!emotions.length) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {emotions.map((emotion, i) => (
        <Badge key={i}>
          {emotion.emotion} • {emotion.score}
        </Badge>
      ))}
    </div>
  )
}

export default function DreamAnalysisView({ dream, lang: langProp }) {
  const router = useRouter()
  const lang = normalizeLang(langProp || router?.locale || dream?.original_language || 'en')
  const t = getDreamUiText(lang)

  const analysis = dream?.ai_jungian_analysis || {}
  const title = dream?.[`ai_title_${lang}`] || dream?.ai_title || pickLocalized(analysis?.title, lang, 'en')
  const summary =
    dream?.[`ai_summary_${lang}`] || dream?.ai_summary || pickLocalized(analysis?.summary, lang, 'en')
  const motiv =
    dream?.[`ai_motiv_${lang}`] || dream?.ai_motiv || pickLocalized(analysis?.motiv, lang, 'en')

  const personaName = pickLocalized(analysis?.persona_profile?.name, lang, 'en')
  const personaTagline = pickLocalized(analysis?.persona_profile?.tagline, lang, 'en')
  const archetypalStyle = pickLocalized(analysis?.persona_profile?.archetypal_style, lang, 'en')
  const publicSelf = pickLocalized(analysis?.persona_profile?.public_self, lang, 'en')
  const hiddenSelf = pickLocalized(analysis?.persona_profile?.hidden_self, lang, 'en')

  const shadowFocus = pickLocalized(analysis?.shadow_focus, lang, 'en')
  const coreConflict = pickLocalized(analysis?.core_conflict, lang, 'en')
  const individuationPath = pickLocalized(analysis?.individuation_path, lang, 'en')
  const symbolicReading = pickLocalized(analysis?.symbolic_reading, lang, 'en')

  const reflectionQuestions = safeArray(
    analysis?.reflection_questions?.[lang] ||
      analysis?.reflection_questions?.en ||
      analysis?.reflection_questions?.tr
  )

  const visual = analysis?.visual_theme || {}
  const sectionThemes = analysis?.section_themes || {}

  const bg = visual?.background_color || '#0D1018'
  const text = visual?.text_color || '#F8F5EF'
  const primary = visual?.primary_color || '#C8A96B'
  const secondary = visual?.secondary_color || '#2B2238'
  const accent = visual?.accent_color || '#8FD3C1'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bg,
        color: text,
        padding: '32px 20px 80px',
        position: 'relative',
      }}
    >
      <Link
        href="/"
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 1000,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 18px',
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 700,
          color: '#F8F5EF',
          background: 'rgba(13,16,24,0.72)',
          border: '1px solid rgba(255,255,255,0.16)',
          textDecoration: 'none',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {t.home}
      </Link>

      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header
          style={{
            background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 60%, ${accent} 100%)`,
            borderRadius: 32,
            padding: '36px 28px',
            boxShadow: `0 20px 60px ${primary}22`,
            marginBottom: 24,
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
            <Badge color="#fff" bg="rgba(255,255,255,0.12)">
              {analysis?.sentiment || t.fallbackSentiment}
            </Badge>
            {safeArray(analysis?.archetypes).map((arc, i) => (
              <Badge key={i} color="#fff" bg="rgba(255,255,255,0.10)">
                {arc}
              </Badge>
            ))}
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              lineHeight: 1.02,
              fontWeight: 900,
              letterSpacing: '-0.04em',
            }}
          >
            {title}
          </h1>

          {personaName ? (
            <div
              style={{
                marginTop: 14,
                fontSize: 20,
                fontWeight: 700,
                color: '#FDF7E7',
              }}
            >
              {personaName}
            </div>
          ) : null}

          {personaTagline ? (
            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                maxWidth: 860,
                fontSize: 17,
                lineHeight: 1.75,
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              {personaTagline}
            </p>
          ) : null}
        </header>

        <div style={{ marginBottom: 24 }}>
          <EmotionRow emotions={safeArray(dream?.ai_emotions || analysis?.emotions)} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            gap: 20,
          }}
        >
          <div style={{ gridColumn: 'span 12' }}>
            <SectionCard title={t.summary} colors={visual}>
              <p style={{ marginTop: 0 }}>{summary}</p>
              {motiv ? <p style={{ marginBottom: 0, opacity: 0.92 }}>{motiv}</p> : null}
            </SectionCard>
          </div>

          <div style={{ gridColumn: 'span 12' }}>
            <SectionCard title={t.persona} colors={sectionThemes?.persona || visual}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 18,
                }}
              >
                <div>
                  <h3 style={{ marginTop: 0 }}>{t.archetypalStyle}</h3>
                  <p>{archetypalStyle}</p>
                </div>
                <div>
                  <h3 style={{ marginTop: 0 }}>{t.publicSelf}</h3>
                  <p>{publicSelf}</p>
                </div>
                <div>
                  <h3 style={{ marginTop: 0 }}>{t.hiddenSelf}</h3>
                  <p>{hiddenSelf}</p>
                </div>
              </div>

              <div
                style={{
                  marginTop: 22,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 18,
                }}
              >
                <div>
                  <h3>{t.strengths}</h3>
                  <BulletList
                    items={safeArray(
                      analysis?.persona_profile?.strengths?.[lang] ||
                        analysis?.persona_profile?.strengths?.en ||
                        analysis?.persona_profile?.strengths?.tr
                    )}
                  />
                </div>
                <div>
                  <h3>{t.shadowSides}</h3>
                  <BulletList
                    items={safeArray(
                      analysis?.persona_profile?.shadow_sides?.[lang] ||
                        analysis?.persona_profile?.shadow_sides?.en ||
                        analysis?.persona_profile?.shadow_sides?.tr
                    )}
                  />
                </div>
                <div>
                  <h3>{t.coreFears}</h3>
                  <BulletList
                    items={safeArray(
                      analysis?.persona_profile?.core_fears?.[lang] ||
                        analysis?.persona_profile?.core_fears?.en ||
                        analysis?.persona_profile?.core_fears?.tr
                    )}
                  />
                </div>
                <div>
                  <h3>{t.emotionalNeeds}</h3>
                  <BulletList
                    items={safeArray(
                      analysis?.persona_profile?.emotional_needs?.[lang] ||
                        analysis?.persona_profile?.emotional_needs?.en ||
                        analysis?.persona_profile?.emotional_needs?.tr
                    )}
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          <div style={{ gridColumn: 'span 12' }}>
            <SectionCard title={t.shadow} colors={sectionThemes?.shadow || visual} dark>
              <p>
                <strong>{t.shadowFocus}:</strong> {shadowFocus}
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong>{t.coreConflict}:</strong> {coreConflict}
              </p>
            </SectionCard>
          </div>

          <div style={{ gridColumn: 'span 12' }}>
            <SectionCard title={t.symbols} colors={visual}>
              <p style={{ marginTop: 0 }}>{symbolicReading}</p>
              <SymbolGrid symbols={safeArray(dream?.ai_symbols || analysis?.symbols)} lang={lang} />
            </SectionCard>
          </div>

          <div style={{ gridColumn: 'span 12' }}>
            <SectionCard title={t.transformation} colors={sectionThemes?.transformation || visual}>
              <p style={{ marginTop: 0 }}>{individuationPath}</p>
            </SectionCard>
          </div>

          {!!reflectionQuestions.length && (
            <div style={{ gridColumn: 'span 12' }}>
              <SectionCard title={t.questions} colors={visual}>
                <BulletList items={reflectionQuestions} />
              </SectionCard>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}