import { createContext, useContext } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
export type Accent = 'amber' | 'cyan' | 'violet' | 'rose'

export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: 'amber', label: 'Amber', swatch: '#f59e0b' },
  { id: 'cyan', label: 'Cyan', swatch: '#06b6d4' },
  { id: 'violet', label: 'Violet', swatch: '#8b5cf6' },
  { id: 'rose', label: 'Rose', swatch: '#f43f5e' },
]

export interface ThemePrefs {
  mode: ThemeMode
  accent: Accent
}

// Same key and defaults as the inline script in index.html (which applies them before first paint).
const STORAGE_KEY = 'my-meters:theme'
const DEFAULTS: ThemePrefs = { mode: 'system', accent: 'amber' }
const SURFACE = { light: '#eef2f6', dark: '#090d13' }

export function loadThemePrefs(): ThemePrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<ThemePrefs>
    return {
      mode: saved.mode === 'light' || saved.mode === 'dark' ? saved.mode : DEFAULTS.mode,
      accent: ACCENTS.some((a) => a.id === saved.accent) ? (saved.accent as Accent) : DEFAULTS.accent,
    }
  } catch {
    return DEFAULTS
  }
}

export function saveThemePrefs(prefs: ThemePrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // storage blocked: the choice just won't be remembered
  }
}

export const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function applyTheme(prefs: ThemePrefs) {
  const dark = prefs.mode === 'dark' || (prefs.mode === 'system' && systemPrefersDark())
  const root = document.documentElement
  root.dataset.theme = dark ? 'dark' : 'light'
  root.dataset.accent = prefs.accent
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? SURFACE.dark : SURFACE.light)
}

export interface ThemeState extends ThemePrefs {
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: Accent) => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
