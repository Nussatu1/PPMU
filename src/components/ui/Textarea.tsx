import React, { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  autoGrow?: boolean
  containerClassName?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, label, error, helperText, required, id, rows = 3, autoGrow = true, onChange, onMouseDown, onMouseUp, ...props }, ref) => {
    const textareaId = id || React.useId()
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const userResizedRef = useRef(false)
    const prevHeightRef = useRef<number>(0)

    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement)

    const handleAutoGrow = () => {
      if (!autoGrow || !internalRef.current) return
      // If user has manually resized vertically, do not collapse/shrink below user's height
      if (userResizedRef.current) {
        if (internalRef.current.scrollHeight > internalRef.current.clientHeight) {
          internalRef.current.style.height = `${internalRef.current.scrollHeight}px`
        }
        return
      }
      internalRef.current.style.height = 'auto'
      internalRef.current.style.height = `${internalRef.current.scrollHeight}px`
    }

    useEffect(() => {
      handleAutoGrow()
    }, [props.value, props.defaultValue])

    return (
      <div className={cn('w-full space-y-1', containerClassName)}>
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-fg">
            {label}
            {required && <span className="text-red-500 ml-0.5 font-bold">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={internalRef}
          rows={rows}
          onMouseDown={(e) => {
            if (internalRef.current) {
              prevHeightRef.current = internalRef.current.clientHeight
            }
            onMouseDown?.(e)
          }}
          onMouseUp={(e) => {
            if (internalRef.current && prevHeightRef.current) {
              if (Math.abs(internalRef.current.clientHeight - prevHeightRef.current) > 2) {
                userResizedRef.current = true
              }
            }
            onMouseUp?.(e)
          }}
          onChange={(e) => {
            handleAutoGrow()
            onChange?.(e)
          }}
          className={cn(
            'block w-full rounded-lg border p-3 text-xs sm:text-sm transition-colors resize-y',
            'bg-input-bg text-fg placeholder:text-fg-muted',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-line-strong hover:border-primary-500/40 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            'focus:outline-none',
            'disabled:bg-surface-muted disabled:text-fg-muted disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-fg-muted">{helperText}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
