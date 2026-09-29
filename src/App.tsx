import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/context/ToastContext'
import { ConfirmProvider } from '@/context/ConfirmContext'
import { AuthProvider } from '@/context/AuthContext'
import { HelpProvider } from '@/context/HelpContext'
import { AdminLayout } from '@/components/layout/AdminLayout'

// Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'

// Superadmin Module
import { OrganizationListPage } from '@/pages/superadmin/OrganizationListPage'
import { AccountListPage } from '@/pages/superadmin/AccountListPage'
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
import { FinanceListPage } from '@/pages/ecosystem/FinanceListPage'
import { FinanceCreatePage } from '@/pages/ecosystem/FinanceCreatePage'
import { ReportListPage } from '@/pages/ecosystem/ReportListPage'
import { ReportCreatePage } from '@/pages/ecosystem/ReportCreatePage'
import { TaskListPage } from '@/pages/ecosystem/TaskListPage'
import { TaskCreatePage } from '@/pages/ecosystem/TaskCreatePage'

// Users removed - replaced by AccountListPage

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <BrowserRouter>
              <HelpProvider>
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
              </HelpProvider>
            </BrowserRouter>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
