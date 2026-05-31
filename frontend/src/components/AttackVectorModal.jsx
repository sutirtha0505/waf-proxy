import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { attackVectors as defaultVectors } from '../data/attackVectors'
import AddVectorModal from './AddVectorModal'
import { useThemeContext } from '../context/ThemeContext'

export default function AttackVectorModal({ open, onClose, onConfirm }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})
  const [selected, setSelected] = useState(null)
  const [vectors, setVectors] = useState(defaultVectors)
  const [showAdd, setShowAdd] = useState(false)
  const { isDark } = useThemeContext()

  const filtered = useMemo(() => {
    if (!search.trim()) return vectors
    const q = search.toLowerCase()
    const result = {}
    Object.entries(vectors).forEach(([cat, items]) => {
      const match = items.filter(v => v.name.includes(q))
      if (match.length) result[cat] = match
    })
    return result
  }, [search, vectors])

  useMemo(() => {
    if (!search.trim()) return
    const e2 = {}
    Object.keys(filtered).forEach(k => { e2[k] = true })
    setExpanded(e2)
  }, [filtered, search])

  const allCodes = Object.values(vectors).flat().map(v => v.code)
  const nextCode = Math.max(...allCodes) + 1
  const handleAddVector = (cat, name) => {
    setVectors(prev => ({ ...prev, [cat]: [...(prev[cat] || []), { name, code: nextCode }] }))
    setShowAdd(false)
  }

  if (!open) return null
  const catLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const D = isDark
  const mbg = D ? '#0d1528' : '#fff'
  const bdr = D ? '#1e2d4a' : '#e2e8f0'
  const tc = D ? '#e2e8f0' : '#0f172a'
  const sc = D ? '#94a3b8' : '#64748b'

  return (
    <>
      <AnimatePresence>
        <motion.div key="avbg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: D ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 24 }}
          onClick={onClose}>
          <motion.div key="avmodal" initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            style={{ background: mbg, borderRadius: 12, width: 580, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: D ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden', border: D ? `1px solid ${bdr}` : 'none' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: tc, margin: 0 }}>Select Attack Vector</h2>
                <p style={{ fontSize: '0.78rem', color: sc, margin: '3px 0 0' }}>Choose the vector that best describes this attack</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: sc, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '14px 24px', borderBottom: `1px solid ${D ? '#1a2540' : '#f1f5f9'}` }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vectors…" autoFocus
                style={{ width: '100%', padding: '9px 14px', border: `1px solid ${bdr}`, borderRadius: 8, fontSize: '0.875rem', outline: 'none', background: D ? '#0a0f1e' : '#f8fafc', color: tc }}
                onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.15)' }}
                onBlur={e => { e.target.style.borderColor = bdr; e.target.style.boxShadow = 'none' }} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
              {Object.entries(filtered).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 4 }}>
                  <button onClick={() => setExpanded(e => ({ ...e, [cat]: !e[cat] }))}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 7, border: 'none', background: expanded[cat] ? (D ? '#0c1a2e' : '#f0f9ff') : (D ? '#1a2540' : '#f8fafc'), cursor: 'pointer', color: tc, transition: 'background 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{catLabel(cat)}</span>
                      <span style={{ fontSize: '0.7rem', color: sc, background: D ? '#1e2d4a' : '#e2e8f0', borderRadius: 999, padding: '1px 7px' }}>{items.length}</span>
                    </div>
                    <span style={{ color: sc, transform: expanded[cat] ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>›</span>
                  </button>
                  <AnimatePresence>
                    {expanded[cat] && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', paddingLeft: 8 }}>
                        {items.map(v => (
                          <div key={v.code} onClick={() => setSelected(v)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, cursor: 'pointer', margin: '2px 0', background: selected?.code === v.code ? (D ? '#0c1a2e' : '#f0f9ff') : 'transparent', borderLeft: selected?.code === v.code ? '3px solid #0ea5e9' : '3px solid transparent', transition: 'all 0.12s' }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', background: D ? '#1e2d4a' : '#f1f5f9', color: sc, borderRadius: 4, padding: '2px 7px' }}>#{v.code}</span>
                            <span style={{ fontSize: '0.82rem', color: selected?.code === v.code ? '#0ea5e9' : (D ? '#e2e8f0' : '#374151'), fontWeight: selected?.code === v.code ? 500 : 400 }}>{v.name}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              {Object.keys(filtered).length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: sc, fontSize: '0.85rem' }}>No vectors match your search</div>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: `1px solid ${bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setShowAdd(true)} style={{ border: `1px dashed ${D ? '#1e2d4a' : '#cbd5e1'}`, background: 'none', color: sc, fontSize: '0.8rem', padding: '7px 14px', borderRadius: 7, cursor: 'pointer' }}>+ Add New Vector</button>
              <div style={{ display: 'flex', gap: 9 }}>
                <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 7, border: `1px solid ${bdr}`, background: D ? '#1a2540' : '#fff', color: sc, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button onClick={() => selected && onConfirm(selected)} disabled={!selected}
                  style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: selected ? '#0ea5e9' : (D ? '#1e2d4a' : '#e2e8f0'), color: selected ? '#fff' : sc, cursor: selected ? 'pointer' : 'not-allowed', fontSize: '0.85rem', fontWeight: 600 }}>
                  Confirm{selected ? `: ${selected.name}` : ''}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      <AddVectorModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAddVector} nextCode={nextCode} />
    </>
  )
}
