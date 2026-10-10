import React from 'react'
import { Tooltip, type TooltipPlacement } from './Tooltip'
import { HeroInformationCircle } from '@/components/icons/HeroIcons'
import { cn } from '@/lib/utils'

export interface InfoTooltipProps {
  content: React.ReactNode
  placement?: TooltipPlacement
  className?: string
  iconClassName?: string
  size?: 'xs' | 'sm' | 'md'
}

/**
 * Reusable InfoTooltip for progressive disclosure.
 * Displays a clean (i) icon that reveals detailed microcopy only on hover/focus,
 * eliminating cognitive overload from constant helper text / banner pollution.
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  placement = 'top',
  className,
  iconClassName,
  size = 'xs',
}) => {
  if (!content) return null

  const sizeCls =
    size === 'xs'
      ? 'w-3.5 h-3.5'
      : size === 'sm'
      ? 'w-4 h-4'
      : 'w-5 h-5'

  return (
    <Tooltip content={content} placement={placement} maxWidth={260}>
      <button
        type="button"
        tabIndex={0}
        aria-label="Informasi selengkapnya"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        className={cn(
          'inline-flex items-center justify-center text-fg-muted hover:text-fg focus-visible:text-primary-500 focus-visible:outline-none transition-colors cursor-help p-0.5 rounded',
          className
        )}
      >
        <HeroInformationCircle className={cn(sizeCls, iconClassName)} />
      </button>
    </Tooltip>
  )
}
