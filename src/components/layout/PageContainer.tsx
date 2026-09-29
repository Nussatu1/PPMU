import React from 'react'
import { cn } from '@/lib/utils'

export type PageContainerVariant = 'full' | 'wide' | 'narrow' | 'form' | 'detail' | 'article'

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PageContainerVariant
  padding?: 'normal' | 'tight' | 'none'
  children: React.ReactNode
}

/**
 * Global PageContainer Architecture:
 * - Fluid, responsive width that adapts proportionally to viewport and sidebar state.
 * - Exact same coordinate system as Topbar (px-4 sm:px-6 lg:px-8).
 * - No artificial narrow fixed max-widths or viewport-centering offsets.
 * - Content sections and grids fill 100% of the available content area.
 */
const variantStyles: Record<PageContainerVariant, string> = {
  full: 'w-full',
  wide: 'w-full',
  form: 'w-full',
  detail: 'w-full',
  narrow: 'w-full',
  article: 'w-full',
}

const paddingStyles = {
  normal: 'px-4 sm:px-6 lg:px-8 py-6',
  tight: 'px-3 sm:px-4 py-4',
  none: 'p-0',
}

export const PageContainer: React.FC<PageContainerProps> = ({
  variant = 'full',
  padding = 'normal',
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex-1 min-w-0 w-full flex flex-col space-y-6 transition-all duration-300 ease-in-out',
        variantStyles[variant],
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  breadcrumbs?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  breadcrumbs,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors',
        className
      )}
    >
      <div className="min-w-0">
        {breadcrumbs && <div className="mb-1">{breadcrumbs}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5 truncate">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{title}</span>
        </h1>
        {subtitle && (
          <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  )
}

export interface PageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const PageContent: React.FC<PageContentProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn('flex-1 space-y-6 sm:space-y-8 min-w-0 w-full', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export interface PageSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}

export const PageSection: React.FC<PageSectionProps> = ({
  title,
  description,
  actions,
  className,
  children,
  ...props
}) => {
  return (
    <section className={cn('space-y-4 w-full min-w-0', className)} {...props}>
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-fg leading-6">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-fg-muted mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
