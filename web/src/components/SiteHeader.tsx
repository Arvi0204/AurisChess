import { ArrowLeft } from 'lucide-react'
import logo from '../assets/aurischess-logo.png'

type SiteHeaderProps = {
  variant?: 'home' | 'auth'
}

const SiteHeader = ({ variant = 'home' }: SiteHeaderProps) => {
  if (variant === 'auth') {
    return (
      <header className="top-bar auth-top-bar">
        <a className="logo-link" href="/" aria-label="AurisChess home">
          <img src={logo} alt="AurisChess" />
        </a>
        <a className="back-link" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Home
        </a>
      </header>
    )
  }

  return (
    <header className="top-bar">
      <a className="logo-link" href="#top" aria-label="AurisChess home">
        <img src={logo} alt="AurisChess" />
      </a>
      <div className="top-actions">
        <nav className="main-nav" aria-label="Primary navigation">
          <a className="active" href="#ai">
            Play vs AI
          </a>
          <a href="#multiplayer">Multiplayer</a>
          <a href="#learn">Learn</a>
        </nav>
        <a className="login-button" href="/auth">
          Sign in
        </a>
      </div>
    </header>
  )
}

export default SiteHeader
