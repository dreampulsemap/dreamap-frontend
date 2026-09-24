// Backend (API route / SSR) hata izleme. Android tarafı zaten Sentry
// kullanıyor (AndroidManifest.xml, io.sentry.dsn) — backend'de HİÇ yoktu,
// production hatalarını yalnızca birisi (Claude) manuel olarak
// get_runtime_errors ile sorduğunda görüyorduk, gerçek zamanlı alert yok.
// DSN boşsa SDK sessizce hiçbir şey göndermez (no-op) — bu dosya SENTRY_DSN
// env var'ı Vercel'de tanımlanana kadar zararsız.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // API route'larda genelde bizim kendi console.error'larımız zaten
  // handled hataları logluyor — Sentry'ye asıl değeri UNHANDLED
  // (beklenmeyen) hatalar katıyor, o yüzden debug kapalı.
  debug: false,
})
