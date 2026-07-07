import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../config/supabaseClient'
import { API_BASE } from '../config/api'

export interface User {
  id: string
  email: string
  username: string
  avatar_url: string
  rating_rapid?: number
  rating_blitz?: number
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  updateUser: (updates: Partial<User>) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Stable reference — syncWithPostgres is called from inside the auth
  // listener, so useCallback prevents it becoming a stale closure.
  const syncWithPostgres = useCallback(async (accessToken: string, defaultUser: User) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/stats`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch user stats')
      const resJson = await res.json()
      
      if (resJson?.data) {
        const dbUser = resJson.data.user
        
        let changed = false
        const userObj = { ...defaultUser }
        
        if (dbUser) {
          if (dbUser.username && dbUser.username !== userObj.username) {
            userObj.username = dbUser.username
            changed = true
          }
          if (dbUser.avatar_url && dbUser.avatar_url !== userObj.avatar_url) {
            userObj.avatar_url = dbUser.avatar_url
            changed = true
          }
          if (dbUser.rating_rapid !== undefined && dbUser.rating_rapid !== userObj.rating_rapid) {
            userObj.rating_rapid = dbUser.rating_rapid
            changed = true
          }
          if (dbUser.rating_blitz !== undefined && dbUser.rating_blitz !== userObj.rating_blitz) {
            userObj.rating_blitz = dbUser.rating_blitz
            changed = true
          }
        }
        
        if (changed) {
          setUser(userObj)
          localStorage.setItem('user', JSON.stringify(userObj))
          
          // Sync with Supabase metadata too.
          // Note: this triggers a USER_UPDATED auth event. The listener
          // guards against that event to avoid re-entering syncWithPostgres.
          await supabase.auth.updateUser({
            data: {
              username: userObj.username,
              avatar_url: userObj.avatar_url
            }
          })
        }
      }
    } catch (err) {
      console.warn('Could not sync user details with Postgres DB:', err)
    }
  }, [])

  useEffect(() => {
    // onAuthStateChange fires immediately with an INITIAL_SESSION event when
    // the subscription is registered, making a separate getInitialSession call
    // redundant. Using a single path here prevents duplicate /api/user/stats
    // requests on every page load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setToken(session.access_token)
        localStorage.setItem('authToken', session.access_token)

        let existingAvatar = ''
        let existingRatingRapid = 1200
        let existingRatingBlitz = 1200
        try {
          const stored = localStorage.getItem('user')
          if (stored) {
            const u = JSON.parse(stored)
            existingAvatar = u.avatar_url || ''
            existingRatingRapid = u.rating_rapid || 1200
            existingRatingBlitz = u.rating_blitz || 1200
          }
        } catch {
          // ignore corrupt storage
        }

        const newUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Player',
          avatar_url: session.user.user_metadata?.avatar_url || existingAvatar || '',
          rating_rapid: existingRatingRapid,
          rating_blitz: existingRatingBlitz,
        }

        setUser(newUser)
        localStorage.setItem('user', JSON.stringify(newUser))
        
        // Skip the Postgres sync when this event was fired by our own
        // syncWithPostgres calling supabase.auth.updateUser — that would
        // create an infinite loop (USER_UPDATED → sync → updateUser → USER_UPDATED…)
        if (event !== 'USER_UPDATED') {
          syncWithPostgres(session.access_token, newUser)
        }
      } else {
        setUser(null)
        setToken(null)
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
      }
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [syncWithPostgres])

  // useCallback with [user] dependency: keeps a stable reference while
  // always capturing the latest user object — avoids the stale-closure bug
  // that would overwrite the user with outdated data.
  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return
    const updatedUser = { ...user, ...updates }
    
    // Update local state & localStorage first so the UI is immediately
    // responsive, then persist to Supabase. Callers that await this function
    // will wait for the Supabase write to complete before continuing.
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))

    try {
      await supabase.auth.updateUser({
        data: {
          username: updatedUser.username,
          avatar_url: updatedUser.avatar_url
        }
      })
    } catch (err) {
      console.error('Failed to update user metadata in Supabase:', err)
    }
  }, [user])

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error during signOut:', err)
    } finally {
      setUser(null)
      setToken(null)
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
    }
  }, [])

  // Memoised value object prevents all consumers from re-rendering on
  // unrelated provider state changes.
  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    updateUser,
    logout,
  }), [user, token, isLoading, updateUser, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
