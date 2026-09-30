import React from 'react'
import { cn } from '@/lib/utils'
import { HeroClock } from '@/components/icons/HeroIcons'

export interface TimePickerProps {
  label?: string
  value?: string // 'HH:mm'
  onChange?: (val: string) => void
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  className?: string
  id?: string
}

export const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value = '09:00',
  onChange,
  error,
  helperText,
  required,
  disabled = false,
  className,
  id,
}) => {
  const generatedId = React.useId()
  const inputId = id || generatedId

  const [hour = '09', minute = '00'] = (value || '09:00').split(':')

  const handleHour = (newH: string) => {
    const clamped = Math.max(0, Math.min(23, parseInt(newH, 10) || 0))
    const formatted = String(clamped).padStart(2, '0')
    onChange?.(`${formatted}:${minute}`)
  }

  const handleMin = (newM: string) => {
    const clamped = Math.max(0, Math.min(59, parseInt(newM, 10) || 0))
    const formatted = String(clamped).padStart(2, '0')
    onChange?.(`${hour}:${formatted}`)
  }

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-fg">
          {label}
          {required && <span className="text-red-500 ml-0.5 font-bold">*</span>}
        </label>
      )}

      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border bg-surface px-2.5 py-1.5 shadow-2xs transition-colors',
          error
            ? 'border-red-500 ring-2 ring-red-500/20'
            : 'border-line-strong hover:border-primary-500 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20',
          disabled && 'opacity-50 cursor-not-allowed bg-surface-muted text-fg-muted'
        )}
      >
        <HeroClock className="w-4 h-4 text-primary-500 shrink-0 select-none" />
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={hour}
          disabled={disabled}
          onChange={(e) => handleHour(e.target.value.slice(-2))}
          className="w-8 bg-transparent text-center font-mono text-xs font-semibold text-fg outline-none select-all"
          aria-label="Jam"
        />
        <span className="font-bold text-fg-muted select-none">:</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={minute}
          disabled={disabled}
          onChange={(e) => handleMin(e.target.value.slice(-2))}
          className="w-8 bg-transparent text-center font-mono text-xs font-semibold text-fg outline-none select-all"
          aria-label="Menit"
        />
      </div>

      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-fg-muted">{helperText}</p>}
    </div>
  )
}
