import React from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { useHelp } from '@/context/HelpContext'
import { getHelpContent } from '@/content/help'
import { Button } from '@/components/ui/Button'
import {
  HeroXMark,
  HeroArrowLeft,
  HeroInformationCircle,
  HeroQuestionMarkCircle,
  HeroArrowRight,
} from '@/components/icons/HeroIcons'

export const HelpDrawer: React.FC = () => {
  const {
    isOpen,
    closeHelp,
    currentContent,
    activeKey,
    routeKey,
    viewHelpKey,
    resetToCurrentRoute,
    isViewingRelated,
  } = useHelp()

  return (
    <Dialog open={isOpen} onClose={closeHelp} className="relative z-50">
      {/* Backdrop */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-overlay transition-opacity data-closed:opacity-0 data-enter:duration-300 data-leave:duration-200"
      />

      {/* Drawer slide-over container */}
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        <DialogPanel
          transition
          className="w-full max-w-md h-full bg-surface shadow-2xl ring-1 ring-line flex flex-col transition-transform data-closed:translate-x-full data-enter:duration-300 data-leave:duration-200 ease-out"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-line-divider bg-surface-muted flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <HeroQuestionMarkCircle className="w-3.5 h-3.5" />
                  Tutorial Bantuan
                </span>
                {isViewingRelated && (
                  <span className="text-[10px] text-fg-muted">
                    (Tautan Terkait)
                  </span>
                )}
              </div>
              <DialogTitle className="text-base sm:text-lg font-semibold text-fg leading-snug">
                {currentContent ? currentContent.judul : 'Bantuan Halaman'}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={closeHelp}
              className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-hover-bg transition-colors cursor-pointer shrink-0"
              aria-label="Tutup panel bantuan"
            >
              <HeroXMark className="w-5 h-5" />
            </button>
          </div>

          {/* Subheader if viewing related topic */}
          {isViewingRelated && (
            <div className="px-5 py-2.5 bg-amber-500/5 border-b border-line-divider flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-fg-muted truncate">
                Melihat panduan terkait
              </span>
              <button
                type="button"
                onClick={resetToCurrentRoute}
                className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer shrink-0"
              >
                <HeroArrowLeft className="w-3.5 h-3.5" />
                Kembali ke halaman ini
              </button>
            </div>
          )}

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {!currentContent ? (
              /* Fallback for unmapped or custom pages */
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-surface-muted border border-line flex items-center justify-center text-fg-muted">
                  <HeroQuestionMarkCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-fg">
                  Tutorial Belum Tersedia
                </h3>
                <p className="text-xs text-fg-muted max-w-xs mx-auto leading-relaxed">
                  Tutorial untuk halaman ini belum tersedia. Hubungi admin sistem.
                </p>
                <p className="text-[11px] font-mono text-fg-subtle">
                  Rute: {routeKey}
                </p>
              </div>
            ) : (
              <>
                {/* 1. Ringkasan */}
                <div className="p-3.5 rounded-xl bg-surface-muted border border-line">
                  <p className="text-xs sm:text-sm text-fg leading-relaxed">
                    {currentContent.ringkasan}
                  </p>
                </div>

                {/* 2. Langkah-langkah bernomor */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
                    Langkah Penggunaan / Pengisian
                  </h4>
                  <div className="space-y-2.5">
                    {currentContent.langkah.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-surface border border-line ring-1 ring-line space-y-1.5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <h5 className="text-xs sm:text-sm font-semibold text-fg">
                            {step.judul}
                          </h5>
                        </div>
                        <p className="text-xs text-fg-muted leading-relaxed pl-7">
                          {step.deskripsi}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Tips / Catatan Penting */}
                {currentContent.tips && currentContent.tips.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                      <HeroInformationCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Tips & Hal yang Perlu Diperhatikan</span>
                    </div>
                    <ul className="space-y-1.5 pl-5 list-disc marker:text-amber-500 text-fg-muted leading-relaxed">
                      {currentContent.tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 4. Topik Terkait (Navigasi In-Panel) */}
                {currentContent.terkait && currentContent.terkait.length > 0 && (
                  <div className="pt-4 border-t border-line-divider space-y-2.5">
                    <span className="text-xs font-semibold text-fg-muted block">
                      Panduan Halaman Terkait
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {currentContent.terkait.map((relKey) => {
                        const relContent = getHelpContent(relKey)
                        const label = relContent ? relContent.judul : relKey
                        const isCurrentActive = activeKey === relKey

                        return (
                          <button
                            key={relKey}
                            type="button"
                            onClick={() => viewHelpKey(relKey)}
                            disabled={isCurrentActive}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              isCurrentActive
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300 cursor-default'
                                : 'bg-surface-muted hover:bg-hover-bg text-fg-muted hover:text-fg border-line'
                            }`}
                          >
                            <span className="truncate max-w-[200px]">{label}</span>
                            {!isCurrentActive && (
                              <HeroArrowRight className="w-3 h-3 shrink-0 text-fg-subtle" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-line-divider bg-surface-muted flex items-center justify-end shrink-0">
            <Button variant="secondary" onClick={closeHelp}>
              Tutup
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
