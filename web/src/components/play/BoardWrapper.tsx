import { EyeOff } from 'lucide-react'
import { Chessboard } from 'react-chessboard'

export type BoardWrapperProps = {
  fen: string
  orientation: 'white' | 'black'
  squareStyles?: Record<string, React.CSSProperties>
  /** When true, board is view-only (no drag/click handlers wired) */
  readOnly?: boolean
  blindfoldMode?: boolean
  onPieceDrop?: (args: { piece: any; sourceSquare: string; targetSquare: string | null }) => boolean
  onSquareClick?: (args: { square: string; piece?: any }) => void
}

const PIECE_HIDDEN = { opacity: 0 } as const

const hiddenPieces = {
  wP: () => <div style={PIECE_HIDDEN} />,
  wN: () => <div style={PIECE_HIDDEN} />,
  wB: () => <div style={PIECE_HIDDEN} />,
  wR: () => <div style={PIECE_HIDDEN} />,
  wQ: () => <div style={PIECE_HIDDEN} />,
  wK: () => <div style={PIECE_HIDDEN} />,
  bP: () => <div style={PIECE_HIDDEN} />,
  bN: () => <div style={PIECE_HIDDEN} />,
  bB: () => <div style={PIECE_HIDDEN} />,
  bR: () => <div style={PIECE_HIDDEN} />,
  bQ: () => <div style={PIECE_HIDDEN} />,
  bK: () => <div style={PIECE_HIDDEN} />,
}

const BoardWrapper = ({
  fen,
  orientation,
  squareStyles = {},
  readOnly = false,
  blindfoldMode = false,
  onPieceDrop,
  onSquareClick,
}: BoardWrapperProps) => (
  <div className="board-wrapper">
    <Chessboard
      options={{
        position: fen,
        boardOrientation: orientation,
        allowDragging: !readOnly,
        onPieceDrop: readOnly ? undefined : onPieceDrop,
        onSquareClick: readOnly ? undefined : onSquareClick,
        boardStyle: {
          borderRadius: '8px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
        },
        squareStyles,
        darkSquareStyle: { backgroundColor: '#2a4d61' },
        lightSquareStyle: { backgroundColor: '#dfe3e7' },
        pieces: blindfoldMode ? hiddenPieces : undefined,
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
)

export default BoardWrapper
