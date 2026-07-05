import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import LearnPage from './pages/LearnPage'
import PlayPage from './pages/PlayPage'
import ProfilePage from './pages/ProfilePage'
import ReviewPage from './pages/ReviewPage'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'

// Route guard for authenticated pages
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f12', color: '#ffffff' }}>
        <div style={{ fontSize: '0.9rem', opacity: 0.8, letterSpacing: '0.05em' }}>CONNECTING...</div>
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/auth" replace />
  }
  return <>{children}</>
}

// Route guard for guest/public pages (redirects logged-in users away from login/signup)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f12', color: '#ffffff' }}>
        <div style={{ fontSize: '0.9rem', opacity: 0.8, letterSpacing: '0.05em' }}>CONNECTING...</div>
      </div>
    )
  }
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

// Root page redirect logic based on session state
const RootRoute = () => {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f12', color: '#ffffff' }}>
        <div style={{ fontSize: '0.9rem', opacity: 0.8, letterSpacing: '0.05em' }}>CONNECTING...</div>
      </div>
    )
  }
  return user ? <Navigate to="/dashboard" replace /> : <HomePage />
}

const AppContent = () => {
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
        <Route path="/" element={<RootRoute />} />
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

const App = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  )
}

export default App
