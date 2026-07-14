import {
  Brain,
  ChevronRight,
  EyeOff,
  Mic,
  Play,
  Sparkles,
  User,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import heroKnight from '../assets/aurischess-hero-knight.png'
import logo from '../assets/aurischess-logo.svg'
import SiteHeader from '../components/SiteHeader'

const flagshipCapabilities = [
  {
    icon: Mic,
    title: 'Voice-First Gameplay',
    description: 'Speak your moves naturally. Our advanced recognition engine understands algebraic notations, descriptions, and conversational moves instantly.',
    accent: 'cyan',
    preview: (
      <div className="notation-row" aria-label="Voice move conversion example">
        <code>"Knight to f3"</code>
        <ChevronRight size={14} aria-hidden="true" />
        <code className="accent-code">Nf3</code>
      </div>
    ),
  },
  {
    icon: EyeOff,
    title: 'Blindfold Training',
    description: 'Enhance your spatial awareness. Completely hide the board and play by speaking moves and listening to opponent response narrations.',
    accent: 'amber',
    preview: (
      <div className="blindfold-preview" aria-hidden="true">
        <button type="button" aria-label="Start blindfold voice prompt">
          <Mic size={16} />
        </button>
      </div>
    ),
  },
  {
    icon: Brain,
    title: 'Board Queries',
    description: 'Acclimatise yourself to blindfold play. Query the locations of pieces (e.g. "Where are the rooks?") or ask for the last moves verbally to build a strong mental map.',
    accent: 'purple',
    preview: (
      <div className="chat-preview" aria-label="Board query voice example">
        <span className="chat-bubble question">"Where are my knights?"</span>
        <span className="chat-bubble answer">"Your knights are on c3 and f3."</span>
      </div>
    ),
  },
]

const workflowSteps = [
  { number: '01', title: 'Speak Your Move', desc: 'Speak your move naturally (e.g. "Knight to f3") or use standard algebraic notation.' },
  { number: '02', title: 'Speech Interpretation', desc: 'The voice interface parses your audio, validates move legality against rules, and updates the board.' },
  { number: '03', title: 'Audio Talkback', desc: 'Hear the opponent\'s move response and crucial board alerts narrated back to you.' },
]

const HomePage = () => {
  return (
    <main className="page-shell">
      <SiteHeader />

      {/* Hero Section */}
      <section className="hero-section" id="top">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-copy">
          <p className="status-pill">
            <Sparkles size={13} aria-hidden="true" />
            Voice engine active
          </p>
          <h1>
            Mastering Chess with Your <span>Voice</span>
          </h1>
          <p>
            Experience the intellectual rigor of professional chess combined with fluid, voice-first technology. Analyze,
            play, and learn hands-free.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/auth?mode=login">
              <Play size={14} aria-hidden="true" />
              Start Playing
            </Link>
            <Link className="secondary-button" to="/auth?mode=signup">
              <User size={15} aria-hidden="true" />
              Create Account
            </Link>
          </div>
        </div>

        <div className="hero-media">
          <img src={heroKnight} alt="Black knight chess piece on a dramatic chess board" />
          <div className="voice-bars" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>

      {/* Flagship Capabilities Section */}
      <section className="focus-section" id="features">
        <div className="section-title">
          <p className="mini-label">Flagship Capabilities</p>
          <h2>Engineered for Ultimate Focus</h2>
        </div>

        <div className="flagship-grid">
          {flagshipCapabilities.map(({ icon: Icon, title, description, accent, preview }) => (
            <article className={`flagship-card flagship-card--${accent}`} key={title}>
              <div className="feature-icon">
                <Icon size={20} aria-hidden="true" />
              </div>
              <div className="feature-copy">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              {preview}
            </article>
          ))}
        </div>
      </section>

      {/* Workflow Section ("How it Works") */}
      <section className="workflow-section" id="how-it-works">
        <div className="workflow-heading">
          <p className="mini-label">Sleek Interactions</p>
          <h2>Speak, validate, listen, continue</h2>
        </div>
        <div className="workflow-steps-horizontal">
          {workflowSteps.map(({ number, title, desc }) => (
            <article className="workflow-step-card" key={number}>
              <span className="step-num">{number}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Call to Action CTA section */}
      <section className="cta-section">
        <div className="cta-card">
          <h2>Ready to experience hands-free chess?</h2>
          <p>Join players training spatial awareness, play online, and get verbal analysis feedback.</p>
          <Link className="primary-button" to="/auth?mode=signup">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <Link className="logo" to="/" aria-label="AurisChess home">
          <img className="logo__graphic" src={logo} alt="" />
          <span className="logo__text">Auris<span>Chess</span></span>
        </Link>
        <div>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <Link to="/auth?mode=login">Sign In</Link>
        </div>
      </footer>
    </main>
  )
}

export default HomePage
