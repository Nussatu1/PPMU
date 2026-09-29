import React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'primary'
    | 'amber'
    | 'emerald'
    | 'green'
    | 'success'
    | 'danger'
    | 'rose'
    | 'red'
    | 'warning'
    | 'info'
    | 'blue'
    | 'purple'
    | 'violet'
    | 'gray'
    | 'zinc'
  size?: 'sm' | 'md'
  dot?: boolean
}

// Filament v4 badge uses rounded-md, ring-1 ring-inset
export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'gray',
  size = 'sm',
  dot = false,
  children,
  ...props
}) => {
  const base = 'inline-flex items-center font-medium rounded-md'

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
  }

  const variants: Record<string, string> = {
    primary:
      'ring-1 ring-inset ring-amber-600/10 bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:ring-amber-400/30 dark:text-amber-400',
    amber:
      'ring-1 ring-inset ring-amber-600/10 bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:ring-amber-400/30 dark:text-amber-400',
    warning:
      'ring-1 ring-inset ring-amber-600/10 bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:ring-amber-400/30 dark:text-amber-400',
    emerald:
      'ring-1 ring-inset ring-green-600/10 bg-green-50 text-green-600 dark:bg-green-400/10 dark:ring-green-400/30 dark:text-green-400',
    green:
      'ring-1 ring-inset ring-green-600/10 bg-green-50 text-green-600 dark:bg-green-400/10 dark:ring-green-400/30 dark:text-green-400',
    success:
      'ring-1 ring-inset ring-green-600/10 bg-green-50 text-green-600 dark:bg-green-400/10 dark:ring-green-400/30 dark:text-green-400',
    danger:
      'ring-1 ring-inset ring-red-600/10 bg-red-50 text-red-600 dark:bg-red-400/10 dark:ring-red-400/30 dark:text-red-400',
    rose:
      'ring-1 ring-inset ring-red-600/10 bg-red-50 text-red-600 dark:bg-red-400/10 dark:ring-red-400/30 dark:text-red-400',
    red:
      'ring-1 ring-inset ring-red-600/10 bg-red-50 text-red-600 dark:bg-red-400/10 dark:ring-red-400/30 dark:text-red-400',
    info:
      'ring-1 ring-inset ring-blue-600/10 bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:ring-blue-400/30 dark:text-blue-400',
    blue:
      'ring-1 ring-inset ring-blue-600/10 bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:ring-blue-400/30 dark:text-blue-400',
    purple:
      'ring-1 ring-inset ring-purple-600/10 bg-purple-50 text-purple-600 dark:bg-purple-400/10 dark:ring-purple-400/30 dark:text-purple-400',
    violet:
      'ring-1 ring-inset ring-violet-600/10 bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:ring-violet-400/30 dark:text-violet-400',
    gray:
      'bg-surface-muted text-fg-muted ring-1 ring-inset ring-line-strong',
    zinc:
      'bg-surface-muted text-fg-muted ring-1 ring-inset ring-line-strong',
  }

  const dotColors: Record<string, string> = {
    primary: 'bg-amber-500',
    amber: 'bg-amber-500',
    warning: 'bg-amber-500',
    emerald: 'bg-green-500',
    green: 'bg-green-500',
    success: 'bg-green-500',
    danger: 'bg-red-500',
    rose: 'bg-red-500',
    red: 'bg-red-500',
    info: 'bg-blue-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    violet: 'bg-violet-500',
    gray: 'bg-fg-muted',
    zinc: 'bg-fg-muted',
  }

  return (
    <span
      className={cn(base, sizes[size], variants[variant] ?? variants['gray'], className)}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColors[variant] ?? dotColors['gray']
          )}
        />
      )}
      {children}
    </span>
  )
}
