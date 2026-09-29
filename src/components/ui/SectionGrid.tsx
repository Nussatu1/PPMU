import React from 'react'
import { cn } from '@/lib/utils'

export interface SectionGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  columns?: 1 | 2 | 12
}

/**
 * SectionGrid: Reusable multi-column grid layout for form sections.
 * Desktop: Multi-column (12-column or 2-column side-by-side cards)
 * Mobile: Clean stacked single-column layout.
 */
export const SectionGrid: React.FC<SectionGridProps> = ({
  children,
  className,
  columns = 12,
  ...props
}) => {
  const colClasses = {
    1: 'grid grid-cols-1 gap-5 sm:gap-6',
    2: 'grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start',
    12: 'grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start',
  }

  return (
    <div
      className={cn(colClasses[columns] || colClasses[12], className)}
      {...props}
    >
      {children}
    </div>
  )
}
