import React, { createContext, useContext, useState, useEffect } from 'react'
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

  // Function to sync user stats with Postgres DB
  const syncWithPostgres = async (accessToken: string, defaultUser: User) => {
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
          
          // Sync with Supabase metadata too
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
  }

  useEffect(() => {
    // 1. Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
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
            // ignore
          }

          const initialUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Player',
            avatar_url: session.user.user_metadata?.avatar_url || existingAvatar || '',
            rating_rapid: existingRatingRapid,
            rating_blitz: existingRatingBlitz,
          }
          
          setUser(initialUser)
          localStorage.setItem('user', JSON.stringify(initialUser))
          
          // Sync asynchronously
          syncWithPostgres(session.access_token, initialUser)
        }
      } catch (err) {
        console.error('Failed to get initial session:', err)
      } finally {
        setIsLoading(false)
      }
    }

    getInitialSession()

    // 2. Setup auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
          // ignore
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
        
        syncWithPostgres(session.access_token, newUser)
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
  }, [])

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return
    const updatedUser = { ...user, ...updates }
    
    // Update local state & localStorage
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))

    // Update Supabase auth user metadata
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
  }

  const logout = async () => {
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
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, updateUser, logout }}>
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
