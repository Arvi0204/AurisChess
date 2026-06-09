import { Clock, Gamepad2 } from 'lucide-react'

const RecentGames = () => {
  return (
    <section className="recent-games" aria-label="Recent games">
      <div className="recent-games-header">
        <h2>
          <Clock size={18} aria-hidden="true" />
          Recent Games
        </h2>
        <a href="#history" className="recent-games-link">
          View all
        </a>
      </div>

      <div className="recent-games-empty">
        <div className="recent-games-empty-icon" aria-hidden="true">
          <Gamepad2 size={36} />
        </div>
        <h3>No games yet</h3>
        <p>Start your first game and your match history will appear here.</p>
        <a href="#play" className="primary-button recent-games-cta">
          Play Now
        </a>
      </div>
    </section>
  )
}

export default RecentGames
