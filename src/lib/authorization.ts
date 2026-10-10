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
  Program,
  ProgramStatus,
  ProgramDurationType,
  ReportStatus,
  AgendaStatus,
  TaskStatus,
} from '@/types/database'
import { isAncestor, isDescendant, getDescendantOrganizationIds, getPesantrenEchelonLevel } from './hierarchyService'


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

export const ALL_PAGE_KEYS = ['Dashboard', 'Shield', 'Profile', 'Settings', 'ExportReport'] as const
export type PageKey = typeof ALL_PAGE_KEYS[number]

export const ALL_WIDGET_KEYS = ['StatsOverview', 'BudgetChart', 'UpcomingAgendas', 'KpiProgress', 'LatestAuditLogs'] as const
export type WidgetKey = typeof ALL_WIDGET_KEYS[number]

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
    permissions: [
      ...PERMISSION_CATALOG.map((p) => p.id),
      ...ALL_PAGE_KEYS.map((k) => `Page.${k}`),
      ...ALL_WIDGET_KEYS.map((k) => `Widget.${k}`),
    ],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-admin-org',
    name: 'Admin Organisasi',
    description: 'Mengelola operasional lengkap dalam organisasi yang ditugaskan.',
    status: 'active',
    is_system: true,
    permissions: [
      'Organization.view', 'Organization.update',
      'Admin.viewAny', 'Admin.view', 'Admin.create', 'Admin.update',
      'Role.viewAny', 'Role.view',
      'Structure.viewAny', 'Structure.view', 'Structure.create', 'Structure.update',
      'Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete',
      'Agenda.viewAny', 'Agenda.view', 'Agenda.create', 'Agenda.update', 'Agenda.delete',
      'Performance.viewAny', 'Performance.view', 'Performance.create', 'Performance.update',
      'Finance.viewAny', 'Finance.view', 'Finance.create', 'Finance.update',
      'Report.viewAny', 'Report.view', 'Report.create', 'Report.update',
      'Task.viewAny', 'Task.view', 'Task.create', 'Task.update', 'Task.delete',
      'Document.viewAny', 'Document.view', 'Document.create', 'Document.delete',
      'Audit.viewAny', 'Audit.view',
      'Page.Dashboard', 'Page.Profile', 'Page.Settings', 'Page.ExportReport',
      'Widget.StatsOverview', 'Widget.BudgetChart', 'Widget.UpcomingAgendas', 'Widget.KpiProgress', 'Widget.LatestAuditLogs',
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
      'Organization.view',
      'Structure.viewAny', 'Structure.view',
      'Program.viewAny', 'Program.view', 'Program.update',
      'Agenda.viewAny', 'Agenda.view',
      'Performance.viewAny', 'Performance.view',
      'Finance.viewAny', 'Finance.view',
      'Report.viewAny', 'Report.view', 'Report.update',
      'Task.viewAny', 'Task.view', 'Task.create', 'Task.update',
      'Document.viewAny', 'Document.view',
      'Page.Dashboard', 'Page.Profile', 'Page.ExportReport',
      'Widget.StatsOverview', 'Widget.BudgetChart', 'Widget.UpcomingAgendas', 'Widget.KpiProgress',
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
      'Page.Dashboard', 'Page.Profile',
      'Widget.StatsOverview', 'Widget.UpcomingAgendas', 'Widget.KpiProgress',
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
      'Page.Dashboard', 'Page.Profile',
      'Widget.StatsOverview', 'Widget.UpcomingAgendas',
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
 * Memeriksa apakah user memiliki izin untuk menampilkan atau mengakses Widget tertentu.
 * Superadmin selalu memiliki akses penuh ke seluruh widget.
 */
export function hasWidgetAccess(
  user: User | null | undefined,
  widgetKey: string
): boolean {
  if (!user || user.status !== 'active') return false
  if (user.is_superadmin || user.role === 'superadmin') return true

  const membership = user.active_membership
  if (!membership || membership.status !== 'active') return false

  const permKey = `Widget.${widgetKey}`

  if (membership.permission_overrides && membership.permission_overrides.length > 0) {
    if (membership.permission_overrides.includes(`-${permKey}`)) return false
    if (membership.permission_overrides.includes(permKey)) return true
  }

  const role = membership.role
  if (!role || role.status !== 'active') return false

  return (
    role.permissions.includes(permKey) ||
    role.permissions.includes('Widget.*') ||
    role.permissions.includes('*')
  )
}

/**
 * Memeriksa apakah user memiliki izin untuk menampilkan atau mengakses Page tertentu.
 * Superadmin selalu memiliki akses penuh ke seluruh halaman.
 */
export function hasPageAccess(
  user: User | null | undefined,
  pageKey: string
): boolean {
  if (!user || user.status !== 'active') return false
  if (user.is_superadmin || user.role === 'superadmin') return true

  const membership = user.active_membership
  if (!membership || membership.status !== 'active') return false

  const permKey = `Page.${pageKey}`

  if (membership.permission_overrides && membership.permission_overrides.length > 0) {
    if (membership.permission_overrides.includes(`-${permKey}`)) return false
    if (membership.permission_overrides.includes(permKey)) return true
  }

  const role = membership.role
  if (!role || role.status !== 'active') return false

  return (
    role.permissions.includes(permKey) ||
    role.permissions.includes('Page.*') ||
    role.permissions.includes('*')
  )
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
  next: ProgramStatus,
  durationType?: ProgramDurationType
): boolean {
  if (current === next) return true

  // For routine programs: cannot be completed; active goes directly to closed ('Tutup Program')
  if (durationType === 'rutin') {
    if (current === 'active' && next === 'completed') {
      return false
    }
    if (current === 'active' && next === 'closed') {
      return true
    }
  }

  const validTransitions: Record<ProgramStatus, ProgramStatus[]> = {
    draft: ['submitted'],
    submitted: ['approved', 'revised'],
    revised: ['submitted'],
    approved: ['active'],
    active: ['completed', 'closed'],
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
    submitted: ['in_review', 'approved', 'revised'],
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

// ------------------------------------------------------------------------------
// 6. HIERARCHICAL APPROVAL AUTHORIZATION (Stage 4)
// ------------------------------------------------------------------------------

/**
 * Memeriksa apakah user berwenang menyetujui program kerja (Stage 4: Hierarchical Approval).
 *
 * Aturan Bisnis Final:
 * 1. Target program harus ada, berstatus 'submitted', dan memiliki organization_id yang valid.
 * 2. Akun approver harus ada dan berstatus 'active'.
 * 3. Superadmin memiliki wewenang approval global sesuai policy RBAC.
 * 4. Non-superadmin wajib memiliki keanggotaan aktif (active_membership).
 * 5. SELF-APPROVAL DILARANG KERAS: Unit pemilik/pembuat tidak boleh menyetujui programnya sendiri.
 *    (Bahkan Kepala Pengurus tidak dapat self-approve program unitnya sendiri).
 * 6. User wajib memiliki technical permission untuk memperbarui/menyetujui program ('Program.update').
 * 7. Organisasi approver WAJIB merupakan atasan (ancestor) sah dari organisasi pemilik program.
 *    - Sibling (saudara paralel) -> DENIED
 *    - Unrelated branch (cabang berbeda) -> DENIED
 *    - Descendant / child mencoba approve parent -> DENIED
 */
export function canApproveProgram(
  user: User | null | undefined,
  program: Program | null | undefined,
  organizations: Organization[] = []
): boolean {
  if (!program || !program.id || !program.organization_id) {
    return false
  }

  // Program hanya dapat disetujui jika dalam status 'submitted'
  if (program.status !== 'submitted') {
    return false
  }

  if (!user || user.status !== 'active') {
    return false
  }

  // Superadmin global access policy
  if (user.is_superadmin || user.role === 'superadmin') {
    return true
  }

  const membership = user.active_membership
  if (!membership || membership.status !== 'active' || !membership.organization_id) {
    return false
  }

  const approverOrgId = membership.organization_id
  const targetOrgId = program.organization_id

  // SELF APPROVAL PROHIBITION: Approver unit cannot be the same as program owner unit
  if (approverOrgId === targetOrgId) {
    return false
  }

  // Technical permission check (must have permission to update/approve Program)
  if (!hasPermission(user, 'Program', 'update')) {
    return false
  }

  // Ancestor check: Approver organization must be an ancestor of program owner organization
  return isAncestor(approverOrgId, targetOrgId, organizations)
}

/**
 * Memvalidasi wewenang approval dan melempar Error jika user/unit tidak berwenang.
 * Berfungsi sebagai Final Security Gate di service/data layer (dataService).
 */
export function assertCanApproveProgram(
  user: User | null | undefined,
  program: Program | null | undefined,
  organizations: Organization[] = []
): void {
  if (!program || !program.id || !program.organization_id) {
    throw new Error('Akses ditolak: Program kerja tidak valid atau tidak memiliki unit organisasi pemilik.')
  }

  if (program.status !== 'submitted') {
    throw new Error(
      `Akses ditolak: Program dengan status [${program.status}] tidak dapat disetujui. Hanya program berstatus [submitted] yang dapat disetujui.`
    )
  }

  if (!user || user.status !== 'active') {
    throw new Error('Akses ditolak: Akun pengguna tidak aktif atau tidak ditemukan.')
  }

  // Superadmin global access
  if (user.is_superadmin || user.role === 'superadmin') {
    return
  }

  const membership = user.active_membership
  if (!membership || membership.status !== 'active' || !membership.organization_id) {
    throw new Error('Akses ditolak: Pengguna tidak memiliki keanggotaan organisasi yang aktif.')
  }

  const approverOrgId = membership.organization_id
  const targetOrgId = program.organization_id

  // SELF-APPROVAL WAJIB DITOLAK
  if (approverOrgId === targetOrgId) {
    throw new Error(
      'Akses ditolak: Unit pemilik tidak diizinkan menyetujui programnya sendiri (Self-Approval dilarang). Persetujuan harus dilakukan oleh superior dalam rantai hierarki (ancestor).'
    )
  }

  // Permission check
  if (!hasPermission(user, 'Program', 'update')) {
    throw new Error('Akses ditolak: Anda tidak memiliki wewenang/permission teknis untuk menyetujui program kerja.')
  }

  // Hierarchical ancestor check
  if (!isAncestor(approverOrgId, targetOrgId, organizations)) {
    throw new Error(
      `Akses ditolak: Unit [${approverOrgId}] bukan merupakan atasan (ancestor) sah dari unit pemilik program [${targetOrgId}]. Sibling, cabang berbeda, atau turunan tidak berhak melakukan persetujuan.`
    )
  }
}

// ------------------------------------------------------------------------------
// 7. ACCOUNT UNIT & PERSON HOLDER HANDOVER AUTHORIZATION (Stage 5)
// ------------------------------------------------------------------------------

/**
 * Memeriksa apakah seorang aktor user berwenang melakukan serah terima pemegang akun (handover)
 * terhadap Account Unit pada organisasi target.
 *
 * Aturan Bisnis Final:
 * 1. Superadmin memiliki wewenang global untuk mengelola handover seluruh Account Unit.
 * 2. Non-superadmin:
 *    - Akun harus aktif dan memiliki active_membership yang aktif.
 *    - Harus memiliki technical permission untuk memperbarui akun ('Admin.update').
 *    - DILARANG self-handover: Account Unit tidak boleh menentukan sendiri pemegang baru.
 *      Atasan (superior) yang menentukan/mengelola pergantian pemegang akun subordinate.
 *    - DILARANG sibling: Unit tidak boleh melakukan handover akun milik unit paralel (saudara).
 *    - DILARANG child/descendant: Unit tidak boleh melakukan handover akun milik atasan (parent/ancestor).
 *    - DILARANG unrelated branch: Unit dari cabang berbeda tidak berhak.
 *    - Unit approver/aktor WAJIB merupakan atasan (ancestor) sah dari unit pemilik akun target.
 */
export function canManageAccountHandover(
  actorUser: User | null | undefined,
  targetAccountId: string,
  targetOrganizationId: string,
  organizations: Organization[] = []
): boolean {
  if (!actorUser || actorUser.status !== 'active') return false
  if (!targetAccountId || !targetOrganizationId) return false

  // Superadmin bypasses all hierarchy constraints
  if (actorUser.is_superadmin || actorUser.role === 'superadmin') return true

  const membership = actorUser.active_membership
  if (!membership || membership.status !== 'active' || !membership.organization_id) return false

  // Technical permission check (must have permission to update Admin accounts)
  if (!hasPermission(actorUser, 'Admin', 'update')) return false

  const actorOrgId = membership.organization_id

  // SELF-HANDOVER PROHIBITED: Unit cannot self-handover its own holder; superior decides
  if (actorOrgId === targetOrganizationId) return false

  // MUST BE ANCESTOR: Actor organization must be in the superior chain above target
  return isAncestor(actorOrgId, targetOrganizationId, organizations)
}

/**
 * Memvalidasi wewenang handover dan melempar Error jika user/unit tidak berwenang.
 * Berfungsi sebagai Final Security Gate di service/data layer (dataService.handoverAccountHolder).
 */
export function assertCanManageAccountHandover(
  actorUser: User | null | undefined,
  targetAccountId: string,
  targetOrganizationId: string,
  organizations: Organization[] = []
): void {
  if (!actorUser || actorUser.status !== 'active') {
    throw new Error('Akses ditolak: Akun pengguna tidak aktif atau tidak ditemukan.')
  }
  if (!targetAccountId || !targetOrganizationId) {
    throw new Error('Akses ditolak: ID akun atau ID organisasi target tidak valid.')
  }

  if (actorUser.is_superadmin || actorUser.role === 'superadmin') {
    return
  }

  const membership = actorUser.active_membership
  if (!membership || membership.status !== 'active' || !membership.organization_id) {
    throw new Error('Akses ditolak: Pengguna tidak memiliki keanggotaan organisasi yang aktif.')
  }

  if (!hasPermission(actorUser, 'Admin', 'update')) {
    throw new Error('Akses ditolak: Anda tidak memiliki wewenang/permission teknis untuk mengelola akun (Admin.update).')
  }

  const actorOrgId = membership.organization_id

  if (actorOrgId === targetOrganizationId) {
    throw new Error(
      'Akses ditolak: Account Unit tidak diizinkan menentukan sendiri pemegang baru (Self-Handover dilarang). Pergantian pemegang akun harus dilakukan oleh superior dalam garis hierarki.'
    )
  }

  if (!isAncestor(actorOrgId, targetOrganizationId, organizations)) {
    throw new Error(
      `Akses ditolak: Unit [${actorOrgId}] bukan merupakan atasan (ancestor) sah dari unit [${targetOrganizationId}]. Sibling, cabang berbeda, atau turunan tidak berhak melakukan serah terima pemegang akun.`
    )
  }
}

// ------------------------------------------------------------------------------
// 8. HIERARCHICAL STRUCTURE CREATE AUTHORIZATION (Stage 8)
// ------------------------------------------------------------------------------

const VALID_PARENT_CHILD_UNIT_TYPES: Record<string, string[]> = {
  kepala_pengurus: ['waka', 'seksi', 'organisasi', 'lembaga', 'kelompok', 'unit'],
  pimpinan: ['waka', 'lembaga', 'kelompok', 'unit', 'seksi', 'organisasi'],
  waka: ['seksi', 'organisasi', 'lembaga', 'kelompok', 'unit'],
  seksi: ['organisasi', 'kelompok', 'unit'],
  organisasi: ['organisasi', 'unit', 'kelompok'],
  lembaga: ['kelompok', 'unit', 'seksi', 'organisasi'],
  kelompok: ['unit', 'organisasi', 'kelompok'],
  unit: ['unit', 'organisasi', 'kelompok'],
}

const KETUA_PENGURUS_UNIT_TYPES: string[] = ['kepala_pengurus', 'pimpinan']

/**
 * Determines whether a user is authorized to create a new Organization hierarchy node.
 *
 * Rules:
 * 1. Superadmin → PASS (global override).
 * 2. User must be active with an active membership.
 * 3. User must hold Organization.create permission.
 * 4. The user's active organization must be echelon-0 (kepala_pengurus / pimpinan).
 *    WAKA, SEKSI, ORGANISASI, and all legacy aliases → DENIED.
 * 5. If parentUnitType is provided, childUnitType must form a valid canonical pair.
 */
export function canCreateOrganizationStructure(
  user: User | null | undefined,
  childUnitType?: string | null,
  parentUnitType?: string | null,
  organizations: Organization[] = []
): boolean {
  if (!user || user.status !== 'active') return false
  if (user.is_superadmin || user.role === 'superadmin') return true

  const membership = user.active_membership
  if (!membership || membership.status !== 'active' || !membership.organization_id) return false
  if (!hasPermission(user, 'Organization', 'create')) return false

  const callerOrg = organizations.find((o) => o.id === membership.organization_id)
  const callerUnitType = (callerOrg?.unit_type || 'unit').toLowerCase()
  const callerEchelon = getPesantrenEchelonLevel(callerUnitType)

  if (callerEchelon !== 0 && !KETUA_PENGURUS_UNIT_TYPES.includes(callerUnitType)) {
    return false
  }

  if (childUnitType && parentUnitType !== undefined) {
    if (parentUnitType === null) {
      if (!KETUA_PENGURUS_UNIT_TYPES.includes(childUnitType.toLowerCase())) return false
    } else {
      const allowed = VALID_PARENT_CHILD_UNIT_TYPES[parentUnitType.toLowerCase()] || []
      if (!allowed.includes(childUnitType.toLowerCase())) return false
    }
  }

  return true
}

/**
 * Validates structural create authority and throws a descriptive Error if denied.
 * Must be called inside dataService.createOrganization before inserting.
 */
export function assertCanCreateOrganizationStructure(
  user: User | null | undefined,
  childUnitType?: string | null,
  parentUnitType?: string | null,
  organizations: Organization[] = []
): void {
  if (!user || user.status !== 'active') {
    throw new Error('Akses ditolak: Akun pengguna tidak aktif atau tidak ditemukan.')
  }
  if (user.is_superadmin || user.role === 'superadmin') return

  const membership = user.active_membership
  if (!membership || membership.status !== 'active' || !membership.organization_id) {
    throw new Error('Akses ditolak: Pengguna tidak memiliki keanggotaan organisasi yang aktif.')
  }

  if (!hasPermission(user, 'Organization', 'create')) {
    throw new Error('Akses ditolak: Anda tidak memiliki izin [Organization.create] untuk membuat unit organisasi baru.')
  }

  const callerOrg = organizations.find((o) => o.id === membership.organization_id)
  const callerUnitType = (callerOrg?.unit_type || 'unit').toLowerCase()
  const callerEchelon = getPesantrenEchelonLevel(callerUnitType)

  if (callerEchelon !== 0 && !KETUA_PENGURUS_UNIT_TYPES.includes(callerUnitType)) {
    throw new Error(
      `Akses ditolak: Hanya unit Ketua Pengurus yang berwenang membuat unit organisasi baru dalam hierarki. ` +
      `Unit aktif Anda [${callerOrg?.name || membership.organization_id}] bertipe [${callerUnitType}] ` +
      `dan tidak memiliki hak untuk menambahkan unit hierarki baru.`
    )
  }

  if (childUnitType && parentUnitType !== undefined) {
    if (parentUnitType === null) {
      if (!KETUA_PENGURUS_UNIT_TYPES.includes(childUnitType.toLowerCase())) {
        throw new Error(
          `Akses ditolak: Unit root (tanpa induk) hanya boleh bertipe [kepala_pengurus] atau [pimpinan], bukan [${childUnitType}].`
        )
      }
    } else {
      const allowed = VALID_PARENT_CHILD_UNIT_TYPES[parentUnitType.toLowerCase()] || []
      if (!allowed.includes(childUnitType.toLowerCase())) {
        throw new Error(
          `Akses ditolak: Kombinasi hierarki tidak valid — unit bertipe [${parentUnitType}] tidak dapat memiliki anak bertipe [${childUnitType}].`
        )
      }
    }
  }
}
