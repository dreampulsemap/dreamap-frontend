import { useEffect, useState } from 'react'
import Seo, { SITE_URL } from '@/components/Seo'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { signDiaryMedia } from '@/lib/diaryMediaUrl'
import {
  SHARE_TYPES,
  isValidShareId,
  loadShareable,
  loadOwnerProfile,
  ownerDisplayName,
} from '@/lib/shareSnapshot'
import { clip, sharePath } from '@/lib/shareUtils'

// Dış platformlarda (WhatsApp, X, Facebook, Telegram...) paylaşılan
// rüya / günce / vizyon bağlantısının açılış sayfası.
//
// Gizlilik: yalnızca visibility === 'public' içerik SSR HTML'ine (ve OG
// etiketlerine) girer. Arkadaşa özel / gizli içerik için sayfa yalnızca
// "bu içerik gizli" der; metin, görsel ya da sahip bilgisi sızmaz.
// Kişisel içerik olduğu için arama motorlarına kapalı (noindex).

const PLAY_URL = 'https://play.google.com/store/apps/details?id=io.lunosfer.dreamap'

const T = {
  en: { dream: 'Dream', diary: 'Diary', vision: 'Vision', open: 'Open in Lunosfer', get: 'Get it on Google Play', web: 'Explore on the web', by: 'by {name}', believers: '{n} believers', privateTitle: 'This post is private', privateBody: 'Only its owner (or their friends) can see it in the Lunosfer app.', missingTitle: 'Post not found', missingBody: 'It may have been deleted.', tagline: 'Record your dreams, discover their meaning, turn goals into visions.' },
  tr: { dream: 'Rüya', diary: 'Günce', vision: 'Vizyon', open: "Lunosfer'de aç", get: "Google Play'den indir", web: "Web'de keşfet", by: '{name} paylaştı', believers: '{n} inanan', privateTitle: 'Bu paylaşım gizli', privateBody: 'Yalnızca sahibi (ya da arkadaşları) Lunosfer uygulamasında görebilir.', missingTitle: 'Paylaşım bulunamadı', missingBody: 'Silinmiş olabilir.', tagline: 'Rüyalarını kaydet, anlamlarını keşfet, hedeflerini vizyona dönüştür.' },
  es: { dream: 'Sueño', diary: 'Diario', vision: 'Visión', open: 'Abrir en Lunosfer', get: 'Consíguelo en Google Play', web: 'Explorar en la web', by: 'de {name}', believers: '{n} creyentes', privateTitle: 'Esta publicación es privada', privateBody: 'Solo su autor (o sus amigos) pueden verla en la app de Lunosfer.', missingTitle: 'Publicación no encontrada', missingBody: 'Puede que se haya eliminado.', tagline: 'Registra tus sueños, descubre su significado, convierte tus metas en visiones.' },
  fr: { dream: 'Rêve', diary: 'Journal', vision: 'Vision', open: 'Ouvrir dans Lunosfer', get: 'Disponible sur Google Play', web: 'Explorer sur le web', by: 'par {name}', believers: '{n} croyants', privateTitle: 'Cette publication est privée', privateBody: "Seul son auteur (ou ses amis) peut la voir dans l'app Lunosfer.", missingTitle: 'Publication introuvable', missingBody: 'Elle a peut-être été supprimée.', tagline: 'Note tes rêves, découvre leur sens, transforme tes objectifs en visions.' },
  de: { dream: 'Traum', diary: 'Tagebuch', vision: 'Vision', open: 'In Lunosfer öffnen', get: 'Jetzt bei Google Play', web: 'Im Web entdecken', by: 'von {name}', believers: '{n} Unterstützer', privateTitle: 'Dieser Beitrag ist privat', privateBody: 'Nur der Verfasser (oder seine Freunde) kann ihn in der Lunosfer-App sehen.', missingTitle: 'Beitrag nicht gefunden', missingBody: 'Er wurde möglicherweise gelöscht.', tagline: 'Halte deine Träume fest, entdecke ihre Bedeutung, mach Ziele zu Visionen.' },
  pt: { dream: 'Sonho', diary: 'Diário', vision: 'Visão', open: 'Abrir no Lunosfer', get: 'Disponível no Google Play', web: 'Explorar na web', by: 'de {name}', believers: '{n} apoiadores', privateTitle: 'Esta publicação é privada', privateBody: 'Somente o autor (ou os amigos dele) pode vê-la no app Lunosfer.', missingTitle: 'Publicação não encontrada', missingBody: 'Ela pode ter sido excluída.', tagline: 'Registre seus sonhos, descubra o significado, transforme metas em visões.' },
  ru: { dream: 'Сон', diary: 'Дневник', vision: 'Видение', open: 'Открыть в Lunosfer', get: 'Скачать в Google Play', web: 'Смотреть в браузере', by: 'автор: {name}', believers: 'Верящих: {n}', privateTitle: 'Это закрытая публикация', privateBody: 'Её может видеть только автор (или его друзья) в приложении Lunosfer.', missingTitle: 'Публикация не найдена', missingBody: 'Возможно, она удалена.', tagline: 'Записывайте сны, узнавайте их смысл, превращайте цели в видения.' },
  ja: { dream: '夢', diary: '日記', vision: 'ビジョン', open: 'Lunosferで開く', get: 'Google Playで手に入れよう', web: 'ウェブで見る', by: '{name} さん', believers: '{n} 人が応援', privateTitle: 'この投稿は非公開です', privateBody: '投稿者（またはその友達）だけがLunosferアプリで見られます。', missingTitle: '投稿が見つかりません', missingBody: '削除された可能性があります。', tagline: '夢を記録し、意味を見つけ、目標をビジョンに。' },
  ar: { dream: 'حلم', diary: 'يوميات', vision: 'رؤية', open: 'افتح في Lunosfer', get: 'احصل عليه من Google Play', web: 'استكشف على الويب', by: 'بواسطة {name}', believers: '{n} مؤمن', privateTitle: 'هذا المنشور خاص', privateBody: 'لا يراه إلا صاحبه (أو أصدقاؤه) في تطبيق Lunosfer.', missingTitle: 'المنشور غير موجود', missingBody: 'ربما تم حذفه.', tagline: 'سجّل أحلامك، واكتشف معناها، وحوّل أهدافك إلى رؤى.' },
  hi: { dream: 'सपना', diary: 'डायरी', vision: 'विज़न', open: 'Lunosfer में खोलें', get: 'Google Play पर पाएं', web: 'वेब पर देखें', by: '{name} द्वारा', believers: '{n} समर्थक', privateTitle: 'यह पोस्ट निजी है', privateBody: 'इसे सिर्फ़ इसका मालिक (या उसके दोस्त) Lunosfer ऐप में देख सकते हैं।', missingTitle: 'पोस्ट नहीं मिली', missingBody: 'हो सकता है इसे हटा दिया गया हो।', tagline: 'अपने सपने लिखें, उनका अर्थ जानें, लक्ष्यों को विज़न में बदलें।' },
  zh: { dream: '梦境', diary: '日记', vision: '愿景', open: '在 Lunosfer 中打开', get: '在 Google Play 下载', web: '在网页上探索', by: '来自 {name}', believers: '{n} 位支持者', privateTitle: '此内容为私密', privateBody: '只有作者（或其好友）能在 Lunosfer 应用中查看。', missingTitle: '未找到内容', missingBody: '可能已被删除。', tagline: '记录梦境，发现意义，把目标变成愿景。' },
  fi: { dream: 'Uni', diary: 'Päiväkirja', vision: 'Visio', open: 'Avaa Lunosferissa', get: 'Lataa Google Playsta', web: 'Tutustu verkossa', by: 'tekijä: {name}', believers: '{n} uskojaa', privateTitle: 'Tämä julkaisu on yksityinen', privateBody: 'Vain tekijä (tai hänen ystävänsä) näkee sen Lunosfer-sovelluksessa.', missingTitle: 'Julkaisua ei löytynyt', missingBody: 'Se on ehkä poistettu.', tagline: 'Tallenna unesi, löydä niiden merkitys, tee tavoitteista visioita.' },
  ro: { dream: 'Vis', diary: 'Jurnal', vision: 'Viziune', open: 'Deschide în Lunosfer', get: 'Descarcă de pe Google Play', web: 'Explorează pe web', by: 'de {name}', believers: '{n} susținători', privateTitle: 'Această postare este privată', privateBody: 'Doar autorul (sau prietenii lui) o pot vedea în aplicația Lunosfer.', missingTitle: 'Postarea nu a fost găsită', missingBody: 'Este posibil să fi fost ștearsă.', tagline: 'Notează-ți visele, descoperă-le sensul, transformă obiectivele în viziuni.' },
  uk: { dream: 'Сон', diary: 'Щоденник', vision: 'Візія', open: 'Відкрити в Lunosfer', get: 'Завантажити з Google Play', web: 'Переглянути в браузері', by: 'автор: {name}', believers: 'Вірять: {n}', privateTitle: 'Це закрита публікація', privateBody: 'Її бачить лише автор (або його друзі) у застосунку Lunosfer.', missingTitle: 'Публікацію не знайдено', missingBody: 'Можливо, її видалено.', tagline: 'Записуйте сни, відкривайте їхній зміст, перетворюйте цілі на візії.' },
}

function pickLang(acceptLanguage) {
  const parts = String(acceptLanguage || '')
    .split(',')
    .map((p) => p.split(';')[0].trim().toLowerCase().split('-')[0])
    .filter(Boolean)
  return parts.find((p) => T[p]) || 'en'
}

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''))
}

export async function getServerSideProps({ params, req, res }) {
  const { type, id } = params
  if (!SHARE_TYPES.includes(type) || !isValidShareId(type, id)) return { notFound: true }

  const lang = pickLang(req.headers['accept-language'])
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600')
  res.setHeader('Vary', 'Accept-Language')

  try {
    const item = await loadShareable(supabaseAdmin, type, id)
    if (!item) return { props: { state: 'missing', type, id, lang } }
    if (item.visibility !== 'public') return { props: { state: 'private', type, id, lang } }

    const owner = await loadOwnerProfile(supabaseAdmin, item.ownerId)
    let imageUrl = item.imageUrl
    if (type === 'diary' && imageUrl) {
      const [signed] = await signDiaryMedia([{ image_url: imageUrl }], ['image_url'])
      imageUrl = signed?.image_url || null
    }

    return {
      props: {
        state: 'ok',
        type,
        id,
        lang,
        item: {
          title: item.title || '',
          excerpt: item.excerpt || '',
          imageUrl: imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : null,
          believersCount: item.believersCount ?? null,
        },
        owner: owner ? { name: ownerDisplayName(owner), username: owner.username || null, avatarUrl: owner.avatar_url || null } : null,
      },
    }
  } catch (err) {
    console.error('share page error:', err)
    return { props: { state: 'missing', type, id, lang } }
  }
}

export default function SharePage({ state, type, id, lang, item, owner }) {
  const t = T[lang] || T.en
  const [openHref, setOpenHref] = useState(PLAY_URL)

  // Android'de doğrudan uygulamayı açan intent bağlantısı; uygulama yoksa
  // Chrome kendiliğinden Google Play'e düşer.
  useEffect(() => {
    if (/android/i.test(navigator.userAgent)) {
      setOpenHref(
        `intent://share/${type}/${id}#Intent;scheme=io.lunosfer.dreamap;package=io.lunosfer.dreamap;` +
          `S.browser_fallback_url=${encodeURIComponent(PLAY_URL)};end`
      )
    }
  }, [type, id])

  const typeLabel = t[type] || ''
  const seoTitle = state === 'ok' ? `${item.title || typeLabel} · ${typeLabel}` : state === 'private' ? t.privateTitle : t.missingTitle
  const seoDescription = state === 'ok' ? clip(item.excerpt || t.tagline, 155) : t.tagline

  return (
    <>
      <Seo
        title={seoTitle}
        description={seoDescription}
        image={state === 'ok' && item.imageUrl ? item.imageUrl : `${SITE_URL}/logo.png`}
        type="article"
        lang={lang}
        path={sharePath(type, id)}
        noindex
      />
      <main style={S.page} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div style={S.glow} aria-hidden />
        <header style={S.header}>
          <img src="/logo.png" alt="" width={36} height={36} style={S.logo} />
          <span style={S.brand}>Lunosfer</span>
        </header>

        <section style={S.card}>
          <span style={S.pill}>{typeLabel}</span>

          {state === 'ok' ? (
            <>
              {item.imageUrl && <img src={item.imageUrl} alt="" style={S.image} />}
              {item.title && <h1 style={S.title}>{item.title}</h1>}
              {item.excerpt && item.excerpt !== item.title && <p style={S.excerpt}>{item.excerpt}</p>}
              <div style={S.meta}>
                {owner?.name && <span>{fill(t.by, { name: owner.username ? `@${owner.username}` : owner.name })}</span>}
                {type === 'vision' && item.believersCount > 0 && <span>✨ {fill(t.believers, { n: item.believersCount })}</span>}
              </div>
            </>
          ) : (
            <>
              <div style={S.lock}>{state === 'private' ? '🔒' : '🌫️'}</div>
              <h1 style={S.title}>{state === 'private' ? t.privateTitle : t.missingTitle}</h1>
              <p style={S.excerpt}>{state === 'private' ? t.privateBody : t.missingBody}</p>
            </>
          )}
        </section>

        <div style={S.actions}>
          <a href={openHref} style={S.primary}>{t.open}</a>
          <a href={PLAY_URL} style={S.secondary} rel="noopener noreferrer">▶ {t.get}</a>
          <a href="/explore" style={S.link}>{t.web}</a>
        </div>

        <footer style={S.footer}>{t.tagline}</footer>
      </main>
    </>
  )
}

const GOLD = '#E6C687'
const S = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(120% 80% at 50% 0%, #1b1440 0%, #090D1A 45%, #04060E 100%)',
    color: '#F8F5EF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '28px 16px 40px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  },
  glow: {
    position: 'absolute',
    top: -120,
    width: 420,
    height: 420,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.25), transparent 70%)',
    pointerEvents: 'none',
  },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, zIndex: 1 },
  logo: { borderRadius: 10 },
  brand: { fontSize: 20, fontWeight: 700, letterSpacing: 1, color: GOLD },
  card: {
    width: '100%',
    maxWidth: 520,
    background: 'rgba(18,24,38,0.85)',
    border: '1px solid rgba(230,198,135,0.25)',
    borderRadius: 24,
    padding: 20,
    boxSizing: 'border-box',
    zIndex: 1,
    boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
  },
  pill: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: GOLD,
    border: '1px solid rgba(230,198,135,0.4)',
    borderRadius: 999,
    padding: '4px 10px',
    marginBottom: 14,
  },
  image: { width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 16, display: 'block', marginBottom: 16 },
  title: { fontFamily: 'Georgia, "Times New Roman", serif', color: GOLD, fontSize: 24, lineHeight: 1.3, margin: '0 0 10px' },
  excerpt: { fontSize: 16, lineHeight: 1.6, color: 'rgba(248,245,239,0.88)', margin: '0 0 14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  meta: { display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, color: '#94A3B8' },
  lock: { fontSize: 40, margin: '6px 0 10px' },
  actions: { width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20, zIndex: 1 },
  primary: {
    display: 'block',
    textAlign: 'center',
    background: GOLD,
    color: '#04060E',
    fontWeight: 700,
    padding: '14px 18px',
    borderRadius: 16,
    textDecoration: 'none',
    fontSize: 16,
  },
  secondary: {
    display: 'block',
    textAlign: 'center',
    background: 'transparent',
    color: '#F8F5EF',
    border: '1px solid rgba(248,245,239,0.25)',
    padding: '12px 18px',
    borderRadius: 16,
    textDecoration: 'none',
    fontSize: 15,
  },
  link: { textAlign: 'center', color: '#38BDF8', fontSize: 14, textDecoration: 'none', padding: 6 },
  footer: { marginTop: 26, fontSize: 12, color: '#64748B', textAlign: 'center', maxWidth: 420, zIndex: 1 },
}
