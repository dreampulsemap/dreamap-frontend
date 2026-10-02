// Google'dan organik trafik çekmek için yazılmış, herkese açık rüya rehberleri.
//
// Her rehber /ruya-tabirleri/[slug] altında statik (SSG) olarak üretilir;
// yani içerik ilk HTML'de hazır gelir ve Google JS çalıştırmadan okur.
// Yeni bir yazı eklemek için bu diziye bir nesne eklemek yeterli — sayfa,
// liste sayfası otomatik güncellenir; public/sitemap.xml’e de URL’yi ekle.
//
// Ton: kehanet değil, Jung'cu ve öznel yorum. Her yazı "kişisel bağlam
// anlamı değiştirir" vurgusu ve Lunosfer analiz çağrısıyla biter.

export const GUIDES_UPDATED = '2026-10-02'

export const DREAM_GUIDES = [
  {
    slug: 'ruyada-yilan-gormek',
    title: 'Rüyada Yılan Görmek Ne Anlama Gelir? Jung’a Göre Yorumu',
    description:
      'Rüyada yılan görmek Jung psikolojisinde dönüşüm, içgüdü ve gölge ile ilişkilendirilir. Yılanın rengi, davranışı ve hissettiğin duygu yorumu nasıl değiştirir?',
    keywords: ['rüyada yılan görmek', 'rüyada yılan görmek jung', 'yılan rüya tabiri'],
    symbol: '🐍',
    sections: [
      {
        h: 'Kısa cevap',
        p: [
          'Jung’cu bakışta yılan, çoğu zaman dönüşümü, bastırılmış içgüdüleri ve bilinçdışından yükselen güçlü bir enerjiyi temsil eder. Yılan derisini değiştirdiği için eskinin bırakılması ve yenilenme ile de ilişkilendirilir.',
          'Bu bir kehanet değildir: Rüyanın anlamı, yılana karşı hissettiğin duyguya ve hayatında şu an neyin değiştiğine bağlıdır.',
        ],
      },
      {
        h: 'Jung psikolojisinde yılan',
        p: [
          'Carl Jung, yılanı insanlığın en eski sembollerinden biri olarak görür; hem tehlike hem şifa anlamı taşır (tıbbın sembolündeki asaya dolanmış yılanı düşün). Bu ikilik, yılanın gölge arketipiyle bağını gösterir: Korktuğumuz ama bize ait olan, henüz kabul etmediğimiz bir yanımız.',
        ],
      },
      {
        h: 'Farklı senaryolar',
        ul: [
          'Yılan tarafından ısırılmak: Görmezden geldiğin bir duygu ya da gerçek kendini zorla hatırlatıyor olabilir.',
          'Yılandan kaçmak: Bir değişimden veya yüzleşmekten kaçınma eğilimi.',
          'Yılanın deri değiştirmesi: Bir dönemin kapanıp yenisinin başlaması.',
          'Sakin, zararsız bir yılan: İçgüdülerinle ve bedeninle daha barışık bir ilişki.',
          'Çok sayıda yılan: Aynı anda birçok kaygı ya da dağınık bir enerji hissi.',
        ],
      },
      {
        h: 'Kendine sorabileceğin sorular',
        ul: [
          'Rüyada yılanı görünce ne hissettim: korku mu, merak mı, hayranlık mı?',
          'Hayatımda şu an “deri değiştirmem” gereken bir alan var mı?',
          'Bastırdığım bir öfke, arzu ya da sezgi var mı?',
        ],
      },
    ],
    related: ['ruyada-kovalanmak', 'jung-arketipleri-rehberi', 'tekrarlayan-ruyalarin-anlami'],
  },
  {
    slug: 'ruyada-dusmek',
    title: 'Rüyada Düşmek Ne Anlama Gelir? Psikolojik Yorumu',
    description:
      'Rüyada düşmek en yaygın rüyalardan biridir. Kontrol kaybı, kaygı ve geçiş dönemleriyle ilişkisi; düşerken uyanmanın nedeni ve Jung’cu yorumu.',
    keywords: ['rüyada düşmek', 'rüyada yüksekten düşmek', 'düşme rüyası anlamı'],
    symbol: '🌀',
    sections: [
      {
        h: 'Kısa cevap',
        p: [
          'Düşme rüyaları çoğunlukla kontrol kaybı, güvensizlik ya da hızlı ilerleyen bir değişimin yarattığı kaygıyla ilişkilendirilir. Hayatında “ayağının altındaki zeminin kaydığını” hissettiğin bir alan olabilir.',
        ],
      },
      {
        h: 'Düşerken neden uyanırız?',
        p: [
          'Uykuya dalarken yaşanan ani kas seğirmesine “hipnik sıçrama” denir ve çok yaygındır. Beyin bu bedensel hissi bazen bir düşme sahnesiyle anlamlandırır. Yani her düşme rüyası derin bir mesaj taşımaz; bazen sadece bedenin bir tepkisidir.',
        ],
      },
      {
        h: 'Jung’cu bakış',
        p: [
          'Jung, rüyaların bilinçli tutumu dengelediğini (telafi ettiğini) söyler. Kendini çok yükseklerde, aşırı iddialı ya da “her şeyi kontrol eden” biri olarak gören kişi, rüyasında düşebilir: Bilinçdışı, onu yeniden yere, gerçekçiliğe çağırıyor olabilir.',
        ],
      },
      {
        h: 'Farklı senaryolar',
        ul: [
          'Uçurumdan düşmek: Büyük bir karar veya riskin eşiğinde olmak.',
          'Merdivenden düşmek: Bir hedefe doğru ilerlerken yaşanan aksaklık hissi.',
          'Düşüp yere yumuşakça inmek: Korktuğun değişimin sandığından daha güvenli olabileceği.',
          'Birini düşerken görmek: O kişiyle ilgili kaygı ya da onda gördüğün bir özelliğin “çöküşü”.',
        ],
      },
    ],
    related: ['tekrarlayan-ruyalarin-anlami', 'ruyada-kovalanmak', 'ruya-gunlugu-nasil-tutulur'],
  },
  {
    slug: 'ruyada-kovalanmak',
    title: 'Rüyada Kovalanmak Ne Anlama Gelir? Jung ve Gölge Arketipi',
    description:
      'Rüyada kovalanmak, kaçtığın bir duygu ya da gölge yanınla ilgili olabilir. Kim tarafından kovalandığın ve kaçarken ne hissettiğin yorumu nasıl değiştirir?',
    keywords: ['rüyada kovalanmak', 'rüyada birinden kaçmak', 'kovalanma rüyası jung'],
    symbol: '🏃',
    sections: [
      {
        h: 'Kısa cevap',
        p: [
          'Kovalanma rüyaları genellikle kaçındığın bir şeyi işaret eder: bir konuşma, bir karar, bir duygu ya da kendinde kabul etmediğin bir özellik. Ne kadar hızlı kaçarsan kaç, takipçi genelde peşini bırakmaz — çünkü o da senin bir parçandır.',
        ],
      },
      {
        h: 'Gölge arketipi',
        p: [
          'Jung’a göre gölge, kişiliğimizin bilinçli olarak reddettiğimiz yanlarını içerir. Rüyada bizi kovalayan karanlık figür çoğu zaman gölgenin kişileşmiş halidir. Jung’cu çalışmalarda önerilen yaklaşım, kaçmak yerine (örneğin hayal etme ya da günlük yoluyla) figüre dönüp “Ne istiyorsun?” diye sormaktır.',
        ],
      },
      {
        h: 'Kim kovalıyordu?',
        ul: [
          'Tanımadığın bir kişi: Henüz adını koyamadığın bir duygu ya da yanın.',
          'Tanıdığın biri: O kişiyle ilişkin ya da onun sende uyandırdığı bir duygu.',
          'Bir hayvan: İçgüdüsel, bedensel bir dürtü (öfke, arzu, korku).',
          'Görünmeyen bir şey: Belirsiz, genel bir kaygı ya da stres.',
        ],
      },
      {
        h: 'Kendine sorabileceğin sorular',
        ul: [
          'Son zamanlarda ertelediğim bir yüzleşme var mı?',
          'Takipçi beni yakalasaydı ne olacağını düşündüm?',
          'Uyandığımda en çok hangi duygu kaldı?',
        ],
      },
    ],
    related: ['jung-arketipleri-rehberi', 'ruyada-yilan-gormek', 'tekrarlayan-ruyalarin-anlami'],
  },
  {
    slug: 'ruyada-olum-gormek',
    title: 'Rüyada Ölüm Görmek Ne Anlama Gelir? Korkmalı mısın?',
    description:
      'Rüyada ölüm görmek çoğu zaman gerçek bir ölümü değil, bir dönemin bitişini ve dönüşümü simgeler. Kendi ölümünü ya da bir yakınının ölümünü görmenin psikolojik yorumu.',
    keywords: ['rüyada ölüm görmek', 'rüyada ölmek', 'rüyada yakınının öldüğünü görmek'],
    symbol: '🕯️',
    sections: [
      {
        h: 'Kısa cevap',
        p: [
          'Rüyada ölüm görmek, gerçek bir ölümün habercisi değildir. Sembolik dilde ölüm çoğunlukla bir şeyin sona ermesini ve yerine yenisinin doğmasını anlatır: bir ilişki, bir alışkanlık, bir kimlik ya da bir hayat evresi.',
        ],
      },
      {
        h: 'Jung’cu bakış: ölüm ve yeniden doğuş',
        p: [
          'Jung, mitlerdeki ölüm-yeniden doğuş döngüsünü bireyleşme sürecinin bir parçası olarak görür. Eski benliğin “ölmesi”, daha bütün bir kişiliğe geçişin işareti olabilir. Bu yüzden ölüm rüyaları, büyük değişim dönemlerinde (taşınma, mezuniyet, ayrılık, yeni iş) daha sık görülür.',
        ],
      },
      {
        h: 'Farklı senaryolar',
        ul: [
          'Kendi ölümünü görmek: Kendinin eski bir versiyonunu geride bırakmak.',
          'Yaşayan bir yakının ölmesi: O kişiyle ilişkinin değişmesi ya da onu kaybetme kaygısı.',
          'Vefat etmiş birini görmek: Yas sürecinin ve özlemin doğal bir yansıması.',
          'Cenaze törenine katılmak: Bir dönemi bilinçli olarak uğurlamak.',
        ],
      },
      {
        h: 'Önemli not',
        p: [
          'Yakın zamanda bir kayıp yaşadıysan bu rüyalar yasın parçası olabilir. Rüyalar seni uzun süre rahatsız ediyor, uykunu ya da günlük hayatını etkiliyorsa bir ruh sağlığı uzmanıyla konuşmak iyi gelebilir.',
        ],
      },
    ],
    related: ['ruyada-eski-sevgiliyi-gormek', 'jung-arketipleri-rehberi', 'ruyada-dusmek'],
  },
  {
    slug: 'ruyada-eski-sevgiliyi-gormek',
    title: 'Rüyada Eski Sevgiliyi Görmek Ne Anlama Gelir?',
    description:
      'Rüyada eski sevgiliyi görmek her zaman onu özlediğin anlamına gelmez. Jung’a göre anima/animus, kapanmamış duygular ve şimdiki ilişkinle bağlantısı.',
    keywords: ['rüyada eski sevgiliyi görmek', 'rüyada eski sevgiliyle barışmak', 'eski sevgili rüyası'],
    symbol: '💔',
    sections: [
      {
        h: 'Kısa cevap',
        p: [
          'Eski sevgiliyi rüyada görmek çoğu zaman o kişiden çok, onunla yaşadığın dönemle ve o dönemde hissettiklerinle ilgilidir. Kapanmamış bir duygu, tekrar eden bir ilişki kalıbı ya da o dönemdeki “sen” rüyaya dönüyor olabilir.',
        ],
      },
      {
        h: 'Anima ve animus',
        p: [
          'Jung’a göre anima (erkekteki dişil yön) ve animus (kadındaki eril yön), ilişkilerimizde karşı tarafa yansıttığımız iç imgelerdir. Rüyadaki eski sevgili, bu iç imgenin bir yüzü olabilir: Ona yüklediğin özellikler, aslında kendi içinde geliştirmen gereken nitelikleri gösterebilir.',
        ],
      },
      {
        h: 'Farklı senaryolar',
        ul: [
          'Eski sevgiliyle barışmak: Geçmişle, ya da o dönemdeki kendinle uzlaşma isteği.',
          'Onunla tartışmak: Söylenmemiş sözler, çözülmemiş öfke.',
          'Onu başka biriyle görmek: Kıyaslanma ya da yetersizlik kaygısı.',
          'Yeni ilişkin varken onu görmek: Şimdiki ilişkinde benzer bir kalıbın tetiklenmesi.',
        ],
      },
      {
        h: 'Kendine sorabileceğin sorular',
        ul: [
          'O ilişkide en çok neyi hissetmiştim ve bu duygu şu an hayatımda var mı?',
          'Rüyada o kişi bana nasıl davranıyordu?',
          'Ona yüklediğim hangi özelliği kendimde de görmek isterim?',
        ],
      },
    ],
    related: ['jung-arketipleri-rehberi', 'tekrarlayan-ruyalarin-anlami', 'ruyada-olum-gormek'],
  },
  {
    slug: 'tekrarlayan-ruyalarin-anlami',
    title: 'Tekrarlayan Rüyalar Neden Görülür ve Ne Anlama Gelir?',
    description:
      'Aynı rüyayı tekrar tekrar görmek çözülmemiş bir duygu ya da sürecin işareti olabilir. Tekrarlayan rüyaların nedenleri, Jung’cu yorumu ve onlarla nasıl çalışılır.',
    keywords: ['tekrarlayan rüyalar', 'aynı rüyayı tekrar görmek', 'sürekli aynı rüyayı görmek'],
    symbol: '🔁',
    sections: [
      {
        h: 'Kısa cevap',
        p: [
          'Tekrarlayan rüyalar genellikle henüz çözülmemiş bir duygu, çatışma ya da yaşam meselesine işaret eder. Rüya, mesajı “alınana” kadar farklı kılıklarda geri dönebilir.',
        ],
      },
      {
        h: 'Jung ne der?',
        p: [
          'Jung’a göre tekrar eden rüyalar, bilinçdışının ısrarla dikkat çekmeye çalıştığı konuları gösterir. Kişi rüyanın işaret ettiği tutumu değiştirdiğinde, rüya da çoğu zaman değişir ya da tamamen kaybolur. Bu yüzden rüyanın küçük farklılıklarını takip etmek, iç sürecin nereye gittiğini görmenin iyi bir yoludur.',
        ],
      },
      {
        h: 'En sık tekrarlayan temalar',
        ul: [
          'Sınava hazırlıksız girmek — performans kaygısı, değerlendirilme korkusu',
          'Kovalanmak — kaçınılan bir yüzleşme',
          'Dişlerin dökülmesi — kontrol, görünüş ya da ifade kaygısı',
          'Düşmek — güvensizlik ve kontrol kaybı',
          'Bir yere yetişememek — zaman baskısı ve kaçırılan fırsat hissi',
        ],
      },
      {
        h: 'Tekrarlayan rüyayla nasıl çalışılır?',
        ul: [
          'Her tekrarı tarihiyle birlikte yaz; neyin değiştiğini işaretle.',
          'Rüyadan önceki gün yaşadığın olayları not et; tetikleyicileri ara.',
          'Rüyadaki duyguya odaklan; sahneler değişse de duygu genelde aynıdır.',
          'Kâbus niteliğindeyse ve uykunu bozuyorsa profesyonel destek al.',
        ],
      },
    ],
    related: ['ruya-gunlugu-nasil-tutulur', 'ruyada-kovalanmak', 'ruyada-dusmek'],
  },
  {
    slug: 'jung-arketipleri-rehberi',
    title: 'Jung Arketipleri Rehberi: Rüyalarda En Sık Görülen 7 Arketip',
    description:
      'Gölge, anima/animus, persona, bilge yaşlı, büyük anne, kahraman ve hilebaz. Jung arketiplerinin rüyalarda nasıl göründüğünü örneklerle öğren.',
    keywords: ['jung arketipleri', 'arketip nedir', 'gölge arketipi', 'anima animus'],
    symbol: '🜂',
    sections: [
      {
        h: 'Arketip nedir?',
        p: [
          'Carl Jung’a göre arketipler, kolektif bilinçdışında yer alan, tüm insanlığın paylaştığı evrensel imge ve davranış kalıplarıdır. Mitlerde, masallarda, dinlerde ve rüyalarda tekrar tekrar ortaya çıkarlar. Rüyada bir arketiple karşılaşmak, kişisel bir meselenin evrensel bir temaya bağlandığını gösterebilir.',
        ],
      },
      {
        h: 'Rüyalarda en sık görülen arketipler',
        ul: [
          'Gölge: Kabul etmediğimiz yanlarımız. Rüyada genelde tehditkâr, karanlık ya da itici bir figürdür.',
          'Anima / Animus: İçimizdeki karşı cinsiyet imgesi. Çekici, gizemli bir yabancı olarak görünebilir.',
          'Persona: Topluma gösterdiğimiz maske. Kıyafet, kostüm ya da sahnede olma rüyalarında belirir.',
          'Bilge Yaşlı: Rehberlik ve içsel bilgelik. Öğretmen, dede, büyücü ya da keşiş olarak gelir.',
          'Büyük Anne: Besleyen ama yutabilen de olan güç. Doğa, deniz, mağara ya da anne figürleri.',
          'Kahraman: Zorluklarla yüzleşme ve büyüme yolculuğu. Savaş, macera ve görev rüyaları.',
          'Hilebaz (Trickster): Kuralları bozan, düzeni sarsan ve değişimi tetikleyen figür.',
        ],
      },
      {
        h: 'Bireyleşme süreci',
        p: [
          'Jung, bu arketiplerle bilinçli bir ilişki kurmayı “bireyleşme” olarak adlandırır: Kişinin parçalarını bütünleştirerek kendisi olması. Rüya günlüğü tutmak ve tekrar eden figürleri fark etmek, bu sürecin en pratik araçlarından biridir.',
        ],
      },
    ],
    related: ['ruyada-kovalanmak', 'ruyada-eski-sevgiliyi-gormek', 'ruyayi-yapay-zeka-ile-analiz-et'],
  },
  {
    slug: 'ruya-gunlugu-nasil-tutulur',
    title: 'Rüya Günlüğü Nasıl Tutulur? Rüyalarını Hatırlamanın 7 Yolu',
    description:
      'Rüya günlüğü tutmak rüyaları hatırlamayı ve anlamayı kolaylaştırır. Adım adım rüya günlüğü rehberi, örnek şablon ve rüyaları daha iyi hatırlama ipuçları.',
    keywords: ['rüya günlüğü', 'rüya günlüğü nasıl tutulur', 'rüyaları hatırlamak'],
    symbol: '📓',
    sections: [
      {
        h: 'Neden rüya günlüğü?',
        p: [
          'Rüyalar uyandıktan sonraki birkaç dakika içinde hızla silinir. Düzenli kayıt tutmak hem hatırlama becerini güçlendirir hem de zamanla tekrar eden sembolleri, duyguları ve arketipleri görmeni sağlar. Tek bir rüyadan çok, bir rüya dizisi anlamlıdır.',
        ],
      },
      {
        h: 'Rüyaları daha iyi hatırlamanın 7 yolu',
        ul: [
          'Yatmadan önce “Rüyamı hatırlayacağım” niyetini kur.',
          'Defteri ya da telefonu yatağının yanında tut.',
          'Uyandığında hemen kalkma; gözlerin kapalıyken rüyayı geri sar.',
          'Önce anahtar kelimeleri yaz, ayrıntıları sonra tamamla.',
          'Hatırladığın tek bir imge bile olsa onu kaydet.',
          'Alkol ve geç saatte ağır yemekten kaçın; uyku kaliteni koru.',
          'Her gün aynı saatte uyu ve uyan.',
        ],
      },
      {
        h: 'Basit bir rüya günlüğü şablonu',
        ul: [
          'Tarih ve uyku saati',
          'Rüyanın kısa özeti (şimdiki zamanla yaz: “Bir koridordayım…”)',
          'Öne çıkan semboller ve kişiler',
          'Rüyadaki ve uyandıktan sonraki duygu',
          'Önceki günle bağlantılı olabilecek olaylar',
          'Rüyaya verdiğin bir başlık',
        ],
      },
      {
        h: 'Lunosfer ile dijital rüya günlüğü',
        p: [
          'Lunosfer’de rüyanı yazdığında kayıt varsayılan olarak sana özel kalır. Yapay zekâ, sembolleri ve baskın arketipi çıkarır; zamanla rüyaların arasındaki örüntüleri görmen kolaylaşır.',
        ],
      },
    ],
    related: ['lucid-ruya-nasil-gorulur', 'tekrarlayan-ruyalarin-anlami', 'ruyayi-yapay-zeka-ile-analiz-et'],
  },
  {
    slug: 'lucid-ruya-nasil-gorulur',
    title: 'Lucid Rüya (Bilinçli Rüya) Nasıl Görülür? Başlangıç Rehberi',
    description:
      'Lucid rüya, rüyada olduğunun farkına vardığın rüyadır. Gerçeklik kontrolleri, MILD tekniği ve rüya günlüğüyle bilinçli rüya görmeye başlamak için adımlar.',
    keywords: ['lucid rüya', 'bilinçli rüya nasıl görülür', 'lucid dream teknikleri'],
    symbol: '🌙',
    sections: [
      {
        h: 'Lucid rüya nedir?',
        p: [
          'Lucid (bilinçli) rüya, rüya görürken rüyada olduğunun farkına vardığın durumdur. Bazı kişiler bu farkındalıkla rüyanın akışını kısmen yönlendirebilir. Araştırmalar, bu deneyimin öğrenilebilir bir beceri olduğunu gösteriyor.',
        ],
      },
      {
        h: 'Başlangıç için 4 temel teknik',
        ul: [
          'Rüya günlüğü: Rüyalarını ne kadar iyi hatırlarsan, rüyada fark etme ihtimalin o kadar artar.',
          'Gerçeklik kontrolü: Gün içinde birkaç kez “Rüyada mıyım?” diye sor; parmaklarını say ya da bir yazıyı iki kez oku.',
          'MILD tekniği: Uykuya dalarken “Bir dahaki rüyamda rüyada olduğumu fark edeceğim” cümlesini tekrarla.',
          'Rüya işaretleri: Günlüğünde sık tekrar eden yerleri, kişileri bul; onları rüyada görünce farkındalık tetikleyicisi olarak kullan.',
        ],
      },
      {
        h: 'Dikkat edilmesi gerekenler',
        p: [
          'Uyku düzenini bozacak kadar zorlamak (sürekli alarm kurmak gibi) uyku kalitesini düşürebilir. Uyku felci ya da yoğun kaygı yaşıyorsan ara ver; sorun sürerse bir uzmana danış.',
        ],
      },
    ],
    related: ['ruya-gunlugu-nasil-tutulur', 'tekrarlayan-ruyalarin-anlami', 'jung-arketipleri-rehberi'],
  },
  {
    slug: 'ruyayi-yapay-zeka-ile-analiz-et',
    title: 'Rüyanı Yapay Zekâ ile Analiz Et: Jung Arketipleriyle Rüya Yorumu',
    description:
      'Rüyanı yaz, yapay zekâ sembollerini, baskın Jung arketipini ve duygusal temalarını saniyeler içinde çıkarsın. Lunosfer ile ücretsiz rüya analizi nasıl yapılır?',
    keywords: ['yapay zeka rüya yorumu', 'rüya analizi', 'ai rüya tabiri', 'online rüya yorumu'],
    symbol: '✨',
    sections: [
      {
        h: 'Yapay zekâ ile rüya analizi nasıl çalışır?',
        p: [
          'Lunosfer’de rüyanı kendi kelimelerinle yazarsın. Yapay zekâ metindeki sembolleri, kişileri, mekânları ve duyguları tanır; bunları Jung psikolojisinin arketip çerçevesiyle ilişkilendirerek kişisel bir yorum üretir.',
        ],
      },
      {
        h: 'Analizde neler var?',
        ul: [
          'Rüyandaki ana semboller ve olası anlamları',
          'Baskın Jung arketipi (gölge, anima/animus, kahraman vb.)',
          'Rüyanın duygusal tonu',
          'Kendine sorabileceğin yansıtıcı sorular',
          'İstersen rüyanın yapay zekâ ile üretilmiş bir görseli',
        ],
      },
      {
        h: 'Gizlilik',
        p: [
          'Rüyaların varsayılan olarak yalnızca sana görünür. Toplulukta ya da küresel rüya haritasında paylaşmak tamamen senin tercihindir; rüyalarını ve hesabını istediğin zaman silebilirsin.',
        ],
      },
      {
        h: 'Neyi yapmaz?',
        p: [
          'Lunosfer analizleri kendini tanımaya yönelik yansıtıcı yorumlardır; kehanet, psikolojik tanı ya da tedavi değildir. Ruhsal olarak zor bir dönemden geçiyorsan bir ruh sağlığı uzmanından destek almanı öneririz.',
        ],
      },
    ],
    related: ['jung-arketipleri-rehberi', 'ruya-gunlugu-nasil-tutulur', 'ruyada-yilan-gormek'],
  },
]

export function getGuide(slug) {
  return DREAM_GUIDES.find((g) => g.slug === slug) || null
}
