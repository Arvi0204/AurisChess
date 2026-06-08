import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'

const App = () => {
  if (window.location.pathname.startsWith('/auth')) {
    return <AuthPage />
  }

  return <HomePage />
}

export default App
