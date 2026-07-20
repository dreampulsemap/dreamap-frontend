/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ===================================================================
      // DESIGN TOKENS — Lunosfer Design System v1
      // Önceden tailwind.config.js boştu, her component kendi fuchsia-500/
      // cyan-400/purple-800 gibi ham renkleri elle seçiyordu — marka tutarlılığı
      // tamamen tesadüfe kalmıştı. Artık semantik isimlerle tanımlı:
      // component'lar `bg-brand-primary` gibi anlamlı isimler kullanmalı,
      // ham Tailwind renk isimlerini (fuchsia-500 vb.) DOĞRUDAN kullanmayı
      // bırakmalı — bu sayede marka rengi tek yerden değişebilir.
      // ===================================================================
      // Tipografi ölçeği — önceden text-2xl/3xl/lg gibi keyfi seçimler vardı,
      // tanımlı bir hiyerarşi yoktu. Component'lar artık text-display,
      // text-h1 vb. kullanmalı; ham text-3xl gibi seçimler yeni kodda
      // kullanılmamalı.
      fontSize: {
        display: ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],  // Hero başlığı
        h1: ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],           // Sayfa başlıkları
        h2: ['1.5rem', { lineHeight: '1.3', fontWeight: '700' }],                                    // Bölüm başlıkları
        h3: ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],                                  // Kart başlıkları
        body: ['1rem', { lineHeight: '1.6' }],                                                       // Gövde metni
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],                                              // İkincil metin
        caption: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],                        // Etiketler, meta bilgi
        label: ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '700' }],     // UPPERCASE buton/filtre etiketleri
      },
      colors: {
        brand: {
          primary: '#d946ef',    // fuchsia-500 — ana marka rengi (CTA'lar, aktif durumlar)
          'primary-hover': '#c026d3',
          secondary: '#a855f7',  // purple-500 — ikincil, gradient'lerde primary ile birlikte
          accent: '#22d3ee',     // cyan-400 — "vizyon/lucid" vurgusu (Vision Board, linkler)
          'accent-hover': '#06b6d4',
        },
        semantic: {
          success: '#10b981',    // emerald-500 — Zafer Duvarı, tamamlanma
          warning: '#f59e0b',    // amber-500 — bekleyen durumlar (pending)
          danger: '#f43f5e',     // rose-500 — hata, silme, yoğun duygular
          neutral: '#64748b',    // slate-500 — Anka Duvarı / vazgeçilen
        },
        surface: {
          base: '#000000',
          raised: 'rgba(255,255,255,0.05)',   // glass-card zemin tonu
          'raised-hover': 'rgba(255,255,255,0.10)',
          border: 'rgba(255,255,255,0.10)',
        },
      },
      fontFamily: {
        // Başlıklarda font-serif (mistik/editorial ton), gövdede sistem sans
        serif: ['"Playfair Display"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Tutarlı köşe yuvarlama ölçeği — şu an component'larda 'rounded-xl',
      // 'rounded-2xl', 'rounded-[24px]' karışık kullanılıyordu.
      borderRadius: {
        card: '20px',      // ana kart standardı (GoalCard, DreamCard, modals)
        pill: '9999px',    // butonlar, chip'ler, filtre barları
      },
      // Hareket süreleri — component'larda 200ms/300ms/500ms/600ms karışıktı.
      transitionDuration: {
        fast: '150ms',    // hover, buton basımı
        base: '300ms',    // fade-in, panel açılışı
        slow: '600ms',    // GoalCard 3D flip, sayfa geçişleri
      },
      // 8px temelli spacing ölçeği zaten Tailwind'de var (p-2=8px, p-4=16px...);
      // yeni eklenen tek şey büyük bölüm aralıkları için:
      spacing: {
        section: '4rem',   // sayfa içi büyük bölümler arası (64px)
      },
    },
  },
  plugins: [],
}
