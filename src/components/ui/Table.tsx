import React, { useState, useMemo, useRef, useEffect } from 'react'
import { HeroMagnifyingGlass, HeroFunnel, HeroChevronUpDown, HeroTrash, HeroPencilSquare, HeroEye, HeroChevronLeft, HeroChevronRight, HeroXMark, HeroViewColumns, HeroExclamationTriangle } from '@/components/icons/HeroIcons'

import { Button } from './Button'
import { Modal } from './Modal'
import { EmptyState } from './EmptyState'
import { TableSkeleton } from './Skeleton'
import { Checkbox } from './Checkbox'
import { Select } from './Select'
import { Tooltip } from './Tooltip'
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
}: DataTableProps<T>) {
  // Search, filter, sorting, pagination state
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
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

  const filterRef = useRef<HTMLDivElement>(null)
  const columnToggleRef = useRef<HTMLDivElement>(null)

  // Click outside handlers
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (!target) return
      // If clicking inside a Select dropdown popup, do NOT close filter or column toggles
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
      setSelectedIds((prev) => prev.filter((i) => i !== id))
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
    }
  }

  return (
    <div className="w-full space-y-3">
      {/* Top Header / Title / Action Toolbar */}
      {(title || headerActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {title && (
            <h2 className="text-xl font-bold tracking-tight text-fg tracking-tight">
              {title}
            </h2>
          )}
          {headerActions && <div className="flex items-center gap-2.5">{headerActions}</div>}
        </div>
      )}

      {/* Main Table Card */}
      <div
        className="rounded-xl bg-surface ring-1 ring-line shadow-sm transition-colors"
      >
        {/* Table Control Bar */}
        <div
          className="p-3 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-line-divider bg-surface-muted"
        >
          <div className="flex flex-1 items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <HeroMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg bg-surface ring-1 ring-line-strong text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-500 transition duration-75 shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
                >
                  <HeroXMark className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            {filterOptions.length > 0 && (
              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg ring-1 transition duration-75 cursor-pointer shadow-sm',
                    activeFilterCount > 0
                      ? 'bg-primary-50 ring-primary-600/30 text-primary-800 dark:bg-primary-500/15 dark:text-primary-300'
                      : 'bg-surface ring-line-strong text-fg hover:bg-hover-bg'
                  )}
                >
                  <HeroFunnel className="w-3.5 h-3.5" />
                  <span>{t.common.filter}</span>
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {showFilterDropdown && (
                  <div
                    className="absolute left-0 mt-2 w-64 rounded-lg bg-surface ring-1 ring-line shadow-lg z-50 p-3.5 space-y-3 animate-scale-in"
                  >
                    <div
                      className="flex items-center justify-between pb-2 border-b border-line-divider"
                    >
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

            {/* Column Visibility Toggler */}
            <div className="relative" ref={columnToggleRef}>
              <Tooltip content={t.common.columns}>
                <button
                  type="button"
                  onClick={() => setShowColumnToggle(!showColumnToggle)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-surface ring-1 ring-line-strong text-fg hover:bg-hover-bg transition duration-75 cursor-pointer shadow-sm"
                  aria-label={t.common.columns}
                >
                  <HeroViewColumns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.common.columns}</span>
                </button>
              </Tooltip>

              {showColumnToggle && (
                <div
                  className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-52 rounded-lg bg-surface ring-1 ring-line shadow-lg z-50 p-3 space-y-2 animate-scale-in"
                >
                  <div
                    className="pb-1.5 border-b border-line-divider text-xs font-bold text-fg uppercase tracking-wider"
                  >
                    {t.common.visibleColumns}
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {columns.map((col) => (
                      <div key={col.key} className="py-1">
                        <Checkbox
                          checked={!hiddenColumns[col.key]}
                          onChange={() => toggleColumnVisibility(col.key)}
                          label={<span className="text-xs text-fg">{col.label}</span>}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bulk Actions Indicator */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-table-header px-3 py-1.5 rounded-lg ring-1 ring-line">
              <span className="text-xs font-semibold text-fg">
                {t.common.showingSelected(selectedIds.length)}
              </span>
              {onBulkDelete && (
                <Button
                  size="xs"
                  variant="danger"
                  icon={<HeroTrash className="w-3.5 h-3.5" />}
                  onClick={() => setShowBulkDeleteModal(true)}
                >
                  {t.common.delete}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Table Body */}
        {isLoading ? (
          <TableSkeleton rows={5} columns={visibleColumns.length + 1} />
        ) : paginatedData.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={createActionLabel}
            onAction={onActionCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr
                  className="text-sm font-semibold text-fg select-none bg-table-header border-b border-line-divider sticky top-0 z-10"
                >
                  {/* Select All Checkbox */}
                  <th className="py-3 px-4 w-10">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isSomeSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      aria-label="Select all"
                    />
                  </th>

                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable && handleSort(col.key)}
                      className={cn(
                        'py-3.5 px-4',
                        col.sortable && 'cursor-pointer hover:text-primary-600 dark:hover:text-primary-400',
                        col.className
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.label}</span>
                        {col.sortable && (
                          <HeroChevronUpDown className="w-3.5 h-3.5 text-fg-subtle" />
                        )}
                      </div>
                    </th>
                  ))}

                  {/* Actions Header */}
                  {(onView || onEdit || onDelete || customRowActions) && (
                    <th className="py-3.5 px-4 text-right w-24">{t.common.actions}</th>
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
                        'transition duration-75 border-b border-line-row',
                        isSelected
                          ? 'bg-hover-bg'
                          : 'hover:bg-hover-bg'
                      )}
                    >
                      {/* Row Checkbox */}
                      <td className="py-3.5 px-4 w-10">
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(id, e.target.checked)}
                          aria-label={`Select item ${id}`}
                        />
                      </td>

                      {/* Columns */}
                      {visibleColumns.map((col) => (
                        <td key={col.key} className={cn('py-3.5 px-4 align-middle leading-6', col.className)}>
                          {col.render ? col.render(item) : String(item[col.key] ?? '-')}
                        </td>
                      ))}

                      {/* Row Actions */}
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
                                  className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-hover-bg transition-colors cursor-pointer"
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
                                  className="p-1.5 rounded-lg text-fg-subtle hover:text-primary-600 dark:hover:text-primary-400 hover:bg-hover-bg transition-colors cursor-pointer"
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
                                  className="p-1.5 rounded-lg text-fg-subtle hover:text-red-600 dark:hover:text-red-400 hover:bg-hover-bg transition-colors cursor-pointer"
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
        )}

        {/* Table Footer */}
        <div
          className="p-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-fg-muted bg-surface-muted border-t border-line-divider rounded-b-xl relative z-20"
        >
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-1">
            <Tooltip content={t.pagination.previousPage}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-md bg-surface ring-1 ring-line-strong text-fg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-hover-bg transition duration-75 cursor-pointer"
                aria-label={t.pagination.previousPage}
              >
                <HeroChevronLeft className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            <span className="px-2 font-medium text-fg">
              {t.pagination.showing}{' '}
              <span className="font-semibold text-fg">{page}</span>{' '}
              {t.pagination.of}{' '}
              <span className="font-semibold text-fg">{totalPages}</span>
            </span>

            <Tooltip content={t.pagination.nextPage}>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-md bg-surface ring-1 ring-line-strong text-fg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-hover-bg transition duration-75 cursor-pointer"
                aria-label={t.pagination.nextPage}
              >
                <HeroChevronRight className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

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
          <p className="text-xs text-fg-muted">
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
          <p className="text-xs text-fg-muted">
            {t.common.deletePermanentNotice}
          </p>
        </div>
      </Modal>
    </div>
  )
}
