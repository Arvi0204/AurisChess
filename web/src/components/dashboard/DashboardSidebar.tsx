import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crown,
  Home,
  LogOut,
  Menu,
  Swords,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../../assets/aurischess-logo.svg'
import { supabase } from '../../config/supabaseClient'

const navItems = [
  { icon: Home, label: 'Home', href: '/dashboard' },
  { icon: Swords, label: 'Play', href: '/play' },
  { icon: BookOpen, label: 'Learn', href: '#learn' },
  { icon: Crown, label: 'Leaderboard', href: '#leaderboard' },
]

type DashboardSidebarProps = {
  username: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const DashboardSidebar = ({
  username,
  isCollapsed = false,
  onToggleCollapse,
}: DashboardSidebarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    navigate('/')
  }


  const initial = username.charAt(0).toUpperCase()

  // Read avatar_url from localStorage if available
  let avatarUrl = ''
  try {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      avatarUrl = user.avatar_url || ''
    }
  } catch {
    // ignore
  }

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
          <div className="sidebar-brand-wrapper">
            <Link className="sidebar-logo" to="/dashboard" aria-label="AurisChess home">
              <img className="logo__graphic" src={logo} alt="" />
              <span className="logo__text">Auris<span>Chess</span></span>
            </Link>
            {onToggleCollapse && (
              <button
                className="sidebar-collapse-btn"
                onClick={onToggleCollapse}
                type="button"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}
          </div>

          <nav className="sidebar-nav" aria-label="Dashboard navigation">
            {navItems.map(({ icon: Icon, label, href }) => {
              const isActive = href.startsWith('/') && location.pathname === href
              return (
                <Link
                  key={label}
                  to={href}
                  className={`sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                  title={isCollapsed ? label : undefined}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <Link
            to="/profile"
            className="sidebar-profile"
            title={isCollapsed ? username : undefined}
            onClick={() => setMobileOpen(false)}
          >
            <div className="sidebar-avatar" aria-hidden="true">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="sidebar-avatar-img" />
              ) : (
                initial
              )}
            </div>
            <div className="sidebar-user-info">
              <strong>{username}</strong>
              <span className="sidebar-role">Player</span>
            </div>
          </Link>

          <button
            className="sidebar-logout"
            onClick={handleLogout}
            type="button"
            title={isCollapsed ? 'Log out' : undefined}
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
