// ==============================================================================
// UnitAssignmentSelector
// Stage 6: Downward Control — selector for assigned_to_organization_id
// Hanya menampilkan: self + authorized descendants dari currentOrganization.
// Tidak menampilkan: parent, sibling, atau unrelated branch.
// ==============================================================================

import React, { useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getDescendantOrganizationIds } from '@/lib/hierarchyService'
import {
  HeroBuildingOffice,
  HeroShieldCheck,
  HeroSquares2X2,
} from '@/components/icons/HeroIcons'
import { cn } from '@/lib/utils'

interface UnitAssignmentSelectorProps {
  /** Current value of assigned_to_organization_id */
  value: string | null | undefined
  /** Called when the user changes selection */
  onChange: (orgId: string | null) => void
  /** Optional label (default: "Ditugaskan ke Unit") */
  label?: string
  /** Optional helper text */
  helperText?: string
  /** Makes the field optional with a clear option */
  clearable?: boolean
  className?: string
  disabled?: boolean
}

export const UnitAssignmentSelector: React.FC<UnitAssignmentSelectorProps> = ({
  value,
  onChange,
  label = 'Ditugaskan ke Unit',
  helperText,
  clearable = true,
  className,
  disabled = false,
}) => {
  const { currentOrganization, userOrganizations, user } = useAuth()

  // Build allowed target list: self + all descendants
  const allowedOrganizations = useMemo(() => {
    if (!currentOrganization) return []

    const isSuperadmin = user?.is_superadmin || user?.role === 'superadmin'
    if (isSuperadmin) {
      // Superadmin: show all known orgs
      return userOrganizations
    }

    // Normal: show self + descendants only (never parent, never sibling)
    const descendantIds = getDescendantOrganizationIds(
      currentOrganization.id,
      userOrganizations,
      false
    )
    const allowedIds = new Set([currentOrganization.id, ...descendantIds])
    return userOrganizations.filter((o) => allowedIds.has(o.id))
  }, [currentOrganization, userOrganizations, user])

  const getUnitIcon = (unitType?: string) => {
    if (unitType === 'pimpinan') return <HeroShieldCheck className="w-4 h-4 text-purple-500" />
    if (unitType === 'lembaga') return <HeroBuildingOffice className="w-4 h-4 text-blue-500" />
    return <HeroSquares2X2 className="w-4 h-4 text-amber-500" />
  }

  const getIndentStyle = (level?: number): React.CSSProperties => ({
    paddingLeft: `${Math.min((level || 0) * 16 + 12, 60)}px`,
  })

  const hasDescendants = allowedOrganizations.length > 1

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-xs sm:text-sm font-medium text-fg">
          {label}
          <span className="ml-1 text-[10px] font-normal text-fg-muted">(opsional)</span>
        </label>
      )}

      {!hasDescendants ? (
        // Leaf node / no descendants — nothing to assign to
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-line bg-surface-muted/40 text-xs text-fg-muted italic">
          <HeroSquares2X2 className="w-4 h-4 shrink-0 text-fg-muted/50" />
          Tidak ada unit turunan — penugasan unit tidak tersedia untuk organisasi ini.
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface overflow-hidden divide-y divide-line/50">
          {/* Clear option */}
          {clearable && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs sm:text-sm transition-colors',
                !value
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'text-fg-muted hover:bg-hover-bg',
                disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
              )}
            >
              <span className="w-4 h-4 rounded border-2 border-current shrink-0 flex items-center justify-center">
                {!value && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </span>
              <span className="italic">Belum ditugaskan ke unit lain</span>
            </button>
          )}

          {/* Org options — hierarchically ordered */}
          {allowedOrganizations.map((org) => {
            const isSelected = value === org.id
            return (
              <button
                key={org.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(isSelected ? null : org.id)}
                style={getIndentStyle(org.level)}
                className={cn(
                  'w-full flex items-center gap-2.5 pr-3 py-2.5 text-left text-xs sm:text-sm transition-colors',
                  isSelected
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'text-fg hover:bg-hover-bg',
                  disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
                )}
              >
                <span className="shrink-0">{getUnitIcon(org.unit_type)}</span>
                <span className="truncate flex-1">{org.name}</span>
                {org.short_name && (
                  <span className="shrink-0 text-[10px] font-semibold text-fg-muted bg-surface-muted px-1.5 py-0.5 rounded">
                    {org.short_name}
                  </span>
                )}
                {isSelected && (
                  <span className="shrink-0 w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-fg-muted leading-relaxed">{helperText}</p>
      )}
    </div>
  )
}
