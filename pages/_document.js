import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
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
