import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Çeviri dosyaları
const resources = {
  en: {
    translation: {
      // Header
      'app.name': 'Dreamap',
      'app.tagline': 'Map of the Collective Unconscious',
      'nav.feed': 'Feed',
      'nav.globe': 'Globe',
      'nav.auth': 'Login',
      
      // Hero
      'hero.title': 'The World\'s Dreams',
      'hero.subtitle': 'In One Map',
      'hero.description': 'Jungian archetypes, collective unconscious, and humanity\'s shared dream experiences',
      'hero.dreams': 'Dreams',
      'hero.languages': 'Languages',
      'hero.archetypes': 'Archetypes',
      
      // Feed
      'feed.title': 'Recent Dreams',
      'feed.loading': 'Loading dreams...',
      'feed.empty': 'No dreams yet',
      'feed.analysis': 'Jungian Analysis',
      
      // Footer
      'footer.text': 'Dreamap © 2026 - Digital Map of the Collective Unconscious',
      
      // Language names
      'lang.en': 'English',
      'lang.tr': 'Türkçe',
      'lang.ru': 'Русский',
      'lang.ar': 'العربية',
      'lang.es': 'Español',
      'lang.hi': 'हिन्दी',
      'lang.zh': '中文',
      'lang.de': 'Deutsch'
    }
  },
  tr: {
    translation: {
      'app.name': 'Dreamap',
      'app.tagline': 'Kolektif Bilinçdışı Haritası',
      'nav.feed': 'Akış',
      'nav.globe': 'Küre',
      'nav.auth': 'Giriş',
      
      'hero.title': 'Dünyanın Rüyaları',
      'hero.subtitle': 'Tek Bir Haritada',
      'hero.description': 'Jungian arketipler, kolektif bilinçdışı ve insanlığın ortak rüya deneyimleri',
      'hero.dreams': 'Rüya',
      'hero.languages': 'Dil',
      'hero.archetypes': 'Arketip',
      
      'feed.title': 'Son Rüyalar',
      'feed.loading': 'Rüyalar yükleniyor...',
      'feed.empty': 'Henüz rüya yok',
      'feed.analysis': 'Jungian Analiz',
      
      'footer.text': 'Dreamap © 2026 - Kolektif Bilinçdışının Dijital Haritası',
      
      'lang.en': 'English',
      'lang.tr': 'Türkçe',
      'lang.ru': 'Русский',
      'lang.ar': 'العربية',
      'lang.es': 'Español',
      'lang.hi': 'हिन्दी',
      'lang.zh': '中文',
      'lang.de': 'Deutsch'
    }
  },
  ru: {
    translation: {
      'app.name': 'Dreamap',
      'app.tagline': 'Карта Коллективного Бессознательного',
      'nav.feed': 'Лента',
      'nav.globe': 'Глобус',
      'nav.auth': 'Войти',
      
      'hero.title': 'Сны Мира',
      'hero.subtitle': 'На Одной Карте',
      'hero.description': 'Юнгианские архетипы, коллективное бессознательное и общий опыт сновидений человечества',
      'hero.dreams': 'Снов',
      'hero.languages': 'Языков',
      'hero.archetypes': 'Архетипов',
      
      'feed.title': 'Последние Сны',
      'feed.loading': 'Загрузка снов...',
      'feed.empty': 'Пока нет снов',
      'feed.analysis': 'Юнгианский Анализ',
      
      'footer.text': 'Dreamap © 2026 - Цифровая Карта Коллективного Бессознательного',
      
      'lang.en': 'English',
      'lang.tr': 'Türkçe',
      'lang.ru': 'Русский',
      'lang.ar': 'العربية',
      'lang.es': 'Español',
      'lang.hi': 'हिन्दी',
      'lang.zh': '中文',
      'lang.de': 'Deutsch'
    }
  },
  ar: {
    translation: {
      'app.name': 'Dreamap',
      'app.tagline': 'خريطة اللاوعي الجمعي',
      'nav.feed': 'التغذية',
      'nav.globe': 'الكرة',
      'nav.auth': 'دخول',
      
      'hero.title': 'أحلام العالم',
      'hero.subtitle': 'في خريطة واحدة',
      'hero.description': 'الأرشetypes اليونغية، اللاوعي الجمعي، وتجارب الأحلام المشتركة للإنسانية',
      'hero.dreams': 'أحلام',
      'hero.languages': 'لغات',
      'hero.archetypes': 'أرشetypes',
      
      'feed.title': 'الأحلام الأخيرة',
      'feed.loading': 'جاري تحميل الأحلام...',
      'feed.empty': 'لا توجد أحلام بعد',
      'feed.analysis': 'التحليل اليونغي',
      
      'footer.text': 'Dreamap © 2026 - الخريطة الرقمية للاوعي الجمعي',
      
      'lang.en': 'English',
      'lang.tr': 'Türkçe',
      'lang.ru': 'Русский',
      'lang.ar': 'العربية',
      'lang.es': 'Español',
      'lang.hi': 'हिन्दी',
      'lang.zh': '中文',
      'lang.de': 'Deutsch'
    }
  },
  es: {
    translation: {
      'app.name': 'Dreamap',
      'app.tagline': 'Mapa del Inconsciente Colectivo',
      'nav.feed': 'Feed',
      'nav.globe': 'Globo',
      'nav.auth': 'Entrar',
      
      'hero.title': 'Los Sueños del Mundo',
      'hero.subtitle': 'En Un Solo Mapa',
      'hero.description': 'Arquetipos junguianos, inconsciente colectivo y experiencias oníricas compartidas de la humanidad',
      'hero.dreams': 'Sueños',
      'hero.languages': 'Idiomas',
      'hero.archetypes': 'Arquetipos',
      
      'feed.title': 'Sueños Recientes',
      'feed.loading': 'Cargando sueños...',
      'feed.empty': 'Aún no hay sueños',
      'feed.analysis': 'Análisis Junguiano',
      
      'footer.text': 'Dreamap © 2026 - Mapa Digital del Inconsciente Colectivo',
      
      'lang.en': 'English',
      'lang.tr': 'Türkçe',
      'lang.ru': 'Русский',
      'lang.ar': 'العربية',
      'lang.es': 'Español',
      'lang.hi': 'हिन्दी',
      'lang.zh': '中文',
      'lang.de': 'Deutsch'
    }
  },
  hi: {
    translation: {
      'app.name': 'Dreamap',
      'app.tagline': 'सामूहिक अवचेतन का मानचित्र',
      'nav.feed': 'फीड',
      'nav.globe': 'ग्लोब',
      'nav.auth': 'लॉगिन',
      
      'hero.title': 'दुनिया के सपने',
      'hero.subtitle': 'एक मानचित्र में',
      'hero.description': 'जुंगियन आर्केटाइप, सामूहिक अवचेतन, और मानवता के साझा सपनों के अनुभव',
      'hero.dreams': 'सपने',
      'hero.languages': 'भाषाएँ',
      'hero.archetypes': 'आर्केटाइप',
      
      'feed.title': 'हाल के सपने',
      'feed.loading': 'सपने लोड हो रहे हैं...',
      'feed.empty': 'अभी तक कोई सपना नहीं',
      'feed.analysis': 'जुंगियन विश्लेषण',
      
      'footer.text': 'Dreamap © 2026 - सामूहिक अवचेतन का डिजिटल मानचित्र',
      
      'lang.en': 'English',
      'lang.tr': 'Türkçe',
      'lang.ru': 'Русский',
      'lang.ar': 'العربية',
      'lang.es': 'Español',
      'lang.hi': 'हिन्दी',
      'lang.zh': '中文',
      'lang.de': 'Deutsch'
    }
  },
  zh: {
    translation: {
      'app.name': 'Dreamap',
      'app.tagline': '集体无意识地图',
      'nav.feed': '动态',
      'nav.globe': '地球',
      'nav.auth': '登录',
      
      'hero.title': '世界的梦',
      'hero.subtitle': '在一张地图上',
      'hero.description': '荣格原型、集体无意识和人类共同的梦境体验',
      'hero.dreams': '梦',
      'hero.languages': '语言',
      'hero.archetypes': '原型',
      
      'feed.title': '最近的梦',
      'feed.loading': '正在加载梦...',
      'feed.empty': '还没有梦',
      'feed.analysis': '荣格分析',
      
      'footer.text': 'Dreamap © 2026 - 集体无意识的数字地图',
      
      'lang.en': 'English',
      'lang.tr': 'Türkçe',
      'lang.ru': 'Русский',
      'lang.ar': 'العربية',
      'lang.es': 'Español',
      'lang.hi': 'हिन्दी',
      'lang.zh': '中文',
      'lang.de': 'Deutsch'
    }
  },
  de: {
    translation: {
      'app.name': 'Dreamap',
      'app.tagline': 'Karte des Kollektiven Unbewussten',
      'nav.feed': 'Feed',
      'nav.globe': 'Globus',
      'nav.auth': 'Anmelden',
      
      'hero.title': 'Die Träume der Welt',
      'hero.subtitle': 'Auf Einer Karte',
      'hero.description': 'Jungianische Archetypen, kollektives Unbewusstes und die gemeinsamen Traumerfahrungen der Menschheit',
      'hero.dreams': 'Träume',
      'hero.languages': 'Sprachen',
      'hero.archetypes': 'Archetypen',
      
      'feed.title': 'Neueste Träume',
      'feed.loading': 'Träume werden geladen...',
      'feed.empty': 'Noch keine Träume',
      'feed.analysis': 'Jungianische Analyse',
      
      'footer.text': 'Dreamap © 2026 - Digitale Karte des Kollektiven Unbewussten',
      
      'lang.en': 'English',
      'lang.tr': 'Türkçe',
      'lang.ru': 'Русский',
      'lang.ar': 'العربية',
      'lang.es': 'Español',
      'lang.hi': 'हिन्दी',
      'lang.zh': '中文',
      'lang.de': 'Deutsch'
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
