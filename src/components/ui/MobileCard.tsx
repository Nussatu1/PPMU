import React, { useState, useRef, useEffect } from 'react'
import { HeroEllipsisVertical } from '@/components/icons/HeroIcons'
import { cn } from '@/lib/utils'

export interface MobileCardAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

export interface MobileCardProps {
  /** Baris 1: Judul utama kartu */
  title: React.ReactNode
  /** Subjudul opsional (mis. program induk, kode ref) */
  subtitle?: React.ReactNode
  /** Slot status badge di pojok kanan atas */
  status?: React.ReactNode
  /** Slot meta data: maksimal 2 baris info sekunder (mis. tenggat, PIC, lokasi) */
  meta?: React.ReactNode
  /** Tombol aksi utama (siklus/transisi). Harus min-h-[44px] */
  primaryAction?: React.ReactNode
  /** Menu aksi lanjutan "⋯" jika ada lebih dari 1 aksi (custom node) */
  menu?: React.ReactNode
  /** Daftar aksi untuk menu dropdown "⋯" otomatis */
  menuActions?: MobileCardAction[]
  /** Handler klik kartu (mis. buka diff atau detail) */
  onClick?: () => void
  /** Handler tekan lama (long press) untuk mode seleksi massal */
  onLongPress?: () => void
  /** Apakah kartu sedang dipilih dalam mode seleksi massal */
  isSelected?: boolean
  /** Apakah sedang dalam mode seleksi massal */
  isSelectionMode?: boolean
  /** Checkbox callback saat dalam mode seleksi massal */
  onToggleSelect?: (checked: boolean) => void
  className?: string
}

/**
 * Primitif MobileCard terpadu:
 * - 1 Judul
 * - Maksimal 2 baris info sekunder (meta)
 * - 1 Badge status
 * - 1 Tombol aksi utama
 * - 1 Menu titik tiga "⋯"
 * - Dukungan Long-press gesture untuk mode seleksi massal
 * - Standar touch target minimal 44x44px
 */
export const MobileCard: React.FC<MobileCardProps> = ({
  title,
  subtitle,
  status,
  meta,
  primaryAction,
  menu,
  menuActions,
  onClick,
  onLongPress,
  isSelected = false,
  isSelectionMode = false,
  onToggleSelect,
  className,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuContainerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)

  // Click outside listener for menu dropdown
  useEffect(() => {
    if (!isMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleStart = () => {
    isLongPressRef.current = false
    if (!onLongPress) return
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onLongPress()
    }, 500) // 500ms long press threshold
  }

  const handleEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(!isSelected)
      return
    }
    onClick?.()
  }

  return (
    <div
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onClick={handleClick}
      className={cn(
        'relative p-4 rounded-xl border transition-all duration-200 select-none',
        isSelected
          ? 'bg-primary-500/10 border-primary-500 ring-2 ring-primary-500/30 dark:bg-primary-500/20'
          : 'bg-surface border-line shadow-2xs hover:border-line-strong active:bg-surface-muted',
        onClick || isSelectionMode ? 'cursor-pointer' : '',
        className
      )}
    >
      {/* Header Baris 1: Judul + Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-fg tracking-tight leading-snug line-clamp-1">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5 truncate">
              {subtitle}
            </div>
          )}
        </div>
        {status && <div className="shrink-0">{status}</div>}
      </div>

      {/* Baris 2: Meta Info (Maksimal 2 baris info sekunder) */}
      {meta && (
        <div className="mt-2.5 pt-2.5 border-t border-line/60 text-xs text-fg-muted space-y-1.5">
          {meta}
        </div>
      )}

      {/* Baris 3: Footer Aksi Utama + Menu "⋯" */}
      {(primaryAction || menu || (menuActions && menuActions.length > 0)) && (
        <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {primaryAction}
          </div>
          
          {/* Custom menu or automatic menuActions */}
          {menu ? (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {menu}
            </div>
          ) : menuActions && menuActions.length > 0 ? (
            <div
              ref={menuContainerRef}
              className="relative shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="w-11 h-11 flex items-center justify-center rounded-lg border border-line bg-surface hover:bg-surface-muted text-fg-muted hover:text-fg transition-colors cursor-pointer"
                aria-label="Menu aksi lainnya"
              >
                <HeroEllipsisVertical className="w-5 h-5" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 bottom-full mb-1 z-30 min-w-[160px] bg-surface rounded-xl shadow-lg border border-line p-1 animate-in fade-in zoom-in-95 duration-100">
                  {menuActions.map((act, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false)
                        act.onClick()
                      }}
                      className={cn(
                        'w-full min-h-[44px] px-3 py-2 text-sm flex items-center gap-2.5 rounded-lg font-medium transition-colors cursor-pointer text-left',
                        act.danger
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10'
                          : 'text-fg hover:bg-surface-muted'
                      )}
                    >
                      {act.icon && <span className="shrink-0">{act.icon}</span>}
                      <span>{act.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
