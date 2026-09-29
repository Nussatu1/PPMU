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
      <div
        onClick={() => collapsible && setCollapsed(!collapsed)}
        className={cn(
          'px-5 py-3.5 sm:px-6 sm:py-3.5 flex items-center justify-between',
          !collapsed && 'border-b border-line-divider',
          collapsible && 'cursor-pointer hover:bg-hover-bg select-none'
        )}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-surface-muted ring-1 ring-line flex items-center justify-center text-amber-500 shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-base font-bold text-fg tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
        </div>

        {collapsible && (
          <HeroChevronDown
            className={cn(
              'w-4 h-4 text-fg-subtle transition-transform duration-200',
              collapsed && '-rotate-90'
            )}
          />
        )}
      </div>

      {!collapsed && (
        <div className={cn('p-5 sm:p-6 grid gap-4 sm:gap-5', gridCols[columns] || gridCols[2])}>
          {children}
        </div>
      )}
    </div>
  )
}
