import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, Mic, Swords, Users, Loader2, X } from 'lucide-react'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'

const engineLevels = [
  { id: 'easy', label: 'Easy', elo: '800' },
  { id: 'medium', label: 'Medium', elo: '1200' },
  { id: 'hard', label: 'Hard', elo: '1800' },
  { id: 'maximum', label: 'Maximum', elo: '2500' },
]

const timeControls = [
  {
    category: 'Rapid',
    options: [
      { id: 'rapid-10-0', label: '10+0', minutes: 10, increment: 0 },
      { id: 'rapid-15-10', label: '15+10', minutes: 15, increment: 10 },
    ],
  },
  {
    category: 'Blitz',
    options: [
      { id: 'blitz-5-0', label: '5+0', minutes: 5, increment: 0 },
    ],
  },
]

const PlayPage = () => {
  const [searchParams] = useSearchParams()
  const modeParam = searchParams.get('mode') // 'computer' or 'online'

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState('medium')
  const [selectedTimeControl, setSelectedTimeControl] = useState('rapid-10-0')

  // Interactive Matchmaking States
  const [isSearching, setIsSearching] = useState(false)
  const [searchTime, setSearchTime] = useState(0)

  // Interactive Engine States
  const [isInitializingEngine, setIsInitializingEngine] = useState(false)
  const [engineLoadProgress, setEngineLoadProgress] = useState(0)
  const [engineStatusText, setEngineStatusText] = useState('Spinning up neural networks...')

  let username = 'Player'
  try {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      username = user.username || 'Player'
    }
  } catch {
    // fallback to default
  }

  // Timer for Matchmaking
  useEffect(() => {
    let timerId: any
    if (isSearching) {
      timerId = setInterval(() => {
        setSearchTime((prev) => prev + 1)
      }, 1000)
    } else {
      setSearchTime(0)
    }
    return () => clearInterval(timerId)
  }, [isSearching])

  // Progress simulation for Engine Initialization
  useEffect(() => {
    let progressId: any
    if (isInitializingEngine) {
      progressId = setInterval(() => {
        setEngineLoadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressId)
            setEngineStatusText('Engine Ready! Good Luck.')
            setTimeout(() => {
              setIsInitializingEngine(false)
              setEngineLoadProgress(0)
            }, 1000)
            return 100
          }
          const next = prev + Math.floor(Math.random() * 12) + 12
          const clamped = Math.min(next, 100)
          
          if (clamped < 35) {
            setEngineStatusText('Loading opening book databases...')
          } else if (clamped < 70) {
            setEngineStatusText('Initializing transposition tables...')
          } else if (clamped < 100) {
            setEngineStatusText('Calibrating neural networks...')
          }
          
          return clamped
        })
      }, 200)
    } else {
      setEngineLoadProgress(0)
      setEngineStatusText('Spinning up neural networks...')
    }
    return () => clearInterval(progressId)
  }, [isInitializingEngine])

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const currentLevel = engineLevels.find((l) => l.id === selectedLevel)
  const currentTC = timeControls
    .flatMap((g) => g.options)
    .find((o) => o.id === selectedTimeControl)

  return (
    <div className={`dashboard-shell play-shell${isCollapsed ? ' sidebar-collapsed' : ''}`}>
      <DashboardSidebar
        username={username}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <main className="dashboard-main">
        <div className="play-page-content">
          <div className="play-page-heading">
            <h2>Choose Your Game Mode</h2>
            <p>Select how you want to play and jump right into a match</p>
          </div>

          <div className="play-mode-grid">
            {/* ── Card 1: Play vs Engine ──────────────────────── */}
            <article 
              className={`play-mode-card play-mode-card--amber${modeParam === 'computer' ? ' highlighted-amber' : ''}`} 
              id="play-vs-engine"
            >
              <div className="play-mode-card-glow" aria-hidden="true" />

              <div className="play-mode-card-header">
                <div className="play-mode-icon">
                  <Bot size={30} aria-hidden="true" />
                </div>
                <div>
                  <h3>Play vs Engine</h3>
                  <p>Challenge the computer and sharpen your skills</p>
                </div>
              </div>

              <div className="play-mode-card-body">
                <span className="play-mode-section-label">Engine Strength</span>
                <div className="engine-levels">
                  {engineLevels.map(({ id, label, elo }) => (
                    <button
                      key={id}
                      type="button"
                      className={`engine-level-btn${selectedLevel === id ? ' active' : ''}`}
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
                    <span className="engine-level-current">
                      Elo {currentLevel.elo}
                    </span>
                  </div>
                )}
              </div>

              <div className="play-mode-card-footer">
                <span className="play-mode-voice-badge">
                  <Mic size={13} aria-hidden="true" />
                  Voice Enabled
                </span>
                <button 
                  type="button" 
                  className="play-mode-cta play-mode-cta--amber"
                  onClick={() => setIsInitializingEngine(true)}
                >
                  <Swords size={18} aria-hidden="true" />
                  Play
                </button>
              </div>
            </article>

            {/* ── Card 2: Play Online (Multiplayer) ──────────── */}
            <article 
              className={`play-mode-card play-mode-card--cyan${modeParam === 'online' ? ' highlighted-cyan' : ''}`} 
              id="play-online-multiplayer"
            >
              <div className="play-mode-card-glow" aria-hidden="true" />

              <div className="play-mode-card-header">
                <div className="play-mode-icon">
                  <Users size={30} aria-hidden="true" />
                </div>
                <div>
                  <h3>Play Online</h3>
                  <p>Challenge real players in voice-enabled matches</p>
                </div>
              </div>

              <div className="play-mode-card-body">
                {timeControls.map(({ category, options }) => (
                  <div key={category} className="time-control-group">
                    <span className="play-mode-section-label">{category}</span>
                    <div className="time-control-options">
                      {options.map(({ id, label, minutes, increment }) => (
                        <button
                          key={id}
                          type="button"
                          className={`time-control-pill${selectedTimeControl === id ? ' active' : ''}`}
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

              <div className="play-mode-card-footer">
                <span className="play-mode-voice-badge">
                  <Mic size={13} aria-hidden="true" />
                  Voice Enabled
                </span>
                <button 
                  type="button" 
                  className="play-mode-cta play-mode-cta--cyan"
                  onClick={() => setIsSearching(true)}
                >
                  <Users size={18} aria-hidden="true" />
                  Find Match
                </button>
              </div>
            </article>
          </div>
        </div>
      </main>

      {/* ── Visual Overlay: Initializing AI Engine ──────────────────────── */}
      {isInitializingEngine && (
        <div className="play-overlay" role="dialog" aria-modal="true" aria-label="Engine loading status">
          <div className="play-overlay-card play-overlay-card--amber">
            <div className="play-overlay-visual">
              <div className="play-overlay-icon-wrapper">
                <Bot size={32} />
              </div>
              <div className="play-overlay-pulse" />
              <div className="play-overlay-pulse play-overlay-pulse-2" />
            </div>

            <h4>Preparing Engine</h4>
            <p>Setting up AurisChess AI (Strength: {currentLevel?.label} - Elo {currentLevel?.elo})</p>

            <div className="play-overlay-progress-container">
              <div 
                className="play-overlay-progress-bar" 
                style={{ width: `${engineLoadProgress}%` }}
              />
            </div>

            <span className="play-overlay-status">
              {engineStatusText} ({engineLoadProgress}%)
            </span>

            <button 
              type="button" 
              className="play-overlay-cancel-btn"
              onClick={() => setIsInitializingEngine(false)}
            >
              <X size={16} aria-hidden="true" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Visual Overlay: Multiplayer Matchmaking ──────────────────────── */}
      {isSearching && (
        <div className="play-overlay" role="dialog" aria-modal="true" aria-label="Matchmaking status">
          <div className="play-overlay-card play-overlay-card--cyan">
            <div className="play-overlay-visual">
              <div className="play-overlay-icon-wrapper">
                <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
              </div>
              <div className="play-overlay-pulse" />
              <div className="play-overlay-pulse play-overlay-pulse-2" />
            </div>

            <h4>Finding Match</h4>
            <p>Voice-Enabled {currentTC?.label} Game ({currentTC?.minutes}m {currentTC?.increment ? `+ ${currentTC.increment}s` : ''})</p>

            <div className="play-overlay-timer">
              {formatTime(searchTime)}
            </div>

            <span className="play-overlay-status">
              Searching for a worthy opponent...
            </span>

            <button 
              type="button" 
              className="play-overlay-cancel-btn"
              style={{ marginTop: '20px' }}
              onClick={() => setIsSearching(false)}
            >
              <X size={16} aria-hidden="true" />
              Cancel Search
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayPage
