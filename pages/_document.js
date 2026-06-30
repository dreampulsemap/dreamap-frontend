import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        {/* THREE.js ve Globe.gl CDN'den yükleniyor */}
        <script src="https://unpkg.com/three@0.164.0/build/three.min.js" />
        <script src="https://unpkg.com/three@0.164.0/examples/js/controls/TrackballControls.js" />
        <script src="https://unpkg.com/three@0.164.0/examples/js/controls/OrbitControls.js" />
        <script src="https://unpkg.com/globe.gl@2.33.0/dist/globe.gl.min.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
