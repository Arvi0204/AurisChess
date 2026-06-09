import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logo from '../assets/aurischess-logo.png'

const API_BASE = `${import.meta.env.VITE_API_URL}/api/auth`

const AuthPanel = () => {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const isSignup = mode === 'signup'
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup redirect timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
    }
  }, [])

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Feedback state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const resetFeedback = () => {
    setError(null)
    setSuccess(null)
  }

  const handleModeSwitch = (newMode: 'login' | 'signup') => {
    setMode(newMode)
    resetFeedback()
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    resetFeedback()
    setLoading(true)

    const endpoint = isSignup ? '/signup' : '/login'
    const body = isSignup
      ? { username: name, email, password }
      : { email, password }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Something went wrong.')
        return
      }

      // Store the JWT token
      localStorage.setItem('authToken', data.data.token)
      localStorage.setItem('user', JSON.stringify(data.data.user))

      setSuccess(
        isSignup
          ? `Welcome, ${data.data.user.username}! Account created.`
          : `Welcome back, ${data.data.user.username}!`
      )

      // Redirect to home after a short delay
      redirectTimer.current = setTimeout(() => {
        navigate('/dashboard')
      }, 1200)
    } catch (err) {
      console.error('Auth error:', err)
      setError('Could not connect to the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-card-mark" aria-hidden="true">
        <img src={logo} alt="" />
      </div>

      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          className={!isSignup ? 'active' : undefined}
          onClick={() => handleModeSwitch('login')}
          aria-selected={!isSignup}
        >
          Log in
        </button>
        <button
          type="button"
          className={isSignup ? 'active' : undefined}
          onClick={() => handleModeSwitch('signup')}
          aria-selected={isSignup}
        >
          Sign up
        </button>
      </div>

      <div className="auth-heading">
        <p className="mini-label">{isSignup ? 'Create your account' : 'Welcome back'}</p>
        <h2 id="auth-title">{isSignup ? 'Join AurisChess' : 'Sign in to AurisChess'}</h2>
        <p>
          {isSignup
            ? 'Create a profile for games, analysis, and training history.'
            : 'Continue to your games, drills, and analysis workspace.'}
        </p>
      </div>

      <button className="google-button" type="button">
        <span aria-hidden="true">G</span>
        Continue with Google
      </button>

      <div className="auth-divider">
        <span>or use email</span>
      </div>

      {/* Error / Success banners */}
      {error && <div className="auth-banner auth-banner--error">{error}</div>}
      {success && <div className="auth-banner auth-banner--success">{success}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        {isSignup && (
          <label>
            <span>Name</span>
            <div className="input-shell">
              <User size={17} aria-hidden="true" />
              <input
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Auris Player"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </label>
        )}

        <label>
          <span>Email</span>
          <div className="input-shell">
            <Mail size={17} aria-hidden="true" />
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </label>

        <label>
          <span>Password</span>
          <div className="input-shell">
            <Lock size={17} aria-hidden="true" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        {!isSignup && (
          <div className="form-row">
            <label className="check-label">
              <input type="checkbox" name="remember" />
              Remember me
            </label>
            <Link to="/auth">Forgot password?</Link>
          </div>
        )}

        <button className="primary-button auth-submit" type="submit" disabled={loading}>
          {loading
            ? 'Please wait…'
            : isSignup
              ? 'Create Account'
              : 'Log In'}
        </button>
      </form>

      <p className="auth-switch">
        {isSignup ? 'Already have an account?' : 'New to AurisChess?'}
        <button type="button" onClick={() => handleModeSwitch(isSignup ? 'login' : 'signup')}>
          {isSignup ? 'Log in' : 'Create one'}
        </button>
      </p>
    </div>
  )
}

export default AuthPanel
