import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentColor = 'amber' | 'green'

interface ThemeContextType {
  theme: Theme
  mode: ThemeMode
  accentColor: AccentColor
  setMode: (mode: ThemeMode) => void
  setAccentColor: (color: AccentColor) => void
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    const saved = localStorage.getItem('filament_accent_color')
    if (saved === 'amber' || saved === 'green') {
      return saved as AccentColor
    }
    return 'amber'
  })

  const [mode, setModeState] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem('filament_theme_mode')
    if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
      return savedMode as ThemeMode
    }
    const savedLegacy = localStorage.getItem('filament_theme') || localStorage.getItem('theme')
    if (savedLegacy === 'dark' || savedLegacy === 'light') {
      return savedLegacy as ThemeMode
    }
    return 'system'
  })

  const getSystemTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  const theme: Theme = mode === 'system' ? systemTheme : mode

  useLayoutEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    if (accentColor === 'green') {
      root.classList.add('theme-green')
    } else {
      root.classList.remove('theme-green')
    }
    localStorage.setItem('filament_theme_mode', mode)
    localStorage.setItem('filament_theme', theme)
    localStorage.setItem('filament_accent_color', accentColor)
    localStorage.setItem('theme', theme)
  }, [theme, mode, accentColor])

  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'filament_theme_mode' && (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'system')) {
        setModeState(e.newValue as ThemeMode)
      } else if ((e.key === 'filament_theme' || e.key === 'theme') && (e.newValue === 'light' || e.newValue === 'dark')) {
        setModeState(e.newValue as ThemeMode)
      } else if (e.key === 'filament_accent_color' && (e.newValue === 'amber' || e.newValue === 'green')) {
        setAccentColorState(e.newValue as AccentColor)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
  }

  const setAccentColor = (newColor: AccentColor) => {
    setAccentColorState(newColor)
  }

  const toggleTheme = () => {
    setModeState((prev) => {
      const current = prev === 'system' ? systemTheme : prev
      return current === 'light' ? 'dark' : 'light'
    })
  }

  const setTheme = (t: Theme) => {
    setModeState(t)
  }

  React.useEffect(() => {
    ;(window as any).__filamentSetTheme = setTheme
    ;(window as any).__filamentSetMode = setMode
    ;(window as any).__filamentToggleTheme = toggleTheme
    ;(window as any).__filamentSetAccentColor = setAccentColor
    return () => {
      delete (window as any).__filamentSetTheme
      delete (window as any).__filamentSetMode
      delete (window as any).__filamentToggleTheme
      delete (window as any).__filamentSetAccentColor
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, mode, accentColor, setMode, setAccentColor, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
