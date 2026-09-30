import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/context/ToastContext'
import { ConfirmProvider } from '@/context/ConfirmContext'
import { AuthProvider } from '@/context/AuthContext'
import { HelpProvider } from '@/context/HelpContext'
import { AdminLayout } from '@/components/layout/AdminLayout'

const PageFallback: React.FC = () => (
  <div className="w-full min-w-0 flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
    <div className="h-8 w-48 rounded-lg bg-line-divider" />
    <div className="h-24 w-full rounded-xl bg-line-divider" />
    <div className="h-80 w-full rounded-xl bg-line-divider" />
  </div>
)

// Helper for named lazy export
const lazyNamed = <T extends Record<string, any>, K extends keyof T>(
  factory: () => Promise<T>,
  key: K
) => React.lazy(() => factory().then((module) => ({ default: module[key] })))

// Lazy Pages
const LoginPage = lazyNamed(() => import('@/pages/auth/LoginPage'), 'LoginPage')
const DashboardPage = lazyNamed(() => import('@/pages/dashboard/DashboardPage'), 'DashboardPage')

// Superadmin Module
const OrganizationListPage = lazyNamed(() => import('@/pages/superadmin/OrganizationListPage'), 'OrganizationListPage')
const AccountListPage = lazyNamed(() => import('@/pages/superadmin/AccountListPage'), 'AccountListPage')
const RoleListPage = lazyNamed(() => import('@/pages/superadmin/RoleListPage'), 'RoleListPage')
const RoleCreatePage = lazyNamed(() => import('@/pages/superadmin/RoleCreatePage'), 'RoleCreatePage')
const RoleEditPage = lazyNamed(() => import('@/pages/superadmin/RoleEditPage'), 'RoleEditPage')
const AuditLogListPage = lazyNamed(() => import('@/pages/superadmin/AuditLogListPage'), 'AuditLogListPage')
const SettingsPage = lazyNamed(() => import('@/pages/settings/SettingsPage'), 'SettingsPage')

// Organization Ecosystem Lifecycle
const StructurePage = lazyNamed(() => import('@/pages/ecosystem/StructurePage'), 'StructurePage')
const ProgramListPage = lazyNamed(() => import('@/pages/ecosystem/ProgramListPage'), 'ProgramListPage')
const ProgramCreatePage = lazyNamed(() => import('@/pages/ecosystem/ProgramCreatePage'), 'ProgramCreatePage')
const ProgramEditPage = lazyNamed(() => import('@/pages/ecosystem/ProgramEditPage'), 'ProgramEditPage')
const AgendaListPage = lazyNamed(() => import('@/pages/ecosystem/AgendaListPage'), 'AgendaListPage')
const AgendaCreatePage = lazyNamed(() => import('@/pages/ecosystem/AgendaCreatePage'), 'AgendaCreatePage')
const AgendaEditPage = lazyNamed(() => import('@/pages/ecosystem/AgendaEditPage'), 'AgendaEditPage')
const PerformanceListPage = lazyNamed(() => import('@/pages/ecosystem/PerformanceListPage'), 'PerformanceListPage')
const PerformanceCreatePage = lazyNamed(() => import('@/pages/ecosystem/PerformanceCreatePage'), 'PerformanceCreatePage')
const FinanceListPage = lazyNamed(() => import('@/pages/ecosystem/FinanceListPage'), 'FinanceListPage')
const FinanceCreatePage = lazyNamed(() => import('@/pages/ecosystem/FinanceCreatePage'), 'FinanceCreatePage')
const ReportListPage = lazyNamed(() => import('@/pages/ecosystem/ReportListPage'), 'ReportListPage')
const ReportCreatePage = lazyNamed(() => import('@/pages/ecosystem/ReportCreatePage'), 'ReportCreatePage')
const TaskListPage = lazyNamed(() => import('@/pages/ecosystem/TaskListPage'), 'TaskListPage')
const TaskCreatePage = lazyNamed(() => import('@/pages/ecosystem/TaskCreatePage'), 'TaskCreatePage')

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <BrowserRouter>
              <HelpProvider>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    {/* Auth Route */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected Admin Routes */}
                    <Route path="/" element={<AdminLayout />}>
                      <Route index element={<DashboardPage />} />

                      {/* Superadmin Global Routes */}
                      <Route path="organizations" element={<OrganizationListPage />} />
                      <Route path="accounts" element={<AccountListPage />} />
                      <Route path="admins" element={<Navigate to="/accounts" replace />} />
                      <Route path="roles" element={<RoleListPage />} />
                      <Route path="roles/create" element={<RoleCreatePage />} />
                      <Route path="roles/:id/edit" element={<RoleEditPage />} />
                      <Route path="audit-logs" element={<AuditLogListPage />} />
                      <Route path="settings" element={<SettingsPage />} />

                      {/* Organization Ecosystem Lifecycle Routes */}
                      <Route path="structures" element={<StructurePage />} />
                      <Route path="programs" element={<ProgramListPage />} />
                      <Route path="programs/create" element={<ProgramCreatePage />} />
                      <Route path="programs/:id/edit" element={<ProgramEditPage />} />
                      <Route path="agendas" element={<AgendaListPage />} />
                      <Route path="agendas/create" element={<AgendaCreatePage />} />
                      <Route path="agendas/:id/edit" element={<AgendaEditPage />} />
                      <Route path="performance" element={<PerformanceListPage />} />
                      <Route path="performance/create" element={<PerformanceCreatePage />} />
                      <Route path="finance" element={<FinanceListPage />} />
                      <Route path="finance/create" element={<FinanceCreatePage />} />
                      <Route path="reports" element={<ReportListPage />} />
                      <Route path="reports/create" element={<ReportCreatePage />} />
                      <Route path="tasks" element={<TaskListPage />} />
                      <Route path="tasks/create" element={<TaskCreatePage />} />

                      {/* Users Legacy Redirect to Accounts */}
                      <Route path="users/*" element={<Navigate to="/accounts" replace />} />

                      {/* Fallback inside admin */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>

                    {/* Global Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </HelpProvider>
            </BrowserRouter>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
