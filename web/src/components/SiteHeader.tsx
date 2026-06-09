import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import logo from '../assets/aurischess-logo.svg'

type SiteHeaderProps = {
  variant?: 'home' | 'auth'
}

function isLoggedIn(): boolean {
  const token = localStorage.getItem('authToken')
  const user = localStorage.getItem('user')
  return Boolean(token && user)
}

function getUsername(): string {
  try {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      return user.username || 'Player'
    }
  } catch {
    // fallback
  }
  return 'Player'
}

const SiteHeader = ({ variant = 'home' }: SiteHeaderProps) => {
  if (variant === 'auth') {
    return (
      <header className="top-bar auth-top-bar">
        <Link className="logo-link" to="/" aria-label="AurisChess home">
          <img className="logo-graphic" src={logo} alt="" />
          <span className="logo-text">Auris<span>Chess</span></span>
        </Link>
        <Link className="back-link" to="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Home
        </Link>
      </header>
    )
  }

  const loggedIn = isLoggedIn()

  return (
    <header className="top-bar">
      <a className="logo-link" href="#top" aria-label="AurisChess home">
        <img className="logo-graphic" src={logo} alt="" />
        <span className="logo-text">Auris<span>Chess</span></span>
      </a>
      <div className="top-actions">
        <nav className="main-nav" aria-label="Primary navigation">
          <a className="active" href="#ai">
            Play vs AI
          </a>
          <a href="#multiplayer">Multiplayer</a>
          <a href="#learn">Learn</a>
        </nav>
        {loggedIn ? (
          <Link className="login-button" to="/dashboard">
            {getUsername()}'s Dashboard
          </Link>
        ) : (
          <Link className="login-button" to="/auth">
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}

export default SiteHeader
