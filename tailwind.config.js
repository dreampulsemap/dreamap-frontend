/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        void: {
          950: '#04060E', // Ana Zemin (Obsidyen Derinliği)
          900: '#090D1A', // Derin Paneller
          800: '#121826', // Dumanlı Cam İçi
        },
        astral: {
          gold: '#E6C687',   // Şampanya Altını (Simya / Ödül)
          amber: '#F59E0B',  // Sıcak Enerji
          glow: 'rgba(230, 198, 135, 0.25)',
        },
        aether: {
          cyan: '#38BDF8',   // Berrak Zihin / Sezgi
          indigo: '#818CF8', // Bilinçaltı
          violet: '#A855F7', // Arketip
        },
        shadowWork: {
          rose: '#E11D48',   // Bastırılmış Gölge / Çatışma
        },
        // AŞAĞIDAKİ İKİ AİLE: Reels-dönemi arayüzlerde (Pixabay seçici, slayt
        // editörü, vizyon oluşturma, silme/onay akışları) organik olarak
        // ortaya çıkan, tutarlı bir ikinci vurgu dili — ~15 dosyada 255 yerde
        // ham Tailwind rengi (fuchsia/cyan/rose/emerald/purple) olarak
        // kullanılıyordu, artık isimlendirilip tek yerden kontrol ediliyor.
        // Değerler standart Tailwind paletiyle birebir aynı — hiçbir mevcut
        // görsel değişmiyor, sadece adlandırılıyor.
        brand: {
          primary: {
            50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc',
            400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf',
            800: '#86198f', 900: '#701a75', 950: '#4a044e',
          }, // fuchsia — birincil aksiyon / seçili durum
          secondary: {
            50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
            400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
            800: '#155e75', 900: '#164e63', 950: '#083344',
          }, // cyan — AI / ikincil vurgu
          accent: {
            300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea',
            800: '#6b21a8', 900: '#581c87', 950: '#3b0764',
          }, // purple — gradyan ara rengi (aether.violet ile aynı aile)
        },
        semantic: {
          danger: { 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e' },   // rose — silme / hata
          success: { 100: '#d1fae5', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981' }, // emerald — tamamlandı / başarı
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Cinzel', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      // NOT: Bunlar DESIGN_SYSTEM.md §2/§12'de "tanımlı değil" diye işaretlenen
      // tam ölçeğin (display/h1/h2/h3/body/caption) kendisi DEĞİL — sadece
      // component'lerde zaten `text-h1`/`text-h3`/`text-body-sm`/`text-label`
      // olarak kullanılıp hiçbir karşılığı olmadığı için sessizce boyutsuz
      // kalan 4 token'ın karşılığı eklendi (EmptyState/ErrorState/vision-board).
      // Kalan ölçek kararı (display/h2/caption vb.) hâlâ ayrı, bilinçli bir
      // ürün kararı gerektiriyor — bu değişiklik onu almıyor.
      fontSize: {
        h1: ['1.875rem', { lineHeight: '2.25rem' }],   // = text-3xl, mevcut sayfa başlıklarıyla (explore.js) aynı
        h3: ['1.125rem', { lineHeight: '1.75rem' }],   // = text-lg, kod tabanındaki baskın alt-başlık boyutu
        'body-sm': ['0.8125rem', { lineHeight: '1.25rem' }], // text-xs (12px) ile text-sm (14px) arası
        label: ['0.875rem', { lineHeight: '1.25rem' }], // = text-sm, mevcut pill-buton etiketleriyle aynı
      },
      borderRadius: {
        'card': '24px',
        'pill': '9999px',
      },
      boxShadow: {
        'astral-glow': '0 0 35px rgba(230, 198, 135, 0.18)',
        'aether-glow': '0 0 35px rgba(56, 189, 248, 0.15)',
        'inner-light': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)',
      },
    },
  },
  plugins: [],
}
