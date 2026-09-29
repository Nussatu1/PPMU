import React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode
  footer?: React.ReactNode
  padding?: boolean
}

export const Card: React.FC<CardProps> = ({
  className,
  header,
  footer,
  children,
  padding = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-xl bg-surface ring-1 shadow-sm ring-line overflow-hidden',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-line-divider">
          {header}
        </div>
      )}
      <div className={padding ? 'p-6' : ''}>{children}</div>
      {footer && (
        <div className="px-6 py-3 border-t border-line-divider bg-surface-muted">
          {footer}
        </div>
      )}
    </div>
  )
}
