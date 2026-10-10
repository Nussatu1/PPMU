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
    <section
      className={cn(
        'w-full rounded-xl bg-surface ring-1 ring-line shadow-xs transition-all overflow-hidden',
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
            'w-full px-5 py-4 sm:px-6 sm:py-4.5 flex items-center justify-between text-left gap-3',
            !collapsed && 'border-b border-line-divider/80',
            'cursor-pointer hover:bg-hover-bg/60 select-none transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500'
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-surface-muted/80 ring-1 ring-line/60 flex items-center justify-center text-primary shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-semibold text-fg tracking-tight truncate">
                {title}
              </h3>
              {description && (
                <p className="hidden sm:block text-xs text-fg-muted mt-0.5 leading-relaxed font-normal">{description}</p>
              )}
            </div>
          </div>
          <div className="shrink-0 p-1 rounded-md text-fg-muted hover:text-fg transition-colors">
            <HeroChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200 ease-out',
                collapsed && '-rotate-90'
              )}
            />
          </div>
        </button>
      ) : (
        <div
          className={cn(
            'px-5 py-4 sm:px-6 sm:py-4.5 flex items-center justify-between',
            !collapsed && 'border-b border-line-divider/80',
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-surface-muted/80 ring-1 ring-line/60 flex items-center justify-center text-primary shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-semibold text-fg tracking-tight truncate">
                {title}
              </h3>
              {description && (
                <p className="hidden sm:block text-xs text-fg-muted mt-0.5 leading-relaxed font-normal">{description}</p>
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
    </section>
  )
}
