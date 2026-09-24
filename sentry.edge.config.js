// Edge runtime (middleware vb.) için aynı yapılandırma — bu proje şu an
// edge middleware kullanmıyor ama Sentry Next.js eklentisi bu dosyayı
// bekliyor; yoksa build sırasında uyarı verir.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
})
