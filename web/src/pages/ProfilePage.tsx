import { useEffect, useState, useRef } from 'react'
import {
  User,
  Settings,
  Lock,
  Volume2,
  Camera,
  Award,
  Activity,
  Calendar,
  Loader2,
  ChevronRight
} from 'lucide-react'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import { supabase } from '../config/supabaseClient'

type HistoryPoint = {
  rating: number
  change: number
  date: string
}

type UserStats = {
  user: {
    id: number
    username: string
    email: string
    rating_rapid: number
    rating_blitz: number
    avatar_url: string | null
    created_at: string
  }
  rapidHistory: HistoryPoint[]
  blitzHistory: HistoryPoint[]
  stats: {
    wins: number
    losses: number
    draws: number
  }
}

const ProfilePage = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile')
  const [activeSettingsSubtab, setActiveSettingsSubtab] = useState<'user' | 'gameplay'>('user')
  const [ratingType, setRatingType] = useState<'rapid' | 'blitz'>('rapid')

  // Data states
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit Profile States
  const [newUsername, setNewUsername] = useState('')
  const [updateMsg, setUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password States
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Gameplay Settings States
  const [volume, setVolume] = useState<number>(0.5)

  // Chart hover state
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number
    x: number
    y: number
    point: HistoryPoint
  } | null>(null)

  // Load user data and settings
  useEffect(() => {
    fetchProfileData()

    // Initialize gameplay settings from localStorage
    try {
      const storedVolume = localStorage.getItem('chessVolume')
      if (storedVolume !== null) {
        setVolume(parseFloat(storedVolume))
      }
    } catch (e) {
      console.warn('Failed to load volume setting', e)
    }
  }, [])

  const fetchProfileData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('No authentication token found.')

      const response = await fetch('http://localhost:3000/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.message || 'Failed to fetch user stats.')
      }

      const resJson = await response.json()
      setStats(resJson.data)
      setNewUsername(resJson.data.user.username)

      // Sync avatar back into localStorage if updated
      const stored = localStorage.getItem('user')
      if (stored && resJson.data.user) {
        const user = JSON.parse(stored)
        user.avatar_url = resJson.data.user.avatar_url
        user.username = resJson.data.user.username
        localStorage.setItem('user', JSON.stringify(user))
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err)
      setError(err.message || 'Could not connect to the backend server.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Gameplay Volume Change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value)
    setVolume(newVol)
    try {
      localStorage.setItem('chessVolume', newVol.toString())
    } catch {
      // ignore
    }
  }

  // Handle Username Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdateMsg(null)
    setUpdatingProfile(true)

    try {
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('Unauthorized')

      const response = await fetch('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername })
      })

      const resData = await response.json()

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to update username.')
      }

      const updatedUsername = resData.data?.user?.username || newUsername

      // Sync with Supabase Auth metadata so the session JWT has the new username
      const { error: supabaseError } = await supabase.auth.updateUser({
        data: { username: updatedUsername }
      })
      if (supabaseError) {
        console.error('Failed to sync username to Supabase Auth:', supabaseError)
      }

      // Update localStorage immediately so UI stays in sync
      const stored = localStorage.getItem('user')
      if (stored) {
        const user = JSON.parse(stored)
        user.username = updatedUsername
        localStorage.setItem('user', JSON.stringify(user))
      }

      setUpdateMsg({ type: 'success', text: 'Username updated successfully!' })
      fetchProfileData() // Reload profile info
    } catch (err: any) {
      setUpdateMsg({ type: 'error', text: err.message || 'An error occurred.' })
    } finally {
      setUpdatingProfile(false)
    }
  }

  // Browser-side Image Compression & Avatar Upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // We draw to a canvas to scale down and compress the image to JPEG Base64
        const canvas = document.createElement('canvas')
        const MAX_SIZE = 150
        let width = img.width
        let height = img.height

        // Square crop / scale math
        if (width > height) {
          width = Math.round((width * MAX_SIZE) / height)
          height = MAX_SIZE
        } else {
          height = Math.round((height * MAX_SIZE) / width)
          width = MAX_SIZE
        }

        canvas.width = MAX_SIZE
        canvas.height = MAX_SIZE

        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Center crop
          const offsetX = (MAX_SIZE - width) / 2
          const offsetY = (MAX_SIZE - height) / 2
          ctx.drawImage(img, offsetX, offsetY, width, height)

          // Compress image to JPEG format with 0.8 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
          uploadAvatar(compressedBase64)
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async (base64DataUrl: string) => {
    setUpdatingProfile(true)
    setUpdateMsg(null)

    try {
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('Unauthorized')

      const response = await fetch('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar_url: base64DataUrl })
      })

      const resData = await response.json()

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to upload photo.')
      }

      const updatedAvatarUrl = resData.data?.user?.avatar_url || base64DataUrl

      // Sync with Supabase Auth metadata
      const { error: supabaseError } = await supabase.auth.updateUser({
        data: { avatar_url: updatedAvatarUrl }
      })
      if (supabaseError) {
        console.error('Failed to sync avatar to Supabase Auth:', supabaseError)
      }

      // Update localStorage immediately so UI stays in sync
      const stored = localStorage.getItem('user')
      if (stored) {
        const user = JSON.parse(stored)
        user.avatar_url = updatedAvatarUrl
        localStorage.setItem('user', JSON.stringify(user))
      }

      setUpdateMsg({ type: 'success', text: 'Profile photo updated!' })
      fetchProfileData() // Reload
    } catch (err: any) {
      setUpdateMsg({ type: 'error', text: err.message || 'Failed to upload photo.' })
    } finally {
      setUpdatingProfile(false)
    }
  }

  // Handle Supabase Password Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setUpdatingPassword(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      setPasswordMsg({ type: 'success', text: 'Password changed successfully in Supabase Auth!' })
      newPassword && setNewPassword('')
      confirmPassword && setConfirmPassword('')
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password.' })
    } finally {
      setUpdatingPassword(false)
    }
  }

  // --- Render custom interactive ELO progression SVG Chart ---
  const renderEloChart = () => {
    if (!stats) return null
    const history = ratingType === 'rapid' ? stats.rapidHistory : stats.blitzHistory

    if (!history || history.length === 0) {
      return (
        <div className="chart-empty">
          <Activity size={24} />
          <p>No rating changes recorded yet.</p>
        </div>
      )
    }

    // Chart Dimensions
    const width = 640
    const height = 280
    const paddingLeft = 50
    const paddingBottom = 40
    const paddingTop = 20
    const paddingRight = 20

    const graphWidth = width - paddingLeft - paddingRight
    const graphHeight = height - paddingTop - paddingBottom

    // Find min/max values
    const ratings = history.map((h) => h.rating)
    let minVal = Math.min(...ratings)
    let maxVal = Math.max(...ratings)

    // Cushion the boundaries
    if (minVal === maxVal) {
      minVal -= 50
      maxVal += 50
    } else {
      const range = maxVal - minVal
      minVal = Math.max(0, Math.floor(minVal - range * 0.15))
      maxVal = Math.ceil(maxVal + range * 0.15)
    }

    // Coordinates mapping helper
    const getCoords = (index: number, rating: number) => {
      const count = history.length
      const x = paddingLeft + (index / Math.max(1, count - 1)) * graphWidth
      const y = height - paddingBottom - ((rating - minVal) / (maxVal - minVal)) * graphHeight
      return { x, y }
    }

    // Generate path code
    let pathD = ''
    const points: { x: number; y: number; point: HistoryPoint; idx: number }[] = []

    history.forEach((h, i) => {
      const { x, y } = getCoords(i, h.rating)
      points.push({ x, y, point: h, idx: i })
      if (i === 0) {
        pathD += `M ${x} ${y}`
      } else {
        pathD += ` L ${x} ${y}`
      }
    })

    // Construct Area Path (for gradient fill under the line)
    let areaD = ''
    if (points.length > 0) {
      const first = points[0]
      const last = points[points.length - 1]
      const bottomY = height - paddingBottom
      areaD = `${pathD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`
    }

    // Gridlines (4 horizontal helper lines)
    const gridCount = 4
    const gridRatings: number[] = []
    for (let i = 0; i <= gridCount; i++) {
      gridRatings.push(Math.round(minVal + (i / gridCount) * (maxVal - minVal)))
    }

    return (
      <div className="svg-chart-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="100%"
          className="svg-rating-chart"
        >
          <defs>
            {/* Smooth glowing line gradient */}
            <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ratingType === 'rapid' ? 'var(--cyan)' : 'var(--amber)'} />
              <stop offset="100%" stopColor={ratingType === 'rapid' ? 'var(--accent-cyan)' : 'var(--accent-amber)'} />
            </linearGradient>
            {/* Area under line fill gradient */}
            <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={ratingType === 'rapid' ? 'var(--cyan)' : 'var(--amber)'}
                stopOpacity="0.15"
              />
              <stop
                offset="100%"
                stopColor={ratingType === 'rapid' ? 'var(--cyan)' : 'var(--amber)'}
                stopOpacity="0.0"
              />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {gridRatings.map((ratingVal) => {
            const y = height - paddingBottom - ((ratingVal - minVal) / (maxVal - minVal)) * graphHeight
            return (
              <g key={ratingVal} className="chart-grid-group">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  className="chart-grid-line"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  className="chart-axis-text chart-y-axis-text"
                  textAnchor="end"
                >
                  {ratingVal}
                </text>
              </g>
            )
          })}

          {/* X-axis labels (shows dates for first, middle, and last data points) */}
          {points.length > 0 &&
            [0, Math.floor(points.length / 2), points.length - 1].map((ptIndex) => {
              if (ptIndex >= points.length) return null
              const pt = points[ptIndex]
              const dateStr = new Date(pt.point.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
              })
              return (
                <text
                  key={ptIndex}
                  x={pt.x}
                  y={height - paddingBottom + 20}
                  className="chart-axis-text chart-x-axis-text"
                  textAnchor="middle"
                >
                  {dateStr}
                </text>
              )
            })}

          {/* Shaded Area Under Line */}
          {areaD && <path d={areaD} fill="url(#area-gradient)" className="chart-area" />}

          {/* Line Path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#line-gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              className="chart-line-path"
            />
          )}

          {/* Nodes & Interactive Targets */}
          {points.map((pt, i) => (
            <g
              key={i}
              className={`chart-node-group${hoveredPoint?.index === i ? ' chart-node-group--hovered' : ''}`}
              onMouseEnter={() =>
                setHoveredPoint({
                  index: i,
                  x: pt.x,
                  y: pt.y,
                  point: pt.point
                })
              }
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Inner visible circle */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill={ratingType === 'rapid' ? 'var(--cyan)' : 'var(--amber)'}
                className="chart-node"
              />
              {/* Hover effect halo ring */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="10"
                fill={ratingType === 'rapid' ? 'var(--cyan)' : 'var(--amber)'}
                fillOpacity="0.25"
                className="chart-node-halo"
              />
              {/* Giant invisible trigger circle for easy hovering */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="24"
                fill="transparent"
                style={{ cursor: 'pointer' }}
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Popup */}
        {hoveredPoint && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 10}%`
            }}
          >
            <div className="tooltip-date">
              {new Date(hoveredPoint.point.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div className="tooltip-rating">
              Rating: <strong>{hoveredPoint.point.rating}</strong>
            </div>
            {hoveredPoint.point.change !== 0 && (
              <div
                className={`tooltip-change ${
                  hoveredPoint.point.change > 0 ? 'change-positive' : 'change-negative'
                }`}
              >
                {hoveredPoint.point.change > 0 ? '+' : ''}
                {hoveredPoint.point.change} Elo
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // --- Render Layout ---
  return (
    <div className={`dashboard-shell${isCollapsed ? ' sidebar-collapsed' : ''}`}>
      <DashboardSidebar
        username={stats?.user.username || 'Player'}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <main className="dashboard-main">
        {/* Profile Header */}
        <header className="dashboard-header profile-header">
          <div className="dashboard-greeting">
            <h1>
              User <span>Profile</span>
            </h1>
            <p>Manage your account settings, credentials, and track your ELO rating stats</p>
          </div>
        </header>

        {loading ? (
          <div className="profile-loading-panel">
            <Loader2 className="animate-spin" size={32} />
            <p>Loading your profile details...</p>
          </div>
        ) : error ? (
          <div className="profile-error-panel">
            <h4>Failed to Load Profile</h4>
            <p>{error}</p>
            <button className="primary-button" onClick={fetchProfileData}>
              Try Again
            </button>
          </div>
        ) : (
          stats && (
            <div className="profile-dashboard-grid">
              {/* Left Column: Avatar & Page Tabs Navigation */}
              <aside className="profile-nav-sidebar">
                <div className="profile-nav-card glass-panel">
                  {/* Photo Section */}
                  <div className="profile-avatar-upload-container">
                    <div className="profile-avatar-large">
                      {stats.user.avatar_url ? (
                        <img src={stats.user.avatar_url} alt="" className="avatar-img-large" />
                      ) : (
                        <span className="avatar-initial-large">
                          {stats.user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {updatingProfile && (
                        <div className="profile-avatar-overlay-loading">
                          <Loader2 className="animate-spin" size={24} />
                          <span>Saving...</span>
                        </div>
                      )}
                    </div>
                    <button
                      className="avatar-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Upload profile picture"
                      title="Upload profile picture"
                      disabled={updatingProfile}
                    >
                      <Camera size={16} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                  </div>

                  <div className="profile-nav-identity">
                    <h3>{stats.user.username}</h3>
                    <p className="profile-nav-email">{stats.user.email}</p>
                  </div>

                  <hr className="profile-divider" />

                  {/* Tabs List */}
                  <nav className="profile-tabs-nav">
                    <button
                      className={`profile-tab-item ${activeTab === 'profile' ? 'profile-tab-item--active' : ''}`}
                      onClick={() => setActiveTab('profile')}
                    >
                      <Award size={18} />
                      <span>Stats & Progression</span>
                      <ChevronRight size={14} className="arrow-icon" />
                    </button>
                    <button
                      className={`profile-tab-item ${activeTab === 'settings' ? 'profile-tab-item--active' : ''}`}
                      onClick={() => setActiveTab('settings')}
                    >
                      <Settings size={18} />
                      <span>Account Settings</span>
                      <ChevronRight size={14} className="arrow-icon" />
                    </button>
                  </nav>

                  <div className="profile-meta-info">
                    <div className="meta-info-row">
                      <Calendar size={14} />
                      <span>
                        Joined:{' '}
                        {new Date(stats.user.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Right Column: Tab Contents */}
              <section className="profile-content-area">
                {activeTab === 'profile' ? (
                  /* TAB 1: PROFILE & RATING STATS */
                  <div className="profile-stats-tab animate-fade-in">
                    {/* ELO Summary Cards Grid */}
                    <div className="profile-stats-cards">
                      <div className="stat-card glass-panel stat-card--cyan">
                        <div className="stat-card-header">
                          <span className="stat-card-label">Rapid Rating</span>
                          <div className="stat-card-icon">
                            <Award size={20} />
                          </div>
                        </div>
                        <div className="stat-card-value">{stats.user.rating_rapid}</div>
                        <span className="stat-card-footer">K-Factor: 32</span>
                      </div>

                      <div className="stat-card glass-panel stat-card--amber">
                        <div className="stat-card-header">
                          <span className="stat-card-label">Blitz Rating</span>
                          <div className="stat-card-icon">
                            <Award size={20} />
                          </div>
                        </div>
                        <div className="stat-card-value">{stats.user.rating_blitz}</div>
                        <span className="stat-card-footer">K-Factor: 32</span>
                      </div>

                      <div className="stat-card glass-panel stat-card--purple">
                        <div className="stat-card-header">
                          <span className="stat-card-label">Record (W / L / D)</span>
                          <div className="stat-card-icon">
                            <Activity size={20} />
                          </div>
                        </div>
                        <div className="stat-card-value">
                          {stats.stats.wins} - {stats.stats.losses} - {stats.stats.draws}
                        </div>
                        <span className="stat-card-footer">
                          Win rate:{' '}
                          {stats.stats.wins + stats.stats.losses + stats.stats.draws > 0
                            ? Math.round(
                                (stats.stats.wins /
                                  (stats.stats.wins + stats.stats.losses + stats.stats.draws)) *
                                  100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                    </div>

                    {/* Progression Chart Card */}
                    <div className="chart-card glass-panel">
                      <div className="chart-card-header">
                        <div className="chart-card-title">
                          <h3>Rating Progression</h3>
                          <p>Monitor your performance rating over your recent games</p>
                        </div>
                        <div className="chart-toggle-buttons">
                          <button
                            className={`chart-toggle-btn ${
                              ratingType === 'rapid' ? 'chart-toggle-btn--active chart-toggle-btn--rapid' : ''
                            }`}
                            onClick={() => {
                              setRatingType('rapid')
                              setHoveredPoint(null)
                            }}
                          >
                            Rapid
                          </button>
                          <button
                            className={`chart-toggle-btn ${
                              ratingType === 'blitz' ? 'chart-toggle-btn--active chart-toggle-btn--blitz' : ''
                            }`}
                            onClick={() => {
                              setRatingType('blitz')
                              setHoveredPoint(null)
                            }}
                          >
                            Blitz
                          </button>
                        </div>
                      </div>

                      <div className="chart-card-body">{renderEloChart()}</div>
                    </div>
                  </div>
                ) : (
                  /* TAB 2: SETTINGS SECTION */
                  <div className="profile-settings-tab animate-fade-in">
                    <div className="settings-nav-row">
                      <button
                        className={`settings-subtab-btn ${
                          activeSettingsSubtab === 'user' ? 'settings-subtab-btn--active' : ''
                        }`}
                        onClick={() => setActiveSettingsSubtab('user')}
                      >
                        <User size={16} />
                        <span>User Settings</span>
                      </button>
                      <button
                        className={`settings-subtab-btn ${
                          activeSettingsSubtab === 'gameplay' ? 'settings-subtab-btn--active' : ''
                        }`}
                        onClick={() => setActiveSettingsSubtab('gameplay')}
                      >
                        <Volume2 size={16} />
                        <span>Gameplay Settings</span>
                      </button>
                    </div>

                    {activeSettingsSubtab === 'user' ? (
                      /* USER ACCOUNT SUB-SETTINGS */
                      <div className="settings-form-panel">
                        {/* Update Username */}
                        <div className="settings-form-card glass-panel">
                          <h3>Edit Account Profile</h3>
                          <p className="sub-description">Change your username displayed in lobbies and dashboards.</p>

                          {updateMsg && (
                            <div
                              className={`auth-banner auth-banner--${
                                updateMsg.type === 'success' ? 'success' : 'error'
                              }`}
                            >
                              {updateMsg.text}
                            </div>
                          )}

                          <form onSubmit={handleUpdateProfile} className="settings-form">
                            <label>
                              <span>Display Username</span>
                              <div className="input-shell">
                                <User size={17} />
                                <input
                                  type="text"
                                  placeholder="New Username"
                                  value={newUsername}
                                  onChange={(e) => setNewUsername(e.target.value)}
                                  required
                                  minLength={3}
                                />
                              </div>
                            </label>
                            <button
                              type="submit"
                              className="primary-button settings-submit"
                              disabled={updatingProfile}
                            >
                              {updatingProfile ? (
                                <Loader2 className="animate-spin" size={16} />
                              ) : (
                                'Save Username'
                              )}
                            </button>
                          </form>
                        </div>

                        {/* Change Password */}
                        <div className="settings-form-card glass-panel">
                          <h3>Change Password</h3>
                          <p className="sub-description">
                            Update your credentials. Authenticated securely via Supabase Auth.
                          </p>

                          {passwordMsg && (
                            <div
                              className={`auth-banner auth-banner--${
                                passwordMsg.type === 'success' ? 'success' : 'error'
                              }`}
                            >
                              {passwordMsg.text}
                            </div>
                          )}

                          <form onSubmit={handlePasswordChange} className="settings-form">
                            <label>
                              <span>New Password</span>
                              <div className="input-shell">
                                <Lock size={17} />
                                <input
                                  type="password"
                                  placeholder="Enter new password"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  required
                                  minLength={6}
                                />
                              </div>
                            </label>

                            <label>
                              <span>Confirm New Password</span>
                              <div className="input-shell">
                                <Lock size={17} />
                                <input
                                  type="password"
                                  placeholder="Confirm new password"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  required
                                  minLength={6}
                                />
                              </div>
                            </label>

                            <button
                              type="submit"
                              className="primary-button settings-submit"
                              disabled={updatingPassword}
                            >
                              {updatingPassword ? (
                                <Loader2 className="animate-spin" size={16} />
                              ) : (
                                'Change Password'
                              )}
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : (
                      /* GAMEPLAY SUB-SETTINGS */
                      <div className="settings-form-panel">
                        <div className="settings-form-card glass-panel">
                          <h3>Sound Settings</h3>
                          <p className="sub-description">
                            Adjust game interface and piece move acoustics (e.g. captures, checks, resigns).
                          </p>

                          <div className="settings-volume-control">
                            <div className="volume-control-header">
                              <Volume2 size={20} className="volume-icon" />
                              <span className="volume-label">Board Volume</span>
                              <span className="volume-percentage">{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={volume}
                              onChange={handleVolumeChange}
                              className="volume-slider"
                              aria-label="Settings board volume slider"
                            />
                            <p className="volume-explanation">
                              This volume applies to all move cues, checks, captures, and chess game notifications.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )
        )}
      </main>
    </div>
  )
}

export default ProfilePage
