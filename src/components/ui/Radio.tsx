import React from 'react'
import { cn } from '@/lib/utils'

export interface RadioOption {
  value: string | number
  label: React.ReactNode
  description?: string
  disabled?: boolean
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
  description?: string
  error?: string
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, error, checked, defaultChecked, disabled, id, ...props }, ref) => {
    const internalId = id || React.useId()

    return (
      <div className={cn('inline-flex items-start gap-2.5 select-none', className)}>
        <div className="relative flex items-center justify-center shrink-0 mt-1">
          <input
            id={internalId}
            ref={ref}
            type="radio"
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            className={cn(
              'appearance-none w-4 h-4 rounded-full ring-1 transition duration-75 cursor-pointer shadow-sm',
              'bg-input-bg ring-line-strong',
              'focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-500',
              'hover:ring-primary-500/60',
              'checked:bg-primary-600 dark:checked:bg-primary-500 checked:ring-primary-600 dark:checked:ring-primary-500',
              disabled && 'opacity-50 cursor-not-allowed bg-surface-muted ring-line',
              error && 'ring-red-600 dark:ring-red-500'
            )}
            {...props}
          />
          {checked && (
            <span className="pointer-events-none absolute w-1.5 h-1.5 rounded-full bg-white animate-scale-in radio-dot" />
          )}
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={internalId}
                className={cn(
                  'text-sm font-medium leading-6 cursor-pointer text-fg',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-sm text-fg-muted mt-0.5 leading-normal">
                {description}
              </span>
            )}
            {error && (
              <span className="text-sm text-red-600 dark:text-red-400 font-medium mt-0.5">
                {error}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)

Radio.displayName = 'Radio'
