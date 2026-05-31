import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import LoginPage from './pages/LoginPage'
import MainLayout from './layouts/MainLayout'
import DashboardPage from './pages/DashboardPage'
import RequestsPage from './pages/RequestsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const [authed, setAuthed] = useState(false)

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Login: auto-redirect if already authed ── */}
          <Route
            path="/login"
            element={
              !authed
                ? <LoginPage onLogin={() => setAuthed(true)} />
                : <Navigate to="/" replace />
            }
          />

          {/* ── Protected routes ── */}
          <Route
            path="/"
            element={authed ? <MainLayout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<DashboardPage />} />
            <Route path="requests"  element={<RequestsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings"  element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to={authed ? '/' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

