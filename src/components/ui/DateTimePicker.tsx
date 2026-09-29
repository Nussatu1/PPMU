import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Portal } from '@headlessui/react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  HeroCalendar,
  HeroClock,
  HeroXMark,
  HeroCheck,
  HeroChevronLeft,
  HeroChevronRight,
} from '@/components/icons/HeroIcons'
import {
  parseLocalDate,
  formatLocalDate,
  setActiveDatePicker,
  subscribeDatePicker,
} from './DatePicker'

export interface DateTimePickerProps {
  label?: string
  value?: string // 'YYYY-MM-DDTHH:mm' or 'YYYY-MM-DD HH:mm'
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
}

function parseDateTimeParts(dateTimeStr?: string): { dateStr: string; timeStr: string } {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') {
    return { dateStr: '', timeStr: '09:00' }
  }
  const clean = dateTimeStr.trim().replace(' ', 'T')
  const [d = '', t = '09:00'] = clean.split('T')
  const time = t ? t.slice(0, 5) : '09:00'
  return { dateStr: d, timeStr: time }
}

function formatDisplayDateTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return ''
  const { dateStr, timeStr } = parseDateTimeParts(dateTimeStr)
  const parsedDate = parseLocalDate(dateStr)
  if (!parsedDate || isNaN(parsedDate.getTime())) return dateTimeStr
  const formattedDate = format(parsedDate, 'dd MMM yyyy', { locale: id })
  return `${formattedDate}, ${timeStr}`
}

const QUICK_TIME_PRESETS = ['08:00', '09:00', '13:00', '16:00', '19:00']

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  defaultValue = '',
  onChange,
  name,
  placeholder = 'Pilih tanggal & waktu...',
  error,
  helperText,
  required,
  disabled = false,
  className,
  id: customId,
  minDate,
  maxDate,
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
        setIsOpenState(false)
        setActiveDatePicker(null)
      }
    },
    [pickerId]
  )

  useEffect(() => {
    return subscribeDatePicker((activeId) => {
      if (activeId !== pickerId) {
        setIsOpenState(false)
      }
    })
  }, [pickerId])

  const [internalVal, setInternalVal] = useState<string>(value !== undefined ? value : defaultValue)
  const currentVal = value !== undefined ? value : internalVal

  const { dateStr, timeStr } = useMemo(() => parseDateTimeParts(currentVal), [currentVal])
  const selectedDate = useMemo(() => parseLocalDate(dateStr), [dateStr])

  // Internal time state for editing in popover
  const [tempHour, setTempHour] = useState(() => (timeStr ? timeStr.split(':')[0] : '09'))
  const [tempMinute, setTempMinute] = useState(() => (timeStr ? timeStr.split(':')[1] : '00'))

  // Sync internal time when value changes from outside
  useEffect(() => {
    if (timeStr) {
      const [h = '09', m = '00'] = timeStr.split(':')
      setTempHour(h)
      setTempMinute(m)
    }
  }, [timeStr])

  const handleSelectDate = useCallback(
    (date?: Date) => {
      if (!date) return
      const newDateStr = formatLocalDate(date)
      const newCombined = `${newDateStr}T${tempHour.padStart(2, '0')}:${tempMinute.padStart(2, '0')}`
      if (value === undefined) setInternalVal(newCombined)
      onChange?.(newCombined)
    },
    [onChange, tempHour, tempMinute, value]
  )

  const applyTime = useCallback(
    (hour: string, minute: string) => {
      const h = hour.padStart(2, '0').slice(0, 2)
      const m = minute.padStart(2, '0').slice(0, 2)
      setTempHour(h)
      setTempMinute(m)
      const baseDate = dateStr || formatLocalDate(new Date())
      const newCombined = `${baseDate}T${h}:${m}`
      if (value === undefined) setInternalVal(newCombined)
      onChange?.(newCombined)
    },
    [dateStr, onChange, value]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (value === undefined) setInternalVal('')
      onChange?.('')
    },
    [onChange, value]
  )

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

  const POPUP_WIDTH = 310
  const ESTIMATED_HEIGHT = 380

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const popupHeight = popupRef.current ? popupRef.current.offsetHeight : ESTIMATED_HEIGHT
    const popupWidth = popupRef.current ? popupRef.current.offsetWidth : POPUP_WIDTH

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
  }, [isOpen, setIsOpen])

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

  const displayText = useMemo(() => formatDisplayDateTime(currentVal), [currentVal])

  return (
    <div className={cn('w-full space-y-1', className)}>
      {label && (
        <label htmlFor={pickerId} className="block text-xs font-medium text-fg">
          {label}
          {required && <span className="text-red-500 ml-0.5 font-bold">*</span>}
        </label>
      )}

      <div className="relative">
        {name && <input type="hidden" name={name} value={currentVal} />}

        {/* SINGLE UNIFIED TRIGGER */}
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
            'w-full flex items-center justify-between rounded-lg border py-2 px-3 text-xs sm:text-sm text-left transition-colors shadow-2xs select-none min-h-[2.375rem] cursor-pointer',
            'bg-surface text-fg',
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
              : isOpen
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-line-strong hover:border-line-strong focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
            disabled && 'opacity-50 cursor-not-allowed bg-surface-muted text-fg-muted'
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <HeroCalendar className="w-4 h-4 text-amber-500 shrink-0" />
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
                className="p-0.5 hover:text-fg rounded cursor-pointer"
                aria-label="Hapus tanggal dan waktu"
              >
                <HeroXMark className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </button>
      </div>

      {/* PORTAL-MOUNTED UNIFIED POPOVER */}
      {isOpen && (
        <Portal>
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              top: `${popupCoords.top}px`,
              left: `${popupCoords.left}px`,
              zIndex: 99999,
              width: `${POPUP_WIDTH}px`,
            }}
            className={cn(
              'rounded-xl border border-line ring-1 ring-line/60 bg-surface p-3.5 shadow-xl select-none text-fg',
              popupCoords.placement === 'top' ? 'animate-popover-top' : 'animate-popover-bottom'
            )}
          >
            {/* Calendar */}
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

            {/* Integrated Time Section */}
            <div className="mt-2.5 pt-2.5 border-t border-line space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-fg">
                  <HeroClock className="w-4 h-4 text-amber-500" />
                  <span>Waktu (WIB):</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    value={tempHour}
                    onChange={(e) => {
                      const val = e.target.value.slice(-2)
                      setTempHour(val)
                      applyTime(val, tempMinute)
                    }}
                    onBlur={() => setTempHour((prev) => prev.padStart(2, '0'))}
                    className="w-10 h-7 rounded border border-line-strong bg-surface px-1 text-center font-mono text-xs font-semibold text-fg outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    aria-label="Jam"
                  />
                  <span className="font-bold text-fg-muted">:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    value={tempMinute}
                    onChange={(e) => {
                      const val = e.target.value.slice(-2)
                      setTempMinute(val)
                      applyTime(tempHour, val)
                    }}
                    onBlur={() => setTempMinute((prev) => prev.padStart(2, '0'))}
                    className="w-10 h-7 rounded border border-line-strong bg-surface px-1 text-center font-mono text-xs font-semibold text-fg outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    aria-label="Menit"
                  />
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-fg-muted mr-0.5">Preset:</span>
                {QUICK_TIME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      const [h, m] = preset.split(':')
                      applyTime(h, m)
                    }}
                    className={cn(
                      'text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer',
                      tempHour.padStart(2, '0') + ':' + tempMinute.padStart(2, '0') === preset
                        ? 'bg-amber-500 text-white border-amber-500 font-semibold'
                        : 'border-line bg-surface-muted text-fg-muted hover:text-fg hover:border-line-strong'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-fg-muted hover:text-red-500 transition-colors cursor-pointer"
                >
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1 rounded-md shadow-xs transition-colors cursor-pointer"
                >
                  <HeroCheck className="w-3.5 h-3.5" />
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-fg-muted">{helperText}</p>}
    </div>
  )
}
