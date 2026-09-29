import React, { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { GlobalSearchModal } from './GlobalSearchModal'
import { HelpDrawer } from '@/components/help/HelpDrawer'
import { useAuth } from '@/context/AuthContext'

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
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
      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 w-full transition-all duration-300 ease-in-out">
        <Topbar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        />

        {/* Page content */}
        <main className="flex-1 min-w-0 w-full flex flex-col">
          <Outlet />
        </main>
      </div>

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
