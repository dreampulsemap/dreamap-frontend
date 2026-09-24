// Web frontend (tarayıcı) taraflı hatalar için. NEXT_PUBLIC_ önekli olmak
// zorunda çünkü client bundle'ına gömülüyor — Sentry DSN'leri zaten herkese
// açık olacak şekilde tasarlanmıştır (yazma değil, sadece hata gönderme
// yetkisi verir), Android/web anon key'leri gibi gizli değildir.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
})
