import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HeroMoon,
  HeroSun,
  HeroComputerDesktop,
  HeroArrowRightStartOnRectangle,
} from '@/components/icons/HeroIcons'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/context/ToastContext'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

export interface UserMenuProps {
  /** 'anchor' = dropdown menempel avatar (desktop); 'header' = panel fixed di bawah mobile header */
  panelMode?: 'anchor' | 'header'
  className?: string
}

/**
 * Menu profil & preferensi (mode tema + logout).
 * Ini satu-satunya jalur logout aplikasi, sehingga wajib tersedia di desktop maupun mobile.
 */
export const UserMenu: React.FC<UserMenuProps> = ({ panelMode = 'anchor', className }) => {
  const { user, currentOrganization, logout } = useAuth()
  const { theme, mode, setMode } = useTheme()
  const { success } = useToast()
  const navigate = useNavigate()

  const [showDropdown, setShowDropdown] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
        setShowDropdown(false)
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [])

  const handleLogout = async () => {
    setShowDropdown(false)
    await logout()
    success(t.topbar.loggedOutSuccess, '')
    navigate('/login')
  }

  const userInitial = user?.name?.[0]?.toUpperCase() || 'A'
  const modeLabel =
    mode === 'system'
      ? `Mode Sistem (${theme === 'dark' ? 'Gelap' : 'Terang'})`
      : mode === 'dark'
      ? 'Mode Dark'
      : 'Mode Light'

  const modeButtonClass = (isActive: boolean, activeColor: string) =>
    cn(
      'flex-1 flex items-center justify-center py-2.5 rounded-md transition-all cursor-pointer min-h-[44px]',
      isActive
        ? `bg-surface ${activeColor} shadow-xs ring-1 ring-line`
        : 'text-fg-muted hover:text-fg hover:bg-surface/50'
    )

  const modeIcon =
    mode === 'system' ? (
      <HeroComputerDesktop className="w-3.5 h-3.5 text-fg-muted" />
    ) : mode === 'dark' ? (
      <HeroMoon className="w-3.5 h-3.5 text-amber-400" />
    ) : (
      <HeroSun className="w-3.5 h-3.5 text-amber-500" />
    )

  return (
    <div className={cn('relative inline-flex items-center shrink-0', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setShowDropdown((prev) => !prev)}
        className="relative min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:ring-amber-500/50 cursor-pointer group"
        aria-label="Menu profil dan preferensi tema"
        aria-expanded={showDropdown}
      >
        <div className="relative">
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
          <span
            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-surface ring-1 ring-line flex items-center justify-center shadow-xs"
            title={modeLabel}
          >
            {mode === 'system' ? (
              <HeroComputerDesktop className="w-2 h-2 text-fg-muted" />
            ) : mode === 'dark' ? (
              <HeroMoon className="w-2 h-2 text-amber-400" />
            ) : (
              <HeroSun className="w-2 h-2 text-amber-500" />
            )}
          </span>
        </div>
      </button>

      {showDropdown && (
        <UserMenuPanel
          panelMode={panelMode}
          userInitial={userInitial}
          modeLabel={modeLabel}
          modeIcon={modeIcon}
          mode={mode}
          setMode={setMode}
          onLogout={handleLogout}
          avatarError={avatarError}
          onAvatarError={() => setAvatarError(true)}
          user={user}
          organizationCode={currentOrganization?.code}
          modeButtonClass={modeButtonClass}
        />
      )}
    </div>
  )
}


interface UserMenuPanelProps {
  panelMode: 'anchor' | 'header'
  userInitial: string
  modeLabel: string
  modeIcon: React.ReactNode
  mode: string
  setMode: (m: 'dark' | 'light' | 'system') => void
  onLogout: () => void
  avatarError: boolean
  onAvatarError: () => void
  user: { name?: string; email?: string; avatar_url?: string; role?: string; is_superadmin?: boolean } | null
  organizationCode?: string
  modeButtonClass: (isActive: boolean, activeColor: string) => string
}

const UserMenuPanel: React.FC<UserMenuPanelProps> = ({
  panelMode,
  userInitial,
  modeLabel,
  modeIcon,
  mode,
  setMode,
  onLogout,
  avatarError,
  onAvatarError,
  user,
  organizationCode,
  modeButtonClass,
}) => (
  <div
    className={cn(
      'rounded-xl shadow-xl overflow-hidden z-50 animate-scale-in bg-surface ring-1 ring-line',
      panelMode === 'anchor'
        ? 'absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1rem)]'
        : 'fixed left-3 right-3 top-[max(3.75rem,calc(3.5rem+env(safe-area-inset-top)))] max-h-[75vh] overflow-y-auto'
    )}
  >
    {/* Profil */}
    <div className="px-4 py-3 bg-surface-muted border-b border-line-divider">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {user?.avatar_url && !avatarError ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              onError={onAvatarError}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-line shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-xs shrink-0">
              {userInitial}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-fg truncate">{user?.name || 'Administrator'}</p>
            <p className="text-[11px] text-fg-muted truncate mt-0.5">
              {user?.email || 'admin@filamentphp.com'}
            </p>
          </div>
        </div>
        <span
          className="shrink-0 p-1.5 rounded-lg bg-surface ring-1 ring-line flex items-center justify-center"
          title={modeLabel}
        >
          {modeIcon}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className="inline-block px-1.5 py-0.5 text-[11px] font-medium rounded bg-surface text-fg-muted ring-1 ring-inset ring-line-strong truncate max-w-[140px]">
          {user?.is_superadmin ? 'SUPERADMIN' : user?.role}
        </span>
        {organizationCode && (
          <span className="inline-block px-1.5 py-0.5 text-[11px] font-medium rounded bg-surface-muted text-fg-muted ring-1 ring-inset ring-line-strong truncate max-w-[140px]">
            {organizationCode}
          </span>
        )}
      </div>
    </div>

    {/* Mode tema */}
    <div className="p-2 border-b border-line-divider">
      <div className="flex items-center justify-center p-1 rounded-lg bg-surface-muted ring-1 ring-line gap-1">
        <button
          type="button"
          onClick={() => setMode('dark')}
          aria-label="Mode Gelap (Dark)"
          title="Dark"
          className={modeButtonClass(mode === 'dark', 'text-amber-400')}
        >
          <HeroMoon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setMode('light')}
          aria-label="Mode Terang (Light)"
          title="Light"
          className={modeButtonClass(mode === 'light', 'text-amber-500')}
        >
          <HeroSun className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setMode('system')}
          aria-label="Mode Sistem"
          title="Sistem"
          className={modeButtonClass(mode === 'system', 'text-amber-500')}
        >
          <HeroComputerDesktop className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Logout */}
    <div className="p-1">
      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left cursor-pointer"
      >
        <HeroArrowRightStartOnRectangle className="w-4 h-4 shrink-0" />
        <span>Logout</span>
      </button>
    </div>
  </div>
)
