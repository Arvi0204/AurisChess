interface SparklineChartProps {
  history: { rating: number }[]
  idPrefix: string
}

const WIDTH = 100
const HEIGHT = 36
const PADDING = 2

const SparklineChart = ({ history, idPrefix }: SparklineChartProps) => {
  const pointsToUse = history.slice(-8)
  if (pointsToUse.length < 2) return null

  const ratings = pointsToUse.map((h) => h.rating)
  const min = Math.min(...ratings)
  const max = Math.max(...ratings)
  const range = max - min || 20 // prevent divide-by-zero when all ratings are equal

  const chartWidth = WIDTH - PADDING * 2
  const chartHeight = HEIGHT - PADDING * 2

  const svgPoints = pointsToUse.map((h, i) => ({
    x: PADDING + (i / (pointsToUse.length - 1)) * chartWidth,
    y: PADDING + chartHeight - ((h.rating - min) / range) * chartHeight,
  }))

  const pathD = svgPoints.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    '',
  )

  const areaD =
    svgPoints.length > 0
      ? `${pathD} L ${svgPoints[svgPoints.length - 1].x} ${HEIGHT} L ${svgPoints[0].x} ${HEIGHT} Z`
      : ''

  const gradientId = `sparkline-grad-${idPrefix}`

  return (
    <div className="stat-item__sparkline" aria-hidden="true">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {areaD && <path d={areaD} fill={`url(#${gradientId})`} />}
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

export default SparklineChart
