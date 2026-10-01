import type { ComponentType } from 'react'
import {
  HeroSquares2X2,
  HeroBriefcase,
  HeroCalendar,
  HeroChartBar,
  HeroCurrencyDollar,
  HeroClipboardDocumentList,
  HeroCheckCircle,
  HeroBuildingOffice,
  HeroUsers,
  HeroShieldCheck,
  HeroClock,
} from '@/components/icons/HeroIcons'

export interface NavigationModule {
  id: string
  label: string
  name: string
  href: string
  icon: ComponentType<{ className?: string }>
  color: string
  group: 'organisasi' | 'sistem'
  requiresSuperAdmin?: boolean
  defaultBadge?: string
  badgeColor?: 'primary' | 'danger'
}

/**
 * Single source of truth untuk definisi modul navigasi ekosistem aplikasi.
 * Digunakan secara konsisten oleh MobileMenuPage dan Beranda Quick Launcher.
 * (Sidebar desktop tetap menggunakan konfigurasinya sendiri untuk absolute protection).
 */
export const ALL_NAVIGATION_MODULES: NavigationModule[] = [
  // 1. Ekosistem Organisasi (Operasional Harian)
  {
    id: 'structures',
    label: 'Struktur',
    name: 'Struktur & Seksi',
    href: '/structures',
    icon: HeroSquares2X2,
    color: 'text-primary-600 dark:text-primary-400',
    group: 'organisasi',
  },
  {
    id: 'programs',
    label: 'Program',
    name: 'Program Kerja',
    href: '/programs',
    icon: HeroBriefcase,
    color: 'text-primary-600 dark:text-primary-400',
    group: 'organisasi',
    defaultBadge: '3',
    badgeColor: 'primary',
  },
  {
    id: 'agendas',
    label: 'Agenda',
    name: 'Agenda & Kegiatan',
    href: '/agendas',
    icon: HeroCalendar,
    color: 'text-sky-600 dark:text-sky-400',
    group: 'organisasi',
  },
  {
    id: 'performance',
    label: 'Kinerja',
    name: 'Capaian Kinerja',
    href: '/performance',
    icon: HeroChartBar,
    color: 'text-purple-600 dark:text-purple-400',
    group: 'organisasi',
  },
  {
    id: 'finance',
    label: 'Keuangan',
    name: 'Anggaran & Keuangan',
    href: '/finance',
    icon: HeroCurrencyDollar,
    color: 'text-emerald-600 dark:text-emerald-400',
    group: 'organisasi',
  },
  {
    id: 'reports',
    label: 'Laporan',
    name: 'Laporan & Evaluasi',
    href: '/reports',
    icon: HeroClipboardDocumentList,
    color: 'text-rose-600 dark:text-rose-400',
    group: 'organisasi',
    defaultBadge: '1',
    badgeColor: 'danger',
  },
  {
    id: 'tasks',
    label: 'Tugas',
    name: 'Tugas & Tindak Lanjut',
    href: '/tasks',
    icon: HeroCheckCircle,
    color: 'text-blue-600 dark:text-blue-400',
    group: 'organisasi',
  },

  // 2. Tata Kelola Sistem (Superadmin)
  {
    id: 'organizations',
    label: 'Organisasi',
    name: 'Organisasi',
    href: '/organizations',
    icon: HeroBuildingOffice,
    color: 'text-primary-600 dark:text-primary-400',
    group: 'sistem',
    requiresSuperAdmin: true,
    defaultBadge: '3',
    badgeColor: 'primary',
  },
  {
    id: 'accounts',
    label: 'Akun',
    name: 'Akun Pengguna',
    href: '/accounts',
    icon: HeroUsers,
    color: 'text-blue-600 dark:text-blue-400',
    group: 'sistem',
    requiresSuperAdmin: true,
  },
  {
    id: 'roles',
    label: 'Peran',
    name: 'Peran & Izin Matrix',
    href: '/roles',
    icon: HeroShieldCheck,
    color: 'text-emerald-600 dark:text-emerald-400',
    group: 'sistem',
    requiresSuperAdmin: true,
  },
  {
    id: 'audit-logs',
    label: 'Audit',
    name: 'Audit Trail',
    href: '/audit-logs',
    icon: HeroClock,
    color: 'text-fg-muted',
    group: 'sistem',
    requiresSuperAdmin: true,
  },
]

/**
 * 4 Modul Prioritas Statis untuk Quick Launcher di Beranda Mobile.
 */
export const FREQUENT_HOME_MODULE_HREFS = [
  '/programs',
  '/agendas',
  '/finance',
  '/reports',
] as const
