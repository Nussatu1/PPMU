import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { HeroPlus, HeroMinus } from '@/components/icons/HeroIcons'

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'defaultValue'> {
  label?: string
  error?: string
  helperText?: string
  value?: number | undefined
  defaultValue?: number | undefined
  onChange?: (val: number | undefined) => void
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
  showStepButtons?: boolean
  containerClassName?: string
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      helperText,
      value,
      defaultValue,
      onChange,
      min,
      max,
      step = 1,
      prefix,
      suffix,
      showStepButtons = false,
      disabled,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId()
    const internalRef = useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement)

    const [isFocused, setIsFocused] = useState(false)
    const [rawVal, setRawVal] = useState<string>(() => {
      const initial = value !== undefined ? value : defaultValue
      return initial !== undefined ? String(initial) : ''
    })

    useEffect(() => {
      if (value !== undefined) {
        setRawVal(value !== null && !isNaN(value) ? String(value) : '')
      }
    }, [value])

    const formatIndonesian = (numStr: string) => {
      if (!numStr) return ''
      const num = parseFloat(numStr)
      if (isNaN(num)) return numStr
      return new Intl.NumberFormat('id-ID').format(num)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputStr = e.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.')
      setRawVal(inputStr)
      const parsed = parseFloat(inputStr)
      onChange?.(isNaN(parsed) ? undefined : parsed)
    }

    const handleStep = (direction: 'up' | 'down') => {
      if (disabled) return
      const current = parseFloat(rawVal) || 0
      const delta = direction === 'up' ? step : -step
      let next = current + delta

      if (min !== undefined && next < min) next = min
      if (max !== undefined && next > max) next = max

      setRawVal(String(next))
      onChange?.(next)
    }

    const displayVal = isFocused ? rawVal : formatIndonesian(rawVal)

    return (
      <div className={cn('w-full space-y-1', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-fg">
            {label}
            {required && <span className="text-red-500 ml-0.5 font-bold">*</span>}
          </label>
        )}

        <div className="relative flex items-center shadow-2xs">
          {prefix && (
            <span className="pointer-events-none absolute left-3 text-xs font-semibold text-fg-muted select-none">
              {prefix}
            </span>
          )}

          <input
            id={inputId}
            ref={internalRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={displayVal}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleChange}
            className={cn(
              'block w-full rounded-lg border py-2 min-h-[44px] sm:min-h-0 text-base sm:text-sm transition-colors shadow-2xs font-mono',
              'bg-surface text-fg placeholder:text-fg-muted',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-line-strong hover:border-line-strong focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
              'focus:outline-none',
              'disabled:bg-surface-muted disabled:text-fg-muted disabled:cursor-not-allowed',
              prefix ? 'pl-8' : 'pl-3',
              suffix || showStepButtons ? 'pr-16' : 'pr-3',
              className
            )}
            {...props}
          />

          <div className="absolute right-2 flex items-center gap-1 select-none">
            {suffix && (
              <span className="text-xs font-semibold text-fg-muted mr-1">
                {suffix}
              </span>
            )}
            {showStepButtons && !disabled && (
              <div className="flex items-center border border-line rounded-md bg-surface-muted overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleStep('down')}
                  className="p-1 hover:bg-hover-bg text-fg-muted hover:text-fg transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label="Kurangi nilai"
                >
                  <HeroMinus className="w-3 h-3" />
                </button>
                <div className="w-[1px] h-3 bg-line" />
                <button
                  type="button"
                  onClick={() => handleStep('up')}
                  className="p-1 hover:bg-hover-bg text-fg-muted hover:text-fg transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label="Tambah nilai"
                >
                  <HeroPlus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-fg-muted">{helperText}</p>}
      </div>
    )
  }
)

NumberInput.displayName = 'NumberInput'
