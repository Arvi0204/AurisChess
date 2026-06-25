import { Chess } from 'chess.js'

/**
 * Given a FEN string, returns the square of the king that is currently in check.
 * Returns null if no king is in check.
 */
export function getKingSquareInCheck(fen: string): string | null {
  try {
    const game = new Chess(fen)
    if (!game.inCheck()) return null
    const turn = game.turn()
    const board = game.board()
    for (const row of board) {
      for (const piece of row) {
        if (piece && piece.type === 'k' && piece.color === turn) {
          return piece.square
        }
      }
    }
  } catch {
    // ignore malformed FEN
  }
  return null
}

/**
 * Formats a total-seconds value into "M:SS" clock format.
 */
export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Converts a centipawn score to a display string.
 * e.g. 120 → "+1.2", -350 → "-3.5", 0 → "0.0"
 */
export function formatEval(cp: number): string {
  const pawns = cp / 100
  const sign = pawns > 0 ? '+' : ''
  return `${sign}${pawns.toFixed(1)}`
}

/**
 * Converts centipawns to a 0-100 percentage for the eval bar
 * (white's share). Clamped and smoothed with a sigmoid-like curve.
 */
export function evalToPercent(cp: number): number {
  // Clamp to ±1000cp (roughly ±10 pawns), map to 0-100
  const clamped = Math.max(-1000, Math.min(1000, cp))
  return 50 + (clamped / 1000) * 50 // range: 0% to 100%
}

/**
 * Play a chess sound effect.
 */
export function playChessSound(
  type: 'move-self' | 'move-opponent' | 'capture' | 'check' | 'checkmate' | 'illegal' | 'resign',
  volume = 0.5
) {
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
}
