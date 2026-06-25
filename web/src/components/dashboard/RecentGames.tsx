import { useEffect, useState } from 'react'
import { Clock, Gamepad2, Copy, Check, Loader2, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE } from '../../config/api'

type GameRecord = {
  id: number
  game_type: 'rapid' | 'blitz' | 'engine'
  result: 'white' | 'black' | 'draw'
  pgn: string
  blindfold_moves: number
  total_moves: number
  created_at: string
  white_username: string | null
  white_email: string | null
  black_username: string | null
  black_email: string | null
}

const RecentGames = () => {
  const navigate = useNavigate()
  const [games, setGames] = useState<GameRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) {
          setLoading(false)
          return
        }

        const response = await fetch(`${API_BASE}/api/user/games`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch recent games')
        }

        const resJson = await response.json()
        setGames(resJson.data.games || [])
      } catch (err: any) {
        console.error('Error fetching games:', err)
        setError(err.message || 'Error fetching recent games.')
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [])

  const handleCopyPGN = (gameId: number, pgn: string) => {
    navigator.clipboard.writeText(pgn).then(() => {
      setCopiedId(gameId)
      setTimeout(() => setCopiedId(null), 2000)
    }).catch(err => {
      console.error('Failed to copy PGN:', err)
    })
  }

  // Get current user email from localStorage
  let userEmail = ''
  try {
    const stored = localStorage.getItem('user')
    if (stored) {
      const user = JSON.parse(stored)
      userEmail = user.email || ''
    }
  } catch {
    // fallback
  }

  const formatGameDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return ''
    }
  }

  return (
    <section className="recent-games" aria-label="Recent games">
      <div className="recent-games__header">
        <h2>
          <Clock size={18} aria-hidden="true" />
          Recent Games
        </h2>
        <Link to="/learn" className="recent-games__link">
          View all
        </Link>
      </div>

      {loading ? (
        <div className="recent-games__empty" style={{ padding: '40px 24px' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-cyan)', animation: 'spin 1.5s linear infinite' }} />
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>Loading recent games...</p>
        </div>
      ) : error ? (
        <div className="recent-games__empty" style={{ padding: '40px 24px' }}>
          <p style={{ color: 'var(--color-muted)' }}>{error}</p>
        </div>
      ) : games.length === 0 ? (
        <div className="recent-games__empty">
          <div className="recent-games__empty-icon" aria-hidden="true">
            <Gamepad2 size={36} />
          </div>
          <h3>No games yet</h3>
          <p>Start your first game and your match history will appear here.</p>
          <a href="#play" className="primary-button recent-games__cta">
            Play Now
          </a>
        </div>
      ) : (
        <>
          <div className="recent-games__list">
            {games.map((game) => {
              const isEngine = game.game_type === 'engine'
              
              // Resolve opponent details
              let opponentName = 'Stockfish AI'
              let isUserWhite = true

              if (isEngine) {
                // For engine games, if user is white, black_player_id is null
                isUserWhite = game.black_username === null
              } else {
                // Multiplayer
                const isWhite = game.white_email?.toLowerCase() === userEmail.toLowerCase()
                isUserWhite = isWhite
                opponentName = isWhite 
                  ? (game.black_username || 'Opponent') 
                  : (game.white_username || 'Opponent')
              }

              // Determine outcome: Win, Loss, Draw
              let outcome: 'win' | 'loss' | 'draw' = 'draw'
              if (game.result !== 'draw') {
                if (game.result === 'white') {
                  outcome = isUserWhite ? 'win' : 'loss'
                } else {
                  outcome = isUserWhite ? 'loss' : 'win'
                }
              }

              // Calculate blindfold details
              const hasBlindfold = isEngine && game.blindfold_moves > 0
              const blindfoldPercentage = hasBlindfold && game.total_moves > 0
                ? Math.round((game.blindfold_moves / game.total_moves) * 100)
                : 0

              return (
                <div
                  key={game.id}
                  className="recent-game-item recent-game-item--clickable"
                  onClick={() => navigate('/review', { state: { game } })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/review', { state: { game } })}
                  aria-label={`Review game vs ${opponentName}`}
                >
                  <div className="recent-game-item__left">
                    <div className="recent-game-item__opponent-info">
                      <span className="recent-game-item__opponent">
                        vs {opponentName}
                      </span>
                      <div className="recent-game-item__meta">
                        <span className={`recent-game-item__badge recent-game-item__badge--${game.game_type}`}>
                          {game.game_type}
                        </span>
                        {hasBlindfold && (
                          <span className="recent-game-item__badge recent-game-item__badge--blindfold">
                            {blindfoldPercentage}% Blindfold
                          </span>
                        )}
                        <span className="recent-game-item__date">
                          {formatGameDate(game.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="recent-game-item__right">
                    <div className="recent-game-item__details">
                      <span className={`recent-game-item__outcome recent-game-item__outcome--${outcome}`}>
                        {outcome === 'win' ? 'Victory' : outcome === 'loss' ? 'Defeat' : 'Draw'}
                      </span>
                      <span className="recent-game-item__moves">
                        {Math.ceil((game.total_moves || 0) / 2)} moves
                      </span>
                    </div>
                    <button
                      className={`recent-game-item__copy-btn${copiedId === game.id ? ' recent-game-item__copy-btn--copied' : ''}`}
                      onClick={(e) => { e.stopPropagation(); handleCopyPGN(game.id, game.pgn) }}
                      title="Copy PGN"
                      aria-label="Copy PGN to clipboard"
                    >
                      {copiedId === game.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="recent-games__footer">
            <Link to="/learn" className="recent-games__view-all-btn">
              View Full History
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </section>
  )
}

export default RecentGames
