import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Portal } from '@headlessui/react'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  HeroCalendar,
  HeroXMark,
  HeroChevronLeft,
  HeroChevronRight,
} from '@/components/icons/HeroIcons'

export interface DatePickerProps {
  label?: string
  value?: string
  defaultValue?: string
  onChange?: (val: string) => void
  name?: string
  placeholder?: string
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  className?: string
  id?: string
  minDate?: string
  maxDate?: string
  mode?: 'single' | 'range'
  rangeValue?: { from?: string; to?: string }
  onRangeChange?: (range: { from?: string; to?: string }) => void
}

/**
 * Timezone-Safe Local Date Parser (UTC+7 / WIB safe).
 * Strictly avoids new Date('yyyy-MM-dd') which can shift by 1 day due to UTC midnight.
 */
export function parseLocalDate(dateStr?: string): Date | undefined {
  if (!dateStr || typeof dateStr !== 'string') return undefined
  const parts = dateStr.trim().split('-')
  if (parts.length !== 3) return undefined
  const [y, m, d] = parts.map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined
  return new Date(y, m - 1, d)
}

export function formatLocalDate(date?: Date): string {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return ''
  const parsed = parseLocalDate(dateStr)
  if (!parsed || isNaN(parsed.getTime())) return dateStr
  return format(parsed, 'dd MMM yyyy', { locale: id })
}

// Global manager to guarantee strictly only one date picker is open at any time
let activeDatePickerId: string | null = null
const datePickerListeners = new Set<(id: string | null) => void>()

export function setActiveDatePicker(id: string | null) {
  activeDatePickerId = id
  datePickerListeners.forEach((fn) => fn(id))
}

export function subscribeDatePicker(listener: (id: string | null) => void) {
  datePickerListeners.add(listener)
  return () => {
    datePickerListeners.delete(listener)
  }
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  defaultValue = '',
  onChange,
  name,
  placeholder = 'Pilih tanggal...',
  error,
  helperText,
  required,
  disabled = false,
  className,
  id: customId,
  minDate,
  maxDate,
  mode = 'single',
  rangeValue,
  onRangeChange,
}) => {
  const generatedId = React.useId()
  const pickerId = customId || generatedId

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpenState] = useState(false)

  const setIsOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setActiveDatePicker(pickerId)
        setIsOpenState(true)
      } else {
        if (activeDatePickerId === pickerId) {
          setActiveDatePicker(null)
        }
        setIsOpenState(false)
      }
    },
    [pickerId]
  )

  useEffect(() => {
    const listener = (activeId: string | null) => {
      if (activeId !== pickerId) {
        setIsOpenState(false)
      }
    }
    datePickerListeners.add(listener)
    return () => {
      datePickerListeners.delete(listener)
      if (activeDatePickerId === pickerId) {
        setActiveDatePicker(null)
      }
    }
  }, [pickerId])

  const [internalVal, setInternalVal] = useState<string>(value !== undefined ? value : defaultValue)
  const currentVal = value !== undefined ? value : internalVal

  const selectedDate = useMemo(() => parseLocalDate(currentVal), [currentVal])

  const selectedRange: DateRange | undefined = useMemo(() => {
    if (mode !== 'range' || !rangeValue) return undefined
    return {
      from: parseLocalDate(rangeValue.from),
      to: parseLocalDate(rangeValue.to),
    }
  }, [mode, rangeValue])

  const handleSelectDate = useCallback(
    (date?: Date) => {
      if (mode === 'single') {
        const iso = date ? formatLocalDate(date) : ''
        if (value === undefined) setInternalVal(iso)
        onChange?.(iso)
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    },
    [mode, onChange, value]
  )

  const handleSelectRange = useCallback(
    (range?: DateRange) => {
      if (mode === 'range' && onRangeChange) {
        onRangeChange({
          from: range?.from ? formatLocalDate(range?.from) : undefined,
          to: range?.to ? formatLocalDate(range?.to) : undefined,
        })
      }
    },
    [mode, onRangeChange]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (mode === 'single') {
        if (value === undefined) setInternalVal('')
        onChange?.('')
      } else {
        onRangeChange?.({ from: undefined, to: undefined })
      }
    },
    [mode, onChange, onRangeChange, value]
  )

  const handleToday = useCallback(() => {
    const today = new Date()
    handleSelectDate(today)
  }, [handleSelectDate])

  // Positioning coordinates for Portal popup (fixed viewport coordinates)
  const [popupCoords, setPopupCoords] = useState<{
    top: number
    left: number
    placement: 'bottom' | 'top'
  }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  })

  const CALENDAR_WIDTH = 296
  const ESTIMATED_HEIGHT = 280

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Use measured dimensions if popup is rendered, or fallback to constants
    const popupHeight = popupRef.current ? popupRef.current.offsetHeight : ESTIMATED_HEIGHT
    const popupWidth = popupRef.current ? popupRef.current.offsetWidth : CALENDAR_WIDTH

    // Smart vertical collision detection
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    const preferTop = spaceBelow < popupHeight + 8 && spaceAbove > spaceBelow
    const placement = preferTop ? 'top' : 'bottom'

    let top = placement === 'bottom' ? rect.bottom + 4 : rect.top - popupHeight - 4
    top = Math.max(8, Math.min(top, viewportHeight - popupHeight - 8))

    // Smart horizontal collision detection: anchor to input
    let left = rect.left
    if (left + popupWidth > viewportWidth - 12) {
      left = rect.right - popupWidth
    }
    left = Math.max(8, Math.min(left, viewportWidth - popupWidth - 8))

    setPopupCoords({
      top: Math.round(top),
      left: Math.round(left),
      placement,
    })
  }, [])

  useEffect(() => {
    if (isOpen) {
      updateCoords()
      const raf = requestAnimationFrame(updateCoords)
      const handleScrollOrResize = () => updateCoords()
      window.addEventListener('resize', handleScrollOrResize)
      window.addEventListener('scroll', handleScrollOrResize, true)
      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', handleScrollOrResize)
        window.removeEventListener('scroll', handleScrollOrResize, true)
      }
    }
  }, [isOpen, updateCoords])

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
    } else if ((e.key === 'Enter' || e.key === ' ') && !isOpen) {
      e.preventDefault()
      setIsOpen(true)
    }
  }

  const displayText = useMemo(() => {
    if (mode === 'single') {
      return currentVal ? formatDisplayDate(currentVal) : ''
    }
    if (rangeValue?.from && rangeValue?.to) {
      return `${formatDisplayDate(rangeValue.from)} - ${formatDisplayDate(rangeValue.to)}`
    }
    if (rangeValue?.from) {
      return `${formatDisplayDate(rangeValue.from)} - ...`
    }
    return ''
  }, [mode, currentVal, rangeValue])

  return (
    <div className={cn('w-full space-y-1', className)}>
      {label && (
        <label htmlFor={pickerId} className="block text-xs font-semibold text-fg">
          {label}
          {required && <span className="text-red-500 ml-0.5 font-bold">*</span>}
        </label>
      )}

      <div className="relative">
        {name && <input type="hidden" name={name} value={currentVal} />}
        {/* Custom Date Trigger: No Native <input type="date"> Anywhere in DOM */}
        <button
          ref={triggerRef}
          id={pickerId}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={cn(
            'w-full flex items-center justify-between rounded-lg border py-2 px-3 text-xs sm:text-sm text-left transition-colors shadow-2xs select-none min-h-[44px] sm:min-h-[2.375rem] cursor-pointer',
            'bg-surface text-fg',
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
              : isOpen
              ? 'border-primary-500 ring-2 ring-primary-500/20'
              : 'border-line-strong hover:border-line-strong focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            disabled && 'opacity-50 cursor-not-allowed bg-surface-muted text-fg-muted'
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <HeroCalendar className="w-4 h-4 text-primary-500 shrink-0" />
            {displayText ? (
              <span className="font-medium text-fg truncate">{displayText}</span>
            ) : (
              <span className="text-fg-muted truncate">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 text-fg-muted">
            {displayText && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -m-3 hover:text-fg rounded cursor-pointer"
                aria-label="Hapus tanggal"
              >
                <HeroXMark className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Portal-Mounted Calendar Popover */}
      {isOpen && (
        <Portal>
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              top: `${popupCoords.top}px`,
              left: `${popupCoords.left}px`,
              width: `${CALENDAR_WIDTH}px`,
              zIndex: 99999,
            }}
            className={cn(
              'p-3.5 rounded-xl shadow-xl bg-surface border border-line ring-1 ring-line/60 text-fg select-none',
              popupCoords.placement === 'top' ? 'animate-popover-top' : 'animate-popover-bottom'
            )}
          >
            {mode === 'single' ? (
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleSelectDate}
                locale={id}
                weekStartsOn={1}
                disabled={[
                  ...(minDate ? [{ before: parseLocalDate(minDate)! }] : []),
                  ...(maxDate ? [{ after: parseLocalDate(maxDate)! }] : []),
                ]}
                className="rdp-custom"
                components={{
                  Chevron: ({ orientation }) =>
                    orientation === 'left' ? (
                      <HeroChevronLeft className="w-3.5 h-3.5" />
                    ) : (
                      <HeroChevronRight className="w-3.5 h-3.5" />
                    ),
                }}
              />
            ) : (
              <DayPicker
                mode="range"
                selected={selectedRange}
                onSelect={handleSelectRange}
                locale={id}
                weekStartsOn={1}
                className="rdp-custom"
                components={{
                  Chevron: ({ orientation }) =>
                    orientation === 'left' ? (
                      <HeroChevronLeft className="w-3.5 h-3.5" />
                    ) : (
                      <HeroChevronRight className="w-3.5 h-3.5" />
                    ),
                }}
              />
            )}

            {/* Quick Action Footer */}
            <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 rounded-md text-fg-muted font-medium hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Hari Ini
              </button>
            </div>
          </div>
        </Portal>
      )}

      {error && <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-fg-muted">{helperText}</p>}
    </div>
  )
}
