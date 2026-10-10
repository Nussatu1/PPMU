// ==============================================================================
// UnitAssignmentSelector
// Stage 6: Downward Control — selector for assigned_to_organization_id
// Hanya menampilkan: self + authorized descendants dari currentOrganization.
// Tidak menampilkan: parent, sibling, atau unrelated branch.
// ==============================================================================

import React, { useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getDescendantOrganizationIds } from '@/lib/hierarchyService'
import { Select } from '@/components/ui/Select'
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

  const hasDescendants = allowedOrganizations.length > 1

  const selectOptions = useMemo(() => {
    if (!hasDescendants) {
      return [
        { value: '', label: 'Unit saat ini (Milik sendiri)' }
      ]
    }
    return [
      ...(clearable ? [{ value: '', label: 'Belum ditugaskan (Milik sendiri)' }] : []),
      ...allowedOrganizations.map((org) => {
        const indent = org.level && org.level > 0 ? '— '.repeat(org.level) : ''
        const typeLabel = org.unit_type ? ` [${org.unit_type}]` : ''
        return {
          value: org.id,
          label: `${indent}${org.name}${typeLabel}`,
        }
      }),
    ]
  }, [hasDescendants, clearable, allowedOrganizations])

  return (
    <div className={cn(className)}>
      <Select
        label={label}
        value={value || ''}
        options={selectOptions}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        helperText={helperText}
      />
    </div>
  )
}
