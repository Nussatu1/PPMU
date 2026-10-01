import React, { useState, useMemo, useEffect } from 'react'
import type { Organization, OrganizationMembership } from '@/types/database'
import { getOrganizationTree, type OrganizationTreeNode } from '@/lib/hierarchyService'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  HeroBuildingOffice,
  HeroShieldCheck,
  HeroSquares2X2,
  HeroChevronRight,
  HeroChevronDown,
  HeroUsers,
  HeroPencilSquare,
  HeroTrash,
  HeroPlus,
  HeroCheck,
  HeroMagnifyingGlass,
} from '@/components/icons/HeroIcons'
import { cn } from '@/lib/utils'

interface OrganizationTreeViewProps {
  organizations: Organization[]
  memberships: OrganizationMembership[]
  currentOrganization: Organization | null
  onSwitchOrganization: (orgId: string) => void
  onEdit: (org: Organization) => void
  onDelete: (org: Organization) => void
  onCreateChild: (parentOrgId: string) => void
  onPreviewMembers: (org: Organization) => void
}

export const OrganizationTreeView: React.FC<OrganizationTreeViewProps> = ({
  organizations,
  memberships,
  currentOrganization,
  onSwitchOrganization,
  onEdit,
  onDelete,
  onCreateChild,
  onPreviewMembers,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Bangun struktur pohon menggunakan hierarchy resolver resmi
  const organizationTree = useMemo(() => {
    return getOrganizationTree(null, organizations)
  }, [organizations])

  // Buka seluruh node secara default saat data dimuat
  useEffect(() => {
    if (organizations.length > 0) {
      setExpandedIds(new Set(organizations.map((o) => o.id)))
    }
  }, [organizations])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedIds(new Set(organizations.map((o) => o.id)))
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  const getUnitTypeBadge = (unitType?: string) => {
    switch (unitType) {
      case 'pimpinan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500/20 uppercase tracking-wider">
            <HeroShieldCheck className="w-3 h-3" />
            Pimpinan
          </span>
        )
      case 'lembaga':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20 uppercase tracking-wider">
            <HeroBuildingOffice className="w-3 h-3" />
            Lembaga
          </span>
        )
      case 'kelompok':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20 uppercase tracking-wider">
            <HeroSquares2X2 className="w-3 h-3" />
            Kelompok
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-muted text-fg-muted ring-1 ring-line uppercase tracking-wider">
            Unit
          </span>
        )
    }
  }

  const renderNode = (node: OrganizationTreeNode) => {
    const isExpanded = expandedIds.has(node.id)
    const hasChildren = node.children && node.children.length > 0
    const isCurrent = currentOrganization?.id === node.id
    const depth = node.level ?? 0
    const orgMembers = memberships.filter((m) => m.organization_id === node.id)

    // Filter berdasarkan query pencarian
    const matchesSearch =
      !searchQuery.trim() ||
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.short_name && node.short_name.toLowerCase().includes(searchQuery.toLowerCase()))

    const variantMap: Record<Organization['status'], 'success' | 'warning' | 'danger'> = {
      active: 'success',
      trial: 'warning',
      suspended: 'danger',
      inactive: 'danger',
      archived: 'warning',
    }
    const labelMap: Record<Organization['status'], string> = {
      active: 'Aktif',
      trial: 'Uji Coba',
      suspended: 'Ditangguhkan',
      inactive: 'Nonaktif',
      archived: 'Diarsipkan',
    }

    return (
      <div key={node.id} className="space-y-1">
        {matchesSearch && (
          <div
            className={cn(
              'group relative rounded-xl border transition-all duration-150 p-3 sm:p-4 bg-surface hover:border-line-strong',
              isCurrent
                ? 'border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20'
                : 'border-line shadow-2xs'
            )}
            style={{
              marginLeft: `${Math.min(depth * 24, 96)}px`,
            }}
          >
            {/* Visual connector line for child nodes */}
            {depth > 0 && (
              <span
                className="absolute -left-4 top-1/2 -translate-y-1/2 text-fg-muted/40 font-mono text-xs select-none pointer-events-none hidden sm:inline"
                aria-hidden="true"
              >
                └─
              </span>
            )}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left Content: Expand toggle + Logo + Name + Badges */}
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                {/* Expand / Collapse Button */}
                <button
                  type="button"
                  onClick={() => toggleExpand(node.id)}
                  aria-label={isExpanded ? 'Tutup sub-unit' : 'Buka sub-unit'}
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-fg-muted hover:text-fg hover:bg-hover-bg transition-colors shrink-0 cursor-pointer mt-0.5 sm:mt-0',
                    !hasChildren && 'invisible pointer-events-none'
                  )}
                >
                  {isExpanded ? (
                    <HeroChevronDown className="w-4 h-4 text-fg" />
                  ) : (
                    <HeroChevronRight className="w-4 h-4 text-fg" />
                  )}
                </button>

                {/* Organization Logo or Type Avatar */}
                <div className="shrink-0">
                  {node.logo_url ? (
                    <img
                      src={node.logo_url}
                      alt={node.name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-line shadow-2xs"
                    />
                  ) : (
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ring-1 shadow-2xs',
                        node.unit_type === 'pimpinan'
                          ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-purple-500/20'
                          : node.unit_type === 'lembaga'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20'
                      )}
                    >
                      {node.code.slice(0, 3)}
                    </div>
                  )}
                </div>

                {/* Name, Badges & Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-fg text-sm sm:text-base tracking-tight truncate">
                      {node.name}
                    </h4>

                    {node.short_name && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-surface-muted text-fg-muted ring-1 ring-line shrink-0">
                        {node.short_name}
                      </span>
                    )}

                    {getUnitTypeBadge(node.unit_type)}

                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-muted text-fg-muted ring-1 ring-line shrink-0">
                      Level {node.level ?? 0}
                    </span>

                    <Badge variant={variantMap[node.status]}>{labelMap[node.status]}</Badge>

                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500/30 shrink-0">
                        <HeroCheck className="w-3 h-3" />
                        Unit Aktif
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-fg-muted flex-wrap">
                    <span className="font-mono text-[11px] text-fg-muted/80">{node.code}</span>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => onPreviewMembers(node)}
                      className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      <HeroUsers className="w-3.5 h-3.5" />
                      <span>{orgMembers.length} Anggota</span>
                    </button>
                    {hasChildren && (
                      <>
                        <span>•</span>
                        <span className="text-fg-muted text-xs">
                          {node.children.length} Sub-Unit Langsung
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Content: Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-center border-t border-line/50 lg:border-t-0 pt-2 lg:pt-0 w-full lg:w-auto justify-end">
                {!isCurrent && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onSwitchOrganization(node.id)}
                    className="text-xs shrink-0"
                    title="Jadikan unit organisasi aktif saat ini"
                  >
                    Pilih Unit
                  </Button>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onCreateChild(node.id)}
                  className="text-xs shrink-0"
                  title="Tambah sub-unit di bawah organisasi ini"
                >
                  <HeroPlus className="w-3.5 h-3.5 mr-1" />
                  Sub-Unit
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(node)}
                  className="text-xs shrink-0"
                  aria-label="Ubah Organisasi"
                >
                  <HeroPencilSquare className="w-3.5 h-3.5 mr-1 sm:mr-0 lg:mr-1" />
                  <span className="hidden sm:inline lg:inline">Ubah</span>
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(node)}
                  className="text-xs shrink-0"
                  aria-label="Hapus Organisasi"
                >
                  <HeroTrash className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Render Children Recursively if Expanded */}
        {hasChildren && isExpanded && (
          <div className="space-y-1.5 mt-1">{node.children.map((child) => renderNode(child))}</div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Tree Controls Bar */}
      <div className="p-3 sm:p-4 rounded-xl border border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <HeroMagnifyingGlass className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari unit dalam hirarki..."
            className="w-full rounded-xl border border-line bg-input-bg text-fg pl-9 pr-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button type="button" variant="secondary" size="sm" onClick={expandAll} className="text-xs">
            Buka Semua
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={collapseAll}
            className="text-xs"
          >
            Tutup Semua
          </Button>
        </div>
      </div>

      {/* Tree Node Container */}
      <div className="space-y-2">
        {organizationTree.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-line bg-surface text-fg-muted text-sm italic">
            Belum ada organisasi yang terdaftar.
          </div>
        ) : (
          organizationTree.map((rootNode) => renderNode(rootNode))
        )}
      </div>
    </div>
  )
}
