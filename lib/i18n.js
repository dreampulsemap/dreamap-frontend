import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

export const resources = {
  en: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': 'Back to home',
      'nav.home': 'Home',
      'nav.explore': 'Explore',
      'nav.vision': 'Vision',
      'nav.message': 'Messages',
      'nav.profile': 'Profile',
      'nav.newVision': 'New Vision',
      'nav.logDream': 'Log a Dream',

      'app.getApp': 'Get the app',
      'app.getAppShort': 'Get app',
      'app.downloadBannerText': 'Lunosfer is on Google Play — get instant notifications',
      'app.downloadBannerCta': 'Install',
      'app.downloadBannerClose': 'Dismiss',
      'app.pageTitle': 'Lunosfer in your pocket',
      'app.pageSubtitle': 'The Lunosfer Android app is live on Google Play. Same account, same dreams and visions — now with instant notifications.',
      'app.perkCapture': 'Log your dream the moment you wake up, before it fades',
      'app.perkNotify': 'Instant notifications for likes, comments and your dream analyses',
      'app.perkSync': 'Sign in with your existing account — everything stays in sync',
      'app.playCta': 'Get it on Google Play',
      'app.iosTitle': 'On an iPhone?',
      'app.iosNote': 'The iPhone app is on its way. Until then, add Lunosfer to your Home Screen and open it like an app.',
      'app.iosSteps': 'In Safari, tap Share → Add to Home Screen.',
      'app.backToSite': 'Back to Lunosfer',

      'notif.title': 'Notifications',
      'notif.autoAligned': 'Auto-synced',

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
      'nav.home': 'Ana Sayfa',
      'nav.explore': 'Keşfet',
      'nav.vision': 'Vizyon',
      'nav.message': 'Mesaj',
      'nav.profile': 'Profil',
      'nav.newVision': 'Yeni Vizyon Ekle',
      'nav.logDream': 'Yeni Rüya Anlat',

      'app.getApp': 'Uygulamayı indir',
      'app.getAppShort': 'Uygulama',
      'app.downloadBannerText': 'Lunosfer artık Google Play’de — anlık bildirimler cebinde',
      'app.downloadBannerCta': 'İndir',
      'app.downloadBannerClose': 'Kapat',
      'app.pageTitle': 'Lunosfer artık cebinde',
      'app.pageSubtitle': 'Lunosfer Android uygulaması Google Play’de yayında. Aynı hesap, aynı rüyalar ve vizyonlar — üstelik anlık bildirimlerle.',
      'app.perkCapture': 'Uyanır uyanmaz, unutmadan rüyanı kaydet',
      'app.perkNotify': 'Beğeni, yorum ve rüya analizi sonuçlarından anında haberdar ol',
      'app.perkSync': 'Mevcut hesabınla giriş yap — her şey senkron kalır',
      'app.playCta': 'Google Play’den indir',
      'app.iosTitle': 'iPhone mu kullanıyorsun?',
      'app.iosNote': 'iPhone uygulaması yolda. O zamana kadar Lunosfer’i ana ekranına ekleyip uygulama gibi açabilirsin.',
      'app.iosSteps': 'Safari’de Paylaş → Ana Ekrana Ekle’ye dokun.',
      'app.backToSite': 'Lunosfer’e dön',

      'notif.title': 'Bildirimler',
      'notif.autoAligned': 'Otomatik Hizalı',

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
      'nav.home': 'Главная',
      'nav.explore': 'Обзор',
      'nav.vision': 'Видение',
      'nav.message': 'Сообщения',
      'nav.profile': 'Профиль',
      'nav.newVision': 'Новое видение',
      'nav.logDream': 'Записать сон',

      'app.getApp': 'Скачать приложение',
      'app.getAppShort': 'Скачать',
      'app.downloadBannerText': 'Lunosfer уже в Google Play — мгновенные уведомления на телефоне',
      'app.downloadBannerCta': 'Установить',
      'app.downloadBannerClose': 'Закрыть',
      'app.pageTitle': 'Lunosfer всегда под рукой',
      'app.pageSubtitle': 'Android-приложение Lunosfer уже доступно в Google Play. Тот же аккаунт, те же сны и видения — теперь с мгновенными уведомлениями.',
      'app.perkCapture': 'Записывайте сон сразу после пробуждения, пока он не забылся',
      'app.perkNotify': 'Мгновенные уведомления о лайках, комментариях и анализах снов',
      'app.perkSync': 'Входите в свой аккаунт — всё синхронизируется',
      'app.playCta': 'Скачать в Google Play',
      'app.iosTitle': 'У вас iPhone?',
      'app.iosNote': 'Приложение для iPhone уже в пути. А пока добавьте Lunosfer на экран «Домой» и открывайте его как приложение.',
      'app.iosSteps': 'В Safari нажмите «Поделиться» → «На экран „Домой“».',
      'app.backToSite': 'Вернуться в Lunosfer',

      'notif.title': 'Уведомления',
      'notif.autoAligned': 'Автосинхронизация',

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
      'nav.home': 'الرئيسية',
      'nav.explore': 'استكشاف',
      'nav.vision': 'الرؤية',
      'nav.message': 'الرسائل',
      'nav.profile': 'الملف الشخصي',
      'nav.newVision': 'رؤية جديدة',
      'nav.logDream': 'سجّل حلماً',

      'app.getApp': 'حمّل التطبيق',
      'app.getAppShort': 'التطبيق',
      'app.downloadBannerText': 'Lunosfer متاح الآن على Google Play — إشعارات فورية على هاتفك',
      'app.downloadBannerCta': 'تثبيت',
      'app.downloadBannerClose': 'إغلاق',
      'app.pageTitle': 'Lunosfer في جيبك',
      'app.pageSubtitle': 'تطبيق Lunosfer لأندرويد متاح الآن على Google Play. الحساب نفسه، والأحلام والرؤى نفسها — مع إشعارات فورية.',
      'app.perkCapture': 'سجّل حلمك فور استيقاظك قبل أن يتلاشى',
      'app.perkNotify': 'إشعارات فورية للإعجابات والتعليقات ونتائج تحليل أحلامك',
      'app.perkSync': 'سجّل الدخول بحسابك الحالي — كل شيء يبقى متزامنًا',
      'app.playCta': 'احصل عليه من Google Play',
      'app.iosTitle': 'تستخدم iPhone؟',
      'app.iosNote': 'تطبيق iPhone في الطريق. حتى ذلك الحين، أضف Lunosfer إلى الشاشة الرئيسية وافتحه كتطبيق.',
      'app.iosSteps': 'في Safari، اضغط مشاركة ← إضافة إلى الشاشة الرئيسية.',
      'app.backToSite': 'العودة إلى Lunosfer',

      'notif.title': 'الإشعارات',
      'notif.autoAligned': 'مزامنة تلقائية',

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
      'nav.home': 'Inicio',
      'nav.explore': 'Explorar',
      'nav.vision': 'Visión',
      'nav.message': 'Mensajes',
      'nav.profile': 'Perfil',
      'nav.newVision': 'Nueva visión',
      'nav.logDream': 'Registrar un sueño',

      'app.getApp': 'Descarga la app',
      'app.getAppShort': 'App',
      'app.downloadBannerText': 'Lunosfer ya está en Google Play — notificaciones al instante',
      'app.downloadBannerCta': 'Instalar',
      'app.downloadBannerClose': 'Cerrar',
      'app.pageTitle': 'Lunosfer en tu bolsillo',
      'app.pageSubtitle': 'La app de Lunosfer para Android ya está disponible en Google Play. La misma cuenta, los mismos sueños y visiones — ahora con notificaciones al instante.',
      'app.perkCapture': 'Registra tu sueño en cuanto despiertes, antes de que se desvanezca',
      'app.perkNotify': 'Notificaciones al instante de me gusta, comentarios y análisis de tus sueños',
      'app.perkSync': 'Inicia sesión con tu cuenta actual — todo se mantiene sincronizado',
      'app.playCta': 'Disponible en Google Play',
      'app.iosTitle': '¿Usas iPhone?',
      'app.iosNote': 'La app para iPhone está en camino. Mientras tanto, añade Lunosfer a tu pantalla de inicio y ábrelo como una app.',
      'app.iosSteps': 'En Safari, toca Compartir → Añadir a pantalla de inicio.',
      'app.backToSite': 'Volver a Lunosfer',

      'notif.title': 'Notificaciones',
      'notif.autoAligned': 'Sincronización automática',

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
      'nav.home': 'होम',
      'nav.explore': 'एक्सप्लोर',
      'nav.vision': 'विज़न',
      'nav.message': 'संदेश',
      'nav.profile': 'प्रोफ़ाइल',
      'nav.newVision': 'नया विज़न जोड़ें',
      'nav.logDream': 'सपना दर्ज करें',

      'app.getApp': 'ऐप डाउनलोड करें',
      'app.getAppShort': 'ऐप',
      'app.downloadBannerText': 'Lunosfer अब Google Play पर — तुरंत सूचनाएं पाएं',
      'app.downloadBannerCta': 'इंस्टॉल करें',
      'app.downloadBannerClose': 'बंद करें',
      'app.pageTitle': 'Lunosfer अब आपकी जेब में',
      'app.pageSubtitle': 'Lunosfer का Android ऐप अब Google Play पर उपलब्ध है। वही अकाउंट, वही सपने और विज़न — अब तुरंत सूचनाओं के साथ।',
      'app.perkCapture': 'जागते ही अपना सपना दर्ज करें, इससे पहले कि वह धुंधला हो जाए',
      'app.perkNotify': 'लाइक, कमेंट और सपनों के विश्लेषण की तुरंत सूचनाएं',
      'app.perkSync': 'अपने मौजूदा अकाउंट से साइन इन करें — सब कुछ सिंक रहता है',
      'app.playCta': 'Google Play पर पाएं',
      'app.iosTitle': 'iPhone इस्तेमाल करते हैं?',
      'app.iosNote': 'iPhone ऐप जल्द आ रहा है। तब तक Lunosfer को होम स्क्रीन पर जोड़ें और ऐप की तरह खोलें।',
      'app.iosSteps': 'Safari में शेयर → होम स्क्रीन में जोड़ें पर टैप करें।',
      'app.backToSite': 'Lunosfer पर वापस जाएं',

      'notif.title': 'सूचनाएं',
      'notif.autoAligned': 'स्वतः सिंक',

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
      'nav.home': '首页',
      'nav.explore': '探索',
      'nav.vision': '愿景',
      'nav.message': '消息',
      'nav.profile': '个人资料',
      'nav.newVision': '添加新愿景',
      'nav.logDream': '记录梦境',

      'app.getApp': '下载应用',
      'app.getAppShort': '下载',
      'app.downloadBannerText': 'Lunosfer 已上架 Google Play — 即时通知随身达',
      'app.downloadBannerCta': '安装',
      'app.downloadBannerClose': '关闭',
      'app.pageTitle': '把 Lunosfer 装进口袋',
      'app.pageSubtitle': 'Lunosfer 安卓应用已在 Google Play 上线。同一账号，同样的梦境与愿景——现在还有即时通知。',
      'app.perkCapture': '醒来第一时间记录梦境，趁它还未消散',
      'app.perkNotify': '点赞、评论和梦境分析结果即时通知',
      'app.perkSync': '使用现有账号登录——所有内容保持同步',
      'app.playCta': '在 Google Play 下载',
      'app.iosTitle': '使用 iPhone？',
      'app.iosNote': 'iPhone 版即将推出。在此之前，可将 Lunosfer 添加到主屏幕，像应用一样打开。',
      'app.iosSteps': '在 Safari 中点按“分享”→“添加到主屏幕”。',
      'app.backToSite': '返回 Lunosfer',

      'notif.title': '通知',
      'notif.autoAligned': '自动同步',

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
      'nav.home': 'Start',
      'nav.explore': 'Entdecken',
      'nav.vision': 'Vision',
      'nav.message': 'Nachrichten',
      'nav.profile': 'Profil',
      'nav.newVision': 'Neue Vision',
      'nav.logDream': 'Traum eintragen',

      'app.getApp': 'App herunterladen',
      'app.getAppShort': 'App',
      'app.downloadBannerText': 'Lunosfer ist jetzt bei Google Play — mit Sofort-Benachrichtigungen',
      'app.downloadBannerCta': 'Installieren',
      'app.downloadBannerClose': 'Schließen',
      'app.pageTitle': 'Lunosfer für die Hosentasche',
      'app.pageSubtitle': 'Die Lunosfer-App für Android ist jetzt bei Google Play verfügbar. Dasselbe Konto, dieselben Träume und Visionen — jetzt mit Sofort-Benachrichtigungen.',
      'app.perkCapture': 'Halte deinen Traum direkt nach dem Aufwachen fest, bevor er verblasst',
      'app.perkNotify': 'Sofort-Benachrichtigungen zu Likes, Kommentaren und deinen Traumanalysen',
      'app.perkSync': 'Melde dich mit deinem bestehenden Konto an — alles bleibt synchron',
      'app.playCta': 'Jetzt bei Google Play',
      'app.iosTitle': 'Du nutzt ein iPhone?',
      'app.iosNote': 'Die iPhone-App ist unterwegs. Bis dahin kannst du Lunosfer zum Home-Bildschirm hinzufügen und wie eine App öffnen.',
      'app.iosSteps': 'Tippe in Safari auf Teilen → Zum Home-Bildschirm.',
      'app.backToSite': 'Zurück zu Lunosfer',

      'notif.title': 'Benachrichtigungen',
      'notif.autoAligned': 'Automatisch synchronisiert',

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
  },

  fr: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': 'Retour à l’accueil',
      'nav.home': 'Accueil',
      'nav.explore': 'Explorer',
      'nav.vision': 'Vision',
      'nav.message': 'Messages',
      'nav.profile': 'Profil',
      'nav.newVision': 'Nouvelle vision',
      'nav.logDream': 'Enregistrer un rêve',

      'app.getApp': 'Télécharger l’appli',
      'app.getAppShort': 'Appli',
      'app.downloadBannerText': 'Lunosfer est sur Google Play — notifications instantanées',
      'app.downloadBannerCta': 'Installer',
      'app.downloadBannerClose': 'Fermer',
      'app.pageTitle': 'Lunosfer dans votre poche',
      'app.pageSubtitle': 'L’appli Android de Lunosfer est disponible sur Google Play. Le même compte, les mêmes rêves et visions — avec des notifications instantanées.',
      'app.perkCapture': 'Notez votre rêve dès le réveil, avant qu’il ne s’efface',
      'app.perkNotify': 'Notifications instantanées pour les j’aime, commentaires et analyses de vos rêves',
      'app.perkSync': 'Connectez-vous avec votre compte actuel — tout reste synchronisé',
      'app.playCta': 'Disponible sur Google Play',
      'app.iosTitle': 'Vous avez un iPhone ?',
      'app.iosNote': 'L’appli iPhone arrive bientôt. En attendant, ajoutez Lunosfer à votre écran d’accueil pour l’ouvrir comme une appli.',
      'app.iosSteps': 'Dans Safari, touchez Partager → Sur l’écran d’accueil.',
      'app.backToSite': 'Retour à Lunosfer',

      'notif.title': 'Notifications',
      'notif.autoAligned': 'Synchronisé automatiquement',

      'auth.loading': 'Chargement...',

      'common.errorGeneric': 'Une erreur s’est produite.',

      'location.unknown': 'Lieu inconnu',

      'dream.addTitle': 'Partage ton rêve',
      'dream.dreamText': 'Texte du rêve',
      'dream.placeholder': 'Écris ton rêve avec autant de détails que tu t’en souviens...',
      'dream.location': 'Lieu',
      'dream.locationPlaceholder': 'Ville, pays',
      'dream.shareOptions': 'Options de partage',
      'dream.shareInFeed': 'Partager dans le fil public',
      'dream.mapDetail': 'Détail de la carte',
      'dream.fullText': 'Texte complet',
      'dream.summaryOnly': 'Résumé uniquement',
      'dream.visibility': 'Visibilité',
      'dream.public': 'Public',
      'dream.friends': 'Amis uniquement',
      'dream.private': 'Privé',
      'dream.emotions': 'Comment ce rêve t’a-t-il fait sentir ?',
      'dream.emotionsHelp': 'Choisis l’émotion qui correspond le mieux à ton expérience de rêve.',
      'dream.submit': 'Envoyer le rêve',
      'dream.validationContent': 'Merci de saisir le texte de ton rêve.',
      'dream.createFailed': 'Le rêve n’a pas pu être créé.',
      'dream.analysisFailed': 'L’analyse du rêve n’a pas pu démarrer.',

      'emotion.joy': 'Joie',
      'emotion.peace': 'Paix',
      'emotion.love': 'Amour',
      'emotion.hope': 'Espoir',
      'emotion.awe': 'Émerveillement',
      'emotion.surprise': 'Surprise',
      'emotion.curiosity': 'Curiosité',
      'emotion.confusion': 'Confusion',
      'emotion.fear': 'Peur',
      'emotion.anxiety': 'Anxiété',
      'emotion.sadness': 'Tristesse',
      'emotion.loneliness': 'Solitude',
      'emotion.anger': 'Colère',
      'emotion.shame': 'Honte',
      'emotion.disgust': 'Dégoût',
      'emotion.relief': 'Soulagement'
    }
  },

  pt: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': 'Voltar ao início',
      'nav.home': 'Início',
      'nav.explore': 'Explorar',
      'nav.vision': 'Visão',
      'nav.message': 'Mensagens',
      'nav.profile': 'Perfil',
      'nav.newVision': 'Nova visão',
      'nav.logDream': 'Registrar um sonho',

      'app.getApp': 'Baixar o app',
      'app.getAppShort': 'App',
      'app.downloadBannerText': 'A Lunosfer já está no Google Play — notificações instantâneas',
      'app.downloadBannerCta': 'Instalar',
      'app.downloadBannerClose': 'Fechar',
      'app.pageTitle': 'A Lunosfer no seu bolso',
      'app.pageSubtitle': 'O app Android da Lunosfer já está disponível no Google Play. A mesma conta, os mesmos sonhos e visões — agora com notificações instantâneas.',
      'app.perkCapture': 'Registre seu sonho assim que acordar, antes que ele se apague',
      'app.perkNotify': 'Notificações instantâneas de curtidas, comentários e análises dos seus sonhos',
      'app.perkSync': 'Entre com sua conta atual — tudo continua sincronizado',
      'app.playCta': 'Disponível no Google Play',
      'app.iosTitle': 'Usa iPhone?',
      'app.iosNote': 'O app para iPhone está a caminho. Até lá, adicione a Lunosfer à Tela de Início e abra como um app.',
      'app.iosSteps': 'No Safari, toque em Compartilhar → Adicionar à Tela de Início.',
      'app.backToSite': 'Voltar para a Lunosfer',

      'notif.title': 'Notificações',
      'notif.autoAligned': 'Sincronizado automaticamente',

      'auth.loading': 'Carregando...',

      'common.errorGeneric': 'Algo deu errado.',

      'location.unknown': 'Local desconhecido',

      'dream.addTitle': 'Compartilhe seu sonho',
      'dream.dreamText': 'Texto do sonho',
      'dream.placeholder': 'Escreva seu sonho com o máximo de detalhes que lembrar...',
      'dream.location': 'Local',
      'dream.locationPlaceholder': 'Cidade, país',
      'dream.shareOptions': 'Opções de compartilhamento',
      'dream.shareInFeed': 'Compartilhar no feed público',
      'dream.mapDetail': 'Detalhe do mapa',
      'dream.fullText': 'Texto completo',
      'dream.summaryOnly': 'Somente resumo',
      'dream.visibility': 'Visibilidade',
      'dream.public': 'Público',
      'dream.friends': 'Somente amigos',
      'dream.private': 'Privado',
      'dream.emotions': 'Como esse sonho te fez sentir?',
      'dream.emotionsHelp': 'Escolha a emoção que melhor combina com sua experiência no sonho.',
      'dream.submit': 'Enviar sonho',
      'dream.validationContent': 'Por favor, digite o texto do seu sonho.',
      'dream.createFailed': 'Não foi possível criar o sonho.',
      'dream.analysisFailed': 'Não foi possível iniciar a análise do sonho.',

      'emotion.joy': 'Alegria',
      'emotion.peace': 'Paz',
      'emotion.love': 'Amor',
      'emotion.hope': 'Esperança',
      'emotion.awe': 'Admiração',
      'emotion.surprise': 'Surpresa',
      'emotion.curiosity': 'Curiosidade',
      'emotion.confusion': 'Confusão',
      'emotion.fear': 'Medo',
      'emotion.anxiety': 'Ansiedade',
      'emotion.sadness': 'Tristeza',
      'emotion.loneliness': 'Solidão',
      'emotion.anger': 'Raiva',
      'emotion.shame': 'Vergonha',
      'emotion.disgust': 'Nojo',
      'emotion.relief': 'Alívio'
    }
  },

  ja: {
    translation: {
      'app.name': 'Lunosfer',

      'nav.backToHome': 'ホームに戻る',
      'nav.home': 'ホーム',
      'nav.explore': '探索',
      'nav.vision': 'ビジョン',
      'nav.message': 'メッセージ',
      'nav.profile': 'プロフィール',
      'nav.newVision': '新しいビジョン',
      'nav.logDream': '夢を記録する',

      'app.getApp': 'アプリを入手',
      'app.getAppShort': 'アプリ',
      'app.downloadBannerText': 'LunosferがGoogle Playに登場 — 通知をすぐに受け取れます',
      'app.downloadBannerCta': 'インストール',
      'app.downloadBannerClose': '閉じる',
      'app.pageTitle': 'Lunosferをいつもポケットに',
      'app.pageSubtitle': 'LunosferのAndroidアプリがGoogle Playで公開中。同じアカウントで、夢もビジョンもそのまま——さらに即時通知も。',
      'app.perkCapture': '目覚めてすぐ、夢が薄れる前に記録',
      'app.perkNotify': 'いいね・コメント・夢の分析結果を即時通知',
      'app.perkSync': '今のアカウントでログイン——すべて同期されます',
      'app.playCta': 'Google Play で手に入れよう',
      'app.iosTitle': 'iPhoneをお使いですか？',
      'app.iosNote': 'iPhone版は準備中です。それまではLunosferをホーム画面に追加して、アプリのように開けます。',
      'app.iosSteps': 'Safariで共有 →「ホーム画面に追加」をタップ。',
      'app.backToSite': 'Lunosferに戻る',

      'notif.title': '通知',
      'notif.autoAligned': '自動同期済み',

      'auth.loading': '読み込み中...',

      'common.errorGeneric': '問題が発生しました。',

      'location.unknown': '不明な場所',

      'dream.addTitle': '夢をシェアする',
      'dream.dreamText': '夢の内容',
      'dream.placeholder': '覚えている限り詳しく夢を書いてください...',
      'dream.location': '場所',
      'dream.locationPlaceholder': '都市、国',
      'dream.shareOptions': '共有オプション',
      'dream.shareInFeed': '公開フィードに共有する',
      'dream.mapDetail': '地図の詳細',
      'dream.fullText': '全文',
      'dream.summaryOnly': '要約のみ',
      'dream.visibility': '公開範囲',
      'dream.public': '公開',
      'dream.friends': '友達のみ',
      'dream.private': '非公開',
      'dream.emotions': 'この夢でどんな気持ちになりましたか？',
      'dream.emotionsHelp': '夢の体験に最も近い感情を選んでください。',
      'dream.submit': '夢を送信',
      'dream.validationContent': '夢の内容を入力してください。',
      'dream.createFailed': '夢を作成できませんでした。',
      'dream.analysisFailed': '夢の分析を開始できませんでした。',

      'emotion.joy': '喜び',
      'emotion.peace': '安らぎ',
      'emotion.love': '愛',
      'emotion.hope': '希望',
      'emotion.awe': '畏敬',
      'emotion.surprise': '驚き',
      'emotion.curiosity': '好奇心',
      'emotion.confusion': '混乱',
      'emotion.fear': '恐れ',
      'emotion.anxiety': '不安',
      'emotion.sadness': '悲しみ',
      'emotion.loneliness': '孤独',
      'emotion.anger': '怒り',
      'emotion.shame': '恥',
      'emotion.disgust': '嫌悪',
      'emotion.relief': '安心'
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'tr', 'ru', 'ar', 'es', 'hi', 'zh', 'de', 'fr', 'pt', 'ja'], // YENİ: fr/pt/ja eklendi (LanguageSwitcher ve translations.js zaten bunları sunuyordu, ama burada karşılığı yoktu — bu mismatch, o dilleri seçen kullanıcıların sessizce en'e düşmesine sebep oluyordu)
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