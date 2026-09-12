import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script'

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
            sayfada ~600KB'lık gereksiz senkron bir script daha demekti).

            ÖNEMLİ: next/document Head'inde ham <script> yerine next/script
            kullanılıyor. Next.js'in kendi dokümantasyonu ham <script>
            etiketini burada kullanmamayı söylüyor — tarayıcı bunu HTML
            parse sırasında hemen, React'ın hydration zamanlamasından
            habersiz şekilde çalıştırıyordu. strategy="beforeInteractive",
            Next'in kendi script yükleme mekanizmasıyla senkronize çalışıp
            hydration'dan hemen önce, öngörülebilir bir sırada çalışmasını
            garanti ediyor — tüm sayfalarda gereken (MiniGlobe anasayfada
            her zaman render oluyor) global bir script için Next'in önerdiği
            tam olarak bu. */}
        <Script src="https://cdn.jsdelivr.net/npm/globe.gl@2.33.0/dist/globe.gl.min.js" strategy="beforeInteractive" />
        {/* GEÇİCİ TEŞHİS SCRIPT'İ — production'daki hydration hatasının
            (#418/#423/#425) tam mesajını/args[]'ını yakalamak için.
            window.__hydrationDebug altında topluyor. Bu commit hemen
            ardından geri alınacak, kalıcı değil. */}
        <Script id="hydration-debug" strategy="beforeInteractive">
          {`
            window.__hydrationDebug = [];
            window.addEventListener('error', function (e) {
              window.__hydrationDebug.push({
                type: 'error-event',
                message: e.message,
                stack: e.error && e.error.stack,
              });
            });
            var __origConsoleError = console.error;
            console.error = function () {
              try {
                window.__hydrationDebug.push({
                  type: 'console-error',
                  args: Array.prototype.slice.call(arguments).map(function (a) {
                    try { return typeof a === 'string' ? a : JSON.stringify(a); } catch (e) { return String(a); }
                  }),
                });
              } catch (err) {}
              return __origConsoleError.apply(console, arguments);
            };
          `}
        </Script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
