import React from 'react'
import { Users, Mic } from 'lucide-react'

interface TimeControlOption {
  id: string
  label: string
  minutes: number
  increment: number
}

interface TimeControlGroup {
  category: string
  options: TimeControlOption[]
}

interface OnlineSetupCardProps {
  timeControls: TimeControlGroup[]
  selectedTimeControl: string
  setSelectedTimeControl: (tc: string) => void
  onFindMatch: () => void
  modeParam: string | null
}

const OnlineSetupCard: React.FC<OnlineSetupCardProps> = ({
  timeControls,
  selectedTimeControl,
  setSelectedTimeControl,
  onFindMatch,
  modeParam,
}) => {
  return (
    <article
      className={`play-mode-card play-mode-card--cyan${
        modeParam === 'online' ? ' play-mode-card--highlighted-cyan' : ''
      }`}
      id="play-online-multiplayer"
    >
      <div className="play-mode-card__glow" aria-hidden="true" />

      <div className="play-mode-card__header">
        <div className="play-mode-card__icon">
          <Users size={30} aria-hidden="true" />
        </div>
        <div>
          <h3>Play Online</h3>
          <p>Challenge real players in voice-enabled matches</p>
        </div>
      </div>

      <div className="play-mode-card__body">
        {timeControls.map(({ category, options }) => (
          <div key={category} className="time-control-group">
            <span className="play-mode-section-label">{category}</span>
            <div className="time-control-options">
              {options.map(({ id, label, minutes, increment }) => (
                <button
                  key={id}
                  type="button"
                  className={`time-control-pill${
                    selectedTimeControl === id ? ' time-control-pill--active' : ''
                  }`}
                  onClick={() => setSelectedTimeControl(id)}
                >
                  <span className="tc-time">{label}</span>
                  <span className="tc-detail">
                    {minutes} min{increment > 0 ? ` + ${increment}s` : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="play-mode-card__footer">
        <span className="play-mode-card__voice-badge">
          <Mic size={13} aria-hidden="true" />
          Voice Enabled
        </span>
        <button
          type="button"
          className="play-mode-cta play-mode-cta--cyan"
          onClick={onFindMatch}
        >
          <Users size={18} aria-hidden="true" />
          Find Match
        </button>
      </div>
    </article>
  )
}

export default OnlineSetupCard
