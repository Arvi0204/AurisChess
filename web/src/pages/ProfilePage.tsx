import { useEffect, useState, useRef } from 'react'
import { toast } from 'react-hot-toast'
import {
  Camera,
  Calendar,
  Loader2,
  ChevronRight,
  Award,
  Settings
} from 'lucide-react'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import PageHeader from '../components/dashboard/PageHeader'
import ProfileStatsTab from '../components/profile/ProfileStatsTab'
import ProfileSettingsTab from '../components/profile/ProfileSettingsTab'
import { supabase } from '../config/supabaseClient'
import { API_BASE } from '../config/api'

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
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password States
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Gameplay Settings States
  const [volume, setVolume] = useState<number>(0.5)

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

      const response = await fetch(`${API_BASE}/api/user/stats`, {
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
    setUpdatingProfile(true)

    try {
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('Unauthorized')

      const response = await fetch(`${API_BASE}/api/user/profile`, {
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

      toast.success('Username updated successfully!')
      fetchProfileData() // Reload profile info
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.')
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

    try {
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('Unauthorized')

      const response = await fetch(`${API_BASE}/api/user/profile`, {
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

      toast.success('Profile photo updated!')
      fetchProfileData() // Reload
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo.')
    } finally {
      setUpdatingProfile(false)
    }
  }

  // Handle Supabase Password Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setUpdatingPassword(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      toast.success('Password changed successfully!')
      newPassword && setNewPassword('')
      confirmPassword && setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password.')
    } finally {
      setUpdatingPassword(false)
    }
  }



  // --- Render Layout ---
  // Compute display username once per render (avoids IIFE in JSX)
  const displayUsername = stats?.user.username ?? (() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) return JSON.parse(stored).username || 'Player'
    } catch { /* ignore */ }
    return 'Player'
  })()

  return (
    <div className={`dashboard-shell${isCollapsed ? ' sidebar-collapsed' : ''}`}>
      <DashboardSidebar
        username={displayUsername}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <main className="dashboard-main">
        <PageHeader
          title={<>User <span>Profile</span></>}
          subtitle="Manage your account settings, credentials, and track your ELO rating stats"
        />

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
                  <ProfileStatsTab
                    stats={stats}
                    ratingType={ratingType}
                    setRatingType={setRatingType}
                  />
                ) : (
                  <ProfileSettingsTab
                    activeSettingsSubtab={activeSettingsSubtab}
                    setActiveSettingsSubtab={setActiveSettingsSubtab}
                    newUsername={newUsername}
                    setNewUsername={setNewUsername}
                    updatingProfile={updatingProfile}
                    handleUpdateProfile={handleUpdateProfile}
                    newPassword={newPassword}
                    setNewPassword={setNewPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    updatingPassword={updatingPassword}
                    handlePasswordChange={handlePasswordChange}
                    volume={volume}
                    handleVolumeChange={handleVolumeChange}
                  />
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
