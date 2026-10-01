import React from 'react'
import { Link } from 'react-router-dom'
import { HeroChevronRight } from '@/components/icons/HeroIcons'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <>
      {/* Desktop/Tablet Breadcrumb Path (Protected: hidden on mobile in favor of MobileAppHeader) */}
      <nav
        className="hidden sm:flex items-center text-sm text-fg-muted py-1 select-none"
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
