// ==============================================================================
// FILAMENT ECOSYSTEM - RBAC & AUTHORIZATION POLICY ENGINE
// Strict Permission Verification & Multi-Organization Scope Guard
// ==============================================================================

import type {
  User,
  Organization,
  OrganizationScopeMode,
  PermissionAction,
  PermissionResource,
  PermissionItem,
  RoleEntity,
  ProgramStatus,
  ReportStatus,
  AgendaStatus,
  TaskStatus,
} from '@/types/database'
import { isDescendant, getDescendantOrganizationIds } from './hierarchyService'


// ------------------------------------------------------------------------------
// 1. ALL AVAILABLE ACTIONS & RESOURCES
// ------------------------------------------------------------------------------

export const ALL_PERMISSION_ACTIONS: PermissionAction[] = [
  'view',
  'viewAny',
  'create',
  'update',
  'restore',
  'restoreAny',
  'replicate',
  'reorder',
  'delete',
  'deleteAny',
  'forceDelete',
  'forceDeleteAny',
]

export const ALL_PERMISSION_RESOURCES: PermissionResource[] = [
  'Organization',
  'Admin',
  'Role',
  'Structure',
  'Program',
  'Agenda',
  'Performance',
  'Finance',
  'Report',
  'Task',
  'Document',
  'Audit',
]

export const ACTION_LABELS_ID: Record<PermissionAction, string> = {
  view: 'Lihat',
  viewAny: 'Lihat Apa Saja',
  create: 'Buat Baru',
  update: 'Perbarui',
  restore: 'Pulihkan',
  restoreAny: 'Pulihkan Apa Saja',
  replicate: 'Replikasi',
  reorder: 'Susun Ulang',
  delete: 'Hapus (Soft)',
  deleteAny: 'Hapus Apa Saja',
  forceDelete: 'Paksa Hapus',
  forceDeleteAny: 'Paksa Hapus Apa Saja',
}

export const RESOURCE_LABELS_ID: Record<PermissionResource, string> = {
  Organization: 'App\\Models\\Organization (Organisasi)',
  Admin: 'App\\Models\\Admin (Admin Organisasi)',
  Role: 'App\\Models\\Role (Peran / Hak Akses)',
  Structure: 'App\\Models\\Structure (Struktur & Seksi)',
  Program: 'App\\Models\\Program (Program Kerja)',
  Agenda: 'App\\Models\\Agenda (Agenda & Kegiatan)',
  Performance: 'App\\Models\\Performance (Capaian Kinerja)',
  Finance: 'App\\Models\\Finance (Anggaran & Transaksi)',
  Report: 'App\\Models\\Report (Laporan & Evaluasi)',
  Task: 'App\\Models\\Task (Tugas & Tindak Lanjut)',
  Document: 'App\\Models\\Document (Dokumen & Bukti)',
  Audit: 'App\\Models\\Audit (Audit Log)',
}

// Generate the complete permission items catalog
export const PERMISSION_CATALOG: PermissionItem[] = ALL_PERMISSION_RESOURCES.flatMap((resource) =>
  ALL_PERMISSION_ACTIONS.map((action) => ({
    id: `${resource}.${action}`,
    resource,
    action,
    name: `${resource}.${action}`,
    description: `Izin untuk ${ACTION_LABELS_ID[action].toLowerCase()} data pada modul ${resource}`,
  }))
)

// ------------------------------------------------------------------------------
// 2. DEFAULT SYSTEM ROLES & PRESETS
// ------------------------------------------------------------------------------

export const DEFAULT_ROLES: RoleEntity[] = [
  {
    id: 'role-superadmin',
    name: 'Superadmin',
    description: 'Akses penuh dan global ke seluruh modul dan seluruh organisasi sistem.',
    status: 'active',
    is_system: true,
    permissions: PERMISSION_CATALOG.map((p) => p.id), // All 144 permissions
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-admin-org',
    name: 'Admin Organisasi',
    description: 'Mengelola operasional lengkap dalam organisasi yang ditugaskan.',
    status: 'active',
    is_system: true,
    permissions: [
      'Structure.viewAny', 'Structure.view', 'Structure.create', 'Structure.update',
      'Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete',
      'Agenda.viewAny', 'Agenda.view', 'Agenda.create', 'Agenda.update', 'Agenda.delete',
      'Performance.viewAny', 'Performance.view', 'Performance.create', 'Performance.update',
      'Finance.viewAny', 'Finance.view', 'Finance.create', 'Finance.update',
      'Report.viewAny', 'Report.view', 'Report.create', 'Report.update',
      'Task.viewAny', 'Task.view', 'Task.create', 'Task.update', 'Task.delete',
      'Document.viewAny', 'Document.view', 'Document.create', 'Document.delete',
    ],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-ketua',
    name: 'Ketua',
    description: 'Pimpinan organisasi: memonitor target, verifikasi laporan, dan persetujuan program.',
    status: 'active',
    is_system: true,
    permissions: [
      'Structure.viewAny', 'Structure.view',
      'Program.viewAny', 'Program.view', 'Program.update',
      'Agenda.viewAny', 'Agenda.view',
      'Performance.viewAny', 'Performance.view',
      'Finance.viewAny', 'Finance.view',
      'Report.viewAny', 'Report.view', 'Report.update',
      'Task.viewAny', 'Task.view', 'Task.create', 'Task.update',
      'Document.viewAny', 'Document.view',
    ],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-seksi',
    name: 'Seksi',
    description: 'Koordinator seksi/divisi pelaksana program kerja dan agenda.',
    status: 'active',
    is_system: true,
    permissions: [
      'Structure.viewAny', 'Structure.view',
      'Program.viewAny', 'Program.view', 'Program.create', 'Program.update',
      'Agenda.viewAny', 'Agenda.view', 'Agenda.create', 'Agenda.update',
      'Performance.viewAny', 'Performance.view', 'Performance.create', 'Performance.update',
      'Finance.viewAny', 'Finance.view', 'Finance.create',
      'Report.viewAny', 'Report.view', 'Report.create', 'Report.update',
      'Task.viewAny', 'Task.view', 'Task.update',
      'Document.viewAny', 'Document.view', 'Document.create',
    ],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-personel',
    name: 'Personel',
    description: 'Anggota pelaksana teknis yang mengerjakan tugas dan agenda.',
    status: 'active',
    is_system: true,
    permissions: [
      'Structure.viewAny', 'Structure.view',
      'Program.viewAny', 'Program.view',
      'Agenda.viewAny', 'Agenda.view',
      'Performance.viewAny', 'Performance.view',
      'Task.viewAny', 'Task.view', 'Task.update',
      'Document.viewAny', 'Document.view',
    ],
    created_at: '2026-01-01T00:00:00Z',
  },
]

// ------------------------------------------------------------------------------
// 3. CORE AUTHORIZATION POLICY ENFORCEMENT
// ------------------------------------------------------------------------------

/**
 * Memeriksa apakah user memiliki permission tertentu (resource + action).
 * Superadmin selalu memiliki izin penuh.
 */
export function hasPermission(
  user: User | null | undefined,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  if (!user || user.status !== 'active') return false

  // Superadmin has absolute global access
  if (user.is_superadmin || user.role === 'superadmin') return true

  const membership = user.active_membership
  if (!membership || membership.status !== 'active') return false

  const permissionKey = `${resource}.${action}`

  // Check direct permission overrides first (if any)
  if (membership.permission_overrides && membership.permission_overrides.length > 0) {
    if (membership.permission_overrides.includes(`-${permissionKey}`)) return false
    if (membership.permission_overrides.includes(permissionKey)) return true
  }

  // Check role permissions
  const role = membership.role
  if (!role || role.status !== 'active') return false

  return role.permissions.includes(permissionKey)
}

/**
 * Memeriksa apakah user berhak mengakses resource dalam organisasi target (Organization Scope).
 * - Superadmin dapat mengakses seluruh organisasi secara global.
 * - Mode 'own' (default): Hanya mengizinkan unit aktif organisasi user.
 * - Mode 'descendants': Mengizinkan unit aktif user + seluruh organisasi turunan (descendants) di bawahnya.
 * - Sibling (saudara paralel) dan Ancestor/Parent tidak pernah otomatis diizinkan.
 */
export function enforceScope(
  user: User | null | undefined,
  targetOrganizationId?: string | null,
  mode: OrganizationScopeMode = 'own',
  organizations: Organization[] = []
): boolean {
  if (!user || user.status !== 'active') return false
  if (user.is_superadmin || user.role === 'superadmin') return true

  // Jika resource tidak memiliki org id (global), hanya superadmin yang dapat mengakses
  if (!targetOrganizationId) return false

  const membership = user.active_membership
  if (!membership || membership.status !== 'active') return false

  const userOrgId = membership.organization_id

  // 1. Own Scope: Selalu sah jika target identik dengan organisasi keanggotaan aktif
  if (userOrgId === targetOrganizationId) return true

  // 2. Descendants Scope: Hanya jika mode 'descendants' diizinkan dan target adalah turunan sah
  if (mode === 'descendants' && organizations.length > 0) {
    const isTargetDescendant = isDescendant(targetOrganizationId, userOrgId, organizations)
    if (isTargetDescendant) {
      return true
    }
  }

  return false
}

/**
 * Memeriksa kedua gerbang keamanan sekaligus (Check 1: Permission, Check 2: Hierarchical Organization Scope).
 */
export function authorize(
  user: User | null | undefined,
  resource: PermissionResource,
  action: PermissionAction,
  targetOrganizationId?: string | null,
  mode: OrganizationScopeMode = 'own',
  organizations: Organization[] = []
): boolean {
  // Check 1: Permission
  const hasPerm = hasPermission(user, resource, action)
  if (!hasPerm) return false

  // Check 2: Hierarchical Scope
  const inScope = enforceScope(user, targetOrganizationId, mode, organizations)
  if (!inScope) return false

  return true
}

/**
 * Memeriksa apakah user berhak mengaktifkan mode agregasi turunan (descendants).
 * Hanya dizinkan jika:
 * 1. User berstatus aktif
 * 2. Superadmin ATAU memiliki role/permission pimpinan/admin/view:descendants
 * 3. Organisasi saat ini memiliki setidaknya satu sub-unit (bukan leaf node)
 */
export function canViewDescendants(
  user: User | null | undefined,
  currentOrganization: Organization | null | undefined,
  organizations: Organization[] = []
): boolean {
  if (!user || user.status !== 'active') return false
  if (user.is_superadmin || user.role === 'superadmin') return true

  if (currentOrganization) {
    const descendants = getDescendantOrganizationIds(currentOrganization.id, organizations, true)
    if (descendants.length === 0) return false
  }

  const role = user.active_membership?.role
  const roleId = role?.id?.toLowerCase() || ''
  if (['superadmin', 'admin', 'pimpinan', 'ketua', 'direktur'].some((r) => roleId.includes(r))) {
    return true
  }

  const permissions = role?.permissions || []
  return (
    permissions.includes('view:descendants') ||
    permissions.includes('Organization.viewAny') ||
    permissions.includes('all')
  )
}

// ------------------------------------------------------------------------------

// 4. WORKFLOW STATUS STATE TRANSITION ENFORCEMENT
// ------------------------------------------------------------------------------

export function canTransitionProgramStatus(
  current: ProgramStatus,
  next: ProgramStatus
): boolean {
  if (current === next) return true

  const validTransitions: Record<ProgramStatus, ProgramStatus[]> = {
    draft: ['submitted'],
    submitted: ['approved', 'revised'],
    revised: ['submitted'],
    approved: ['active'],
    active: ['completed'],
    completed: ['closed'],
    closed: [],
  }

  return validTransitions[current]?.includes(next) ?? false
}

export function canTransitionAgendaStatus(
  current: AgendaStatus,
  next: AgendaStatus
): boolean {
  if (current === next) return true

  const validTransitions: Record<AgendaStatus, AgendaStatus[]> = {
    planned: ['approved'],
    approved: ['upcoming'],
    upcoming: ['in_progress'],
    in_progress: ['completed'],
    completed: ['evaluated'],
    evaluated: [],
  }

  return validTransitions[current]?.includes(next) ?? false
}

export function canTransitionReportStatus(
  current: ReportStatus,
  next: ReportStatus
): boolean {
  if (current === next) return true

  const validTransitions: Record<ReportStatus, ReportStatus[]> = {
    draft: ['submitted'],
    submitted: ['in_review'],
    in_review: ['approved', 'revised'],
    revised: ['submitted'],
    approved: ['archived'],
    archived: [],
  }

  return validTransitions[current]?.includes(next) ?? false
}

// ------------------------------------------------------------------------------
// 5. DOWNWARD ASSIGNMENT AUTHORIZATION (Stage 6)
// ------------------------------------------------------------------------------

/**
 * Determines whether `sourceOrganizationId` is authorized to assign a Program
 * or Task to `targetOrganizationId` under the hierarchical downward-control rule.
 *
 * Rules:
 *   CASE A — source === target (self-assignment)  → PASS
 *   CASE B — target is a direct child of source   → PASS
 *   CASE C — target is a deep descendant           → PASS
 *   CASE D — target is a parent of source          → DENY
 *   CASE E — target is a sibling of source         → DENY
 *   CASE F — target is in an unrelated branch      → DENY
 *   CASE G — superadmin user                       → PASS (any valid target)
 *
 * @param sourceOrganizationId  The acting/assigning organization.
 * @param targetOrganizationId  The receiving/delegated organization.
 * @param organizations         Full flat list of all organizations (for tree traversal).
 * @param user                  Optional user context — grants PASS for superadmin.
 */
export function canAssignToOrganization(
  sourceOrganizationId: string,
  targetOrganizationId: string,
  organizations: Organization[],
  user?: User | null
): boolean {
  // Superadmin bypasses all hierarchy constraints
  if (user && (user.is_superadmin || user.role === 'superadmin')) return true

  // Guard: Both IDs must be non-empty
  if (!sourceOrganizationId || !targetOrganizationId) return false

  // CASE A: Self-assignment always allowed
  if (sourceOrganizationId === targetOrganizationId) return true

  // CASE B & C: Target must be a descendant of source
  return isDescendant(targetOrganizationId, sourceOrganizationId, organizations)
}

/**
 * Validates assignment and throws if the assignment is not authorized.
 * Use this inside service layer (dataService) to enforce server-side rules.
 */
export function assertCanAssignToOrganization(
  sourceOrganizationId: string,
  targetOrganizationId: string,
  organizations: Organization[],
  user?: User | null
): void {
  if (!canAssignToOrganization(sourceOrganizationId, targetOrganizationId, organizations, user)) {
    throw new Error(
      `Akses ditolak: Unit [${sourceOrganizationId}] tidak berwenang menugaskan ke unit [${targetOrganizationId}]. ` +
      'Penugasan hanya diizinkan ke unit diri sendiri atau turunan yang sah.'
    )
  }
}

export function canTransitionTaskStatus(
  current: TaskStatus,
  next: TaskStatus
): boolean {
  if (current === next) return true

  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    new: ['in_progress'],
    in_progress: ['pending_verification'],
    pending_verification: ['completed', 'revised'],
    revised: ['in_progress'],
    completed: [],
  }

  return validTransitions[current]?.includes(next) ?? false
}
