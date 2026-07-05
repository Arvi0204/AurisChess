import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import logo from '../assets/aurischess-logo.svg'
import { useAuth } from '../context/AuthContext'

type SiteHeaderProps = {
  variant?: 'home' | 'auth'
}

const SiteHeader = ({ variant = 'home' }: SiteHeaderProps) => {
  const { user } = useAuth()

  if (variant === 'auth') {
    return (
      <header className="top-bar auth-top-bar">
        <Link className="logo" to="/" aria-label="AurisChess home">
          <img className="logo__graphic" src={logo} alt="" />
          <span className="logo__text">Auris<span>Chess</span></span>
        </Link>
        <Link className="back-link" to="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Home
        </Link>
      </header>
    )
  }

  const loggedIn = !!user

  return (
    <header className="top-bar">
      <a className="logo" href="#top" aria-label="AurisChess home">
        <img className="logo__graphic" src={logo} alt="" />
        <span className="logo__text">Auris<span>Chess</span></span>
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
            {user?.username}'s Dashboard
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
