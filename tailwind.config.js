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
        }
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Cinzel', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
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
