import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, X } from 'lucide-react'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import PageHeader from '../components/dashboard/PageHeader'
import GameBoard from '../components/play/GameBoard'
import GameControlsPanel from '../components/play/GameControlsPanel'
import EngineSetupCard from '../components/play/EngineSetupCard'
import OnlineSetupCard from '../components/play/OnlineSetupCard'
import MatchmakingOverlay from '../components/play/MatchmakingOverlay'
import { Chess } from 'chess.js'
import { useChessVoiceControl } from '../hooks/useChessVoiceControl'
import { useMultiplayerSocket } from '../hooks/useMultiplayerSocket'
import { getKingSquareInCheck, playChessSound } from '../utils/chessHelpers'
import { API_BASE } from '../config/api'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'

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
  const modeParam = searchParams.get('mode')

  const { user, token } = useAuth()
  const { volume, promotionSetting } = useSettings()

  // ── Layout ────────────────────────────────────────────────────────────────
  const [isCollapsed, setIsCollapsed] = useState(false)


  // ── Setup options ─────────────────────────────────────────────────────────
  const [selectedLevel, setSelectedLevel] = useState('medium')
  const [selectedTimeControl, setSelectedTimeControl] = useState('rapid-10-0')
  const [selectedEngineColor, setSelectedEngineColor] = useState<'white' | 'black' | 'random'>('white')

  // ── Engine init states ────────────────────────────────────────────────────
  const [isInitializingEngine, setIsInitializingEngine] = useState(false)
  const [engineLoadProgress, setEngineLoadProgress] = useState(0)
  const [engineStatusText, setEngineStatusText] = useState('Spinning up neural networks...')

  // ── Active game states ────────────────────────────────────────────────────
  const [gameStarted, setGameStarted] = useState(false)
  const [gameMode, setGameMode] = useState<'computer' | 'online' | null>(null)
  const stockfishRef = useRef<Worker | null>(null)
  const [gameFen, setGameFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [fenHistory, setFenHistory] = useState<string[]>(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  useEffect(() => { setBoardOrientation(playerColor) }, [playerColor])

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [manualPremove, setManualPremove] = useState<{ from: string; to: string } | null>(null)
  const manualPremoveRef = useRef<{ from: string; to: string } | null>(null)
  useEffect(() => { manualPremoveRef.current = manualPremove }, [manualPremove])

  // ── Clocks ────────────────────────────────────────────────────────────────
  // playerTime/opponentTime: seconds for display (visual ticker)
  const [playerTime, setPlayerTime] = useState(600)
  const [opponentTime, setOpponentTime] = useState(600)

  // ── Control panel states ──────────────────────────────────────────────────
  const [blindfoldMode, setBlindfoldMode] = useState(false)
  const [showResignConfirm, setShowResignConfirm] = useState(false)
  const [gameResult, setGameResult] = useState<{ type: 'win' | 'loss' | 'draw' | 'aborted'; reason: string } | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [abortSecondsLeft, setAbortSecondsLeft] = useState<number | null>(null)

  // ── Voice states ──────────────────────────────────────────────────────────
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('Click mic to start speaking moves')
  const [talkbackEnabled, setTalkbackEnabled] = useState(() => {
    return localStorage.getItem('aurischess_talkback') === 'true'
  })

  // ── Promotion states ──────────────────────────────────────────────────────
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null)

  const isPromotionMove = useCallback((from: string, to: string): boolean => {
    try {
      const moves = gameRef.current.moves({ square: from as any, verbose: true }) as any[]
      return moves.some(m => m.to === to && m.promotion)
    } catch {
      return false
    }
  }, [])

  const handlePromotionChoice = (pieceType: string) => {
    if (!pendingPromotion) return
    const { from, to } = pendingPromotion
    const move = activeMakeMove({ from, to, promotion: pieceType })
    if (!move) {
      playChessSound('illegal', volume)
    }
    setPendingPromotion(null)
  }

  const handleCancelPromotion = () => {
    setPendingPromotion(null)
  }

  // ── Chess game refs ───────────────────────────────────────────────────────
  const gameRef = useRef(new Chess())
  const totalMovesRef = useRef(0)
  const blindfoldMovesRef = useRef(0)

  // Track the last move we ourselves sent (for optimistic update dedup)
  const lastSentMoveRef = useRef<{ from: string; to: string } | null>(null)

  // ── Ref mirrors (prevent stale closures) ─────────────────────────────────
  const stateRef = useRef({ gameMode, gameResult, playerColor, selectedLevel, selectedTimeControl, blindfoldMode, playerTime, opponentTime })
  useEffect(() => {
    stateRef.current = { gameMode, gameResult, playerColor, selectedLevel, selectedTimeControl, blindfoldMode, playerTime, opponentTime }
  })
  const gameModeRef = useRef<'computer' | 'online' | null>(null)
  const gameResultRef = useRef<{ type: 'win' | 'loss' | 'draw' | 'aborted'; reason: string } | null>(null)
  const playerColorRef = useRef<'white' | 'black'>('white')
  const selectedLevelRef = useRef<string>('medium')
  const selectedTimeControlRef = useRef<string>('rapid-10-0')
  const blindfoldModeRef = useRef<boolean>(false)
  const playerTimeRef = useRef<number>(600)
  const opponentTimeRef = useRef<number>(600)
  gameModeRef.current = stateRef.current.gameMode
  gameResultRef.current = stateRef.current.gameResult
  playerColorRef.current = stateRef.current.playerColor
  selectedLevelRef.current = stateRef.current.selectedLevel
  selectedTimeControlRef.current = stateRef.current.selectedTimeControl
  blindfoldModeRef.current = stateRef.current.blindfoldMode
  playerTimeRef.current = stateRef.current.playerTime
  opponentTimeRef.current = stateRef.current.opponentTime

  // Auto-show result modal
  useEffect(() => { setShowResultModal(!!gameResult) }, [gameResult])

  // ── User info ─────────────────────────────────────────────────────────────
  const userInfo = useMemo(() => {
    return {
      id: user?.id || null,
      username: user?.username || 'Player',
      email: user?.email || null,
      ratingRapid: (user as any)?.rating_rapid || 1200,
      ratingBlitz: (user as any)?.rating_blitz || 1200,
    }
  }, [user])

  const username = userInfo.username

  // ── Multiplayer socket hook ───────────────────────────────────────────────
  const currentRating = selectedTimeControl.startsWith('blitz')
    ? userInfo.ratingBlitz
    : userInfo.ratingRapid

  const mp = useMultiplayerSocket({
    userId: userInfo.id,
    username: userInfo.username,
    userEmail: userInfo.email,
    userRating: currentRating,
  })

  // Opponent info (for online mode)
  const [opponentInfo, setOpponentInfo] = useState<{ username: string; rating: number } | null>(null)

  // When matchmaking succeeds, store opponent info
  useEffect(() => {
    if (mp.matchInfo) {
      setOpponentInfo(mp.matchInfo.opponent)
    }
  }, [mp.matchInfo])

  // ── Matchmaking search timer ──────────────────────────────────────────────
  const [searchTime, setSearchTime] = useState(0)
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined
    if (mp.matchState === 'searching') {
      id = setInterval(() => setSearchTime((p) => p + 1), 1000)
    } else {
      setSearchTime(0)
    }
    return () => clearInterval(id)
  }, [mp.matchState])

  // Reconnect to an in-progress online game on mount (e.g. after page reload)
  useEffect(() => {
    const saved = localStorage.getItem('activeOnlineGame')
    if (!saved) return
    try {
      const { roomId } = JSON.parse(saved)
      if (roomId) mp.reconnectToRoom(roomId)
    } catch {
      localStorage.removeItem('activeOnlineGame')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // If server returns a game:error after a reconnect attempt (e.g. room expired),
  // clear the stale session so the user lands on the setup screen
  useEffect(() => {
    if (!mp.gameError) return
    try { localStorage.removeItem('activeOnlineGame') } catch { /* ignore */ }
  }, [mp.gameError])

  // When server sends game:state (playing), start the game
  useEffect(() => {
    if (mp.matchState !== 'playing' || !mp.liveFen || gameMode === 'online') return
    // Initialize local chess.js from server FEN
    const chess = new Chess()
    chess.load(mp.liveFen)
    gameRef.current = chess

    const initMs = {
      'rapid-10-0': 600,
      'rapid-15-10': 900,
      'blitz-5-0': 300,
    }
    const tcSeconds = initMs[mp.matchInfo?.timeControl as keyof typeof initMs] || 600

    const color = mp.matchInfo?.color || 'white'
    setPlayerColor(color)
    setPlayerTime(tcSeconds)
    setOpponentTime(tcSeconds)
    setGameFen(mp.liveFen)
    setFenHistory([mp.liveFen])
    setCurrentMoveIndex(0)
    setGameResult(null)
    setManualPremove(null)
    setSelectedSquare(null)
    setGameMode('online')
    setGameStarted(true)
    setBlindfoldMode(false)
    totalMovesRef.current = 0
    blindfoldMovesRef.current = 0
    setIsVoiceActive(true)
    setVoiceStatus("Listening... Speak your move (e.g. 'e4', 'Knight f3')")
    // Persist room info so we can reconnect on reload
    try {
      localStorage.setItem('activeOnlineGame', JSON.stringify({
        roomId: mp.matchInfo?.roomId,
        color,
        timeControl: mp.matchInfo?.timeControl,
        opponent: mp.matchInfo?.opponent,
      }))
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.matchState, mp.liveFen])

  // When server applies a move, sync local chess.js (opponent's move only)
  useEffect(() => {
    if (!mp.lastAppliedMove || gameMode !== 'online') return

    const { from, to } = mp.lastAppliedMove
    const sent = lastSentMoveRef.current

    // If the from/to matches what we sent → our own optimistic update, skip
    if (sent && sent.from === from && sent.to === to) {
      lastSentMoveRef.current = null
      return
    }

    // Opponent's move — apply to local chess.js
    try {
      const move = gameRef.current.move({ from, to, promotion: 'q' })
      if (move) {
        updateGameStateAfterMove(true)
        // Narrate opponent move when blindfold mode is on, or when voice is active and talkback is enabled
        if (blindfoldModeRef.current || (isVoiceActiveRef.current && talkbackEnabledRef.current)) {
          narrateOpponentMoveRef.current(move.san)
        }
      }
    } catch (e) {
      console.warn('[Online] Failed to apply opponent move locally:', e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.lastAppliedMove])

  // Snap clocks to server values on each move (online mode)
  useEffect(() => {
    if (gameMode !== 'online') return
    const { whiteTimeMs, blackTimeMs } = mp.serverClocks
    const isWhite = playerColorRef.current === 'white'
    setPlayerTime(Math.ceil((isWhite ? whiteTimeMs : blackTimeMs) / 1000))
    setOpponentTime(Math.ceil((isWhite ? blackTimeMs : whiteTimeMs) / 1000))
  }, [mp.serverClocks, gameMode])

  // Visual clock ticker (online mode) — counts down between moves
  useEffect(() => {
    if (!gameStarted || gameMode !== 'online' || gameResult || mp.gameResult) return

    const interval = setInterval(() => {
      const turn = gameRef.current.turn()
      const playerIsWhite = playerColorRef.current === 'white'
      const isMyTurn = (turn === 'w' && playerIsWhite) || (turn === 'b' && !playerIsWhite)

      if (isMyTurn) {
        setPlayerTime((prev) => Math.max(0, prev - 1))
      } else {
        setOpponentTime((prev) => Math.max(0, prev - 1))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [gameStarted, gameMode, gameResult, mp.gameResult, fenHistory.length])

  // Handle server declaring game over (online)
  useEffect(() => {
    if (!mp.gameResult || gameMode !== 'online') return
    const { result, reason } = mp.gameResult
    const isWhite = playerColorRef.current === 'white'
    let type: 'win' | 'loss' | 'draw' | 'aborted' = 'draw'
    if (result === 'draw') type = 'draw'
    else if (result === 'aborted') type = 'aborted'
    else if ((result === 'white' && isWhite) || (result === 'black' && !isWhite)) type = 'win'
    else type = 'loss'
    setGameResult({ type, reason })
    playChessSound(
      type === 'win' ? 'checkmate' :
      type === 'loss' ? 'resign' :
      type === 'aborted' ? 'aborted' : 'draw',
      volume
    )
    // Clear persisted room — game is over, no reconnect needed
    try { localStorage.removeItem('activeOnlineGame') } catch { /* ignore */ }
  }, [mp.gameResult, gameMode, volume])

  // ── Engine loading animation ──────────────────────────────────────────────
  useEffect(() => {
    let progressId: ReturnType<typeof setInterval> | undefined
    if (isInitializingEngine) {
      progressId = setInterval(() => {
        setEngineLoadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressId)
            setEngineStatusText('Engine Ready! Good Luck.')
            return 100
          }
          const next = prev + Math.floor(Math.random() * 12) + 12
          const clamped = Math.min(next, 100)
          if (clamped < 35) setEngineStatusText('Loading opening book databases...')
          else if (clamped < 70) setEngineStatusText('Initializing transposition tables...')
          else if (clamped < 100) setEngineStatusText('Calibrating neural networks...')
          return clamped
        })
      }, 200)
    } else {
      setEngineLoadProgress(0)
      setEngineStatusText('Spinning up neural networks...')
    }
    return () => clearInterval(progressId)
  }, [isInitializingEngine])

  // Launch engine game after progress bar hits 100%
  useEffect(() => {
    if (!isInitializingEngine || engineLoadProgress < 100) return
    const timer = setTimeout(() => {
      setIsInitializingEngine(false)
      setEngineLoadProgress(0)
      gameRef.current = new Chess()
      const initialFen = gameRef.current.fen()
      setGameFen(initialFen)
      setFenHistory([initialFen])
      setCurrentMoveIndex(0)

      const tcOptions = { 'rapid-10-0': 600, 'rapid-15-10': 900, 'blitz-5-0': 300 }
      const timeLimit = tcOptions[selectedTimeControl as keyof typeof tcOptions] || 600
      setPlayerTime(timeLimit)
      setOpponentTime(timeLimit)

      const assignedColor: 'white' | 'black' = selectedEngineColor === 'random'
        ? (Math.random() < 0.5 ? 'white' : 'black')
        : selectedEngineColor

      setPlayerColor(assignedColor)
      setGameResult(null)
      setManualPremove(null)
      setSelectedSquare(null)
      setGameStarted(true)
      setGameMode('computer')
      totalMovesRef.current = 0
      blindfoldMovesRef.current = 0
      initStockfish()
      setIsVoiceActive(true)
      setVoiceStatus("Listening... Speak your move (e.g. 'e4', 'Knight f3')")

      try {
        localStorage.setItem('activeEngineGame', JSON.stringify({
          playerColor: assignedColor, selectedLevel, selectedTimeControl,
          fen: initialFen, fenHistory: [initialFen], pgn: '',
          blindfoldMode: false, totalMoves: 0, blindfoldMoves: 0,
          playerTime: timeLimit, opponentTime: timeLimit,
        }))
      } catch (err) { console.error('Failed to save initial engine game:', err) }
    }, 1000)
    return () => clearTimeout(timer)
  }, [isInitializingEngine, engineLoadProgress, selectedTimeControl, selectedEngineColor, selectedLevel])

  // Restore engine game from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('activeEngineGame')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        const restoredChess = new Chess()
        if (data.pgn) restoredChess.loadPgn(data.pgn)
        gameRef.current = restoredChess
        totalMovesRef.current = data.totalMoves || 0
        blindfoldMovesRef.current = data.blindfoldMoves || 0
        setSelectedLevel(data.selectedLevel || 'medium')
        setSelectedTimeControl(data.selectedTimeControl || 'rapid-10-0')
        setPlayerColor(data.playerColor || 'white')
        setGameFen(data.fen)
        setFenHistory(data.fenHistory || [data.fen])
        setCurrentMoveIndex(restoredChess.history().length)
        setPlayerTime(data.playerTime ?? 600)
        setOpponentTime(data.opponentTime ?? 600)
        setBlindfoldMode(data.blindfoldMode || false)
        initStockfish()
        setGameMode('computer')
        setGameStarted(true)
        setIsVoiceActive(true)
        setVoiceStatus("Listening... Speak your move (e.g. 'e4', 'Knight f3')")
      } catch (err) {
        console.error('Failed to restore engine game:', err)
        localStorage.removeItem('activeEngineGame')
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inactivity / Unattended abort timer ──────────────────────────────────
  const lastMoveTimeRef = useRef<number>(Date.now())

  // Track the timestamp of the last move
  useEffect(() => {
    if (gameStarted && !gameResult) {
      lastMoveTimeRef.current = Date.now()
    }
  }, [fenHistory.length, gameStarted, gameResult])

  // Timer checking for inactivity (for both engine and online modes) before first move is made
  useEffect(() => {
    if (!gameStarted || gameResult || fenHistory.length > 1) {
      setAbortSecondsLeft(null)
      return
    }

    const interval = setInterval(() => {
      const INACTIVITY_LIMIT_MS = 60_000 // 1 minute in milliseconds
      
      const elapsedMs = Date.now() - lastMoveTimeRef.current
      const secondsLeft = Math.max(0, Math.ceil((INACTIVITY_LIMIT_MS - elapsedMs) / 1000))
      
      if (secondsLeft <= 50) {
        setAbortSecondsLeft(secondsLeft)
      } else {
        setAbortSecondsLeft(null)
      }

      // Trigger client-side abort only for computer mode when time runs out
      if (gameMode === 'computer' && elapsedMs >= INACTIVITY_LIMIT_MS) {
        setGameResult({ type: 'aborted', reason: 'Inactivity' })
        setAbortSecondsLeft(null)
        playChessSound('aborted', volume)
      }
    }, 1000)

    return () => {
      clearInterval(interval)
      setAbortSecondsLeft(null)
    }
  }, [gameStarted, gameResult, gameMode, fenHistory.length, volume])

  // Keyboard navigation
  useEffect(() => {
    if (!gameStarted) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return
      const historyLength = gameRef.current.history().length
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentMoveIndex((prev) => { const i = Math.max(0, prev - 1); setGameFen(fenHistory[i]); return i })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentMoveIndex((prev) => { const i = Math.min(historyLength, prev + 1); setGameFen(fenHistory[i]); return i })
      } else if (e.key === 'ArrowUp' || e.key === 'Home') {
        e.preventDefault(); setCurrentMoveIndex(0); setGameFen(fenHistory[0])
      } else if (e.key === 'ArrowDown' || e.key === 'End') {
        e.preventDefault(); setCurrentMoveIndex(historyLength); setGameFen(fenHistory[historyLength])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameStarted, fenHistory])

  // ── Engine: Stockfish ─────────────────────────────────────────────────────
  const initStockfish = () => {
    if (stockfishRef.current) stockfishRef.current.terminate()
    const worker = new Worker('/stockfish.js')
    stockfishRef.current = worker
    worker.onmessage = (event: MessageEvent) => {
      const line = event.data
      if (line.startsWith('bestmove')) {
        const parts = line.split(' ')
        const bestMove = parts[1]
        if (bestMove && bestMove !== '(none)') handleEngineMove(bestMove)
      }
    }
    worker.postMessage('uci')
    worker.postMessage('isready')
  }

  const handleEngineMove = (bestMove: string) => {
    try {
      const from = bestMove.slice(0, 2)
      const to = bestMove.slice(2, 4)
      const promotion = bestMove.slice(4, 5) || undefined
      const move = gameRef.current.move({ from, to, promotion })
      if (move) {
        updateGameStateAfterMove()
        // Narrate the engine's move when blindfold mode is on, or when voice is active and talkback is enabled
        if (blindfoldModeRef.current || (isVoiceActiveRef.current && talkbackEnabledRef.current)) {
          narrateOpponentMoveRef.current(move.san)
        }
        const queuedPremove = manualPremoveRef.current
        if (queuedPremove) {
          let premoveSucceeded = false
          try {
            gameRef.current.move({ from: queuedPremove.from, to: queuedPremove.to, promotion: 'q' })
            premoveSucceeded = true
            updateGameStateAfterMove()
          } catch { /* illegal premove */ }
          setManualPremove(null)
          if (premoveSucceeded) {
            setGameFen(gameRef.current.fen())
            setCurrentMoveIndex(gameRef.current.history().length)
          }
        }
        checkGameStatus()
      }
    } catch (e) { console.error('Error applying engine move:', e) }
  }

  const makeEngineMove = () => {
    if (!stockfishRef.current) return
    const skillLevelMap = { easy: 0, medium: 6, hard: 13, maximum: 20 }
    const skillLevel = skillLevelMap[selectedLevel as keyof typeof skillLevelMap] ?? 6
    stockfishRef.current.postMessage(`setoption name Skill Level value ${skillLevel}`)
    stockfishRef.current.postMessage(`position fen ${gameRef.current.fen()}`)
    const depthMap = { easy: 2, medium: 5, hard: 10, maximum: 15 }
    const depth = depthMap[selectedLevel as keyof typeof depthMap] ?? 5
    stockfishRef.current.postMessage(`go depth ${depth}`)
  }

  useEffect(() => {
    return () => { if (stockfishRef.current) stockfishRef.current.terminate() }
  }, [])

  // Trigger engine move on AI's turn
  useEffect(() => {
    const turn = gameRef.current.turn()
    const playerIsWhite = playerColor === 'white'
    const isAiTurn = (turn === 'w' && !playerIsWhite) || (turn === 'b' && playerIsWhite)
    if (gameStarted && gameMode === 'computer' && isAiTurn && !gameResult) {
      const timer = setTimeout(makeEngineMove, 500)
      return () => clearTimeout(timer)
    }
  }, [fenHistory.length, gameStarted, gameResult, playerColor, gameMode])

  // ── PGN / save ────────────────────────────────────────────────────────────
  const updatePgnHeaders = () => {
    try {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '.')
      const whiteName = playerColor === 'white' ? username : `Stockfish (${selectedLevel})`
      const blackName = playerColor === 'black' ? username : `Stockfish (${selectedLevel})`
      let resultStr = '*'
      if (gameResult) {
        if (gameResult.type === 'draw') resultStr = '1/2-1/2'
        else if (gameResult.type === 'win') resultStr = playerColor === 'white' ? '1-0' : '0-1'
        else if (gameResult.type === 'loss') resultStr = playerColor === 'white' ? '0-1' : '1-0'
      }
      gameRef.current.header('Event', 'Play vs Engine', 'Site', 'AurisChess', 'Date', dateStr, 'Round', '1', 'White', whiteName, 'Black', blackName, 'Result', resultStr)
    } catch { /* ignore */ }
  }

  const saveEngineGameToDb = async () => {
    try {
      if (!token) return
      let resultStr: 'white' | 'black' | 'draw' = 'draw'
      if (gameResult?.type === 'win') resultStr = playerColor
      else if (gameResult?.type === 'loss') resultStr = playerColor === 'white' ? 'black' : 'white'
      updatePgnHeaders()
      const pgn = gameRef.current.pgn()
      await fetch(`${API_BASE}/api/user/game-end-engine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ playerColor, result: resultStr, pgn, blindfoldMoves: blindfoldMovesRef.current, totalMoves: totalMovesRef.current }),
      })
    } catch (err) { console.error('Failed to save engine game:', err) }
  }

  useEffect(() => {
    if (gameResult && gameMode === 'computer') {
      if (gameResult.type !== 'aborted' && totalMovesRef.current >= 2) saveEngineGameToDb()
      try { localStorage.removeItem('activeEngineGame') } catch { /* ignore */ }
    }
  }, [gameResult, gameMode])

  const handleCopyPGN = () => {
    try {
      updatePgnHeaders()
      navigator.clipboard.writeText(gameRef.current.pgn()).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    } catch { /* ignore */ }
  }

  // ── Game state helpers ────────────────────────────────────────────────────
  // skipSound: true when applying opponent's move (sound plays from server event)
  const updateGameStateAfterMove = (skipSound = false) => {
    totalMovesRef.current += 1
    if (blindfoldMode) blindfoldMovesRef.current += 1
    const nextFen = gameRef.current.fen()
    setFenHistory((prev) => {
      const nextHistory = [...prev, nextFen]
      if (gameModeRef.current === 'computer' && !gameResultRef.current) {
        try {
          localStorage.setItem('activeEngineGame', JSON.stringify({
            playerColor: playerColorRef.current,
            selectedLevel: selectedLevelRef.current,
            selectedTimeControl: selectedTimeControlRef.current,
            fen: nextFen, fenHistory: nextHistory,
            pgn: gameRef.current.pgn(),
            blindfoldMode: blindfoldModeRef.current,
            totalMoves: totalMovesRef.current, blindfoldMoves: blindfoldMovesRef.current,
            playerTime: playerTimeRef.current, opponentTime: opponentTimeRef.current,
          }))
        } catch { /* ignore */ }
      }
      return nextHistory
    })
    setCurrentMoveIndex((prev) => {
      const historyLength = gameRef.current.history().length
      const isAtEnd = prev === historyLength - 1
      if (isAtEnd) { setGameFen(nextFen); return historyLength }
      return prev
    })
    if (!skipSound) {
      const game = gameRef.current
      const history = game.history({ verbose: true }) as any[]
      const lastPlayedMove = history[history.length - 1]
      if (game.isCheckmate()) playChessSound('checkmate', volume)
      else if (game.inCheck()) playChessSound('check', volume)
      else if (lastPlayedMove?.captured) playChessSound('capture', volume)
      else {
        const justMovedColor = game.turn() === 'w' ? 'black' : 'white'
        const isSelfMove = justMovedColor === playerColorRef.current
        playChessSound(isSelfMove ? 'move-self' : 'move-opponent', volume)
      }
    }
  }

  const makeMove = useCallback((moveObj: any) => {
    try {
      const move = gameRef.current.move(moveObj)
      if (move) {
        updateGameStateAfterMove()
        setSelectedSquare(null)
        setManualPremove(null)
        checkGameStatus()
        return move
      }
    } catch { return null }
    return null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume])

  // Online move: apply optimistically + emit socket
  const onlineMakeMove = useCallback((moveObj: any) => {
    try {
      const move = gameRef.current.move(moveObj)
      if (move) {
        lastSentMoveRef.current = { from: move.from, to: move.to }
        updateGameStateAfterMove()
        setSelectedSquare(null)
        setManualPremove(null)
        mp.sendMove({
          from: move.from,
          to: move.to,
          promotion: moveObj.promotion,
          isBlindfold: blindfoldModeRef.current
        })
        return move
      }
    } catch { return null }
    return null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp.sendMove, volume])

  const activeMakeMove = gameMode === 'online' ? onlineMakeMove : makeMove

  const checkGameStatus = useCallback(() => {
    const game = gameRef.current
    if (game.isCheckmate()) {
      const turn = game.turn()
      const playerIsWhite = playerColorRef.current === 'white'
      const isPlayerTurn = (turn === 'w' && playerIsWhite) || (turn === 'b' && !playerIsWhite)
      setGameResult({ type: isPlayerTurn ? 'loss' : 'win', reason: 'Checkmate' })
    } else if (game.isDraw()) {
      let reason = 'Draw'
      if (game.isStalemate()) reason = 'Stalemate'
      else if (game.isThreefoldRepetition()) reason = 'Threefold repetition'
      else if (game.isInsufficientMaterial()) reason = 'Insufficient material'
      setGameResult({ type: 'draw', reason })
      playChessSound('draw', volume)
    }
  }, [volume])

  const onDrop = useCallback(({ piece, sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }) => {
    if (gameResultRef.current || !targetSquare) return false
    if (currentMoveIndex !== gameRef.current.history().length) return false
    const turn = gameRef.current.turn()
    const playerIsWhite = playerColorRef.current === 'white'
    const isMyTurn = (turn === 'w' && playerIsWhite) || (turn === 'b' && !playerIsWhite)
    if (isMyTurn) {
      if (isPromotionMove(sourceSquare, targetSquare)) {
        if (promotionSetting === 'selective') {
          setPendingPromotion({ from: sourceSquare, to: targetSquare })
          return false
        }
      }
      const move = activeMakeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' })
      if (!move) playChessSound('illegal', volume)
      return !!move
    }
    // Premove (engine mode only)
    if (gameMode === 'computer') {
      const pieceType = piece?.pieceType
      const playerColorChar = playerColorRef.current === 'white' ? 'w' : 'b'
      if (pieceType && pieceType[0] === playerColorChar) setManualPremove({ from: sourceSquare, to: targetSquare })
    }
    return false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMoveIndex, volume, activeMakeMove, gameMode, isPromotionMove, promotionSetting])

  const onSquareClick = useCallback(({ square }: { piece?: any; square: string }) => {
    if (gameResultRef.current) return
    if (currentMoveIndex !== gameRef.current.history().length) return
    const turn = gameRef.current.turn()
    const playerIsWhite = playerColorRef.current === 'white'
    const isMyTurn = (turn === 'w' && playerIsWhite) || (turn === 'b' && !playerIsWhite)
    if (!isMyTurn) {
      if (gameMode === 'computer') {
        if (selectedSquare) {
          if (selectedSquare !== square) setManualPremove({ from: selectedSquare, to: square })
          setSelectedSquare(null)
        } else {
          const pieceOnSquare = gameRef.current.get(square as any)
          const userColorChar = playerColorRef.current === 'white' ? 'w' : 'b'
          if (pieceOnSquare && pieceOnSquare.color === userColorChar) setSelectedSquare(square)
        }
      }
      return
    }
    if (selectedSquare) {
      if (selectedSquare === square) { setSelectedSquare(null); return }
      if (isPromotionMove(selectedSquare, square)) {
        if (promotionSetting === 'selective') {
          setPendingPromotion({ from: selectedSquare, to: square })
          setSelectedSquare(null)
          return
        }
      }
      const move = activeMakeMove({ from: selectedSquare, to: square, promotion: 'q' })
      if (move) {
        setSelectedSquare(null)
      } else {
        const pieceOnSquare = gameRef.current.get(square as any)
        const userColorChar = playerColorRef.current === 'white' ? 'w' : 'b'
        if (pieceOnSquare && pieceOnSquare.color === userColorChar) setSelectedSquare(square)
        else { setSelectedSquare(null); playChessSound('illegal', volume) }
      }
    } else {
      const pieceOnSquare = gameRef.current.get(square as any)
      const userColorChar = playerColorRef.current === 'white' ? 'w' : 'b'
      if (pieceOnSquare && pieceOnSquare.color === userColorChar) setSelectedSquare(square)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMoveIndex, selectedSquare, volume, activeMakeMove, gameMode])

  const undoLastTurn = () => {
    if (gameRef.current.history().length < 2) return
    gameRef.current.undo()
    gameRef.current.undo()
    const nextFen = gameRef.current.fen()
    setGameFen(nextFen)
    setFenHistory((prev) => {
      const next = prev.slice(0, -2)
      try {
        if (gameModeRef.current === 'computer') {
          localStorage.setItem('activeEngineGame', JSON.stringify({
            playerColor: playerColorRef.current, selectedLevel: selectedLevelRef.current,
            selectedTimeControl: selectedTimeControlRef.current, fen: nextFen, fenHistory: next,
            pgn: gameRef.current.pgn(), blindfoldMode: blindfoldModeRef.current,
            totalMoves: totalMovesRef.current, blindfoldMoves: blindfoldMovesRef.current,
            playerTime: playerTimeRef.current, opponentTime: opponentTimeRef.current,
          }))
        }
      } catch { /* ignore */ }
      return next
    })
    setCurrentMoveIndex(gameRef.current.history().length)
    setSelectedSquare(null)
    setManualPremove(null)
    setGameResult(null)
  }

  const handleResign = () => {
    if (gameMode === 'online') {
      mp.sendResign()
    } else {
      setGameResult({ type: 'loss', reason: 'Resigned' })
    }
    setShowResignConfirm(false)
    playChessSound('resign', volume)
  }

  const resetGame = () => {
    setGameStarted(false)
    setGameMode(null)
    setGameResult(null)
    setManualPremove(null)
    setSelectedSquare(null)
    setIsVoiceActive(false)
    setVoiceStatus('Click mic to start speaking moves')
    setOpponentInfo(null)
    setBlindfoldMode(false)
    if (stockfishRef.current) { stockfishRef.current.terminate(); stockfishRef.current = null }
    totalMovesRef.current = 0
    blindfoldMovesRef.current = 0
    gameRef.current = new Chess()
    const initialFen = gameRef.current.fen()
    setGameFen(initialFen)
    setFenHistory([initialFen])
    setCurrentMoveIndex(0)
    try { localStorage.removeItem('activeEngineGame') } catch { /* ignore */ }
    try { localStorage.removeItem('activeOnlineGame') } catch { /* ignore */ }
  }

  const toggleVoiceControl = () => {
    if (gameResult) { setVoiceStatus('Voice control unavailable (game ended)'); return }
    setIsVoiceActive((prev) => {
      const next = !prev
      setVoiceStatus(next ? "Listening... Speak your move (e.g. 'e4', 'Knight f3')" : 'Voice control stopped')
      return next
    })
  }

  useEffect(() => { if (gameResult) setIsVoiceActive(false) }, [gameResult])

  useEffect(() => {
    if (blindfoldMode) {
      setIsVoiceActive(true)
      setTalkbackEnabled(true)
      setVoiceStatus("Listening... Speak your move (e.g. 'e4', 'Knight f3')")
    }
  }, [blindfoldMode])

  const isVoiceFirstMount = useRef(true)
  useEffect(() => {
    if (isVoiceFirstMount.current) {
      isVoiceFirstMount.current = false
      return
    }
    if (!isVoiceActive) {
      setTalkbackEnabled(false)
    }
  }, [isVoiceActive])

  // ── Player turn ───────────────────────────────────────────────────────────
  const turn = gameRef.current.turn()
  const playerIsWhite = playerColor === 'white'
  const isPlayerTurn = (turn === 'w' && playerIsWhite) || (turn === 'b' && !playerIsWhite)

  // ── Voice control hook ────────────────────────────────────────────────────

  // Stable ref so handleEngineMove / online-move effect can call it without
  // stale closures (the hook hasn't been called yet at those call sites)
  const narrateOpponentMoveRef = useRef<(san: string) => void>(() => {})
  const isVoiceActiveRef = useRef(isVoiceActive)
  useEffect(() => { isVoiceActiveRef.current = isVoiceActive }, [isVoiceActive])
  const talkbackEnabledRef = useRef(talkbackEnabled)
  useEffect(() => {
    localStorage.setItem('aurischess_talkback', String(talkbackEnabled))
    talkbackEnabledRef.current = talkbackEnabled
  }, [talkbackEnabled])

  const { speakText, sanToSpeech } = useChessVoiceControl({
    game: gameRef.current,
    makeMove: activeMakeMove,
    blindfoldMode,
    setBlindfoldMode,
    setShowResignConfirm,
    showResignConfirm,
    handleResign,
    isVoiceActive,
    isPlayerTurn,
    setVoiceStatus,
    volume,
    gameResult,
    offerDraw: gameMode === 'online' ? mp.offerDraw : undefined,
    drawOffer: gameMode === 'online' ? mp.drawOffer : undefined,
    respondDraw: gameMode === 'online' ? mp.respondDraw : undefined,
    promotionSetting,
    handlePromotionSelect: (from: string, to: string) => {
      setPendingPromotion({ from, to })
    },
    hasPendingPromotion: !!pendingPromotion,
    handlePromotionChoice,
    handleCancelPromotion,
    playerColor,
  })

  // Wire up narrateOpponentMoveRef once speakText/sanToSpeech are available
  useEffect(() => {
    narrateOpponentMoveRef.current = (san: string) => speakText(sanToSpeech(san))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakText])


  // ── Square styles ─────────────────────────────────────────────────────────
  const currentLevel = engineLevels.find((l) => l.id === selectedLevel)
  const currentTC = timeControls.flatMap((g) => g.options).find((o) => o.id === selectedTimeControl)

  const possibleMoves = (selectedSquare && isPlayerTurn)
    ? (gameRef.current.moves({ square: selectedSquare as any, verbose: true }) as any[])
    : []
  const lastMove = currentMoveIndex > 0
    ? (gameRef.current.history({ verbose: true }) as any[])[currentMoveIndex - 1]
    : null
  const kingSquare = getKingSquareInCheck(gameFen)

  const customSquareStyles = {
    ...(lastMove && {
      [lastMove.from]: { backgroundColor: 'rgba(247, 247, 105, 0.4)' },
      [lastMove.to]: { backgroundColor: 'rgba(247, 247, 105, 0.4)' },
    }),
    ...(kingSquare && {
      [kingSquare]: { background: 'radial-gradient(circle, rgba(255, 0, 0, 0.5) 0%, rgba(255, 0, 0, 0.2) 70%, transparent 100%)' },
    }),
    ...(selectedSquare && { [selectedSquare]: { backgroundColor: 'rgba(128, 207, 255, 0.25)' } }),
    ...possibleMoves.reduce((acc, move) => {
      const isCapture = gameRef.current.get(move.to as any) !== null
      acc[move.to] = {
        background: isCapture
          ? 'radial-gradient(circle, transparent 50%, rgba(128, 207, 255, 0.4) 52%, rgba(128, 207, 255, 0.4) 68%, transparent 70%)'
          : 'radial-gradient(circle, rgba(128, 207, 255, 0.45) 20%, transparent 20%)',
        cursor: 'pointer',
      }
      return acc
    }, {} as Record<string, React.CSSProperties>),
    ...(manualPremove && {
      [manualPremove.from]: { backgroundColor: 'rgba(255, 100, 80, 0.35)' },
      [manualPremove.to]: { backgroundColor: 'rgba(255, 100, 80, 0.35)' },
    }),
  }

  // ── Opponent info for display ─────────────────────────────────────────────
  const resolvedOpponentName = gameMode === 'online'
    ? (opponentInfo?.username || 'Opponent')
    : `Stockfish (${currentLevel?.label || 'Engine'})`

  const resolvedOpponentElo = gameMode === 'online'
    ? (opponentInfo?.rating?.toString() || '')
    : (currentLevel?.elo || '1500')

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`dashboard-shell play-shell${isCollapsed || gameStarted ? ' sidebar-collapsed' : ''} ${gameStarted ? 'game-active' : 'game-setup'}`}>
      <DashboardSidebar
        username={username}
        isCollapsed={isCollapsed || gameStarted}
        onToggleCollapse={gameStarted ? undefined : () => setIsCollapsed(!isCollapsed)}
      />

      <main className="dashboard-main">
        <PageHeader
          title={!gameStarted ? <>Play <span>Chess</span></> : undefined}
          subtitle={!gameStarted ? "Choose your game mode and jump right into a match." : undefined}
        />

        {gameStarted ? (
          <div className="game-main">
            {/* Opponent disconnected banner */}
            {mp.opponentDisconnected && (
              <div style={{
                position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px', padding: '10px 20px', color: '#fca5a5',
                fontSize: '0.85rem', zIndex: 200, backdropFilter: 'blur(12px)',
              }}>
                {mp.opponentDisconnected.message}
              </div>
            )}

            {/* Inactivity warning banner */}
            {abortSecondsLeft !== null && abortSecondsLeft <= 50 && (
              <div style={{
                position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '10px', padding: '10px 20px', color: '#fcd34d',
                fontSize: '0.85rem', zIndex: 200, backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
              }}>
                <span style={{ animation: 'pulse 1.5s infinite' }}>⚠️</span>
                <span>Game will be auto-aborted due to inactivity in <strong>{abortSecondsLeft}</strong> seconds.</span>
              </div>
            )}

            <GameBoard
              gameMode={gameMode!}
              playerColor={playerColor}
              boardOrientation={boardOrientation}
              gameFen={gameFen}
              customSquareStyles={customSquareStyles}
              blindfoldMode={blindfoldMode}
              onDrop={onDrop}
              onSquareClick={onSquareClick}
              gameResult={gameResult}
              currentMoveIndex={currentMoveIndex}
              historyLength={gameRef.current.history().length}
              username={username}
              opponentName={resolvedOpponentName}
              opponentElo={resolvedOpponentElo}
              playerElo={currentRating}
              timeControlCategory={selectedTimeControl.startsWith('blitz') ? 'blitz' : 'rapid'}
              playerTime={playerTime}
              opponentTime={opponentTime}
              isPlayerTurn={isPlayerTurn}
            />

            <GameControlsPanel
              gameMode={gameMode!}
              moves={gameRef.current.history()}
              currentMoveIndex={currentMoveIndex}
              fenHistory={fenHistory}
              onSelectMove={(idx, fen) => { setCurrentMoveIndex(idx); setGameFen(fen) }}
              handleCopyPGN={handleCopyPGN}
              copied={copied}
              isVoiceActive={isVoiceActive}
              toggleVoiceControl={toggleVoiceControl}
              voiceStatus={voiceStatus}
              talkbackEnabled={talkbackEnabled}
              onToggleTalkback={() => setTalkbackEnabled((prev) => !prev)}
              gameResult={gameResult}
              showResignConfirm={showResignConfirm}
              setShowResignConfirm={setShowResignConfirm}
              handleResign={handleResign}
              undoLastTurn={undoLastTurn}
              resetGame={resetGame}
              blindfoldMode={blindfoldMode}
              setBlindfoldMode={(val) => {
                setBlindfoldMode(val)
                if (gameMode === 'computer' && !gameResult) {
                  try {
                    const saved = localStorage.getItem('activeEngineGame')
                    if (saved) { const d = JSON.parse(saved); d.blindfoldMode = val; localStorage.setItem('activeEngineGame', JSON.stringify(d)) }
                  } catch { /* ignore */ }
                }
              }}
              boardOrientation={boardOrientation}
              setBoardOrientation={setBoardOrientation}
              onShowResultModal={() => setShowResultModal(true)}
              offerDraw={gameMode === 'online' ? mp.offerDraw : undefined}
              drawOfferFrom={mp.drawOffer?.by || null}
              respondDraw={gameMode === 'online' ? mp.respondDraw : undefined}
              opponentDisconnected={!!mp.opponentDisconnected}
              ownDrawOffer={mp.ownDrawOffer}
            />

            {/* Pawn Promotion Modal Overlay */}
            {pendingPromotion && (
              <div className="promotion-overlay" role="dialog" aria-modal="true" aria-label="Pawn Promotion Selection">
                <div className="promotion-card glass-panel animate-fade-in">
                  <h3>Pawn Promotion</h3>
                  <p className="promotion-desc">Select a piece to promote your pawn to:</p>
                  <div className="promotion-options">
                    <button onClick={() => handlePromotionChoice('q')} className="promotion-option-btn" aria-label="Promote to Queen">
                      <span className="piece-icon" style={playerColor === 'white' ? { color: '#f0f3f5' } : { color: '#1a1f24' }}>♛</span>
                      <span>Queen</span>
                    </button>
                    <button onClick={() => handlePromotionChoice('r')} className="promotion-option-btn" aria-label="Promote to Rook">
                      <span className="piece-icon" style={playerColor === 'white' ? { color: '#f0f3f5' } : { color: '#1a1f24' }}>♜</span>
                      <span>Rook</span>
                    </button>
                    <button onClick={() => handlePromotionChoice('b')} className="promotion-option-btn" aria-label="Promote to Bishop">
                      <span className="piece-icon" style={playerColor === 'white' ? { color: '#f0f3f5' } : { color: '#1a1f24' }}>♝</span>
                      <span>Bishop</span>
                    </button>
                    <button onClick={() => handlePromotionChoice('n')} className="promotion-option-btn" aria-label="Promote to Knight">
                      <span className="piece-icon" style={playerColor === 'white' ? { color: '#f0f3f5' } : { color: '#1a1f24' }}>♞</span>
                      <span>Knight</span>
                    </button>
                  </div>
                  <button onClick={handleCancelPromotion} className="promotion-cancel-btn">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Game Result Modal */}
            {gameResult && showResultModal && (
              <div className="game-result-overlay" role="dialog" aria-modal="true" aria-label="Game Result">
                <div className="game-result-card">
                  <button className="game-result-close-btn" onClick={() => setShowResultModal(false)} aria-label="Close game result">
                    <X size={18} />
                  </button>
                  <span className="game-result-title">
                    {gameResult.type === 'win' ? 'Victory!' : gameResult.type === 'loss' ? 'Defeat' : gameResult.type === 'aborted' ? 'Aborted' : 'Draw'}
                  </span>
                  <span className="game-result-desc">
                    {gameResult.type === 'win' && `You won by ${gameResult.reason}.`}
                    {gameResult.type === 'loss' && `${gameMode === 'online' ? 'Opponent' : 'AI'} won by ${gameResult.reason}.`}
                    {gameResult.type === 'aborted' && `Game aborted: ${gameResult.reason}.`}
                    {gameResult.type === 'draw' && `Game drawn by ${gameResult.reason}.`}
                  </span>
                  {mp.ratingUpdate && gameMode === 'online' && (
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                      Rating: {playerColor === 'white' ? mp.ratingUpdate.white.newRating : mp.ratingUpdate.black.newRating}
                      {' '}({playerColor === 'white'
                        ? (mp.ratingUpdate.white.change >= 0 ? '+' : '') + mp.ratingUpdate.white.change
                        : (mp.ratingUpdate.black.change >= 0 ? '+' : '') + mp.ratingUpdate.black.change})
                    </div>
                  )}
                  <button
                    className={`play-mode-cta game-result-btn ${
                      gameMode === 'online' ? 'play-mode-cta--cyan' : 'play-mode-cta--amber'
                    }`}
                    onClick={resetGame}
                  >
                    {gameMode === 'online' ? 'Exit to Lobby' : 'Play Again'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Setup View */
          <div className="play-page-content">
            <div className="play-mode-grid">
              <EngineSetupCard
                selectedLevel={selectedLevel}
                setSelectedLevel={setSelectedLevel}
                selectedEngineColor={selectedEngineColor}
                setSelectedEngineColor={setSelectedEngineColor}
                onPlay={() => setIsInitializingEngine(true)}
                modeParam={modeParam}
                engineLevels={engineLevels}
              />
              <OnlineSetupCard
                timeControls={timeControls}
                selectedTimeControl={selectedTimeControl}
                setSelectedTimeControl={setSelectedTimeControl}
                onFindMatch={() => mp.joinQueue(selectedTimeControl)}
                modeParam={modeParam}
              />
            </div>
          </div>
        )}
      </main>

      {/* Engine loading overlay */}
      {isInitializingEngine && (
        <div className="play-overlay" role="dialog" aria-modal="true" aria-label="Engine loading status">
          <div className="play-overlay-card play-overlay-card--amber">
            <div className="play-overlay-visual">
              <div className="play-overlay-icon-wrapper"><Bot size={32} /></div>
              <div className="play-overlay-pulse" />
              <div className="play-overlay-pulse play-overlay-pulse-2" />
            </div>
            <h4>Preparing Engine</h4>
            <p>Setting up Stockfish (Strength: {currentLevel?.label} - Elo {currentLevel?.elo})</p>
            <div className="play-overlay-progress-container">
              <div className="play-overlay-progress-bar" style={{ width: `${engineLoadProgress}%` }} />
            </div>
            <span className="play-overlay-status">{engineStatusText} ({engineLoadProgress}%)</span>
            <button type="button" className="play-overlay-cancel-btn" onClick={() => setIsInitializingEngine(false)}>
              <X size={16} aria-hidden="true" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Matchmaking overlay */}
      {(mp.matchState === 'searching' || mp.matchState === 'found') && !gameStarted && (
        <MatchmakingOverlay
          searchTime={searchTime}
          statusMessage={mp.matchmakingStatus}
          onCancel={() => mp.cancelQueue()}
          currentTC={currentTC}
        />
      )}
    </div>
  )
}

export default PlayPage
