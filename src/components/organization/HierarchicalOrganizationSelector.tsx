import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getOrganizationTree, type OrganizationTreeNode } from '@/lib/hierarchyService'
import {
  HeroBuildingOffice,
  HeroChevronDown,
  HeroCheck,
  HeroShieldCheck,
  HeroSquares2X2,
} from '@/components/icons/HeroIcons'
import { cn } from '@/lib/utils'

interface HierarchicalOrganizationSelectorProps {
  className?: string
  compact?: boolean
}

export const HierarchicalOrganizationSelector: React.FC<HierarchicalOrganizationSelectorProps> = ({
  className,
  compact = false,
}) => {
  const { currentOrganization, userOrganizations, switchOrganization } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Bangun struktur pohon dari daftar organisasi yang dimiliki user
  const organizationTree = useMemo(() => {
    return getOrganizationTree(null, userOrganizations)
  }, [userOrganizations])

  // Flatten tree untuk rendering linear yang mempertahankan kedalaman (depth/level)
  const flattenedNodes = useMemo(() => {
    const list: OrganizationTreeNode[] = []
    const traverse = (nodes: OrganizationTreeNode[]) => {
      for (const node of nodes) {
        list.push(node)
        if (node.children && node.children.length > 0) {
          traverse(node.children)
        }
      }
    }
    traverse(organizationTree)
    return list
  }, [organizationTree])

  const getUnitTypeLabel = (type?: string) => {
    switch (type) {
      case 'pimpinan':
        return 'Pimpinan'
      case 'lembaga':
        return 'Lembaga'
      case 'kelompok':
        return 'Kelompok'
      case 'unit':
        return 'Unit'
      default:
        return 'Unit'
    }
  }

  const getUnitTypeBadgeClass = (type?: string) => {
    switch (type) {
      case 'pimpinan':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-purple-500/20'
      case 'lembaga':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20'
      case 'kelompok':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20'
      default:
        return 'bg-surface-muted text-fg-muted ring-line'
    }
  }

  return (
    <div ref={dropdownRef} className={cn('relative inline-block text-left', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Pilih Unit Organisasi Aktif"
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border border-line bg-surface text-fg font-medium transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-amber-500/20',
          compact
            ? 'px-3 py-1.5 text-xs hover:bg-hover-bg max-w-[220px] sm:max-w-[280px]'
            : 'px-3.5 py-2 text-sm hover:bg-hover-bg w-full justify-between shadow-2xs'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            {currentOrganization?.unit_type === 'pimpinan' ? (
              <HeroShieldCheck className="w-3.5 h-3.5" />
            ) : currentOrganization?.unit_type === 'lembaga' ? (
              <HeroBuildingOffice className="w-3.5 h-3.5" />
            ) : (
              <HeroSquares2X2 className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="truncate text-left font-semibold text-fg">
            {currentOrganization ? currentOrganization.name : 'Pilih Organisasi'}
          </span>
        </div>
        <HeroChevronDown
          className={cn(
            'w-4 h-4 text-fg-muted shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Hierarchical Dropdown Panel */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Daftar Hirarki Organisasi"
          className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl border border-line bg-surface shadow-xl z-50 py-2 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 max-h-[70vh] flex flex-col"
        >
          {/* Header Panel */}
          <div className="px-4 py-2 border-b border-line bg-surface-muted/50 flex items-center justify-between">
            <span className="text-[11px] font-bold text-fg-muted uppercase tracking-wider">
              Hirarki Unit Organisasi
            </span>
            <span className="text-[10px] text-fg-muted font-medium">
              {userOrganizations.length} unit terdaftar
            </span>
          </div>

          {/* List of Hierarchical Nodes */}
          <div className="overflow-y-auto py-1 divide-y divide-line/40">
            {flattenedNodes.length === 0 ? (
              <div className="px-4 py-3 text-xs text-fg-muted text-center italic">
                Tidak ada organisasi yang dapat dipilih
              </div>
            ) : (
              flattenedNodes.map((node) => {
                const isSelected = currentOrganization?.id === node.id
                const depth = node.level || 0
                const indentPadding = Math.min(depth * 18 + 12, 72)

                return (
                  <button
                    key={node.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      switchOrganization(node.id)
                      setIsOpen(false)
                    }}
                    style={{ paddingLeft: `${indentPadding}px` }}
                    className={cn(
                      'w-full text-left pr-4 py-2.5 transition-colors cursor-pointer flex items-center justify-between gap-2 group',
                      isSelected
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                        : 'text-fg hover:bg-hover-bg'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Visual Tree Guide Line */}
                      {depth > 0 && (
                        <span className="text-fg-muted/40 font-mono text-xs select-none shrink-0 -ml-2">
                          └─
                        </span>
                      )}

                      {/* Unit Type Icon */}
                      <span className="shrink-0 text-fg-muted group-hover:text-fg">
                        {node.unit_type === 'pimpinan' ? (
                          <HeroShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        ) : node.unit_type === 'lembaga' ? (
                          <HeroBuildingOffice className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <HeroSquares2X2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </span>

                      {/* Org Name & Badges */}
                      <div className="truncate min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate text-xs sm:text-sm">{node.name}</span>
                          {node.short_name && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-surface-muted text-fg-muted shrink-0">
                              {node.short_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className={cn(
                              'text-[9px] font-semibold px-1.5 py-0.2 rounded ring-1 shrink-0 uppercase',
                              getUnitTypeBadgeClass(node.unit_type)
                            )}
                          >
                            {getUnitTypeLabel(node.unit_type)}
                          </span>
                          <span className="text-[10px] text-fg-muted font-mono truncate">
                            {node.code}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Selected Checkmark */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <HeroCheck className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
