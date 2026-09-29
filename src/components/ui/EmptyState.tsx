import React from 'react'

import { Button } from './Button'
import { cn } from '@/lib/utils'
import { HeroFolder } from '@/components/icons/HeroIcons'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-surface-muted text-fg-subtle flex items-center justify-center mb-4 ring-8 ring-line">
        {icon || <HeroFolder className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-fg tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-fg-muted mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
