import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { useAuth } from '@/context/AuthContext'
import { ALL_NAVIGATION_MODULES, type NavigationModule } from '@/lib/navigation'
import { cn } from '@/lib/utils'

export const MobileMenuPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSuperAdmin = !!(user?.is_superadmin || user?.role === 'superadmin')

  // Group 1: Ekosistem Organisasi (Operasional Harian)
  const organisasiModules = ALL_NAVIGATION_MODULES.filter((m) => m.group === 'organisasi')

  // Group 2: Tata Kelola Sistem (Khusus Superadmin)
  const sistemModules = isSuperAdmin
    ? ALL_NAVIGATION_MODULES.filter((m) => m.group === 'sistem')
    : []

  const renderModuleGrid = (items: NavigationModule[]) => (
    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-y-3.5 gap-x-2 py-1">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => navigate(item.href)}
            className="flex flex-col items-center gap-1.5 group cursor-pointer active:scale-90 transition-transform select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl"
            aria-label={item.name}
          >
            {/* Solid Card Tile */}
            <div className="relative w-12 h-12 rounded-2xl bg-surface border border-line shadow-xs group-hover:border-primary-500/50 flex items-center justify-center transition-colors">
              <Icon className={cn('w-5 h-5', item.color)} />
              {item.defaultBadge && (
                <span
                  className={cn(
                    'absolute -top-1 -right-1 px-1.5 min-w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-surface shadow-xs',
                    item.badgeColor === 'danger' ? 'bg-red-500' : 'bg-primary-500'
                  )}
                >
                  {item.defaultBadge}
                </span>
              )}
            </div>
            {/* Label Module */}
            <span className="text-[11px] font-medium text-fg group-hover:text-primary-600 dark:group-hover:text-primary-400 text-center truncate w-full px-0.5">
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <PageContainer variant="wide">
      <div className="space-y-6 pt-1 pb-[max(5rem,calc(4rem+env(safe-area-inset-bottom)))]">
        {/* Section 1: Ekosistem Organisasi */}
        <div className="space-y-2">
          <div className="px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">
              Ekosistem Organisasi
            </h2>
            <p className="text-[11px] text-fg-subtle mt-0.5">
              Modul operasional dan siklus kinerja harian
            </p>
          </div>
          {renderModuleGrid(organisasiModules)}
        </div>

        {/* Section 2: Tata Kelola Sistem (Khusus Superadmin) */}
        {sistemModules.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-line-divider">
            <div className="px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                Tata Kelola Sistem
              </h2>
              <p className="text-[11px] text-fg-subtle mt-0.5">
                Administrasi organisasi, otorisasi, dan audit
              </p>
            </div>
            {renderModuleGrid(sistemModules)}
          </div>
        )}
      </div>
    </PageContainer>
  )
}

export default MobileMenuPage
