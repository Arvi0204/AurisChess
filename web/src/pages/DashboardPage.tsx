import { useState, useEffect } from 'react'
import PageHeader from '../components/dashboard/PageHeader'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import PlayCard from '../components/dashboard/PlayCard'
import QuickStats from '../components/dashboard/QuickStats'
import RecentGames from '../components/dashboard/RecentGames'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const DashboardPage = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [stats, setStats] = useState<{
    totalGames: number | string
    streak: number | string
    ratingRapid: number | string
    ratingBlitz: number | string
  }>({
    totalGames: '—',
    streak: '—',
    ratingRapid: '—',
    ratingBlitz: '—',
  })

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) return

        const response = await fetch(`${API_BASE}/api/user/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const resJson = await response.json()
          if (resJson.success && resJson.data) {
            const data = resJson.data
            setStats({
              totalGames: data.stats?.total_games ?? 0,
              streak: data.stats?.win_streak ?? 0,
              ratingRapid: data.user?.rating_rapid ?? 1200,
              ratingBlitz: data.user?.rating_blitz ?? 1200,
            })
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className={`dashboard-shell${isCollapsed ? ' sidebar-collapsed' : ''}`}>
      <DashboardSidebar
        username={username}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <main className="dashboard-main">
        <PageHeader
          title={<>Welcome back, <span>{username}</span></>}
          subtitle="Ready to play? Pick a mode below and start your next game."
        />

        <div className="dashboard-content">
          <PlayCard />
          <QuickStats
            totalGames={stats.totalGames}
            streak={stats.streak}
            ratingRapid={stats.ratingRapid}
            ratingBlitz={stats.ratingBlitz}
          />
          <RecentGames />
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
