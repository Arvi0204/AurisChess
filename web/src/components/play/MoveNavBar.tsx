import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'

export type MoveNavBarProps = {
  currentIndex: number
  totalMoves: number
  onFirst: () => void
  onPrev: () => void
  onNext: () => void
  onLast: () => void
  /** Optional extra buttons rendered after the four nav buttons */
  extraButtons?: React.ReactNode
}

const MoveNavBar = ({
  currentIndex,
  totalMoves,
  onFirst,
  onPrev,
  onNext,
  onLast,
  extraButtons,
}: MoveNavBarProps) => {
  const atStart = currentIndex === 0
  const atEnd = currentIndex === totalMoves

  return (
    <div className="history-navigation-bar">
      <button
        className="history-nav-btn"
        onClick={onFirst}
        disabled={atStart}
        title="First move"
        aria-label="Go to first move"
      >
        <ChevronsLeft size={20} />
      </button>

      <button
        className="history-nav-btn"
        onClick={onPrev}
        disabled={atStart}
        title="Previous move"
        aria-label="Go to previous move"
      >
        <ChevronLeft size={20} />
      </button>

      <button
        className="history-nav-btn"
        onClick={onNext}
        disabled={atEnd}
        title="Next move"
        aria-label="Go to next move"
      >
        <ChevronRight size={20} />
      </button>

      <button
        className="history-nav-btn"
        onClick={onLast}
        disabled={atEnd}
        title="Last move"
        aria-label="Go to last move"
      >
        <ChevronsRight size={20} />
      </button>

      {extraButtons}
    </div>
  )
}

export default MoveNavBar
