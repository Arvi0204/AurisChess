import { Bot, Mic, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const cards = [
  {
    id: 'play-online',
    icon: Users,
    title: 'Play Online',
    description: 'Challenge real players in rated voice-enabled matches.',
    badge: '0 online',
    accentClass: 'play-card--cyan',
    href: '/play?mode=online',
  },
  {
    id: 'play-computer',
    icon: Bot,
    title: 'Play vs Computer',
    description: 'Practice against AI with adjustable difficulty levels.',
    badge: 'All levels',
    accentClass: 'play-card--amber',
    href: '/play?mode=computer',
  },
]

const PlayCard = () => {
  return (
    <section className="play-cards" aria-label="Play modes">
      {cards.map(({ id, icon: Icon, title, description, badge, accentClass, href }) => (
        <Link to={href} className={`play-card ${accentClass}`} key={id} id={id}>
          <div className="play-card__icon">
            <Icon size={28} aria-hidden="true" />
          </div>

          <div className="play-card__body">
            <h3>{title}</h3>
            <p>{description}</p>

            <div className="play-card__footer">
              <span className="play-card__badge">{badge}</span>
              <span className="play-card__voice">
                <Mic size={13} aria-hidden="true" />
                Voice Enabled
              </span>
            </div>
          </div>

          <div className="play-card__glow" aria-hidden="true" />
        </Link>
      ))}
    </section>
  )
}

export default PlayCard
