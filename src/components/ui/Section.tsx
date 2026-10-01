import React, { useState } from 'react'

import { cn } from '@/lib/utils'
import { HeroChevronDown } from '@/components/icons/HeroIcons'

export interface SectionProps {
  title: string
  description?: string
  icon?: React.ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  children: React.ReactNode
  className?: string
  columns?: 1 | 2 | 3 | 12
}

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  icon,
  collapsible = false,
  defaultCollapsed = false,
  children,
  className,
  columns = 2,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const gridCols: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    12: 'grid-cols-1 md:grid-cols-12',
  }

  return (
    <div
      className={cn(
        'w-full rounded-xl shadow-sm transition-all bg-surface ring-1 ring-line',
        collapsed ? 'overflow-hidden' : 'overflow-visible',
        className
      )}
    >
      {/* Section Header */}
      {collapsible ? (
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          className={cn(
            'w-full px-5 py-3.5 sm:px-6 sm:py-3.5 flex items-center justify-between text-left',
            !collapsed && 'border-b border-line-divider',
            'cursor-pointer hover:bg-hover-bg select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 rounded-t-xl'
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-surface-muted ring-1 ring-line flex items-center justify-center text-amber-500 shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-semibold text-fg tracking-tight truncate">
                {title}
              </h3>
              {description && (
                <p className="hidden sm:block text-xs text-fg-muted mt-0.5 leading-relaxed">{description}</p>
              )}
            </div>
          </div>
          <HeroChevronDown
            className={cn(
              'w-4 h-4 text-fg-muted transition-transform duration-200 shrink-0',
              collapsed && '-rotate-90'
            )}
          />
        </button>
      ) : (
        <div
          className={cn(
            'px-5 py-3.5 sm:px-6 sm:py-3.5 flex items-center justify-between',
            !collapsed && 'border-b border-line-divider',
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-surface-muted ring-1 ring-line flex items-center justify-center text-amber-500 shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-semibold text-fg tracking-tight truncate">
                {title}
              </h3>
              {description && (
                <p className="hidden sm:block text-xs text-fg-muted mt-0.5 leading-relaxed">{description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className={cn('p-5 sm:p-6 grid gap-4 sm:gap-5', gridCols[columns] || gridCols[2])}>
          {children}
        </div>
      )}
    </div>
  )
}
