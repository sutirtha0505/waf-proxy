import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeContext } from '../context/ThemeContext'

export default function AddVectorModal({ open, onClose, onAdd, nextCode }) {
  const [cat, setCat] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const { isDark } = useThemeContext()

  const submit = () => {
    if (!cat.trim() || !name.trim()) { setErr('Both fields are required.'); return }
    const catKey = cat.trim().toLowerCase().replace(/\s+/g, '_')
    onAdd(catKey, name.trim().toLowerCase().replace(/\s+/g, '_'))
    setCat(''); setName(''); setErr('')
    onClose()
  }

  if (!open) return null

  const D = isDark
  const mbg = D ? '#0d1528' : '#fff'
  const bdr = D ? '#1e2d4a' : '#e2e8f0'
  const tc = D ? '#e2e8f0' : '#0f172a'
  const sc = D ? '#94a3b8' : '#64748b'

  return (
    <AnimatePresence>
      <motion.div key="addbg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: D ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70 }}
        onClick={onClose}>
        <motion.div key="addmodal" initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 10 }}
          transition={{ duration: 0.18 }}
          style={{ background: mbg, borderRadius: 12, width: 410, padding: 28, boxShadow: D ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.18)', border: D ? `1px solid ${bdr}` : 'none' }}
          onClick={e => e.stopPropagation()}>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: tc }}>Add New Attack Vector</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: sc }}>×</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: sc, display: 'block', marginBottom: 5 }}>Category (snake_case)</label>
              <input value={cat} onChange={e => setCat(e.target.value)} placeholder="e.g. custom_attacks"
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${bdr}`, borderRadius: 7, fontSize: '0.875rem', outline: 'none', color: tc, background: D ? '#0a0f1e' : '#fff' }}
                onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                onBlur={e => e.target.style.borderColor = bdr} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: sc, display: 'block', marginBottom: 5 }}>Vector Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. my_custom_vector"
                onKeyDown={e => e.key === 'Enter' && submit()}
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${bdr}`, borderRadius: 7, fontSize: '0.875rem', outline: 'none', color: tc, background: D ? '#0a0f1e' : '#fff' }}
                onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                onBlur={e => e.target.style.borderColor = bdr} />
            </div>
            <div style={{ padding: '8px 12px', background: D ? '#0c1a2e' : '#f0f9ff', borderRadius: 7, fontSize: '0.78rem', color: sc }}>
              Auto-assigned code: <strong style={{ color: '#0ea5e9' }}>#{nextCode}</strong>
            </div>
            {err && <p style={{ color: '#dc2626', fontSize: '0.78rem', margin: 0 }}>{err}</p>}
          </div>

          <div style={{ display: 'flex', gap: 9, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 7, border: `1px solid ${bdr}`, background: D ? '#1a2540' : '#fff', color: sc, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
            <button onClick={submit} style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: '#0ea5e9', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Add Vector</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
