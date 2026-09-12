import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="tr">
      <Head>
        {/* viewport/theme-color BİLEREK burada değil, _app.js'te next/head ile
            veriliyor: Next.js Pages Router, sayfa seviyesinde next/head ile bir
            viewport meta'sı görmezse KENDİ varsayılan `width=device-width`
            meta'sını enjekte ediyor. Bu enjeksiyon _document.js'i hesaba
            katmıyor, yani burada özel bir viewport tanımlamak yeni bir <meta>
            EKLEMİYOR, ikinci/çakışan bir tane daha ekliyordu — tarayıcı ilk
            gördüğünü (Next'in varsayılanını) kullanıp maximum-scale=1 ve
            viewport-fit=cover'ı (notch/safe-area için) sessizce yok sayıyordu. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Globe.gl — jsDelivr CDN. Kendi Three.js kopyasını dahili bundle
            ediyor (globe.controls() ile kendi kontrollerini de yönetiyor),
            bu yüzden ayrı bir three.min.js script'i GEREKMİYOR — önceden
            ikisi birlikte yükleniyordu ve bu, konsolda "Multiple instances
            of Three.js being imported" uyarısına + r160'ta kaldırılacak
            deprecated non-module script uyarısına yol açıyordu (ayrıca her
            sayfada ~600KB'lık gereksiz senkron bir script daha demekti). */}
        <script src="https://cdn.jsdelivr.net/npm/globe.gl@2.33.0/dist/globe.gl.min.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
