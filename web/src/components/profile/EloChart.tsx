import { Activity } from 'lucide-react'
import { useState } from 'react'

export type HistoryPoint = {
  rating: number
  change: number
  date: string
}

type EloChartProps = {
  history: HistoryPoint[]
  ratingType: 'rapid' | 'blitz'
}

const EloChart = ({ history, ratingType }: EloChartProps) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number
    x: number
    y: number
    point: HistoryPoint
  } | null>(null)

  if (!history || history.length === 0) {
    return (
      <div className="chart-empty">
        <Activity size={24} />
        <p>No rating changes recorded yet.</p>
      </div>
    )
  }

  // Chart Dimensions
  const width = 640
  const height = 280
  const paddingLeft = 50
  const paddingBottom = 40
  const paddingTop = 20
  const paddingRight = 20

  const graphWidth = width - paddingLeft - paddingRight
  const graphHeight = height - paddingTop - paddingBottom

  // Find min/max values
  const ratings = history.map((h) => h.rating)
  let minVal = Math.min(...ratings)
  let maxVal = Math.max(...ratings)

  // Cushion the boundaries
  if (minVal === maxVal) {
    minVal -= 50
    maxVal += 50
  } else {
    const range = maxVal - minVal
    minVal = Math.max(0, Math.floor(minVal - range * 0.15))
    maxVal = Math.ceil(maxVal + range * 0.15)
  }

  // Coordinates mapping helper
  const getCoords = (index: number, rating: number) => {
    const count = history.length
    const x = paddingLeft + (index / Math.max(1, count - 1)) * graphWidth
    const y = height - paddingBottom - ((rating - minVal) / (maxVal - minVal)) * graphHeight
    return { x, y }
  }

  // Generate path code
  let pathD = ''
  const points: { x: number; y: number; point: HistoryPoint; idx: number }[] = []

  history.forEach((h, i) => {
    const { x, y } = getCoords(i, h.rating)
    points.push({ x, y, point: h, idx: i })
    if (i === 0) {
      pathD += `M ${x} ${y}`
    } else {
      pathD += ` L ${x} ${y}`
    }
  })

  // Construct Area Path (for gradient fill under the line)
  let areaD = ''
  if (points.length > 0) {
    const first = points[0]
    const last = points[points.length - 1]
    const bottomY = height - paddingBottom
    areaD = `${pathD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`
  }

  // Gridlines (4 horizontal helper lines)
  const gridCount = 4
  const gridRatings: number[] = []
  for (let i = 0; i <= gridCount; i++) {
    gridRatings.push(Math.round(minVal + (i / gridCount) * (maxVal - minVal)))
  }

  return (
    <div className="svg-chart-container">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        className="svg-rating-chart"
      >
        <defs>
          {/* Smooth glowing line gradient */}
          <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ratingType === 'rapid' ? 'var(--cyan)' : 'var(--amber)'} />
            <stop offset="100%" stopColor={ratingType === 'rapid' ? 'var(--accent-cyan)' : 'var(--accent-amber)'} />
          </linearGradient>
          {/* Area under line fill gradient */}
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={ratingType === 'rapid' ? 'var(--cyan)' : 'var(--amber)'}
              stopOpacity="0.15"
            />
            <stop
              offset="100%"
              stopColor={ratingType === 'rapid' ? 'var(--cyan)' : 'var(--amber)'}
              stopOpacity="0.0"
            />
          </linearGradient>
        </defs>

        {/* Grid lines & Y-axis labels */}
        {gridRatings.map((ratingVal) => {
          const y = height - paddingBottom - ((ratingVal - minVal) / (maxVal - minVal)) * graphHeight
          return (
            <g key={ratingVal} className="chart-grid-group">
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                className="chart-grid-line"
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                className="chart-axis-text chart-y-axis-text"
                textAnchor="end"
              >
                {ratingVal}
              </text>
            </g>
          )
        })}

        {/* X-axis labels (shows dates for first, middle, and last data points) */}
        {points.length > 0 &&
          [0, Math.floor(points.length / 2), points.length - 1].map((ptIndex) => {
            if (ptIndex >= points.length) return null
            const pt = points[ptIndex]
            const dateStr = new Date(pt.point.date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric'
            })
            return (
              <text
                key={ptIndex}
                x={pt.x}
                y={height - paddingBottom + 20}
                className="chart-axis-text chart-x-axis-text"
                textAnchor="middle"
              >
                {dateStr}
              </text>
            )
          })}

        {/* Shaded Area Under Line */}
        {areaD && <path d={areaD} fill="url(#area-gradient)" className="chart-area" />}

        {/* Line Path */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="url(#line-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            className="chart-line-path"
          />
        )}

        {/* Nodes & Interactive Targets */}
        {points.map((pt, i) => (
          <g
            key={i}
            className={`chart-node-group${hoveredPoint?.index === i ? ' chart-node-group--hovered' : ''}`}
            onMouseEnter={() =>
              setHoveredPoint({
                index: i,
                x: pt.x,
                y: pt.y,
                point: pt.point
              })
            }
            onMouseLeave={() => setHoveredPoint(null)}
          >
            {/* Inner visible circle */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4.5"
              fill={ratingType === 'rapid' ? 'var(--cyan)' : 'var(--amber)'}
              className="chart-node"
            />
            {/* Hover effect halo ring */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="10"
              fill={ratingType === 'rapid' ? 'var(--cyan)' : 'var(--amber)'}
              fillOpacity="0.25"
              className="chart-node-halo"
            />
            {/* Giant invisible trigger circle for easy hovering */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="24"
              fill="transparent"
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}
      </svg>

      {/* Hover Tooltip Popup */}
      {hoveredPoint && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100 - 10}%`
          }}
        >
          <div className="tooltip-date">
            {new Date(hoveredPoint.point.date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="tooltip-rating">
            Rating: <strong>{hoveredPoint.point.rating}</strong>
          </div>
          {hoveredPoint.point.change !== 0 && (
            <div
              className={`tooltip-change ${
                hoveredPoint.point.change > 0 ? 'change-positive' : 'change-negative'
              }`}
            >
              {hoveredPoint.point.change > 0 ? '+' : ''}
              {hoveredPoint.point.change} Elo
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default EloChart
