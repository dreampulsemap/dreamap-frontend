import Link from 'next/link'

// Instagram'daki gönderi başlığı deseni: küçük yuvarlak avatar + isim, ikisi
// de tıklanınca paylaşımı açan üst elementin onClick'ini TETİKLEMEDEN doğrudan
// paylaşan kullanıcının profiline (/u/[userId]) götürür. Kendi profiline
// gelindiyse pages/u/[userId].js zaten /profile'a yönlendiriyor, o yüzden
// burada "kendim miyim" ayrımı yapmaya gerek yok — tek bir hedef (/u/[id])
// her durumda doğru yere çıkarır.
//
// `owner` bekleniyor: { id, username, display_name, avatar_url } (bkz.
// home-feed.js / explore/feed.js / goals/list.js'teki toplu-sorgu deseni).
// owner yoksa (veri henüz eklenmemiş eski bir çağrı noktası ör.) sessizce
// hiçbir şey render etmiyoruz — kırık bir bağlantı göstermek boş göstermekten
// kötü.

function initialsOf(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

const SIZE_CLASSES = {
  sm: { ring: 'w-6 h-6', text: 'text-[11px]', name: 'text-xs' },
  md: { ring: 'w-8 h-8', text: 'text-xs', name: 'text-sm' },
  lg: { ring: 'w-10 h-10', text: 'text-sm', name: 'text-base' },
}

export default function AuthorHeader({
  owner,
  lang = 'en',
  size = 'md',
  showName = true,
  nameClassName = 'text-white',
  subtleName = false,
  className = '',
}) {
  if (!owner || !owner.id) return null

  const label = owner.display_name || owner.username || (lang === 'tr' ? 'Bilinmeyen' : 'Unknown')
  const sizes = SIZE_CLASSES[size] || SIZE_CLASSES.md

  return (
    <Link
      href={`/u/${owner.id}`}
      onClick={(e) => e.stopPropagation()}
      className={`group/author inline-flex items-center gap-2 min-w-0 ${className}`}
    >
      <span
        className={`${sizes.ring} rounded-full overflow-hidden bg-gradient-to-br from-brand-primary-500 to-brand-secondary-500 flex items-center justify-center text-white font-bold shrink-0 ring-1 ring-white/15`}
      >
        {owner.avatar_url ? (
          <img src={owner.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className={sizes.text}>{initialsOf(label)}</span>
        )}
      </span>
      {showName && (
        <span
          className={`${sizes.name} font-semibold truncate group-hover/author:underline ${
            subtleName ? 'text-slate-300' : nameClassName
          }`}
        >
          {label}
        </span>
      )}
    </Link>
  )
}
