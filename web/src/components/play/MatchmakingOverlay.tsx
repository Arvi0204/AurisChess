import React from 'react'
import { Loader2, X } from 'lucide-react'
import { formatTime } from '../../utils/chessHelpers'

interface MatchmakingOverlayProps {
  searchTime: number
  statusMessage: string
  onCancel: () => void
  currentTC?: { label: string; minutes: number; increment: number }
}

const MatchmakingOverlay: React.FC<MatchmakingOverlayProps> = ({
  searchTime,
  statusMessage,
  onCancel,
  currentTC,
}) => {
  return (
    <div className="play-overlay" role="dialog" aria-modal="true" aria-label="Matchmaking status">
      <div className="play-overlay-card play-overlay-card--cyan">
        <div className="play-overlay-visual">
          <div className="play-overlay-icon-wrapper">
            <Loader2
              size={32}
              className="animate-spin"
              style={{ animation: 'spin 1.5s linear infinite' }}
            />
          </div>
          <div className="play-overlay-pulse" />
          <div className="play-overlay-pulse play-overlay-pulse-2" />
        </div>

        <h4>Finding Match</h4>
        <p>
          Voice-Enabled {currentTC?.label || ''} Game (
          {currentTC?.minutes || 10}m {currentTC?.increment ? `+ ${currentTC.increment}s` : ''})
        </p>

        <div className="play-overlay-timer">{formatTime(searchTime)}</div>

        <span className="play-overlay-status">{statusMessage}</span>

        <button type="button" className="play-overlay-cancel-btn" onClick={onCancel}>
          <X size={16} aria-hidden="true" />
          Cancel Search
        </button>
      </div>
    </div>
  )
}

export default MatchmakingOverlay
