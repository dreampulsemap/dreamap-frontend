import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const rtlLanguages = ['ar']

const resources = {
  en: {
    translation: {
      'app.name': 'Lunosfer',
      'app.tagline': 'Social Dream Map of the Collective Unconscious',

      'common.back': 'Back',
      'common.retry': 'Retry',
      'common.language': 'Language',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.close': 'Close',
      'common.loading': 'Loading...',

      'nav.feed': 'Feed',
      'nav.globe': 'Globe',
      'nav.auth': 'Login',

      'hero.title': "The World's Dreams",
      'hero.subtitle': 'In One Map',
      'hero.description': "Jungian archetypes, the collective unconscious, and humanity's shared dream experiences",
      'hero.dreams': 'Dreams',
      'hero.languages': 'Languages',
      'hero.archetypes': 'Archetypes',

      'feed.title': 'Recent Dreams',
      'feed.loading': 'Loading dreams...',
      'feed.empty': 'No dreams yet',
      'feed.analysis': 'Jungian Analysis',

      'prophecy.title': "Today's Prophecy",
      'prophecy.advice': 'Dream Advice',

      'footer.text': 'Lunosfer © 2026 - Digital Social Dream Map of the Collective Unconscious',

      'globe.totalDreams': 'Total Dreams',
      'globe.emotionColors': 'Emotion Colors',
      'globe.exploreFull': 'Explore Full Globe →',
      'globe.loading': 'Loading globe...',
      'globe.noDreams': 'No dreams in this period',
      'globe.libraryError': 'Globe library not loaded. Please refresh.',
      'globe.libraryFailed': 'Three Globe library could not be loaded',
      'globe.initFailed': 'Globe could not be initialized',
      'globe.retry': 'Retry',
      'globe.backToFeed': 'Feed',
      'globe.globeLoading': 'Loading 3D Globe...',
      'globe.collectivePredictions': 'Collective Predictions',
      'globe.dreamCount': 'dreams',
      'globe.deletedContent': '[Content deleted]',
      'globe.translating': 'Translating...',
      'globe.showOriginal': 'Show original',
      'globe.translateToLanguage': 'Translate to {{lang}}',
      'globe.jungianAnalysis': 'Jungian Analysis',
      'globe.errorOccurred': 'An error occurred',
      'globe.promiseRejected': 'Promise rejected',
      'globe.errorLineCol': 'line: {{line}}, column: {{col}}',
      'globe.metaTitle': 'Lunosfer — Interactive Dream Globe',
      'globe.metaDescription': "Explore dreams and collective predictions on Lunosfer's interactive 3D globe.",

      'filter.1h': '⏱️ Last Hour',
      'filter.24h': '🕐 Last 24 Hours',
      'filter.1w': '📅 Last Week',
      'filter.1m': '🗓️ Last Month',
      'filter.1y': '📆 Last Year',
      'filter.all': '🌍 All Time',
      'filter.custom': '🎯 Custom Range',
      'filter.startDate': 'Start Date',
      'filter.endDate': 'End Date',
      'filter.apply': '🔍 Apply Filter',

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
      'app.name': 'Lunosfer',
      'app.tagline': 'Kolektif Bilinçdışının Sosyal Rüya Haritası',

      'common.back': 'Geri',
      'common.retry': 'Yeniden dene',
      'common.language': 'Dil',
      'common.save': 'Kaydet',
      'common.cancel': 'İptal',
      'common.close': 'Kapat',
      'common.loading': 'Yükleniyor...',

      'nav.feed': 'Akış',
      'nav.globe': 'Küre',
      'nav.auth': 'Giriş',

      'hero.title': 'Dünyanın Rüyaları',
      'hero.subtitle': 'Tek Bir Haritada',
      'hero.description': 'Jungyen arketipler, kolektif bilinçdışı ve insanlığın ortak rüya deneyimleri',
      'hero.dreams': 'Rüya',
      'hero.languages': 'Dil',
      'hero.archetypes': 'Arketip',

      'feed.title': 'Son Rüyalar',
      'feed.loading': 'Rüyalar yükleniyor...',
      'feed.empty': 'Henüz rüya yok',
      'feed.analysis': 'Jungyen Analiz',

      'prophecy.title': 'Bugünün Kehaneti',
      'prophecy.advice': 'Rüya Tavsiyesi',

      'footer.text': 'Lunosfer © 2026 - Kolektif Bilinçdışının Dijital Sosyal Rüya Haritası',

      'globe.totalDreams': 'Toplam Rüya',
      'globe.emotionColors': 'Duygu Renkleri',
      'globe.exploreFull': "Tam Küre'yi Keşfet →",
      'globe.loading': 'Küre yükleniyor...',
      'globe.noDreams': 'Bu dönemde rüya bulunamadı',
      'globe.libraryError': 'Küre kütüphanesi yüklenemedi. Lütfen yenileyin.',
      'globe.libraryFailed': 'Three Globe kütüphanesi yüklenemedi',
      'globe.initFailed': 'Globe başlatılamadı',
      'globe.retry': 'Tekrar Dene',
      'globe.backToFeed': 'Akış',
      'globe.globeLoading': '3D Küre Yükleniyor...',
      'globe.collectivePredictions': 'Kolektif Öngörüler',
      'globe.dreamCount': 'rüya',
      'globe.deletedContent': '[İçerik silindi]',
      'globe.translating': 'Çevriliyor...',
      'globe.showOriginal': 'Orijinali göster',
      'globe.translateToLanguage': '{{lang}} diline çevir',
      'globe.jungianAnalysis': 'Jungyen Analiz',
      'globe.errorOccurred': 'Bir hata oluştu',
      'globe.promiseRejected': 'Promise reddedildi',
      'globe.errorLineCol': 'satır: {{line}}, sütun: {{col}}',
      'globe.metaTitle': 'Lunosfer — İnteraktif Rüya Küresi',
      'globe.metaDescription': "Lunosfer'in interaktif 3D küresiyle rüyaları ve kolektif öngörüleri keşfet.",

      'filter.1h': '⏱️ Son 1 Saat',
      'filter.24h': '🕐 Son 24 Saat',
      'filter.1w': '📅 Son 1 Hafta',
      'filter.1m': '🗓️ Son 1 Ay',
      'filter.1y': '📆 Son 1 Yıl',
      'filter.all': '🌍 Tüm Zamanlar',
      'filter.custom': '🎯 Özel Aralık',
      'filter.startDate': 'Başlangıç Tarihi',
      'filter.endDate': 'Bitiş Tarihi',
      'filter.apply': '🔍 Filtreyi Uygula',

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
      'app.name': 'Lunosfer',
      'app.tagline': 'Социальная карта снов коллективного бессознательного',

      'common.back': 'Назад',
      'common.retry': 'Повторить',
      'common.language': 'Язык',
      'common.save': 'Сохранить',
      'common.cancel': 'Отмена',
      'common.close': 'Закрыть',
      'common.loading': 'Загрузка...',

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

      'prophecy.title': 'Пророчество Дня',
      'prophecy.advice': 'Совет о Снах',

      'footer.text': 'Lunosfer © 2026 - Цифровая социальная карта снов коллективного бессознательного',

      'globe.totalDreams': 'Всего снов',
      'globe.emotionColors': 'Цвета эмоций',
      'globe.exploreFull': 'Полный глобус →',
      'globe.loading': 'Загрузка глобуса...',
      'globe.noDreams': 'В этот период снов нет',
      'globe.libraryError': 'Библиотека глобуса не загружена. Обновите страницу.',
      'globe.libraryFailed': 'Не удалось загрузить библиотеку Three Globe',
      'globe.initFailed': 'Не удалось инициализировать глобус',
      'globe.retry': 'Повторить',
      'globe.backToFeed': 'Лента',
      'globe.globeLoading': 'Загрузка 3D-глобуса...',
      'globe.collectivePredictions': 'Коллективные предсказания',
      'globe.dreamCount': 'снов',
      'globe.deletedContent': '[Содержимое удалено]',
      'globe.translating': 'Перевод...',
      'globe.showOriginal': 'Показать оригинал',
      'globe.translateToLanguage': 'Перевести на {{lang}}',
      'globe.jungianAnalysis': 'Юнгианский анализ',
      'globe.errorOccurred': 'Произошла ошибка',
      'globe.promiseRejected': 'Promise отклонён',
      'globe.errorLineCol': 'строка: {{line}}, столбец: {{col}}',
      'globe.metaTitle': 'Lunosfer — интерактивный глобус сновидений',
      'globe.metaDescription': 'Исследуйте сны и коллективные предсказания на интерактивном 3D-глобусе Lunosfer.',

      'filter.1h': '⏱️ Последний час',
      'filter.24h': '🕐 Последние 24 часа',
      'filter.1w': '📅 Последняя неделя',
      'filter.1m': '🗓️ Последний месяц',
      'filter.1y': '📆 Последний год',
      'filter.all': '🌍 Все время',
      'filter.custom': '🎯 Произвольный диапазон',
      'filter.startDate': 'Дата начала',
      'filter.endDate': 'Дата окончания',
      'filter.apply': '🔍 Применить фильтр',

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
      'app.name': 'Lunosfer',
      'app.tagline': 'الخريطة الاجتماعية للأحلام في اللاوعي الجمعي',

      'common.back': 'رجوع',
      'common.retry': 'إعادة المحاولة',
      'common.language': 'اللغة',
      'common.save': 'حفظ',
      'common.cancel': 'إلغاء',
      'common.close': 'إغلاق',
      'common.loading': 'جارٍ التحميل...',

      'nav.feed': 'التغذية',
      'nav.globe': 'الكرة',
      'nav.auth': 'تسجيل الدخول',

      'hero.title': 'أحلام العالم',
      'hero.subtitle': 'في خريطة واحدة',
      'hero.description': 'النماذج الأصلية اليونغية، اللاوعي الجمعي، وتجارب الأحلام المشتركة للإنسانية',
      'hero.dreams': 'أحلام',
      'hero.languages': 'لغات',
      'hero.archetypes': 'نماذج أصلية',

      'feed.title': 'الأحلام الأخيرة',
      'feed.loading': 'جارٍ تحميل الأحلام...',
      'feed.empty': 'لا توجد أحلام بعد',
      'feed.analysis': 'التحليل اليونغي',

      'prophecy.title': 'نبوءة اليوم',
      'prophecy.advice': 'نصيحة الأحلام',

      'footer.text': 'Lunosfer © 2026 - الخريطة الرقمية الاجتماعية لأحلام اللاوعي الجمعي',

      'globe.totalDreams': 'إجمالي الأحلام',
      'globe.emotionColors': 'ألوان المشاعر',
      'globe.exploreFull': 'استكشف الكرة الكاملة ←',
      'globe.loading': 'جارٍ تحميل الكرة...',
      'globe.noDreams': 'لا توجد أحلام في هذه الفترة',
      'globe.libraryError': 'لم يتم تحميل مكتبة الكرة. يرجى التحديث.',
      'globe.libraryFailed': 'تعذر تحميل مكتبة Three Globe',
      'globe.initFailed': 'تعذر تهيئة الكرة',
      'globe.retry': 'إعادة المحاولة',
      'globe.backToFeed': 'التغذية',
      'globe.globeLoading': 'جارٍ تحميل الكرة ثلاثية الأبعاد...',
      'globe.collectivePredictions': 'التنبؤات الجماعية',
      'globe.dreamCount': 'أحلام',
      'globe.deletedContent': '[تم حذف المحتوى]',
      'globe.translating': 'جارٍ الترجمة...',
      'globe.showOriginal': 'عرض النص الأصلي',
      'globe.translateToLanguage': 'الترجمة إلى {{lang}}',
      'globe.jungianAnalysis': 'التحليل اليونغي',
      'globe.errorOccurred': 'حدث خطأ',
      'globe.promiseRejected': 'تم رفض Promise',
      'globe.errorLineCol': 'السطر: {{line}}، العمود: {{col}}',
      'globe.metaTitle': 'Lunosfer — كرة الأحلام التفاعلية',
      'globe.metaDescription': 'استكشف الأحلام والتنبؤات الجماعية على الكرة ثلاثية الأبعاد التفاعلية من Lunosfer.',

      'filter.1h': '⏱️ الساعة الأخيرة',
      'filter.24h': '🕐 آخر 24 ساعة',
      'filter.1w': '📅 الأسبوع الماضي',
      'filter.1m': '🗓️ الشهر الماضي',
      'filter.1y': '📆 السنة الماضية',
      'filter.all': '🌍 كل الأوقات',
      'filter.custom': '🎯 نطاق مخصص',
      'filter.startDate': 'تاريخ البدء',
      'filter.endDate': 'تاريخ الانتهاء',
      'filter.apply': '🔍 تطبيق الفلتر',

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
      'app.name': 'Lunosfer',
      'app.tagline': 'Mapa social de sueños del inconsciente colectivo',

      'common.back': 'Atrás',
      'common.retry': 'Reintentar',
      'common.language': 'Idioma',
      'common.save': 'Guardar',
      'common.cancel': 'Cancelar',
      'common.close': 'Cerrar',
      'common.loading': 'Cargando...',

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

      'prophecy.title': 'Profecía de Hoy',
      'prophecy.advice': 'Consejo de Sueños',

      'footer.text': 'Lunosfer © 2026 - Mapa digital social de sueños del inconsciente colectivo',

      'globe.totalDreams': 'Total de Sueños',
      'globe.emotionColors': 'Colores de Emociones',
      'globe.exploreFull': 'Explorar Globo Completo →',
      'globe.loading': 'Cargando globo...',
      'globe.noDreams': 'No hay sueños en este período',
      'globe.libraryError': 'Biblioteca del globo no cargada. Por favor, actualice.',
      'globe.libraryFailed': 'La biblioteca Three Globe no se pudo cargar',
      'globe.initFailed': 'El globo no se pudo inicializar',
      'globe.retry': 'Reintentar',
      'globe.backToFeed': 'Feed',
      'globe.globeLoading': 'Cargando globo 3D...',
      'globe.collectivePredictions': 'Predicciones colectivas',
      'globe.dreamCount': 'sueños',
      'globe.deletedContent': '[Contenido eliminado]',
      'globe.translating': 'Traduciendo...',
      'globe.showOriginal': 'Mostrar original',
      'globe.translateToLanguage': 'Traducir a {{lang}}',
      'globe.jungianAnalysis': 'Análisis junguiano',
      'globe.errorOccurred': 'Ocurrió un error',
      'globe.promiseRejected': 'Promesa rechazada',
      'globe.errorLineCol': 'línea: {{line}}, columna: {{col}}',
      'globe.metaTitle': 'Lunosfer — Globo de sueños interactivo',
      'globe.metaDescription': 'Explora sueños y predicciones colectivas en el globo 3D interactivo de Lunosfer.',

      'filter.1h': '⏱️ Última Hora',
      'filter.24h': '🕐 Últimas 24 Horas',
      'filter.1w': '📅 Última Semana',
      'filter.1m': '🗓️ Último Mes',
      'filter.1y': '📆 Último Año',
      'filter.all': '🌍 Todo el Tiempo',
      'filter.custom': '🎯 Rango Personalizado',
      'filter.startDate': 'Fecha de Inicio',
      'filter.endDate': 'Fecha de Fin',
      'filter.apply': '🔍 Aplicar Filtro',

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
      'app.name': 'Lunosfer',
      'app.tagline': 'सामूहिक अवचेतन का सामाजिक स्वप्न मानचित्र',

      'common.back': 'वापस',
      'common.retry': 'फिर प्रयास करें',
      'common.language': 'भाषा',
      'common.save': 'सहेजें',
      'common.cancel': 'रद्द करें',
      'common.close': 'बंद करें',
      'common.loading': 'लोड हो रहा है...',

      'nav.feed': 'फीड',
      'nav.globe': 'ग्लोब',
      'nav.auth': 'लॉगिन',

      'hero.title': 'दुनिया के सपने',
      'hero.subtitle': 'एक मानचित्र में',
      'hero.description': 'जुंगियन आर्केटाइप, सामूहिक अवचेतन, और मानवता के साझा स्वप्न अनुभव',
      'hero.dreams': 'सपने',
      'hero.languages': 'भाषाएँ',
      'hero.archetypes': 'आर्केटाइप',

      'feed.title': 'हाल के सपने',
      'feed.loading': 'सपने लोड हो रहे हैं...',
      'feed.empty': 'अभी तक कोई सपना नहीं',
      'feed.analysis': 'जुंगियन विश्लेषण',

      'prophecy.title': 'आज की भविष्यवाणी',
      'prophecy.advice': 'सपनों की सलाह',

      'footer.text': 'Lunosfer © 2026 - सामूहिक अवचेतन का डिजिटल सामाजिक स्वप्न मानचित्र',

      'globe.totalDreams': 'कुल सपने',
      'globe.emotionColors': 'भावनाओं के रंग',
      'globe.exploreFull': 'पूरा ग्लोब देखें →',
      'globe.loading': 'ग्लोब लोड हो रहा है...',
      'globe.noDreams': 'इस अवधि में कोई सपना नहीं',
      'globe.libraryError': 'ग्लोब लाइब्रेरी लोड नहीं हुई। कृपया रिफ्रेश करें।',
      'globe.libraryFailed': 'Three Globe लाइब्रेरी लोड नहीं हो सकी',
      'globe.initFailed': 'ग्लोब प्रारंभ नहीं हो सका',
      'globe.retry': 'पुनः प्रयास करें',
      'globe.backToFeed': 'फीड',
      'globe.globeLoading': '3D ग्लोब लोड हो रहा है...',
      'globe.collectivePredictions': 'सामूहिक भविष्यवाणियाँ',
      'globe.dreamCount': 'सपने',
      'globe.deletedContent': '[सामग्री हटाई गई]',
      'globe.translating': 'अनुवाद हो रहा है...',
      'globe.showOriginal': 'मूल दिखाएँ',
      'globe.translateToLanguage': '{{lang}} में अनुवाद करें',
      'globe.jungianAnalysis': 'जुंगियन विश्लेषण',
      'globe.errorOccurred': 'एक त्रुटि हुई',
      'globe.promiseRejected': 'Promise अस्वीकृत',
      'globe.errorLineCol': 'पंक्ति: {{line}}, स्तंभ: {{col}}',
      'globe.metaTitle': 'Lunosfer — इंटरैक्टिव ड्रीम ग्लोब',
      'globe.metaDescription': 'Lunosfer के इंटरैक्टिव 3D ग्लोब पर सपनों और सामूहिक भविष्यवाणियों का अन्वेषण करें।',

      'filter.1h': '⏱️ पिछला घंटा',
      'filter.24h': '🕐 पिछले 24 घंटे',
      'filter.1w': '📅 पिछला सप्ताह',
      'filter.1m': '🗓️ पिछला महीना',
      'filter.1y': '📆 पिछला साल',
      'filter.all': '🌍 सभी समय',
      'filter.custom': '🎯 कस्टम रेंज',
      'filter.startDate': 'आरंभ तिथि',
      'filter.endDate': 'समाप्ति तिथि',
      'filter.apply': '🔍 फ़िल्टर लागू करें',

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
      'app.name': 'Lunosfer',
      'app.tagline': '集体无意识的社交梦境地图',

      'common.back': '返回',
      'common.retry': '重试',
      'common.language': '语言',
      'common.save': '保存',
      'common.cancel': '取消',
      'common.close': '关闭',
      'common.loading': '加载中...',

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

      'prophecy.title': '今日预言',
      'prophecy.advice': '梦境建议',

      'footer.text': 'Lunosfer © 2026 - 集体无意识的数字社交梦境地图',

      'globe.totalDreams': '总梦数',
      'globe.emotionColors': '情感颜色',
      'globe.exploreFull': '探索完整地球 →',
      'globe.loading': '正在加载地球...',
      'globe.noDreams': '此期间没有梦',
      'globe.libraryError': '地球库未加载。请刷新。',
      'globe.libraryFailed': '无法加载 Three Globe 库',
      'globe.initFailed': '无法初始化地球',
      'globe.retry': '重试',
      'globe.backToFeed': '动态',
      'globe.globeLoading': '正在加载 3D 地球...',
      'globe.collectivePredictions': '集体预测',
      'globe.dreamCount': '个梦',
      'globe.deletedContent': '[内容已删除]',
      'globe.translating': '翻译中...',
      'globe.showOriginal': '显示原文',
      'globe.translateToLanguage': '翻译为 {{lang}}',
      'globe.jungianAnalysis': '荣格分析',
      'globe.errorOccurred': '发生错误',
      'globe.promiseRejected': 'Promise 被拒绝',
      'globe.errorLineCol': '行: {{line}}，列: {{col}}',
      'globe.metaTitle': 'Lunosfer — 交互式梦境地球',
      'globe.metaDescription': '在 Lunosfer 的交互式 3D 地球上探索梦境与集体预测。',

      'filter.1h': '⏱️ 最近一小时',
      'filter.24h': '🕐 最近24小时',
      'filter.1w': '📅 最近一周',
      'filter.1m': '🗓️ 最近一个月',
      'filter.1y': '📆 最近一年',
      'filter.all': '🌍 所有时间',
      'filter.custom': '🎯 自定义范围',
      'filter.startDate': '开始日期',
      'filter.endDate': '结束日期',
      'filter.apply': '🔍 应用筛选',

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
      'app.name': 'Lunosfer',
      'app.tagline': 'Soziale Traumkarte des kollektiven Unbewussten',

      'common.back': 'Zurück',
      'common.retry': 'Erneut versuchen',
      'common.language': 'Sprache',
      'common.save': 'Speichern',
      'common.cancel': 'Abbrechen',
      'common.close': 'Schließen',
      'common.loading': 'Wird geladen...',

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

      'prophecy.title': 'Heutige Prophezeiung',
      'prophecy.advice': 'Traumratschlag',

      'footer.text': 'Lunosfer © 2026 - Digitale soziale Traumkarte des kollektiven Unbewussten',

      'globe.totalDreams': 'Gesamte Träume',
      'globe.emotionColors': 'Emotionsfarben',
      'globe.exploreFull': 'Vollständigen Globus erkunden →',
      'globe.loading': 'Globus wird geladen...',
      'globe.noDreams': 'In diesem Zeitraum keine Träume',
      'globe.libraryError': 'Globus-Bibliothek nicht geladen. Bitte aktualisieren.',
      'globe.libraryFailed': 'Three Globe Bibliothek konnte nicht geladen werden',
      'globe.initFailed': 'Globus konnte nicht initialisiert werden',
      'globe.retry': 'Wiederholen',
      'globe.backToFeed': 'Feed',
      'globe.globeLoading': '3D-Globus wird geladen...',
      'globe.collectivePredictions': 'Kollektive Vorhersagen',
      'globe.dreamCount': 'Träume',
      'globe.deletedContent': '[Inhalt gelöscht]',
      'globe.translating': 'Wird übersetzt...',
      'globe.showOriginal': 'Original anzeigen',
      'globe.translateToLanguage': 'In {{lang}} übersetzen',
      'globe.jungianAnalysis': 'Jungianische Analyse',
      'globe.errorOccurred': 'Ein Fehler ist aufgetreten',
      'globe.promiseRejected': 'Promise abgelehnt',
      'globe.errorLineCol': 'Zeile: {{line}}, Spalte: {{col}}',
      'globe.metaTitle': 'Lunosfer — Interaktiver Traumglobus',
      'globe.metaDescription': 'Erkunde Träume und kollektive Vorhersagen auf Lunosfers interaktivem 3D-Globus.',

      'filter.1h': '⏱️ Letzte Stunde',
      'filter.24h': '🕐 Letzte 24 Stunden',
      'filter.1w': '📅 Letzte Woche',
      'filter.1m': '🗓️ Letzter Monat',
      'filter.1y': '📆 Letztes Jahr',
      'filter.all': '🌍 Alle Zeiten',
      'filter.custom': '🎯 Benutzerdefinierter Bereich',
      'filter.startDate': 'Startdatum',
      'filter.endDate': 'Enddatum',
      'filter.apply': '🔍 Filter anwenden',

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

const supportedLngs = Object.keys(resources)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs,
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      caches: ['localStorage']
    },
    react: {
      useSuspense: false
    }
  })

const setDocumentLanguage = (lng) => {
  if (typeof document === 'undefined') return
  const normalized = (lng || 'en').split('-')[0]
  document.documentElement.lang = normalized
  document.documentElement.dir = rtlLanguages.includes(normalized) ? 'rtl' : 'ltr'
}

setDocumentLanguage(i18n.resolvedLanguage || i18n.language)

i18n.on('languageChanged', (lng) => {
  setDocumentLanguage(lng)
})

export default i18n