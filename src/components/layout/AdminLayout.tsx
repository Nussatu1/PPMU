import React, { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileAppHeader } from './MobileAppHeader'
import { GlobalSearchModal } from './GlobalSearchModal'
import { MobileBottomNav } from './MobileBottomNav'
import { HelpDrawer } from '@/components/help/HelpDrawer'
import { useAuth } from '@/context/AuthContext'

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen flex antialiased bg-surface-muted">
      {/* Desktop Persistent Sidebar (>= lg) */}
      <Sidebar
        isMobileOpen={false}
        onMobileClose={() => {}}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 w-full transition-all duration-300 ease-in-out">
        {/* Desktop topbar (>= lg) */}
        <Topbar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        />

        {/* Mobile header (< lg): judul halaman, kembali, pencarian, notifikasi, profil */}
        <MobileAppHeader
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        />

        {/* Page content - pb prevents content from being hidden behind bottom bar.
             On notched iPhones: safe-area-inset-bottom ≈ 34px + 50px bar = ~84px needed.
             pb-[max(5rem,calc(3.5rem+env(safe-area-inset-bottom)))] covers all devices. */}
        <main className="flex-1 min-w-0 w-full flex flex-col pb-[max(5rem,calc(3.5rem+env(safe-area-inset-bottom)))] lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Tab Bar (lg:hidden) */}
      <MobileBottomNav />

      {/* Global search */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
      />

      {/* Help Slide-over Drawer */}
      <HelpDrawer />
    </div>
  )
}
