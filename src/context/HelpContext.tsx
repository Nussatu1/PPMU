import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { resolveHelpKey, getHelpContent, type HelpContent } from '@/content/help'

interface HelpContextType {
  isOpen: boolean
  openHelp: (overrideKey?: string) => void
  closeHelp: () => void
  toggleHelp: () => void
  activeKey: string
  routeKey: string
  currentContent: HelpContent | undefined
  viewHelpKey: (key: string) => void
  resetToCurrentRoute: () => void
  isViewingRelated: boolean
}

const HelpContext = createContext<HelpContextType | undefined>(undefined)

export const HelpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [overrideKey, setOverrideKey] = useState<string | null>(null)

  // Compute active key according to current route
  const routeKey = useMemo(() => resolveHelpKey(location.pathname), [location.pathname])

  // When route changes, if panel is open, update content automatically (Tahap 4.1)
  useEffect(() => {
    setOverrideKey(null)
  }, [location.pathname])

  const activeKey = overrideKey || routeKey
  const currentContent = useMemo(() => getHelpContent(activeKey), [activeKey])
  const isViewingRelated = activeKey !== routeKey

  const openHelp = useCallback((customKey?: string) => {
    if (customKey) {
      setOverrideKey(customKey)
    } else {
      setOverrideKey(null)
    }
    setIsOpen(true)
  }, [])

  const closeHelp = useCallback(() => {
    setIsOpen(false)
    setOverrideKey(null)
  }, [])

  const toggleHelp = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        setOverrideKey(null)
        return false
      }
      return true
    })
  }, [])

  const viewHelpKey = useCallback((key: string) => {
    setOverrideKey(key)
  }, [])

  const resetToCurrentRoute = useCallback(() => {
    setOverrideKey(null)
  }, [])

  // Keyboard shortcut: Press '?' when not in an input/textarea/select/editable element
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null
        if (!target) return
        const tagName = target.tagName.toUpperCase()
        const isEditable = target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
        if (!isEditable) {
          e.preventDefault()
          toggleHelp()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleHelp])

  return (
    <HelpContext.Provider
      value={{
        isOpen,
        openHelp,
        closeHelp,
        toggleHelp,
        activeKey,
        routeKey,
        currentContent,
        viewHelpKey,
        resetToCurrentRoute,
        isViewingRelated,
      }}
    >
      {children}
    </HelpContext.Provider>
  )
}

export const useHelp = (): HelpContextType => {
  const context = useContext(HelpContext)
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider')
  }
  return context
}
