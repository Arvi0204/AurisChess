import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import SiteHeader from '../components/SiteHeader'
import logo from '../assets/aurischess-logo.svg'
import { supabase } from '../config/supabaseClient'

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Password updated successfully! Please log in with your new password.')
      navigate('/auth')
    } catch (err: any) {
      console.error('Password reset error:', err)
      toast.error(err.message || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell">
      <SiteHeader variant="auth" />

      <section className="auth-page">
        <div className="auth-panel" aria-labelledby="reset-title">
          <div className="auth-card-mark" aria-hidden="true">
            <Link className="logo" to="/" aria-label="AurisChess home">
              <img className="logo__graphic" src={logo} alt="" />
              <span className="logo__text">Auris<span>Chess</span></span>
            </Link>
          </div>

          <div className="auth-heading">
            <p className="mini-label">Security & Recovery</p>
            <h2 id="reset-title">
              Set New <span>Password</span>
            </h2>
            <p>
              Please enter your new password below.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>New Password</span>
              <div className="input-shell">
                <Lock size={17} aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Enter new password"
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

            <label>
              <span>Confirm New Password</span>
              <div className="input-shell">
                <Lock size={17} aria-hidden="true" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <button className="primary-button auth-submit" type="submit" disabled={loading}>
              {loading ? 'Updating password…' : 'Update Password'}
            </button>
          </form>

          <p className="auth-switch">
            Remembered your password?
            <button type="button" onClick={() => navigate('/auth')}>
              Back to log in
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}

export default ResetPasswordPage
