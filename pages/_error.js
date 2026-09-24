// withSentryConfig otomatik olarak API route'ları ve getServerSideProps'u
// sarmalıyor ama SAYFA RENDER'I sırasında (bir bileşen çökerse) oluşan
// hataları yakalamıyor — Sentry'nin kendi dokümantasyonu Pages Router'da
// bunun için özel bir _error.js önerir. Olmadan bu sınıftaki hatalar hiç
// Sentry'ye düşmüyordu.
import * as Sentry from '@sentry/nextjs'
import NextErrorComponent from 'next/error'

function CustomErrorComponent(props) {
  return <NextErrorComponent statusCode={props.statusCode} />
}

CustomErrorComponent.getInitialProps = async (contextData) => {
  await Sentry.captureUnderscoreErrorException(contextData)
  return NextErrorComponent.getInitialProps(contextData)
}

export default CustomErrorComponent
