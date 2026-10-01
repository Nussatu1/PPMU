import React from 'react'
import {
  HeroChevronLeft,
  HeroChevronRight,
  HeroMagnifyingGlass,
  HeroQuestionMarkCircle,
} from '@/components/icons/HeroIcons'
import { useHelp } from '@/context/HelpContext'
import { t } from '@/i18n'
import { Tooltip } from '@/components/ui/Tooltip'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'
import {
  HierarchicalOrganizationSelector,
  OrganizationScopeSwitcher,
} from '@/components/organization'

interface TopbarProps {
  isSidebarCollapsed: boolean
  onToggleSidebarCollapse: () => void
  onOpenGlobalSearch: () => void
}

/**
 * Topbar khusus desktop (>= lg).
 * Seluruh kontrol mobile (tombol kembali, hamburger, judul halaman) dipindahkan ke
 * MobileAppHeader agar tidak lagi menjadi dead code di dalam komponen ini.
 */
export const Topbar: React.FC<TopbarProps> = ({
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenGlobalSearch,
}) => {
  const { openHelp } = useHelp()

  return (
    <header className="hidden lg:flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 shrink-0 sticky top-0 z-20 bg-topbar transition-colors border-b border-line/40">
      {/* Left: Sidebar Toggle & Global Search */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
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

        <button
          type="button"
          onClick={onOpenGlobalSearch}
          className="hidden md:flex items-center gap-2.5 rounded-lg bg-input-bg ring-1 ring-line-strong px-3 py-1.5 text-xs text-fg-muted hover:bg-hover-bg transition w-36 lg:w-48 xl:w-56 cursor-pointer shadow-sm"
        >
          <HeroMagnifyingGlass className="w-4 h-4 shrink-0 text-fg-muted" />
          <span className="flex-1 text-left truncate">{t.topbar.searchButton}</span>
          <kbd className="hidden sm:inline-flex items-center rounded bg-surface ring-1 ring-line px-1.5 py-0.5 text-[11px] font-medium text-fg-muted shadow-xs">
            ⌘ K
          </kbd>
        </button>
      </div>

      {/* Center: Context Hierarchy & Scope */}
      <div className="flex items-center gap-2 shrink-0">
        <HierarchicalOrganizationSelector compact />
        <OrganizationScopeSwitcher size="sm" />
      </div>

      {/* Right: Notifikasi, Bantuan, Profil */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <NotificationBell />

        <div className="hidden lg:inline-flex items-center shrink-0">
          <Tooltip content="Bantuan halaman ini" placement="bottom">
            <button
              type="button"
              aria-label="Bantuan halaman ini"
              onClick={() => openHelp()}
              className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-fg-muted hover:text-fg hover:bg-hover-bg transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <HeroQuestionMarkCircle className="w-5 h-5 shrink-0" />
            </button>
          </Tooltip>
        </div>

        <div className="h-6 w-px bg-line shrink-0 mx-1 sm:mx-1.5" aria-hidden="true" />

        <UserMenu />
      </div>
    </header>
  )
}
