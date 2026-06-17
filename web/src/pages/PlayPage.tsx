import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, Mic, Swords, Users, Loader2, X, User, Flag, RotateCcw, EyeOff, Eye, Play, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Check } from 'lucide-react'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { useChessVoiceControl } from '../hooks/useChessVoiceControl'


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

const playGameSound = (type: 'move-self' | 'move-opponent' | 'capture' | 'check' | 'checkmate' | 'illegal' | 'resign', volume: number) => {
  try {
    const soundPaths = {
      'move-self': '/sounds/move-self.mp3',
      'move-opponent': '/sounds/move-opponent.mp3',
      'capture': '/sounds/capture.mp3',
      'check': '/sounds/move-check.mp3',
      'checkmate': '/sounds/game-end.mp3',
      'resign': '/sounds/game-end.mp3',
      'illegal': '/sounds/notify.mp3',
    }
    const audio = new Audio(soundPaths[type])
    audio.volume = volume
    audio.play().catch((err) => {
      console.warn('Audio playback failed or was blocked:', err)
    })
  } catch (err) {
    console.error('Failed to play sound:', err)
  }
};

const PlayPage = () => {
  const [searchParams] = useSearchParams()
  const modeParam = searchParams.get('mode') // 'computer' or 'online'

  const [volume] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('chessVolume')
      return stored ? parseFloat(stored) : 0.5
    } catch {
      return 0.5
    }
  })



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

  // Active Game States
  const [gameStarted, setGameStarted] = useState(false)
  const [gameMode, setGameMode] = useState<'computer' | 'online' | null>(null)
  const stockfishRef = useRef<Worker | null>(null)
  const [gameFen, setGameFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [fenHistory, setFenHistory] = useState<string[]>(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [manualPremove, setManualPremove] = useState<{ from: string; to: string } | null>(null)
  
  // Game clock states (simulated for UI)
  const [playerTime, setPlayerTime] = useState(600)
  const [aiTime, setAiTime] = useState(600)
  
  // Control Panel States
  const [blindfoldMode, setBlindfoldMode] = useState(false)
  const [showResignConfirm, setShowResignConfirm] = useState(false)
  const [gameResult, setGameResult] = useState<{ type: 'win' | 'loss' | 'draw'; reason: string } | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [copied, setCopied] = useState(false)

  // Auto-manage showResultModal based on gameResult
  useEffect(() => {
    if (gameResult) {
      setShowResultModal(true)
    } else {
      setShowResultModal(false)
    }
  }, [gameResult])

  const saveEngineGameToDb = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      let resultStr: 'white' | 'black' | 'draw' = 'draw'
      if (gameResult?.type === 'win') {
        resultStr = playerColor
      } else if (gameResult?.type === 'loss') {
        resultStr = playerColor === 'white' ? 'black' : 'white'
      }

      const pgn = gameRef.current.pgn()

      await fetch('http://localhost:3000/api/user/game-end-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          playerColor,
          result: resultStr,
          pgn,
          blindfoldMoves: blindfoldMovesRef.current,
          totalMoves: totalMovesRef.current
        })
      })
    } catch (err) {
      console.error('Failed to auto-save engine game to database:', err)
    }
  }

  // Save game to database automatically when game ends
  useEffect(() => {
    if (gameResult && gameMode === 'computer') {
      const totalMoves = totalMovesRef.current
      if (totalMoves >= 2) {
        saveEngineGameToDb()
      }
    }
  }, [gameResult, gameMode])

  const handleCopyPGN = () => {
    try {
      const pgn = gameRef.current.pgn()
      navigator.clipboard.writeText(pgn).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(err => {
        console.error('Failed to copy PGN:', err)
      })
    } catch (err) {
      console.error('Error copying PGN:', err)
    }
  }
  
  // Voice Assistant States
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState("Click mic to start speaking moves")

  // Speech Recognition Refs (Mocked for front-end presentation)

  // Ref for chess game instance to prevent stale closure issues
  const gameRef = useRef(new Chess())
  const moveHistoryRef = useRef<HTMLDivElement>(null)
  const totalMovesRef = useRef(0)
  const blindfoldMovesRef = useRef(0)

  // Autoscroll move history to bottom when new moves are added
  useEffect(() => {
    if (moveHistoryRef.current) {
      moveHistoryRef.current.scrollTop = moveHistoryRef.current.scrollHeight
    }
  }, [fenHistory.length])

  // Keyboard navigation for game history
  useEffect(() => {
    if (!gameStarted) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when focusing inputs or textareas
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        return
      }

      const historyLength = gameRef.current.history().length

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentMoveIndex((prev) => {
          const nextIndex = Math.max(0, prev - 1)
          setGameFen(fenHistory[nextIndex])
          return nextIndex
        })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentMoveIndex((prev) => {
          const nextIndex = Math.min(historyLength, prev + 1)
          setGameFen(fenHistory[nextIndex])
          return nextIndex
        })
      } else if (e.key === 'ArrowUp' || e.key === 'Home') {
        e.preventDefault()
        setCurrentMoveIndex(0)
        setGameFen(fenHistory[0])
      } else if (e.key === 'ArrowDown' || e.key === 'End') {
        e.preventDefault()
        setCurrentMoveIndex(historyLength)
        setGameFen(fenHistory[historyLength])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameStarted, fenHistory])

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
              
              // Initialize active game state
              gameRef.current = new Chess()
              const initialFen = gameRef.current.fen()
              setGameFen(initialFen)
              setFenHistory([initialFen])
              setCurrentMoveIndex(0)
              
              const tcOptions = {
                'rapid-10-0': 600,
                'rapid-15-10': 900,
                'blitz-5-0': 300,
              }
              const timeLimit = tcOptions[selectedTimeControl as keyof typeof tcOptions] || 600
              setPlayerTime(timeLimit)
              setAiTime(timeLimit)
              
              setPlayerColor('white')
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
  }, [isInitializingEngine, selectedTimeControl])

  // Initialize and manage Stockfish engine
  const initStockfish = () => {
    if (stockfishRef.current) {
      stockfishRef.current.terminate()
    }

    const worker = new Worker('/stockfish.js')
    stockfishRef.current = worker

    worker.onmessage = (event: MessageEvent) => {
      const line = event.data
      console.log('Stockfish:', line)

      if (line.startsWith('bestmove')) {
        const parts = line.split(' ')
        const bestMove = parts[1]
        if (bestMove && bestMove !== '(none)') {
          handleEngineMove(bestMove)
        }
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
        checkGameStatus()

        // After computer moves, execute queued manual premove if valid
        if (manualPremove) {
          try {
            gameRef.current.move({
              from: manualPremove.from,
              to: manualPremove.to,
              promotion: 'q'
            })
            updateGameStateAfterMove()
          } catch (e) {
            // Illegal premove, discard silently
          }
          setManualPremove(null)
        }
        checkGameStatus()
      }
    } catch (e) {
      console.error('Error applying engine move:', e)
    }
  }

  const makeEngineMove = () => {
    if (!stockfishRef.current) return

    const skillLevelMap = {
      easy: 0,
      medium: 6,
      hard: 13,
      maximum: 20,
    }
    const skillLevel = skillLevelMap[selectedLevel as keyof typeof skillLevelMap] ?? 6
    stockfishRef.current.postMessage(`setoption name Skill Level value ${skillLevel}`)

    const currentFen = gameRef.current.fen()
    stockfishRef.current.postMessage(`position fen ${currentFen}`)

    const depthMap = {
      easy: 2,
      medium: 5,
      hard: 10,
      maximum: 15,
    }
    const depth = depthMap[selectedLevel as keyof typeof depthMap] ?? 5
    stockfishRef.current.postMessage(`go depth ${depth}`)
  }

  // Cleanup Stockfish worker on unmount
  useEffect(() => {
    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate()
      }
    }
  }, [])

  // Clock Countdown logic (only for multiplayer / online mode)
  useEffect(() => {
    let clockInterval: any
    if (gameStarted && !gameResult && gameMode === 'online') {
      clockInterval = setInterval(() => {
        const turn = gameRef.current.turn() // 'w' or 'b'
        const playerIsWhite = playerColor === 'white'
        const isPlayerTurn = (turn === 'w' && playerIsWhite) || (turn === 'b' && !playerIsWhite)
        
        if (isPlayerTurn) {
          setPlayerTime((prev) => {
            if (prev <= 1) {
              clearInterval(clockInterval)
              setGameResult({ type: 'loss', reason: 'Time out' })
              return 0
            }
            return prev - 1
          })
        } else {
          setAiTime((prev) => {
            if (prev <= 1) {
              clearInterval(clockInterval)
              setGameResult({ type: 'win', reason: 'AI ran out of time' })
              return 0
            }
            return prev - 1
          })
        }
      }, 1000)
    }
    return () => clearInterval(clockInterval)
  }, [gameStarted, gameResult, playerColor, fenHistory.length, gameMode])

  const updateGameStateAfterMove = () => {
    totalMovesRef.current += 1
    if (blindfoldMode) {
      blindfoldMovesRef.current += 1
    }
    const nextFen = gameRef.current.fen()
    setFenHistory(prev => [...prev, nextFen])
    setCurrentMoveIndex(prev => {
      const historyLength = gameRef.current.history().length
      const isAtEnd = prev === historyLength - 1
      if (isAtEnd) {
        setGameFen(nextFen)
        return historyLength
      }
      return prev
    })

    // Play sound depending on the board state after move
    const game = gameRef.current;
    const history = game.history({ verbose: true }) as any[];
    const lastPlayedMove = history[history.length - 1];

    if (game.isCheckmate()) {
      playGameSound('checkmate', volume);
    } else if (game.inCheck()) {
      playGameSound('check', volume);
    } else if (lastPlayedMove && lastPlayedMove.captured) {
      playGameSound('capture', volume);
    } else {
      const justMovedColor = game.turn() === 'w' ? 'black' : 'white'
      const isSelfMove = justMovedColor === playerColor
      playGameSound(isSelfMove ? 'move-self' : 'move-opponent', volume)
    }
  }

  // Local chess mechanics and move handlers
  const makeMove = (moveObj: any) => {
    try {
      const move = gameRef.current.move(moveObj)
      if (move) {
        updateGameStateAfterMove()
        setSelectedSquare(null)
        setManualPremove(null)
        checkGameStatus()
        return move
      }
    } catch (e) {
      return null
    }
    return null
  }

  const checkGameStatus = () => {
    const game = gameRef.current
    if (game.isCheckmate()) {
      const turn = game.turn()
      const playerIsWhite = playerColor === 'white'
      const isPlayerTurn = (turn === 'w' && playerIsWhite) || (turn === 'b' && !playerIsWhite)
      setGameResult({
        type: isPlayerTurn ? 'loss' : 'win',
        reason: 'Checkmate'
      })
    } else if (game.isDraw()) {
      let reason = 'Draw'
      if (game.isStalemate()) reason = 'Stalemate'
      else if (game.isThreefoldRepetition()) reason = 'Threefold repetition'
      else if (game.isInsufficientMaterial()) reason = 'Insufficient material'
      setGameResult({ type: 'draw', reason })
    }
  }

  const onDrop = ({ piece, sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }) => {
    if (gameResult || !targetSquare) return false

    const isAtLatest = currentMoveIndex === gameRef.current.history().length
    if (!isAtLatest) return false

    const turn = gameRef.current.turn()
    const playerIsWhite = playerColor === 'white'
    const isPlayerTurn = (turn === 'w' && playerIsWhite) || (turn === 'b' && !playerIsWhite)

    if (isPlayerTurn) {
      const move = makeMove({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      })
      if (!move) {
        playGameSound('illegal', volume)
      }
      return !!move
    }
    
    // Opponent's turn: manual premove queue
    const pieceType = piece?.pieceType
    const playerColorChar = playerColor === 'white' ? 'w' : 'b'
    if (pieceType && pieceType[0] === playerColorChar) {
      setManualPremove({ from: sourceSquare, to: targetSquare })
    }
    return false // snap back, premove highlights will be displayed
  }

  const onSquareClick = ({ square }: { piece?: any; square: string }) => {
    if (gameResult) return

    const isAtLatest = currentMoveIndex === gameRef.current.history().length
    if (!isAtLatest) return

    const turn = gameRef.current.turn()
    const playerIsWhite = playerColor === 'white'
    const isPlayerTurn = (turn === 'w' && playerIsWhite) || (turn === 'b' && !playerIsWhite)

    if (!isPlayerTurn) {
      // Opponent's turn: manual click-to-move premove queuing
      if (selectedSquare) {
        if (selectedSquare !== square) {
          setManualPremove({ from: selectedSquare, to: square })
        }
        setSelectedSquare(null)
      } else {
        const pieceOnSquare = gameRef.current.get(square as any)
        const userColorChar = playerColor === 'white' ? 'w' : 'b'
        if (pieceOnSquare && pieceOnSquare.color === userColorChar) {
          setSelectedSquare(square)
        }
      }
      return
    }

    // Player's turn
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null)
        return
      }

      const move = makeMove({
        from: selectedSquare,
        to: square,
        promotion: 'q'
      })

      if (move) {
        setSelectedSquare(null)
      } else {
        const pieceOnSquare = gameRef.current.get(square as any)
        const userColorChar = playerColor === 'white' ? 'w' : 'b'
        if (pieceOnSquare && pieceOnSquare.color === userColorChar) {
          setSelectedSquare(square)
        } else {
          setSelectedSquare(null)
          playGameSound('illegal', volume)
        }
      }
    } else {
      const pieceOnSquare = gameRef.current.get(square as any)
      const userColorChar = playerColor === 'white' ? 'w' : 'b'
      if (pieceOnSquare && pieceOnSquare.color === userColorChar) {
        setSelectedSquare(square)
      }
    }
  }

  const undoLastTurn = () => {
    if (gameRef.current.history().length >= 2) {
      gameRef.current.undo() // undo computer move
      gameRef.current.undo() // undo player move
      const nextFen = gameRef.current.fen()
      setGameFen(nextFen)
      setFenHistory(prev => prev.slice(0, -2))
      setCurrentMoveIndex(gameRef.current.history().length)
      setSelectedSquare(null)
      setManualPremove(null)
      setGameResult(null) // Clear result if undoing
    }
  }

  const handleResign = () => {
    setGameResult({ type: 'loss', reason: 'Resigned' })
    setShowResignConfirm(false)
    playGameSound('resign', volume)
  }

  const resetGame = () => {
    setGameStarted(false)
    setGameMode(null)
    setGameResult(null)
    setManualPremove(null)
    setSelectedSquare(null)
    setIsVoiceActive(false)
    setVoiceStatus("Click mic to start speaking moves")
    if (stockfishRef.current) {
      stockfishRef.current.terminate()
      stockfishRef.current = null
    }
    totalMovesRef.current = 0
    blindfoldMovesRef.current = 0
    // Reset FEN history
    gameRef.current = new Chess()
    const initialFen = gameRef.current.fen()
    setGameFen(initialFen)
    setFenHistory([initialFen])
    setCurrentMoveIndex(0)
  }

  const toggleVoiceControl = () => {
    setIsVoiceActive((prev) => {
      const next = !prev
      if (next) {
        setVoiceStatus("Listening... Speak your move (e.g. 'e4', 'Knight f3')")
      } else {
        setVoiceStatus("Voice control stopped")
      }
      return next
    })
  }

  useChessVoiceControl({
    game: gameRef.current,
    makeMove,
    setBlindfoldMode,
    setShowResignConfirm,
    showResignConfirm,
    handleResign,
    isVoiceActive,
    setVoiceStatus,
    volume,
  })




  // Trigger Stockfish when it is the AI's turn
  useEffect(() => {
    const turn = gameRef.current.turn()
    const playerIsWhite = playerColor === 'white'
    const isAiTurn = (turn === 'w' && !playerIsWhite) || (turn === 'b' && playerIsWhite)

    if (gameStarted && gameMode === 'computer' && isAiTurn && !gameResult) {
      const timer = setTimeout(() => {
        makeEngineMove()
      }, 500) // Small delay before engine search begins
      return () => clearTimeout(timer)
    }
  }, [fenHistory.length, gameStarted, gameResult, playerColor, gameMode])

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const currentLevel = engineLevels.find((l) => l.id === selectedLevel)
  const currentTC = timeControls
    .flatMap((g) => g.options)
    .find((o) => o.id === selectedTimeControl)

  const turn = gameRef.current.turn()
  const playerIsWhite = playerColor === 'white'
  const isPlayerTurn = (turn === 'w' && playerIsWhite) || (turn === 'b' && !playerIsWhite)

  const possibleMoves = (selectedSquare && isPlayerTurn)
    ? (gameRef.current.moves({ square: selectedSquare as any, verbose: true }) as any[])
    : []

  const lastMove = currentMoveIndex > 0
    ? (gameRef.current.history({ verbose: true }) as any[])[currentMoveIndex - 1]
    : null

  const getKingSquareInCheck = () => {
    try {
      const viewedGame = new Chess(gameFen)
      if (!viewedGame.inCheck()) return null
      const viewedTurn = viewedGame.turn()
      const board = viewedGame.board()
      for (const row of board) {
        for (const piece of row) {
          if (piece && piece.type === 'k' && piece.color === viewedTurn) {
            return piece.square
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return null
  }

  const kingSquare = getKingSquareInCheck()

  const customSquareStyles = {
    ...(lastMove && {
      [lastMove.from]: {
        backgroundColor: 'rgba(247, 247, 105, 0.4)',
      },
      [lastMove.to]: {
        backgroundColor: 'rgba(247, 247, 105, 0.4)',
      }
    }),
    ...(kingSquare && {
      [kingSquare]: {
        background: 'radial-gradient(circle, rgba(255, 0, 0, 0.5) 0%, rgba(255, 0, 0, 0.2) 70%, transparent 100%)',
      }
    }),
    ...(selectedSquare && {
      [selectedSquare]: {
        backgroundColor: 'rgba(128, 207, 255, 0.25)',
      }
    }),
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
      [manualPremove.from]: {
        backgroundColor: 'rgba(255, 100, 80, 0.35)',
      },
      [manualPremove.to]: {
        backgroundColor: 'rgba(255, 100, 80, 0.35)',
      }
    })
  }

  return (
    <div className={`dashboard-shell play-shell${isCollapsed || gameStarted ? ' sidebar-collapsed' : ''}`}>
      <DashboardSidebar
        username={username}
        isCollapsed={isCollapsed || gameStarted}
        onToggleCollapse={gameStarted ? undefined : () => setIsCollapsed(!isCollapsed)}
      />

      <main className="dashboard-main">
        {gameStarted ? (
          /* Active Chess Game vs AI */
          <div className="game-main">
            {/* Left/Center Column: Chess Board Section */}
            <section className="board-section">
              <div className="board-container">
                
                {/* AI / Opponent Info Bar */}
                <div className="player-info-bar">
                  <div className="player-info-details">
                    <div className="player-avatar player-avatar--ai">
                      <Bot size={18} />
                    </div>
                    <div className="player-name-container">
                      <span className="player-name">Stockfish ({currentLevel?.label || 'Engine'})</span>
                      <span className="player-elo">Elo {currentLevel?.elo || '1500'}</span>
                    </div>
                  </div>
                  {gameMode === 'online' && (
                    <div className={`player-clock ${gameRef.current.turn() !== (playerColor === 'white' ? 'w' : 'b') ? 'player-clock--active-turn-ai' : ''}`}>
                      {formatTime(aiTime)}
                    </div>
                  )}
                </div>

                {/* The Chessboard Wrapper */}
                <div className="board-wrapper">
                  <Chessboard
                    options={{
                      position: gameFen,
                      boardOrientation: playerColor,
                      allowDragging: !gameResult && (currentMoveIndex === gameRef.current.history().length),
                      onPieceDrop: onDrop,
                      onSquareClick: onSquareClick,
                      boardStyle: {
                        borderRadius: '8px',
                        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
                      },
                      squareStyles: customSquareStyles,
                      darkSquareStyle: { backgroundColor: '#2a4d61' },
                      lightSquareStyle: { backgroundColor: '#dfe3e7' },
                      pieces: blindfoldMode
                        ? {
                            wP: () => <div style={{ opacity: 0 }} />,
                            wN: () => <div style={{ opacity: 0 }} />,
                            wB: () => <div style={{ opacity: 0 }} />,
                            wR: () => <div style={{ opacity: 0 }} />,
                            wQ: () => <div style={{ opacity: 0 }} />,
                            wK: () => <div style={{ opacity: 0 }} />,
                            bP: () => <div style={{ opacity: 0 }} />,
                            bN: () => <div style={{ opacity: 0 }} />,
                            bB: () => <div style={{ opacity: 0 }} />,
                            bR: () => <div style={{ opacity: 0 }} />,
                            bQ: () => <div style={{ opacity: 0 }} />,
                            bK: () => <div style={{ opacity: 0 }} />,
                          }
                        : undefined
                    }}
                  />

                  {blindfoldMode && (
                    <div className="blindfold-mode-overlay">
                      <EyeOff size={40} />
                      <h4>Blindfold Mode Active</h4>
                      <p>The pieces are hidden. Play and visualize the moves in your mind.</p>
                    </div>
                  )}
                </div>

                {/* Player Info Bar */}
                <div className="player-info-bar">
                  <div className="player-info-details">
                    <div className="player-avatar player-avatar--user">
                      <User size={18} />
                    </div>
                    <div className="player-name-container">
                      <span className="player-name">{username}</span>
                      <span className="player-elo">Player</span>
                    </div>
                  </div>
                  {gameMode === 'online' && (
                    <div className={`player-clock ${gameRef.current.turn() === (playerColor === 'white' ? 'w' : 'b') ? 'player-clock--active-turn' : ''}`}>
                      {formatTime(playerTime)}
                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* Right Column: Controls section */}
            <aside className="controls-section">

              {/* Move History list */}
              <div className="move-history-container" ref={moveHistoryRef}>
                <div className="move-history-header">
                  <span className="move-history-title">Move History</span>
                  {gameRef.current.history().length > 0 && (
                    <button 
                      className="copy-pgn-btn" 
                      onClick={handleCopyPGN}
                      title="Copy PGN to Clipboard"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy PGN'}
                    </button>
                  )}
                </div>
                <div className="move-history-list">
                  {(() => {
                    const history = gameRef.current.history()
                    const pairs = []
                    for (let i = 0; i < history.length; i += 2) {
                      pairs.push({
                        num: Math.floor(i / 2) + 1,
                        w: history[i],
                        b: history[i + 1] || ''
                      })
                    }
                    if (pairs.length === 0) {
                      return <span style={{ color: 'var(--muted-low)', fontSize: '0.85rem', fontStyle: 'italic' }}>No moves played yet. Drag or click pieces to make a move!</span>
                    }
                    return pairs.map((pair) => (
                      <div key={pair.num} className="move-row">
                        <span className="move-number">{pair.num}.</span>
                        <span 
                          className={`move-val${currentMoveIndex === (pair.num * 2 - 1) ? ' move-val--active' : ''}`}
                          onClick={() => {
                            setCurrentMoveIndex(pair.num * 2 - 1)
                            setGameFen(fenHistory[pair.num * 2 - 1])
                          }}
                        >
                          {pair.w}
                        </span>
                        {pair.b ? (
                          <span 
                            className={`move-val${currentMoveIndex === (pair.num * 2) ? ' move-val--active' : ''}`}
                            onClick={() => {
                              setCurrentMoveIndex(pair.num * 2)
                              setGameFen(fenHistory[pair.num * 2])
                            }}
                          >
                            {pair.b}
                          </span>
                        ) : (
                          <span className="move-val move-val--empty" />
                        )}
                      </div>
                    ))
                  })()}
                </div>
              </div>

              {/* Move History Navigation Controls */}
              {gameRef.current.history().length > 0 && (
                <div className="history-navigation-bar">
                  <button
                    className="history-nav-btn"
                    onClick={() => {
                      setCurrentMoveIndex(0)
                      setGameFen(fenHistory[0])
                    }}
                    disabled={currentMoveIndex === 0}
                    title="First Move"
                  >
                    <ChevronsLeft size={20} />
                  </button>
                  <button
                    className="history-nav-btn"
                    onClick={() => {
                      const nextIndex = Math.max(0, currentMoveIndex - 1)
                      setCurrentMoveIndex(nextIndex)
                      setGameFen(fenHistory[nextIndex])
                    }}
                    disabled={currentMoveIndex === 0}
                    title="Previous Move"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    className="history-nav-btn"
                    onClick={() => {
                      const nextIndex = Math.min(gameRef.current.history().length, currentMoveIndex + 1)
                      setCurrentMoveIndex(nextIndex)
                      setGameFen(fenHistory[nextIndex])
                    }}
                    disabled={currentMoveIndex === gameRef.current.history().length}
                    title="Next Move"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <button
                    className="history-nav-btn"
                    onClick={() => {
                      const nextIndex = gameRef.current.history().length
                      setCurrentMoveIndex(nextIndex)
                      setGameFen(fenHistory[nextIndex])
                    }}
                    disabled={currentMoveIndex === gameRef.current.history().length}
                    title="Last Move"
                  >
                    <ChevronsRight size={20} />
                  </button>
                </div>
              )}

              {/* Voice Control Panel */}
              <div className="voice-panel-card">
                <div className="voice-panel-row">
                  <div className="voice-mic-container">
                    <button
                      type="button"
                      className={`voice-mic-btn${isVoiceActive ? ' voice-mic-btn--active' : ''}`}
                      onClick={toggleVoiceControl}
                      aria-label={isVoiceActive ? 'Stop voice control' : 'Start voice control'}
                    >
                      <Mic size={20} />
                    </button>
                    <div className="mic-ripple" />
                  </div>
                  
                  <div className="voice-details">
                    <span className="voice-title">Voice Command</span>
                    <span className="voice-status">{voiceStatus}</span>
                  </div>

                  <div className={`voice-waveform${isVoiceActive ? ' voice-waveform--active' : ''}`}>
                    <div className="voice-wave-bar" />
                    <div className="voice-wave-bar" />
                    <div className="voice-wave-bar" />
                    <div className="voice-wave-bar" />
                    <div className="voice-wave-bar" />
                    <div className="voice-wave-bar" />
                  </div>
                </div>

              </div>

              {/* Game Control Action Buttons */}
              <div className="game-controls-footer">
                {showResignConfirm && (
                  <div className="resign-overlay-backdrop" onClick={() => setShowResignConfirm(false)} />
                )}

                {gameResult ? (
                  <div className="game-buttons-layout animate-fade-in">
                    <div className="control-btn-grid">
                      <button 
                        className="game-control-btn game-control-btn--takeback" 
                        onClick={resetGame}
                      >
                        <RotateCcw size={14} />
                        Play Again
                      </button>
                      <button 
                        className="game-control-btn game-control-btn--view-result" 
                        onClick={() => setShowResultModal(true)}
                      >
                        <Eye size={14} />
                        View Result
                      </button>
                    </div>
                  </div>
                ) : !showResignConfirm ? (
                  <div className="game-buttons-layout animate-fade-in">
                    <div className="control-btn-grid">
                      <button 
                        className="game-control-btn game-control-btn--resign" 
                        onClick={() => setShowResignConfirm(true)}
                        disabled={!!gameResult}
                      >
                        <Flag size={14} />
                        Resign
                      </button>
                      <button 
                        className="game-control-btn game-control-btn--takeback" 
                        onClick={undoLastTurn}
                        disabled={gameRef.current.history().length < 2}
                      >
                        <RotateCcw size={14} />
                        Take back
                      </button>
                    </div>

                    <button 
                      className={`game-control-btn game-control-btn--blindfold ${blindfoldMode ? 'game-control-btn--blindfold-active' : ''}`}
                      onClick={() => setBlindfoldMode(!blindfoldMode)}
                    >
                      {blindfoldMode ? <Eye size={14} /> : <EyeOff size={14} />}
                      {blindfoldMode ? 'Show Pieces' : 'Blindfold Mode'}
                    </button>
                  </div>
                ) : (
                  <div className="resign-confirm-block animate-fade-in">
                    <span className="resign-prompt-text">Are you sure you want to resign?</span>
                    <div className="resign-confirm-grid">
                      <button 
                        className="game-control-btn game-control-btn--resign-yes" 
                        onClick={handleResign}
                      >
                        <Flag size={14} />
                        Yes, Resign
                      </button>
                      <button 
                        className="game-control-btn game-control-btn--resign-no" 
                        onClick={() => setShowResignConfirm(false)}
                      >
                        <Play size={14} />
                        No, Keep Playing
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Game Result Overlay */}
            {gameResult && showResultModal && (
              <div className="game-result-overlay" role="dialog" aria-modal="true" aria-label="Game Result">
                <div className="game-result-card">
                  <button 
                    className="game-result-close-btn" 
                    onClick={() => setShowResultModal(false)}
                    aria-label="Close game result"
                  >
                    <X size={18} />
                  </button>
                  <span className="game-result-title">
                    {gameResult.type === 'win' ? 'Victory!' : gameResult.type === 'loss' ? 'Defeat' : 'Draw'}
                  </span>
                  <span className="game-result-desc">
                    {gameResult.type === 'win' && `You won by ${gameResult.reason}.`}
                    {gameResult.type === 'loss' && `AI won by ${gameResult.reason}.`}
                    {gameResult.type === 'draw' && `Game drawn by ${gameResult.reason}.`}
                  </span>
                  <button className="primary-button game-result-btn" onClick={resetGame}>
                    Play Again
                  </button>
                </div>
              </div>
            )}

          </div>
        ) : (
          /* Choice Setup View */
          <div className="play-page-content">
            <div className="play-page-heading">
              <h2>Choose Your Game Mode</h2>
              <p>Select how you want to play and jump right into a match</p>
            </div>

            <div className="play-mode-grid">
              {/* ── Card 1: Play vs Engine ──────────────────────── */}
              <article 
                className={`play-mode-card play-mode-card--amber${modeParam === 'computer' ? ' play-mode-card--highlighted-amber' : ''}`} 
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
                        className={`engine-level-btn${selectedLevel === id ? ' engine-level-btn--active' : ''}`}
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

                <div className="play-mode-card__footer">
                  <span className="play-mode-card__voice-badge">
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
                className={`play-mode-card play-mode-card--cyan${modeParam === 'online' ? ' play-mode-card--highlighted-cyan' : ''}`} 
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
                            className={`time-control-pill${selectedTimeControl === id ? ' time-control-pill--active' : ''}`}
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
                    onClick={() => setIsSearching(true)}
                  >
                    <Users size={18} aria-hidden="true" />
                    Find Match
                  </button>
                </div>
              </article>
            </div>
          </div>
        )}
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
            <p>Setting up Stockfish (Strength: {currentLevel?.label} - Elo {currentLevel?.elo})</p>

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
