import type { HelpContent } from './types'
import { dashboardHelp } from './dashboardHelp'
import { superadminHelp } from './superadminHelp'
import { structureHelp } from './structureHelp'
import { programsHelp } from './programsHelp'
import { agendasHelp } from './agendasHelp'
import { performanceHelp } from './performanceHelp'
import { financeHelp } from './financeHelp'
import { reportsHelp } from './reportsHelp'
import { tasksHelp } from './tasksHelp'

export * from './types'

export const helpRegistry: Record<string, HelpContent> = {
  ...dashboardHelp,
  ...superadminHelp,
  ...structureHelp,
  ...programsHelp,
  ...agendasHelp,
  ...performanceHelp,
  ...financeHelp,
  ...reportsHelp,
  ...tasksHelp,
}

/**
 * Resolves an active application URL pathname to its corresponding HelpContent key.
 * This ensures zero manual boilerplate inside individual page components.
 */
export function resolveHelpKey(pathname: string): string {
  // Normalize pathname: remove trailing slash except root
  const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  if (cleanPath === '' || cleanPath === '/') {
    return 'dashboard'
  }

  // Exact matching for create and special routes
  if (cleanPath === '/finance') return 'finance.list'
  if (cleanPath === '/finance/create') return 'finance.create'

  if (cleanPath === '/programs') return 'programs.list'
  if (cleanPath === '/programs/create') return 'programs.create'
  if (/^\/programs\/[^/]+\/edit$/.test(cleanPath)) return 'programs.edit'

  if (cleanPath === '/agendas') return 'agendas.list'
  if (cleanPath === '/agendas/create') return 'agendas.create'
  if (/^\/agendas\/[^/]+\/edit$/.test(cleanPath)) return 'agendas.edit'

  if (cleanPath === '/performance') return 'performance.list'
  if (cleanPath === '/performance/create') return 'performance.create'

  if (cleanPath === '/reports') return 'reports.list'
  if (cleanPath === '/reports/create') return 'reports.create'

  if (cleanPath === '/tasks') return 'tasks.list'
  if (cleanPath === '/tasks/create') return 'tasks.create'

  if (cleanPath === '/structures') return 'structures.view'

  if (cleanPath === '/organizations') return 'organizations.list'
  if (cleanPath === '/accounts' || cleanPath === '/admins') return 'admins.list'
  if (cleanPath === '/roles') return 'roles.list'
  if (cleanPath === '/audit-logs') return 'audit-logs.list'

  // Default fallback matching first segment
  const segments = cleanPath.split('/').filter(Boolean)
  if (segments.length > 0) {
    const resource = segments[0]
    if (segments[1] === 'create') return `${resource}.create`
    if (segments[2] === 'edit') return `${resource}.edit`
    if (segments[2] === 'view') return `${resource}.view`
    return `${resource}.list`
  }

  return 'dashboard'
}

/**
 * Returns the HelpContent object for a given key, or undefined if not registered.
 */
export function getHelpContent(key: string): HelpContent | undefined {
  return helpRegistry[key]
}
