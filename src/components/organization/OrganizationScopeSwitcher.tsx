import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { HeroBuildingOffice, HeroSquares2X2 } from '@/components/icons/HeroIcons'

interface OrganizationScopeSwitcherProps {
  className?: string
  size?: 'sm' | 'md'
}

export const OrganizationScopeSwitcher: React.FC<OrganizationScopeSwitcherProps> = ({
  className,
  size = 'md',
}) => {
  const {
    currentScopeMode,
    setScopeMode,
    canAccessDescendants,
    organizationDescendants,
  } = useAuth()

  // Jika user tidak berhak mengakses turunan atau unit aktif tidak memiliki bawahan,
  // maka sembunyikan switcher agar tidak membingungkan pengguna
  if (!canAccessDescendants || organizationDescendants.length === 0) {
    return null
  }

  const isSmall = size === 'sm'

  return (
    <div
      role="group"
      aria-label="Cakupan Data Organisasi"
      className={cn(
        'inline-flex items-center rounded-xl bg-surface-muted/80 p-1 border border-line select-none shadow-2xs',
        className
      )}
    >
      {/* Mode 1: Unit Ini (Own) */}
      <button
        type="button"
        onClick={() => setScopeMode('own')}
        aria-pressed={currentScopeMode === 'own'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500/30',
          isSmall ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm',
          currentScopeMode === 'own'
            ? 'bg-surface text-fg font-semibold shadow-xs ring-1 ring-line'
            : 'text-fg-muted hover:text-fg'
        )}
      >
        <HeroBuildingOffice className={cn('shrink-0', isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        <span>Unit Ini</span>
      </button>

      {/* Mode 2: Unit + Seluruh Bawahan (Descendants) */}
      <button
        type="button"
        onClick={() => setScopeMode('descendants')}
        aria-pressed={currentScopeMode === 'descendants'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500/30',
          isSmall ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm',
          currentScopeMode === 'descendants'
            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold shadow-xs ring-1 ring-amber-500/30'
            : 'text-fg-muted hover:text-fg'
        )}
      >
        <HeroSquares2X2 className={cn('shrink-0', isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        <span>Unit + Seluruh Bawahan</span>
        <span
          className={cn(
            'ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold shrink-0',
            currentScopeMode === 'descendants'
              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
              : 'bg-surface text-fg-muted ring-1 ring-line'
          )}
        >
          +{organizationDescendants.length}
        </span>
      </button>
    </div>
  )
}
