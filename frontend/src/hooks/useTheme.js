import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('ng-theme') || 'light'
  )

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('ng-theme', theme)
  }, [theme])

  const toggle = () =>
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  const isDark = theme === 'dark'

  return { theme, isDark, toggle }
}
