import { Bell } from 'lucide-react'

type DashboardHeaderProps = {
  username: string
}

const DashboardHeader = ({ username }: DashboardHeaderProps) => {
  const initial = username.charAt(0).toUpperCase()

  return (
    <header className="dashboard-header">
      <div className="dashboard-greeting">
        <h1>
          Welcome back, <span>{username}</span>
        </h1>
        <p>Ready to play? Pick a mode below and start your next game.</p>
      </div>

      <div className="dashboard-header-actions">
        <button
          className="dashboard-notif-btn"
          type="button"
          aria-label="Notifications"
        >
          <Bell size={19} />
          <span className="notif-dot" aria-hidden="true" />
        </button>

        <div className="dashboard-header-avatar" aria-hidden="true">
          {initial}
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
