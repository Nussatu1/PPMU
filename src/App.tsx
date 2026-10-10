import React, { Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/context/ToastContext'
import { ConfirmProvider } from '@/context/ConfirmContext'
import { AuthProvider } from '@/context/AuthContext'
import { HelpProvider } from '@/context/HelpContext'
import { AdminLayout } from '@/components/layout/AdminLayout'

import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { MobileMenuPage } from '@/pages/dashboard/MobileMenuPage'

// Superadmin Module
import { AccountListPage } from '@/pages/superadmin/AccountListPage'
import { AccountCreatePage } from '@/pages/superadmin/AccountCreatePage'
import { AccountEditPage } from '@/pages/superadmin/AccountEditPage'
import { RoleListPage } from '@/pages/superadmin/RoleListPage'
import { RoleCreatePage } from '@/pages/superadmin/RoleCreatePage'
import { RoleEditPage } from '@/pages/superadmin/RoleEditPage'
import { AuditLogListPage } from '@/pages/superadmin/AuditLogListPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

// Organization Ecosystem Lifecycle
import { StructurePage } from '@/pages/ecosystem/StructurePage'
import { ProgramListPage } from '@/pages/ecosystem/ProgramListPage'
import { ProgramCreatePage } from '@/pages/ecosystem/ProgramCreatePage'
import { ProgramEditPage } from '@/pages/ecosystem/ProgramEditPage'
import { AgendaListPage } from '@/pages/ecosystem/AgendaListPage'
import { AgendaCreatePage } from '@/pages/ecosystem/AgendaCreatePage'
import { AgendaEditPage } from '@/pages/ecosystem/AgendaEditPage'
import { PerformanceListPage } from '@/pages/ecosystem/PerformanceListPage'
import { PerformanceCreatePage } from '@/pages/ecosystem/PerformanceCreatePage'
import { PerformanceEditPage } from '@/pages/ecosystem/PerformanceEditPage'
import { FinanceListPage } from '@/pages/ecosystem/FinanceListPage'
import { FinanceCreatePage } from '@/pages/ecosystem/FinanceCreatePage'
import { FinanceDetailPage } from '@/pages/ecosystem/FinanceDetailPage'
import { FinanceEditPage } from '@/pages/ecosystem/FinanceEditPage'
import { BudgetEditPage } from '@/pages/ecosystem/BudgetEditPage'
import { ReportListPage } from '@/pages/ecosystem/ReportListPage'
import { ReportCreatePage } from '@/pages/ecosystem/ReportCreatePage'
import { TaskListPage } from '@/pages/ecosystem/TaskListPage'
import { TaskCreatePage } from '@/pages/ecosystem/TaskCreatePage'
import { TaskEditPage } from '@/pages/ecosystem/TaskEditPage'

const PageFallback: React.FC = () => (
  <div className="w-full min-w-0 flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
    <div className="h-8 w-48 rounded-lg bg-line-divider" />
    <div className="h-24 w-full rounded-xl bg-line-divider" />
    <div className="h-80 w-full rounded-xl bg-line-divider" />
  </div>
)

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <HashRouter>
              <HelpProvider>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    {/* Auth Route */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected Admin Routes */}
                    <Route path="/" element={<AdminLayout />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="menu" element={<MobileMenuPage />} />

                      {/* Superadmin Global Routes */}
                      <Route path="organizations" element={<Navigate to="/structures" replace />} />
                      <Route path="accounts" element={<AccountListPage />} />
                      <Route path="accounts/create" element={<AccountCreatePage />} />
                      <Route path="accounts/:id/edit" element={<AccountEditPage />} />
                      <Route path="admins" element={<Navigate to="/accounts" replace />} />
                      <Route path="roles" element={<RoleListPage />} />
                      <Route path="roles/create" element={<RoleCreatePage />} />
                      <Route path="roles/:id/edit" element={<RoleEditPage />} />
                      <Route path="audit-logs" element={<AuditLogListPage />} />
                      <Route path="settings" element={<SettingsPage />} />

                      {/* Organization Ecosystem Lifecycle Routes */}
                      <Route path="structures" element={<StructurePage />} />
                      <Route path="structures/organizations/create" element={<Navigate to="/structures" replace />} />
                      <Route path="organizations/create" element={<Navigate to="/structures" replace />} />
                      <Route path="programs" element={<ProgramListPage />} />
                      <Route path="programs/create" element={<ProgramCreatePage />} />
                      <Route path="programs/:id/edit" element={<ProgramEditPage />} />
                      <Route path="agendas" element={<AgendaListPage />} />
                      <Route path="agendas/create" element={<AgendaCreatePage />} />
                      <Route path="agendas/:id/edit" element={<AgendaEditPage />} />
                      <Route path="performance" element={<PerformanceListPage />} />
                      <Route path="performance/create" element={<PerformanceCreatePage />} />
                      <Route path="performance/:id/edit" element={<PerformanceEditPage />} />
                      <Route path="finance" element={<FinanceListPage />} />
                      <Route path="finance/create" element={<FinanceCreatePage />} />
                      <Route path="finance/:id" element={<FinanceDetailPage />} />
                      <Route path="finance/:id/edit" element={<FinanceEditPage />} />
                      <Route path="budgets/:id/edit" element={<BudgetEditPage />} />
                      <Route path="reports" element={<ReportListPage />} />
                      <Route path="reports/create" element={<ReportCreatePage />} />
                      <Route path="tasks" element={<TaskListPage />} />
                      <Route path="tasks/create" element={<TaskCreatePage />} />
                      <Route path="tasks/:id/edit" element={<TaskEditPage />} />

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
            </HashRouter>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
