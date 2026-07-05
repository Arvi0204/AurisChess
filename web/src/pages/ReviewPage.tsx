import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  User,
} from 'lucide-react'
import { Chess } from 'chess.js'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import PlayerInfoBar from '../components/play/PlayerInfoBar'
import MoveList from '../components/play/MoveList'
import MoveNavBar from '../components/play/MoveNavBar'
import BoardWrapper from '../components/play/BoardWrapper'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { evalToPercent, formatEval, getKingSquareInCheck, playChessSound } from '../utils/chessHelpers'

// ─── Types ────────────────────────────────────────────────────────────────────
type GameRecord = {
  id: number
  game_type: 'rapid' | 'blitz' | 'engine'
  result: 'white' | 'black' | 'draw'
  pgn: string
  total_moves: number
  created_at: string
  white_username: string | null
  white_email: string | null
  black_username: string | null
  black_email: string | null
}

type TopLine = {
  score: number          // centipawns (positive = white advantage)
  isMate: boolean
  mateIn: number | null
  moves: string[]        // first 5 SAN moves in this line
  rawPv: string          // raw UCI pv string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a UCI PV string (e.g. "e2e4 e7e5 g1f3") into SAN notation
 * starting from the given FEN position.
 */
function pvToSan(pv: string, fen: string, maxMoves = 5): string[] {
  try {
    const game = new Chess(fen)
    const uciMoves = pv.trim().split(' ').slice(0, maxMoves)
    const san: string[] = []
    for (const uci of uciMoves) {
      const from = uci.slice(0, 2)
      const to = uci.slice(2, 4)
      const promotion = uci.length === 5 ? uci[4] : undefined
      const move = game.move({ from, to, promotion })
      if (!move) break
      san.push(move.san)
    }
    return san
  } catch {
    return []
  }
}

/** Get piece symbol for SAN display */
function getPieceSymbol(san: string): string {
  const pieceMap: Record<string, string> = { N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' }
  return pieceMap[san[0]] ? san.replace(san[0], pieceMap[san[0]]) : san
}

// ─── Eval Bar ─────────────────────────────────────────────────────────────────
const EvalBar = ({
  score,
  isMate,
  mateIn,
}: {
  score: number
  isMate: boolean
  mateIn: number | null
}) => {
  const whitePct = evalToPercent(score)
  const label = isMate
    ? (score < 0 ? `-M${Math.abs(mateIn ?? 0)}` : `M${Math.abs(mateIn ?? 0)}`)
    : formatEval(score)

  const isWhiteWinning = score >= 0

  return (
    <div className="eval-bar" aria-label={`Evaluation: ${label}`}>
      <div className="eval-bar__track">
        {/* Black section (top) */}
        <div
          className="eval-bar__black"
          style={{ height: `${100 - whitePct}%` }}
        />
        {/* White section (bottom) */}
        <div
          className="eval-bar__white"
          style={{ height: `${whitePct}%` }}
        />
      </div>
      <div
        className={`eval-bar__label ${
          isWhiteWinning ? 'eval-bar__label--white-win' : 'eval-bar__label--black-win'
        }`}
      >
        {label}
      </div>
    </div>
  )
}

// ─── Top Lines ────────────────────────────────────────────────────────────────
const TopLines = ({
  lines,
  isAnalyzing,
}: {
  lines: TopLine[]
  isAnalyzing: boolean
}) => (
  <div className="review-top-lines">
    <div className="review-section-label">
      <Bot size={13} aria-hidden="true" />
      Stockfish Analysis
      {isAnalyzing && <Loader2 size={12} className="review-inline-spinner" />}
    </div>

    {lines.length === 0 && !isAnalyzing && (
      <p className="review-top-lines__empty">No analysis available for this position.</p>
    )}

    {lines.map((line, i) => (
      <div key={i} className={`review-line review-line--${i === 0 ? 'best' : 'alt'}`}>
        <span className="review-line__score">
          {line.isMate
            ? (line.score < 0 ? `-M${Math.abs(line.mateIn ?? 0)}` : `M${Math.abs(line.mateIn ?? 0)}`)
            : formatEval(line.score)}
        </span>
        <span className="review-line__moves">
          {line.moves.map(getPieceSymbol).join(' ')}
          {line.moves.length > 0 && '…'}
        </span>
      </div>
    ))}
  </div>
)

// ─── Game Header ──────────────────────────────────────────────────────────────
const GameHeader = ({
  game,
  whiteName,
  blackName,
  outcome,
  onBack,
}: {
  game: GameRecord
  whiteName: string
  blackName: string
  outcome: 'win' | 'loss' | 'draw'
  onBack: () => void
}) => {
  const resultLabel = outcome === 'win' ? 'Victory' : outcome === 'loss' ? 'Defeat' : 'Draw'

  return (
    <div className="review-game-header">
      <button className="review-back-btn" onClick={onBack} aria-label="Back to history">
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="review-game-header__info">
        <div className="review-game-header__players">
          <div className="review-player-chip review-player-chip--white">
            <div className="review-player-avatar">
              <User size={12} />
            </div>
            <span>{whiteName}</span>
          </div>
          <span className="review-game-header__vs">vs</span>
          <div className="review-player-chip review-player-chip--black">
            <div className="review-player-avatar review-player-avatar--dark">
              {game.game_type === 'engine' ? <Bot size={12} /> : <User size={12} />}
            </div>
            <span>{blackName}</span>
          </div>
        </div>

        <div className="review-game-header__badges">
          <span className={`recent-game-item__badge recent-game-item__badge--${game.game_type}`}>
            {game.game_type}
          </span>
          <span className={`review-outcome-badge review-outcome-badge--${outcome}`}>
            {resultLabel}
          </span>
          <span className="review-game-header__date">
            {new Date(game.created_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric'
            })}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ReviewPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const game = location.state?.game as GameRecord | undefined

  const [isCollapsed] = useState(true)  // always collapsed in game views
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [gameFen, setGameFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [fenHistory, setFenHistory] = useState<string[]>([])
  const [moves, setMoves] = useState<string[]>([])
  // Pre-computed from/to squares for each move (index i = move i, 1-based)
  const [moveSquares, setMoveSquares] = useState<Array<{ from: string; to: string }>>([])
  const [copied, setCopied] = useState(false)

  // Stockfish analysis state
  const [evalScore, setEvalScore] = useState(0)
  const [isMate, setIsMate] = useState(false)
  const [mateIn, setMateIn] = useState<number | null>(null)
  const [topLines, setTopLines] = useState<TopLine[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const activeSearchFenRef = useRef<string | null>(null)

  const sfWorkerRef = useRef<Worker | null>(null)
  const pendingLinesRef = useRef<Map<number, Partial<TopLine>>>(new Map())
  const analyzeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { user } = useAuth()
  const { volume } = useSettings()

  const username = user?.username || 'Player'
  const userEmail = user?.email || ''

  const isEngine = game?.game_type === 'engine'
  let isUserWhite = true
  if (game) {
    if (isEngine) {
      isUserWhite = game.black_username === null
    } else {
      isUserWhite = game.white_email?.toLowerCase() === userEmail.toLowerCase()
    }
  }

  // ── Build FEN history from PGN on mount ──────────────────────────────────
  useEffect(() => {
    if (!game?.pgn) return

    try {
      const chess = new Chess()
      chess.loadPgn(game.pgn)
      const history = chess.history({ verbose: true }) as any[]
      const sanHistory = chess.history()

      // Replay from start to collect all FENs and move squares
      const chess2 = new Chess()
      const fens = [chess2.fen()]
      const squares: Array<{ from: string; to: string }> = []
      for (const m of history) {
        squares.push({ from: m.from, to: m.to })
        chess2.move(m.san)
        fens.push(chess2.fen())
      }

      setFenHistory(fens)
      setMoveSquares(squares)
      setMoves(sanHistory)
      const lastIdx = sanHistory.length
      setCurrentIndex(lastIdx)
      setGameFen(fens[lastIdx])
    } catch (err) {
      console.error('Failed to parse PGN:', err)
    }
  }, [game])

  // ── Initialise Stockfish worker ───────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker('/stockfish.js')
    sfWorkerRef.current = worker

    worker.postMessage('uci')
    worker.postMessage('setoption name MultiPV value 3')
    worker.postMessage('isready')

    worker.onmessage = (e: MessageEvent) => {
      const line: string = e.data
      if (!line) return

      const currentSearchFen = activeSearchFenRef.current
      if (!currentSearchFen) return

      // Parse "info depth N multipv M score cp X pv ..."
      if (line.startsWith('info') && line.includes('pv')) {
        const depthMatch = line.match(/depth (\d+)/)
        const depth = depthMatch ? parseInt(depthMatch[1]) : 0
        if (depth < 8) return  // ignore extremely shallow lines

        const pvMatch = line.match(/ multipv (\d+)/)
        const pvNum = pvMatch ? parseInt(pvMatch[1]) : 1

        const cpMatch = line.match(/score cp (-?\d+)/)
        const mateMatch = line.match(/score mate (-?\d+)/)
        const pvLineMatch = line.match(/ pv (.+)$/)

        const activeColor = currentSearchFen.split(' ')[1] // 'w' or 'b'
        const isBlackToMove = activeColor === 'b'

        let scoreVal = cpMatch ? parseInt(cpMatch[1]) : 0
        let mateInVal = mateMatch ? parseInt(mateMatch[1]) : null

        if (isBlackToMove) {
          scoreVal = -scoreVal
          if (mateInVal !== null) {
            mateInVal = -mateInVal
          }
        }

        const partial: Partial<TopLine> = {
          isMate: !!mateMatch,
          mateIn: mateInVal,
          score: scoreVal,
          rawPv: pvLineMatch ? pvLineMatch[1] : '',
          moves: [],
        }
        pendingLinesRef.current.set(pvNum, partial)

        // Convert pending lines to actual TopLines and update state progressively
        const committed: TopLine[] = []

        for (let i = 1; i <= 3; i++) {
          const p = pendingLinesRef.current.get(i)
          if (!p) continue
          committed.push({
            score: p.score ?? 0,
            isMate: p.isMate ?? false,
            mateIn: p.mateIn ?? null,
            rawPv: p.rawPv ?? '',
            moves: pvToSan(p.rawPv ?? '', currentSearchFen, 6),
          })
        }

        if (committed.length > 0) {
          setTopLines(committed)
          // Update evaluation display from the best line (multipv 1)
          const best = pendingLinesRef.current.get(1)
          if (best) {
            setEvalScore(best.isMate ? (best.mateIn! > 0 ? 1000 : -1000) : (best.score ?? 0))
            setIsMate(best.isMate ?? false)
            setMateIn(best.mateIn ?? null)
          }
        }
      }

      if (line.startsWith('bestmove')) {
        setIsAnalyzing(false)
      }
    }

    return () => {
      worker.terminate()
    }
  }, [])  // mount once

  // ── Trigger analysis whenever position changes ────────────────────────────
  const analyzePosition = useCallback((fen: string) => {
    if (!sfWorkerRef.current) return
    if (analyzeDebounceRef.current) clearTimeout(analyzeDebounceRef.current)

    // Invalidate current search and show loading state immediately
    activeSearchFenRef.current = null
    setIsAnalyzing(true)
    setTopLines([])

    analyzeDebounceRef.current = setTimeout(() => {
      pendingLinesRef.current.clear()

      // Instantly handle game-over positions (checkmate, draw) without querying Stockfish
      try {
        const chess = new Chess(fen)
        if (chess.isGameOver()) {
          setIsAnalyzing(false)
          if (chess.isCheckmate()) {
            const isWhiteMated = chess.turn() === 'w'
            setEvalScore(isWhiteMated ? -1000 : 1000)
            setIsMate(true)
            setMateIn(0)
          } else {
            // Stalemate, draw by agreement, etc.
            setEvalScore(0)
            setIsMate(false)
            setMateIn(null)
          }
          sfWorkerRef.current!.postMessage('stop')
          activeSearchFenRef.current = fen
          return
        }
      } catch (err) {
        console.warn('Failed to parse FEN in analyzePosition:', err)
      }

      // Do NOT reset evalScore, isMate, or mateIn here to keep the previous evaluation
      // on screen for a smooth transition until the new search results are ready.

      activeSearchFenRef.current = fen

      sfWorkerRef.current!.postMessage('stop')
      sfWorkerRef.current!.postMessage(`position fen ${fen}`)
      sfWorkerRef.current!.postMessage('go depth 15')
    }, 200)
  }, [])

  useEffect(() => {
    if (fenHistory.length > 0 && gameFen) {
      analyzePosition(gameFen)
    }
  }, [gameFen, analyzePosition])

  const prevIndexRef = useRef(currentIndex)

  // Play piece move sound effects on position navigation
  useEffect(() => {
    if (prevIndexRef.current === currentIndex) return

    const next = currentIndex
    prevIndexRef.current = currentIndex // Update ref for next time

    // Play default soft move-opponent sound when resetting/setup
    if (next === 0) {
      playChessSound('move-opponent', volume)
      return
    }

    const moveStr = moves[next - 1]
    if (!moveStr) return

    if (moveStr.includes('#')) {
      playChessSound('checkmate', volume)
    } else if (moveStr.includes('+')) {
      playChessSound('check', volume)
    } else if (moveStr.includes('x')) {
      playChessSound('capture', volume)
    } else {
      // Determine whose turn it was to move
      const isWhiteMove = (next - 1) % 2 === 0
      const isSelf = isWhiteMove === isUserWhite
      playChessSound(isSelf ? 'move-self' : 'move-opponent', volume)
    }
  }, [currentIndex, moves, isUserWhite, volume])

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentIndex(prev => {
          const next = Math.max(0, prev - 1)
          setGameFen(fenHistory[next])
          return next
        })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentIndex(prev => {
          const next = Math.min(moves.length, prev + 1)
          setGameFen(fenHistory[next])
          return next
        })
      } else if (e.key === 'ArrowUp' || e.key === 'Home') {
        e.preventDefault()
        setCurrentIndex(0)
        setGameFen(fenHistory[0])
      } else if (e.key === 'ArrowDown' || e.key === 'End') {
        e.preventDefault()
        const last = moves.length
        setCurrentIndex(last)
        setGameFen(fenHistory[last])
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [fenHistory, moves.length])

  // ── Navigation helpers ────────────────────────────────────────────────────
  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(moves.length, idx))
    setCurrentIndex(clamped)
    setGameFen(fenHistory[clamped])
  }

  const handleCopyPgn = () => {
    if (!game?.pgn) return
    navigator.clipboard.writeText(game.pgn).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Resolve player names / outcome ────────────────────────────────────────
  if (!game) {
    return (
      <div className="dashboard-shell sidebar-collapsed">
        <DashboardSidebar username={username} isCollapsed />
        <main className="dashboard-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
            <p>No game selected. Go back and click a game to review it.</p>
            <button className="primary-button" onClick={() => navigate('/learn')} style={{ marginTop: '16px' }}>
              Back to History
            </button>
          </div>
        </main>
      </div>
    )
  }

  const whiteName = game.white_username || 'White'
  const blackName = game.black_username || (isEngine ? 'Stockfish AI' : 'Black')

  const outcome: 'win' | 'loss' | 'draw' = game.result === 'draw'
    ? 'draw'
    : (game.result === 'white') === isUserWhite ? 'win' : 'loss'

  // Use precomputed move squares for last-move highlight — O(1) per render
  const lastMoveSquare = currentIndex > 0 ? moveSquares[currentIndex - 1] : null
  const lastMoveSquares: Record<string, React.CSSProperties> = lastMoveSquare
    ? {
        [lastMoveSquare.from]: { backgroundColor: 'rgba(247, 247, 105, 0.4)' },
        [lastMoveSquare.to]:   { backgroundColor: 'rgba(247, 247, 105, 0.4)' },
      }
    : {}

  const kingSquare = getKingSquareInCheck(gameFen)
  const squareStyles: Record<string, React.CSSProperties> = {
    ...lastMoveSquares,
    ...(kingSquare ? {
      [kingSquare]: {
        background: 'radial-gradient(circle, rgba(255,0,0,0.5) 0%, rgba(255,0,0,0.2) 70%, transparent 100%)',
      }
    } : {}),
  }

  return (
    <div className={`dashboard-shell play-shell${isCollapsed ? ' sidebar-collapsed' : ''}`}>
      <DashboardSidebar
        username={username}
        isCollapsed={isCollapsed}
      />

      <main className="dashboard-main" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="review-main">

          {/* ── Board Column ──────────────────────────────────────────── */}
          <section className="board-section review-board-col">
            <div className="review-eval-board-row">
              {/* Eval Bar */}
              <EvalBar
                score={evalScore}
                isMate={isMate}
                mateIn={mateIn}
              />

              {/* Board + Player Bars */}
              <div className="board-container">
                <PlayerInfoBar
                  name={orientation === 'white' ? blackName : whiteName}
                  role={isEngine && orientation === 'white' ? 'ai' : 'opponent'}
                  subtitle={isEngine && orientation === 'white' ? 'Stockfish Engine' : undefined}
                />

                <BoardWrapper
                  fen={gameFen}
                  orientation={orientation}
                  squareStyles={squareStyles}
                  readOnly
                />

                <PlayerInfoBar
                  name={orientation === 'white' ? whiteName : blackName}
                  role={isEngine && orientation === 'black' ? 'ai' : 'user'}
                  subtitle={isEngine && orientation === 'black' ? 'Stockfish Engine' : undefined}
                />
              </div>
            </div>
          </section>

          {/* ── Analysis Panel ────────────────────────────────────────── */}
          <aside className="controls-section review-panel">

            {/* Game Header */}
            <GameHeader
              game={game}
              whiteName={whiteName}
              blackName={blackName}
              outcome={outcome}
              onBack={() => navigate(-1)}
            />

            {/* Eval score display */}
            <div className="review-eval-display">
              <span className="review-eval-display__score">
                {isMate
                  ? (evalScore < 0 ? `-M${Math.abs(mateIn ?? 0)}` : `M${Math.abs(mateIn ?? 0)}`)
                  : formatEval(evalScore)
                }
              </span>
              <span className="review-eval-display__label">
                {isAnalyzing ? 'Analyzing…' : 'Stockfish Eval'}
              </span>
            </div>

            {/* Top 3 lines */}
            <TopLines lines={topLines} isAnalyzing={isAnalyzing} />

            {/* Move list */}
            <MoveList
              moves={moves}
              currentIndex={currentIndex}
              fenHistory={fenHistory}
              onSelectMove={(idx, fen) => { setCurrentIndex(idx); setGameFen(fen) }}
              showCopyPgn
              onCopyPgn={handleCopyPgn}
              copied={copied}
              emptyMessage="No moves recorded."
            />

            {/* Nav bar */}
            <MoveNavBar
              currentIndex={currentIndex}
              totalMoves={moves.length}
              onFirst={() => goTo(0)}
              onPrev={() => goTo(currentIndex - 1)}
              onNext={() => goTo(currentIndex + 1)}
              onLast={() => goTo(moves.length)}
              extraButtons={
                <button
                  className="history-nav-btn"
                  onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')}
                  title="Flip board"
                  aria-label="Flip board"
                >
                  <RefreshCw size={18} />
                </button>
              }
            />

            {/* PGN copy shortcut */}
            <div className="review-pgn-row">
              <button className="review-pgn-copy-btn" onClick={handleCopyPgn}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'PGN Copied!' : 'Copy PGN'}
              </button>
            </div>

          </aside>
        </div>
      </main>
    </div>
  )
}

export default ReviewPage
