import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'

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

