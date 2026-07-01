import { Swords, Flame, Clock, Zap } from 'lucide-react'

interface QuickStatsProps {
  totalGames: number | string
  streak: number | string
  ratingRapid: number | string
  ratingBlitz: number | string
}

const QuickStats = ({ totalGames, streak, ratingRapid, ratingBlitz }: QuickStatsProps) => {
  const stats = [
    { icon: Swords, label: 'Total Games', value: totalGames.toString(), type: 'cyan' },
    { icon: Flame, label: 'Win Streak', value: streak.toString(), type: 'orange' },
    { icon: Clock, label: 'Rapid Rating', value: ratingRapid.toString(), type: 'amber' },
    { icon: Zap, label: 'Blitz Rating', value: ratingBlitz.toString(), type: 'indigo' },
  ]

  return (
    <section className="quick-stats" aria-label="Player statistics">
      {stats.map(({ icon: Icon, label, value, type }) => (
        <div className={`stat-item stat-item--${type}`} key={label}>
          <div className="stat-item__icon-wrapper">
            <Icon size={18} aria-hidden="true" />
          </div>
          <div className="stat-item__info">
            <span className="stat-item__label">{label}</span>
            <span className="stat-item__value">{value}</span>
          </div>
        </div>
      ))}
    </section>
  )
}

export default QuickStats
