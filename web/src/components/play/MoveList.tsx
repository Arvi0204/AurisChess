import { Check, Copy } from 'lucide-react'
import { useRef, useEffect } from 'react'

export type MoveListProps = {
  moves: string[]                             // chess.js .history() SAN array
  currentIndex: number                        // which half-move is active (0 = start)
  fenHistory: string[]
  onSelectMove: (index: number, fen: string) => void
  showCopyPgn?: boolean
  onCopyPgn?: () => void
  copied?: boolean
  emptyMessage?: string
}

const MoveList = ({
  moves,
  currentIndex,
  fenHistory,
  onSelectMove,
  showCopyPgn = false,
  onCopyPgn,
  copied = false,
  emptyMessage = 'No moves played yet.',
}: MoveListProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll active move into view
  useEffect(() => {
    if (containerRef.current) {
      const active = containerRef.current.querySelector('.move-val--active')
      active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentIndex])

  // Build move pairs: [{num, w, b}]
  const pairs = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      wIdx: i + 1,          // 1-based half-move index for white
      bIdx: i + 2,          // 1-based half-move index for black
      w: moves[i],
      b: moves[i + 1] || '',
    })
  }

  return (
    <div className="move-history-container" ref={containerRef}>
      <div className="move-history-header">
        <span className="move-history-title">Move History</span>
        {showCopyPgn && moves.length > 0 && onCopyPgn && (
          <button
            className="copy-pgn-btn"
            onClick={onCopyPgn}
            title="Copy PGN to Clipboard"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy PGN'}
          </button>
        )}
      </div>

      <div className="move-history-list">
        {pairs.length === 0 ? (
          <span style={{ color: 'var(--muted-low)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            {emptyMessage}
          </span>
        ) : (
          pairs.map((pair) => (
            <div key={pair.num} className="move-row">
              <span className="move-number">{pair.num}.</span>
              <span
                className={`move-val${currentIndex === pair.wIdx ? ' move-val--active' : ''}`}
                onClick={() => onSelectMove(pair.wIdx, fenHistory[pair.wIdx])}
              >
                {pair.w}
              </span>
              {pair.b ? (
                <span
                  className={`move-val${currentIndex === pair.bIdx ? ' move-val--active' : ''}`}
                  onClick={() => onSelectMove(pair.bIdx, fenHistory[pair.bIdx])}
                >
                  {pair.b}
                </span>
              ) : (
                <span className="move-val move-val--empty" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default MoveList
