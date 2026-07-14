import { Swords, Flame, Clock, Zap } from 'lucide-react'
import SparklineChart from './SparklineChart'

export interface RatingHistoryPoint {
  rating: number
}

interface QuickStatsProps {
  totalGames: number | string
  streak: number | string
  ratingRapid: number | string
  ratingBlitz: number | string
  rapidHistory?: RatingHistoryPoint[]
  blitzHistory?: RatingHistoryPoint[]
}

// Stats without a sparkline have no history/idPrefix; those with one require both.
type StatItem =
  | { icon: React.ElementType; label: string; value: string; type: string }
  | { icon: React.ElementType; label: string; value: string; type: string; history: RatingHistoryPoint[]; idPrefix: string }

const QuickStats = ({
  totalGames,
  streak,
  ratingRapid,
  ratingBlitz,
  rapidHistory,
  blitzHistory,
}: QuickStatsProps) => {
  const stats: StatItem[] = [
    { icon: Swords, label: 'Total Games', value: totalGames.toString(), type: 'cyan' },
    { icon: Flame, label: 'Win Streak', value: streak.toString(), type: 'orange' },
    {
      icon: Clock,
      label: 'Rapid Rating',
      value: ratingRapid.toString(),
      type: 'amber',
      history: rapidHistory ?? [],
      idPrefix: 'rapid',
    },
    {
      icon: Zap,
      label: 'Blitz Rating',
      value: ratingBlitz.toString(),
      type: 'indigo',
      history: blitzHistory ?? [],
      idPrefix: 'blitz',
    },
  ]

  return (
    <section className="quick-stats" aria-label="Player statistics">
      {stats.map((stat) => (
        <div className={`stat-item stat-item--${stat.type}`} key={stat.label}>
          <div className="stat-item__icon-wrapper">
            <stat.icon size={18} aria-hidden="true" />
          </div>
          <div className="stat-item__info">
            <span className="stat-item__label">{stat.label}</span>
            <span className="stat-item__value">{stat.value}</span>
          </div>
          {'history' in stat && stat.history.length >= 2 && (
            <SparklineChart history={stat.history} idPrefix={stat.idPrefix} />
          )}
        </div>
      ))}
    </section>
  )
}

export default QuickStats
