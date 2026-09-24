// Push bildirim metinleri — Android uygulamasının desteklediği 14 dilin tamamı.
//
// NEDEN: notify.js / messages/send.js metinleri yalnızca tr/en yazıyordu ve dili
// ALICININ değil, çağıranın parametresinden (çoğu çağrıda hiç verilmiyordu →
// varsayılan 'tr') seçiyordu. Sonuç: İngilizce/Almanca/... kullanan herkes takip,
// yorum, mana bildirimlerini Türkçe alıyordu; mesaj bildirimi de gönderenin
// dilinde gidiyordu. Artık metin her zaman alıcının user_profiles.language
// değerine göre seçilir (Android bu değeri uygulamanın fiili diline eşitler).

export const PUSH_LANGS = ['en', 'tr', 'es', 'fr', 'de', 'pt', 'ru', 'ja', 'ar', 'hi', 'zh', 'fi', 'ro', 'uk']

const T = {
  en: {
    someone: 'Someone',
    photo: '📷 Photo', video: '🎥 Video', file: '📎 File',
    analysis_ready_title: 'Your analysis is ready ✨', analysis_ready_body: 'Your deep dream analysis is complete. Tap to view it.',
    analysis_failed_title: 'Analysis could not be generated', analysis_failed_body: 'Your auras have been refunded. Tap to try again.',
    follow_new_title: 'New follower 🌙', follow_new_body: '{name} started following you.',
    follow_request_title: 'Follow request 👋', follow_request_body: '{name} sent you a follow request.',
    follow_accepted_title: 'Follow request accepted ✅', follow_accepted_body: '{name} accepted your follow request.',
    goal_comment_title: 'New comment 💬', goal_comment_body: '{name} commented on your vision.',
    mana_title: 'You received mana ✨', mana_body: '{name} sent mana to your vision.',
    diary_comment_title: 'New comment 💬', diary_comment_body: '{name} commented on your post.',
    dream_comment_title: 'New comment 💬', dream_comment_body: '{name} commented on your dream.',
    dream_like_title: 'New like ❤️', dream_like_body: '{name} liked your dream.',
    gift_title: 'Your dream got a gift image 🎁', gift_body: 'A specially picked image was added to one of your dreams. Tap to see it.',
  },
  tr: {
    someone: 'Biri',
    photo: '📷 Fotoğraf', video: '🎥 Video', file: '📎 Dosya',
    analysis_ready_title: 'Analiziniz hazır ✨', analysis_ready_body: 'Derinlemesine rüya analiziniz tamamlandı. Görmek için dokunun.',
    analysis_failed_title: 'Analiz oluşturulamadı', analysis_failed_body: 'Auralarınız iade edildi. Tekrar denemek için dokunun.',
    follow_new_title: 'Yeni takipçi 🌙', follow_new_body: '{name} seni takip etmeye başladı.',
    follow_request_title: 'Takip isteği 👋', follow_request_body: '{name} sana takip isteği gönderdi.',
    follow_accepted_title: 'Takip isteğin kabul edildi ✅', follow_accepted_body: '{name} takip isteğini kabul etti.',
    goal_comment_title: 'Yeni yorum 💬', goal_comment_body: '{name} vizyonuna yorum yaptı.',
    mana_title: 'Mana aldın ✨', mana_body: '{name} vizyonuna mana gönderdi.',
    diary_comment_title: 'Yeni yorum 💬', diary_comment_body: '{name} paylaşımına yorum yaptı.',
    dream_comment_title: 'Yeni yorum 💬', dream_comment_body: '{name} rüyana yorum yaptı.',
    dream_like_title: 'Yeni beğeni ❤️', dream_like_body: '{name} rüyanı beğendi.',
    gift_title: 'Rüyana bir görsel hediye edildi 🎁', gift_body: 'Bir rüyana özel seçilmiş bir görsel eklendi. Görmek için dokun.',
  },
  es: {
    someone: 'Alguien',
    photo: '📷 Foto', video: '🎥 Vídeo', file: '📎 Archivo',
    analysis_ready_title: 'Tu análisis está listo ✨', analysis_ready_body: 'Tu análisis profundo del sueño está completo. Toca para verlo.',
    analysis_failed_title: 'No se pudo generar el análisis', analysis_failed_body: 'Te hemos devuelto tus Auras. Toca para intentarlo de nuevo.',
    follow_new_title: 'Nuevo seguidor 🌙', follow_new_body: '{name} empezó a seguirte.',
    follow_request_title: 'Solicitud de seguimiento 👋', follow_request_body: '{name} te envió una solicitud de seguimiento.',
    follow_accepted_title: 'Solicitud aceptada ✅', follow_accepted_body: '{name} aceptó tu solicitud de seguimiento.',
    goal_comment_title: 'Nuevo comentario 💬', goal_comment_body: '{name} comentó tu visión.',
    mana_title: 'Recibiste mana ✨', mana_body: '{name} envió mana a tu visión.',
    diary_comment_title: 'Nuevo comentario 💬', diary_comment_body: '{name} comentó tu publicación.',
    dream_comment_title: 'Nuevo comentario 💬', dream_comment_body: '{name} comentó tu sueño.',
    dream_like_title: 'Nuevo me gusta ❤️', dream_like_body: 'A {name} le gustó tu sueño.',
    gift_title: 'Tu sueño recibió una imagen de regalo 🎁', gift_body: 'Se añadió una imagen especial a uno de tus sueños. Toca para verla.',
  },
  fr: {
    someone: "Quelqu'un",
    photo: '📷 Photo', video: '🎥 Vidéo', file: '📎 Fichier',
    analysis_ready_title: 'Votre analyse est prête ✨', analysis_ready_body: 'L’analyse approfondie de votre rêve est terminée. Touchez pour la voir.',
    analysis_failed_title: "L'analyse n'a pas pu être générée", analysis_failed_body: 'Vos Auras ont été remboursées. Touchez pour réessayer.',
    follow_new_title: 'Nouvel abonné 🌙', follow_new_body: '{name} a commencé à vous suivre.',
    follow_request_title: "Demande d'abonnement 👋", follow_request_body: "{name} vous a envoyé une demande d'abonnement.",
    follow_accepted_title: 'Demande acceptée ✅', follow_accepted_body: "{name} a accepté votre demande d'abonnement.",
    goal_comment_title: 'Nouveau commentaire 💬', goal_comment_body: '{name} a commenté votre vision.',
    mana_title: 'Vous avez reçu du mana ✨', mana_body: '{name} a envoyé du mana à votre vision.',
    diary_comment_title: 'Nouveau commentaire 💬', diary_comment_body: '{name} a commenté votre publication.',
    dream_comment_title: 'Nouveau commentaire 💬', dream_comment_body: '{name} a commenté votre rêve.',
    dream_like_title: "Nouveau j'aime ❤️", dream_like_body: '{name} a aimé votre rêve.',
    gift_title: 'Votre rêve a reçu une image cadeau 🎁', gift_body: "Une image choisie spécialement a été ajoutée à l'un de vos rêves. Touchez pour la voir.",
  },
  de: {
    someone: 'Jemand',
    photo: '📷 Foto', video: '🎥 Video', file: '📎 Datei',
    analysis_ready_title: 'Deine Analyse ist fertig ✨', analysis_ready_body: 'Deine tiefe Traumanalyse ist abgeschlossen. Tippe, um sie anzusehen.',
    analysis_failed_title: 'Analyse konnte nicht erstellt werden', analysis_failed_body: 'Deine Auras wurden erstattet. Tippe, um es erneut zu versuchen.',
    follow_new_title: 'Neuer Follower 🌙', follow_new_body: '{name} folgt dir jetzt.',
    follow_request_title: 'Folgeanfrage 👋', follow_request_body: '{name} hat dir eine Folgeanfrage gesendet.',
    follow_accepted_title: 'Folgeanfrage angenommen ✅', follow_accepted_body: '{name} hat deine Folgeanfrage angenommen.',
    goal_comment_title: 'Neuer Kommentar 💬', goal_comment_body: '{name} hat deine Vision kommentiert.',
    mana_title: 'Du hast Mana erhalten ✨', mana_body: '{name} hat deiner Vision Mana geschickt.',
    diary_comment_title: 'Neuer Kommentar 💬', diary_comment_body: '{name} hat deinen Beitrag kommentiert.',
    dream_comment_title: 'Neuer Kommentar 💬', dream_comment_body: '{name} hat deinen Traum kommentiert.',
    dream_like_title: 'Neues Gefällt mir ❤️', dream_like_body: '{name} gefällt dein Traum.',
    gift_title: 'Dein Traum hat ein Geschenkbild bekommen 🎁', gift_body: 'Einem deiner Träume wurde ein besonders ausgewähltes Bild hinzugefügt. Tippe zum Ansehen.',
  },
  pt: {
    someone: 'Alguém',
    photo: '📷 Foto', video: '🎥 Vídeo', file: '📎 Arquivo',
    analysis_ready_title: 'Sua análise está pronta ✨', analysis_ready_body: 'A análise profunda do seu sonho foi concluída. Toque para ver.',
    analysis_failed_title: 'Não foi possível gerar a análise', analysis_failed_body: 'Suas Auras foram devolvidas. Toque para tentar novamente.',
    follow_new_title: 'Novo seguidor 🌙', follow_new_body: '{name} começou a seguir você.',
    follow_request_title: 'Pedido para seguir 👋', follow_request_body: '{name} enviou um pedido para seguir você.',
    follow_accepted_title: 'Pedido aceito ✅', follow_accepted_body: '{name} aceitou seu pedido para seguir.',
    goal_comment_title: 'Novo comentário 💬', goal_comment_body: '{name} comentou na sua visão.',
    mana_title: 'Você recebeu mana ✨', mana_body: '{name} enviou mana para a sua visão.',
    diary_comment_title: 'Novo comentário 💬', diary_comment_body: '{name} comentou na sua publicação.',
    dream_comment_title: 'Novo comentário 💬', dream_comment_body: '{name} comentou no seu sonho.',
    dream_like_title: 'Nova curtida ❤️', dream_like_body: '{name} curtiu seu sonho.',
    gift_title: 'Seu sonho ganhou uma imagem de presente 🎁', gift_body: 'Uma imagem escolhida especialmente foi adicionada a um dos seus sonhos. Toque para ver.',
  },
  ru: {
    someone: 'Кто-то',
    photo: '📷 Фото', video: '🎥 Видео', file: '📎 Файл',
    analysis_ready_title: 'Ваш анализ готов ✨', analysis_ready_body: 'Глубокий анализ вашего сна завершён. Нажмите, чтобы посмотреть.',
    analysis_failed_title: 'Не удалось создать анализ', analysis_failed_body: 'Ваша Аура возвращена. Нажмите, чтобы попробовать снова.',
    follow_new_title: 'Новый подписчик 🌙', follow_new_body: '{name} подписался на вас.',
    follow_request_title: 'Запрос на подписку 👋', follow_request_body: '{name} отправил вам запрос на подписку.',
    follow_accepted_title: 'Запрос принят ✅', follow_accepted_body: '{name} принял ваш запрос на подписку.',
    goal_comment_title: 'Новый комментарий 💬', goal_comment_body: '{name} прокомментировал вашу цель.',
    mana_title: 'Вы получили ману ✨', mana_body: '{name} отправил ману вашей цели.',
    diary_comment_title: 'Новый комментарий 💬', diary_comment_body: '{name} прокомментировал вашу публикацию.',
    dream_comment_title: 'Новый комментарий 💬', dream_comment_body: '{name} прокомментировал ваш сон.',
    dream_like_title: 'Новый лайк ❤️', dream_like_body: '{name} понравился ваш сон.',
    gift_title: 'Вашему сну подарили изображение 🎁', gift_body: 'К одному из ваших снов добавлено специально подобранное изображение. Нажмите, чтобы посмотреть.',
  },
  ja: {
    someone: '誰か',
    photo: '📷 写真', video: '🎥 動画', file: '📎 ファイル',
    analysis_ready_title: '分析が完了しました ✨', analysis_ready_body: '夢の深層分析が完了しました。タップして確認しましょう。',
    analysis_failed_title: '分析を作成できませんでした', analysis_failed_body: 'オーラは返還されました。タップしてもう一度お試しください。',
    follow_new_title: '新しいフォロワー 🌙', follow_new_body: '{name}さんがあなたをフォローしました。',
    follow_request_title: 'フォローリクエスト 👋', follow_request_body: '{name}さんからフォローリクエストが届きました。',
    follow_accepted_title: 'フォローリクエストが承認されました ✅', follow_accepted_body: '{name}さんがフォローリクエストを承認しました。',
    goal_comment_title: '新しいコメント 💬', goal_comment_body: '{name}さんがあなたのビジョンにコメントしました。',
    mana_title: 'マナを受け取りました ✨', mana_body: '{name}さんがあなたのビジョンにマナを送りました。',
    diary_comment_title: '新しいコメント 💬', diary_comment_body: '{name}さんがあなたの投稿にコメントしました。',
    dream_comment_title: '新しいコメント 💬', dream_comment_body: '{name}さんがあなたの夢にコメントしました。',
    dream_like_title: '新しいいいね ❤️', dream_like_body: '{name}さんがあなたの夢にいいねしました。',
    gift_title: '夢に画像のプレゼントが届きました 🎁', gift_body: 'あなたの夢に特別に選ばれた画像が追加されました。タップして確認しましょう。',
  },
  ar: {
    someone: 'شخص ما',
    photo: '📷 صورة', video: '🎥 فيديو', file: '📎 ملف',
    analysis_ready_title: 'تحليلك جاهز ✨', analysis_ready_body: 'اكتمل التحليل العميق لحلمك. اضغط لعرضه.',
    analysis_failed_title: 'تعذّر إنشاء التحليل', analysis_failed_body: 'تمت إعادة الأورا إليك. اضغط للمحاولة مرة أخرى.',
    follow_new_title: 'متابع جديد 🌙', follow_new_body: 'بدأ {name} بمتابعتك.',
    follow_request_title: 'طلب متابعة 👋', follow_request_body: 'أرسل إليك {name} طلب متابعة.',
    follow_accepted_title: 'تم قبول طلب المتابعة ✅', follow_accepted_body: 'قبل {name} طلب المتابعة الخاص بك.',
    goal_comment_title: 'تعليق جديد 💬', goal_comment_body: 'علّق {name} على رؤيتك.',
    mana_title: 'تلقيت مانا ✨', mana_body: 'أرسل {name} مانا إلى رؤيتك.',
    diary_comment_title: 'تعليق جديد 💬', diary_comment_body: 'علّق {name} على منشورك.',
    dream_comment_title: 'تعليق جديد 💬', dream_comment_body: 'علّق {name} على حلمك.',
    dream_like_title: 'إعجاب جديد ❤️', dream_like_body: 'أعجب {name} بحلمك.',
    gift_title: 'حصل حلمك على صورة هدية 🎁', gift_body: 'أُضيفت صورة مختارة خصيصًا إلى أحد أحلامك. اضغط لعرضها.',
  },
  hi: {
    someone: 'किसी ने',
    photo: '📷 फ़ोटो', video: '🎥 वीडियो', file: '📎 फ़ाइल',
    analysis_ready_title: 'आपका विश्लेषण तैयार है ✨', analysis_ready_body: 'आपके सपने का गहन विश्लेषण पूरा हो गया। देखने के लिए टैप करें।',
    analysis_failed_title: 'विश्लेषण नहीं बन सका', analysis_failed_body: 'आपकी ऑरा वापस कर दी गई है। फिर से कोशिश करने के लिए टैप करें।',
    follow_new_title: 'नया फ़ॉलोअर 🌙', follow_new_body: '{name} ने आपको फ़ॉलो करना शुरू किया।',
    follow_request_title: 'फ़ॉलो अनुरोध 👋', follow_request_body: '{name} ने आपको फ़ॉलो अनुरोध भेजा।',
    follow_accepted_title: 'फ़ॉलो अनुरोध स्वीकार हुआ ✅', follow_accepted_body: '{name} ने आपका फ़ॉलो अनुरोध स्वीकार किया।',
    goal_comment_title: 'नई टिप्पणी 💬', goal_comment_body: '{name} ने आपकी विज़न पर टिप्पणी की।',
    mana_title: 'आपको मना मिला ✨', mana_body: '{name} ने आपकी विज़न को मना भेजा।',
    diary_comment_title: 'नई टिप्पणी 💬', diary_comment_body: '{name} ने आपकी पोस्ट पर टिप्पणी की।',
    dream_comment_title: 'नई टिप्पणी 💬', dream_comment_body: '{name} ने आपके सपने पर टिप्पणी की।',
    dream_like_title: 'नया लाइक ❤️', dream_like_body: '{name} को आपका सपना पसंद आया।',
    gift_title: 'आपके सपने को एक उपहार चित्र मिला 🎁', gift_body: 'आपके एक सपने में खास चुना गया चित्र जोड़ा गया। देखने के लिए टैप करें।',
  },
  zh: {
    someone: '有人',
    photo: '📷 照片', video: '🎥 视频', file: '📎 文件',
    analysis_ready_title: '你的分析已完成 ✨', analysis_ready_body: '你的梦境深度分析已完成，点按查看。',
    analysis_failed_title: '无法生成分析', analysis_failed_body: '你的灵气已退还，点按重试。',
    follow_new_title: '新关注者 🌙', follow_new_body: '{name} 开始关注你。',
    follow_request_title: '关注请求 👋', follow_request_body: '{name} 向你发送了关注请求。',
    follow_accepted_title: '关注请求已通过 ✅', follow_accepted_body: '{name} 通过了你的关注请求。',
    goal_comment_title: '新评论 💬', goal_comment_body: '{name} 评论了你的愿景。',
    mana_title: '你收到了法力 ✨', mana_body: '{name} 向你的愿景发送了法力。',
    diary_comment_title: '新评论 💬', diary_comment_body: '{name} 评论了你的帖子。',
    dream_comment_title: '新评论 💬', dream_comment_body: '{name} 评论了你的梦。',
    dream_like_title: '新点赞 ❤️', dream_like_body: '{name} 点赞了你的梦。',
    gift_title: '你的梦收到了一张礼物图片 🎁', gift_body: '你的一个梦中添加了一张精选图片，点按查看。',
  },
  fi: {
    someone: 'Joku',
    photo: '📷 Kuva', video: '🎥 Video', file: '📎 Tiedosto',
    analysis_ready_title: 'Analyysisi on valmis ✨', analysis_ready_body: 'Unesi syväanalyysi on valmis. Napauta nähdäksesi.',
    analysis_failed_title: 'Analyysia ei voitu luoda', analysis_failed_body: 'Aurasi palautettiin. Napauta yrittääksesi uudelleen.',
    follow_new_title: 'Uusi seuraaja 🌙', follow_new_body: '{name} alkoi seurata sinua.',
    follow_request_title: 'Seurantapyyntö 👋', follow_request_body: '{name} lähetti sinulle seurantapyynnön.',
    follow_accepted_title: 'Seurantapyyntö hyväksytty ✅', follow_accepted_body: '{name} hyväksyi seurantapyyntösi.',
    goal_comment_title: 'Uusi kommentti 💬', goal_comment_body: '{name} kommentoi visiotasi.',
    mana_title: 'Sait manaa ✨', mana_body: '{name} lähetti manaa visioosi.',
    diary_comment_title: 'Uusi kommentti 💬', diary_comment_body: '{name} kommentoi julkaisuasi.',
    dream_comment_title: 'Uusi kommentti 💬', dream_comment_body: '{name} kommentoi unelmaasi.',
    dream_like_title: 'Uusi tykkäys ❤️', dream_like_body: '{name} tykkäsi unelmastasi.',
    gift_title: 'Unesi sai lahjakuvan 🎁', gift_body: 'Yhteen unistasi lisättiin erikseen valittu kuva. Napauta nähdäksesi.',
  },
  ro: {
    someone: 'Cineva',
    photo: '📷 Fotografie', video: '🎥 Video', file: '📎 Fișier',
    analysis_ready_title: 'Analiza ta este gata ✨', analysis_ready_body: 'Analiza profundă a visului tău este gata. Atinge pentru a o vedea.',
    analysis_failed_title: 'Analiza nu a putut fi generată', analysis_failed_body: 'Aura ți-a fost returnată. Atinge pentru a încerca din nou.',
    follow_new_title: 'Urmăritor nou 🌙', follow_new_body: '{name} a început să te urmărească.',
    follow_request_title: 'Cerere de urmărire 👋', follow_request_body: '{name} ți-a trimis o cerere de urmărire.',
    follow_accepted_title: 'Cerere acceptată ✅', follow_accepted_body: '{name} ți-a acceptat cererea de urmărire.',
    goal_comment_title: 'Comentariu nou 💬', goal_comment_body: '{name} a comentat la viziunea ta.',
    mana_title: 'Ai primit Mana ✨', mana_body: '{name} a trimis Mana viziunii tale.',
    diary_comment_title: 'Comentariu nou 💬', diary_comment_body: '{name} a comentat la postarea ta.',
    dream_comment_title: 'Comentariu nou 💬', dream_comment_body: '{name} a comentat visul tău.',
    dream_like_title: 'Apreciere nouă ❤️', dream_like_body: '{name} a apreciat visul tău.',
    gift_title: 'Visul tău a primit o imagine cadou 🎁', gift_body: 'O imagine aleasă special a fost adăugată la unul dintre visele tale. Atinge pentru a o vedea.',
  },
  uk: {
    someone: 'Хтось',
    photo: '📷 Фото', video: '🎥 Відео', file: '📎 Файл',
    analysis_ready_title: 'Ваш аналіз готовий ✨', analysis_ready_body: 'Глибокий аналіз вашого сну завершено. Торкніться, щоб переглянути.',
    analysis_failed_title: 'Не вдалося створити аналіз', analysis_failed_body: 'Вашу Ауру повернуто. Торкніться, щоб спробувати ще раз.',
    follow_new_title: 'Новий підписник 🌙', follow_new_body: '{name} підписався на вас.',
    follow_request_title: 'Запит на підписку 👋', follow_request_body: '{name} надіслав вам запит на підписку.',
    follow_accepted_title: 'Запит прийнято ✅', follow_accepted_body: '{name} прийняв ваш запит на підписку.',
    goal_comment_title: 'Новий коментар 💬', goal_comment_body: '{name} прокоментував вашу візію.',
    mana_title: 'Ви отримали ману ✨', mana_body: '{name} надіслав ману вашій візії.',
    diary_comment_title: 'Новий коментар 💬', diary_comment_body: '{name} прокоментував ваш допис.',
    dream_comment_title: 'Новий коментар 💬', dream_comment_body: '{name} прокоментував ваш сон.',
    dream_like_title: 'Новий лайк ❤️', dream_like_body: '{name} вподобав ваш сон.',
    gift_title: 'Ваш сон отримав зображення в подарунок 🎁', gift_body: 'До одного з ваших снів додано спеціально дібране зображення. Торкніться, щоб переглянути.',
  },
}

export function normalizePushLang(raw) {
  const lang = String(raw || 'en').toLowerCase().split('-')[0]
  return PUSH_LANGS.includes(lang) ? lang : 'en'
}

/** Alıcının kayıtlı dili (user_profiles.language); bulunamazsa 'en'. */
export async function recipientLang(supabaseAdmin, userId) {
  try {
    const { data } = await supabaseAdmin
      .from('user_profiles')
      .select('language')
      .eq('id', userId)
      .maybeSingle()
    return normalizePushLang(data?.language)
  } catch {
    return 'en'
  }
}

/** pushText('tr', 'follow_new_body', { name: 'Ayşe' }) */
export function pushText(lang, key, vars = {}) {
  const table = T[normalizePushLang(lang)] || T.en
  const template = table[key] ?? T.en[key] ?? ''
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''))
}
