import React from 'react'
import { User, Lock, Volume2, Loader2 } from 'lucide-react'

type ProfileSettingsTabProps = {
  activeSettingsSubtab: 'user' | 'gameplay'
  setActiveSettingsSubtab: (subtab: 'user' | 'gameplay') => void

  // Username form props
  newUsername: string
  setNewUsername: (name: string) => void
  updatingProfile: boolean
  handleUpdateProfile: (e: React.FormEvent) => void

  // Password form props
  newPassword: string
  setNewPassword: (pw: string) => void
  confirmPassword: string
  setConfirmPassword: (pw: string) => void
  updatingPassword: boolean
  handlePasswordChange: (e: React.FormEvent) => void

  // Volume control props
  volume: number
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void

  // Promotion setting props
  promotionSetting: 'auto-queen' | 'selective'
  handlePromotionSettingChange: (val: 'auto-queen' | 'selective') => void
}

const ProfileSettingsTab = ({
  activeSettingsSubtab,
  setActiveSettingsSubtab,
  newUsername,
  setNewUsername,
  updatingProfile,
  handleUpdateProfile,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  updatingPassword,
  handlePasswordChange,
  volume,
  handleVolumeChange,
  promotionSetting,
  handlePromotionSettingChange
}: ProfileSettingsTabProps) => {
  return (
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

          <div className="settings-form-card glass-panel">
            <h3>Pawn Promotion Preference</h3>
            <p className="sub-description">
              Choose how your pawns promote when reaching the back rank.
            </p>

            <div className="settings-promotion-control">
              <label className="settings-radio-label">
                <input
                  type="radio"
                  name="promotionSetting"
                  value="auto-queen"
                  checked={promotionSetting === 'auto-queen'}
                  onChange={() => handlePromotionSettingChange('auto-queen')}
                />
                <span>Auto-Queen (Default)</span>
              </label>
              <label className="settings-radio-label">
                <input
                  type="radio"
                  name="promotionSetting"
                  value="selective"
                  checked={promotionSetting === 'selective'}
                  onChange={() => handlePromotionSettingChange('selective')}
                />
                <span>Selective (Choose piece on promotion)</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileSettingsTab
