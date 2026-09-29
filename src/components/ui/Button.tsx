import React from 'react'

import { cn } from '@/lib/utils'
import { HeroArrowPath } from '@/components/icons/HeroIcons'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'sm',
      isLoading = false,
      icon,
      iconRight,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition duration-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-70 disabled:pointer-events-none select-none cursor-pointer'

    const sizes = {
      xs: 'h-7 px-2.5 text-xs gap-1',
      sm: 'h-8 px-3 text-xs gap-1.5', // Filament standard compact button
      md: 'h-9 px-3.5 text-sm gap-1.5',
      lg: 'h-10 px-4 text-sm gap-2',
    }

    const variants = {
      primary:
        'bg-primary-500 hover:bg-primary-400 text-primary-950 font-semibold focus-visible:ring-primary-500 shadow-sm',
      secondary:
        'bg-input-bg hover:bg-hover-bg text-fg ring-1 ring-line-strong focus-visible:ring-primary-500 shadow-sm',
      danger:
        'bg-red-600 hover:bg-red-500 text-white shadow-sm focus-visible:ring-red-500 dark:bg-red-500 dark:hover:bg-red-400',
      success:
        'bg-green-600 hover:bg-green-500 text-white shadow-sm focus-visible:ring-green-500 dark:bg-green-500 dark:hover:bg-green-400',
      outline:
        'bg-transparent hover:bg-hover-bg text-primary-600 dark:text-primary-400 ring-1 ring-primary-500/40 focus-visible:ring-primary-500',
      ghost:
        'bg-transparent hover:bg-hover-bg text-fg-nav focus-visible:ring-primary-500 shadow-none',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
      >
        {isLoading ? (
          <HeroArrowPath className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
        {!isLoading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    )
  }
)
Button.displayName = 'Button'
