import React from 'react'
import { Link } from 'react-router-dom'
import { HeroChevronRight, HeroChevronLeft } from '@/components/icons/HeroIcons'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const previousItem = items.length > 1 ? items[items.length - 2] : null

  return (
    <>
      {/* Mobile back link if nested breadcrumb (iOS-style) */}
      {previousItem && (
        <div className="flex sm:hidden items-center py-0.5 select-none">
          {previousItem.href ? (
            <Link
              to={previousItem.href}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 active:opacity-60 transition-opacity"
            >
              <HeroChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="truncate max-w-[200px]">{previousItem.label}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 active:opacity-60 transition-opacity cursor-pointer"
            >
              <HeroChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="truncate max-w-[200px]">{previousItem.label}</span>
            </button>
          )}
        </div>
      )}

      {/* Desktop/Tablet Breadcrumb Path (Unchanged) */}
      <nav
        className={cn(
          'items-center text-sm text-fg-muted py-1 select-none',
          previousItem ? 'hidden sm:flex' : 'flex'
        )}
        aria-label="Breadcrumb"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <HeroChevronRight className="w-3.5 h-3.5 text-fg-subtle mx-1.5 shrink-0" />
              )}
              {isLast || !item.href ? (
                <span
                  className={
                    isLast
                      ? 'font-medium text-primary-600 dark:text-primary-400 truncate max-w-[240px]'
                      : 'font-medium text-fg-muted truncate max-w-[200px]'
                  }
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="font-medium text-fg-nav hover:text-fg transition-colors duration-75 truncate max-w-[200px]"
                >
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          )
        })}
      </nav>
    </>
  )
}
