import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import StatCard from '../components/StatCard'
import GlobeCanvas from '../components/GlobeCanvas'
import RequestModal from '../components/RequestModal'
import Toast from '../components/Toast'
import { mockRequests as initial } from '../data/mockRequests'
import { trafficLast24h, trafficLast7d, attackBreakdown, topSourceIPs } from '../data/mockTraffic'
import { useThemeContext } from '../context/ThemeContext'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

function ConfBar({ score }) {
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="conf-bar-wrap">
      <div className="conf-bar-track" style={{ flex: 1 }}>
        <div className="conf-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span style={{ fontSize: '0.75rem', color, fontWeight: 600, width: 38, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{score}%</span>
    </div>
  )
}

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

function MethodBadge({ method }) {
  const cls = method === 'POST' ? 'badge-post' : method === 'GET' ? 'badge-get' : 'badge-put'
  return <span className={`badge ${cls}`}>{method}</span>
}

function relTime(ts) {
  const d = Date.now() - ts
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`
  return `${Math.floor(d / 3600000)}h ago`
}

export default function DashboardPage() {
  const [requests, setRequests] = useState(initial)
  const [tab, setTab] = useState('24H')
  const [traffic, setTraffic] = useState(trafficLast24h)
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)
  const { isDark } = useThemeContext()

  const D = isDark
  const pending = requests.filter(r => r.status === 'pending').length

  useEffect(() => {
    setTraffic(tab === '24H' ? [...trafficLast24h] : [...trafficLast7d])
  }, [tab])

  useEffect(() => {
    const t = setInterval(() => {
      setTraffic(prev => {
        const next = [...prev.slice(1), {
          label: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }),
          total: Math.floor(300 + Math.random() * 400),
          blocked: Math.floor(40 + Math.random() * 80),
          allowed: Math.floor(260 + Math.random() * 320),
        }]
        return next
      })
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const handleSafe = (id) => {
    setRequests(prev => prev.map(r => r.request_id === id ? { ...r, status: 'safe' } : r))
    setToast({ msg: 'Marked as safe — saved for model training', type: 'success' })
  }

  const handleUnsafe = (id, vec) => {
    setRequests(prev => prev.map(r => r.request_id === id ? { ...r, status: 'unsafe', attack_vector: vec.name } : r))
    setToast({ msg: `Labeled as ${vec.name}`, type: 'error' })
  }

  const recent = [...requests].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)

  // Chart colors
  const gridColor = D ? '#1e2d4a' : '#f1f5f9'
  const tickColor = D ? '#64748b' : '#94a3b8'
  const tooltipBg = D ? '#1e2d4a' : '#fff'
  const tooltipBorder = D ? '#1e2d4a' : '#e2e8f0'
  const tc = D ? '#e2e8f0' : '#0f172a'
  const sc = D ? '#64748b' : '#94a3b8'
  const rowEvenBg = D ? '#0d1528' : '#fff'
  const rowOddBg = D ? '#0f1a30' : '#f8fafc'
  const hoverRowBg = D ? '#1a2540' : '#f0f9ff'
  const btnBg = D ? '#0d1528' : '#fff'
  const btnBorder = D ? '#1e2d4a' : '#e2e8f0'
  const btnColor = D ? '#e2e8f0' : '#374151'
  const barTrackBg = D ? '#1e2d4a' : '#f1f5f9'

  const CTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <p style={{ margin: '0 0 5px', fontSize: '0.75rem', color: sc, fontWeight: 500 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ margin: '2px 0', fontSize: '0.78rem', color: p.stroke || p.fill, fontWeight: 600 }}>
            {p.name}: {Number(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: tc, margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: '0.78rem', color: sc, margin: '3px 0 0' }}>SmartWAF › Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ background: D ? '#3b0f0f' : '#fee2e2', color: D ? '#f87171' : '#991b1b', borderRadius: 999, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700 }}>
            BLOCK MODE
          </span>
          <span style={{ fontSize: '0.8rem', color: sc }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="stats-grid">
        {[
          { title: 'Total Requests', value: 48291, color: '#0ea5e9', trend: { positive: true, text: '+12% from yesterday' } },
          { title: 'Blocked', value: 3847, color: '#ef4444', trend: { positive: false, text: '+8% this hour' } },
          { title: 'Allowed', value: 44444, color: '#10b981', trend: { positive: true, text: '98.5% pass rate' } },
          { title: 'Pending Review', value: pending, color: '#f59e0b', trend: { positive: false, text: 'needs attention' } },
          { title: 'AI Confidence', value: 87.4, unit: '%', color: '#6366f1', trend: { positive: true, text: '+2.1% accuracy' } },
        ].map(s => (
          <motion.div key={s.title} variants={item}><StatCard {...s} /></motion.div>
        ))}
      </motion.div>

      {/* Traffic chart */}
      <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: tc }}>Request Traffic</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {['24H', '7D'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', background: tab === t ? '#0ea5e9' : btnBg, borderColor: tab === t ? '#0ea5e9' : btnBorder, color: tab === t ? '#fff' : sc }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={traffic} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient>
                <linearGradient id="gAllowed" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.12}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                <linearGradient id="gBlocked" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.12}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.floor(traffic.length / 6)} />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CTooltip />} />
              <Area type="monotone" dataKey="total" name="Total" stroke="#0ea5e9" strokeWidth={2} fill="url(#gTotal)" dot={false} />
              <Area type="monotone" dataKey="allowed" name="Allowed" stroke="#10b981" strokeWidth={1.5} fill="url(#gAllowed)" dot={false} />
              <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#ef4444" strokeWidth={1.5} fill="url(#gBlocked)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Globe + Donut + Top IPs */}
      <div className="three-col-row">
        <div className="card" style={{ padding: '18px', overflow: 'hidden' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '0.88rem', fontWeight: 600, color: tc }}>Global Threat Map</h2>
          <GlobeCanvas />
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[{ country: '🇺🇸 US', val: 525 },{ country: '🇨🇳 CN', val: 495 },{ country: '🇩🇪 DE', val: 257 },{ country: '🇷🇺 RU', val: 133 }].map(r => (
              <div key={r.country} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', color: sc, width: 50 }}>{r.country}</span>
                <div style={{ flex: 1, height: 4, background: barTrackBg, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${(r.val / 525) * 100}%`, height: '100%', background: '#0ea5e9', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: sc, fontFamily: 'JetBrains Mono, monospace', width: 30, textAlign: 'right' }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '0.88rem', fontWeight: 600, color: tc }}>Attack Types</h2>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={attackBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="count" isAnimationActive={false}>
                  {attackBreakdown.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
                <Tooltip content={<CTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {attackBreakdown.map(d => (
              <div key={d.type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.73rem', color: sc, flex: 1 }}>{d.type}</span>
                <span style={{ fontSize: '0.73rem', color: tc, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '18px', overflow: 'hidden' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: '0.88rem', fontWeight: 600, color: tc }}>Top Source IPs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {topSourceIPs.map((r, i) => (
              <div key={r.ip} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 8px', background: i % 2 === 0 ? rowEvenBg : rowOddBg, borderRadius: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.73rem', color: tc, fontWeight: 500 }}>{r.ip}</div>
                  <div style={{ fontSize: '0.68rem', color: sc, marginTop: 1 }}>{r.country} · {r.requests.toLocaleString()} reqs</div>
                </div>
                <span style={{ background: D ? '#3b0f0f' : '#fee2e2', color: D ? '#f87171' : '#991b1b', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                  {r.blocked.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="card" style={{ padding: '20px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 600, color: tc }}>Recent Suspicious Activity</h2>
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${D ? '#1e2d4a' : '#f1f5f9'}` }}>
                {['Request ID','Method','Path','Attack Type','Confidence','Status','Time',''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: sc, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', background: D ? '#0a1525' : 'transparent' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={r.request_id}
                  style={{ borderBottom: `1px solid ${D ? '#1e2d4a' : '#f8fafc'}`, cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = hoverRowBg }}
                  onMouseLeave={e => { e.currentTarget.style.background = '' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: sc }}>{r.request_id}</td>
                  <td style={{ padding: '10px 12px' }}><MethodBadge method={r.method} /></td>
                  <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: D ? '#cbd5e1' : '#374151', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.path}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#6366f1' }}>{r.attack_vector}</td>
                  <td style={{ padding: '10px 12px', minWidth: 130 }}><ConfBar score={r.confidence_score} /></td>
                  <td style={{ padding: '10px 12px' }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: sc, whiteSpace: 'nowrap' }}>{relTime(r.timestamp)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => setSelected(r)}
                      style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${btnBorder}`, background: btnBg, color: btnColor, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.color = '#0ea5e9' }}
                      onMouseLeave={e => { e.target.style.borderColor = btnBorder; e.target.style.color = btnColor }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RequestModal request={selected} onClose={() => setSelected(null)} onSafe={handleSafe} onUnsafe={handleUnsafe} />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </motion.div>
  )
}
