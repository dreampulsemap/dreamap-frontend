import { useState, useEffect } from 'react';
import { auth } from '../lib/supabase';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next'; // 1. i18next hook'unu ekle
import { getTranslation } from '../lib/translations'; // 2. Çeviri fonksiyonunu ekle

export default function Navbar() {
  const [user, setUser] = useState(null);
  const { i18n } = useTranslation(); // 3. Aktif dili almak için hook'u tanımla
  const lang = i18n.language || 'en'; // 4. Geçerli dili belirle

  useEffect(() => {
    async function checkUser() {
      if (auth && typeof auth.getUser === 'function') {
        const currentUser = await auth.getUser();
        setUser(currentUser);
      }
    }
    checkUser();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-[#0a0a1a]/90 to-transparent">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo ve Marka İsmi */}
        <a href=\"/\" className=\"flex items-center gap-3 glass-card px-4 py-2 hover:bg-white/10 transition-all group\">
          <img 
            src=\"/logo.png\" 
            alt=\"Luverse Logo\" 
            className=\"w-9 h-9 object-contain rounded-full border border-purple-500/30 group-hover:rotate-12 transition-transform\"
          />
          <span className=\"font-bold tracking-wider text-xl gradient-text font-serif\">
            LUVERSE
          </span>
        </a>

        {/* Sağ Linkler & Dil Seçici */}
        <div className=\"flex items-center gap-4\">
          <a href=\"/globe\" className=\"hidden sm:inline-block text-sm text-white/80 hover:text-purple-300 transition-colors px-3 py-2\">
            🌍 {getTranslation('nav.globe', lang)} {/* 5. Statik metni dinamik çeviriyle değiştir */}
          </a>
          
          <LanguageSwitcher />

          {user ? (
            <div className=\"glass-card px-4 py-2 text-sm text-purple-300 border border-purple-500/20\">
              ✨ Profilim
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
