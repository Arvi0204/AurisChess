import { Bot, User } from 'lucide-react'
import { formatTime } from '../../utils/chessHelpers'

export type PlayerRole = 'user' | 'ai' | 'opponent'

export type PlayerInfoBarProps = {
  name: string
  role: PlayerRole
  subtitle?: string        // e.g. "Elo 1200" or "Player"
  showClock?: boolean
  clockSeconds?: number
  isActiveTurn?: boolean
  isAiTurn?: boolean       // drives amber vs cyan clock colour
}

const PlayerInfoBar = ({
  name,
  role,
  subtitle,
  showClock = false,
  clockSeconds = 0,
  isActiveTurn = false,
  isAiTurn = false,
}: PlayerInfoBarProps) => {
  const avatarClass =
    role === 'ai'
      ? 'player-avatar player-avatar--ai'
      : 'player-avatar player-avatar--user'

  const clockClass = isAiTurn
    ? `player-clock${isActiveTurn ? ' player-clock--active-turn-ai' : ''}`
    : `player-clock${isActiveTurn ? ' player-clock--active-turn' : ''}`

  return (
    <div className="player-info-bar">
      <div className="player-info-details">
        <div className={avatarClass}>
          {role === 'ai' ? <Bot size={18} /> : <User size={18} />}
        </div>
        <div className="player-name-container">
          <span className="player-name">{name}</span>
          {subtitle && <span className="player-elo">{subtitle}</span>}
        </div>
      </div>

      {showClock && (
        <div className={clockClass}>{formatTime(clockSeconds)}</div>
      )}
    </div>
  )
}

export default PlayerInfoBar
