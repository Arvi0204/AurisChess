import AuthPanel from '../components/AuthPanel'
import SiteHeader from '../components/SiteHeader'

const AuthPage = () => {
  return (
    <main className="page-shell">
      <SiteHeader variant="auth" />

      <section className="auth-page">
        <AuthPanel />
      </section>
    </main>
  )
}

export default AuthPage
