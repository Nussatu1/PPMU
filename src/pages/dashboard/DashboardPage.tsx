import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HeroMagnifyingGlass,
  HeroXMark,
  HeroBell,
  HeroCalendar,
  HeroChartBar,
  HeroShieldCheck,
  HeroBriefcase,
  HeroCurrencyDollar,
  HeroClipboardDocumentList,
  HeroCheckCircle,
} from '@/components/icons/HeroIcons'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Notification, Budget, Transaction, Performance, Agenda, AuditLog } from '@/types/database'
import { hasWidgetAccess } from '@/lib/authorization'
import { PESANTREN_AERIAL_BG_DATA_URL } from '@/lib/pesantrenBgBase64'
import { ChartWidget } from '@/components/widgets/ChartWidget'
import { RecentAgendasWidget } from '@/components/widgets/RecentAgendasWidget'

export const DashboardPage: React.FC = () => {
  const { user, currentOrganization, currentScopeMode, logout } = useAuth()
  const navigate = useNavigate()

  const [ecoStats, setEcoStats] = useState({
    totalPrograms: 0,
    activePrograms: 0,
    completedPrograms: 0,
    totalAgendas: 0,
    inProgressAgendas: 0,
    upcomingAgendas: 0,
    totalReports: 0,
    pendingReports: 0,
    approvedReports: 0,
    totalTasks: 0,
    pendingTasks: 0,
    totalBudget: 0,
    realizedBudget: 0,
    absorptionRate: 0,
  })

  // Data Sistem Riil untuk Sinkronisasi Widget
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [performances, setPerformances] = useState<Performance[]>([])
  const [agendas, setAgendas] = useState<Agenda[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  // Modal Widget Interaktif
  const [activeWidgetModal, setActiveWidgetModal] = useState<'budgetChart' | 'upcomingAgendas' | 'auditLogs' | null>(null)

  // Notifications State
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

  const unreadCount = notifications.filter((n) => !n.is_read).length

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

  // Expanding Search State & Handlers
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (currentOrganization?.id) {
          const scope = {
            organizationId: currentOrganization.id,
            mode: currentScopeMode,
          }
          const [ecosystemData, bList, txList, perfList, agList, audList] = await Promise.all([
            dataService.getEcosystemStats(scope, user).catch(() => ({
              totalPrograms: 0,
              activePrograms: 0,
              completedPrograms: 0,
              totalAgendas: 0,
              inProgressAgendas: 0,
              upcomingAgendas: 0,
              totalReports: 0,
              pendingReports: 0,
              approvedReports: 0,
              totalTasks: 0,
              pendingTasks: 0,
              totalBudget: 0,
              realizedBudget: 0,
              absorptionRate: 0,
              scopeMode: currentScopeMode,
              resolvedOrganizationIds: [currentOrganization.id],
            })),
            dataService.getBudgets(scope, undefined, user).catch(() => []),
            dataService.getTransactions(scope, undefined, user).catch(() => []),
            dataService.getPerformances(scope, undefined, user).catch(() => []),
            dataService.getAgendas(scope, undefined, user).catch(() => []),
            dataService.getAuditLogs(currentOrganization.id, user).catch(() => []),
          ])

          setEcoStats(ecosystemData)
          setBudgets(bList || [])
          setTransactions(txList || [])
          setPerformances(perfList || [])
          setAgendas(agList || [])
          setAuditLogs(audList || [])
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      }
    }
    fetchData()
  }, [currentOrganization?.id, currentScopeMode, user])

  // Widget Access Permissions
  const canViewStats = hasWidgetAccess(user, 'StatsOverview')
  const canViewBudgetChart = hasWidgetAccess(user, 'BudgetChart')
  const canViewUpcomingAgendas = hasWidgetAccess(user, 'UpcomingAgendas')
  const canViewKpiProgress = hasWidgetAccess(user, 'KpiProgress')
  const canViewLatestAudit = hasWidgetAccess(user, 'LatestAuditLogs')

  // Real Metric Calculations (Tidak ada mock data, 100% tersinkronkan)
  const incomeTransactions = transactions.filter((t) => t.type === 'income')
  const totalIncome = incomeTransactions.reduce((acc, t) => acc + (t.amount || 0), 0)
  const displayIncome = totalIncome > 0 ? totalIncome : ecoStats.totalBudget

  // Mingguan Riil untuk Grafik Kas Masuk
  const now = new Date()
  const currentMonth = now.getMonth()
  const m1 = transactions.filter((t) => t.type === 'income' && t.date && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getDate() <= 10).reduce((s, t) => s + (t.amount || 0), 0)
  const m2 = transactions.filter((t) => t.type === 'income' && t.date && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getDate() > 10 && new Date(t.date).getDate() <= 20).reduce((s, t) => s + (t.amount || 0), 0)
  const m3 = transactions.filter((t) => t.type === 'income' && t.date && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getDate() > 20).reduce((s, t) => s + (t.amount || 0), 0)
  const maxWeekly = Math.max(m1, m2, m3, 1)

  // Sebaran Program Riil
  const activeProgCount = ecoStats.activePrograms
  const completedProgCount = ecoStats.completedPrograms
  const draftProgCount = Math.max(0, ecoStats.totalPrograms - activeProgCount - completedProgCount)
  const activeProgPct = ecoStats.totalPrograms > 0 ? Math.round((activeProgCount / ecoStats.totalPrograms) * 100) : 0
  const completedProgPct = ecoStats.totalPrograms > 0 ? Math.round((completedProgCount / ecoStats.totalPrograms) * 100) : 0
  const draftProgPct = ecoStats.totalPrograms > 0 ? Math.max(0, 100 - activeProgPct - completedProgPct) : 0

  // Indeks Kesehatan Riil
  const hasHealthActivity = ecoStats.totalTasks > 0 || ecoStats.totalReports > 0 || ecoStats.totalAgendas > 0

  const taskCompletionRate = ecoStats.totalTasks > 0
    ? Math.round(((ecoStats.totalTasks - ecoStats.pendingTasks) / ecoStats.totalTasks) * 100)
    : 0
  const reportApprovalRate = ecoStats.totalReports > 0
    ? Math.round((ecoStats.approvedReports / ecoStats.totalReports) * 100)
    : 0
  const agendaExecutionRate = ecoStats.totalAgendas > 0
    ? Math.round(((ecoStats.totalAgendas - ecoStats.inProgressAgendas) / ecoStats.totalAgendas) * 100)
    : 0

  let healthScore = 0
  let activeHealthBars = 0

  if (hasHealthActivity) {
    let totalWeight = 0
    let weightedSum = 0

    if (ecoStats.totalTasks > 0) {
      weightedSum += taskCompletionRate * 30
      totalWeight += 30
    }
    if (ecoStats.totalReports > 0) {
      weightedSum += reportApprovalRate * 40
      totalWeight += 40
    }
    if (ecoStats.totalAgendas > 0) {
      weightedSum += agendaExecutionRate * 30
      totalWeight += 30
    }

    healthScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
    healthScore = Math.min(100, Math.max(0, healthScore))
    activeHealthBars = Math.min(10, Math.max(0, Math.round(healthScore / 10)))
  }

  // KPI Rate Riil
  const kpiAchievementRate = performances.length > 0
    ? Math.round(
        performances.reduce((acc, p) => acc + Math.min(100, Math.round(((p.realized || 0) / (p.target || 1)) * 100)), 0) / performances.length
      )
    : ecoStats.absorptionRate

  // Surplus Kas Riil
  const cashSurplus = Math.max(0, displayIncome - ecoStats.realizedBudget)

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col justify-between selection:bg-emerald-400 selection:text-black">
      {/* ========================================== */}
      {/* 1. BACKGROUND LAYER (Foto Udara Pesantren PPMU) */}
      {/* ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <img
          src={PESANTREN_AERIAL_BG_DATA_URL}
          alt="Latar Belakang Udara Kawasan Pesantren PPMU"
          className="w-full h-full object-cover object-center filter brightness-[0.70] contrast-[1.12]"
        />
        {/* Lapisan Gradient Gelap untuk Menjamin Kontras & Nuansa Glassmorphism Premium */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(4,8,10,0.85)_100%)]" />
      </div>

      {/* ========================================== */}
      {/* 2. CONTAINER UTAMA DASBOR (100% Kanvas Viewport) */}
      {/* ========================================== */}
      <div className="relative z-10 flex min-h-screen w-full p-2.5 sm:p-5 lg:p-6 gap-3 sm:gap-4 lg:gap-6">
        {/* ========================================== */}
        {/* KONTEN UTAMA (Center and Right Layout)     */}
        {/* ========================================== */}
        <main className="flex-1 flex flex-col justify-between min-w-0">
          {/* ========================================== */}
          {/* HEADER ATAS (Brand, Sapaan & Profil Pengguna) */}
          {/* ========================================== */}
          <header className="relative flex items-center justify-between w-full pt-1 px-1 min-h-[56px]">
            {/* Sisi Kiri: Brand Title & Scope Organisasi */}
            <div className="flex flex-col z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4DE0A2] shadow-[0_0_8px_#4DE0A2]" />
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  {currentOrganization?.name || 'Ekosistem PPMU'}
                </h1>
              </div>
              <span className="text-xs text-neutral-400 font-medium pl-4">
                Biro Pengembangan & Pengawasan
              </span>
            </div>

            {/* Sisi Kanan: Notifikasi & Profil Pengguna */}
            <div className="flex items-center gap-2.5 z-20 shrink-0">
              {/* Notifikasi Bell Header */}
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 backdrop-blur-md flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer relative"
                  title="Notifikasi"
                >
                  <HeroBell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-black">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Notifikasi */}
                {showNotifications && (
                  <div className="absolute right-0 top-10 w-72 rounded-2xl glass-card p-3 shadow-2xl z-50 animate-scale-in divide-y divide-white/10 text-white text-left">
                    <div className="pb-2 flex items-center justify-between">
                      <span className="text-xs font-bold">Notifikasi</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-[10px] font-semibold text-[#4DE0A2] hover:underline cursor-pointer"
                        >
                          Tandai dibaca
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-white/5 max-h-60 overflow-y-auto pt-2">
                      {notifications.length === 0 ? (
                        <div className="p-3 text-center text-xs text-neutral-400">Tidak ada notifikasi baru</div>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <div key={n.id} className="p-2 text-xs space-y-1 hover:bg-white/5 transition-colors rounded-lg">
                            <p className="font-semibold text-white line-clamp-1">{n.title}</p>
                            <p className="text-[11px] text-neutral-400 line-clamp-2">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar & Badge User (Minimalis: Teks Nama & Role Muncul Hanya Saat Hover) */}
              <div className="relative group/user">
                <div
                  onClick={() => navigate('/settings')}
                  className="flex items-center p-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 backdrop-blur-md cursor-pointer transition-all duration-300 group-hover/user:pr-3 select-none"
                >
                  <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/20 shrink-0">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name || 'User'}
                        className="w-full h-full object-cover object-right-top"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#4DE0A2] text-black font-semibold text-xs flex items-center justify-center">
                        {(user?.name || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col text-left max-w-0 opacity-0 -translate-x-2 overflow-hidden pointer-events-none group-hover/user:max-w-[200px] group-hover/user:opacity-100 group-hover/user:translate-x-0 group-hover/user:pointer-events-auto transition-all duration-300 ease-out whitespace-nowrap pl-0 group-hover/user:pl-2">
                    <span className="text-xs font-medium text-white leading-tight truncate">
                      {user?.name || 'Pengurus'}
                    </span>
                    <span className="text-[10px] text-[#4DE0A2] leading-tight font-normal truncate mt-0.5">
                      {user?.is_superadmin ? 'Superadmin' : user?.active_membership?.role?.name || 'Pengurus'}
                    </span>
                  </div>
                </div>

                {/* Popover Menu Logout */}
                <div className="absolute right-0 top-full pt-2 opacity-0 pointer-events-none group-hover/user:opacity-100 group-hover/user:pointer-events-auto transition-all duration-200 z-50">
                  <div className="glass-card p-1.5 shadow-2xl rounded-2xl w-44 border border-white/10 backdrop-blur-xl flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => navigate('/settings')}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer w-full text-left"
                    >
                      <svg className="w-4 h-4 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                        <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Pengaturan Akun</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await logout()
                        navigate('/login')
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer w-full text-left border-t border-white/5"
                    >
                      <svg className="w-4 h-4 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                        <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ========================================== */}
          {/* SAPAAN INTERAKTIF (Tepat Di Tengah Antara Header & Grid - Responsif Mobile & Desktop) */}
          {/* ========================================== */}
          <div className="flex flex-col items-center justify-center text-center my-auto py-1.5 sm:py-5 lg:py-8 px-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-sm font-medium text-neutral-300">
              <span>Hey {user?.name ? user.name.split(' ')[0] : 'Pengurus'}, ada yang bisa dibantu?</span>
              <span className="text-sm sm:text-base">👋</span>
            </div>
            <h2 className="text-sm sm:text-2xl lg:text-3xl font-normal tracking-tight text-white/90 mt-0.5 sm:mt-1 font-sans">
              Tanyakan apapun seputar program & anggaran
            </h2>

            {/* Navigasi 6 Modul Utama Ekosistem (Lingkaran Transparan Ber-Border - Tampil di Mobile & Desktop) */}
            <div className="mt-2 sm:mt-5 lg:mt-7 flex items-center justify-center gap-2 sm:gap-3.5 z-20 flex-wrap">
              {/* 1. Program Kerja */}
              <button
                type="button"
                onClick={() => navigate('/programs')}
                className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/[0.06] hover:bg-white/20 border border-white/20 hover:border-white/50 text-neutral-300 hover:text-[#4DE0A2] flex items-center justify-center shadow-md backdrop-blur-md transition-all duration-200 hover:scale-115 active:scale-95 cursor-pointer"
                title="Program Kerja"
              >
                <HeroBriefcase className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>

              {/* 2. Agenda & Kegiatan */}
              <button
                type="button"
                onClick={() => navigate('/agendas')}
                className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/[0.06] hover:bg-white/20 border border-white/20 hover:border-white/50 text-neutral-300 hover:text-[#4DE0A2] flex items-center justify-center shadow-md backdrop-blur-md transition-all duration-200 hover:scale-115 active:scale-95 cursor-pointer"
                title="Agenda & Kegiatan"
              >
                <HeroCalendar className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>

              {/* 3. Capaian Kerja */}
              <button
                type="button"
                onClick={() => navigate('/performance')}
                className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/[0.06] hover:bg-white/20 border border-white/20 hover:border-white/50 text-neutral-300 hover:text-[#4DE0A2] flex items-center justify-center shadow-md backdrop-blur-md transition-all duration-200 hover:scale-115 active:scale-95 cursor-pointer"
                title="Capaian Kerja"
              >
                <HeroChartBar className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>

              {/* 4. Anggaran & Keuangan */}
              <button
                type="button"
                onClick={() => navigate('/finance')}
                className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/[0.06] hover:bg-white/20 border border-white/20 hover:border-white/50 text-neutral-300 hover:text-[#4DE0A2] flex items-center justify-center shadow-md backdrop-blur-md transition-all duration-200 hover:scale-115 active:scale-95 cursor-pointer"
                title="Anggaran & Keuangan"
              >
                <HeroCurrencyDollar className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>

              {/* 5. Laporan & Evaluasi */}
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/[0.06] hover:bg-white/20 border border-white/20 hover:border-white/50 text-neutral-300 hover:text-[#4DE0A2] flex items-center justify-center shadow-md backdrop-blur-md transition-all duration-200 hover:scale-115 active:scale-95 cursor-pointer"
                title="Laporan & Evaluasi"
              >
                <HeroClipboardDocumentList className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>

              {/* 6. Tugas & Tindak Lanjut */}
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/[0.06] hover:bg-white/20 border border-white/20 hover:border-white/50 text-neutral-300 hover:text-[#4DE0A2] flex items-center justify-center shadow-md backdrop-blur-md transition-all duration-200 hover:scale-115 active:scale-95 cursor-pointer"
                title="Tugas & Tindak Lanjut"
              >
                <HeroCheckCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* ========================================== */}
          {/* BILAH KONTROL / SUB-ACTIONS BAR (Tepat Di Atas Grid) */}
          {/* ========================================== */}
          <section className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2.5 mb-2 px-1">
            {/* Container Pencarian Live */}
            <div ref={searchContainerRef} className="relative">
              {!isSearchExpanded ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchExpanded(true)
                    setTimeout(() => searchInputRef.current?.focus(), 80)
                  }}
                  className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-neutral-300 hover:text-white cursor-pointer"
                  title="Cari Program, Agenda & Dokumen"
                >
                  <svg className="w-4 h-4 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                  </svg>
                </button>
              ) : (
                <div className="flex items-center gap-2 glass-pill px-3 py-1 rounded-full w-64 md:w-80 shadow-lg">
                  <HeroMagnifyingGlass className="w-4 h-4 text-[#4DE0A2] shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleCloseSearch()
                    }}
                    placeholder="Cari program, agenda, laporan..."
                    className="w-full bg-transparent text-xs text-white placeholder:text-neutral-400 focus:outline-none"
                  />
                  {isSearching && (
                    <div className="w-3.5 h-3.5 border-2 border-[#4DE0A2] border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={handleCloseSearch}
                    className="text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <HeroXMark className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Floating Results */}
              {isSearchExpanded && searchQuery.trim().length >= 2 && (
                <div className="absolute right-0 top-10 w-[calc(100vw-32px)] max-w-xs sm:w-80 glass-card p-2 shadow-2xl z-50 animate-scale-in divide-y divide-white/10 text-white">
                  {searchResults.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            handleCloseSearch()
                            navigate(item.url)
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-white/10 transition-colors cursor-pointer group"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-white group-hover:text-[#4DE0A2] truncate">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-neutral-400 truncate">{item.subtitle}</p>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 uppercase">
                            {item.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : !isSearching ? (
                    <div className="p-3 text-center text-xs text-neutral-400">
                      Tidak ada hasil untuk "{searchQuery}"
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Filter Rentang Tanggal / Kalender Agenda */}
            {canViewUpcomingAgendas && (
              <button
                type="button"
                onClick={() => setActiveWidgetModal('upcomingAgendas')}
                className="glass-pill px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-normal text-neutral-200 hover:bg-white/10 cursor-pointer"
                title="Buka Kalender Agenda Mendatang"
              >
                <HeroCalendar className="w-3.5 h-3.5 text-[#4DE0A2]" />
                <span className="font-medium">
                  {agendas.length > 0 ? `${agendas.length} Agenda Terjadwal` : 'Agenda & Kalender'}
                </span>
                <svg className="w-3 h-3 stroke-current stroke-2 fill-none text-neutral-400" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}

            {/* CTA Tambah Alokasi Program */}
            <button
              type="button"
              onClick={() => navigate('/programs/create')}
              className="glass-pill px-3.5 py-1.5 rounded-full text-xs font-medium text-white hover:bg-white/15 cursor-pointer flex items-center gap-1.5 border-emerald-500/30 transition-all active:scale-95"
            >
              <svg className="w-3 h-3 stroke-current stroke-2 text-[#4DE0A2]" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" />
              </svg>
              <span>+ Buat Program</span>
            </button>

            {/* CTA Buat Laporan */}
            <button
              type="button"
              onClick={() => navigate('/reports/create')}
              className="glass-pill px-3.5 py-1.5 rounded-full text-xs font-medium text-emerald-300 hover:text-white hover:bg-white/15 cursor-pointer bg-emerald-500/10 transition-all active:scale-95"
            >
              <span className="hidden sm:inline">Buat Laporan Evaluasi</span>
              <span className="sm:hidden">+ Buat Laporan</span>
            </button>
          </section>

          {/* ========================================== */}
          {/* GRID KARTU METRIK UTAMA (Baris 1 & Baris 2) */}
          {/* ========================================== */}
          <section className="grid grid-cols-12 gap-3 sm:gap-4 pb-2">
            {/* SISI KIRI: 9 KOLOM (5 KARTU METRIK GLASSMORPHISM) */}
            <div className="col-span-12 xl:col-span-9 flex flex-col gap-3 sm:gap-4">
              {/* BARIS ATAS: 3 KARTU (SPENDING, INCOME, PORTFOLIO) - Horizontal Snap Scroll di Mobile */}
              <div className="flex md:grid md:grid-cols-3 gap-2.5 sm:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
                {/* KARTU 1: SPENDING (Realisasi Anggaran Per Pos) */}
                <article className="glass-card p-3 sm:p-5 flex flex-col justify-between min-h-0 sm:min-h-[210px] w-[80vw] sm:w-[60vw] md:w-auto shrink-0 snap-center">
                  <div>
                    <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#1c332c] flex items-center justify-center text-[#4DE0A2] border border-[#4DE0A2]/30">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M21 7.28V5c0-1.1-.9-2-2-2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-2.28c.59-.35 1-.98 1-1.72V9c0-.74-.41-1.37-1-1.72zM20 9v6h-7V9h7zM5 19V5h14v2h-6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h6v2H5z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white leading-tight">Pengeluaran</h3>
                          <p className="text-[10px] text-neutral-400">Realisasi Pos Anggaran</p>
                        </div>
                      </div>
                      {canViewBudgetChart && (
                        <button
                          type="button"
                          onClick={() => setActiveWidgetModal('budgetChart')}
                          className="text-[10px] text-[#4DE0A2] font-semibold hover:underline cursor-pointer"
                        >
                          Grafik &rarr;
                        </button>
                      )}
                    </div>

                    {/* Progress Bars Berdasarkan Data Pos Anggaran Riil */}
                    <div className="flex flex-col gap-2.5 text-xs text-neutral-300">
                      {budgets.length === 0 ? (
                        <div className="py-2.5 text-center">
                          <p className="text-xs text-neutral-400">Belum ada pos anggaran aktif</p>
                          <button
                            type="button"
                            onClick={() => navigate('/finance')}
                            className="mt-1 text-[11px] text-[#4DE0A2] hover:underline cursor-pointer inline-flex items-center gap-1"
                          >
                            + Tambah Pos Anggaran
                          </button>
                        </div>
                      ) : (
                        budgets.slice(0, 3).map((b) => {
                          const planned = b.allocated_amount || b.amount_allocated || b.planned_amount || 0
                          const spent = b.realized_amount || b.amount_spent || 0
                          const pct = planned > 0 ? Math.min(100, Math.round((spent / planned) * 100)) : 0
                          const posName = b.program?.name || b.notes || 'Pos Anggaran'
                          return (
                            <div key={b.id} className="flex items-center justify-between">
                              <span className="w-24 text-neutral-300 text-[11px] truncate" title={posName}>
                                {posName}
                              </span>
                              <div className="flex-1 mx-2.5 h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#4DE0A2] rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-neutral-400 font-mono">{pct}%</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Metrik Bawah Kartu */}
                  <div className="pt-2 flex items-baseline justify-between border-t border-white/5">
                    <div>
                      <div className="text-xl font-bold tracking-tight text-white font-sans">
                        {formatCurrency(ecoStats.realizedBudget)}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                        <svg className="w-3 h-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                          <path d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V5a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Total Realisasi Diserap</span>
                      </div>
                    </div>
                  </div>
                </article>

                {/* KARTU 2: INCOME (Penerimaan & Dukungan Dana) */}
                <article className="glass-card p-3 sm:p-5 flex flex-col justify-between min-h-0 sm:min-h-[210px] w-[80vw] sm:w-[60vw] md:w-auto shrink-0 snap-center">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#233528] flex items-center justify-center text-[#95D34E] border border-[#95D34E]/30">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h2v2h2V8h-2v2h-2zm-2 4H3V6h14v12z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white leading-tight">Penerimaan</h3>
                          <p className="text-[10px] text-neutral-400">Inflow & Rencana Dana</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-neutral-400 font-medium">Bulan Berjalan</span>
                    </div>

                    {/* Grafik Batang Vertikal Mingguan Riil */}
                    <div className="flex items-end justify-center gap-5 pt-3 pb-1 h-[74px]">
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className="w-6 bg-gradient-to-t from-[#3E9261] to-[#67C378] rounded-t-md shadow-[0_0_12px_rgba(78,225,160,0.25)] transition-all"
                          style={{ height: m1 > 0 ? `${Math.max(14, Math.round((m1 / maxWeekly) * 54))}px` : '8px' }}
                          title={`Minggu 1: ${formatCurrency(m1)}`}
                        />
                        <span className="text-[10px] text-neutral-400 font-medium">Mg 1</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className="w-6 bg-gradient-to-t from-[#3E9261] to-[#67C378] rounded-t-md shadow-[0_0_12px_rgba(78,225,160,0.25)] transition-all"
                          style={{ height: m2 > 0 ? `${Math.max(14, Math.round((m2 / maxWeekly) * 54))}px` : '8px' }}
                          title={`Minggu 2: ${formatCurrency(m2)}`}
                        />
                        <span className="text-[10px] text-neutral-400 font-medium">Mg 2</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className="w-6 bg-gradient-to-t from-[#58C67B] to-[#74E387] rounded-t-md shadow-[0_0_16px_rgba(116,227,135,0.45)] transition-all"
                          style={{ height: m3 > 0 ? `${Math.max(14, Math.round((m3 / maxWeekly) * 54))}px` : '8px' }}
                          title={`Minggu 3: ${formatCurrency(m3)}`}
                        />
                        <span className="text-[10px] text-neutral-300 font-semibold font-mono">Mg 3</span>
                      </div>
                    </div>
                  </div>

                  {/* Metrik Bawah Kartu */}
                  <div className="pt-1 border-t border-white/5">
                    <div className="text-xl font-bold tracking-tight text-white font-sans">
                      {formatCurrency(displayIncome)}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#4DE0A2] mt-0.5 font-medium">
                      <span>&uarr;</span>
                      <span>
                        {ecoStats.absorptionRate > 0
                          ? `${ecoStats.absorptionRate}% anggaran terserap`
                          : 'Rencana anggaran tercatat'}
                      </span>
                    </div>
                  </div>
                </article>

                {/* KARTU 3: PORTFOLIO (Komposisi Portofolio Program) */}
                <article
                  onClick={() => navigate('/programs')}
                  className="glass-card p-3 sm:p-5 flex flex-col justify-between min-h-0 sm:min-h-[210px] w-[80vw] sm:w-[60vw] md:w-auto shrink-0 snap-center cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#1e3436] flex items-center justify-center text-[#3DD4B8] border border-[#3DD4B8]/30">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white leading-tight">Portofolio</h3>
                          <p className="text-[10px] text-neutral-400">Sebaran Program Kerja</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-neutral-400 font-medium">
                        {ecoStats.totalPrograms} Program
                      </span>
                    </div>

                    {/* Segmented Stacked Bar Horizontal Riil */}
                    <div className="w-full h-3 rounded-full flex gap-0.5 overflow-hidden p-0.5 bg-black/50 border border-white/5">
                      {ecoStats.totalPrograms === 0 ? (
                        <div className="h-full w-full bg-white/10 rounded-full" title="Belum ada program" />
                      ) : (
                        <>
                          <div
                            className="h-full bg-[#4DE0A2] rounded-l-full transition-all"
                            style={{ width: `${Math.max(activeProgPct, 2)}%` }}
                            title={`Program Aktif (${activeProgPct}%)`}
                          />
                          <div
                            className="h-full bg-[#C8EB5B] transition-all"
                            style={{ width: `${Math.max(completedProgPct, 2)}%` }}
                            title={`Program Selesai (${completedProgPct}%)`}
                          />
                          <div
                            className="h-full bg-[#3D5B3A] rounded-r-full transition-all"
                            style={{ width: `${Math.max(draftProgPct, 2)}%` }}
                            title={`Program Perencanaan (${draftProgPct}%)`}
                          />
                        </>
                      )}
                    </div>

                    {/* Legenda Segment */}
                    <div className="grid grid-cols-3 gap-2 mt-3 text-left">
                      <div>
                        <div className="text-[10px] text-neutral-400">Aktif</div>
                        <div className="text-xs font-semibold text-neutral-200 mt-0.5">
                          {activeProgPct}% ({activeProgCount})
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-neutral-400">Selesai</div>
                        <div className="text-xs font-semibold text-neutral-200 mt-0.5">
                          {completedProgPct}% ({completedProgCount})
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-neutral-400">Rencana</div>
                        <div className="text-xs font-semibold text-neutral-200 mt-0.5">
                          {draftProgPct}% ({draftProgCount})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metrik Bawah Kartu */}
                  <div className="pt-1 border-t border-white/5">
                    <div className="text-xl font-bold tracking-tight text-white font-sans">
                      {ecoStats.totalPrograms > 0 ? `${completedProgPct}%` : '0%'}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#4DE0A2] mt-0.5 font-medium">
                      <span>&uarr;</span>
                      <span>Program berhasil dituntaskan</span>
                    </div>
                  </div>
                </article>
              </div>

              {/* BARIS BAWAH: 2 KARTU (WEALTH SCORE & CASH FLOW) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                {/* KARTU 4: WEALTH SCORE (Indeks Kesehatan Organisasi) */}
                <article className="glass-card p-3.5 sm:p-5 flex flex-col justify-between min-h-0 sm:min-h-[190px] h-full overflow-hidden">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-white leading-tight truncate">
                          {canViewStats ? 'Indeks Kesehatan Organisasi' : 'Kepatuhan & Akuntabilitas'}
                        </h3>
                        <p className="text-[11px] text-neutral-400 mt-0.5 truncate">Akuntabilitas & Kepatuhan Pelaporan</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={cn(
                            'text-2xl sm:text-3xl font-bold font-sans leading-none',
                            !hasHealthActivity ? 'text-neutral-400' : 'text-[#4DE0A2]'
                          )}
                        >
                          {healthScore}
                        </span>
                        <div className="text-xs font-semibold text-white mt-0.5">
                          {!hasHealthActivity
                            ? 'Belum Ada Data'
                            : healthScore >= 80
                            ? 'Optimal & Tertib'
                            : healthScore >= 60
                            ? 'Stabil & Cukup'
                            : 'Perlu Evaluasi'}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {!hasHealthActivity
                            ? 'Belum ada aktivitas'
                            : `${taskCompletionRate}% tugas beres`}
                        </div>
                      </div>
                    </div>

                    {/* Horizontal Segment Pills Matrix (10 Baris Indikator Neon Dinamis) */}
                    <div className="flex items-center justify-between gap-1 sm:gap-1.5 mt-3">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-4 sm:h-5 md:h-6 flex-1 rounded-sm sm:rounded-md transition-all',
                            activeHealthBars > 0 && i < activeHealthBars
                              ? 'bg-[#6BE397] shadow-[0_0_10px_rgba(107,227,151,0.4)]'
                              : 'bg-[#374542] opacity-40'
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Rincian Kaki Kartu */}
                  <div className="flex items-center justify-between text-[11px] sm:text-xs pt-2 mt-2 border-t border-white/5 gap-1">
                    <div>
                      <div className="text-[10px] text-neutral-400">Respon Agenda</div>
                      <div className="font-semibold text-neutral-200">{agendaExecutionRate}%</div>
                    </div>
                    <div
                      onClick={() => navigate('/reports')}
                      className="flex items-center gap-1.5 text-neutral-300 glass-pill px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] cursor-pointer hover:bg-white/10 transition shrink-0"
                    >
                      <svg className="w-3.5 h-3.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                        <rect height="18" rx="2" width="18" x="3" y="3" />
                        <path d="M9 17v-4m4 4v-8m4 8v-2" />
                      </svg>
                      <span>Evaluasi Laporan</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400">Laporan Tuntas</div>
                      <div className="font-semibold text-neutral-200">{reportApprovalRate}%</div>
                    </div>
                  </div>
                </article>

                {/* KARTU 5: CASH FLOW (Arus Kas Ekosistem) */}
                <article className="glass-card p-3.5 sm:p-5 flex flex-col justify-between min-h-0 sm:min-h-[190px] h-full overflow-hidden">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-white leading-tight truncate">Arus Kas Masuk & Keluar</h3>
                        <p className="text-[11px] text-neutral-400 mt-0.5 truncate">Rasio Likuiditas Dana Kegiatan</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-2xl sm:text-3xl font-bold text-[#4DE0A2] font-sans leading-none">
                          {ecoStats.absorptionRate}%
                        </span>
                        <div className="text-xs font-semibold text-white mt-0.5">
                          {ecoStats.absorptionRate <= 100 ? 'Sehat & Terkendali' : 'Melebihi Alokasi'}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {cashSurplus > 0 ? 'Surplus Tersedia' : 'Saldo Berimbang'}
                        </div>
                      </div>
                    </div>

                    {/* Baris Kas In vs Kas Out */}
                    <div className="flex flex-col gap-2 mt-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="w-8 text-[11px] text-neutral-400 font-mono">Masuk</span>
                        <div className="flex-1 mx-3 h-2 bg-neutral-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#44D796] to-[#71EA89] rounded-full shadow-[0_0_10px_rgba(78,225,160,0.3)] transition-all"
                            style={{ width: displayIncome > 0 ? '100%' : '0%' }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-neutral-200 font-mono">
                          {formatCurrency(displayIncome)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="w-8 text-[11px] text-neutral-400 font-mono">Keluar</span>
                        <div className="flex-1 mx-3 h-2 bg-neutral-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C8EC5A] rounded-full shadow-[0_0_10px_rgba(200,236,90,0.3)] transition-all"
                            style={{ width: `${Math.min(100, ecoStats.absorptionRate)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-neutral-200 font-mono">
                          {formatCurrency(ecoStats.realizedBudget)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rincian Kaki Kartu */}
                  <div className="flex items-center justify-between text-[11px] sm:text-xs pt-2 mt-1 border-t border-white/5 gap-1">
                    <div>
                      <div className="text-[10px] text-neutral-400">Total Masuk</div>
                      <div className="font-semibold text-neutral-200">{formatCurrency(displayIncome)}</div>
                    </div>
                    <div
                      onClick={() => navigate('/finance')}
                      className="flex items-center gap-1.5 text-neutral-300 glass-pill px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] cursor-pointer hover:bg-white/10 transition shrink-0"
                    >
                      <svg className="w-3.5 h-3.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                        <rect height="18" rx="2" width="18" x="3" y="3" />
                        <path d="M9 17v-4m4 4v-8m4 8v-2" />
                      </svg>
                      <span>Detail Arus</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400">Surplus Kas</div>
                      <div className="font-semibold text-[#4DE0A2]">{formatCurrency(cashSurplus)}</div>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            {/* SISI KANAN: 3 KOLOM (PANEL MODUL GROWTH & RADIAL DONUT) */}
            <div className="col-span-12 xl:col-span-3">
              <article className="glass-card p-3.5 sm:p-5 flex flex-col justify-between h-full min-h-0 sm:min-h-[406px]">
                {/* Tab Navigasi Ikon Kontekstual Atas */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-neutral-400">
                  <button
                    type="button"
                    onClick={() => navigate('/finance')}
                    className="hover:text-white transition cursor-pointer"
                    title="Ringkasan Perbankan & Kas"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/programs')}
                    className="hover:text-white transition cursor-pointer"
                    title="Program Kerja"
                  >
                    <svg className="w-4 h-4 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                      <rect height="14" rx="2" width="20" x="2" y="5" />
                      <line x1="2" x2="22" y1="10" y2="10" />
                    </svg>
                  </button>
                  {canViewUpcomingAgendas && (
                    <button
                      type="button"
                      onClick={() => setActiveWidgetModal('upcomingAgendas')}
                      className="hover:text-white transition cursor-pointer"
                      title="Kalender Agenda Mendatang"
                    >
                      <HeroCalendar className="w-4 h-4" />
                    </button>
                  )}
                  {canViewBudgetChart && (
                    <button
                      type="button"
                      onClick={() => setActiveWidgetModal('budgetChart')}
                      className="hover:text-white transition cursor-pointer"
                      title="Grafik Realisasi Anggaran"
                    >
                      <HeroChartBar className="w-4 h-4" />
                    </button>
                  )}
                  {canViewLatestAudit && (
                    <button
                      type="button"
                      onClick={() => setActiveWidgetModal('auditLogs')}
                      className="hover:text-white transition cursor-pointer"
                      title="Aktivitas Log Sistem"
                    >
                      <HeroShieldCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/tasks')}
                    className="hover:text-white transition cursor-pointer"
                    title="Target Tugas"
                  >
                    <svg className="w-4 h-4 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </button>
                </div>

                {/* Judul Panel */}
                <div className="text-center pt-2">
                  <h3 className="text-sm font-semibold text-neutral-200 tracking-wide">
                    {canViewKpiProgress ? 'Akselerasi Pertumbuhan' : 'Ringkasan Ekosistem'}
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {canViewKpiProgress ? 'Indeks Kinerja Komprehensif (KPI)' : 'Pemantauan Terpadu'}
                  </p>
                </div>

                {/* Diagram Donat Radial (Capaian KPI Riil dengan Glow Neon) */}
                <div className="relative flex items-center justify-center my-1 sm:my-3">
                  <svg className="w-24 h-24 sm:w-44 sm:h-48 circular-progress" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" fill="transparent" r="62" stroke="rgba(255,255,255,0.06)" strokeWidth="11" />
                    <circle
                      className="drop-shadow-[0_0_12px_rgba(77,224,162,0.5)] transition-all duration-1000"
                      cx="80"
                      cy="80"
                      fill="transparent"
                      r="62"
                      stroke="#4DE0A2"
                      strokeDasharray="389"
                      strokeDashoffset={389 - (389 * kpiAchievementRate) / 100}
                      strokeLinecap="round"
                      strokeWidth="11"
                    />
                    <circle
                      className="drop-shadow-[0_0_10px_rgba(200,235,91,0.4)] transition-all duration-1000"
                      cx="80"
                      cy="80"
                      fill="transparent"
                      r="62"
                      stroke="#C8EB5B"
                      strokeDasharray="389"
                      strokeDashoffset={389 - (389 * ecoStats.absorptionRate) / 100}
                      strokeLinecap="round"
                      strokeWidth="11"
                    />
                  </svg>

                  {/* Nilai Tengah Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
                      {kpiAchievementRate}%
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-neutral-400 font-medium tracking-wider uppercase mt-0.5">
                      Tercapai
                    </span>
                  </div>
                </div>

                {/* Legenda Donat Radial */}
                <div className="flex items-center justify-center gap-6 text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4DE0A2] shadow-[0_0_8px_#4DE0A2]" />
                    <span className="text-[11px] font-medium text-neutral-300">KPI Rata-rata</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C8EB5B] shadow-[0_0_8px_#C8EB5B]" />
                    <span className="text-[11px] font-medium text-neutral-300">Serapan Kas</span>
                  </div>
                </div>

                {/* Ringkasan Kaki Panel */}
                <div className="text-center pt-3 pb-1 border-t border-white/10">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white">
                    <span className="w-2 h-2 rounded-full bg-[#4DE0A2] inline-block animate-pulse" />
                    <span>
                      {performances.length > 0
                        ? `${performances.length} Indikator KPI Dipantau`
                        : 'Kinerja Ekosistem Berjalan'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {currentOrganization?.name || 'Ekosistem PPMU'} 2026
                  </p>
                </div>
              </article>
            </div>
          </section>

          {/* ======================================================== */}
          {/* MODAL WIDGET INTERAKTIF (Chart, Agendas, Audit Logs)     */}
          {/* ======================================================== */}
          {activeWidgetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
              <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/15 shadow-2xl flex flex-col">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-[#1c332c] flex items-center justify-center text-[#4DE0A2] border border-[#4DE0A2]/30">
                      {activeWidgetModal === 'budgetChart' && <HeroChartBar className="w-5 h-5" />}
                      {activeWidgetModal === 'upcomingAgendas' && <HeroCalendar className="w-5 h-5" />}
                      {activeWidgetModal === 'auditLogs' && <HeroShieldCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {activeWidgetModal === 'budgetChart' && 'Grafik Realisasi Anggaran & Kegiatan'}
                        {activeWidgetModal === 'upcomingAgendas' && 'Kalender Agenda & Kegiatan Mendatang'}
                        {activeWidgetModal === 'auditLogs' && 'Jejak Aktivitas & Log Sistem Terbaru'}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {activeWidgetModal === 'budgetChart' && 'Data riil agregasi transaksi bulanan dan agenda tuntas'}
                        {activeWidgetModal === 'upcomingAgendas' && 'Daftar agenda kegiatan aktif di organisasi'}
                        {activeWidgetModal === 'auditLogs' && 'Rekam jejak perubahan data dan kepatuhan sistem'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveWidgetModal(null)}
                    className="w-9 h-9 rounded-full glass-pill flex items-center justify-center text-neutral-300 hover:text-white cursor-pointer"
                  >
                    <HeroXMark className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                  {activeWidgetModal === 'budgetChart' && (
                    <ChartWidget transactions={transactions} agendas={agendas} />
                  )}

                  {activeWidgetModal === 'upcomingAgendas' && (
                    <RecentAgendasWidget agendas={agendas} />
                  )}

                  {activeWidgetModal === 'auditLogs' && (
                    <div className="space-y-3">
                      {auditLogs.length === 0 ? (
                        <div className="py-8 text-center text-xs text-neutral-400">
                          Belum ada catatan aktivitas sistem yang terekam.
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {auditLogs.slice(0, 10).map((log) => (
                            <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                              <div>
                                <p className="font-semibold text-white">
                                  <span className="capitalize text-[#4DE0A2] font-mono mr-2">[{log.action}]</span>
                                  {log.resource}
                                </p>
                                <p className="text-[11px] text-neutral-400 mt-0.5">
                                  Oleh: {log.user_name || 'Sistem'}
                                </p>
                              </div>
                              <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                                {formatDate(log.created_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-white/10 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveWidgetModal(null)}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
