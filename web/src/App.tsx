import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
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
        const user = {
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Player'
        }
        localStorage.setItem('user', JSON.stringify(user))
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
        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

