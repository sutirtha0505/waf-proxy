import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { mockRequests } from '../data/mockRequests'
import { useThemeContext } from '../context/ThemeContext'

const NAV = [
  {
    label: 'Dashboard', path: '/',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    label: 'Requests', path: '/requests', badge: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    label: 'Analytics', path: '/analytics',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  },
  {
    label: 'Settings', path: '/settings',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

// ── NavItem as separate component so CSS hover works cleanly ──
function NavItem({ item, isActive, collapsed, isDark, cnt }) {
  const { label, path, icon, badge } = item

  // all colors decided here, no framer-motion whileHover
  const activeBg     = isDark ? '#1e3a5f' : '#f1f5f9'
  const activeText   = isDark ? '#ffffff'  : '#0f172a'
  const activeIcon   = isDark ? '#ffffff'  : '#10b981'
  const activeBorder = isDark ? 'transparent' : '#10b981'
  const inactiveText = isDark ? '#94a3b8'  : '#64748b'
  const hoverBg      = isDark ? '#1a2540'  : '#f1f5f9'
  const badgeBg      = isDark ? '#422006'  : '#fef3c7'
  const badgeText    = isDark ? '#fbbf24'  : '#92400e'

  return (
    <NavLink to={path} style={{ textDecoration: 'none' }}>
      {/* 
        Using a plain div with CSS class for hover 
        so theme changes always apply correctly 
      */}
      <div
        className={`nav-item ${isActive ? 'nav-active' : ''} ${isDark ? 'nav-dark' : 'nav-light'}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '10px 0' : '9px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 7,
          borderLeft: isActive
            ? `3px solid ${activeBorder}`
            : '3px solid transparent',
          background: isActive ? activeBg : 'transparent',
          color: isActive ? activeText : inactiveText,
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
          // CSS var for hover — read by the style tag below
          '--hover-bg': hoverBg,
        }}
      >
        <div style={{
          flexShrink: 0,
          position: 'relative',
          color: isActive ? activeIcon : inactiveText,
          transition: 'color 0.2s ease',
        }}>
          {icon}
          {badge && cnt > 0 && collapsed && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              width: 12, height: 12,
              background: '#f59e0b',
              borderRadius: '50%',
              fontSize: '0.55rem',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}>
              {cnt > 9 ? '9+' : cnt}
            </span>
          )}
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 6 }}
            >
              <span style={{
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
              {badge && cnt > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: badgeBg,
                  color: badgeText,
                  borderRadius: 999,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                }}>
                  {cnt}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NavLink>
  )
}

export default function Sidebar({ pendingCount, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { isDark, toggle } = useThemeContext()
  const cnt = pendingCount ?? mockRequests.filter(r => r.status === 'pending').length

  const bg          = isDark ? '#0d1528' : '#ffffff'
  const border      = isDark ? '#1e2d4a' : '#e2e8f0'
  const borderSoft  = isDark ? '#1a2540' : '#f1f5f9'
  const title       = isDark ? '#e2e8f0' : '#0f172a'
  const subtitle    = isDark ? '#64748b' : '#94a3b8'
  const toggleBg    = isDark ? '#1a2540' : '#f8fafc'
  const toggleBdr   = isDark ? '#1e2d4a' : '#e2e8f0'
  const toggleTxt   = isDark ? '#e2e8f0' : '#64748b'
  const colBtnBg    = isDark ? '#1a2540' : '#f8fafc'
  const colBtnBdr   = isDark ? '#1e2d4a' : '#e2e8f0'
  const colBtnClr   = isDark ? '#94a3b8' : '#64748b'

  return (
    <>
      {/* 
        ── INLINE STYLE TAG: CSS hover using var() ──
        This is the KEY fix — CSS :hover always reads 
        the current --hover-bg value, unlike framer whileHover 
      */}
      <style>{`
        .nav-item:hover {
          background: var(--hover-bg) !important;
        }
        .nav-item.nav-active:hover {
          background: var(--hover-bg) !important;
        }
      `}</style>

      <motion.aside
        key={isDark ? 'dark' : 'light'}
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        style={{
          background: bg,
          borderRight: `1px solid ${border}`,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          overflow: 'hidden',
          zIndex: 40,
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* ── Logo ── */}
        <div style={{
          padding: '16px 16px 14px',
          borderBottom: `1px solid ${borderSoft}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 60,
        }}>
          <img src="/logo.svg" alt="SmartWAF"
            style={{ width: 34, height: 34, flexShrink: 0 }} />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}
              >
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: title }}>
                  SmartWAF
                </div>
                <div style={{ fontSize: '0.67rem', color: subtitle, marginTop: 1 }}>
                  WAF Dashboard
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="hamburger-btn"
              style={{ marginLeft: 'auto', flexShrink: 0 }}
              aria-label="Close menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* ── Nav ── */}
        <nav style={{
          flex: 1,
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          {NAV.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
            return (
              <NavItem
                key={item.path}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
                isDark={isDark}
                cnt={cnt}
              />
            )
          })}
        </nav>

        {/* ── Theme toggle ── */}
        <div style={{ padding: '6px 8px' }}>
          <button
            onClick={toggle}
            style={{
              width: '100%',
              padding: collapsed ? '8px' : '8px 12px',
              borderRadius: 7,
              border: `1px solid ${toggleBdr}`,
              background: toggleBg,
              cursor: 'pointer',
              color: toggleTxt,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8,
              fontSize: '0.8rem',
              fontWeight: 500,
              transition: 'all 0.3s ease',
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* ── Collapse toggle ── */}
        <div style={{
          padding: '6px 8px 10px',
          borderTop: `1px solid ${borderSoft}`,
        }}>
          <button
            onClick={() => setCollapsed(prev => !prev)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 7,
              border: `1px solid ${colBtnBdr}`,
              background: colBtnBg,
              cursor: 'pointer',
              color: colBtnClr,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              transition: 'all 0.3s ease',
            }}
          >
            <motion.span
              animate={{ rotate: collapsed ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              ›
            </motion.span>
          </button>
        </div>
      </motion.aside>
    </>
  )
}