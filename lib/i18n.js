import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

export const resources = {
  en: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': 'Back to home',

      'auth.loading': 'Loading...',

      'common.errorGeneric': 'Something went wrong.',

      'location.unknown': 'Unknown location',

      'dream.addTitle': 'Share Your Dream',
      'dream.dreamText': 'Dream text',
      'dream.placeholder': 'Write your dream in as much detail as you remember...',
      'dream.location': 'Location',
      'dream.locationPlaceholder': 'City, country',
      'dream.shareOptions': 'Sharing Options',
      'dream.shareInFeed': 'Share in public feed',
      'dream.mapDetail': 'Map detail',
      'dream.fullText': 'Full text',
      'dream.summaryOnly': 'Summary only',
      'dream.visibility': 'Visibility',
      'dream.public': 'Public',
      'dream.friends': 'Friends only',
      'dream.private': 'Private',
      'dream.emotions': 'How did this dream feel?',
      'dream.emotionsHelp': 'Choose the emotion that best matches your dream experience.',
      'dream.submit': 'Submit Dream',
      'dream.validationContent': 'Please enter your dream text.',
      'dream.createFailed': 'Dream could not be created.',
      'dream.analysisFailed': 'Dream analysis could not be started.',

      'emotion.joy': 'Joy',
      'emotion.peace': 'Peace',
      'emotion.love': 'Love',
      'emotion.hope': 'Hope',
      'emotion.awe': 'Awe',
      'emotion.surprise': 'Surprise',
      'emotion.curiosity': 'Curiosity',
      'emotion.confusion': 'Confusion',
      'emotion.fear': 'Fear',
      'emotion.anxiety': 'Anxiety',
      'emotion.sadness': 'Sadness',
      'emotion.loneliness': 'Loneliness',
      'emotion.anger': 'Anger',
      'emotion.shame': 'Shame',
      'emotion.disgust': 'Disgust',
      'emotion.relief': 'Relief'
    }
  },

  tr: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': 'Ana sayfaya dön',

      'auth.loading': 'Yükleniyor...',

      'common.errorGeneric': 'Bir şeyler ters gitti.',

      'location.unknown': 'Bilinmeyen konum',

      'dream.addTitle': 'Rüyanı Paylaş',
      'dream.dreamText': 'Rüya metni',
      'dream.placeholder': 'Hatırladığın kadarıyla rüyanı ayrıntılı şekilde yaz...',
      'dream.location': 'Konum',
      'dream.locationPlaceholder': 'Şehir, ülke',
      'dream.shareOptions': 'Paylaşım Seçenekleri',
      'dream.shareInFeed': 'Herkese açık akışta paylaş',
      'dream.mapDetail': 'Harita detayı',
      'dream.fullText': 'Tam metin',
      'dream.summaryOnly': 'Sadece özet',
      'dream.visibility': 'Görünürlük',
      'dream.public': 'Herkese açık',
      'dream.friends': 'Sadece arkadaşlar',
      'dream.private': 'Özel',
      'dream.emotions': 'Bu rüya sana nasıl hissettirdi?',
      'dream.emotionsHelp': 'Rüya deneyimine en uygun duyguyu seç.',
      'dream.submit': 'Rüyayı Gönder',
      'dream.validationContent': 'Lütfen rüya metnini gir.',
      'dream.createFailed': 'Rüya oluşturulamadı.',
      'dream.analysisFailed': 'Rüya analizi başlatılamadı.',

      'emotion.joy': 'Neşe',
      'emotion.peace': 'Huzur',
      'emotion.love': 'Sevgi',
      'emotion.hope': 'Umut',
      'emotion.awe': 'Hayranlık',
      'emotion.surprise': 'Şaşkınlık',
      'emotion.curiosity': 'Merak',
      'emotion.confusion': 'Kafa karışıklığı',
      'emotion.fear': 'Korku',
      'emotion.anxiety': 'Kaygı',
      'emotion.sadness': 'Üzüntü',
      'emotion.loneliness': 'Yalnızlık',
      'emotion.anger': 'Öfke',
      'emotion.shame': 'Utanç',
      'emotion.disgust': 'İğrenme',
      'emotion.relief': 'Rahatlama'
    }
  },

  ru: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': 'Назад на главную',

      'auth.loading': 'Загрузка...',

      'common.errorGeneric': 'Что-то пошло не так.',

      'location.unknown': 'Неизвестное местоположение',

      'dream.addTitle': 'Поделитесь своим сном',
      'dream.dreamText': 'Текст сна',
      'dream.placeholder': 'Опишите свой сон как можно подробнее...',
      'dream.location': 'Местоположение',
      'dream.locationPlaceholder': 'Город, страна',
      'dream.shareOptions': 'Параметры публикации',
      'dream.shareInFeed': 'Поделиться в публичной ленте',
      'dream.mapDetail': 'Детализация на карте',
      'dream.fullText': 'Полный текст',
      'dream.summaryOnly': 'Только краткое содержание',
      'dream.visibility': 'Видимость',
      'dream.public': 'Публично',
      'dream.friends': 'Только для друзей',
      'dream.private': 'Приватно',
      'dream.emotions': 'Что вы почувствовали во сне?',
      'dream.emotionsHelp': 'Выберите эмоцию, которая лучше всего соответствует вашему сну.',
      'dream.submit': 'Отправить сон',
      'dream.validationContent': 'Пожалуйста, введите текст сна.',
      'dream.createFailed': 'Не удалось создать сон.',
      'dream.analysisFailed': 'Не удалось запустить анализ сна.',

      'emotion.joy': 'Радость',
      'emotion.peace': 'Покой',
      'emotion.love': 'Любовь',
      'emotion.hope': 'Надежда',
      'emotion.awe': 'Восхищение',
      'emotion.surprise': 'Удивление',
      'emotion.curiosity': 'Любопытство',
      'emotion.confusion': 'Замешательство',
      'emotion.fear': 'Страх',
      'emotion.anxiety': 'Тревога',
      'emotion.sadness': 'Грусть',
      'emotion.loneliness': 'Одиночество',
      'emotion.anger': 'Гнев',
      'emotion.shame': 'Стыд',
      'emotion.disgust': 'Отвращение',
      'emotion.relief': 'Облегчение'
    }
  },

  ar: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': 'العودة إلى الصفحة الرئيسية',

      'auth.loading': 'جارٍ التحميل...',

      'common.errorGeneric': 'حدث خطأ ما.',

      'location.unknown': 'موقع غير معروف',

      'dream.addTitle': 'شارك حلمك',
      'dream.dreamText': 'نص الحلم',
      'dream.placeholder': 'اكتب حلمك بأكبر قدر من التفاصيل التي تتذكرها...',
      'dream.location': 'الموقع',
      'dream.locationPlaceholder': 'المدينة، البلد',
      'dream.shareOptions': 'خيارات المشاركة',
      'dream.shareInFeed': 'المشاركة في الخلاصة العامة',
      'dream.mapDetail': 'تفاصيل الخريطة',
      'dream.fullText': 'النص الكامل',
      'dream.summaryOnly': 'الملخص فقط',
      'dream.visibility': 'إمكانية الظهور',
      'dream.public': 'عام',
      'dream.friends': 'للأصدقاء فقط',
      'dream.private': 'خاص',
      'dream.emotions': 'كيف جعلك هذا الحلم تشعر؟',
      'dream.emotionsHelp': 'اختر الشعور الأقرب إلى تجربتك في الحلم.',
      'dream.submit': 'إرسال الحلم',
      'dream.validationContent': 'يرجى إدخال نص الحلم.',
      'dream.createFailed': 'تعذر إنشاء الحلم.',
      'dream.analysisFailed': 'تعذر بدء تحليل الحلم.',

      'emotion.joy': 'فرح',
      'emotion.peace': 'سلام',
      'emotion.love': 'حب',
      'emotion.hope': 'أمل',
      'emotion.awe': 'رهبة',
      'emotion.surprise': 'دهشة',
      'emotion.curiosity': 'فضول',
      'emotion.confusion': 'ارتباك',
      'emotion.fear': 'خوف',
      'emotion.anxiety': 'قلق',
      'emotion.sadness': 'حزن',
      'emotion.loneliness': 'وحدة',
      'emotion.anger': 'غضب',
      'emotion.shame': 'خجل',
      'emotion.disgust': 'اشمئزاز',
      'emotion.relief': 'ارتياح'
    }
  },

  es: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': 'Volver al inicio',

      'auth.loading': 'Cargando...',

      'common.errorGeneric': 'Algo salió mal.',

      'location.unknown': 'Ubicación desconocida',

      'dream.addTitle': 'Comparte tu sueño',
      'dream.dreamText': 'Texto del sueño',
      'dream.placeholder': 'Escribe tu sueño con todo el detalle que recuerdes...',
      'dream.location': 'Ubicación',
      'dream.locationPlaceholder': 'Ciudad, país',
      'dream.shareOptions': 'Opciones de publicación',
      'dream.shareInFeed': 'Compartir en el feed público',
      'dream.mapDetail': 'Detalle del mapa',
      'dream.fullText': 'Texto completo',
      'dream.summaryOnly': 'Solo resumen',
      'dream.visibility': 'Visibilidad',
      'dream.public': 'Público',
      'dream.friends': 'Solo amigos',
      'dream.private': 'Privado',
      'dream.emotions': '¿Cómo te hizo sentir este sueño?',
      'dream.emotionsHelp': 'Elige la emoción que mejor represente tu experiencia del sueño.',
      'dream.submit': 'Enviar sueño',
      'dream.validationContent': 'Por favor, escribe el texto del sueño.',
      'dream.createFailed': 'No se pudo crear el sueño.',
      'dream.analysisFailed': 'No se pudo iniciar el análisis del sueño.',

      'emotion.joy': 'Alegría',
      'emotion.peace': 'Paz',
      'emotion.love': 'Amor',
      'emotion.hope': 'Esperanza',
      'emotion.awe': 'Asombro',
      'emotion.surprise': 'Sorpresa',
      'emotion.curiosity': 'Curiosidad',
      'emotion.confusion': 'Confusión',
      'emotion.fear': 'Miedo',
      'emotion.anxiety': 'Ansiedad',
      'emotion.sadness': 'Tristeza',
      'emotion.loneliness': 'Soledad',
      'emotion.anger': 'Ira',
      'emotion.shame': 'Vergüenza',
      'emotion.disgust': 'Asco',
      'emotion.relief': 'Alivio'
    }
  },

  hi: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': 'होम पर वापस जाएँ',

      'auth.loading': 'लोड हो रहा है...',

      'common.errorGeneric': 'कुछ गलत हो गया।',

      'location.unknown': 'अज्ञात स्थान',

      'dream.addTitle': 'अपना सपना साझा करें',
      'dream.dreamText': 'सपने का पाठ',
      'dream.placeholder': 'जितना याद हो उतने विस्तार से अपना सपना लिखें...',
      'dream.location': 'स्थान',
      'dream.locationPlaceholder': 'शहर, देश',
      'dream.shareOptions': 'साझा करने के विकल्प',
      'dream.shareInFeed': 'सार्वजनिक फ़ीड में साझा करें',
      'dream.mapDetail': 'मानचित्र विवरण',
      'dream.fullText': 'पूरा पाठ',
      'dream.summaryOnly': 'केवल सारांश',
      'dream.visibility': 'दृश्यता',
      'dream.public': 'सार्वजनिक',
      'dream.friends': 'केवल मित्र',
      'dream.private': 'निजी',
      'dream.emotions': 'इस सपने ने आपको कैसा महसूस कराया?',
      'dream.emotionsHelp': 'उस भावना को चुनें जो आपके सपने के अनुभव से सबसे अधिक मेल खाती हो।',
      'dream.submit': 'सपना जमा करें',
      'dream.validationContent': 'कृपया सपने का पाठ दर्ज करें।',
      'dream.createFailed': 'सपना बनाया नहीं जा सका।',
      'dream.analysisFailed': 'सपने का विश्लेषण शुरू नहीं हो सका।',

      'emotion.joy': 'आनंद',
      'emotion.peace': 'शांति',
      'emotion.love': 'प्रेम',
      'emotion.hope': 'आशा',
      'emotion.awe': 'विस्मय',
      'emotion.surprise': 'आश्चर्य',
      'emotion.curiosity': 'जिज्ञासा',
      'emotion.confusion': 'उलझन',
      'emotion.fear': 'भय',
      'emotion.anxiety': 'चिंता',
      'emotion.sadness': 'उदासी',
      'emotion.loneliness': 'अकेलापन',
      'emotion.anger': 'क्रोध',
      'emotion.shame': 'लज्जा',
      'emotion.disgust': 'घृणा',
      'emotion.relief': 'राहत'
    }
  },

  zh: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': '返回首页',

      'auth.loading': '加载中...',

      'common.errorGeneric': '出了点问题。',

      'location.unknown': '未知位置',

      'dream.addTitle': '分享你的梦',
      'dream.dreamText': '梦境内容',
      'dream.placeholder': '尽可能详细地写下你记得的梦...',
      'dream.location': '位置',
      'dream.locationPlaceholder': '城市，国家',
      'dream.shareOptions': '分享选项',
      'dream.shareInFeed': '分享到公开动态',
      'dream.mapDetail': '地图细节',
      'dream.fullText': '完整文本',
      'dream.summaryOnly': '仅摘要',
      'dream.visibility': '可见性',
      'dream.public': '公开',
      'dream.friends': '仅好友',
      'dream.private': '私密',
      'dream.emotions': '这个梦让你有什么感受？',
      'dream.emotionsHelp': '请选择最符合你梦境体验的情绪。',
      'dream.submit': '提交梦境',
      'dream.validationContent': '请输入梦境内容。',
      'dream.createFailed': '无法创建梦境。',
      'dream.analysisFailed': '无法开始梦境分析。',

      'emotion.joy': '喜悦',
      'emotion.peace': '平静',
      'emotion.love': '爱',
      'emotion.hope': '希望',
      'emotion.awe': '敬畏',
      'emotion.surprise': '惊讶',
      'emotion.curiosity': '好奇',
      'emotion.confusion': '困惑',
      'emotion.fear': '恐惧',
      'emotion.anxiety': '焦虑',
      'emotion.sadness': '悲伤',
      'emotion.loneliness': '孤独',
      'emotion.anger': '愤怒',
      'emotion.shame': '羞愧',
      'emotion.disgust': '厌恶',
      'emotion.relief': '释然'
    }
  },

  de: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': 'Zurück zur Startseite',

      'auth.loading': 'Wird geladen...',

      'common.errorGeneric': 'Etwas ist schiefgelaufen.',

      'location.unknown': 'Unbekannter Ort',

      'dream.addTitle': 'Teile deinen Traum',
      'dream.dreamText': 'Traumtext',
      'dream.placeholder': 'Schreibe deinen Traum so detailliert auf, wie du ihn erinnerst...',
      'dream.location': 'Ort',
      'dream.locationPlaceholder': 'Stadt, Land',
      'dream.shareOptions': 'Freigabeoptionen',
      'dream.shareInFeed': 'Im öffentlichen Feed teilen',
      'dream.mapDetail': 'Kartendetail',
      'dream.fullText': 'Volltext',
      'dream.summaryOnly': 'Nur Zusammenfassung',
      'dream.visibility': 'Sichtbarkeit',
      'dream.public': 'Öffentlich',
      'dream.friends': 'Nur Freunde',
      'dream.private': 'Privat',
      'dream.emotions': 'Wie hat sich dieser Traum angefühlt?',
      'dream.emotionsHelp': 'Wähle die Emotion, die am besten zu deinem Traumerlebnis passt.',
      'dream.submit': 'Traum absenden',
      'dream.validationContent': 'Bitte gib deinen Traumtext ein.',
      'dream.createFailed': 'Traum konnte nicht erstellt werden.',
      'dream.analysisFailed': 'Traumanalyse konnte nicht gestartet werden.',

      'emotion.joy': 'Freude',
      'emotion.peace': 'Frieden',
      'emotion.love': 'Liebe',
      'emotion.hope': 'Hoffnung',
      'emotion.awe': 'Ehrfurcht',
      'emotion.surprise': 'Überraschung',
      'emotion.curiosity': 'Neugier',
      'emotion.confusion': 'Verwirrung',
      'emotion.fear': 'Angst',
      'emotion.anxiety': 'Anspannung',
      'emotion.sadness': 'Traurigkeit',
      'emotion.loneliness': 'Einsamkeit',
      'emotion.anger': 'Wut',
      'emotion.shame': 'Scham',
      'emotion.disgust': 'Ekel',
      'emotion.relief': 'Erleichterung'
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'tr', 'ru', 'ar', 'es', 'hi', 'zh', 'de'],
    load: 'languageOnly',
    keySeparator: false,
    nsSeparator: false,
    returnNull: false,
    returnEmptyString: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie']
    },
    parseMissingKeyHandler: (key) => {
      return resources.en.translation[key] || key
    }
  })

export const normalizeLanguage = (lang) => {
  if (!lang) return 'en'
  const base = String(lang).toLowerCase().split('-')[0]
  return resources[base] ? base : 'en'
}

export const getTranslation = (key, lang = 'en') => {
  const normalized = normalizeLanguage(lang)
  return (
    resources?.[normalized]?.translation?.[key] ??
    resources?.en?.translation?.[key] ??
    key
  )
}

export default i18n