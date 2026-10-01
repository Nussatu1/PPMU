import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  HeroHome,
  HeroSquares2X2,
  HeroQuestionMarkCircle,
  HeroCog6Tooth,
} from '@/components/icons/HeroIcons'
import { useHelp } from '@/context/HelpContext'
import { cn } from '@/lib/utils'

interface MobileBottomNavProps {
  className?: string
}

/**
 * Floating Bottom Navigation with Theme-Aware Glassmorphism:
 * - Outer Card: Translucent glass-like surface (bg-surface/75 with backdrop-blur-md)
 * - Edge Definition: Subtle low-contrast border and delicate light ring
 * - Soft Elevation: Gentle ambient shadow for natural separation above page content
 * - Graceful Fallback: Solid-enough opacity if backdrop-filter is unsupported
 * - Active State: Distinct, solid-tint primary capsule sitting on top of glass
 * - Inactive State: Compact 44x44px circular touch target, quiet & accessible
 * - Respects safe-area-inset-bottom and mobile responsive viewports
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { openHelp, isOpen: isHelpOpen } = useHelp()

  const pathname = location.pathname
  const isHome = pathname === '/'
  const isMenu = pathname === '/menu'
  const isSettings = pathname === '/settings'

  return (
    <nav
      aria-label="Navigasi Bawah Ponsel"
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden pointer-events-none flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] px-3 select-none"
    >
      {/* Glassmorphism Floating Pill Container */}
      <div className="pointer-events-auto w-fit max-w-[calc(100vw-1.5rem)] mx-auto bg-surface/85 supports-[backdrop-filter]:bg-surface/70 dark:bg-surface/90 dark:supports-[backdrop-filter]:bg-surface/75 backdrop-blur-md border border-line/80 dark:border-white/10 ring-1 ring-black/[0.03] dark:ring-white/[0.05] shadow-lg shadow-black/[0.06] dark:shadow-black/30 rounded-full p-1.5 flex items-center justify-center gap-1 sm:gap-1.5 transition-all duration-300 ease-out">
        {/* 1. Beranda (Home) */}
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className={cn(
            'h-11 shrink-0 inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer active:scale-95',
            isHome
              ? 'bg-primary-500/15 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-semibold px-3.5 gap-2 shadow-xs'
              : 'w-11 text-fg-muted hover:text-fg hover:bg-surface-muted/60 dark:hover:bg-white/5 font-normal'
          )}
          aria-label="Beranda"
          aria-current={isHome ? 'page' : undefined}
        >
          <HeroHome className="w-5 h-5 shrink-0 stroke-[1.8]" />
          {isHome && (
            <span className="text-xs font-semibold tracking-tight whitespace-nowrap animate-fade-in">
              Beranda
            </span>
          )}
        </button>

        {/* 2. Menu Navigasi Modul (Direct Route ke /menu) */}
        <button
          type="button"
          onClick={() => navigate('/menu', { replace: true })}
          className={cn(
            'h-11 shrink-0 inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer active:scale-95',
            isMenu
              ? 'bg-primary-500/15 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-semibold px-3.5 gap-2 shadow-xs'
              : 'w-11 text-fg-muted hover:text-fg hover:bg-surface-muted/60 dark:hover:bg-white/5 font-normal'
          )}
          aria-label="Menu"
          aria-current={isMenu ? 'page' : undefined}
        >
          <HeroSquares2X2 className="w-5 h-5 shrink-0 stroke-[1.8]" />
          {isMenu && (
            <span className="text-xs font-semibold tracking-tight whitespace-nowrap animate-fade-in">
              Menu
            </span>
          )}
        </button>

        {/* 3. Bantuan (Help) */}
        <button
          type="button"
          onClick={() => openHelp()}
          className={cn(
            'h-11 shrink-0 inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer active:scale-95',
            isHelpOpen
              ? 'bg-primary-500/15 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-semibold px-3.5 gap-2 shadow-xs'
              : 'w-11 text-fg-muted hover:text-fg hover:bg-surface-muted/60 dark:hover:bg-white/5 font-normal'
          )}
          aria-label="Buka Bantuan Panduan"
          aria-expanded={isHelpOpen}
        >
          <HeroQuestionMarkCircle className="w-5 h-5 shrink-0 stroke-[1.8]" />
          {isHelpOpen && (
            <span className="text-xs font-semibold tracking-tight whitespace-nowrap animate-fade-in">
              Bantuan
            </span>
          )}
        </button>

        {/* 4. Pengaturan (Settings) */}
        <button
          type="button"
          onClick={() => navigate('/settings', { replace: true })}
          className={cn(
            'h-11 shrink-0 inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer active:scale-95',
            isSettings
              ? 'bg-primary-500/15 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-semibold px-3.5 gap-2 shadow-xs'
              : 'w-11 text-fg-muted hover:text-fg hover:bg-surface-muted/60 dark:hover:bg-white/5 font-normal'
          )}
          aria-label="Pengaturan"
          aria-current={isSettings ? 'page' : undefined}
        >
          <HeroCog6Tooth className="w-5 h-5 shrink-0 stroke-[1.8]" />
          {isSettings && (
            <span className="text-xs font-semibold tracking-tight whitespace-nowrap animate-fade-in">
              Pengaturan
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}

