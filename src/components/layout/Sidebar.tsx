import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  HeroHome,
  HeroUsers,
  HeroShieldCheck,
  HeroXMark,
  HeroBuildingOffice,
  HeroBriefcase,
  HeroCalendar,
  HeroChartBar,
  HeroCurrencyDollar,
  HeroClipboardDocumentList,
  HeroCheckCircle,
  HeroClock,
  HeroSquares2X2,
  HeroCog6Tooth,
} from '@/components/icons/HeroIcons'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { t } from '@/i18n'
import { Tooltip } from '@/components/ui/Tooltip'

interface SidebarProps {
  isMobileOpen: boolean
  onMobileClose: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  badgeColor?: 'primary' | 'danger' | 'success'
}

interface NavGroup {
  name: string
  items: NavItem[]
}

const getNavigationGroups = (isSuperAdmin: boolean, hasOrg: boolean): NavGroup[] => {
  const groups: NavGroup[] = [
    {
      name: '',
      items: [
        {
          name: t.navigation.dashboard,
          href: '/',
          icon: HeroHome,
        },
      ],
    },
  ]

  // 1. Organisasi — ekosistem kinerja (ditampilkan paling atas)
  if (hasOrg || isSuperAdmin) {
    groups.push({
      name: 'Organisasi',
      items: [
        {
          name: 'Struktur & Seksi',
          href: '/structures',
          icon: HeroSquares2X2,
        },
        {
          name: 'Program Kerja',
          href: '/programs',
          icon: HeroBriefcase,
          badge: '3',
          badgeColor: 'primary',
        },
        {
          name: 'Agenda & Kegiatan',
          href: '/agendas',
          icon: HeroCalendar,
        },
        {
          name: 'Capaian Kinerja',
          href: '/performance',
          icon: HeroChartBar,
        },
        {
          name: 'Anggaran & Keuangan',
          href: '/finance',
          icon: HeroCurrencyDollar,
        },
        {
          name: 'Laporan & Evaluasi',
          href: '/reports',
          icon: HeroClipboardDocumentList,
          badge: '1',
          badgeColor: 'danger',
        },
        {
          name: 'Tugas & Tindak Lanjut',
          href: '/tasks',
          icon: HeroCheckCircle,
        },
      ],
    })
  }

  // 2. Sistem — manajemen sistem dan preferensi
  const sistemItems: NavItem[] = []
  if (isSuperAdmin) {
    sistemItems.push(
      {
        name: 'Organisasi',
        href: '/organizations',
        icon: HeroBuildingOffice,
        badge: '3',
        badgeColor: 'primary',
      },
      {
        name: 'Akun Pengguna',
        href: '/accounts',
        icon: HeroUsers,
      },
      {
        name: 'Peran & Izin Matrix',
        href: '/roles',
        icon: HeroShieldCheck,
      },
      {
        name: 'Audit Trail',
        href: '/audit-logs',
        icon: HeroClock,
      },
    )
  }

  sistemItems.push({
    name: 'Pengaturan',
    href: '/settings',
    icon: HeroCog6Tooth,
  })

  groups.push({
    name: 'Sistem',
    items: sistemItems,
  })

  return groups
}


const FilamentMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="fi-sidebar-logo-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgb(var(--fi-primary-400))" />
        <stop offset="100%" stopColor="rgb(var(--fi-primary-700))" />
      </linearGradient>
      <linearGradient id="fi-sidebar-inner-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
      </linearGradient>
    </defs>
    <path
      d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
      fill="url(#fi-sidebar-logo-grad)"
      stroke="rgb(var(--fi-primary-700))"
      strokeOpacity="0.35"
      strokeWidth="0.75"
    />
    <path
      d="M12 6L7 9V15L12 18L17 15V9L12 6Z"
      fill="url(#fi-sidebar-inner-grad)"
      stroke="rgba(255, 255, 255, 0.4)"
      strokeWidth="0.5"
    />
  </svg>
)

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onMobileClose,
  isCollapsed,
}) => {
  const { user, currentOrganization } = useAuth()

  const isSuperAdmin = !!(user?.is_superadmin || user?.role === 'superadmin')
  const hasOrg = !!currentOrganization

  const badgeClasses = (color: NavItem['badgeColor']) => {
    if (color === 'danger') return 'ring-1 ring-inset ring-red-600/10 bg-red-50 text-red-600 dark:bg-red-400/10 dark:ring-red-400/30 dark:text-red-400'
    if (color === 'success') return 'ring-1 ring-inset ring-green-600/10 bg-green-50 text-green-600 dark:bg-green-400/10 dark:ring-green-400/30 dark:text-green-400'
    return 'ring-1 ring-inset ring-amber-600/10 bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:ring-amber-400/30 dark:text-amber-400'
  }

  const navigationGroups = getNavigationGroups(isSuperAdmin, hasOrg)

  const sidebarContent = (
    <div
      className="flex flex-col h-full overflow-hidden select-none bg-sidebar ring-1 ring-line"
    >
      {/* Brand Header */}
      <div
        className={cn(
          "relative flex items-center shrink-0 h-16 border-b border-line transition-all",
          isCollapsed ? "justify-center px-0" : "justify-between px-4 sm:px-6"
        )}
      >
        <NavLink
          to="/"
          className={cn(
            "flex items-center min-w-0 group focus:outline-none",
            isCollapsed ? "justify-center" : "gap-3"
          )}
          aria-label="My Tafrih Home"
        >
          <div className="shrink-0 transition-transform group-hover:scale-105 flex items-center justify-center">
            {currentOrganization?.logo_url ? (
              <img
                src={currentOrganization.logo_url}
                alt={currentOrganization.name}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <FilamentMark className="w-8 h-8" />
            )}
          </div>
          {!isCollapsed && (
            <div className="truncate select-none">
              <span className="text-base font-bold italic tracking-tight truncate block leading-tight">
                <span className="text-amber-500">My</span> <span className="text-fg">Tafrih</span>
              </span>
              <span className="text-[10px] font-medium text-fg-muted truncate block -mt-0.5">
                {currentOrganization ? currentOrganization.name : 'Ekosistem Kinerja'}
              </span>
            </div>
          )}
        </NavLink>

        {/* Close button on mobile */}
        <button
          type="button"
          onClick={onMobileClose}
          className="lg:hidden rounded-lg p-1.5 text-fg-muted hover:text-fg hover:bg-hover-bg cursor-pointer"
          aria-label="Tutup bilah samping"
        >
          <HeroXMark className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-7">
        {navigationGroups.map((group) => (
          <div key={group.name || 'main'}>
            {/* Group Label */}
            {!isCollapsed && group.name && (
              <div className="px-2 mb-2">
                <p className="text-sm font-medium leading-6 text-fg-muted">
                  {group.name}
                </p>
              </div>
            )}

            {/* Group Items */}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const linkContent = (
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    onClick={onMobileClose}
                    aria-label={item.name}
                    className={({ isActive }) => cn(
                        'fi-sidebar-item group flex items-center gap-x-3 rounded-lg px-2.5 py-2 text-sm font-medium w-full transition duration-75',
                        isActive
                          ? 'bg-nav-active text-primary-600 dark:text-primary-400 font-medium' 
                          : 'text-fg-nav hover:bg-nav-active hover:text-fg'
                      )
                    }
                  >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              'shrink-0 w-5 h-5 transition-colors',
                              isActive
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-fg-subtle group-hover:text-fg-muted'
                            )}
                          />
                          {!isCollapsed && (
                            <span className="flex-1 truncate leading-5">{item.name}</span>
                          )}
                          {!isCollapsed && item.badge && (
                            <span
                              className={cn(
                                'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-md text-[11px] font-semibold',
                                badgeClasses(item.badgeColor)
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                )

                return (
                  <li key={item.href}>
                    {isCollapsed ? (
                      <Tooltip content={item.name} placement="right">
                        {linkContent}
                      </Tooltip>
                    ) : (
                      linkContent
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
          aria-hidden="true"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden lg:block shrink-0 h-screen sticky top-0 transition-[width] duration-300 ease-in-out',
          isCollapsed ? 'w-20' : 'w-80'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
