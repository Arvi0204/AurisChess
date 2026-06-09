import {
  BookOpen,
  Crown,
  Home,
  LogOut,
  Menu,
  Swords,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logo from '../../assets/aurischess-logo.png'

const navItems = [
  { icon: Home, label: 'Home', href: '/dashboard', active: true },
  { icon: Swords, label: 'Play', href: '#play' },
  { icon: BookOpen, label: 'Learn', href: '#learn' },
  { icon: Crown, label: 'Leaderboard', href: '#leaderboard' },
]

type DashboardSidebarProps = {
  username: string
}

const DashboardSidebar = ({ username }: DashboardSidebarProps) => {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    navigate('/')
  }

  const initial = username.charAt(0).toUpperCase()

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`dashboard-sidebar${mobileOpen ? ' open' : ''}`}>
        <div className="sidebar-top">
          <Link className="sidebar-logo" to="/dashboard" aria-label="AurisChess home">
            <img src={logo} alt="AurisChess" />
          </Link>

          <nav className="sidebar-nav" aria-label="Dashboard navigation">
            {navItems.map(({ icon: Icon, label, href, active }) => (
              <Link
                key={label}
                to={href}
                className={`sidebar-nav-item${active ? ' active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <div className="sidebar-avatar" aria-hidden="true">
              {initial}
            </div>
            <div className="sidebar-user-info">
              <strong>{username}</strong>
              <span className="sidebar-role">Player</span>
            </div>
          </div>

          <button
            className="sidebar-logout"
            onClick={handleLogout}
            type="button"
          >
            <LogOut size={18} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default DashboardSidebar
