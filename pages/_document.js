import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#04060E" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* THREE.js ve Globe.gl — jsDelivr CDN (unpkg deprecated bu sürümleri) */}
          {/* three@0.160.0: build/three.min.js'nin bulunduğu son sürüm (r161+ kaldırıldı) */}
          <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js" />
          {/* TrackballControls / OrbitControls — three@0.160.0 examples/js/ dizininde
              bağımsız dosya olarak CDN'de yok. globe.gl@2.33.0 kendi kontrollerini
              dahili olarak yönetiyor (globe.controls() API'si üzerinden). */}
          <script src="https://cdn.jsdelivr.net/npm/globe.gl@2.33.0/dist/globe.gl.min.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
