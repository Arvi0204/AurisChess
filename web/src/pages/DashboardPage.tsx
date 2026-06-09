import { useState } from 'react'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import PlayCard from '../components/dashboard/PlayCard'
import QuickStats from '../components/dashboard/QuickStats'
import RecentGames from '../components/dashboard/RecentGames'

const DashboardPage = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Read user from localStorage (set during login/signup)
  let username = 'Player'
  try {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      username = user.username || 'Player'
    }
  } catch {
    // fallback to default
  }

  return (
    <div className={`dashboard-shell${isCollapsed ? ' sidebar-collapsed' : ''}`}>
      <DashboardSidebar
        username={username}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <main className="dashboard-main">
        <DashboardHeader username={username} />

        <div className="dashboard-content">
          <PlayCard />
          <QuickStats />
          <RecentGames />
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
