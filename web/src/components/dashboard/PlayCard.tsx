import { Bot, Mic, Users } from 'lucide-react'

const cards = [
  {
    id: 'play-online',
    icon: Users,
    title: 'Play Online',
    description: 'Challenge real players in rated voice-enabled matches.',
    badge: '0 online',
    accentClass: 'play-card--cyan',
  },
  {
    id: 'play-computer',
    icon: Bot,
    title: 'Play vs Computer',
    description: 'Practice against AI with adjustable difficulty levels.',
    badge: 'All levels',
    accentClass: 'play-card--amber',
  },
]

const PlayCard = () => {
  return (
    <section className="play-cards" aria-label="Play modes">
      {cards.map(({ id, icon: Icon, title, description, badge, accentClass }) => (
        <article className={`play-card ${accentClass}`} key={id} id={id}>
          <div className="play-card-icon">
            <Icon size={28} aria-hidden="true" />
          </div>

          <div className="play-card-body">
            <h3>{title}</h3>
            <p>{description}</p>

            <div className="play-card-footer">
              <span className="play-card-badge">{badge}</span>
              <span className="play-card-voice">
                <Mic size={13} aria-hidden="true" />
                Voice Enabled
              </span>
            </div>
          </div>

          <div className="play-card-glow" aria-hidden="true" />
        </article>
      ))}
    </section>
  )
}

export default PlayCard
