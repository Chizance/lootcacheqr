import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { BinNew } from './pages/BinNew'
import { BinDetail } from './pages/BinDetail'
import { Locations } from './pages/Locations'

// HashRouter (URLs like #/bin/abc123) instead of BrowserRouter: GitHub Pages
// has no server-side rewrite rules, so a real path like /bin/abc123 would
// 404 on refresh or when a QR code opens it directly. Hash routes always
// resolve to index.html first, no server config needed.
function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bin/new"
            element={
              <ProtectedRoute>
                <BinNew />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bin/:id"
            element={
              <ProtectedRoute>
                <BinDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/locations"
            element={
              <ProtectedRoute>
                <Locations />
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

export default App
