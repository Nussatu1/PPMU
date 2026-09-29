import React, { createContext, useContext, useState, useCallback } from 'react'
import { HeroCheckCircle, HeroExclamationTriangle, HeroExclamationCircle, HeroInformationCircle, HeroXMark } from '@/components/icons/HeroIcons'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastContextType {
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = crypto.randomUUID()
      const duration = toast.duration ?? 4000
      const newToast: ToastItem = { ...toast, id }
      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  const success = useCallback((title: string, description?: string) => {
    addToast({ type: 'success', title, description })
  }, [addToast])

  const error = useCallback((title: string, description?: string) => {
    addToast({ type: 'error', title, description })
  }, [addToast])

  const warning = useCallback((title: string, description?: string) => {
    addToast({ type: 'warning', title, description })
  }, [addToast])

  const info = useCallback((title: string, description?: string) => {
    addToast({ type: 'info', title, description })
  }, [addToast])

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return (
          <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <HeroCheckCircle className="w-5 h-5" />
          </div>
        )
      case 'error':
        return (
          <div className="p-1.5 rounded-lg bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
            <HeroExclamationCircle className="w-5 h-5" />
          </div>
        )
      case 'warning':
        return (
          <div className="p-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <HeroExclamationTriangle className="w-5 h-5" />
          </div>
        )
      case 'info':
        return (
          <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <HeroInformationCircle className="w-5 h-5" />
          </div>
        )
    }
  }

  return (
    <ToastContext.Provider value={{ addToast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex items-start gap-3 p-4 bg-surface rounded-xl shadow-xl ring-1 ring-line animate-scale-in transition-all"
          >
            {getIcon(t.type)}
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="text-sm font-semibold text-fg">{t.title}</h4>
              {t.description && (
                <p className="text-xs text-fg-muted mt-1 leading-relaxed break-words">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-fg-muted hover:text-fg hover:bg-hover-bg p-1 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Tutup notifikasi"
            >
              <HeroXMark className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
