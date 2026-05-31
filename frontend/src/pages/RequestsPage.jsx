import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { mockRequests as initial } from '../data/mockRequests'
import RequestModal from '../components/RequestModal'
import Toast from '../components/Toast'
import { useThemeContext } from '../context/ThemeContext'

const VECS  = ['sqli_classic','xss_reflected','cmdi','brute_force','path_traversal','ssrf','http_flood']
const IPS   = ['198.51.100.77','104.244.72.113','45.33.32.200','203.0.113.99']
const PATHS = ['/api/v1/login','/admin/panel','/search','/api/exec']

function relTime(ts) {
  const d = Date.now() - ts
  if (d < 60000)   return `${Math.floor(d / 1000)}s ago`
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`
  return `${Math.floor(d / 3600000)}h ago`
}

function ConfBar({ score }) {
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="conf-bar-wrap">
      <div className="conf-bar-track">
        <div className="conf-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span style={{ fontSize: '0.72rem', color, fontWeight: 600, width: 38, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{score}%</span>
    </div>
  )
}

function Pill({ method }) {
  const cls = method === 'POST' ? 'badge-post' : method === 'GET' ? 'badge-get' : 'badge-put'
  return <span className={`badge ${cls}`}>{method}</span>
}

let newIdx = 31

export default function RequestsPage() {
  const [requests, setRequests] = useState(initial)
  const [filter,   setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [toast,    setToast]    = useState(null)
  const { isDark } = useThemeContext()

  const D = isDark
  const tc         = D ? '#e2e8f0' : '#0f172a'
  const sc         = D ? '#64748b' : '#94a3b8'
  const pathColor  = D ? '#cbd5e1' : '#374151'
  const btnBg      = D ? '#0d1528' : '#fff'
  const btnBorder  = D ? '#1e2d4a' : '#e2e8f0'
  const btnColor   = D ? '#e2e8f0' : '#374151'
  const thBg       = D ? '#0a1525' : '#f8fafc'
  const thBorder   = D ? '#1e2d4a' : '#e2e8f0'
  const rowBorder  = D ? '#1a2540' : '#f8fafc'
  const rowEven    = D ? '#0d1528' : '#fff'
  const rowOdd     = D ? '#0f1a30' : '#fafbfc'
  const hoverRow   = D ? '#1a2540' : '#f0f9ff'
  const emptyColor = D ? '#64748b' : '#94a3b8'

  // Simulate 8-second polling for new pending requests
  useEffect(() => {
    const t = setInterval(() => {
      const i = newIdx++
      const score = parseFloat((35 + Math.abs(Math.sin(i * 2.1)) * 48).toFixed(1))
      setRequests(prev => [{
        request_id: `req-${String(i).padStart(3, '0')}`,
        timestamp: Date.now(),
        source_ip: IPS[i % IPS.length],
        protocol: 'HTTP/1.1',
        method: ['GET','POST','PUT'][i % 3],
        path: PATHS[i % PATHS.length],
        query_string: '',
        user_agent: 'scanner/1.0',
        cookie: '',
        body_raw: 'payload',
        content_type: 'application/json',
        has_encoded_chars: false,
        has_script_tag: false,
        path_depth: 2,
        attack_vector: VECS[i % VECS.length],
        confidence_score: score,
        status: 'pending',
      }, ...prev])
    }, 8000)
    return () => clearInterval(t)
  }, [])

  const filtered = useMemo(() =>
    filter === 'all' ? requests : requests.filter(r => r.status === filter),
    [requests, filter]
  )

  const handleSafe = (id) => {
    setRequests(prev => prev.map(r => r.request_id === id ? { ...r, status: 'safe' } : r))
    setToast({ msg: 'Marked as safe — saved for model training', type: 'success' })
  }

  const handleUnsafe = (id, vec) => {
    setRequests(prev => prev.map(r => r.request_id === id ? { ...r, status: 'unsafe', attack_vector: vec.name } : r))
    setToast({ msg: `Labeled as ${vec.name}`, type: 'error' })
  }

  const pending = requests.filter(r => r.status === 'pending').length

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: tc, margin: 0 }}>Requests Review</h1>
          <p style={{ fontSize: '0.78rem', color: sc, margin: '3px 0 0' }}>
            {filtered.length} requests · {pending} pending (polling every 8s)
          </p>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all','pending','safe','unsafe'].map(f => {
            const count = f === 'all' ? requests.length : requests.filter(r => r.status === f).length
            const active = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                  background:   active ? '#0ea5e9' : btnBg,
                  borderColor:  active ? '#0ea5e9' : btnBorder,
                  color:        active ? '#fff'    : sc }}>
                {f.charAt(0).toUpperCase() + f.slice(1)} {count > 0 ? `(${count})` : ''}
              </button>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${thBorder}` }}>
                {['Request ID','Method','Path','Attack Type','Confidence','Status','Time',''].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.71rem', fontWeight: 600, color: sc, textTransform: 'uppercase', letterSpacing: '0.04em', background: thBg, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.request_id}
                  style={{ borderBottom: `1px solid ${rowBorder}`, background: i % 2 === 0 ? rowEven : rowOdd, cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = hoverRow}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? rowEven : rowOdd}>
                  <td style={{ padding: '11px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.73rem', color: sc }}>{r.request_id}</td>
                  <td style={{ padding: '11px 14px' }}><Pill method={r.method} /></td>
                  <td style={{ padding: '11px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.74rem', color: pathColor, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.path}</td>
                  <td style={{ padding: '11px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.71rem', color: '#6366f1' }}>{r.attack_vector}</td>
                  <td style={{ padding: '11px 14px', minWidth: 140 }}><ConfBar score={r.confidence_score} /></td>
                  <td style={{ padding: '11px 14px' }}><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td style={{ padding: '11px 14px', fontSize: '0.73rem', color: sc, whiteSpace: 'nowrap' }}>{relTime(r.timestamp)}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <button onClick={() => setSelected(r)}
                      style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${btnBorder}`, background: btnBg, color: btnColor, cursor: 'pointer', fontSize: '0.77rem', fontWeight: 500 }}
                      onMouseEnter={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.color = '#0ea5e9' }}
                      onMouseLeave={e => { e.target.style.borderColor = btnBorder; e.target.style.color = btnColor }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: emptyColor, fontSize: '0.85rem' }}>No requests match this filter</div>
          )}
        </div>
      </div>

      <RequestModal request={selected} onClose={() => setSelected(null)} onSafe={handleSafe} onUnsafe={handleUnsafe} />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </motion.div>
  )
}
