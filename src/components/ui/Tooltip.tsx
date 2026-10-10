import React, { useState, useId, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement<{ 'aria-describedby'?: string }>
  position?: TooltipPlacement
  placement?: TooltipPlacement
  className?: string
  delay?: number
  maxWidth?: number
  disabled?: boolean
}

interface Coords {
  top: number
  left: number
  actualPlacement: TooltipPlacement
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  placement,
  className,
  delay = 200,
  maxWidth = 280,
  disabled = false,
}) => {
  const preferredPlacement = placement || position
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(null)
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const tooltipId = useId()

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const tipEl = tooltipRef.current

    // Default estimate if not measured yet
    const tipWidth = tipEl ? tipEl.offsetWidth : 120
    const tipHeight = tipEl ? tipEl.offsetHeight : 32
    const gap = 6 // offset between trigger and tooltip
    const margin = 8 // padding from viewport edges

    const vw = window.innerWidth
    const vh = window.innerHeight

    let resolvedPlacement = preferredPlacement

    // Check collision & flip
    if (preferredPlacement === 'top') {
      const neededTop = rect.top - tipHeight - gap
      if (neededTop < margin && vh - rect.bottom > tipHeight + gap + margin) {
        resolvedPlacement = 'bottom'
      }
    } else if (preferredPlacement === 'bottom') {
      const neededBottom = rect.bottom + tipHeight + gap
      if (neededBottom > vh - margin && rect.top > tipHeight + gap + margin) {
        resolvedPlacement = 'top'
      }
    } else if (preferredPlacement === 'left') {
      const neededLeft = rect.left - tipWidth - gap
      if (neededLeft < margin && vw - rect.right > tipWidth + gap + margin) {
        resolvedPlacement = 'right'
      }
    } else if (preferredPlacement === 'right') {
      const neededRight = rect.right + tipWidth + gap
      if (neededRight > vw - margin && rect.left > tipWidth + gap + margin) {
        resolvedPlacement = 'left'
      }
    }

    let top = 0
    let left = 0

    if (resolvedPlacement === 'top') {
      top = rect.top - tipHeight - gap
      left = rect.left + rect.width / 2 - tipWidth / 2
    } else if (resolvedPlacement === 'bottom') {
      top = rect.bottom + gap
      left = rect.left + rect.width / 2 - tipWidth / 2
    } else if (resolvedPlacement === 'left') {
      top = rect.top + rect.height / 2 - tipHeight / 2
      left = rect.left - tipWidth - gap
    } else if (resolvedPlacement === 'right') {
      top = rect.top + rect.height / 2 - tipHeight / 2
      left = rect.right + gap
    }

    // Keep horizontal within viewport bounds
    left = Math.max(margin, Math.min(left, vw - tipWidth - margin))

    // Keep vertical within viewport bounds
    top = Math.max(margin, Math.min(top, vh - tipHeight - margin))

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      actualPlacement: resolvedPlacement,
    })
  }, [preferredPlacement])

  const showTooltip = () => {
    if (disabled || !content) return
    if (timeoutId.current) clearTimeout(timeoutId.current)
    timeoutId.current = setTimeout(() => {
      calculatePosition()
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutId.current) clearTimeout(timeoutId.current)
    setIsVisible(false)
  }

  // Recalculate position when tooltip element mounts or updates size
  useEffect(() => {
    if (isVisible) {
      calculatePosition()
    }
  }, [isVisible, calculatePosition])

  // Update position on window scroll / resize while visible
  useEffect(() => {
    if (!isVisible) return

    const handleScrollOrResize = () => {
      calculatePosition()
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize, true)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize, true)
    }
  }, [isVisible, calculatePosition])

  // Clean timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current)
    }
  }, [])

  // Clone child with ref and accessibility attributes
  const child = React.isValidElement(children) ? children : <span>{children}</span>
  const clonedChild = React.cloneElement(child as React.ReactElement<any>, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node
      // Preserve original ref if exists
      const { ref } = child as any
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref && typeof ref === 'object') {
        ref.current = node
      }
    },
    'aria-describedby': isVisible ? tooltipId : undefined,
    onMouseEnter: (e: React.MouseEvent) => {
      child.props?.onMouseEnter?.(e)
      showTooltip()
    },
    onMouseLeave: (e: React.MouseEvent) => {
      child.props?.onMouseLeave?.(e)
      hideTooltip()
    },
    onFocus: (e: React.FocusEvent) => {
      child.props?.onFocus?.(e)
      showTooltip()
    },
    onBlur: (e: React.FocusEvent) => {
      child.props?.onBlur?.(e)
      hideTooltip()
    },
  })

  return (
    <>
      {clonedChild}
      {isVisible &&
        content &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${coords?.top ?? -9999}px`,
              left: `${coords?.left ?? -9999}px`,
              maxWidth: `${maxWidth}px`,
            }}
            className={cn(
              'z-[9999] px-2.5 py-1 text-[11px] font-medium rounded-md shadow-xl pointer-events-none break-words animate-scale-in transition-opacity',
              'bg-surface text-fg border border-line ring-1 ring-line',
              coords === null ? 'opacity-0' : 'opacity-100',
              className
            )}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  )
}
