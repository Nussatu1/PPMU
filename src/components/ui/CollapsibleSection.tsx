import React, { useState } from 'react'
import { HeroChevronDown } from '@/components/icons/HeroIcons'
import { cn } from '@/lib/utils'

export interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

/**
 * CollapsibleSection provides a progressive disclosure container for optional or secondary
 * form groups (e.g. Penugasan Organisasi, Pengaturan Lanjutan), keeping forms clean by default.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
  className,
  contentClassName,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn('rounded-xl border border-line bg-surface/70 overflow-hidden transition-all', className)}>
      <div className="flex items-center justify-between p-3 sm:px-4 hover:bg-hover-bg/60 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex-1 flex items-center justify-between min-w-0 text-left select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 rounded pr-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="w-6 h-6 rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <span className="text-xs font-bold text-fg uppercase tracking-wider truncate">
              {title}
            </span>
          </div>
          <HeroChevronDown
            className={cn(
              'w-4 h-4 text-fg-muted transition-transform duration-200 shrink-0 ml-2',
              isOpen && 'rotate-180 text-fg'
            )}
          />
        </button>
        {badge && <div className="shrink-0 flex items-center ml-2">{badge}</div>}
      </div>

      {isOpen && (
        <div className={cn('p-3 sm:p-4 pt-1 sm:pt-2 border-t border-line-divider/60 space-y-3.5 animate-fade-in', contentClassName)}>
          {children}
        </div>
      )}
    </div>
  )
}
