import AuthPanel from '../components/AuthPanel'
import AuthStory from '../components/AuthStory'
import SiteHeader from '../components/SiteHeader'

const AuthPage = () => {
  return (
    <main className="page-shell">
      <SiteHeader variant="auth" />

      <section className="auth-page">
        <AuthStory />
        <AuthPanel />
      </section>
    </main>
  )
}

export default AuthPage
