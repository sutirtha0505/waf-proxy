import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useThemeContext } from '../context/ThemeContext'

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isDark } = useThemeContext()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: isDark ? '#0a0f1e' : '#f8fafc', overflow: 'hidden' }}>

      {/* ── Desktop sidebar (hidden on mobile via CSS) ── */}
      <div className="sidebar-desktop" style={{ flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* ── Mobile sidebar drawer + overlay ── */}
      <>
        {/* Backdrop — clicking closes drawer */}
        {mobileOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setMobileOpen(false)}
            style={{ cursor: 'pointer' }}
          />
        )}

        {/* Drawer — fixed on mobile, controlled by .open class */}
        <div className={`sidebar-drawer${mobileOpen ? ' open' : ''}`}
          style={{ display: 'none' /* shown by CSS on mobile */ }}>
          <Sidebar onMobileClose={() => setMobileOpen(false)} />
        </div>
      </>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>

        {/* Mobile top bar — hamburger + brand */}
        <div className="mobile-topbar">
          <button
            className="hamburger-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <img src="/logo.svg" alt="SmartWAF" style={{ width: 28, height: 28 }} />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isDark ? '#e2e8f0' : '#0f172a' }}>SmartWAF</span>
        </div>

        {/* Page content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
