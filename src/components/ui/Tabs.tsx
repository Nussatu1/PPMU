import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { HeroChevronRight } from '@/components/icons/HeroIcons'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

/**
 * Tab strip responsif.
 * - Tap target minimum 44px pada ponsel.
 * - Tab aktif selalu digulir ke tengah saat berpindah, sehingga tidak "hilang"
 *   di luar viewport pada layar sempit.
 * - Petunjuk geser muncul hanya ketika daftar tab lebih lebar dari container.
 */
export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  const navRef = useRef<HTMLElement>(null)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const check = () => setOverflows(el.scrollWidth > el.clientWidth + 2)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    window.addEventListener('resize', check)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [tabs.length])

  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`)
    el?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [activeTab])

  return (
    <div className={cn('relative border-b border-line-divider', className)}>
      <nav
        ref={navRef}
        className="flex space-x-1 sm:space-x-3 overflow-x-auto scroll-smooth"
        aria-label="Tabs"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              data-tab-id={tab.id}
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 min-h-[44px] py-2.5 px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer',
                isActive
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400 font-semibold'
                  : 'border-transparent text-fg-muted hover:text-fg hover:border-line'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-[11px] font-semibold rounded-md',
                    isActive
                      ? 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20 dark:bg-primary-500/20 dark:text-primary-300'
                      : 'bg-surface-muted text-fg-muted ring-1 ring-inset ring-line-strong'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Petunjuk geser: hanya di ponsel dan hanya bila tab melebihi lebar container */}
      {overflows && (
        <div
          className="pointer-events-none absolute right-0 bottom-0 sm:hidden w-7 h-11 flex items-center justify-center rounded-l-md bg-surface/95 backdrop-blur-sm ring-1 ring-line text-fg-muted"
          aria-hidden="true"
        >
          <HeroChevronRight className="w-4 h-4" />
        </div>
      )}
    </div>
  )
}