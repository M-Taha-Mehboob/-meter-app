import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, loadThemePrefs, saveThemePrefs, ThemeContext, type ThemePrefs, type ThemeState } from './theme'

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ThemePrefs>(loadThemePrefs)

  useEffect(() => {
    applyTheme(prefs)
    saveThemePrefs(prefs)
    if (prefs.mode !== 'system') return
    // Follow the phone's dark mode switch live.
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(prefs)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [prefs])

  const value = useMemo<ThemeState>(
    () => ({
      ...prefs,
      setMode: (mode) => setPrefs((p) => ({ ...p, mode })),
      setAccent: (accent) => setPrefs((p) => ({ ...p, accent })),
    }),
    [prefs],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
