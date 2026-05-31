import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AttackVectorModal from './AttackVectorModal'
import { useThemeContext } from '../context/ThemeContext'

function JsonLine({ k, v, isDark }) {
  let color = isDark ? '#94a3b8' : '#64748b'
  let display = JSON.stringify(v)
  if (typeof v === 'string')  color = '#0ea5e9'
  if (typeof v === 'number')  color = '#f59e0b'
  if (typeof v === 'boolean') color = '#6366f1'
  if (v === null)             { color = '#ef4444'; display = 'null' }
  return (
    <div style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
      <span style={{ color: isDark ? '#64748b' : '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}>"{k}":</span>
      <span style={{ color, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{display}</span>
    </div>
  )
}

export default function RequestModal({ request, onClose, onSafe, onUnsafe }) {
  const [showVector, setShowVector] = useState(false)
  const { isDark } = useThemeContext()
  const open = !!request

  const handleSafe = () => {
    onSafe(request.request_id)
    onClose()
  }

  const handleUnsafe = () => setShowVector(true)

  const handleVectorConfirm = (vec) => {
    onUnsafe(request.request_id, vec)
    setShowVector(false)
    onClose()
  }

  const modalBg = isDark ? '#0d1528' : '#ffffff'
  const headerColor = isDark ? '#e2e8f0' : '#0f172a'
  const subtitleColor = isDark ? '#64748b' : '#94a3b8'
  const jsonBg = isDark ? '#0a0f1e' : '#f8fafc'
  const jsonBorder = isDark ? '#1e2d4a' : '#e2e8f0'
  const badgeBg2 = isDark ? '#1a2540' : '#f1f5f9'

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="reqbg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={onClose}
          >
            <motion.div
              key="reqmodal"
              initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              style={{ background: modalBg, borderRadius: 12, width: 620, maxHeight: '82vh', overflow: 'auto', padding: 28, boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.15)', border: isDark ? '1px solid #1e2d4a' : 'none' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: '0.72rem', color: subtitleColor, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Request Detail</p>
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: headerColor, fontFamily: 'JetBrains Mono, monospace' }}>
                    #{request?.request_id}
                  </h2>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: subtitleColor }}>×</button>
              </div>

              {/* Summary badges */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
                <span className="badge badge-get">{request?.method}</span>
                <span className="badge" style={{ background: badgeBg2, color: isDark ? '#94a3b8' : '#475569' }}>{request?.protocol}</span>
                <span className={`badge badge-${request?.status}`}>{request?.status}</span>
                <span className="badge" style={{ background: isDark ? '#1a1040' : '#ede9fe', color: '#a78bfa' }}>AI {request?.confidence_score}%</span>
              </div>

              {/* JSON viewer */}
              <div style={{ background: jsonBg, border: `1px solid ${jsonBorder}`, borderRadius: 8, padding: '14px 18px', marginBottom: 20, maxHeight: 320, overflowY: 'auto' }}>
                {request && Object.entries(request).map(([k, v]) => <JsonLine key={k} k={k} v={v} isDark={isDark} />)}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSafe}
                  style={{ padding: '9px 22px', borderRadius: 8, border: isDark ? '1px solid #0f2d1f' : '1px solid #d1fae5', background: isDark ? '#0f2d1f' : '#ecfdf5', color: '#059669', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  ✓ Mark as Safe
                </button>
                <button
                  onClick={handleUnsafe}
                  style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  ✕ Mark as Unsafe
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AttackVectorModal
        open={showVector}
        onClose={() => setShowVector(false)}
        onConfirm={handleVectorConfirm}
      />
    </>
  )
}
