import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HeroChevronLeft } from '@/components/icons/HeroIcons'
import { getPageTitle } from '@/lib/pageTitle'
import { cn } from '@/lib/utils'

export interface MobileAppHeaderProps {
  onOpenGlobalSearch?: () => void
}

/**
 * Header navigasi mobile bergaya iOS:
 * - STATE TOP (scrollY <= 36px): Compact title tersembunyi (Large Title body menjadi satu-satunya judul visual).
 * - STATE SCROLLED (scrollY > 36px): Compact title muncul secara halus (opacity + transform) dan true-centered.
 * - KIRI  : Tombol Kembali (Back navigation, min 44x44px)
 * - TENGAH: Judul Halaman Compact (Mathematically Centered terhadap Viewport, tag <span>)
 * - KANAN : Placeholder Aksi Halaman "?" (Static visual placeholder, min 44x44px)
 *
 * Halaman Dashboard ("/") tidak memakai header ini karena sudah memiliki
 * header mobile sendiri.
 */
/**
 * Resolusi rute induk (parent route) secara hierarkis:
 * Mobile back selalu mengikuti struktur aplikasi, bukan riwayat klik browser.
 */
export const getParentRoute = (pathname: string): string => {
  // 1. Keuangan
  if (pathname.startsWith('/finance/create') || (pathname.startsWith('/finance/') && pathname !== '/finance')) {
    return '/finance'
  }

  // 2. Program Kerja
  if (pathname.startsWith('/programs/create') || (pathname.includes('/programs/') && pathname.endsWith('/edit'))) {
    return '/programs'
  }

  // 3. Agenda & Kegiatan
  if (pathname.startsWith('/agendas/create') || (pathname.includes('/agendas/') && pathname.endsWith('/edit'))) {
    return '/agendas'
  }

  // 4. Capaian Kinerja (KPI)
  if (pathname.startsWith('/performance/create')) {
    return '/performance'
  }

  // 5. Laporan & Evaluasi
  if (pathname.startsWith('/reports/create')) {
    return '/reports'
  }

  // 6. Tugas & Tindak Lanjut
  if (pathname.startsWith('/tasks/create')) {
    return '/tasks'
  }

  // 7. Peran & Izin
  if (pathname.startsWith('/roles/create') || (pathname.includes('/roles/') && pathname.endsWith('/edit'))) {
    return '/roles'
  }

  // 8. Menu Hub & Seluruh Modul Level-Atas -> Kembali ke Dashboard
  // (/menu, /finance, /programs, /agendas, /performance, /reports, /tasks, /structures, /organizations, /accounts, /audit-logs, /roles, /settings)
  return '/'
}

export const MobileAppHeader: React.FC<MobileAppHeaderProps> = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)

  const pathname = location.pathname
  const isRootPage = pathname === '/'

  // Reset scroll state saat rute berpindah
  useEffect(() => {
    setIsScrolled(false)
  }, [pathname])

  // Scroll detection dengan passive listener dan requestAnimationFrame
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.scrollY > 36
          setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev))
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  if (isRootPage) return null

  const title = getPageTitle(pathname)

  const handleBack = () => {
    // Beri kesempatan komponen aktif (misal form modal/in-page) mencegat aksi back
    const event = new CustomEvent('filament:mobile-back', { cancelable: true })
    const isPrevented = !window.dispatchEvent(event)
    if (isPrevented) {
      return
    }

    const parentRoute = getParentRoute(pathname)
    navigate(parentRoute)
  }

  return (
    <header className="lg:hidden sticky top-0 z-20 h-14 shrink-0 relative flex items-center justify-between px-3 bg-topbar/95 backdrop-blur-xl border-b border-line transition-colors select-none">
      {/* 1. KIRI: Tombol Kembali (Anchor Kiri, z-10) */}
      <div className="flex items-center justify-start min-w-[44px] z-10">
        <button
          type="button"
          onClick={handleBack}
          className="min-w-[44px] min-h-[44px] -ml-1 inline-flex items-center justify-center rounded-xl text-fg-muted hover:text-fg hover:bg-hover-bg active:bg-hover-bg transition-colors cursor-pointer shrink-0"
          aria-label="Kembali ke halaman sebelumnya"
        >
          <HeroChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* 2. TENGAH: Judul Halaman Compact (Mathematically True-Centered terhadap Viewport, z-0) */}
      <div className="absolute inset-x-0 mx-auto flex items-center justify-center pointer-events-none px-14 z-0">
        <span
          aria-hidden={!isScrolled}
          className={cn(
            'text-sm font-semibold text-fg tracking-tight truncate max-w-[calc(100vw-112px)] pointer-events-auto transition-all duration-200 ease-out',
            isScrolled
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-1.5 pointer-events-none'
          )}
        >
          {title}
        </span>
      </div>

      {/* 3. KANAN: Placeholder Aksi "?" (Anchor Kanan, z-10) */}
      <div className="flex items-center justify-end min-w-[44px] z-10">
        <button
          type="button"
          className="min-w-[44px] min-h-[44px] -mr-1 inline-flex items-center justify-center rounded-xl text-fg-muted hover:text-fg hover:bg-hover-bg active:bg-hover-bg transition-colors cursor-pointer shrink-0"
          aria-label="Aksi halaman"
        >
          <span className="w-6 h-6 rounded-full border border-line-strong/80 flex items-center justify-center text-xs font-semibold text-fg-muted">
            ?
          </span>
        </button>
      </div>
    </header>
  )
}

