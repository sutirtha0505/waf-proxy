import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts'
import { rangeDataMap, attackBreakdown, confidenceBuckets } from '../data/mockTraffic'
import { useThemeContext } from '../context/ThemeContext'

const RANGES = ['1H','6H','24H','7D','30D']

const AttackByPeriod = Object.fromEntries(
  RANGES.map(r => [r, attackBreakdown.map((a, i) => ({ ...a, count: Math.max(10, a.count + Math.floor(Math.sin(RANGES.indexOf(r) * i + 1) * 80)) }))])
)

export default function AnalyticsPage() {
  const [range, setRange] = useState('24H')
  const { isDark } = useThemeContext()
  const data = rangeDataMap[range] || rangeDataMap['24H']

  const D = isDark
  const gridColor = D ? '#1e2d4a' : '#f1f5f9'
  const tickColor = D ? '#64748b' : '#94a3b8'
  const tc = D ? '#e2e8f0' : '#0f172a'
  const sc = D ? '#64748b' : '#94a3b8'
  const tooltipBg = D ? '#1e2d4a' : '#fff'
  const tooltipBorder = D ? '#1e2d4a' : '#e2e8f0'
  const btnBg = D ? '#0d1528' : '#fff'
  const btnBorder = D ? '#1e2d4a' : '#e2e8f0'

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: tc, margin: 0 }}>Analytics</h1>
          <p style={{ fontSize: '0.78rem', color: sc, margin: '3px 0 0' }}>SmartWAF › Analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', background: range === r ? '#0ea5e9' : btnBg, borderColor: range === r ? '#0ea5e9' : btnBorder, color: range === r ? '#fff' : sc }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Large area chart */}
      <div className="card" style={{ padding: '20px', marginBottom: 18 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 600, color: tc }}>Request Volume — {range}</h2>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="at" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient>
                <linearGradient id="aa" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.12}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                <linearGradient id="ab" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.12}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.floor(data.length / 7)} />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: 8, color: sc }} />
              <Area type="monotone" dataKey="total" name="Total" stroke="#0ea5e9" strokeWidth={2} fill="url(#at)" dot={false} />
              <Area type="monotone" dataKey="allowed" name="Allowed" stroke="#10b981" strokeWidth={1.5} fill="url(#aa)" dot={false} />
              <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#ef4444" strokeWidth={1.5} fill="url(#ab)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar + Pie side by side */}
      <div className="two-panel-row">
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 600, color: tc }}>Attacks by Type</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={AttackByPeriod[range]} barSize={20} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="type" tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CTooltip />} />
                <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                  {AttackByPeriod[range].map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 600, color: tc }}>Category Share</h2>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={attackBreakdown} cx="50%" cy="50%" outerRadius={85} dataKey="count" isAnimationActive={false}>
                  {attackBreakdown.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
                <Tooltip content={<CTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {attackBreakdown.map(d => (
              <div key={d.type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                <span style={{ fontSize: '0.7rem', color: sc }}>{d.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confidence distribution */}
      <div className="card" style={{ padding: '20px' }}>
        <h2 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 600, color: tc }}>AI Confidence Score Distribution</h2>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confidenceBuckets} barSize={36} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="range" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CTooltip />} />
              <Bar dataKey="count" name="Requests" radius={[4, 4, 0, 0]}>
                {confidenceBuckets.map((_, i) => <Cell key={i} fill={['#10b981','#10b981','#f59e0b','#f97316','#ef4444'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}
