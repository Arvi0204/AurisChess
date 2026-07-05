import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Filter,
  Gamepad2,
  Loader2,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react'
import PageHeader from '../components/dashboard/PageHeader'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import { API_BASE } from '../config/api'
import { useAuth } from '../context/AuthContext'

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

type FilterType = 'all' | 'engine' | 'rapid' | 'blitz'

// ─── Explore Card ────────────────────────────────────────────────────────────
const ExploreCard = () => (
  <div className="learn-explore-card" aria-label="Explore freeplay mode">
    <div className="learn-explore-card__glow" aria-hidden="true" />
    <div className="learn-explore-card__content">
      <div className="learn-explore-card__icon" aria-hidden="true">
        <Swords size={28} />
      </div>
      <div className="learn-explore-card__copy">
        <p className="learn-explore-card__label">
          <Sparkles size={12} aria-hidden="true" />
          Coming Soon
        </p>
        <h2>Explore Freeplay</h2>
        <p>
          Jump into a relaxed, unrated freeplay session. No clocks, no pressure — just
          you, the board, and your voice. Sharpen your intuition at your own pace.
        </p>
      </div>
      <button
        className="learn-explore-card__cta"
        disabled
        aria-disabled="true"
        title="Freeplay mode coming soon"
      >
        Start Exploring
        <ArrowRight size={15} aria-hidden="true" />
      </button>
    </div>
    <div className="learn-explore-card__decoration" aria-hidden="true">
      <div className="learn-explore-card__piece">♛</div>
      <div className="learn-explore-card__piece learn-explore-card__piece--2">♜</div>
      <div className="learn-explore-card__piece learn-explore-card__piece--3">♞</div>
    </div>
  </div>
)

// ─── Filter Pill ─────────────────────────────────────────────────────────────
const FilterPill = ({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ElementType
  active: boolean
  onClick: () => void
}) => (
  <button
    className={`learn-filter-pill${active ? ' learn-filter-pill--active' : ''}`}
    onClick={onClick}
    type="button"
    aria-pressed={active}
  >
    <Icon size={13} aria-hidden="true" />
    {label}
  </button>
)

// ─── Game History ─────────────────────────────────────────────────────────────
const GameHistorySection = () => {
  const navigate = useNavigate()
  const [games, setGames] = useState<GameRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const { user, token } = useAuth()
  const userEmail = user?.email || ''

  useEffect(() => {
    const fetchGames = async () => {
      try {
        if (!token) { setLoading(false); return }

        const res = await fetch(`${API_BASE}/api/user/games`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch games')
        const json = await res.json()
        setGames(json.data.games || [])
      } catch (err: any) {
        setError(err.message || 'Error fetching games.')
      } finally {
        setLoading(false)
      }
    }
    if (token) {
      fetchGames()
    }
  }, [token])

  // Reset page to 1 whenever the filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  const handleCopyPGN = (gameId: number, pgn: string) => {
    navigator.clipboard.writeText(pgn).then(() => {
      setCopiedId(gameId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch { return '' }
  }

  const filtered = filter === 'all' ? games : games.filter((g) => g.game_type === filter)

  // Calculate paginated index range
  const itemsPerPage = 10
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedGames = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <section className="learn-history" aria-label="Full game history">
      <div className="learn-history__header">
        <div className="learn-history__title">
          <Clock size={18} aria-hidden="true" />
          <h2>Game History</h2>
          {!loading && (
            <span className="learn-history__count">{filtered.length} games</span>
          )}
        </div>

        <div className="learn-history__filters" role="group" aria-label="Filter by game type">
          <Filter size={14} aria-hidden="true" className="learn-history__filter-icon" />
          <FilterPill label="All" icon={Gamepad2} active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterPill label="Engine" icon={Sparkles} active={filter === 'engine'} onClick={() => setFilter('engine')} />
          <FilterPill label="Rapid" icon={Clock} active={filter === 'rapid'} onClick={() => setFilter('rapid')} />
          <FilterPill label="Blitz" icon={Zap} active={filter === 'blitz'} onClick={() => setFilter('blitz')} />
        </div>
      </div>

      {loading ? (
        <div className="learn-history__empty">
          <Loader2 size={26} className="learn-history__spinner" />
          <p>Loading games…</p>
        </div>
      ) : error ? (
        <div className="learn-history__empty">
          <p style={{ color: 'var(--color-muted)' }}>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="learn-history__empty">
          <div className="learn-history__empty-icon" aria-hidden="true">
            <Gamepad2 size={32} />
          </div>
          <h3>{filter === 'all' ? 'No games yet' : `No ${filter} games`}</h3>
          <p>
            {filter === 'all'
              ? 'Start your first game and your history will appear here.'
              : `Try a different filter or play a ${filter} game.`}
          </p>
        </div>
      ) : (
        <>
          <div className="learn-history__list">
            {paginatedGames.map((game) => {
              const isEngine = game.game_type === 'engine'
              let opponentName = 'Stockfish AI'
              let isUserWhite = true

              if (!isEngine) {
                const isWhite = game.white_email?.toLowerCase() === userEmail.toLowerCase()
                isUserWhite = isWhite
                opponentName = isWhite
                  ? (game.black_username || 'Opponent')
                  : (game.white_username || 'Opponent')
              } else {
                isUserWhite = game.black_username === null
              }

              let outcome: 'win' | 'loss' | 'draw' = 'draw'
              if (game.result !== 'draw') {
                outcome = (game.result === 'white') === isUserWhite ? 'win' : 'loss'
              }

              const hasBlindfold = isEngine && game.blindfold_moves > 0
              const blindfoldPct = hasBlindfold && game.total_moves > 0
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
                      <span className="recent-game-item__opponent">vs {opponentName}</span>
                      <div className="recent-game-item__meta">
                        <span className={`recent-game-item__badge recent-game-item__badge--${game.game_type}`}>
                          {game.game_type}
                        </span>
                        {hasBlindfold && (
                          <span className="recent-game-item__badge recent-game-item__badge--blindfold">
                            {blindfoldPct}% Blindfold
                          </span>
                        )}
                        <span className="recent-game-item__date">{formatDate(game.created_at)}</span>
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

          {totalPages > 1 && (
            <div className="learn-history__pagination">
              <div className="learn-pagination__info">
                Page <span>{currentPage}</span> of <span>{totalPages}</span>
                <span style={{ margin: '0 8px', opacity: 0.25 }}>|</span>
                Showing <span>{Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}</span>–
                <span>{Math.min(filtered.length, currentPage * itemsPerPage)}</span> of <span>{filtered.length}</span> games
              </div>

              <div className="learn-pagination__actions">
                <button
                  className="learn-pagination__btn"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="learn-pagination__btn"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const LearnPage = () => {
  const { user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const username = user?.username || 'Player'

  return (
    <div className={`dashboard-shell${isCollapsed ? ' sidebar-collapsed' : ''}`}>
      <DashboardSidebar
        username={username}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <main className="dashboard-main">
        <PageHeader
          title={<>Learn &amp; <span>Explore</span></>}
          subtitle="Dive into freeplay or review your full game history with detailed filters."
        />

        <div className="learn-page-content">
          <ExploreCard />
          <GameHistorySection />
        </div>
      </main>
    </div>
  )
}

export default LearnPage
