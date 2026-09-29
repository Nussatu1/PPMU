// ==============================================================================
// FILAMENT ECOSYSTEM - RBAC & AUTHORIZATION POLICY ENGINE
// Strict Permission Verification & Multi-Organization Scope Guard
// ==============================================================================

import type {
  User,
  PermissionAction,
  PermissionResource,
  PermissionItem,
  RoleEntity,
  ProgramStatus,
  ReportStatus,
  AgendaStatus,
  TaskStatus,
} from '@/types/database'

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
 * Superadmin dapat mengakses seluruh organisasi.
 * Admin organisasi hanya dapat mengakses organisasi yang menjadi membership aktifnya.
 */
export function enforceScope(
  user: User | null | undefined,
  targetOrganizationId?: string | null
): boolean {
  if (!user || user.status !== 'active') return false
  if (user.is_superadmin || user.role === 'superadmin') return true

  // If resource has no org id (global), only superadmin can access
  if (!targetOrganizationId) return false

  const membership = user.active_membership
  if (!membership || membership.status !== 'active') return false

  return membership.organization_id === targetOrganizationId
}

/**
 * Memeriksa kedua gerbang keamanan sekaligus (Check 1: Permission, Check 2: Organization Scope).
 */
export function authorize(
  user: User | null | undefined,
  resource: PermissionResource,
  action: PermissionAction,
  targetOrganizationId?: string | null
): boolean {
  // Check 1: Permission
  const hasPerm = hasPermission(user, resource, action)
  if (!hasPerm) return false

  // Check 2: Scope
  const inScope = enforceScope(user, targetOrganizationId)
  if (!inScope) return false

  return true
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
