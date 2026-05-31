import { useState } from 'react'
import { motion } from 'framer-motion'
import { useThemeContext } from '../context/ThemeContext'

function Section({ title, children, isDark }) {
  const borderColor = isDark ? '#1a2540' : '#f1f5f9'
  const titleColor  = isDark ? '#e2e8f0' : '#0f172a'
  return (
    <div className="card" style={{ padding: '24px', marginBottom: 18 }}>
      <h2 style={{ margin: '0 0 18px', fontSize: '0.95rem', fontWeight: 600, color: titleColor, paddingBottom: 12, borderBottom: `1px solid ${borderColor}` }}>{title}</h2>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [mode,      setMode]      = useState('block')
  const [threshold, setThreshold] = useState(85)
  const [ipInput,   setIpInput]   = useState('')
  const [blocklist, setBlocklist] = useState(['192.168.100.55','185.220.101.34'])
  const { isDark } = useThemeContext()

  const D  = isDark
  const tc = D ? '#e2e8f0' : '#0f172a'
  const sc = D ? '#64748b' : '#94a3b8'
  const bodyText = D ? '#cbd5e1' : '#374151'
  const inputBg  = D ? '#0a0f1e' : '#fff'
  const inputBdr = D ? '#1e2d4a' : '#e2e8f0'
  const infoBg   = D ? '#0c1a2e' : '#f0f9ff'
  const infoBdr  = D ? '#1e3a5f' : '#bae6fd'
  const infoText = D ? '#7dd3fc' : '#0369a1'
  const infoPill = D ? '#1a3d5f' : '#f8fafc'
  const infoPillBdr = D ? '#1e2d4a' : '#e2e8f0'

  const WAF_MODES = [
    { key: 'monitor',  label: 'Monitor',  desc: 'Log all, block nothing',  color: '#6366f1' },
    { key: 'block',    label: 'Block',    desc: 'Actively block threats',   color: '#ef4444' },
    { key: 'learning', label: 'Learning', desc: 'AI trains on traffic',     color: '#10b981' },
  ]

  const addIP = () => {
    const ip = ipInput.trim()
    if (!ip || blocklist.includes(ip)) return
    setBlocklist(p => [...p, ip])
    setIpInput('')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: tc, margin: 0 }}>Settings</h1>
        <p style={{ fontSize: '0.78rem', color: sc, margin: '3px 0 0' }}>SmartWAF › Settings</p>
      </div>

      {/* WAF Mode */}
      <Section title="WAF Operating Mode" isDark={isDark}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {WAF_MODES.map(m => {
            const active = mode === m.key
            return (
              <motion.button key={m.key} onClick={() => setMode(m.key)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ flex: 1, padding: '18px 16px', borderRadius: 9,
                  border: `1.5px solid ${active ? m.color : inputBdr}`,
                  background: active ? m.color : (D ? '#0d1528' : '#fff'),
                  color: active ? '#fff' : bodyText,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: '0.75rem', opacity: active ? 0.85 : 0.6 }}>{m.desc}</div>
              </motion.button>
            )
          })}
        </div>
      </Section>

      {/* AI Threshold */}
      <Section title="AI Confidence Threshold" isDark={isDark}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: bodyText }}>Block threshold</p>
          <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0ea5e9', fontFamily: 'JetBrains Mono, monospace' }}>{threshold}%</span>
        </div>
        <input type="range" min={50} max={99} step={1} value={threshold} onChange={e => setThreshold(+e.target.value)} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: '0.73rem', color: sc }}>50% (permissive)</span>
          <span style={{ fontSize: '0.73rem', color: sc }}>99% (strict)</span>
        </div>
        <div style={{ marginTop: 14, padding: '10px 14px', background: infoBg, borderRadius: 8, border: `1px solid ${infoBdr}` }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: infoText }}>
            Requests below <strong>{threshold}%</strong> confidence are sent for human review. Currently in the pending queue.
          </p>
        </div>
      </Section>

      {/* IP Blocklist */}
      <Section title="IP Blocklist Manager" isDark={isDark}>
        <div style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
          <input value={ipInput} onChange={e => setIpInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addIP()}
            placeholder="e.g. 10.0.0.1 or 192.168.0.0/24"
            style={{ flex: 1, padding: '9px 13px', border: `1.5px solid ${inputBdr}`, borderRadius: 8, fontSize: '0.875rem', outline: 'none', color: tc, background: inputBg }}
            onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.15)' }}
            onBlur={e => { e.target.style.borderColor = inputBdr; e.target.style.boxShadow = 'none' }} />
          <button onClick={addIP}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Add IP
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {blocklist.map(ip => (
            <div key={ip} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 12px', background: D ? '#3b0f0f' : '#fee2e2', border: `1px solid ${D ? '#5b1a1a' : '#fecaca'}`, borderRadius: 999 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: D ? '#f87171' : '#991b1b' }}>{ip}</span>
              <button onClick={() => setBlocklist(p => p.filter(i => i !== ip))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '1rem', lineHeight: 1, display: 'flex', alignItems: 'center' }}>×</button>
            </div>
          ))}
          {blocklist.length === 0 && <p style={{ fontSize: '0.82rem', color: sc }}>No IPs blocked yet</p>}
        </div>
      </Section>

      {/* Protected Application */}
      <Section title="Protected Application" isDark={isDark}>
        <div className="two-panel-row" style={{ marginBottom: 0 }}>
          {[
            { label: 'Target URL', val: 'http://localhost:8080 (DVWA)' },
            { label: 'WAF Port',   val: '8443' },
            { label: 'Protocol',   val: 'HTTPS/HTTP forward proxy' },
            { label: 'Status',     val: '● Active', color: '#059669' },
          ].map(r => (
            <div key={r.label} style={{ padding: '12px 16px', background: infoPill, border: `1px solid ${infoPillBdr}`, borderRadius: 8 }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: sc, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{r.label}</p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: r.color || tc, fontFamily: r.label.includes('URL') || r.label.includes('Port') ? 'JetBrains Mono, monospace' : 'inherit', fontWeight: 500 }}>{r.val}</p>
            </div>
          ))}
        </div>
      </Section>
    </motion.div>
  )
}
