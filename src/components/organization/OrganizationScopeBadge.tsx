import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { HeroBuildingOffice, HeroSquares2X2 } from '@/components/icons/HeroIcons'

interface OrganizationScopeBadgeProps {
  className?: string
  showUnitName?: boolean
}

export const OrganizationScopeBadge: React.FC<OrganizationScopeBadgeProps> = ({
  className,
  showUnitName = true,
}) => {
  const { currentOrganization, currentScopeMode, organizationDescendants } = useAuth()

  if (!currentOrganization) return null

  const isRollup = currentScopeMode === 'descendants' && organizationDescendants.length > 0
  const orgLabel = currentOrganization.short_name || currentOrganization.name

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors shrink-0',
        isRollup
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20'
          : 'bg-surface-muted text-fg-muted ring-1 ring-line',
        className
      )}
      title={
        isRollup
          ? `Menampilkan data gabungan dari ${currentOrganization.name} dan ${organizationDescendants.length} sub-unit bawahannya`
          : `Menampilkan data khusus unit ${currentOrganization.name} saja`
      }
    >
      {isRollup ? (
        <HeroSquares2X2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      ) : (
        <HeroBuildingOffice className="w-3.5 h-3.5 text-fg-muted shrink-0" />
      )}

      {showUnitName && <span className="font-medium truncate max-w-[150px]">{orgLabel}</span>}

      <span
        className={cn(
          'text-[10px] font-semibold uppercase tracking-wider px-1 py-0.2 rounded',
          isRollup
            ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
            : 'bg-surface text-fg-muted ring-1 ring-line'
        )}
      >
        {isRollup ? `+${organizationDescendants.length} Bawahan` : 'Unit Ini'}
      </span>
    </div>
  )
}
