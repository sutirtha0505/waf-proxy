import { useState } from 'react'
import { motion } from 'framer-motion'
import { useThemeContext } from '../context/ThemeContext'

const FEATURES = [
  { text: 'BERT-based threat detection' },
  { text: 'Real-time traffic analysis' },
  { text: 'Human-in-the-loop review workflow' },
]

// LoginPage does NOT call navigate() — the App.jsx login route
// auto-redirects to "/" when authed becomes true. This is the fix
// for the black screen race condition.
export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')
  const { isDark } = useThemeContext()

  const D  = isDark
  const pageBg    = D ? '#0a0f1e' : '#f1f5f9'
  const tc        = D ? '#e2e8f0' : '#0f172a'
  const sc        = D ? '#94a3b8' : '#64748b'
  const bodyText  = D ? '#cbd5e1' : '#374151'
  const cardBg    = D ? '#0d1528' : '#fff'
  const cardBdr   = D ? '#1e2d4a' : '#e2e8f0'
  const inputBg   = D ? '#0a0f1e' : '#fff'
  const inputBdr  = D ? '#1e2d4a' : '#e2e8f0'
  const featureBg = D ? '#0d1528' : '#fff'
  const featureBdr= D ? '#1e2d4a' : '#e2e8f0'
  const labelColor= D ? '#94a3b8' : '#374151'
  const subtitleColor = D ? '#64748b' : '#94a3b8'

  const submit = (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setErr('Please enter any username and password.')
      return
    }
    setErr('')
    setBusy(true)
    setTimeout(() => {
      onLogin()
    }, 900)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: pageBg }}>
      {/* Left panel */}
      <div style={{ flex: '0 0 55%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 64px' }}>
        {/* Blurred orbs — brighter in dark mode */}
        <div style={{ position: 'absolute', top: '15%',  left: '10%',  width: 300, height: 300, borderRadius: '50%', background: '#0ea5e9', filter: 'blur(80px)', opacity: D ? 0.18 : 0.12 }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '5%', width: 260, height: 260, borderRadius: '50%', background: '#6366f1', filter: 'blur(80px)', opacity: D ? 0.18 : 0.12 }} />
        <div style={{ position: 'absolute', top: '55%',  left: '35%',  width: 180, height: 180, borderRadius: '50%', background: '#10b981', filter: 'blur(60px)', opacity: D ? 0.14 : 0.08 }} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <img src="/logo.svg" alt="SmartWAF" style={{ width: 52, height: 52, flexShrink: 0 }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: tc }}>SmartWAF</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: tc, lineHeight: 1.2, marginBottom: 14 }}>
            AI-Powered Web<br />Application Firewall
          </h1>
          <p style={{ fontSize: '1rem', color: sc, marginBottom: 40, lineHeight: 1.6 }}>
            Intelligent threat detection with human-in-the-loop review — protecting your applications in real time.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FEATURES.map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: featureBg, border: `1px solid ${featureBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: '0.9rem', color: bodyText, fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel — login card */}
      <div style={{ flex: '0 0 45%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          style={{ width: '100%', maxWidth: 400, background: cardBg, borderRadius: 12, padding: '40px 36px', boxShadow: D ? '0 4px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)', border: `1px solid ${cardBdr}` }}
        >
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ marginBottom: 20 }}>
              <img src="/logo.svg" alt="SmartWAF" style={{ width: 80, height: 80 }} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: tc }}>Sign in to your account</h2>
            <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: subtitleColor }}>Enter any credentials to continue</p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, color: labelColor, display: 'block', marginBottom: 6 }}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="admin" autoComplete="username"
                style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${inputBdr}`, borderRadius: 8, fontSize: '0.875rem', outline: 'none', color: tc, transition: 'border-color 0.15s', background: inputBg }}
                onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.15)' }}
                onBlur={e => { e.target.style.borderColor = inputBdr; e.target.style.boxShadow = 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, color: labelColor, display: 'block', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${inputBdr}`, borderRadius: 8, fontSize: '0.875rem', outline: 'none', color: tc, transition: 'border-color 0.15s', background: inputBg }}
                onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.15)' }}
                onBlur={e => { e.target.style.borderColor = inputBdr; e.target.style.boxShadow = 'none' }} />
            </div>

            {err && <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: 0 }}>{err}</p>}

            <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} disabled={busy}
              style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: busy ? '#7dd3fc' : '#0ea5e9', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: busy ? 'wait' : 'pointer', marginTop: 4, transition: 'background 0.2s', boxShadow: '0 2px 10px rgba(14,165,233,0.28)' }}>
              {busy ? 'Signing in…' : 'Sign In →'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
