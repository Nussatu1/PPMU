import React from 'react'
import { cn } from '@/lib/utils'
import { HeroCheck, HeroMinus } from '@/components/icons/HeroIcons'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
  helperText?: string
  error?: string
  indeterminate?: boolean
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      checked,
      defaultChecked,
      indeterminate,
      onChange,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const internalId = id || React.useId()
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = !!indeterminate
      }
    }, [indeterminate])

    const isChecked = !!checked

    return (
      <div className={cn('inline-flex items-start gap-2.5 select-none', className)}>
        <div className="relative flex items-center justify-center shrink-0 mt-1 max-lg:min-w-[44px] max-lg:min-h-[44px] max-lg:mt-0">
          {/* Custom Styled Checkbox using appearance-none */}
          <input
            id={internalId}
            ref={inputRef}
            type="checkbox"
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            onChange={onChange}
            className={cn(
              'appearance-none w-4 h-4 rounded ring-1 transition duration-75 cursor-pointer shadow-sm',
              'bg-input-bg ring-line-strong',
              'focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-500',
              'hover:ring-primary-500/60',
              'checked:bg-primary-600 dark:checked:bg-primary-500 checked:ring-primary-600 dark:checked:ring-primary-500',
              indeterminate && 'bg-primary-600 dark:bg-primary-500 ring-primary-600 dark:ring-primary-500',
              disabled && 'opacity-50 cursor-not-allowed bg-surface-muted ring-line'
            )}
            {...props}
          />

          {/* Centered Heroicon SVG for Checked / Indeterminate */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
            {indeterminate ? (
              <HeroMinus className="w-3 h-3 stroke-[2.5]" />
            ) : isChecked ? (
              <HeroCheck className="w-3 h-3 stroke-[2.5]" />
            ) : null}
          </div>
        </div>

        {(label || helperText) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={internalId}
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
)

Checkbox.displayName = 'Checkbox'
