import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HeroBriefcase,
  HeroCalendar,
  HeroClipboardDocumentList,
  HeroCurrencyDollar,
  HeroArrowRight,
  HeroBuildingOffice,
  HeroPlus,
  HeroUsers,
  HeroSquares2X2,
  HeroChartBar,
  HeroCheckCircle,
  HeroShieldCheck,
  HeroClock,
  HeroCog6Tooth,
} from '@/components/icons/HeroIcons'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { ChartWidget } from '@/components/widgets/ChartWidget'
import { RecentAgendasWidget } from '@/components/widgets/RecentAgendasWidget'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { formatCurrency, cn } from '@/lib/utils'
import { t } from '@/i18n'
import type { Agenda } from '@/types/database'

import { PageContainer } from '@/components/layout/PageContainer'

export const DashboardPage: React.FC = () => {
  const { user, currentOrganization } = useAuth()
  const navigate = useNavigate()

  const isSuperAdmin = user?.is_superadmin || false

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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        if (currentOrganization?.id) {
          const [ecosystemData, agendasData] = await Promise.all([
            dataService.getEcosystemStats(currentOrganization.id, user),
            dataService.getAgendas(currentOrganization.id, undefined, user),
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
  }, [currentOrganization?.id, user])

  // Navigasi Menu Cepat Mobile (Sidebar dijadikan menu berlabel minimal di layar utama)
  const mobileNavItems = [
    {
      label: 'Struktur',
      href: '/structures',
      icon: HeroSquares2X2,
      color: 'text-primary-600 dark:text-primary-400',
    },
    {
      label: 'Program',
      href: '/programs',
      icon: HeroBriefcase,
      badge: ecoStats.totalPrograms ? String(ecoStats.totalPrograms) : undefined,
      color: 'text-primary-600 dark:text-primary-400',
    },
    {
      label: 'Agenda',
      href: '/agendas',
      icon: HeroCalendar,
      badge: ecoStats.inProgressAgendas ? String(ecoStats.inProgressAgendas) : undefined,
      color: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: 'Kinerja',
      href: '/performance',
      icon: HeroChartBar,
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Keuangan',
      href: '/finance',
      icon: HeroCurrencyDollar,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Laporan',
      href: '/reports',
      icon: HeroClipboardDocumentList,
      badge: ecoStats.pendingReports ? String(ecoStats.pendingReports) : undefined,
      badgeDanger: true,
      color: 'text-rose-600 dark:text-rose-400',
    },
    {
      label: 'Tugas',
      href: '/tasks',
      icon: HeroCheckCircle,
      badge: ecoStats.pendingTasks ? String(ecoStats.pendingTasks) : undefined,
      color: 'text-blue-600 dark:text-blue-400',
    },
    ...(isSuperAdmin
      ? [
          {
            label: 'Organisasi',
            href: '/organizations',
            icon: HeroBuildingOffice,
            badge: '3',
            color: 'text-primary-600 dark:text-primary-400',
          },
          {
            label: 'Akun',
            href: '/accounts',
            icon: HeroUsers,
            color: 'text-blue-600 dark:text-blue-400',
          },
          {
            label: 'Peran',
            href: '/roles',
            icon: HeroShieldCheck,
            color: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'Audit',
            href: '/audit-logs',
            icon: HeroClock,
            color: 'text-fg-muted',
          },
        ]
      : []),
    {
      label: 'Pengaturan',
      href: '/settings',
      icon: HeroCog6Tooth,
      color: 'text-fg-muted',
    },
  ]

  return (
    <PageContainer variant="wide">
      {/* Header with Breadcrumb & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Breadcrumb items={[{ label: 'Dashboard Ekosistem' }]} />
          <h1 className="text-2xl font-bold tracking-tight text-fg mt-1 flex items-center gap-2">
            {currentOrganization ? (
              <>
                <HeroBuildingOffice className="w-6 h-6 text-amber-500" />
                {currentOrganization.name}
              </>
            ) : (
              t.dashboard.title
            )}
          </h1>
          <p className="text-xs text-fg-muted mt-0.5">
            {currentOrganization
              ? `Dashboard Ekosistem Kinerja • Peran: ${user?.is_superadmin ? 'Superadmin' : user?.active_membership?.role?.name || user?.role}`
              : t.dashboard.welcome(user?.name)}
          </p>
        </div>

        {/* Action CTAs (Desktop / Tablet) */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
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

      {/* Mobile Springboard / Quick Launcher (Sidebar dijadikan Menu di Halaman Utama dengan Label Minimal - Mobile Only) */}
      <div className="block lg:hidden -mt-1">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface border border-line shadow-xs">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <span className="text-[11px] font-bold text-fg-muted uppercase tracking-wider">
              Menu & Modul
            </span>
            <span className="text-[11px] text-primary-600 dark:text-primary-400 font-semibold">
              {mobileNavItems.length} Akses Cepat
            </span>
          </div>

          <div className="grid grid-cols-4 gap-y-3.5 gap-x-2">
            {mobileNavItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className="flex flex-col items-center gap-1.5 group cursor-pointer active:scale-90 transition-transform select-none"
              >
                <div className="relative w-12 h-12 rounded-2xl bg-surface-muted/90 ring-1 ring-line group-hover:ring-primary-500/50 flex items-center justify-center shadow-2xs transition-colors">
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
      </div>

      {/* Key Lifecycle KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Programs */}
        <div className="p-5 rounded-2xl border border-line bg-surface shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fg-muted uppercase">Program Kerja</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <HeroBriefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-fg">{ecoStats.totalPrograms}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              {ecoStats.activePrograms} Berjalan Aktif
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-line flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/programs')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
            >
              Kelola Program <HeroArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Agendas */}
        <div className="p-5 rounded-2xl border border-line bg-surface shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fg-muted uppercase">Agenda & Kegiatan</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <HeroCalendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-fg">{ecoStats.totalAgendas}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
              {ecoStats.inProgressAgendas} Sesi Sedang Berlangsung
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-line flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/agendas')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
            >
              Jadwal Kegiatan <HeroArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Reports */}
        <div className="p-5 rounded-2xl border border-line bg-surface shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fg-muted uppercase">Laporan & Verifikasi</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <HeroClipboardDocumentList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-fg">{ecoStats.totalReports}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
              {ecoStats.pendingReports} Menunggu Verifikasi Ketua
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-line flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
            >
              Verifikasi Laporan <HeroArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 4: Budget */}
        <div className="p-5 rounded-2xl border border-line bg-surface shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fg-muted uppercase">Serapan Anggaran</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <HeroCurrencyDollar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-fg">{ecoStats.absorptionRate}%</p>
            <p className="text-xs text-fg-muted font-medium mt-1">
              {formatCurrency(ecoStats.realizedBudget)} dari {formatCurrency(ecoStats.totalBudget)}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-line flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/finance')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
            >
              Arus Keuangan <HeroArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Chart & Operational Workflow */}
      <div className="space-y-6">
        <ChartWidget />

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
        <div className="p-5 sm:p-6 rounded-xl ring-1 ring-line bg-surface shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-4 border-b border-line-divider">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-semibold text-fg tracking-tight">
                  Alur Siklus Operasional Organisasi
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                  4 Tahap Terintegrasi
                </span>
              </div>
              <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                Panduan tata kelola kinerja organisasi dari penetapan peran hingga evaluasi dan tindak lanjut.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Step 1 */}
            <div className="p-4 sm:p-5 rounded-xl border border-line bg-surface-elevated/40 hover:bg-surface-elevated hover:border-line transition-all flex flex-col justify-between gap-3 group">
              <div className="space-y-3">
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
                  <p className="text-xs text-fg-muted leading-relaxed mt-1">
                    Bagan kerja organisasi, pembentukan seksi teknis, dan penetapan tupoksi personel.
                  </p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-line-divider/60 text-[11px] text-fg-subtle flex items-center justify-between">
                <span>Tahap Persiapan</span>
                <span className="font-mono">Fase 1</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 sm:p-5 rounded-xl border border-line bg-surface-elevated/40 hover:bg-surface-elevated hover:border-line transition-all flex flex-col justify-between gap-3 group">
              <div className="space-y-3">
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
                  <p className="text-xs text-fg-muted leading-relaxed mt-1">
                    Penyusunan program kerja (draft) dan persetujuan pagu anggaran oleh pimpinan.
                  </p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-line-divider/60 text-[11px] text-fg-subtle flex items-center justify-between">
                <span>Tahap Otorisasi</span>
                <span className="font-mono">Fase 2</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 sm:p-5 rounded-xl border border-line bg-surface-elevated/40 hover:bg-surface-elevated hover:border-line transition-all flex flex-col justify-between gap-3 group">
              <div className="space-y-3">
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
                  <p className="text-xs text-fg-muted leading-relaxed mt-1">
                    Eksekusi agenda lapangan, realisasi dana pos biaya, dan pengunggahan bukti fisik KPI.
                  </p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-line-divider/60 text-[11px] text-fg-subtle flex items-center justify-between">
                <span>Tahap Implementasi</span>
                <span className="font-mono">Fase 3</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 sm:p-5 rounded-xl border border-line bg-surface-elevated/40 hover:bg-surface-elevated hover:border-line transition-all flex flex-col justify-between gap-3 group">
              <div className="space-y-3">
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
                  <p className="text-xs text-fg-muted leading-relaxed mt-1">
                    Verifikasi ketua, penerbitan catatan evaluasi kaji ulang, dan penugasan tindak lanjut.
                  </p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-line-divider/60 text-[11px] text-fg-subtle flex items-center justify-between">
                <span>Tahap Akuntabilitas</span>
                <span className="font-mono">Fase 4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
