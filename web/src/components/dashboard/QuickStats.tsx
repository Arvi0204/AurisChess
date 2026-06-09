import { Activity, Award, Flame, Mic, Target } from 'lucide-react'

const stats = [
  { icon: Target, label: 'Games Played', value: '0', type: 'cyan' },
  { icon: Activity, label: 'Win Rate', value: '—', type: 'indigo' },
  { icon: Flame, label: 'Streak', value: '0', type: 'orange' },
  { icon: Mic, label: 'Voice Accuracy', value: '—', type: 'emerald' },
  { icon: Award, label: 'Rating', value: 'Unrated', type: 'amber' },
]

const QuickStats = () => {
  return (
    <section className="quick-stats" aria-label="Player statistics">
      {stats.map(({ icon: Icon, label, value, type }) => (
        <div className={`stat-item stat-item--${type}`} key={label}>
          <div className="stat-icon-wrapper">
            <Icon size={18} aria-hidden="true" />
          </div>
          <div className="stat-info">
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
          </div>
        </div>
      ))}
    </section>
  )
}

export default QuickStats
