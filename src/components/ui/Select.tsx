import React, { useState, useRef, useEffect, useMemo, useCallback, useImperativeHandle } from 'react'
import { Portal } from '@headlessui/react'
import { cn } from '@/lib/utils'
import {
  HeroChevronUpDown,
  HeroCheck,
  HeroMagnifyingGlass,
  HeroXMark,
} from '@/components/icons/HeroIcons'

export interface SelectOption {
  value: string | number
  label?: string
  group?: string
  disabled?: boolean
}

export interface SelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  label?: string
  error?: string
  helperText?: string
  options?: SelectOption[]
  required?: boolean
  placeholder?: string
  searchable?: boolean
  multiple?: boolean
  clearable?: boolean
  value?: any
  defaultValue?: any
  name?: string
  disabled?: boolean
  id?: string
  className?: string
  children?: React.ReactNode
  placement?: 'top' | 'bottom' | 'auto'
  onChange?: (e: any) => void
  onValueChange?: (val: any) => void
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      required,
      placeholder = 'Pilih salah satu...',
      children,
      id,
      name,
      value,
      defaultValue = '',
      disabled = false,
      multiple = false,
      clearable = false,
      searchable,
      placement = 'auto',
      onChange,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const selectId = id || generatedId
    const triggerRef = useRef<HTMLButtonElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const listboxRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState<number>(-1)

    // Internal value handling
    const [internalVal, setInternalVal] = useState<any>(() => {
      if (value !== undefined) return value
      if (defaultValue !== undefined) return defaultValue
      return multiple ? [] : ''
    })

    const currentVal = value !== undefined ? value : internalVal

    // Parse options from either `options` prop or `children` (<option> tags without rendering them)
    const parsedOptions: SelectOption[] = useMemo(() => {
      if (options && options.length > 0) return options

      const opts: SelectOption[] = []
      React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return

        // Support <option value="...">Label</option> without emitting native DOM
        const props = child.props as any
        if (props.value !== undefined) {
          const val = props.value
          const lbl = typeof props.children === 'string'
            ? props.children
            : Array.isArray(props.children)
            ? props.children.join('')
            : String(val)
          opts.push({
            value: val,
            label: lbl,
            disabled: props.disabled,
          })
        }
      })
      return opts
    }, [options, children])

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
      if (!searchQuery.trim()) return parsedOptions
      const q = searchQuery.toLowerCase().trim()
      return parsedOptions.filter((opt) => (opt.label || String(opt.value)).toLowerCase().includes(q))
    }, [parsedOptions, searchQuery])

    const shouldShowSearch = searchable !== undefined ? searchable : parsedOptions.length > 8

    // Trigger value change notification
    const emitChange = useCallback((nextVal: any) => {
      if (value === undefined) {
        setInternalVal(nextVal)
      }
      onValueChange?.(nextVal)
      if (onChange) {
        const syntheticEvent = {
          target: {
            name: name || '',
            value: nextVal,
            id: selectId,
          },
          currentTarget: {
            name: name || '',
            value: nextVal,
            id: selectId,
          },
          preventDefault: () => {},
          stopPropagation: () => {},
        }
        onChange(syntheticEvent as any)
      }
    }, [name, selectId, value, onChange, onValueChange])

    const handleSelectOption = useCallback((opt: SelectOption) => {
      if (opt.disabled) return

      if (multiple) {
        const arr = Array.isArray(currentVal) ? [...currentVal] : []
        const idx = arr.indexOf(opt.value)
        if (idx !== -1) {
          arr.splice(idx, 1)
        } else {
          arr.push(opt.value)
        }
        emitChange(arr)
      } else {
        emitChange(opt.value)
        setIsOpen(false)
        setSearchQuery('')
        triggerRef.current?.focus()
      }
    }, [multiple, currentVal, emitChange])

    const handleRemoveChip = useCallback((val: string | number, e: React.MouseEvent) => {
      e.stopPropagation()
      if (!multiple) return
      const arr = Array.isArray(currentVal) ? [...currentVal] : []
      const idx = arr.indexOf(val)
      if (idx !== -1) {
        arr.splice(idx, 1)
        emitChange(arr)
      }
    }, [multiple, currentVal, emitChange])

    const handleClear = useCallback((e: React.MouseEvent) => {
      e.stopPropagation()
      emitChange(multiple ? [] : '')
    }, [multiple, emitChange])

    // Exact positioning coordinates for Portal popup
    const [popupCoords, setPopupCoords] = useState<{
      top?: number
      bottom?: number
      left: number
      width: number
      maxHeight: number
      placement: 'bottom' | 'top'
    }>({
      left: 0,
      width: 0,
      maxHeight: 260,
      placement: 'bottom',
    })

    useImperativeHandle(ref, () => containerRef.current!)

    const calculateCoords = useCallback(() => {
      if (!triggerRef.current) return null
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const estimatedHeight = 220
      const computedPlacement =
        placement === 'top'
          ? 'top'
          : placement === 'bottom'
          ? 'bottom'
          : spaceBelow < estimatedHeight && spaceAbove > spaceBelow
          ? 'top'
          : 'bottom'

      const left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))
      const width = rect.width

      if (computedPlacement === 'top') {
        const bottom = Math.round(window.innerHeight - rect.top + 4)
        const maxHeight = Math.max(80, Math.min(spaceAbove - 16, 260))
        return {
          bottom,
          left,
          width,
          maxHeight,
          placement: 'top' as const,
        }
      } else {
        const top = Math.round(rect.bottom + 4)
        const maxHeight = Math.max(80, Math.min(spaceBelow - 16, 260))
        return {
          top,
          left,
          width,
          maxHeight,
          placement: 'bottom' as const,
        }
      }
    }, [placement])

    const updateCoords = useCallback(() => {
      const coords = calculateCoords()
      if (coords) setPopupCoords(coords)
    }, [calculateCoords])

    const toggleOpen = useCallback((e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()
      if (disabled) return
      setIsOpen((prev) => {
        if (!prev) {
          const coords = calculateCoords()
          if (coords) setPopupCoords(coords)
          return true
        }
        setSearchQuery('')
        return false
      })
    }, [disabled, calculateCoords])

    useEffect(() => {
      if (isOpen) {
        updateCoords()
        const handleScrollOrResize = () => updateCoords()
        window.addEventListener('resize', handleScrollOrResize)
        window.addEventListener('scroll', handleScrollOrResize, true)
        return () => {
          window.removeEventListener('resize', handleScrollOrResize)
          window.removeEventListener('scroll', handleScrollOrResize, true)
        }
      }
    }, [isOpen, updateCoords])

    // Safe focus on search input without triggering dialog focus traps
    useEffect(() => {
      if (isOpen && shouldShowSearch) {
        const raf = requestAnimationFrame(() => {
          searchInputRef.current?.focus()
        })
        return () => cancelAnimationFrame(raf)
      }
    }, [isOpen, shouldShowSearch])

    // Click outside handler
    useEffect(() => {
      if (!isOpen) return
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node
        if (!target) return
        if (
          triggerRef.current?.contains(target) ||
          listboxRef.current?.contains(target)
        ) {
          return
        }
        setIsOpen(false)
        setSearchQuery('')
      }
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }, [isOpen])

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (!isOpen) {
          const coords = calculateCoords()
          if (coords) setPopupCoords(coords)
          setIsOpen(true)
          setActiveIndex(0)
          return
        }
        if (filteredOptions.length === 0) return

        let nextIdx = activeIndex
        if (e.key === 'ArrowDown') {
          nextIdx = activeIndex < filteredOptions.length - 1 ? activeIndex + 1 : 0
        } else {
          nextIdx = activeIndex > 0 ? activeIndex - 1 : filteredOptions.length - 1
        }
        setActiveIndex(nextIdx)
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (isOpen && activeIndex >= 0 && activeIndex < filteredOptions.length) {
          e.preventDefault()
          handleSelectOption(filteredOptions[activeIndex])
        } else if (!isOpen) {
          e.preventDefault()
          const coords = calculateCoords()
          if (coords) setPopupCoords(coords)
          setIsOpen(true)
        }
      } else if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault()
          setIsOpen(false)
          setSearchQuery('')
          triggerRef.current?.focus()
        }
      } else if (e.key === 'Home') {
        if (isOpen) {
          e.preventDefault()
          setActiveIndex(0)
        }
      } else if (e.key === 'End') {
        if (isOpen) {
          e.preventDefault()
          setActiveIndex(filteredOptions.length - 1)
        }
      }
    }

    // Keyboard navigation when search input is focused
    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (filteredOptions.length === 0) return
        let nextIdx = activeIndex
        if (e.key === 'ArrowDown') {
          nextIdx = activeIndex < filteredOptions.length - 1 ? activeIndex + 1 : 0
        } else {
          nextIdx = activeIndex > 0 ? activeIndex - 1 : filteredOptions.length - 1
        }
        setActiveIndex(nextIdx)
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          e.preventDefault()
          handleSelectOption(filteredOptions[activeIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        setSearchQuery('')
        triggerRef.current?.focus()
      }
    }

    // Selected labels
    const selectedOptions = useMemo(() => {
      if (multiple && Array.isArray(currentVal)) {
        return parsedOptions.filter((opt) => currentVal.includes(opt.value))
      }
      return parsedOptions.filter((opt) => String(opt.value) === String(currentVal))
    }, [multiple, currentVal, parsedOptions])

    const hasValue = multiple
      ? Array.isArray(currentVal) && currentVal.length > 0
      : currentVal !== '' && currentVal !== null && currentVal !== undefined

    return (
      <div
        ref={containerRef}
        className={cn('w-full space-y-1', className)}
        {...props}
      >
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-fg"
          >
            {label}
            {required && <span className="text-red-600 dark:text-red-400 ml-0.5 font-bold">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Custom Trigger Button — No Native Select Element in DOM */}
          <button
            ref={triggerRef}
            id={selectId}
            type="button"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={`${selectId}-popup`}
            disabled={disabled}
            onClick={toggleOpen}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full flex items-center justify-between rounded-lg bg-input-bg px-3 py-1.5 text-base sm:text-sm sm:leading-6 text-left transition duration-75 select-none min-h-[2.375rem] cursor-pointer shadow-sm ring-1',
              'text-fg',
              error
                ? 'ring-red-600 dark:ring-red-500 focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500'
                : isOpen
                ? 'ring-2 ring-primary-600 dark:ring-primary-500'
                : 'ring-line-strong hover:ring-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-500',
              disabled && 'opacity-60 cursor-not-allowed bg-surface-muted text-fg-muted'
            )}
          >
            <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0 pr-2">
              {multiple && Array.isArray(currentVal) && currentVal.length > 0 ? (
                selectedOptions.map((opt) => (
                  <span
                    key={opt.value}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-surface-muted text-fg ring-1 ring-line"
                  >
                    <span className="truncate max-w-[120px]">{opt.label}</span>
                    {!disabled && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleRemoveChip(opt.value, e)}
                        className="text-fg-muted hover:text-red-500 cursor-pointer"
                      >
                        <HeroXMark className="w-3 h-3" />
                      </span>
                    )}
                  </span>
                ))
              ) : selectedOptions.length > 0 ? (
                <span className="truncate font-medium text-fg">
                  {selectedOptions[0].label}
                </span>
              ) : (
                <span className="truncate text-fg-subtle">
                  {placeholder}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 text-fg-subtle">
              {clearable && hasValue && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  className="p-0.5 hover:text-fg rounded cursor-pointer"
                >
                  <HeroXMark className="w-3.5 h-3.5" />
                </span>
              )}
              <HeroChevronUpDown className="w-5 h-5 text-fg-subtle" />
            </div>
          </button>
        </div>

        {/* Portal-Mounted Dropdown Panel — Exact Fixed Viewport Positioning */}
        {isOpen && (
          <Portal>
            <div
              ref={listboxRef}
              id={`${selectId}-popup`}
              role="listbox"
              style={{
                position: 'fixed',
                ...(popupCoords.top !== undefined ? { top: `${popupCoords.top}px` } : {}),
                ...(popupCoords.bottom !== undefined ? { bottom: `${popupCoords.bottom}px` } : {}),
                left: `${popupCoords.left}px`,
                width: `${popupCoords.width}px`,
                maxHeight: `${popupCoords.maxHeight}px`,
                zIndex: 9999,
              }}
              className="rounded-lg shadow-lg p-1 bg-surface ring-1 ring-line animate-scale-in flex flex-col"
            >
              {shouldShowSearch && (
                <div className="p-1.5 border-b border-line-divider mb-1 shrink-0">
                  <div className="relative flex items-center">
                    <HeroMagnifyingGlass className="w-3.5 h-3.5 absolute left-2 text-fg-subtle pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setActiveIndex(0)
                      }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Cari..."
                      className="w-full pl-7 pr-2 py-1 text-xs rounded-md bg-input-bg text-fg ring-1 ring-line-strong focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              <div className="overflow-y-auto space-y-0.5 flex-1 overscroll-contain">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-fg-muted">
                    Tidak ada hasil ditemukan
                  </div>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const isSelected = multiple
                      ? Array.isArray(currentVal) && currentVal.includes(opt.value)
                      : String(currentVal) === String(opt.value)
                    const isActive = activeIndex === idx

                    return (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={opt.disabled}
                        onClick={() => handleSelectOption(opt)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'flex items-center justify-between px-2 py-2 rounded-md text-sm cursor-pointer transition duration-75',
                          opt.disabled && 'opacity-40 cursor-not-allowed',
                          isSelected
                            ? 'bg-nav-active text-primary-600 dark:text-primary-400 font-medium'
                            : isActive
                            ? 'bg-hover-bg text-fg'
                            : 'text-fg hover:bg-hover-bg'
                        )}
                      >
                        <span className="truncate">{opt.label || String(opt.value)}</span>
                        {isSelected && (
                          <HeroCheck className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0 ml-2" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </Portal>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}
        {helperText && !error && <p className="text-sm text-fg-muted">{helperText}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
