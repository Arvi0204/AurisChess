import {
  BarChart3,
  Bot,
  Brain,
  ChevronRight,
  Code2,
  EyeOff,
  Mic,
  Play,
  ShieldCheck,
  Sparkles,
  User,
  Volume2,
  Wifi,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import heroKnight from '../assets/aurischess-hero-knight.png'
import logo from '../assets/aurischess-logo.svg'
import voiceBoard from '../assets/aurischess-voice-board.png'
import performanceChart from '../assets/performance-chart.svg'
import SiteHeader from '../components/SiteHeader'

const focusCards = [
  {
    className: 'feature-card voice-card',
    icon: Mic,
    title: 'Voice-First Gameplay',
    body: 'Speak your moves naturally. Our engine understands standard algebraic notation, descriptive notation, and natural language variations.',
    content: (
      <div className="notation-row" aria-label="Voice move conversion example">
        <code>"Knight to F3"</code>
        <ChevronRight size={14} aria-hidden="true" />
        <code className="accent-code">Nf3</code>
      </div>
    ),
  },
  {
    className: 'feature-card blindfold-card',
    icon: EyeOff,
    title: 'Blindfold Training',
    body: 'Enhance your spatial awareness. Hide the board and rely on voice prompts to visualize tactical positions in your mind.',
    content: (
      <div className="blindfold-preview" aria-hidden="true">
        <button type="button" aria-label="Start blindfold voice prompt">
          <Mic size={16} />
        </button>
      </div>
    ),
  },
  {
    className: 'feature-card analysis-card',
    icon: BarChart3,
    title: 'Vocal Analysis',
    body: 'Ask the engine questions naturally and receive instant articulated feedback without leaving the flow of play.',
    content: (
      <div className="chat-preview" aria-label="Vocal analysis example">
        <span className="chat-bubble question">Why is Bg5 a mistake?</span>
        <span className="chat-bubble answer">It hangs the pawn on e4 to Nxe4.</span>
      </div>
    ),
  },
  {
    className: 'feature-card insights-card',
    icon: Sparkles,
    title: 'Performance Insights',
    body: 'Track verbal accuracy and tactical vision over time with focused analytics for serious improvement.',
    content: (
      <div className="chart-preview" aria-hidden="true">
        <img src={performanceChart} alt="Rising performance chart" />
      </div>
    ),
  },
]

const supportFeatures = [
  { icon: Bot, title: 'AI Gameplay', body: 'Adaptive practice games with immediate move validation.' },
  { icon: Wifi, title: 'Online Multiplayer', body: 'Voice-led play against real opponents in familiar chess flows.' },
  { icon: Volume2, title: 'Audio Narration', body: 'Hear board state, checks, captures, and key threats clearly.' },
  { icon: ShieldCheck, title: 'Accessibility Focus', body: 'Alternative interaction patterns built into the core product.' },
]

const steps = ['Speak a move', 'AurisChess validates it', 'Hear narration and continue']

const benefits = [
  'Visualization improvement',
  'Cognitive training',
  'Memory enhancement',
  'Alternative interaction design',
]

const HomePage = () => {
  return (
    <main className="page-shell">
      <SiteHeader />

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
            play, and learn without lifting a finger.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#ai">
              <Play size={14} aria-hidden="true" />
              Start Playing
            </a>
            <Link className="secondary-button" to="/auth">
              <User size={15} aria-hidden="true" />
              Create Account
            </Link>
            <a className="secondary-button" href="#learn">
              <Brain size={15} aria-hidden="true" />
              Explore Training
            </a>
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

      <section className="focus-section" id="features">
        <div className="section-title">
          <h2>Engineered for Focus</h2>
        </div>

        <div className="bento-grid">
          {focusCards.map(({ className, icon: Icon, title, body, content }) => (
            <article className={className} key={title}>
              <div className="feature-icon">
                <Icon size={18} aria-hidden="true" />
              </div>
              <div className="feature-copy">
                <h3>{title}</h3>
                <p>{body}</p>
                {content}
              </div>
              {title === 'Voice-First Gameplay' && (
                <div className="voice-board-visual">
                  <img src={voiceBoard} alt="Voice waveform rising over a chess board" />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="support-section" id="ai">
        <div className="support-heading">
          <p className="mini-label">Play modes and accessibility</p>
          <h2>Everything feels built for chess, not bolted on</h2>
        </div>
        <div className="support-grid">
          {supportFeatures.map(({ icon: Icon, title, body }) => (
            <article className="support-card" key={title} id={title === 'Online Multiplayer' ? 'multiplayer' : undefined}>
              <Icon size={20} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section" id="learn">
        <div>
          <p className="mini-label">How it works</p>
          <h2>Speak, validate, listen, continue</h2>
        </div>
        <div className="workflow-steps">
          {steps.map((step, index) => (
            <article key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="benefits-section">
        <div>
          <p className="mini-label">Training benefits</p>
          <h2>Build the board in your mind</h2>
        </div>
        <div className="benefits-list">
          {benefits.map((benefit) => (
            <span key={benefit}>{benefit}</span>
          ))}
        </div>
      </section>

      <footer className="footer">
        <Link className="logo-link" to="/" aria-label="AurisChess home">
          <img className="logo-graphic" src={logo} alt="" />
          <span className="logo-text">Auris<span>Chess</span></span>
        </Link>
        <div>
          <a href="#features">Features</a>
          <a href="#learn">Demo</a>
          <a href="https://github.com/" aria-label="GitHub placeholder">
            <Code2 size={16} aria-hidden="true" />
            GitHub
          </a>
          <a href="#top">
            <Code2 size={16} aria-hidden="true" />
            Prototype
          </a>
        </div>
      </footer>
    </main>
  )
}

export default HomePage
