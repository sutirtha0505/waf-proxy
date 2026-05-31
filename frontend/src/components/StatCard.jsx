import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useThemeContext } from '../context/ThemeContext'

export default function StatCard({ title, value, unit = '', color = '#0ea5e9', icon, trend }) {
  const [display, setDisplay] = useState(0)
  const { isDark } = useThemeContext()
  const isNum = typeof value === 'number'

  useEffect(() => {
    if (!isNum) return
    let start = null
    const duration = 1200
    let raf

    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(eased * value))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, isNum])

  return (
    <motion.div
      className="card"
      whileHover={{ y: -2, boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.1)' }}
      style={{ padding: '20px', cursor: 'default' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 500, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        {icon && (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color, fontSize: '1rem' }}>{icon}</span>
          </div>
        )}
      </div>

      <div style={{ fontSize: '1.9rem', fontWeight: 700, color: isDark ? '#f0fdf4' : '#0f172a', lineHeight: 1, marginBottom: 8 }}>
        {isNum ? display.toLocaleString() : value}
        {unit && <span style={{ fontSize: '1rem', fontWeight: 500, color, marginLeft: 2 }}>{unit}</span>}
      </div>

      {trend && (
        <p style={{ fontSize: '0.75rem', color: trend.positive ? '#059669' : '#dc2626', margin: 0, fontWeight: 500 }}>
          {trend.positive ? '↑' : '↓'} {trend.text}
        </p>
      )}
    </motion.div>
  )
}
