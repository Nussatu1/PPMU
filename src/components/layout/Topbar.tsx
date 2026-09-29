import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HeroBars3,
  HeroChevronLeft,
  HeroChevronRight,
  HeroMagnifyingGlass,
  HeroBell,
  HeroQuestionMarkCircle,
  HeroCheck,
  HeroMoon,
  HeroSun,
  HeroComputerDesktop,
  HeroArrowRightStartOnRectangle,
} from '@/components/icons/HeroIcons'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/context/ToastContext'
import { useHelp } from '@/context/HelpContext'
import { dataService } from '@/lib/dataService'
import type { Notification } from '@/types/database'
import { t } from '@/i18n'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

interface TopbarProps {
  onToggleMobileSidebar: () => void
  isSidebarCollapsed: boolean
  onToggleSidebarCollapse: () => void
  onOpenGlobalSearch: () => void
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleMobileSidebar,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenGlobalSearch,
}) => {
  const { user, currentOrganization, logout } = useAuth()
  const { theme, mode, setMode } = useTheme()
  const { success } = useToast()
  const { openHelp } = useHelp()
  const navigate = useNavigate()

  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  const notificationRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Fetch real notifications for this user / organization
  useEffect(() => {
    if (user?.id) {
      dataService.getNotifications(user.id, currentOrganization?.id).then(setNotifications)
    }
  }, [user?.id, currentOrganization?.id])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserDropdown(false)
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false)
        setShowUserDropdown(false)
      }
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
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
  }

  const markAllAsRead = async () => {
    for (const n of notifications) {
      if (!n.is_read) {
        await dataService.markNotificationAsRead(n.id)
      }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    success('Notifikasi', 'Semua notifikasi ditandai telah dibaca')
  }

  const handleLogout = async () => {
    setShowUserDropdown(false)
    await logout()
    success(t.topbar.loggedOutSuccess, '')
    navigate('/login')
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const userInitial = user?.name?.[0]?.toUpperCase() || 'A'

  return (
    <header
      className="h-16 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 shrink-0 sticky top-0 z-20 bg-topbar shadow-sm ring-1 ring-line transition-colors"
    >
      {/* Left: Sidebar Toggles & Global Search */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 text-fg-muted hover:text-fg hover:bg-hover-bg rounded-lg transition-colors cursor-pointer"
          aria-label="Open sidebar"
        >
          <HeroBars3 className="w-5 h-5" />
        </button>

        {/* Desktop sidebar toggle */}
        <Tooltip content={isSidebarCollapsed ? 'Buka bilah samping' : 'Tutup bilah samping'}>
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            aria-label={isSidebarCollapsed ? 'Buka bilah samping' : 'Tutup bilah samping'}
            className="hidden lg:flex p-2 text-fg-muted hover:text-fg hover:bg-hover-bg rounded-lg transition-colors cursor-pointer"
          >
            {isSidebarCollapsed ? (
              <HeroChevronRight className="w-5 h-5" />
            ) : (
              <HeroChevronLeft className="w-5 h-5" />
            )}
          </button>
        </Tooltip>

        {/* Global Search button */}
        <button
          type="button"
          onClick={onOpenGlobalSearch}
          className="hidden md:flex items-center gap-2.5 rounded-lg bg-input-bg ring-1 ring-line-strong px-3 py-1.5 text-xs text-fg-muted hover:bg-hover-bg transition w-36 lg:w-56 cursor-pointer shadow-sm"
        >
          <HeroMagnifyingGlass className="w-4 h-4 shrink-0 text-fg-muted" />
          <span className="flex-1 text-left truncate">{t.topbar.searchButton}</span>
          <kbd className="hidden sm:inline-flex items-center rounded bg-surface ring-1 ring-line px-1.5 py-0.5 text-[10px] font-medium text-fg-muted shadow-xs">
            ⌘ K
          </kbd>
        </button>
      </div>

      {/* Right: Actions & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2">

        {/* Database Notifications Popover (Bell) */}
        <div className="relative inline-flex items-center shrink-0" ref={notificationRef}>
          <Tooltip content={t.topbar.notifications}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label={t.topbar.notifications}
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-hover-bg transition-colors relative cursor-pointer shrink-0"
            >
              <HeroBell className="w-5 h-5 shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-surface" />
              )}
            </button>
          </Tooltip>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl shadow-xl overflow-hidden z-50 animate-scale-in bg-surface ring-1 ring-line">
              <div className="px-4 py-3 flex items-center justify-between bg-surface-muted border-b border-line-divider">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-fg">
                    {t.topbar.notifications}
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
                      {unreadCount} baru
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 cursor-pointer"
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
                      onClick={() => {
                        markNotificationRead(n.id)
                        if (n.link) navigate(n.link)
                        setShowNotifications(false)
                      }}
                      className={`p-3.5 hover:bg-hover-bg transition-colors cursor-pointer ${
                        !n.is_read ? 'bg-amber-50/40 dark:bg-amber-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-fg truncate">
                          {n.title}
                        </p>
                        <span className="text-[10px] text-fg-muted whitespace-nowrap">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Question Mark / Bantuan Trigger */}
        <div className="inline-flex items-center shrink-0">
          <Tooltip content="Bantuan halaman ini" placement="bottom">
            <button
              type="button"
              aria-label="Bantuan halaman ini"
              onClick={() => openHelp()}
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-fg-subtle hover:text-fg-muted hover:bg-hover-bg transition-colors cursor-pointer shrink-0"
            >
              <HeroQuestionMarkCircle className="w-5 h-5 shrink-0" />
            </button>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-line shrink-0 mx-1 sm:mx-1.5" aria-hidden="true" />

        {/* User Profile & Preferences Menu */}
        <div className="relative inline-flex items-center shrink-0" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserDropdown((prev) => !prev)}
            className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer group"
            aria-label="Menu profil dan preferensi tema"
            aria-expanded={showUserDropdown}
          >
            {user?.avatar_url && !avatarError ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                onError={() => setAvatarError(true)}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-line shadow-xs group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                {userInitial}
              </div>
            )}
            {/* Icon Mode Dark / Light / Sistem Terintegrasi dalam Avatar */}
            <span
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-surface ring-1 ring-line flex items-center justify-center shadow-xs"
              title={
                mode === 'system'
                  ? `Mode Sistem (${theme === 'dark' ? 'Gelap' : 'Terang'})`
                  : mode === 'dark'
                  ? 'Mode Dark'
                  : 'Mode Light'
              }
            >
              {mode === 'system' ? (
                <HeroComputerDesktop className="w-2 h-2 text-fg-muted" />
              ) : mode === 'dark' ? (
                <HeroMoon className="w-2 h-2 text-amber-400" />
              ) : (
                <HeroSun className="w-2 h-2 text-amber-500" />
              )}
            </span>
          </button>

          {/* User Dropdown Menu */}
          {showUserDropdown && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl shadow-xl overflow-hidden z-50 animate-scale-in bg-surface ring-1 ring-line">
              {/* Profile Info Header */}
              <div className="px-4 py-3 bg-surface-muted border-b border-line-divider">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user?.avatar_url && !avatarError ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        onError={() => setAvatarError(true)}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-line shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-xs shrink-0">
                        {userInitial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-fg truncate">
                        {user?.name || 'Administrator'}
                      </p>
                      <p className="text-[11px] text-fg-muted truncate mt-0.5">
                        {user?.email || 'admin@filamentphp.com'}
                      </p>
                    </div>
                  </div>
                  <span
                    className="shrink-0 p-1.5 rounded-lg bg-surface ring-1 ring-line flex items-center justify-center"
                    title={
                      mode === 'system'
                        ? `Mode Sistem (${theme === 'dark' ? 'Gelap' : 'Terang'})`
                        : mode === 'dark'
                        ? 'Mode Dark'
                        : 'Mode Light'
                    }
                  >
                    {mode === 'system' ? (
                      <HeroComputerDesktop className="w-3.5 h-3.5 text-fg-muted" />
                    ) : mode === 'dark' ? (
                      <HeroMoon className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <HeroSun className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 uppercase tracking-wider">
                    {user?.is_superadmin ? 'SUPERADMIN' : user?.role}
                  </span>
                  {currentOrganization && (
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-surface-muted text-fg-muted ring-1 ring-inset ring-line-strong truncate max-w-[140px]">
                      {currentOrganization.code}
                    </span>
                  )}
                </div>
              </div>

              {/* Theme Modes (Dark, Light, Sistem) in 1 row without labels */}
              <div className="p-2 border-b border-line-divider">
                <div className="flex items-center justify-center p-1 rounded-lg bg-surface-muted ring-1 ring-line gap-1">
                  {/* Dark Mode */}
                  <button
                    type="button"
                    onClick={() => setMode('dark')}
                    aria-label="Mode Gelap (Dark)"
                    title="Dark"
                    className={cn(
                      'flex-1 flex items-center justify-center py-1.5 rounded-md transition-all cursor-pointer',
                      mode === 'dark'
                        ? 'bg-surface text-amber-400 shadow-xs ring-1 ring-line'
                        : 'text-fg-muted hover:text-fg hover:bg-surface/50'
                    )}
                  >
                    <HeroMoon className="w-4 h-4" />
                  </button>

                  {/* Light Mode */}
                  <button
                    type="button"
                    onClick={() => setMode('light')}
                    aria-label="Mode Terang (Light)"
                    title="Light"
                    className={cn(
                      'flex-1 flex items-center justify-center py-1.5 rounded-md transition-all cursor-pointer',
                      mode === 'light'
                        ? 'bg-surface text-amber-500 shadow-xs ring-1 ring-line'
                        : 'text-fg-muted hover:text-fg hover:bg-surface/50'
                    )}
                  >
                    <HeroSun className="w-4 h-4" />
                  </button>

                  {/* Sistem Mode */}
                  <button
                    type="button"
                    onClick={() => setMode('system')}
                    aria-label="Mode Sistem"
                    title="Sistem"
                    className={cn(
                      'flex-1 flex items-center justify-center py-1.5 rounded-md transition-all cursor-pointer',
                      mode === 'system'
                        ? 'bg-surface text-amber-500 shadow-xs ring-1 ring-line'
                        : 'text-fg-muted hover:text-fg hover:bg-surface/50'
                    )}
                  >
                    <HeroComputerDesktop className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Logout Action */}
              <div className="p-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                >
                  <HeroArrowRightStartOnRectangle className="w-4 h-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
