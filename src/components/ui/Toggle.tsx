import React, { useState, useEffect } from 'react'
import { Switch } from '@headlessui/react'
import { cn } from '@/lib/utils'

export interface ToggleProps {
  label?: string
  helperText?: string
  error?: string
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  id?: string
  name?: string
  size?: 'sm' | 'md'
  className?: string
  onChange?: (e: { target: { name?: string; checked: boolean; value: boolean } }) => void
  onCheckedChange?: (checked: boolean) => void
}

export const Toggle: React.FC<ToggleProps> = ({
  className,
  label,
  helperText,
  error,
  checked,
  defaultChecked = false,
  disabled = false,
  id,
  name,
  size = 'md',
  onChange,
  onCheckedChange,
}) => {
  const toggleId = id || React.useId()
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (checked !== undefined) return !!checked
    return !!defaultChecked
  })

  useEffect(() => {
    if (checked !== undefined) {
      setEnabled(!!checked)
    }
  }, [checked])

  const handleToggle = (nextChecked: boolean) => {
    if (disabled) return
    if (checked === undefined) {
      setEnabled(nextChecked)
    }
    onCheckedChange?.(nextChecked)
    onChange?.({
      target: {
        name,
        checked: nextChecked,
        value: nextChecked,
      },
    })
  }

  const isCurrentChecked = checked !== undefined ? checked : enabled

  const trackSizes = {
    sm: 'h-4 w-7',
    md: 'h-6 w-11',
  }

  const thumbSizes = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
  }

  const translateSizes = {
    sm: isCurrentChecked ? 'translate-x-3.5' : 'translate-x-0.5',
    md: isCurrentChecked ? 'translate-x-5.5' : 'translate-x-0.5',
  }

  return (
    <div className={cn('flex items-start gap-3 select-none', className)}>
      <Switch
        id={toggleId}
        checked={isCurrentChecked}
        disabled={disabled}
        onChange={handleToggle}
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 focus:ring-offset-surface shrink-0 cursor-pointer',
          trackSizes[size],
          isCurrentChecked
            ? 'bg-primary-600 dark:bg-primary-500'
            : 'bg-line-divider',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'inline-block rounded-full transform transition-transform duration-200 shadow bg-white toggle-thumb',
            thumbSizes[size],
            translateSizes[size]
          )}
        />
      </Switch>

      {(label || helperText) && (
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={toggleId}
              onClick={() => handleToggle(!isCurrentChecked)}
              className={cn(
                'text-sm font-medium leading-6 cursor-pointer',
                disabled ? 'text-fg-muted cursor-not-allowed' : 'text-fg'
              )}
            >
              {label}
            </label>
          )}
          {helperText && (
            <p className="text-sm text-fg-muted mt-0.5">{helperText}</p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-0.5">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
