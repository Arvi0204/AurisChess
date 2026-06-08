import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { useState } from 'react'
import logo from '../assets/aurischess-logo.png'

const AuthPanel = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const isSignup = mode === 'signup'

  return (
    <div className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-card-mark" aria-hidden="true">
        <img src={logo} alt="" />
      </div>

      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          className={!isSignup ? 'active' : undefined}
          onClick={() => setMode('login')}
          aria-selected={!isSignup}
        >
          Log in
        </button>
        <button
          type="button"
          className={isSignup ? 'active' : undefined}
          onClick={() => setMode('signup')}
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

      <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
        {isSignup && (
          <label>
            <span>Name</span>
            <div className="input-shell">
              <User size={17} aria-hidden="true" />
              <input type="text" name="name" autoComplete="name" placeholder="Auris Player" />
            </div>
          </label>
        )}

        <label>
          <span>Email</span>
          <div className="input-shell">
            <Mail size={17} aria-hidden="true" />
            <input type="email" name="email" autoComplete="email" placeholder="you@example.com" />
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
            <a href="/auth">Forgot password?</a>
          </div>
        )}

        <button className="primary-button auth-submit" type="submit">
          {isSignup ? 'Create Account' : 'Log In'}
        </button>
      </form>

      <p className="auth-switch">
        {isSignup ? 'Already have an account?' : 'New to AurisChess?'}
        <button type="button" onClick={() => setMode(isSignup ? 'login' : 'signup')}>
          {isSignup ? 'Log in' : 'Create one'}
        </button>
      </p>
    </div>
  )
}

export default AuthPanel
