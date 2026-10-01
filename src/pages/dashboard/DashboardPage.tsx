import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HeroBriefcase,
  HeroCalendar,
  HeroClipboardDocumentList,
  HeroCurrencyDollar,
  HeroBuildingOffice,
  HeroPlus,
  HeroUsers,
  HeroShieldCheck,
  HeroMagnifyingGlass,
  HeroXMark,
  HeroBell,
} from '@/components/icons/HeroIcons'
import { Button } from '@/components/ui/Button'
import { ChartWidget } from '@/components/widgets/ChartWidget'
import { RecentAgendasWidget } from '@/components/widgets/RecentAgendasWidget'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { formatCurrency, cn } from '@/lib/utils'
import { t } from '@/i18n'
import type { Agenda, Notification } from '@/types/database'

import { PageContainer } from '@/components/layout/PageContainer'
import { ALL_NAVIGATION_MODULES, FREQUENT_HOME_MODULE_HREFS } from '@/lib/navigation'
import {
  OrganizationScopeBadge,
  OrganizationScopeSwitcher,
} from '@/components/organization'

export const DashboardPage: React.FC = () => {
  const { user, currentOrganization, currentScopeMode } = useAuth()
  const navigate = useNavigate()

  const [ecoStats, setEcoStats] = useState({
    totalPrograms: 3,
    activePrograms: 1,
    completedPrograms: 0,
    totalAgendas: 3,
    inProgressAgendas: 1,
    upcomingAgendas: 1,
    totalReports: 2,
    pendingReports: 1,
    approvedReports: 1,
    totalTasks: 3,
    pendingTasks: 2,
    totalBudget: 195000000,
    realizedBudget: 78500000,
    absorptionRate: 40,
  })

  const [recentAgendas, setRecentAgendas] = useState<Agenda[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Mobile Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchNotifs = async () => {
      if (!user?.id) return
      try {
        const data = await dataService.getNotifications(user.id, currentOrganization?.id)
        setNotifications(data || [])
      } catch (err) {
        console.error('Failed to load notifications:', err)
      }
    }
    fetchNotifs()
  }, [user?.id, currentOrganization?.id])

  const unreadCount = notifications.filter((n) => !n.is_read).length || 3

  const markAllAsRead = async () => {
    for (const n of notifications) {
      if (!n.is_read) {
        await dataService.markNotificationAsRead(n.id)
      }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  useEffect(() => {
    if (!showNotifications) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showNotifications])

  // Pemisahan nama organisasi utama & sub-organisasi (Sesuai Gambar Acuan)
  const fullOrgName = currentOrganization?.name || t.dashboard.title
  const [primaryOrgName, secondaryOrgName] = (() => {
    if (fullOrgName.includes(' PP. ')) {
      const parts = fullOrgName.split(' PP. ')
      return [parts[0], `PP. ${parts[1]}`]
    }
    if (fullOrgName.includes(' - ')) {
      const parts = fullOrgName.split(' - ')
      return [parts[0], parts[1]]
    }
    return [fullOrgName, '']
  })()

  // Mobile Expanding Search State & Handlers
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const handleCloseSearch = () => {
    setIsSearchExpanded(false)
    setSearchQuery('')
    setSearchResults([])
  }

  // Live debounced search query
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await dataService.globalSearch(searchQuery)
        setSearchResults(results)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 180)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Click outside to collapse search
  useEffect(() => {
    if (!isSearchExpanded) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        handleCloseSearch()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isSearchExpanded])

  // Carousel & Auto-rotate untuk 4 KPI Cards di Mobile (2 kartu per slide)
  const kpiScrollRef = useRef<HTMLDivElement>(null)
  const [activeKpiSlide, setActiveKpiSlide] = useState(0)
  const isInteractingRef = useRef(false)

  const handleKpiScroll = () => {
    if (!kpiScrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = kpiScrollRef.current
    const maxScroll = scrollWidth - clientWidth
    if (maxScroll <= 0) return
    const progress = scrollLeft / maxScroll
    setActiveKpiSlide(progress > 0.5 ? 1 : 0)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (isInteractingRef.current || !kpiScrollRef.current) return
      if (kpiScrollRef.current.scrollWidth <= kpiScrollRef.current.clientWidth + 10) return

      const nextSlide = activeKpiSlide === 0 ? 1 : 0
      const targetScroll = nextSlide === 0 ? 0 : kpiScrollRef.current.scrollWidth - kpiScrollRef.current.clientWidth
      kpiScrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' })
      setActiveKpiSlide(nextSlide)
    }, 4500)

    return () => clearInterval(interval)
  }, [activeKpiSlide])

  const scrollToKpiSlide = (slideIndex: number) => {
    if (!kpiScrollRef.current) return
    const targetScroll = slideIndex === 0 ? 0 : kpiScrollRef.current.scrollWidth - kpiScrollRef.current.clientWidth
    kpiScrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' })
    setActiveKpiSlide(slideIndex)
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        if (currentOrganization?.id) {
          const scope = {
            organizationId: currentOrganization.id,
            mode: currentScopeMode,
          }
          const [ecosystemData, agendasData] = await Promise.all([
            dataService.getEcosystemStats(scope, user),
            dataService.getAgendas(scope, undefined, user),
          ])
          setEcoStats(ecosystemData)
          setRecentAgendas(agendasData.slice(0, 5))
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [currentOrganization?.id, currentScopeMode, user])

  // Navigasi Menu Cepat Mobile (4 Modul Utama Prioritas Sesuai Spesifikasi Produk)
  const mobileNavItems = FREQUENT_HOME_MODULE_HREFS.map((href) => {
    const mod = ALL_NAVIGATION_MODULES.find((m) => m.href === href)!
    let badge: string | undefined
    let badgeDanger = false

    if (href === '/programs' && ecoStats.totalPrograms) {
      badge = String(ecoStats.totalPrograms)
    } else if (href === '/agendas' && ecoStats.inProgressAgendas) {
      badge = String(ecoStats.inProgressAgendas)
    } else if (href === '/reports' && ecoStats.pendingReports) {
      badge = String(ecoStats.pendingReports)
      badgeDanger = true
    }

    return {
      label: mod.label,
      href: mod.href,
      icon: mod.icon,
      badge,
      badgeDanger,
      color: mod.color,
    }
  })

  return (
    <PageContainer variant="wide">
      {/* Mobile Modern Header (Identik dengan Gambar Acuan) */}
      <div className="flex sm:hidden flex-col gap-2.5 pt-1 pb-1">
        {/* Baris Atas: Sisi Kiri (Avatar + 3 Baris Info), Sisi Kanan (Bell + Search) */}
        <div className="flex items-start justify-between w-full relative min-h-[48px] gap-2">
          {/* Sisi Kiri: Avatar + Halo, Nama Biro, Nama Pesantren */}
          <div
            className={cn(
              'flex items-center gap-3 min-w-0 transition-all duration-300 origin-left',
              isSearchExpanded
                ? 'opacity-0 scale-75 w-0 overflow-hidden pointer-events-none'
                : 'opacity-100 scale-100 flex-1'
            )}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || 'User'}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-500/25 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-500 text-white font-bold text-base flex items-center justify-center ring-2 ring-amber-500/25 shadow-xs shrink-0">
                {(user?.name || 'P').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-fg tracking-tight truncate leading-tight">
                {primaryOrgName}
              </h1>
              {secondaryOrgName && (
                <p className="text-[11px] font-normal text-fg-muted truncate mt-0.5">
                  {secondaryOrgName}
                </p>
              )}
            </div>
          </div>

          {/* Sisi Kanan: Expanding Search & Notification Bell */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Tombol Notifikasi Bell (Hanya tampil saat search tidak sedang expand) */}
            {!isSearchExpanded && (
              <div className="relative shrink-0" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-10 h-10 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-full bg-surface border border-line shadow-2xs flex items-center justify-center text-fg-muted hover:text-fg active:scale-95 transition-all cursor-pointer relative focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-hidden"
                  aria-label="Notifikasi"
                >
                  <HeroBell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-surface shadow-xs">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Notifikasi Melayang */}
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-surface border border-line shadow-xl overflow-hidden z-50 animate-scale-in divide-y divide-line-divider">
                    <div className="px-3.5 py-2.5 flex items-center justify-between bg-surface-muted/60">
                      <span className="text-xs font-bold text-fg">Notifikasi</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer focus-visible:ring-1 focus-visible:ring-amber-500 rounded px-1"
                        >
                          Tandai dibaca
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-line-row max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-fg-muted">
                          Tidak ada notifikasi baru
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              'p-3 text-xs space-y-1 hover:bg-hover-bg transition-colors',
                              !n.is_read && 'bg-primary-500/5'
                            )}
                          >
                            <p className="font-semibold text-fg line-clamp-1">{n.title}</p>
                            <p className="text-[11px] text-fg-muted line-clamp-2">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Container Pencarian (Expand ke Kiri ←) */}
            <div
              ref={searchContainerRef}
              className={cn(
                'transition-all duration-300 ease-out flex items-center shrink-0',
                isSearchExpanded
                  ? 'w-full bg-surface border border-primary-500/50 shadow-md rounded-full px-3.5 h-10 ring-2 ring-primary-500/20'
                  : 'w-10 h-10 min-w-[44px] min-h-[44px] bg-surface border border-line shadow-2xs rounded-full justify-center hover:border-line-hover'
              )}
            >
              {!isSearchExpanded ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchExpanded(true)
                    setTimeout(() => searchInputRef.current?.focus(), 80)
                  }}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-fg-muted hover:text-fg active:scale-95 transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-hidden rounded-full"
                  aria-label="Cari data"
                >
                  <HeroMagnifyingGlass className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex items-center w-full gap-2 min-w-0">
                  <HeroMagnifyingGlass className="w-4 h-4 text-primary-500 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        handleCloseSearch()
                      }
                    }}
                    placeholder="Cari program, agenda, laporan..."
                    className="w-full bg-transparent text-xs text-fg placeholder:text-fg-muted focus:outline-none"
                  />
                  {isSearching && (
                    <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={handleCloseSearch}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-fg-muted hover:text-fg hover:bg-hover-bg transition-colors cursor-pointer shrink-0"
                    aria-label="Tutup pencarian"
                  >
                    <HeroXMark className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Floating Live Search Results Dropdown */}
          {isSearchExpanded && searchQuery.trim().length >= 2 && (
            <div className="absolute top-12 left-0 right-0 z-50 rounded-xl bg-surface border border-line shadow-xl overflow-hidden animate-scale-in divide-y divide-line-divider">
              {searchResults.length > 0 ? (
                <div className="p-1.5 max-h-60 overflow-y-auto space-y-0.5">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        handleCloseSearch()
                        navigate(item.url)
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-hover-bg transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-fg truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-fg-muted truncate">{item.subtitle}</p>
                      </div>
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-surface-muted border border-line text-fg-muted shrink-0 uppercase tracking-wider">
                        {item.type}
                      </span>
                    </button>
                  ))}
                </div>
              ) : !isSearching ? (
                <div className="p-3 text-center text-xs text-fg-muted">
                  Tidak ada hasil untuk "{searchQuery}"
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Baris Bawah: Pill Badge Peran & Scope di Bawah Avatar */}
        {!isSearchExpanded && (
          <div className="flex items-center gap-2 pt-0.5 max-w-full flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/25 shadow-2xs max-w-full truncate">
              <HeroShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                {user?.is_superadmin ? 'Superadmin' : user?.active_membership?.role?.name || user?.role || 'Pengurus'}
              </span>
            </span>
            <OrganizationScopeBadge />
          </div>
        )}
      </div>

      {/* Scope Switcher Mobile (Hanya tampil jika unit memiliki bawahan) */}
      <div className="block sm:hidden -mt-1">
        <OrganizationScopeSwitcher size="sm" className="w-full justify-center" />
      </div>

      {/* Desktop Header (sm:flex) */}
      <div className="hidden sm:flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
              {currentOrganization ? (
                <>
                  <HeroBuildingOffice className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  {currentOrganization.name}
                </>
              ) : (
                t.dashboard.title
              )}
            </h1>
            <OrganizationScopeBadge />
          </div>
        </div>

        {/* Action CTAs (Desktop / Tablet) */}
        <div className="flex items-center gap-2 flex-wrap">
          <OrganizationScopeSwitcher size="sm" />
          <Button
            variant="secondary"
            icon={<HeroCalendar className="w-4 h-4" />}
            onClick={() => navigate('/agendas')}
          >
            Agenda Kegiatan
          </Button>
          <Button
            variant="primary"
            icon={<HeroPlus className="w-4 h-4" />}
            onClick={() => navigate('/programs')}
          >
            Program Kerja
          </Button>
        </div>
      </div>

      {/* Main Dashboard Content Layout (Responsive Flex Order: Mobile vs Desktop) */}
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* 1. ChartWidget (Mobile: 1st, Desktop: 2nd) */}
        <div className="order-1 sm:order-2">
          <ChartWidget />
        </div>

        {/* 2. Key Lifecycle KPI Cards (Mobile: 2nd, Desktop: 1st) */}
        <div className="order-2 sm:order-1 space-y-2">
          <div
            ref={kpiScrollRef}
            onScroll={handleKpiScroll}
            onTouchStart={() => { isInteractingRef.current = true }}
            onTouchEnd={() => { setTimeout(() => { isInteractingRef.current = false }, 3000) }}
            className="flex sm:grid sm:grid-cols-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar gap-2.5 sm:gap-4 -mx-1 px-1 sm:mx-0 sm:px-0"
          >
            {/* Card 1: Programs */}
            <button
              type="button"
              onClick={() => navigate('/programs')}
              className="w-[calc(50%-0.35rem)] sm:w-auto shrink-0 snap-start py-2 px-2.5 sm:p-4 rounded-xl border border-line bg-surface hover:bg-hover-bg max-lg:active:scale-[0.98] transition-all flex flex-col justify-between text-left cursor-pointer shadow-2xs group h-[58px] sm:h-auto focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-hidden"
            >
              <div className="flex items-center justify-between w-full gap-1">
                <span className="text-[11px] sm:text-xs font-medium text-fg-muted uppercase tracking-wider truncate">Program</span>
                <HeroBriefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <div className="flex items-baseline justify-between w-full gap-1">
                <span className="text-sm sm:text-2xl font-bold text-fg leading-none">{ecoStats.totalPrograms}</span>
                <span className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400 font-medium truncate">
                  {ecoStats.activePrograms} Aktif
                </span>
              </div>
            </button>

            {/* Card 2: Agendas */}
            <button
              type="button"
              onClick={() => navigate('/agendas')}
              className="w-[calc(50%-0.35rem)] sm:w-auto shrink-0 snap-start py-2 px-2.5 sm:p-4 rounded-xl border border-line bg-surface hover:bg-hover-bg max-lg:active:scale-[0.98] transition-all flex flex-col justify-between text-left cursor-pointer shadow-2xs group h-[58px] sm:h-auto focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-hidden"
            >
              <div className="flex items-center justify-between w-full gap-1">
                <span className="text-[11px] sm:text-xs font-medium text-fg-muted uppercase tracking-wider truncate">Agenda</span>
                <HeroCalendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              </div>
              <div className="flex items-baseline justify-between w-full gap-1">
                <span className="text-sm sm:text-2xl font-bold text-fg leading-none">{ecoStats.totalAgendas}</span>
                <span className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
                  {ecoStats.inProgressAgendas} Sesi
                </span>
              </div>
            </button>

            {/* Card 3: Reports */}
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="w-[calc(50%-0.35rem)] sm:w-auto shrink-0 snap-start py-2 px-2.5 sm:p-4 rounded-xl border border-line bg-surface hover:bg-hover-bg max-lg:active:scale-[0.98] transition-all flex flex-col justify-between text-left cursor-pointer shadow-2xs group h-[58px] sm:h-auto focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-hidden"
            >
              <div className="flex items-center justify-between w-full gap-1">
                <span className="text-[11px] sm:text-xs font-medium text-fg-muted uppercase tracking-wider truncate">Laporan</span>
                <HeroClipboardDocumentList className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              </div>
              <div className="flex items-baseline justify-between w-full gap-1">
                <span className="text-sm sm:text-2xl font-bold text-fg leading-none">{ecoStats.totalReports}</span>
                <span className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-400 font-medium truncate">
                  {ecoStats.pendingReports} Tunggu
                </span>
              </div>
            </button>

            {/* Card 4: Budget */}
            <button
              type="button"
              onClick={() => navigate('/finance')}
              className="w-[calc(50%-0.35rem)] sm:w-auto shrink-0 snap-start py-2 px-2.5 sm:p-4 rounded-xl border border-line bg-surface hover:bg-hover-bg max-lg:active:scale-[0.98] transition-all flex flex-col justify-between text-left cursor-pointer shadow-2xs group h-[58px] sm:h-auto focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-hidden"
            >
              <div className="flex items-center justify-between w-full gap-1">
                <span className="text-[11px] sm:text-xs font-medium text-fg-muted uppercase tracking-wider truncate">Serapan</span>
                <HeroCurrencyDollar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="flex items-baseline justify-between w-full gap-1">
                <span className="text-sm sm:text-2xl font-bold text-fg leading-none">{ecoStats.absorptionRate}%</span>
                <span className="text-[11px] sm:text-xs text-fg-muted font-normal truncate">
                  {formatCurrency(ecoStats.realizedBudget)}
                </span>
              </div>
            </button>
          </div>

          {/* Mobile Indicator Dots (sm:hidden) */}
          <div
            role="tablist"
            aria-label="Navigasi slide ringkasan kinerja"
            className="flex sm:hidden items-center justify-center gap-1.5 py-1"
          >
            {[
              { id: 0, label: 'Slide 1: Program & Agenda' },
              { id: 1, label: 'Slide 2: Laporan & Serapan' },
            ].map((slide) => {
              const isActive = activeKpiSlide === slide.id
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => scrollToKpiSlide(slide.id)}
                  aria-label={slide.label}
                  className="relative flex items-center justify-center py-1 px-0 rounded-full cursor-pointer touch-manipulation focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface transition-transform active:scale-90 before:absolute before:-inset-y-2.5 before:-inset-x-2 before:content-['']"
                >
                  <span
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300 ease-out block',
                      isActive
                        ? 'w-4 bg-amber-500 shadow-xs'
                        : 'w-1.5 bg-line-strong hover:bg-fg-muted/50'
                    )}
                  />
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Mobile Quick Launcher (Mobile: 3rd, Desktop: Hidden) */}
        <div className="order-3 block lg:hidden">
          <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 py-1">
            {mobileNavItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className="flex flex-col items-center gap-1.5 group cursor-pointer active:scale-[0.98] transition-transform select-none"
              >
                <div className="relative w-12 h-12 rounded-xl bg-surface border border-line shadow-xs group-hover:border-primary-500/50 flex items-center justify-center transition-colors">
                  <item.icon className={cn('w-5 h-5', item.color)} />
                  {item.badge && (
                    <span
                      className={cn(
                        'absolute -top-1 -right-1 px-1.5 min-w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-surface shadow-xs',
                        item.badgeDanger ? 'bg-red-500' : 'bg-primary-500'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-fg group-hover:text-primary-600 dark:group-hover:text-primary-400 text-center truncate w-full px-0.5">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Operational Workflow & Agendas (Mobile: 4th, Desktop: 3rd) */}
        <div className="order-4 sm:order-3 space-y-6">
          {isLoading ? (
            <div className="rounded-xl p-6 shadow-xs bg-surface ring-1 ring-line">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-line-divider rounded w-1/4"></div>
                <div className="h-20 bg-surface-muted ring-1 ring-line rounded"></div>
              </div>
            </div>
          ) : (
            <RecentAgendasWidget agendas={recentAgendas} />
          )}

          {/* Workflow Lifecycle Step Guide */}
          <div className="p-4 sm:p-6 rounded-xl ring-1 ring-line bg-surface shadow-xs space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-4 border-b border-line-divider">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm sm:text-base font-semibold text-fg tracking-tight">
                    Alur Siklus Operasional Organisasi
                  </h3>
                  <span className="inline-flex items-center text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-700 dark:text-primary-400 ring-1 ring-inset ring-primary-500/25 shrink-0">
                    4 Tahap Terintegrasi
                  </span>
                </div>
              <p className="hidden sm:block text-xs text-fg-muted mt-1 leading-relaxed">
                Panduan tata kelola kinerja organisasi dari penetapan peran hingga evaluasi dan tindak lanjut.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* Step 1 */}
            <div className="p-3.5 sm:p-5 rounded-xl border border-line bg-surface-elevated/40 hover:bg-surface-elevated hover:border-line transition-all flex flex-col justify-between gap-2 sm:gap-3 group">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25">
                      01
                    </span>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Fondasi
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-surface-muted text-fg-subtle group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    <HeroUsers className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-fg">
                    Struktur &amp; Peran
                  </h4>
                  <p className="hidden sm:block text-xs text-fg-muted leading-relaxed mt-1">
                    Bagan kerja organisasi, pembentukan seksi teknis, dan penetapan tupoksi personel.
                  </p>
                </div>
              </div>
              <div className="pt-2 sm:pt-2.5 border-t border-line-divider/60 text-[10px] sm:text-[11px] text-fg-subtle flex items-center justify-between">
                <span>Tahap Persiapan</span>
                <span className="font-mono">Fase 1</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 sm:p-5 rounded-xl border border-line bg-surface-elevated/40 hover:bg-surface-elevated hover:border-line transition-all flex flex-col justify-between gap-2 sm:gap-3 group">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-500/25">
                      02
                    </span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Perencanaan
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-surface-muted text-fg-subtle group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <HeroBriefcase className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-fg">
                    Rencana &amp; Anggaran
                  </h4>
                  <p className="hidden sm:block text-xs text-fg-muted leading-relaxed mt-1">
                    Penyusunan program kerja (draft) dan persetujuan pagu anggaran oleh pimpinan.
                  </p>
                </div>
              </div>
              <div className="pt-2 sm:pt-2.5 border-t border-line-divider/60 text-[10px] sm:text-[11px] text-fg-subtle flex items-center justify-between">
                <span>Tahap Otorisasi</span>
                <span className="font-mono">Fase 2</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 sm:p-5 rounded-xl border border-line bg-surface-elevated/40 hover:bg-surface-elevated hover:border-line transition-all flex flex-col justify-between gap-2 sm:gap-3 group">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-1 ring-inset ring-purple-500/25">
                      03
                    </span>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      Eksekusi
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-surface-muted text-fg-subtle group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    <HeroCalendar className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-fg">
                    Agenda &amp; Realisasi
                  </h4>
                  <p className="hidden sm:block text-xs text-fg-muted leading-relaxed mt-1">
                    Eksekusi agenda lapangan, realisasi dana pos biaya, dan pengunggahan bukti fisik KPI.
                  </p>
                </div>
              </div>
              <div className="pt-2 sm:pt-2.5 border-t border-line-divider/60 text-[10px] sm:text-[11px] text-fg-subtle flex items-center justify-between">
                <span>Tahap Implementasi</span>
                <span className="font-mono">Fase 3</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 sm:p-5 rounded-xl border border-line bg-surface-elevated/40 hover:bg-surface-elevated hover:border-line transition-all flex flex-col justify-between gap-2 sm:gap-3 group">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
                      04
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Evaluasi
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-surface-muted text-fg-subtle group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    <HeroClipboardDocumentList className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-fg">
                    Laporan &amp; Tindak Lanjut
                  </h4>
                  <p className="hidden sm:block text-xs text-fg-muted leading-relaxed mt-1">
                    Verifikasi ketua, penerbitan catatan evaluasi kaji ulang, dan penugasan tindak lanjut.
                  </p>
                </div>
              </div>
              <div className="pt-2 sm:pt-2.5 border-t border-line-divider/60 text-[10px] sm:text-[11px] text-fg-subtle flex items-center justify-between">
                <span>Tahap Akuntabilitas</span>
                <span className="font-mono">Fase 4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageContainer>
)
}

