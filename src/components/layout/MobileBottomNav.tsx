import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  HeroHome,
  HeroMagnifyingGlass,
  HeroSquares2X2,
  HeroQuestionMarkCircle,
  HeroCog6Tooth,
} from '@/components/icons/HeroIcons'
import { useHelp } from '@/context/HelpContext'
import { cn } from '@/lib/utils'

interface MobileBottomNavProps {
  onOpenGlobalSearch: () => void
  onToggleMobileSidebar: () => void
}

/**
 * iOS-Style Bottom Navigation Tab Bar for Mobile Viewports
 * - Strictly hidden on desktop/tablet (lg:hidden)
 * - Safe area aware with backdrop blur & tactile tap feedback
 * - Minimum 44x44px touch target compliance
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenGlobalSearch,
  onToggleMobileSidebar,
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { openHelp } = useHelp()

  const pathname = location.pathname
  const isHome = pathname === '/'
  const isSettings = pathname === '/settings'

  return (
    <nav
      aria-label="Navigasi Bawah Ponsel"
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-surface/90 backdrop-blur-xl border-t border-line/80 shadow-lg select-none pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 transition-colors"
    >
      <div className="flex items-center justify-around px-2 max-w-lg mx-auto">
        {/* 1. Beranda (Home) */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl transition-all cursor-pointer active:scale-90',
            isHome
              ? 'text-primary-600 dark:text-primary-400 font-semibold'
              : 'text-fg-muted hover:text-fg font-normal'
          )}
          aria-label="Beranda"
          aria-current={isHome ? 'page' : undefined}
        >
          <div className="relative">
            <HeroHome className="w-5 h-5 stroke-[1.8]" />
            {isHome && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-600 dark:bg-primary-400" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Beranda</span>
        </button>

        {/* 2. Pencarian (Search) */}
        <button
          type="button"
          onClick={onOpenGlobalSearch}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-fg-muted hover:text-fg transition-all cursor-pointer active:scale-90"
          aria-label="Buka Pencarian"
        >
          <HeroMagnifyingGlass className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] tracking-tight mt-0.5">Cari</span>
        </button>

        {/* 3. Semua Menu / Bilah Samping */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-fg-muted hover:text-fg transition-all cursor-pointer active:scale-90"
          aria-label="Buka Semua Menu"
        >
          <div className="w-7 h-7 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center ring-1 ring-primary-500/20">
            <HeroSquares2X2 className="w-4 h-4 stroke-[2]" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium">Menu</span>
        </button>

        {/* 4. Bantuan (Help) */}
        <button
          type="button"
          onClick={() => openHelp()}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-fg-muted hover:text-fg transition-all cursor-pointer active:scale-90"
          aria-label="Buka Bantuan Panduan"
        >
          <HeroQuestionMarkCircle className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] tracking-tight mt-0.5">Bantuan</span>
        </button>

        {/* 5. Pengaturan (Settings) */}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl transition-all cursor-pointer active:scale-90',
            isSettings
              ? 'text-primary-600 dark:text-primary-400 font-semibold'
              : 'text-fg-muted hover:text-fg font-normal'
          )}
          aria-label="Pengaturan"
          aria-current={isSettings ? 'page' : undefined}
        >
          <div className="relative">
            <HeroCog6Tooth className="w-5 h-5 stroke-[1.8]" />
            {isSettings && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-600 dark:bg-primary-400" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Pengaturan</span>
        </button>
      </div>
    </nav>
  )
}
