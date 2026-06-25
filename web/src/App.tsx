import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import LearnPage from './pages/LearnPage'
import PlayPage from './pages/PlayPage'
import ProfilePage from './pages/ProfilePage'
import ReviewPage from './pages/ReviewPage'
import { supabase } from './config/supabaseClient'

function isLoggedIn(): boolean {
  const token = localStorage.getItem('authToken')
  const user = localStorage.getItem('user')
  return Boolean(token && user)
}

// Route guard for authenticated pages
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/auth" replace />
  }
  return <>{children}</>
}

// Route guard for guest/public pages (redirects logged-in users away from login/signup)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  if (isLoggedIn()) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

const App = () => {
  // Use state to trigger re-renders when auth state changes
  const [, setSessionState] = useState<any>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem('authToken', session.access_token)
        
        // Preserve locally stored avatar_url if any exists
        let existingAvatar = ''
        try {
          const stored = localStorage.getItem('user')
          if (stored) {
            existingAvatar = JSON.parse(stored).avatar_url || ''
          }
        } catch {
          // ignore
        }

        const user = {
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Player',
          avatar_url: session.user.user_metadata?.avatar_url || existingAvatar || ''
        }
        localStorage.setItem('user', JSON.stringify(user))

        // Asynchronously sync the username and avatar from the Postgres DB
        fetch('http://localhost:3000/api/user/stats', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
          .then(res => {
            if (res.ok) return res.json()
            throw new Error('Failed to fetch stats')
          })
          .then(resJson => {
            if (resJson?.data?.user) {
              const dbUser = resJson.data.user
              const currentStored = localStorage.getItem('user')
              let userObj = currentStored ? JSON.parse(currentStored) : user
              
              let changed = false
              if (dbUser.username && dbUser.username !== userObj.username) {
                userObj.username = dbUser.username
                changed = true
              }
              if (dbUser.avatar_url && dbUser.avatar_url !== userObj.avatar_url) {
                userObj.avatar_url = dbUser.avatar_url
                changed = true
              }
              
              if (changed) {
                localStorage.setItem('user', JSON.stringify(userObj))
                
                // Also update Supabase metadata so it's persisted in the auth session
                supabase.auth.updateUser({
                  data: {
                    username: userObj.username,
                    avatar_url: userObj.avatar_url
                  }
                }).catch(e => console.error('Failed to sync auth metadata', e))
                
                // Force a state update to trigger UI re-renders across components
                setSessionState((prev: any) => prev ? { 
                  ...prev, 
                  user: { 
                    ...prev.user, 
                    user_metadata: { 
                      ...prev.user.user_metadata, 
                      username: userObj.username, 
                      avatar_url: userObj.avatar_url 
                    } 
                  } 
                } : prev)
              }
            }
          })
          .catch(err => {
            console.warn('Could not sync user details with Postgres DB:', err)
          })

      } else {
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
      }
      // Trigger a state change to re-evaluate isLoggedIn across guards
      setSessionState(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: '#0f1417',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            fontSize: '0.9rem',
          },
          success: {
            iconTheme: {
              primary: '#00b0f0',
              secondary: '#0f1417',
            },
          },
        }}
      />
      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn() ? <Navigate to="/dashboard" replace /> : <HomePage />
          }
        />
        <Route
          path="/auth"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/play"
          element={
            <ProtectedRoute>
              <PlayPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learn"
          element={
            <ProtectedRoute>
              <LearnPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/review"
          element={
            <ProtectedRoute>
              <ReviewPage />
            </ProtectedRoute>
          }
        />
        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

