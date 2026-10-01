import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeroBell, HeroCheck } from '@/components/icons/HeroIcons'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { dataService } from '@/lib/dataService'
import type { Notification } from '@/types/database'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

export interface NotificationBellProps {
  /** 'anchor' = dropdown menempel tombol (desktop); 'header' = panel fixed di bawah mobile header */
  panelMode?: 'anchor' | 'header'
  className?: string
}

/**
 * Lonceng notifikasi + dropdown.
 * Dipakai bersama oleh Topbar (desktop) dan MobileAppHeader (mobile) agar tidak ada
 * dua implementasi notifikasi terpisah (temuan Finding-09).
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({
  panelMode = 'anchor',
  className,
}) => {
  const { user, currentOrganization } = useAuth()
  const { success } = useToast()
  const navigate = useNavigate()

  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user?.id) {
      dataService.getNotifications(user.id, currentOrganization?.id).then(setNotifications)
    }
  }, [user?.id, currentOrganization?.id])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
        setShowNotifications(false)
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNotifications(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [])

  const markNotificationRead = async (id: string) => {
    await dataService.markNotificationAsRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  const markAllAsRead = async () => {
    for (const n of notifications) {
      if (!n.is_read) await dataService.markNotificationAsRead(n.id)
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    success('Notifikasi', 'Semua notifikasi ditandai telah dibaca')
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className={cn('relative inline-flex items-center shrink-0', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setShowNotifications((prev) => !prev)}
        aria-label={t.topbar.notifications}
        aria-expanded={showNotifications}
        className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-fg-muted hover:text-fg hover:bg-hover-bg transition-colors relative cursor-pointer shrink-0"
      >
        <HeroBell className="w-5 h-5 shrink-0" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-surface" />
        )}
      </button>

      {showNotifications && (
        <NotificationPanel
          panelMode={panelMode}
          unreadCount={unreadCount}
          notifications={notifications}
          onMarkAllRead={markAllAsRead}
          onItemClick={(n) => {
            markNotificationRead(n.id)
            if (n.link) navigate(n.link)
            setShowNotifications(false)
          }}
        />
      )}
    </div>
  )
}
interface NotificationPanelProps {
  panelMode: 'anchor' | 'header'
  unreadCount: number
  notifications: Notification[]
  onMarkAllRead: () => void
  onItemClick: (n: Notification) => void
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  panelMode,
  unreadCount,
  notifications,
  onMarkAllRead,
  onItemClick,
}) => (
  <div
    className={cn(
      'rounded-xl shadow-xl overflow-hidden z-50 animate-scale-in bg-surface ring-1 ring-line',
      panelMode === 'anchor'
        ? 'absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1rem)]'
        : 'fixed left-3 right-3 top-[max(3.75rem,calc(3.5rem+env(safe-area-inset-top)))] max-h-[70vh] overflow-y-auto'
    )}
  >
    <div className="px-4 py-3 flex items-center justify-between bg-surface-muted border-b border-line-divider">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-fg">{t.topbar.notifications}</span>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
            {unreadCount} baru
          </span>
        )}
      </div>

      {unreadCount > 0 && (
        <button
          type="button"
          onClick={onMarkAllRead}
          className="text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 cursor-pointer min-h-[32px]"
        >
          <HeroCheck className="w-3.5 h-3.5" />
          {t.topbar.markAllRead}
        </button>
      )}
    </div>

    <div className="divide-y divide-line-row max-h-80 overflow-y-auto">
      {notifications.length === 0 ? (
        <div className="p-6 text-center text-xs text-fg-muted">
          Tidak ada notifikasi aktif saat ini.
        </div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => onItemClick(n)}
            className={cn(
              'p-3.5 hover:bg-hover-bg transition-colors cursor-pointer',
              !n.is_read && 'bg-amber-50/40 dark:bg-amber-500/5'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-fg truncate">{n.title}</p>
              <span className="text-[11px] text-fg-muted whitespace-nowrap">
                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">{n.message}</p>
          </div>
        ))
      )}
    </div>
  </div>
)
