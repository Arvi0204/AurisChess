import { Sparkles } from 'lucide-react'

const AuthStory = () => {
  return (
    <div className="auth-story">
      <p className="status-pill">
        <Sparkles size={13} aria-hidden="true" />
        Voice-ready training
      </p>
      <h1>
        Keep every move in <span>sync</span>
      </h1>
      <p>
        Access saved games, blindfold drills, and voice analysis from one quiet workspace built around chess focus.
      </p>

      <div className="auth-preview" aria-hidden="true">
        <div className="mini-board">
          {Array.from({ length: 16 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="preview-details">
          <div>
            <span className="preview-kicker">Last session</span>
            <strong>Blindfold tactics</strong>
          </div>
          <div className="preview-wave">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="preview-move">"Knight to F3" -&gt; Nf3</span>
        </div>
      </div>

      <div className="auth-benefits" aria-label="Account benefits">
        <span>Game history</span>
        <span>Voice profile</span>
        <span>Training progress</span>
      </div>
    </div>
  )
}

export default AuthStory
