// Dil (i18n) tespiti sadece client'ta yapılabiliyor (localStorage/navigator server'da yok).
// Bu yüzden mount öncesi gerçek metni SABİT bir dilde (ör. İngilizce) basıp sonra
// gerçek dile "flip" etmek yerine, mount olana kadar nötr bir skeleton gösteriyoruz.
// Böylece kullanıcı iki farklı dilde metnin birbirine dönüştüğünü GÖRMÜYOR,
// sadece kısa bir yüklenme animasyonu görüp ardından doğru dilde metni görüyor.
export default function TextSkeleton({ width = 'w-16', height = 'h-4', className = '' }) {
  return (
    <span
      className={`inline-block ${width} ${height} rounded bg-white/10 animate-pulse align-middle ${className}`}
      aria-hidden="true"
    />
  )
}
