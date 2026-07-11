import { useState, useEffect } from 'react'
import { Crown, Search, Swords, Zap, Award, Trophy, Loader2 } from 'lucide-react'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import PageHeader from '../components/dashboard/PageHeader'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config/api'

type Player = {
  id: string | number
  username: string
  rating_rapid: number
  rating_blitz: number
  avatar_url: string | null
  games_played: number
}

type LeaderboardData = {
  rapid: Player[]
  blitz: Player[]
}

const LeaderboardPage = () => {
  const { user, token } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [data, setData] = useState<LeaderboardData>({ rapid: [], blitz: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'rapid' | 'blitz'>('rapid')
  const [searchQuery, setSearchQuery] = useState('')

  const username = user?.username || 'Player'

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true)
        setError(null)
        if (!token) return

        const response = await fetch(`${API_BASE}/api/user/leaderboard`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard from the server.')
        }

        const resJson = await response.json()
        if (resJson.success && resJson.data) {
          setData(resJson.data)
        } else {
          throw new Error(resJson.message || 'Failed to fetch leaderboard data.')
        }
      } catch (err: any) {
        console.error('Error fetching leaderboard:', err)
        setError(err.message || 'Could not connect to the backend server.')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchLeaderboard()
    }
  }, [token])

  // Get active list based on toggle
  const playersList = data[mode] || []

  // Filter based on search query
  const filteredPlayers = playersList.filter((p) =>
    p.username.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )

  // Top 3 players (podium) - only shown when there's no search filter
  const podiumPlayers = filteredPlayers.slice(0, 3)
  const firstPlace = podiumPlayers[0]
  const secondPlace = podiumPlayers[1]
  const thirdPlace = podiumPlayers[2]

  // Table players: if searching, show all matching; else show from rank 4 onwards
  const tablePlayers = searchQuery.trim() ? filteredPlayers : filteredPlayers.slice(3)

  return (
    <div className={`dashboard-shell${isCollapsed ? ' sidebar-collapsed' : ''}`}>
      <DashboardSidebar
        username={username}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <main className="dashboard-main">
        <PageHeader
          title={<>Global <span>Leaderboard</span></>}
          subtitle="See how you stack up against the best chess players on the platform."
        />

        <div className="dashboard-content leaderboard-container">
          {/* Controls */}
          <div className="leaderboard-controls">
            <div className="leaderboard-toggle-group">
              <button
                className={`leaderboard-toggle-btn ${mode === 'rapid' ? 'active' : ''}`}
                onClick={() => setMode('rapid')}
                type="button"
                aria-label="Show Rapid Leaderboard"
              >
                <Swords size={16} />
                <span>Rapid</span>
              </button>
              <button
                className={`leaderboard-toggle-btn ${mode === 'blitz' ? 'active' : ''}`}
                onClick={() => setMode('blitz')}
                type="button"
                aria-label="Show Blitz Leaderboard"
              >
                <Zap size={16} />
                <span>Blitz</span>
              </button>
            </div>

            <div className="leaderboard-search">
              <Search size={18} className="search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search players by username"
              />
            </div>
          </div>

          {loading ? (
            <div className="leaderboard-loading-wrapper">
              <Loader2 className="animate-spin" size={32} />
              <p>Loading player rankings...</p>
            </div>
          ) : error ? (
            <div className="leaderboard-error">
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className="retry-btn">
                Retry
              </button>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="leaderboard-empty">
              <p>No players found matching "{searchQuery}"</p>
            </div>
          ) : (
            <>
              {/* Podium - only shown when there's no search query */}
              {!searchQuery.trim() && podiumPlayers.length > 0 && (
                <div className="leaderboard-podium">
                  {/* 2nd Place */}
                  {secondPlace && (
                    <div className={`podium-card podium-card--second ${user?.username === secondPlace.username ? 'podium-card--self' : ''}`}>
                      <div className="podium-rank" aria-label="Second Place">2</div>
                      <div className="podium-avatar-wrapper">
                        {secondPlace.avatar_url ? (
                          <img src={secondPlace.avatar_url} alt="" className="podium-avatar" />
                        ) : (
                          <div className="podium-avatar-placeholder">
                            {secondPlace.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="podium-badge silver-badge" aria-hidden="true">
                          <Award size={14} />
                        </div>
                      </div>
                      <div className="podium-username" title={secondPlace.username}>
                        {secondPlace.username}
                        {user?.username === secondPlace.username && <span className="self-tag">You</span>}
                      </div>
                      <div className="podium-rating">
                        {mode === 'rapid' ? secondPlace.rating_rapid : secondPlace.rating_blitz} <span>ELO</span>
                      </div>
                      <div className="podium-games">{secondPlace.games_played} games</div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {firstPlace && (
                    <div className={`podium-card podium-card--first ${user?.username === firstPlace.username ? 'podium-card--self' : ''}`}>
                      <div className="podium-rank" aria-label="First Place">
                        <Crown size={20} className="crown-icon" aria-hidden="true" />
                        1
                      </div>
                      <div className="podium-avatar-wrapper">
                        {firstPlace.avatar_url ? (
                          <img src={firstPlace.avatar_url} alt="" className="podium-avatar" />
                        ) : (
                          <div className="podium-avatar-placeholder">
                            {firstPlace.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="podium-badge gold-badge" aria-hidden="true">
                          <Trophy size={14} />
                        </div>
                      </div>
                      <div className="podium-username" title={firstPlace.username}>
                        {firstPlace.username}
                        {user?.username === firstPlace.username && <span className="self-tag">You</span>}
                      </div>
                      <div className="podium-rating">
                        {mode === 'rapid' ? firstPlace.rating_rapid : firstPlace.rating_blitz} <span>ELO</span>
                      </div>
                      <div className="podium-games">{firstPlace.games_played} games</div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {thirdPlace && (
                    <div className={`podium-card podium-card--third ${user?.username === thirdPlace.username ? 'podium-card--self' : ''}`}>
                      <div className="podium-rank" aria-label="Third Place">3</div>
                      <div className="podium-avatar-wrapper">
                        {thirdPlace.avatar_url ? (
                          <img src={thirdPlace.avatar_url} alt="" className="podium-avatar" />
                        ) : (
                          <div className="podium-avatar-placeholder">
                            {thirdPlace.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="podium-badge bronze-badge" aria-hidden="true">
                          <Award size={14} />
                        </div>
                      </div>
                      <div className="podium-username" title={thirdPlace.username}>
                        {thirdPlace.username}
                        {user?.username === thirdPlace.username && <span className="self-tag">You</span>}
                      </div>
                      <div className="podium-rating">
                        {mode === 'rapid' ? thirdPlace.rating_rapid : thirdPlace.rating_blitz} <span>ELO</span>
                      </div>
                      <div className="podium-games">{thirdPlace.games_played} games</div>
                    </div>
                  )}
                </div>
              )}

              {/* Table section */}
              {tablePlayers.length > 0 && (
                <div className="leaderboard-table-container">
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th className="col-rank">Rank</th>
                        <th className="col-player">Player</th>
                        <th className="col-rating">Rating</th>
                        <th className="col-games">Games Played</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tablePlayers.map((player) => {
                        // Find the original overall rank based on its index in the sorted list
                        const absoluteRank = playersList.findIndex((p) => p.id === player.id) + 1
                        const isSelf = user?.username === player.username

                        return (
                          <tr
                            key={player.id}
                            className={`leaderboard-row ${isSelf ? 'leaderboard-row--self' : ''}`}
                          >
                            <td className="col-rank">
                              <span className={`rank-number rank-number--${absoluteRank <= 3 ? absoluteRank : 'normal'}`}>
                                {absoluteRank}
                              </span>
                            </td>
                            <td className="col-player">
                              <div className="player-cell">
                                {player.avatar_url ? (
                                  <img src={player.avatar_url} alt="" className="player-avatar" />
                                ) : (
                                  <div className="player-avatar-placeholder">
                                    {player.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="player-username" title={player.username}>
                                  {player.username}
                                  {isSelf && <span className="self-tag">You</span>}
                                </span>
                              </div>
                            </td>
                            <td className="col-rating">
                              <span className="rating-value">
                                {mode === 'rapid' ? player.rating_rapid : player.rating_blitz}
                              </span>
                            </td>
                            <td className="col-games">
                              <span className="games-value">{player.games_played}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default LeaderboardPage
