import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  HeroMagnifyingGlass,
  HeroFunnel,
  HeroChevronUpDown,
  HeroTrash,
  HeroPencilSquare,
  HeroEye,
  HeroChevronLeft,
  HeroChevronRight,
  HeroXMark,
  HeroViewColumns,
  HeroExclamationTriangle,
} from '@/components/icons/HeroIcons'

import { Button } from './Button'
import { Modal } from './Modal'
import { EmptyState } from './EmptyState'
import { TableSkeleton, CardSkeleton } from './Skeleton'
import { Checkbox } from './Checkbox'
import { Select } from './Select'
import { Tooltip } from './Tooltip'
import { MobileCard } from './MobileCard'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'

export interface ColumnDef<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  className?: string
  toggleable?: boolean
  defaultHidden?: boolean
  mobilePriority?: 'primary' | 'secondary' | 'status' | 'detail'
}

export interface FilterOption {
  key: string
  label: string
  options: Array<{ value: string; label: string }>
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  keyField?: keyof T
  isLoading?: boolean
  filterOptions?: FilterOption[]
  searchPlaceholder?: string
  searchKey?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: React.ReactNode
  onActionCreate?: () => void
  createActionLabel?: string
  onView?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onBulkDelete?: (ids: string[]) => void
  customRowActions?: (item: T) => React.ReactNode
  title?: string
  headerActions?: React.ReactNode
  /** Fungsi render khusus untuk tampilan kartu mobile (< md). Jika tidak diberikan, dipakai kartu fallback cerdas */
  renderCard?: (
    item: T,
    isSelected: boolean,
    onSelect: (checked: boolean) => void,
    isSelectionMode: boolean
  ) => React.ReactNode
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  isLoading = false,
  filterOptions = [],
  searchPlaceholder = t.common.search,
  emptyTitle = t.common.noData,
  emptyDescription = t.common.noDataDesc,
  emptyIcon,
  onActionCreate,
  createActionLabel,
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  customRowActions,
  title,
  headerActions,
  renderCard,
}: DataTableProps<T>) {
  // Search, filter, sorting, pagination state
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [showFilterBottomSheet, setShowFilterBottomSheet] = useState(false)
  const [showColumnToggle, setShowColumnToggle] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    columns.forEach((c) => {
      if (c.defaultHidden) initial[c.key] = true
    })
    return initial
  })

  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const filterRef = useRef<HTMLDivElement>(null)
  const columnToggleRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Click outside handlers
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (!target) return
      if ((target as Element).closest?.('[role="listbox"], [id$="-popup"]')) {
        return
      }
      if (filterRef.current && !filterRef.current.contains(target)) {
        setShowFilterDropdown(false)
      }
      if (columnToggleRef.current && !columnToggleRef.current.contains(target)) {
        setShowColumnToggle(false)
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFilterDropdown(false)
        setShowColumnToggle(false)
        setShowFilterBottomSheet(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [])

  // Modal confirmation states
  const [itemToDelete, setItemToDelete] = useState<T | null>(null)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)

  // Visible columns
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => !hiddenColumns[col.key])
  }, [columns, hiddenColumns])

  // Filtering
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matches = columns.some((col) => {
          const val = item[col.key]
          if (val === null || val === undefined) return false
          return String(val).toLowerCase().includes(query)
        })
        if (!matches) return false
      }

      // Filter options
      for (const [filterKey, filterVal] of Object.entries(activeFilters)) {
        if (!filterVal) continue
        const itemVal = item[filterKey]
        if (itemVal === undefined || itemVal === null) return false
        if (String(itemVal).toLowerCase() !== String(filterVal).toLowerCase()) {
          return false
        }
      }

      return true
    })
  }, [data, searchTerm, activeFilters, columns])

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]

      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      const strA = String(aVal).toLowerCase()
      const strB = String(bVal).toLowerCase()
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortColumn, sortDirection])

  // Pagination
  const totalItems = sortedData.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, page, pageSize])

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedData.map((item) => String(item[keyField]))
      setSelectedIds(allIds)
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => {
        const next = prev.filter((i) => i !== id)
        if (next.length === 0 && isSelectionMode) {
          setIsSelectionMode(false)
        }
        return next
      })
    }
  }

  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedIds.includes(String(item[keyField])))

  const isSomeSelected = selectedIds.length > 0 && !isAllSelected

  const handleSort = (key: string) => {
    if (sortColumn === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortColumn(null)
        setSortDirection('asc')
      }
    } else {
      setSortColumn(key)
      setSortDirection('asc')
    }
  }

  const toggleColumnVisibility = (key: string) => {
    setHiddenColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length

  const handleConfirmSingleDelete = () => {
    if (itemToDelete && onDelete) {
      onDelete(itemToDelete)
      setSelectedIds((prev) => prev.filter((id) => id !== String(itemToDelete[keyField])))
      setItemToDelete(null)
    }
  }

  const handleConfirmBulkDelete = () => {
    if (onBulkDelete && selectedIds.length > 0) {
      onBulkDelete(selectedIds)
      setSelectedIds([])
      setShowBulkDeleteModal(false)
      setIsSelectionMode(false)
    }
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setActiveFilters({})
    setPage(1)
  }

  // Identifikasi kolom untuk fallback kartu mobile jika renderCard tidak dipasang
  const primaryCol = columns.find((c) => c.mobilePriority === 'primary') || columns[0]
  const statusCol = columns.find((c) => c.mobilePriority === 'status')
  const secondaryCols = columns.filter((c) => c.mobilePriority === 'secondary').slice(0, 2)

  return (
    <div className="w-full space-y-3">
      {/* Top Header / Title / Action Toolbar */}
      {(title || headerActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {title && (
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
              {title}
            </h2>
          )}
          {headerActions && <div className="flex items-center gap-2.5">{headerActions}</div>}
        </div>
      )}

      {/* Main Table Card */}
      <div className="rounded-xl bg-surface ring-1 ring-line shadow-sm transition-colors">
        {/* Table Control Bar */}
        <div className="p-3 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-line-divider bg-surface-muted">
          {/* Baris 1 Kontrol: Search Bar Penuh di Mobile */}
          <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2">
            {/* Search Input (Lebar penuh di mobile, max-w-xs di desktop) */}
            <div className="relative flex-1 min-w-[140px] md:max-w-xs">
              <HeroMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-9 py-2 min-h-[44px] sm:min-h-0 text-base sm:text-sm rounded-lg bg-surface ring-1 ring-line-strong text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-500 transition duration-75 shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-1 flex items-center justify-center rounded text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer"
                  aria-label="Hapus pencarian"
                >
                  <HeroXMark className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tombol Filter & Kolom */}
            <div className="flex items-center gap-2">
              {/* Filter Button: Di mobile buka Bottom Sheet, di desktop buka Dropdown */}
              {filterOptions.length > 0 && (
                <div className="relative shrink-0" ref={filterRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        setShowFilterBottomSheet(true)
                      } else {
                        setShowFilterDropdown(!showFilterDropdown)
                      }
                    }}
                    aria-expanded={showFilterDropdown || showFilterBottomSheet}
                    aria-haspopup="true"
                    className={cn(
                      'flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-0 text-sm font-semibold rounded-lg ring-1 transition duration-75 cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                      activeFilterCount > 0
                        ? 'bg-primary-50 ring-primary-600/30 text-primary-800 dark:bg-primary-500/15 dark:text-primary-300'
                        : 'bg-surface ring-line-strong text-fg hover:bg-hover-bg'
                    )}
                  >
                    <HeroFunnel className="w-4 h-4" />
                    <span>{t.common.filter}</span>
                    {activeFilterCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Desktop Dropdown (Hidden on mobile) */}
                  {showFilterDropdown && (
                    <div className="hidden md:block absolute left-0 mt-2 w-64 rounded-lg bg-surface ring-1 ring-line shadow-lg z-50 p-3.5 space-y-3 animate-scale-in">
                      <div className="flex items-center justify-between pb-2 border-b border-line-divider">
                        <span className="text-xs font-bold text-fg uppercase tracking-wider">
                          {t.common.filterRecords}
                        </span>
                        {activeFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveFilters({})}
                            className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold cursor-pointer"
                          >
                            {t.common.reset}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        {filterOptions.map((f) => (
                          <div key={f.key}>
                            <Select
                              label={f.label}
                              value={activeFilters[f.key] || ''}
                              onChange={(e) => {
                                setActiveFilters((prev) => ({
                                  ...prev,
                                  [f.key]: e.target.value,
                                }))
                                setPage(1)
                              }}
                              options={[
                                { value: '', label: t.common.all },
                                ...f.options.map((opt) => ({ value: opt.value, label: opt.label })),
                              ]}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Column Visibility Toggler (Desktop Only) */}
              <div className="hidden md:block relative shrink-0" ref={columnToggleRef}>
                <Tooltip content={t.common.columns}>
                  <button
                    type="button"
                    onClick={() => setShowColumnToggle(!showColumnToggle)}
                    aria-expanded={showColumnToggle}
                    aria-haspopup="true"
                    className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-0 text-sm font-semibold rounded-lg bg-surface ring-1 ring-line-strong text-fg hover:bg-hover-bg transition duration-75 cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    aria-label={t.common.columns}
                  >
                    <HeroViewColumns className="w-4 h-4" />
                    <span>{t.common.columns}</span>
                  </button>
                </Tooltip>

                {showColumnToggle && (
                  <div className="absolute right-0 mt-2 w-52 rounded-lg bg-surface ring-1 ring-line shadow-lg z-50 p-3 space-y-2 animate-scale-in">
                    <div className="pb-1.5 border-b border-line-divider text-xs font-bold text-fg uppercase tracking-wider">
                      {t.common.visibleColumns}
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {columns.map((col) => (
                        <div key={col.key} className="py-1">
                          <Checkbox
                            checked={!hiddenColumns[col.key]}
                            onChange={() => toggleColumnVisibility(col.key)}
                            label={<span className="text-sm text-fg">{col.label}</span>}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Actions Indicator (Desktop) */}
          {selectedIds.length > 0 && (
            <div className="hidden md:flex items-center gap-2 bg-table-header px-3 py-1.5 rounded-lg ring-1 ring-line">
              <span className="text-sm font-semibold text-fg">
                {t.common.showingSelected(selectedIds.length)}
              </span>
              {onBulkDelete && (
                <Button
                  size="xs"
                  variant="danger"
                  icon={<HeroTrash className="w-4 h-4" />}
                  onClick={() => setShowBulkDeleteModal(true)}
                >
                  {t.common.delete}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Filter Chips Bar (Jika ada filter aktif atau search query) */}
        {(activeFilterCount > 0 || searchTerm) && (
          <div className="px-3 py-2 bg-surface-muted/60 border-b border-line-divider flex items-center gap-2 flex-wrap">
            <span className="text-xs text-fg-muted font-medium">Filter aktif:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface border border-line text-xs font-medium text-fg shadow-2xs">
                <span>Cari: "{searchTerm}"</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-0.5 text-fg-muted hover:text-fg cursor-pointer"
                >
                  <HeroXMark className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {Object.entries(activeFilters).map(([fKey, fVal]) => {
              if (!fVal) return null
              const filterDef = filterOptions.find((o) => o.key === fKey)
              const optDef = filterDef?.options.find((o) => o.value === fVal)
              return (
                <span
                  key={fKey}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface border border-line text-xs font-medium text-fg shadow-2xs"
                >
                  <span>
                    {filterDef?.label}: {optDef?.label || fVal}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilters((prev) => {
                        const next = { ...prev }
                        delete next[fKey]
                        return next
                      })
                      setPage(1)
                    }}
                    className="p-0.5 text-fg-muted hover:text-fg cursor-pointer"
                  >
                    <HeroXMark className="w-3.5 h-3.5" />
                  </button>
                </span>
              )
            })}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline ml-auto cursor-pointer"
            >
              Hapus Semua
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAMPILAN 1: MOBILE CARD LIST (< md / < 768px)                  */}
        {/* ============================================================== */}
        <div className="block md:hidden">
          {isLoading ? (
            <CardSkeleton count={4} />
          ) : paginatedData.length === 0 ? (
            <div className="p-6 text-center">
              <EmptyState
                icon={emptyIcon}
                title={searchTerm || activeFilterCount > 0 ? 'Data Tidak Ditemukan' : emptyTitle}
                description={
                  searchTerm || activeFilterCount > 0
                    ? 'Tidak ada data yang sesuai dengan kata kunci atau filter yang Anda terapkan.'
                    : emptyDescription
                }
                actionLabel={
                  searchTerm || activeFilterCount > 0 ? 'Reset Filter' : createActionLabel
                }
                onAction={
                  searchTerm || activeFilterCount > 0 ? handleResetFilters : onActionCreate
                }
              />
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {paginatedData.map((item) => {
                const id = String(item[keyField])
                const isSelected = selectedIds.includes(id)

                // Jika halaman menyediakan renderCard eksplisit
                if (renderCard) {
                  return (
                    <React.Fragment key={id}>
                      {renderCard(
                        item,
                        isSelected,
                        (checked) => handleSelectRow(id, checked),
                        isSelectionMode
                      )}
                    </React.Fragment>
                  )
                }

                // Fallback otomatis MobileCard jika belum didefinisikan renderCard per halaman
                return (
                  <MobileCard
                    key={id}
                    title={primaryCol?.render ? primaryCol.render(item) : String(item[primaryCol?.key] ?? '-')}
                    status={statusCol?.render ? statusCol.render(item) : null}
                    meta={
                      secondaryCols.length > 0 ? (
                        <div className="space-y-1">
                          {secondaryCols.map((c) => (
                            <div key={c.key} className="flex items-center gap-1.5">
                              <span className="text-fg-muted">{c.label}:</span>
                              <span className="text-fg font-medium">
                                {c.render ? c.render(item) : String(item[c.key] ?? '-')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null
                    }
                    isSelected={isSelected}
                    isSelectionMode={isSelectionMode}
                    onLongPress={() => {
                      if (onBulkDelete) {
                        setIsSelectionMode(true)
                        handleSelectRow(id, true)
                      }
                    }}
                    onToggleSelect={(checked) => handleSelectRow(id, checked)}
                    menu={
                      (onEdit || onDelete || customRowActions) && (
                        <div className="flex items-center gap-1">
                          {onEdit && (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => onEdit(item)}
                              icon={<HeroPencilSquare className="w-4 h-4" />}
                            >
                              Edit
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              size="xs"
                              variant="danger"
                              onClick={() => setItemToDelete(item)}
                              icon={<HeroTrash className="w-4 h-4" />}
                            />
                          )}
                        </div>
                      )
                    }
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* TAMPILAN 2: DESKTOP TABULAR VIEW (>= md / >= 768px)            */}
        {/* ============================================================== */}
        <div className="hidden md:block">
          {isLoading ? (
            <TableSkeleton rows={5} columns={visibleColumns.length + 1} />
          ) : paginatedData.length === 0 ? (
            <EmptyState
              icon={emptyIcon}
              title={searchTerm || activeFilterCount > 0 ? 'Data Tidak Ditemukan' : emptyTitle}
              description={
                searchTerm || activeFilterCount > 0
                  ? 'Tidak ada data yang cocok dengan kriteria pencarian.'
                  : emptyDescription
              }
              actionLabel={
                searchTerm || activeFilterCount > 0 ? 'Reset Filter' : createActionLabel
              }
              onAction={
                searchTerm || activeFilterCount > 0 ? handleResetFilters : onActionCreate
              }
            />
          ) : (
            <div className="relative">
              <div ref={scrollRef} className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-sm font-semibold text-fg select-none bg-table-header border-b border-line-divider sticky top-0 z-10">
                      <th className="py-3 px-4 w-10">
                        <Checkbox
                          checked={isAllSelected}
                          indeterminate={isSomeSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          aria-label="Pilih semua baris"
                        />
                      </th>

                      {visibleColumns.map((col) => (
                        <th key={col.key} className={cn('py-3.5 px-4', col.className)}>
                          {col.sortable ? (
                            <button
                              type="button"
                              onClick={() => handleSort(col.key)}
                              aria-sort={
                                sortColumn === col.key
                                  ? sortDirection === 'asc'
                                    ? 'ascending'
                                    : 'descending'
                                  : 'none'
                              }
                              className="flex items-center gap-1.5 w-full text-left hover:text-primary-600 dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded cursor-pointer"
                            >
                              <span>{col.label}</span>
                              <HeroChevronUpDown
                                className={cn(
                                  'w-4 h-4 shrink-0 transition-colors',
                                  sortColumn === col.key
                                    ? 'text-primary-600 dark:text-primary-400'
                                    : 'text-fg-muted'
                                )}
                              />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span>{col.label}</span>
                            </div>
                          )}
                        </th>
                      ))}

                      {(onView || onEdit || onDelete || customRowActions) && (
                        <th className="py-3.5 px-4 text-right w-24">
                          {t.common.actions}
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="text-sm text-fg divide-y divide-line-row">
                    {paginatedData.map((item) => {
                      const id = String(item[keyField])
                      const isSelected = selectedIds.includes(id)

                      return (
                        <tr
                          key={id}
                          className={cn(
                            'group transition duration-75 border-b border-line-row',
                            isSelected ? 'bg-hover-bg' : 'hover:bg-hover-bg'
                          )}
                        >
                          <td className="py-3.5 px-4 w-10">
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => handleSelectRow(id, e.target.checked)}
                              aria-label={`Pilih item ${id}`}
                            />
                          </td>

                          {visibleColumns.map((col) => (
                            <td
                              key={col.key}
                              className={cn('py-3.5 px-4 align-middle leading-6', col.className)}
                            >
                              {col.render ? col.render(item) : String(item[col.key] ?? '-')}
                            </td>
                          ))}

                          {(onView || onEdit || onDelete || customRowActions) && (
                            <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {customRowActions && customRowActions(item)}
                                {onView && (
                                  <Tooltip content={t.common.view}>
                                    <button
                                      type="button"
                                      onClick={() => onView(item)}
                                      aria-label={t.common.view}
                                      className="p-1.5 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-hover-bg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                                    >
                                      <HeroEye className="w-4 h-4" />
                                    </button>
                                  </Tooltip>
                                )}
                                {onEdit && (
                                  <Tooltip content={t.common.edit}>
                                    <button
                                      type="button"
                                      onClick={() => onEdit(item)}
                                      aria-label={t.common.edit}
                                      className="p-1.5 flex items-center justify-center rounded-lg text-fg-muted hover:text-primary-600 dark:hover:text-primary-400 hover:bg-hover-bg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                                    >
                                      <HeroPencilSquare className="w-4 h-4" />
                                    </button>
                                  </Tooltip>
                                )}
                                {onDelete && (
                                  <Tooltip content={t.common.delete}>
                                    <button
                                      type="button"
                                      onClick={() => setItemToDelete(item)}
                                      aria-label={t.common.delete}
                                      className="p-1.5 flex items-center justify-center rounded-lg text-fg-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-hover-bg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                    >
                                      <HeroTrash className="w-4 h-4" />
                                    </button>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Table Footer: Paginasi Responsif */}
        <div className="p-3 sm:px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-fg-muted bg-surface-muted border-t border-line-divider rounded-b-xl relative z-10">
          {/* Info Jumlah Data (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <span>
              {t.pagination.showing}{' '}
              <span className="font-semibold text-fg">
                {totalItems === 0 ? 0 : (page - 1) * pageSize + 1}
              </span>{' '}
              {t.pagination.to}{' '}
              <span className="font-semibold text-fg">
                {Math.min(page * pageSize, totalItems)}
              </span>{' '}
              {t.pagination.of}{' '}
              <span className="font-semibold text-fg">{totalItems}</span>{' '}
              {t.pagination.results}
            </span>

            <span className="text-fg-subtle">|</span>

            <div className="flex items-center gap-1.5">
              <span>{t.pagination.perPage}</span>
              <div className="w-20">
                <Select
                  placement="top"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  options={[
                    { value: 10, label: '10' },
                    { value: 25, label: '25' },
                    { value: 50, label: '50' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Kontrol Navigasi Halaman (Mobile: "Sebelumnya • Halaman X dari Y • Berikutnya", 44px Touch Target) */}
          <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[44px] px-3.5 flex items-center justify-center gap-1.5 rounded-lg bg-surface ring-1 ring-line text-sm font-semibold text-fg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-hover-bg transition duration-75 cursor-pointer shadow-2xs"
              aria-label={t.pagination.previousPage}
            >
              <HeroChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <span className="text-xs sm:text-sm font-medium text-fg text-center">
              Halaman <strong className="text-fg font-bold">{page}</strong> dari{' '}
              <strong className="text-fg font-bold">{totalPages}</strong>
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-[44px] px-3.5 flex items-center justify-center gap-1.5 rounded-lg bg-surface ring-1 ring-line text-sm font-semibold text-fg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-hover-bg transition duration-75 cursor-pointer shadow-2xs"
              aria-label={t.pagination.nextPage}
            >
              <span>Berikutnya</span>
              <HeroChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Bar untuk Mode Seleksi Massal (Mobile) */}
      {isSelectionMode && selectedIds.length > 0 && onBulkDelete && (
        <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden bg-surface border border-line shadow-xl rounded-2xl p-3 flex items-center justify-between gap-3 animate-slide-in-right">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary-600 text-white font-bold text-xs flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-sm font-semibold text-fg">Terpilih</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedIds([])
                setIsSelectionMode(false)
              }}
              className="min-h-[44px] px-3 text-xs font-semibold text-fg-muted hover:text-fg cursor-pointer"
            >
              Batal
            </button>
            <Button
              variant="danger"
              size="sm"
              icon={<HeroTrash className="w-4 h-4" />}
              onClick={() => setShowBulkDeleteModal(true)}
            >
              Hapus ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Filter Bottom Sheet Drawer */}
      {showFilterBottomSheet && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full bg-surface border-t border-line rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-in">
            {/* Sheet Header */}
            <div className="p-4 border-b border-line-divider flex items-center justify-between">
              <h3 className="text-base font-bold text-fg flex items-center gap-2">
                <HeroFunnel className="w-5 h-5 text-amber-500" />
                Filter Data
              </h3>
              <button
                type="button"
                onClick={() => setShowFilterBottomSheet(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-fg-muted hover:text-fg rounded-lg cursor-pointer"
                aria-label="Tutup filter"
              >
                <HeroXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Form */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {filterOptions.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Select
                    label={f.label}
                    value={activeFilters[f.key] || ''}
                    onChange={(e) => {
                      setActiveFilters((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                      setPage(1)
                    }}
                    options={[
                      { value: '', label: `Semua ${f.label}` },
                      ...f.options.map((opt) => ({ value: opt.value, label: opt.label })),
                    ]}
                  />
                </div>
              ))}
            </div>

            {/* Sheet Footer */}
            <div className="p-4 border-t border-line-divider bg-surface-muted/50 flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => {
                  setActiveFilters({})
                  setPage(1)
                }}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                onClick={() => setShowFilterBottomSheet(false)}
              >
                Terapkan Filter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Single Item Delete Confirmation Modal */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title={t.common.confirmDeleteTitle}
        description={t.common.confirmDeleteDesc}
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setItemToDelete(null)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleConfirmSingleDelete}>
              {t.common.delete}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <HeroExclamationTriangle className="w-8 h-8 shrink-0" />
          <p className="text-sm text-fg-muted">
            {t.common.deleteImpactNotice}
          </p>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title={t.common.confirmBulkDeleteTitle(selectedIds.length)}
        description={t.common.confirmBulkDeleteDesc(selectedIds.length)}
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBulkDeleteModal(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleConfirmBulkDelete}>
              {t.common.delete} {selectedIds.length} {t.pagination.results}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <HeroExclamationTriangle className="w-8 h-8 shrink-0" />
          <p className="text-sm text-fg-muted">
            {t.common.deletePermanentNotice}
          </p>
        </div>
      </Modal>
    </div>
  )
}
