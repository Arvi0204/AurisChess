import React from 'react'
import { Bot, Mic, Swords } from 'lucide-react'
import colorWhite from '../../assets/color-white.svg'
import colorRandom from '../../assets/color-random.svg'
import colorBlack from '../../assets/color-black.svg'

interface EngineLevel {
  id: string
  label: string
  elo: string
}

interface EngineSetupCardProps {
  selectedLevel: string
  setSelectedLevel: (level: string) => void
  selectedEngineColor: 'white' | 'black' | 'random'
  setSelectedEngineColor: (color: 'white' | 'black' | 'random') => void
  onPlay: () => void
  modeParam: string | null
  engineLevels: EngineLevel[]
}

const EngineSetupCard: React.FC<EngineSetupCardProps> = ({
  selectedLevel,
  setSelectedLevel,
  selectedEngineColor,
  setSelectedEngineColor,
  onPlay,
  modeParam,
  engineLevels,
}) => {
  const currentLevel = engineLevels.find((l) => l.id === selectedLevel)

  return (
    <article
      className={`play-mode-card play-mode-card--amber${
        modeParam === 'computer' ? ' play-mode-card--highlighted-amber' : ''
      }`}
      id="play-vs-engine"
    >
      <div className="play-mode-card__glow" aria-hidden="true" />

      <div className="play-mode-card__header">
        <div className="play-mode-card__icon">
          <Bot size={30} aria-hidden="true" />
        </div>
        <div>
          <h3>Play vs Engine</h3>
          <p>Challenge the computer and sharpen your skills</p>
        </div>
      </div>

      <div className="play-mode-card__body">
        <span className="play-mode-section-label">Engine Strength</span>
        <div className="engine-levels">
          {engineLevels.map(({ id, label, elo }) => (
            <button
              key={id}
              type="button"
              className={`engine-level-btn${
                selectedLevel === id ? ' engine-level-btn--active' : ''
              }`}
              onClick={() => setSelectedLevel(id)}
            >
              <span className="engine-level-name">{label}</span>
              <span className="engine-level-elo">Elo {elo}</span>
            </button>
          ))}
        </div>

        {currentLevel && (
          <div className="engine-level-indicator">
            <div className="engine-level-bar">
              <div
                className="engine-level-fill"
                style={{
                  width: `${
                    ((engineLevels.findIndex((l) => l.id === selectedLevel) + 1) /
                      engineLevels.length) *
                    100
                  }%`,
                }}
              />
            </div>
            <span className="engine-level-current">Elo {currentLevel.elo}</span>
          </div>
        )}

        {/* Play As Color Selector */}
        <div className="play-as-section">
          <span className="play-mode-section-label">Play As</span>
          <div className="color-selector">
            <button
              type="button"
              className={`color-selector-btn${
                selectedEngineColor === 'white' ? ' color-selector-btn--active' : ''
              }`}
              onClick={() => setSelectedEngineColor('white')}
              title="Play as White"
            >
              <img src={colorWhite} alt="White" className="color-selector-img" />
            </button>
            <button
              type="button"
              className={`color-selector-btn${
                selectedEngineColor === 'random' ? ' color-selector-btn--active' : ''
              }`}
              onClick={() => setSelectedEngineColor('random')}
              title="Play as Random"
            >
              <img
                src={colorRandom}
                alt="Random"
                className="color-selector-img"
                style={{ borderRadius: '10px' }}
              />
            </button>
            <button
              type="button"
              className={`color-selector-btn${
                selectedEngineColor === 'black' ? ' color-selector-btn--active' : ''
              }`}
              onClick={() => setSelectedEngineColor('black')}
              title="Play as Black"
            >
              <img src={colorBlack} alt="Black" className="color-selector-img" />
            </button>
          </div>
        </div>
      </div>

      <div className="play-mode-card__footer">
        <span className="play-mode-card__voice-badge">
          <Mic size={13} aria-hidden="true" />
          Voice Enabled
        </span>
        <button
          type="button"
          className="play-mode-cta play-mode-cta--amber"
          onClick={onPlay}
        >
          <Swords size={18} aria-hidden="true" />
          Play
        </button>
      </div>
    </article>
  )
}

export default EngineSetupCard
