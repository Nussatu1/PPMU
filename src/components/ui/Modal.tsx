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

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-2 sm:p-4 flex min-h-full items-end sm:items-center justify-center">
        <DialogPanel
          transition
          className={cn(
            'relative w-full rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden text-left bg-surface ring-1 ring-line max-h-[90vh] sm:max-h-[85vh] flex flex-col',
            'transition-all data-closed:translate-y-4 sm:data-closed:translate-y-0 data-closed:scale-95 data-closed:opacity-0 data-enter:duration-200 data-leave:duration-150',
            maxWidthStyles[activeWidth] || 'max-w-md'
          )}
        >
          {/* Header */}
          {(title || description) && (
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-line-divider flex items-center justify-between bg-surface-muted shrink-0">
              <div>
                {title && (
                  <DialogTitle className="text-sm sm:text-base font-semibold text-fg">
                    {title}
                  </DialogTitle>
                )}
                {description && (
                  <p className="text-xs sm:text-sm text-fg-muted mt-0.5">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-hover-bg transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <HeroXMark className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-line-divider bg-surface-muted flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
