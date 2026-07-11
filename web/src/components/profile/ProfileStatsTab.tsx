import { Clock, Zap, Activity } from 'lucide-react'
import EloChart from './EloChart'
import type { HistoryPoint } from './EloChart'

type ProfileStatsTabProps = {
  stats: {
    user: {
      rating_rapid: number
      rating_blitz: number
    }
    stats: {
      wins: number
      losses: number
      draws: number
    }
    rapidHistory: HistoryPoint[]
    blitzHistory: HistoryPoint[]
  }
  ratingType: 'rapid' | 'blitz'
  setRatingType: (type: 'rapid' | 'blitz') => void
}

const ProfileStatsTab = ({ stats, ratingType, setRatingType }: ProfileStatsTabProps) => {
  const totalGames = stats.stats.wins + stats.stats.losses + stats.stats.draws
  const winRate = totalGames > 0 ? Math.round((stats.stats.wins / totalGames) * 100) : 0

  return (
    <div className="profile-stats-tab animate-fade-in">
      {/* ELO Summary Cards Grid */}
      <div className="profile-stats-cards">
        <div className="stat-card glass-panel stat-card--amber">
          <div className="stat-card-header">
            <span className="stat-card-label">Rapid Rating</span>
            <div className="stat-card-icon">
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.user.rating_rapid}</div>
          <span className="stat-card-footer">K-Factor: 32</span>
        </div>

        <div className="stat-card glass-panel stat-card--purple">
          <div className="stat-card-header">
            <span className="stat-card-label">Blitz Rating</span>
            <div className="stat-card-icon">
              <Zap size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.user.rating_blitz}</div>
          <span className="stat-card-footer">K-Factor: 32</span>
        </div>

        <div className="stat-card glass-panel stat-card--cyan">
          <div className="stat-card-header">
            <span className="stat-card-label">Record (W / L / D)</span>
            <div className="stat-card-icon">
              <Activity size={20} />
            </div>
          </div>
          <div className="stat-card-value">
            {stats.stats.wins} - {stats.stats.losses} - {stats.stats.draws}
          </div>
          <span className="stat-card-footer">Win rate: {winRate}%</span>
        </div>
      </div>

      {/* Progression Chart Card */}
      <div className="chart-card glass-panel">
        <div className="chart-card-header">
          <div className="chart-card-title">
            <h3>Rating Progression</h3>
            <p>Monitor your performance rating over your recent games</p>
          </div>
          <div className="chart-toggle-buttons">
            <button
              className={`chart-toggle-btn ${
                ratingType === 'rapid' ? 'chart-toggle-btn--active chart-toggle-btn--rapid' : ''
              }`}
              onClick={() => setRatingType('rapid')}
            >
              Rapid
            </button>
            <button
              className={`chart-toggle-btn ${
                ratingType === 'blitz' ? 'chart-toggle-btn--active chart-toggle-btn--blitz' : ''
              }`}
              onClick={() => setRatingType('blitz')}
            >
              Blitz
            </button>
          </div>
        </div>

        <div className="chart-card-body">
          <EloChart
            history={ratingType === 'rapid' ? stats.rapidHistory : stats.blitzHistory}
            ratingType={ratingType}
          />
        </div>
      </div>
    </div>
  )
}

export default ProfileStatsTab
