import React from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { cn } from '@/lib/utils'
import { HeroXMark } from '@/components/icons/HeroIcons'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  size,
}) => {
  const activeWidth = size || maxWidth

  const maxWidthStyles: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full',
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-overlay transition-opacity data-closed:opacity-0 data-enter:duration-200 data-leave:duration-150"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 flex min-h-full items-center justify-center">
        <DialogPanel
          transition
          className={cn(
            'relative w-full rounded-xl shadow-xl overflow-hidden text-left bg-surface ring-1 ring-line',
            'transition-all data-closed:scale-95 data-closed:opacity-0 data-enter:duration-200 data-leave:duration-150',
            maxWidthStyles[activeWidth] || 'max-w-md'
          )}
        >
          {/* Header */}
          {(title || description) && (
            <div className="px-6 py-4 border-b border-line-divider flex items-center justify-between bg-surface-muted">
              <div>
                {title && (
                  <DialogTitle className="text-base font-semibold text-fg">
                    {title}
                  </DialogTitle>
                )}
                {description && (
                  <p className="text-sm text-fg-muted mt-0.5">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-fg-muted hover:text-fg hover:bg-hover-bg transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <HeroXMark className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-line-divider bg-surface-muted flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
