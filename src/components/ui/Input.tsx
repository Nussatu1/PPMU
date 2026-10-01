import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { HeroEye, HeroEyeSlash, HeroXMark } from '@/components/icons/HeroIcons'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  prefixIcon?: React.ReactNode
  suffixIcon?: React.ReactNode
  required?: boolean
  containerClassName?: string
  onClear?: () => void
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      helperText,
      prefixIcon,
      suffixIcon,
      required,
      id,
      type = 'text',
      value,
      onChange,
      onClear,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId()
    const [showPassword, setShowPassword] = useState(false)

    const isPassword = type === 'password'
    const isSearch = type === 'search'
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
      <div className={cn('w-full space-y-1', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-fg"
          >
            {label}
            {required && <span className="text-red-600 dark:text-red-400 ml-0.5 font-bold">*</span>}
          </label>
        )}
        <div
          className={cn(
            'flex items-center rounded-lg bg-input-bg shadow-sm ring-1 transition duration-75 relative min-h-[44px] sm:min-h-0',
            error
              ? 'ring-red-600 dark:ring-red-500 focus-within:ring-2 focus-within:ring-red-600 dark:focus-within:ring-red-500'
              : 'ring-line-strong focus-within:ring-2 focus-within:ring-primary-600 dark:focus-within:ring-primary-500',
            disabled && 'bg-surface-muted text-fg-muted cursor-not-allowed opacity-60'
          )}
        >
          {prefixIcon && (
            <div className="pointer-events-none pl-3 flex items-center text-fg-muted shrink-0">
              {prefixIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            type={computedType}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={cn(
              'w-full bg-transparent px-3 py-1.5 min-h-[44px] sm:min-h-0 text-base text-fg outline-none placeholder:text-fg-subtle sm:text-sm sm:leading-6',
              disabled && 'cursor-not-allowed',
              (suffixIcon || isPassword || (isSearch && value && onClear)) && 'pr-9',
              className
            )}
            {...props}
          />

          {/* Password Show/Hide Custom Action */}
          {isPassword && !disabled && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 min-w-[44px] flex items-center justify-center text-fg-muted hover:text-fg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              tabIndex={-1}
            >
              {showPassword ? (
                <HeroEyeSlash className="w-5 h-5" />
              ) : (
                <HeroEye className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Search Clear Custom Action */}
          {isSearch && value && onClear && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute inset-y-0 right-0 min-w-[44px] flex items-center justify-center text-fg-muted hover:text-fg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              aria-label="Hapus pencarian"
              tabIndex={-1}
            >
              <HeroXMark className="w-4 h-4" />
            </button>
          )}

          {suffixIcon && !isPassword && !isSearch && (
            <div className="pointer-events-none pr-3 flex items-center text-fg-muted shrink-0">
              {suffixIcon}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}
        {helperText && !error && <p className="text-sm text-fg-muted">{helperText}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
