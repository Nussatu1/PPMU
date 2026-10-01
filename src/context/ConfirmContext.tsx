import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  HeroExclamationTriangle,
  HeroInformationCircle,
} from '@/components/icons/HeroIcons'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface ConfirmOptions {
  title?: string
  message: string
  tone?: 'danger' | 'warning' | 'primary'
  confirmLabel?: string
  cancelLabel?: string
}

export interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
}

// Persistent Context instance across Vite HMR module re-evaluations
export const ConfirmContext =
  ((globalThis as unknown as { __FILAMENT_CONFIRM_CONTEXT__?: React.Context<ConfirmContextType | undefined> })
    .__FILAMENT_CONFIRM_CONTEXT__ ||= createContext<ConfirmContextType | undefined>(undefined))

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' })
  const resolveRef = useRef<((val: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const normalized: ConfirmOptions = typeof opts === 'string' ? { message: opts } : opts
    setOptions(normalized)
    setIsOpen(true)

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleConfirm = () => {
    setIsOpen(false)
    resolveRef.current?.(true)
  }

  const handleCancel = () => {
    setIsOpen(false)
    resolveRef.current?.(false)
  }

  const tone = options.tone || 'danger'

  const iconBg = {
    danger: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    primary: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  }[tone]

  const contextValue = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}

      <Dialog open={isOpen} onClose={handleCancel} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-overlay transition-opacity data-closed:opacity-0 data-enter:duration-200 data-leave:duration-150"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 flex min-h-full items-center justify-center">
          <DialogPanel
            transition
            className={cn(
              'relative w-full max-w-md rounded-xl shadow-xl p-6 text-left bg-surface ring-1 ring-line',
              'transition-all data-closed:scale-95 data-closed:opacity-0 data-enter:duration-200 data-leave:duration-150'
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', iconBg)}>
                {tone === 'danger' || tone === 'warning' ? (
                  <HeroExclamationTriangle className="w-5 h-5" />
                ) : (
                  <HeroInformationCircle className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1">
                <DialogTitle className="text-base font-semibold text-fg">
                  {options.title || 'Konfirmasi Tindakan'}
                </DialogTitle>
                <p className="text-sm text-fg-muted mt-2 leading-relaxed">
                  {options.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={handleCancel}
              >
                {options.cancelLabel || 'Batal'}
              </Button>
              <Button
                variant={tone === 'danger' ? 'danger' : 'primary'}
                onClick={handleConfirm}
              >
                {options.confirmLabel || 'Ya, Lanjutkan'}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}
