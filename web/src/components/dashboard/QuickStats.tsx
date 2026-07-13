import { Swords, Flame, Clock, Zap } from 'lucide-react'

interface QuickStatsProps {
  totalGames: number | string
  streak: number | string
  ratingRapid: number | string
  ratingBlitz: number | string
  rapidHistory?: any[]
  blitzHistory?: any[]
}

const QuickStats = ({
  totalGames,
  streak,
  ratingRapid,
  ratingBlitz,
  rapidHistory,
  blitzHistory,
}: QuickStatsProps) => {
  const renderSparkline = (history: any[] | undefined, idPrefix: string) => {
    if (!history || history.length < 2) return null

    // Take the last 8 points to keep it neat
    const pointsToUse = history.slice(-8)
    const ratings = pointsToUse.map((h) => h.rating)
    const min = Math.min(...ratings)
    const max = Math.max(...ratings)
    const range = max - min || 20 // prevent divide by zero

    const width = 100
    const height = 36
    const padding = 2
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const svgPoints = pointsToUse.map((h, i) => {
      const x = padding + (i / (pointsToUse.length - 1)) * chartWidth
      const y = padding + chartHeight - ((h.rating - min) / range) * chartHeight
      return { x, y }
    })

    const pathD = svgPoints.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
    }, '')

    const areaD =
      svgPoints.length > 0
        ? `${pathD} L ${svgPoints[svgPoints.length - 1].x} ${height} L ${svgPoints[0].x} ${height} Z`
        : ''

    return (
      <div className="stat-item__sparkline" aria-hidden="true">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id={`sparkline-grad-${idPrefix}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {areaD && <path d={areaD} fill={`url(#sparkline-grad-${idPrefix})`} />}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>
    )
  }

  const stats = [
    { icon: Swords, label: 'Total Games', value: totalGames.toString(), type: 'cyan' },
    { icon: Flame, label: 'Win Streak', value: streak.toString(), type: 'orange' },
    {
      icon: Clock,
      label: 'Rapid Rating',
      value: ratingRapid.toString(),
      type: 'amber',
      history: rapidHistory,
      idPrefix: 'rapid',
    },
    {
      icon: Zap,
      label: 'Blitz Rating',
      value: ratingBlitz.toString(),
      type: 'indigo',
      history: blitzHistory,
      idPrefix: 'blitz',
    },
  ]

  return (
    <section className="quick-stats" aria-label="Player statistics">
      {stats.map(({ icon: Icon, label, value, type, history, idPrefix }) => (
        <div className={`stat-item stat-item--${type}`} key={label}>
          <div className="stat-item__icon-wrapper">
            <Icon size={18} aria-hidden="true" />
          </div>
          <div className="stat-item__info">
            <span className="stat-item__label">{label}</span>
            <span className="stat-item__value">{value}</span>
          </div>
          {history && renderSparkline(history, idPrefix)}
        </div>
      ))}
    </section>
  )
}

export default QuickStats
