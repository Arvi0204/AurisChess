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
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'

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

  // Auth and Settings Contexts
  const { user, token, updateUser } = useAuth()
  const { volume, setVolume, promotionSetting, setPromotionSetting } = useSettings()

  // Load user data and settings
  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!token) return

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

      if (resJson.data?.user) {
        updateUser({
          username: resJson.data.user.username,
          avatar_url: resJson.data.user.avatar_url
        })
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
    setVolume(parseFloat(e.target.value))
  }

  // Handle Gameplay Promotion Setting Change
  const handlePromotionSettingChange = (val: 'auto-queen' | 'selective') => {
    setPromotionSetting(val)
  }

  // Handle Username Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingProfile(true)

    try {
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

      // Update auth context immediately (handles Supabase + localStorage update)
      await updateUser({ username: updatedUsername })

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

      // Update auth context immediately (handles Supabase + localStorage update)
      await updateUser({ avatar_url: updatedAvatarUrl })

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



  const displayUsername = stats?.user.username || user?.username || 'Player'

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
                    promotionSetting={promotionSetting}
                    handlePromotionSettingChange={handlePromotionSettingChange}
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
