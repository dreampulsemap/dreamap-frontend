// "Uygulamayı indir" bağlantısı: platforma göre doğru hedefe gider ve tıklamayı
// placement etiketiyle PostHog'a bildirir (bkz. lib/appLinks.js).
import Link from 'next/link'
import { useAppPlatform, appLinkFor, trackGetApp } from '@/lib/appLinks'

export default function GetAppLink({ placement, onClick, children, ...rest }) {
  const platform = useAppPlatform()
  const { href, external } = appLinkFor(platform, placement)
  const handleClick = (e) => {
    trackGetApp(placement, platform)
    onClick?.(e)
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={handleClick} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  )
}
