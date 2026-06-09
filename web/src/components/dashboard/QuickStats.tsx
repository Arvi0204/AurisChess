import { Activity, Award, Flame, Mic, Target } from 'lucide-react'

const stats = [
  { icon: Target, label: 'Games Played', value: '0', accent: false },
  { icon: Activity, label: 'Win Rate', value: '—', accent: false },
  { icon: Flame, label: 'Streak', value: '0', accent: true },
  { icon: Mic, label: 'Voice Accuracy', value: '—', accent: false },
  { icon: Award, label: 'Rating', value: 'Unrated', accent: true },
]

const QuickStats = () => {
  return (
    <section className="quick-stats" aria-label="Player statistics">
      {stats.map(({ icon: Icon, label, value, accent }) => (
        <div className={`stat-item${accent ? ' stat-item--accent' : ''}`} key={label}>
          <Icon size={18} aria-hidden="true" />
          <span className="stat-value">{value}</span>
          <span className="stat-label">{label}</span>
        </div>
      ))}
    </section>
  )
}

export default QuickStats
