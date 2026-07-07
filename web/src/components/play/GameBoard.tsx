import React from 'react'
import { Timer, Zap } from 'lucide-react'
import PlayerInfoBar from './PlayerInfoBar'
import BoardWrapper from './BoardWrapper'

interface GameBoardProps {
  gameMode: 'computer' | 'online'
  playerColor: 'white' | 'black'
  boardOrientation: 'white' | 'black'
  gameFen: string
  customSquareStyles: Record<string, React.CSSProperties>
  blindfoldMode: boolean
  onDrop: (args: { piece: any; sourceSquare: string; targetSquare: string | null }) => boolean
  onSquareClick: (args: { piece?: any; square: string }) => void
  gameResult: { type: 'win' | 'loss' | 'draw' | 'aborted'; reason: string } | null
  currentMoveIndex: number
  historyLength: number
  username: string
  opponentName: string
  opponentElo: string | number
  playerElo: string | number
  timeControlCategory: 'rapid' | 'blitz'
  playerTime: number
  opponentTime: number
  isPlayerTurn: boolean
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameMode,
  playerColor,
  boardOrientation,
  gameFen,
  customSquareStyles,
  blindfoldMode,
  onDrop,
  onSquareClick,
  gameResult,
  currentMoveIndex,
  historyLength,
  username,
  opponentName,
  opponentElo,
  playerElo,
  timeControlCategory,
  playerTime,
  opponentTime,
  isPlayerTurn,
}) => {
  const showClock = gameMode === 'online'

  const renderPlayerElo = () => {
    const Icon = timeControlCategory === 'blitz' ? Zap : Timer
    return (
      <span className="player-rating-span" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Icon
          size={12}
          className={timeControlCategory === 'blitz' ? 'rating-icon--blitz' : 'rating-icon--rapid'}
          style={{ color: timeControlCategory === 'blitz' ? 'var(--color-amber)' : 'var(--color-cyan)' }}
          aria-hidden="true"
        />
        <span>Elo {playerElo}</span>
      </span>
    )
  }

  const renderOpponentElo = () => {
    if (gameMode === 'computer') {
      return `Elo ${opponentElo}`
    }
    const Icon = timeControlCategory === 'blitz' ? Zap : Timer
    return (
      <span className="player-rating-span" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Icon
          size={12}
          className={timeControlCategory === 'blitz' ? 'rating-icon--blitz' : 'rating-icon--rapid'}
          style={{ color: timeControlCategory === 'blitz' ? 'var(--color-amber)' : 'var(--color-cyan)' }}
          aria-hidden="true"
        />
        <span>Elo {opponentElo}</span>
      </span>
    )
  }

  // Top player configuration
  const renderTopPlayer = () => {
    if (boardOrientation === playerColor) {
      // Opponent is on top
      return (
        <PlayerInfoBar
          name={opponentName}
          role={gameMode === 'computer' ? 'ai' : 'opponent'}
          subtitle={opponentElo ? renderOpponentElo() : undefined}
          showClock={showClock}
          clockSeconds={opponentTime}
          isActiveTurn={showClock && !isPlayerTurn}
          isAiTurn={gameMode === 'computer'}
        />
      )
    } else {
      // Current player is on top
      return (
        <PlayerInfoBar
          name={username}
          role="user"
          subtitle={renderPlayerElo()}
          showClock={showClock}
          clockSeconds={playerTime}
          isActiveTurn={showClock && isPlayerTurn}
        />
      )
    }
  }

  // Bottom player configuration
  const renderBottomPlayer = () => {
    if (boardOrientation === playerColor) {
      // Current player is on bottom
      return (
        <PlayerInfoBar
          name={username}
          role="user"
          subtitle={renderPlayerElo()}
          showClock={showClock}
          clockSeconds={playerTime}
          isActiveTurn={showClock && isPlayerTurn}
        />
      )
    } else {
      // Opponent is on bottom
      return (
        <PlayerInfoBar
          name={opponentName}
          role={gameMode === 'computer' ? 'ai' : 'opponent'}
          subtitle={opponentElo ? renderOpponentElo() : undefined}
          showClock={showClock}
          clockSeconds={opponentTime}
          isActiveTurn={showClock && !isPlayerTurn}
          isAiTurn={gameMode === 'computer'}
        />
      )
    }
  }

  return (
    <section className="board-section">
      <div className="board-container">
        {renderTopPlayer()}

        <BoardWrapper
          fen={gameFen}
          orientation={boardOrientation}
          squareStyles={customSquareStyles}
          blindfoldMode={blindfoldMode}
          onPieceDrop={onDrop}
          onSquareClick={onSquareClick}
          readOnly={!!gameResult && currentMoveIndex !== historyLength}
        />

        {renderBottomPlayer()}
      </div>
    </section>
  )
}

export default GameBoard
