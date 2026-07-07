import React from 'react'
import { Mic, Flag, RotateCcw, Eye, EyeOff, Play, RefreshCw, HelpCircle, X } from 'lucide-react'
import MoveList from './MoveList'
import MoveNavBar from './MoveNavBar'

interface GameControlsPanelProps {
  gameMode: 'computer' | 'online'
  moves: string[]
  currentMoveIndex: number
  fenHistory: string[]
  onSelectMove: (idx: number, fen: string) => void
  handleCopyPGN: () => void
  copied: boolean
  isVoiceActive: boolean
  toggleVoiceControl: () => void
  voiceStatus: string
  gameResult: { type: 'win' | 'loss' | 'draw' | 'aborted'; reason: string } | null
  showResignConfirm: boolean
  setShowResignConfirm: (val: boolean) => void
  handleResign: () => void
  undoLastTurn: () => void
  resetGame: () => void
  blindfoldMode: boolean
  setBlindfoldMode: (val: boolean) => void
  boardOrientation: 'white' | 'black'
  setBoardOrientation: React.Dispatch<React.SetStateAction<'white' | 'black'>>
  onShowResultModal: () => void
  // Online/Multiplayer specific draw props
  offerDraw?: () => void
  drawOfferFrom?: string | null
  respondDraw?: (accepted: boolean) => void
  opponentDisconnected?: boolean
}

const GameControlsPanel: React.FC<GameControlsPanelProps> = ({
  gameMode,
  moves,
  currentMoveIndex,
  fenHistory,
  onSelectMove,
  handleCopyPGN,
  copied,
  isVoiceActive,
  toggleVoiceControl,
  voiceStatus,
  gameResult,
  showResignConfirm,
  setShowResignConfirm,
  handleResign,
  undoLastTurn,
  resetGame,
  blindfoldMode,
  setBlindfoldMode,
  setBoardOrientation,
  offerDraw,
  drawOfferFrom,
  respondDraw,
  opponentDisconnected = false,
  onShowResultModal,
}) => {
  const [isHelpOpen, setIsHelpOpen] = React.useState(false)
  const [isClosing, setIsClosing] = React.useState(false)

  const handleCloseHelp = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsHelpOpen(false)
      setIsClosing(false)
    }, 250)
  }

  return (
    <aside className="controls-section">
      {/* Move List */}
      <MoveList
        moves={moves}
        currentIndex={currentMoveIndex}
        fenHistory={fenHistory}
        onSelectMove={onSelectMove}
        showCopyPgn
        onCopyPgn={handleCopyPGN}
        copied={copied}
        emptyMessage="No moves played yet. Drag or click pieces to make a move!"
      />

      {/* Move Navigation Bar */}
      {moves.length > 0 && (
        <MoveNavBar
          currentIndex={currentMoveIndex}
          totalMoves={moves.length}
          onFirst={() => onSelectMove(0, fenHistory[0])}
          onPrev={() => {
            const i = Math.max(0, currentMoveIndex - 1)
            onSelectMove(i, fenHistory[i])
          }}
          onNext={() => {
            const i = Math.min(moves.length, currentMoveIndex + 1)
            onSelectMove(i, fenHistory[i])
          }}
          onLast={() => {
            const i = moves.length
            onSelectMove(i, fenHistory[i])
          }}
        />
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
              disabled={!!gameResult}
            >
              <Mic size={20} />
            </button>
            <div className="mic-ripple" />
          </div>

          <div className="voice-details">
            <div className="voice-title-row">
              <span className="voice-title">Voice Command</span>
              <button
                type="button"
                id="voice-help-trigger"
                className="voice-help-btn"
                onClick={() => setIsHelpOpen(true)}
                title="Show Voice Commands Guide"
                aria-label="Show Voice Commands Guide"
              >
                <HelpCircle size={14} />
              </button>
            </div>
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
                {gameMode === 'online' ? 'Exit Game' : 'Play Again'}
              </button>
              <button
                className="game-control-btn game-control-btn--view-result"
                onClick={onShowResultModal}
              >
                <Eye size={14} />
                View Result
              </button>
            </div>
            <button
              className="game-control-btn game-control-btn--flip"
              onClick={() => {
                setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'))
              }}
              style={{ marginTop: '4px', width: '100%' }}
            >
              <RefreshCw size={14} />
              Flip Board
            </button>
          </div>
        ) : showResignConfirm ? (
          <div className="resign-confirm-block animate-fade-in">
            <span className="resign-prompt-text">Are you sure you want to resign?</span>
            <div className="resign-confirm-grid">
              <button className="game-control-btn game-control-btn--resign-yes" onClick={handleResign}>
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
        ) : (
          <div className="game-buttons-layout animate-fade-in">
            {/* Draw Offer banner if active */}
            {drawOfferFrom && respondDraw && (
              <div className="draw-offer-banner animate-fade-in" style={{
                marginBottom: '8px',
                padding: '8px',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                  {drawOfferFrom} offered a draw
                </span>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    className="game-control-btn game-control-btn--resign-yes"
                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem' }}
                    onClick={() => respondDraw(true)}
                  >
                    Accept
                  </button>
                  <button
                    className="game-control-btn game-control-btn--resign-no"
                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem' }}
                    onClick={() => respondDraw(false)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            <div className="control-btn-grid">
              <button
                className="game-control-btn game-control-btn--resign"
                onClick={() => setShowResignConfirm(true)}
                disabled={opponentDisconnected}
              >
                <Flag size={14} />
                Resign
              </button>

              {gameMode === 'computer' ? (
                <button
                  className="game-control-btn game-control-btn--takeback"
                  onClick={undoLastTurn}
                  disabled={moves.length < 2}
                >
                  <RotateCcw size={14} />
                  Take back
                </button>
              ) : (
                <button
                  className="game-control-btn game-control-btn--takeback"
                  onClick={offerDraw}
                  disabled={moves.length < 2 || opponentDisconnected}
                >
                  <RefreshCw size={14} />
                  Offer Draw
                </button>
              )}
            </div>

            <div className="control-btn-grid" style={{ marginTop: '4px' }}>
              <button
                className={`game-control-btn game-control-btn--blindfold ${
                  blindfoldMode ? 'game-control-btn--blindfold-active' : ''
                }`}
                onClick={() => setBlindfoldMode(!blindfoldMode)}
              >
                {blindfoldMode ? <Eye size={14} /> : <EyeOff size={14} />}
                {blindfoldMode ? 'Show Pieces' : 'Blindfold'}
              </button>

              <button
                className="game-control-btn game-control-btn--flip"
                onClick={() => {
                  setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'))
                }}
                title="Flip board view"
              >
                <RefreshCw size={14} />
                Flip Board
              </button>
            </div>
          </div>
        )}
      </div>
      {isHelpOpen && (
        <div 
          className={`voice-help-overlay${isClosing ? ' voice-help-overlay--closing' : ''}`}
          id="voice-help-overlay-backdrop"
          onClick={handleCloseHelp}
          role="dialog"
          aria-modal="true"
          aria-label="Voice Control Guidelines"
        >
          <div className="voice-help-card" onClick={(e) => e.stopPropagation()}>
            <div className="voice-help-header">
              <h3>
                <HelpCircle size={18} />
                Voice Control Guide
              </h3>
              <button 
                type="button"
                id="voice-help-close-btn"
                className="voice-help-close-btn" 
                onClick={handleCloseHelp}
                aria-label="Close guide"
              >
                <X size={18} />
              </button>
            </div>
            <div className="voice-help-body">
              <p className="voice-help-intro">
                Enable voice control and speak commands naturally. The assistant will transcribe and play your moves.
              </p>
              
              <div className="voice-help-sections">
                <div className="voice-help-group">
                  <h4>♟️ Moving Pieces & Pawns</h4>
                  <ul className="voice-help-list">
                    <li className="voice-help-item">
                      <span className="voice-help-label">Pawn Moves (just say the square)</span>
                      <div className="voice-help-examples">
                        <span className="voice-help-example">"e4"</span>
                        <span className="voice-help-example">"d5"</span>
                      </div>
                    </li>
                    <li className="voice-help-item">
                      <span className="voice-help-label">Piece Moves</span>
                      <div className="voice-help-examples">
                        <span className="voice-help-example">"Knight f3"</span>
                        <span className="voice-help-example">"Bishop c4"</span>
                        <span className="voice-help-example">"Queen h5"</span>
                      </div>
                    </li>
                    <li className="voice-help-item">
                      <span className="voice-help-label">Captures</span>
                      <div className="voice-help-examples">
                        <span className="voice-help-example">"Knight takes d4"</span>
                        <span className="voice-help-example">"pawn captures on e5"</span>
                      </div>
                    </li>
                    <li className="voice-help-item">
                      <span className="voice-help-label">Castling</span>
                      <div className="voice-help-examples">
                        <span className="voice-help-example">"castle kingside"</span>
                        <span className="voice-help-example">"short castle"</span>
                        <span className="voice-help-example">"castle queenside"</span>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="voice-help-group">
                  <h4>⚙️ System Commands</h4>
                  <ul className="voice-help-list">
                    <li className="voice-help-item">
                      <span className="voice-help-label">Resign Game</span>
                      <div className="voice-help-examples">
                        <span className="voice-help-example">"resign"</span>
                        <span className="voice-help-example">"give up"</span>
                        <span className="voice-help-example">"forfeit"</span>
                      </div>
                    </li>
                    <li className="voice-help-item">
                      <span className="voice-help-label">Toggle Board View</span>
                      <div className="voice-help-examples">
                        <span className="voice-help-example">"blindfold"</span>
                        <span className="voice-help-example">"hide pieces"</span>
                        <span className="voice-help-example">"show pieces"</span>
                      </div>
                    </li>
                    <li className="voice-help-item">
                      <span className="voice-help-label">Draw Offers</span>
                      <div className="voice-help-examples">
                        <span className="voice-help-example">"offer draw"</span>
                        <span className="voice-help-example">"accept" (respond)</span>
                        <span className="voice-help-example">"decline" (respond)</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

export default GameControlsPanel
