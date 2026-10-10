import { supabase, isSupabaseConfigured } from './supabase'
import {
  initialUsers,
  initialRoles,
} from './mockData'
import type {
  User,
  Category,
  Brand,
  Product,
  Customer,
  Order,
  Payment,
  Comment,
  Address,
  Addressable,
  CategoryProduct,
  Organization,
  OrganizationPeriod,
  OrganizationMembership,
  RoleEntity,
  Structure,
  Section,
  Personnel,
  Person,
  AccountHolderHistory,
  HandoverAccountHolderParams,
  Program,
  Agenda,
  Performance,
  Budget,
  Transaction,
  Report,
  Task,
  Notification,
  AuditLog,
  PermissionAction,
  PermissionResource,
  ProgramStatus,
  AgendaStatus,
  ReportStatus,
  TaskStatus,
  OrganizationScopeInput,
  OrganizationScopeMode,
} from '@/types/database'
import {
  authorize,
  enforceScope,
  canTransitionProgramStatus,
  canTransitionAgendaStatus,
  canTransitionReportStatus,
  canTransitionTaskStatus,
  assertCanAssignToOrganization,
  assertCanApproveProgram,
  assertCanManageAccountHandover,
  assertCanCreateOrganizationStructure,
} from './authorization'

import {
  getParentOrganization,
  getChildrenOrganizations,
  getDescendantOrganizationIds,
  getAncestorOrganizationIds,
  isAncestor,
  isDescendant,
  getOrganizationTree,
  resolveOrganizationScope,
  type OrganizationTreeNode,
} from './hierarchyService'
import { generateUUID } from './uuid'

// ==============================================================================
// STAGE 9: LOCAL DEMO DATABASE PERSISTENCE & ACCOUNT ISOLATION LAYER
// ==============================================================================

const DEMO_STORAGE_PREFIX = 'filament_demo_v3'
const LEGACY_STORAGE_PREFIX = 'filament_bakid_v2'

// In-memory account cache: accountId -> collection -> data array
const accountCache = new Map<string, Map<string, any>>()

// Fallback storage when localStorage is unavailable (e.g. Node CLI testing)
const nodeStorageFallback = new Map<string, string>()
const nodeSessionStorageFallback = new Map<string, string>()

function getRawStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
    return nodeStorageFallback.get(key) || null
  } catch {
    return nodeStorageFallback.get(key) || null
  }
}

function setRawStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
    }
    nodeStorageFallback.set(key, value)
  } catch {
    nodeStorageFallback.set(key, value)
  }
}

function removeRawStorageItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key)
    }
    nodeStorageFallback.delete(key)
  } catch {}
}

function getRawSessionStorageItem(key: string): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(key)
    }
    return nodeSessionStorageFallback.get(key) || null
  } catch {
    return nodeSessionStorageFallback.get(key) || null
  }
}



// Structural / hierarchy collections: shared across ALL accounts.
// These must be readable by any user regardless of which account wrote them.
const SHARED_STRUCTURAL_COLLECTIONS = new Set([
  'organizations',
  'memberships',
  'periods',
  'structures',
  'sections',
  'personnels',
  'roles',
  'users',
  'persons',
  'account_holder_histories',
])

// Operational collections: centralized in shared operational store (indexed by organization_id).
const SHARED_OPERATIONAL_COLLECTIONS = new Set([
  'programs',
  'agendas',
  'performances',
  'budgets',
  'transactions',
  'reports',
  'tasks',
  'notifications',
  'audit_logs',
])

const ALL_SHARED_COLLECTIONS = new Set([
  ...SHARED_STRUCTURAL_COLLECTIONS,
  ...SHARED_OPERATIONAL_COLLECTIONS,
])

// BroadcastChannel for cross-tab shared data sync
let _structuralChannel: BroadcastChannel | null = null
function getStructuralChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!_structuralChannel) {
    _structuralChannel = new BroadcastChannel('filament_structural_sync')
  }
  return _structuralChannel
}

function broadcastStructuralChange(collection: string): void {
  try {
    getStructuralChannel()?.postMessage({ type: 'structural_change', collection })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('filament_data_changed', { detail: { collection } }))
    }
  } catch {}
}

export interface QuarantineReportItem {
  id: string
  collection: string
  source_key: string
  item_id: string
  user_id: string
  reason: string
  quarantined_at: string
}

// One-time migration: merge per-account structural data into shared store.
// Reads known per-account keys and merges into the shared key.
// NEVER deletes old data — old keys remain as backup.
function migrateStructuralToShared(): void {
  const SUPERADMIN_ID = '00000000-0000-0000-0000-000000000001'
  try {
    if (typeof localStorage === 'undefined') return
    // Collect all account IDs present in localStorage
    const accountIds = new Set<string>([SUPERADMIN_ID])
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      // Key pattern: filament_demo_v3_<uuid>_<collection>
      const m = k.match(/^filament_demo_v3_([0-9a-f-]{36})_(.+)$/)
      if (m) accountIds.add(m[1])
    }

    for (const col of SHARED_STRUCTURAL_COLLECTIONS) {
      const sharedKey = `${DEMO_STORAGE_PREFIX}_shared_${col}`
      // Load existing shared data (may already have been partially migrated)
      let sharedData: any[] = []
      const existingShared = getRawStorageItem(sharedKey)
      if (existingShared) {
        try { sharedData = JSON.parse(existingShared) ?? [] } catch {}
      }
      const sharedIds = new Set(sharedData.map((item: any) => item?.id).filter(Boolean))
      let changed = false

      for (const accountId of accountIds) {
        const accountKey = `${DEMO_STORAGE_PREFIX}_${accountId}_${col}`
        const raw = getRawStorageItem(accountKey)
        if (!raw) continue
        let accountData: any[] = []
        try { accountData = JSON.parse(raw) ?? [] } catch { continue }
        for (const item of accountData) {
          if (item?.id && !sharedIds.has(item.id)) {
            sharedData.push(item)
            sharedIds.add(item.id)
            changed = true
          }
        }
      }

      if (changed || !existingShared) {
        setRawStorageItem(sharedKey, JSON.stringify(sharedData))
      }
    }
  } catch (e) {
    console.warn('[dataService] Structural migration warning:', e)
  }
}

// Stage 3: Centralized Non-Destructive Operational Storage Migration
// Migrates legacy per-account operational data (programs, agendas, tasks, etc.)
// into centralized shared store indexed by organization_id.
// Any record whose organization_id cannot be resolved is placed into quarantine.
function migrateOperationalToSharedStore(): void {
  try {
    if (typeof localStorage === 'undefined') return
    const versionMarkerKey = `${DEMO_STORAGE_PREFIX}_operational_migration_version`
    const currentVersion = getRawStorageItem(versionMarkerKey)
    if (currentVersion === '3.2.0') {
      return // Idempotent: already executed
    }

    // Read shared memberships to resolve organization_id if a record is missing it
    let sharedMems: OrganizationMembership[] = []
    const rawMems = getRawStorageItem(`${DEMO_STORAGE_PREFIX}_shared_memberships`)
    if (rawMems) {
      try { sharedMems = JSON.parse(rawMems) || [] } catch {}
    }

    // Collect all account IDs present in localStorage keys
    const accountIds = new Set<string>()
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      const m = k.match(/^filament_demo_v3_([0-9a-f-]{36})_(.+)$/)
      if (m) accountIds.add(m[1])
    }

    // Load existing quarantine report
    const quarantineReportKey = `${DEMO_STORAGE_PREFIX}_quarantine_report`
    let quarantineReports: QuarantineReportItem[] = []
    const rawReport = getRawStorageItem(quarantineReportKey)
    if (rawReport) {
      try { quarantineReports = JSON.parse(rawReport) || [] } catch {}
    }
    const quarantinedItemKeys = new Set(quarantineReports.map((r) => `${r.collection}_${r.item_id}`))

    for (const col of SHARED_OPERATIONAL_COLLECTIONS) {
      const sharedKey = `${DEMO_STORAGE_PREFIX}_shared_${col}`
      let sharedData: any[] = []
      const existingShared = getRawStorageItem(sharedKey)
      if (existingShared) {
        try { sharedData = JSON.parse(existingShared) || [] } catch {}
      }
      const sharedIds = new Set(sharedData.map((item: any) => item?.id).filter(Boolean))
      let changed = false

      // Quarantine store per collection
      const quarantineStoreKey = `${DEMO_STORAGE_PREFIX}_quarantine_${col}`
      let quarantineStoreData: any[] = []
      const existingQuarantine = getRawStorageItem(quarantineStoreKey)
      if (existingQuarantine) {
        try { quarantineStoreData = JSON.parse(existingQuarantine) || [] } catch {}
      }
      const existingQuarantineIds = new Set(quarantineStoreData.map((item: any) => item?.id).filter(Boolean))
      let quarantineStoreChanged = false

      for (const accountId of accountIds) {
        const accountKey = `${DEMO_STORAGE_PREFIX}_${accountId}_${col}`
        const raw = getRawStorageItem(accountKey)
        if (!raw) continue
        let accountData: any[] = []
        try { accountData = JSON.parse(raw) || [] } catch { continue }

        for (const item of accountData) {
          if (!item || !item.id) continue
          if (sharedIds.has(item.id) || existingQuarantineIds.has(item.id)) {
            continue // Skip duplicates
          }

          // Resolving ownership
          let targetOrgId = item.organization_id
          // 1. Gunakan record.organization_id jika tersedia
          if (!targetOrgId || typeof targetOrgId !== 'string' || targetOrgId.trim() === '') {
            // 2. Jika tidak tersedia, gunakan membership user pemilik storage
            const activeMem = sharedMems.find((m) => m.user_id === accountId && m.status === 'active')
            if (activeMem && activeMem.organization_id) {
              targetOrgId = activeMem.organization_id
              item.organization_id = targetOrgId
            }
          }

          if (targetOrgId && typeof targetOrgId === 'string' && targetOrgId.trim() !== '') {
            sharedData.push(item)
            sharedIds.add(item.id)
            changed = true
          } else {
            // 3. Masukkan ke quarantine/unresolved migration store
            quarantineStoreData.push(item)
            existingQuarantineIds.add(item.id)
            quarantineStoreChanged = true

            const qKey = `${col}_${item.id}`
            if (!quarantinedItemKeys.has(qKey)) {
              quarantinedItemKeys.add(qKey)
              quarantineReports.push({
                id: generateUUID(),
                collection: col,
                source_key: accountKey,
                item_id: item.id,
                user_id: accountId,
                reason: 'Data tidak memiliki organization_id dan akun tidak memiliki active membership untuk menentukan unit owner',
                quarantined_at: new Date().toISOString(),
              })
            }
          }
        }
      }

      if (changed || !existingShared) {
        setRawStorageItem(sharedKey, JSON.stringify(sharedData))
      }
      if (quarantineStoreChanged) {
        setRawStorageItem(quarantineStoreKey, JSON.stringify(quarantineStoreData))
      }
    }

    setRawStorageItem(quarantineReportKey, JSON.stringify(quarantineReports))
    setRawStorageItem(versionMarkerKey, '3.2.0')
  } catch (e) {
    console.warn('[dataService] Operational migration warning:', e)
  }
}

function resolveCurrentAccountId(explicitUser?: User | null): string {
  if (explicitUser?.id) return explicitUser.id
  try {
    let stored = getRawSessionStorageItem('filament_bakid_auth_user')
    if (!stored) {
      stored = getRawStorageItem('filament_bakid_auth_user')
    }
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed?.id) return parsed.id
    }
  } catch {}
  return ''
}

let activeAccountId = resolveCurrentAccountId()

function getAccountStorage<T>(accountId: string, collection: string, defaultValue: T): T {
  const isShared = ALL_SHARED_COLLECTIONS.has(collection)

  // Shared collections use a single shared cache key regardless of account
  const cacheAccountKey = isShared ? '__shared__' : (accountId || 'anonymous')
  if (!accountCache.has(cacheAccountKey)) {
    accountCache.set(cacheAccountKey, new Map())
  }
  const accMap = accountCache.get(cacheAccountKey)!
  if (accMap.has(collection)) {
    return accMap.get(collection)
  }

  const primaryKey = isShared
    ? `${DEMO_STORAGE_PREFIX}_shared_${collection}`
    : `${DEMO_STORAGE_PREFIX}_${accountId}_${collection}`

  const raw = getRawStorageItem(primaryKey)
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed !== null && parsed !== undefined) {
        // Special case: if shared users or roles collection is an empty array, seed with initial defaults
        if (collection === 'users' && Array.isArray(parsed) && parsed.length === 0) {
          const seededUsers = JSON.parse(JSON.stringify(initialUsers))
          setRawStorageItem(primaryKey, JSON.stringify(seededUsers))
          accMap.set(collection, seededUsers)
          return seededUsers as T
        }
        if (collection === 'roles' && Array.isArray(parsed) && parsed.length === 0) {
          const seededRoles = JSON.parse(JSON.stringify(initialRoles))
          setRawStorageItem(primaryKey, JSON.stringify(seededRoles))
          accMap.set(collection, seededRoles)
          return seededRoles as T
        }

        accMap.set(collection, parsed)
        return parsed
      }
    } catch (e) {
      console.warn(`[demoStore] Malformed data detected in ${primaryKey}. Falling back without overwrite.`, e)
      accMap.set(collection, defaultValue)
      return defaultValue
    }
  }

  // Check legacy key for initial backward-compatible migration on default account (shared non-operational collections only)
  if (!isShared) {
    const legacyKey = `${LEGACY_STORAGE_PREFIX}_${collection}`
    const legacyRaw = getRawStorageItem(legacyKey)
    if (legacyRaw !== null && accountId === '00000000-0000-0000-0000-000000000001') {
      try {
        const parsed = JSON.parse(legacyRaw)
        if (parsed !== null && parsed !== undefined) {
          setRawStorageItem(primaryKey, JSON.stringify(parsed))
          accMap.set(collection, parsed)
          return parsed
        }
      } catch {}
    }
  }

  // Operational collections and organizational structural stores default to empty array [].
  // Collections with initial master data (users, roles, categories, etc.) use defaultValue.
  const collectionsDefaultingToEmpty = new Set([
    'organizations',
    'memberships',
    'periods',
    'structures',
    'sections',
    'personnels',
    'persons',
    'account_holder_histories',
    'programs',
    'agendas',
    'performances',
    'budgets',
    'transactions',
    'reports',
    'tasks',
    'notifications',
    'audit_logs',
    // Non-org collections — semua default kosong, diisi manual via UI
    'categories',
    'brands',
    'products',
    'category_products',
    'customers',
    'orders',
    'payments',
    'comments',
    'addresses',
    'addressables',
  ])
  const fallbackValue = collectionsDefaultingToEmpty.has(collection) ? ([] as unknown as T) : defaultValue
  const seeded = JSON.parse(JSON.stringify(fallbackValue))
  setRawStorageItem(primaryKey, JSON.stringify(seeded))
  accMap.set(collection, seeded)
  return seeded
}

function setAccountStorage<T>(accountId: string, collection: string, value: T): void {
  const isShared = ALL_SHARED_COLLECTIONS.has(collection)

  const cacheAccountKey = isShared ? '__shared__' : (accountId || 'anonymous')
  if (!accountCache.has(cacheAccountKey)) {
    accountCache.set(cacheAccountKey, new Map())
  }
  accountCache.get(cacheAccountKey)!.set(collection, value)

  const primaryKey = isShared
    ? `${DEMO_STORAGE_PREFIX}_shared_${collection}`
    : `${DEMO_STORAGE_PREFIX}_${accountId}_${collection}`

  setRawStorageItem(primaryKey, JSON.stringify(value))

  // Notify other tabs about shared changes
  if (isShared) {
    broadcastStructuralChange(collection)
  }
}

function getStorage<T>(key: string, defaultValue: T): T {
  return getAccountStorage(activeAccountId, key, defaultValue)
}

function setStorage<T>(key: string, value: T): void {
  setAccountStorage(activeAccountId, key, value)
}

let localUsers: User[] = getStorage('users', initialUsers).map((u) => {
  const init = initialUsers.find((iu) => iu.id === u.id || iu.email?.toLowerCase() === u.email?.toLowerCase())
  return {
    ...u,
    avatar_url: u.avatar_url || init?.avatar_url,
  }
})
let localPersons: Person[] = getStorage('persons', [])
let localAccountHolderHistories: AccountHolderHistory[] = getStorage('account_holder_histories', [])
let localCategories: Category[] = getStorage('categories', [])
let localBrands: Brand[] = getStorage('brands', [])
let localProducts: Product[] = getStorage('products', [])
let localCategoryProducts: CategoryProduct[] = getStorage('category_products', [])
let localCustomers: Customer[] = getStorage('customers', [])
let localOrders: Order[] = getStorage('orders', [])
let localPayments: Payment[] = getStorage('payments', [])
let localComments: Comment[] = getStorage('comments', [])
let localAddresses: Address[] = getStorage('addresses', [])
let localAddressables: Addressable[] = getStorage('addressables', [])

// Workflow Ecosystem Stores: ALWAYS start completely empty from 0 (Empty Demo State)
let localOrganizations: Organization[] = getStorage('organizations', [])
let localPeriods: OrganizationPeriod[] = getStorage('periods', [])
let localRoles: RoleEntity[] = getStorage('roles', initialRoles)
let localMemberships: OrganizationMembership[] = getStorage('memberships', [])
let localStructures: Structure[] = getStorage('structures', [])
let localSections: Section[] = getStorage('sections', [])
let localPersonnels: Personnel[] = getStorage('personnels', [])

// Operational Collections: ALWAYS start completely empty from 0 (Centralized Shared Store)
let localPrograms: Program[] = getStorage('programs', [])
let localAgendas: Agenda[] = getStorage('agendas', [])
let localPerformances: Performance[] = getStorage('performances', [])
let localBudgets: Budget[] = getStorage('budgets', [])
let localTransactions: Transaction[] = getStorage('transactions', [])
let localReports: Report[] = getStorage('reports', [])
let localTasks: Task[] = getStorage('tasks', [])
let localNotifications: Notification[] = getStorage('notifications', [])
let localAuditLogs: AuditLog[] = getStorage('audit_logs', [])

// Run migrations once at module load
migrateStructuralToShared()
migrateOperationalToSharedStore()

function reloadSharedStructuralCollections(): void {
  // Invalidate shared cache so next read fetches fresh from localStorage
  const sharedCache = accountCache.get('__shared__')
  if (sharedCache) {
    for (const col of ALL_SHARED_COLLECTIONS) {
      sharedCache.delete(col)
    }
  }
  // Reload into module-level variables (both structural and operational)
  localOrganizations = getAccountStorage('__shared__', 'organizations', [])
  localPeriods = getAccountStorage('__shared__', 'periods', [])
  localMemberships = getAccountStorage('__shared__', 'memberships', [])
  localStructures = getAccountStorage('__shared__', 'structures', [])
  localSections = getAccountStorage('__shared__', 'sections', [])
  localPersonnels = getAccountStorage('__shared__', 'personnels', [])
  localRoles = getAccountStorage('__shared__', 'roles', initialRoles)
  localUsers = getAccountStorage('__shared__', 'users', initialUsers)
  localPersons = getAccountStorage('__shared__', 'persons', [])
  localAccountHolderHistories = getAccountStorage('__shared__', 'account_holder_histories', [])

  localPrograms = getAccountStorage('__shared__', 'programs', [])
  localAgendas = getAccountStorage('__shared__', 'agendas', [])
  localPerformances = getAccountStorage('__shared__', 'performances', [])
  localBudgets = getAccountStorage('__shared__', 'budgets', [])
  localTransactions = getAccountStorage('__shared__', 'transactions', [])
  localReports = getAccountStorage('__shared__', 'reports', [])
  localTasks = getAccountStorage('__shared__', 'tasks', [])
  localNotifications = getAccountStorage('__shared__', 'notifications', [])
  localAuditLogs = getAccountStorage('__shared__', 'audit_logs', [])
}

// Listen for cross-tab shared changes and reload
try {
  getStructuralChannel()?.addEventListener('message', (event) => {
    if (event.data?.type === 'structural_change' || event.data?.type === 'shared_change') {
      reloadSharedStructuralCollections()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('filament_data_changed', { detail: { collection: event.data?.collection } })
        )
      }
    }
  })
} catch {}

function loadAccountData(accountId: string): void {
  activeAccountId = accountId
  reloadSharedStructuralCollections()
}

function ensureAccountContext(user?: User | null): void {
  const targetId = resolveCurrentAccountId(user)
  if (targetId && targetId !== activeAccountId) {
    loadAccountData(targetId)
  }
}

function logAudit(
  user: User | null | undefined,
  action: PermissionAction,
  resource: PermissionResource,
  resourceId: string,
  organizationId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
): void {
  const newLog: AuditLog = {
    id: generateUUID(),
    organization_id: organizationId,
    user_id: user?.id || 'system',
    user_name: user?.name || 'Sistem',
    action,
    resource,
    resource_id: resourceId,
    ip_address: '127.0.0.1',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Client',
    old_values: oldValues,
    new_values: newValues,
    created_at: new Date().toISOString(),
  }
  localAuditLogs = [newLog, ...localAuditLogs]
  setStorage('audit_logs', localAuditLogs)
}

function verifyAccess(
  user: User | null | undefined,
  resource: PermissionResource,
  action: PermissionAction,
  targetOrgId?: string,
  mode: OrganizationScopeMode = 'own'
): void {
  if (!user) return

  // Superadmin has absolute global access across all organizations
  if (user.is_superadmin || user.role === 'superadmin') return

  // Non-superadmin MUST have an active membership
  const userOrgId = user.active_membership?.organization_id
  if (!userOrgId) {
    throw new Error('Akses ditolak: Pengguna tidak memiliki keanggotaan organisasi yang aktif.')
  }

  // Hierarchical scope verification:
  // - Mode 'own': targetOrgId harus identik dengan userOrgId.
  // - Mode 'descendants': targetOrgId boleh userOrgId atau salah satu descendant-nya.
  const inScope = enforceScope(user, targetOrgId, mode, localOrganizations)
  if (!inScope) {
    throw new Error('Akses ditolak: Percobaan manipulasi scope organisasi di luar wewenang hierarki.')
  }

  // Authorize against role & permission matrix
  if (!authorize(user, resource, action, targetOrgId, mode, localOrganizations)) {
    throw new Error(`Akses ditolak: Anda tidak memiliki izin [${resource}.${action}] pada organisasi ini.`)
  }
}

function verifySuperadmin(user?: User | null): void {
  if (!user) {
    throw new Error('Akses ditolak: Pengguna tidak terotentikasi.')
  }
  if (!user.is_superadmin && user.role !== 'superadmin') {
    throw new Error('Akses ditolak: Hanya Superadmin yang berwenang melakukan tindakan ini.')
  }
}

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

export const dataService = {
  // --------------------------------------------------------------------------
  // DEMO ACCOUNT PERSISTENCE CONTROLS
  // --------------------------------------------------------------------------
  setActiveAccount(userOrId?: User | string | null): void {
    if (!userOrId) {
      activeAccountId = ''
      loadAccountData('')
      return
    }
    const id = typeof userOrId === 'string' ? userOrId : (userOrId.id || resolveCurrentAccountId(userOrId))
    loadAccountData(id)
  },
  getActiveAccountId(): string {
    return activeAccountId
  },
  /** Force-reload structural collections (organizations, memberships, etc.) from shared store.
   *  Call this after switching accounts or when cross-tab sync is needed. */
  reloadSharedStructural(): void {
    reloadSharedStructuralCollections()
  },
  resetDemoData(accountId?: string): void {
    if (accountId) {
      SHARED_OPERATIONAL_COLLECTIONS.forEach((col: string) => {
        const key = `${DEMO_STORAGE_PREFIX}_${accountId}_${col}`
        removeRawStorageItem(key)
      })
      accountCache.delete(accountId)
      if (accountId === activeAccountId) {
        loadAccountData(accountId)
      }
    } else {
      // Clear for current account and clear any other tracked account in cache
      SHARED_OPERATIONAL_COLLECTIONS.forEach((col: string) => {
        const key = `${DEMO_STORAGE_PREFIX}_${activeAccountId}_${col}`
        removeRawStorageItem(key)
        removeRawStorageItem(`${DEMO_STORAGE_PREFIX}_shared_${col}`)
      })
      // Also inspect localStorage if browser environment to clear all demo keys
      try {
        if (typeof localStorage !== 'undefined') {
          const keysToRemove: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (k && k.startsWith(`${DEMO_STORAGE_PREFIX}_`)) {
              for (const col of SHARED_OPERATIONAL_COLLECTIONS) {
                if (k.endsWith(`_${col}`)) {
                  keysToRemove.push(k)
                  break
                }
              }
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k))
          localStorage.removeItem('filament_bakid_active_org_id')
        }
      } catch {}

      accountCache.clear()
      loadAccountData(activeAccountId)
    }
  },
  /**
   * Pembersihan menyeluruh (Clean Slate):
   * Menghapus semua mock data di localStorage & session,
   * dan menyisakan HANYA 1 akun Superadmin Master default serta default roles.
   */
  clearAllMockData(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (!k) continue
          if (
            k.startsWith(DEMO_STORAGE_PREFIX) ||
            k.startsWith(LEGACY_STORAGE_PREFIX) ||
            k.startsWith('filament_bakid_')
          ) {
            keysToRemove.push(k)
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k))
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('filament_bakid_active_org_id')
        sessionStorage.removeItem('filament_bakid_logged_out')
      }
    } catch {}

    accountCache.clear()
    nodeStorageFallback.clear()
    nodeSessionStorageFallback.clear()

    // Reseed akun master Superadmin & roles default
    const masterSuperadmin = JSON.parse(JSON.stringify(initialUsers))
    const masterRoles = JSON.parse(JSON.stringify(initialRoles))

    setRawStorageItem(`${DEMO_STORAGE_PREFIX}_shared_users`, JSON.stringify(masterSuperadmin))
    setRawStorageItem(`${DEMO_STORAGE_PREFIX}_shared_roles`, JSON.stringify(masterRoles))

    // Reset in-memory variables untuk non-shared collections ke kosong
    localCategories = []
    localBrands = []
    localProducts = []
    localCategoryProducts = []
    localCustomers = []
    localOrders = []
    localPayments = []
    localComments = []
    localAddresses = []
    localAddressables = []

    // Set current active user to Superadmin
    activeAccountId = masterSuperadmin[0]?.id || ''
    try {
      if (typeof sessionStorage !== 'undefined' && masterSuperadmin[0]) {
        sessionStorage.setItem('filament_bakid_auth_user', JSON.stringify(masterSuperadmin[0]))
      }
    } catch {}

    reloadSharedStructuralCollections()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('filament_structural_change', { detail: { collection: 'all' } }))
    }
  },

  // --------------------------------------------------------------------------
  // USERS
  // --------------------------------------------------------------------------
  async getUsers(): Promise<User[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as User[]
    }
    await delay()
    return [...localUsers]
  },

  async getUserById(id: string): Promise<User | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
      if (!error && data) return data as User
    }
    await delay()
    const u = localUsers.find((u) => u.id === id)
    if (!u) return null
    const person = u.holder_person_id ? localPersons.find((p) => p.id === u.holder_person_id) : undefined
    return {
      ...u,
      holder: person,
      holder_name: person?.name || u.holder_name,
    }
  },

  async getUserByEmailOrUsername(identifier: string): Promise<User | null> {
    await delay(50)
    const key = identifier.trim().toLowerCase()
    return (
      localUsers.find(
        (u) =>
          u.email.toLowerCase() === key ||
          (u.username && u.username.toLowerCase() === key)
      ) || null
    )
  },

  async createUser(data: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const newUser: User = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('users').insert(newUser).select().single()
      if (!error && created) return created as User
    }
    await delay()
    localUsers = [newUser, ...localUsers]
    setStorage('users', localUsers)
    return newUser
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('users').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as User
    }
    await delay()
    const index = localUsers.findIndex((u) => u.id === id)
    if (index === -1) throw new Error('User not found')
    localUsers[index] = { ...localUsers[index], ...data }
    setStorage('users', localUsers)
    return localUsers[index]
  },

  async deleteUser(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('users').delete().eq('id', id)
      return
    }
    await delay()
    localUsers = localUsers.filter((u) => u.id !== id)
    setStorage('users', localUsers)
  },

  async deleteUsers(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('users').delete().in('id', ids)
      return
    }
    await delay()
    localUsers = localUsers.filter((u) => !ids.includes(u.id))
    setStorage('users', localUsers)
  },

  async resetUserPassword(userId: string, newPassword?: string, user?: User | null): Promise<string> {
    verifySuperadmin(user)
    await delay(100)
    const index = localUsers.findIndex((u) => u.id === userId)
    if (index === -1) throw new Error('Pengguna tidak ditemukan')

    const generated = newPassword || `Akses#${Math.floor(1000 + Math.random() * 9000)}`
    localUsers[index] = {
      ...localUsers[index],
      password_hash: generated,
      must_change_password: true,
      updated_at: new Date().toISOString(),
    }
    setStorage('users', localUsers)
    logAudit(user, 'update', 'Admin', userId, undefined, { action: 'reset_password' }, { must_change_password: true })
    return generated
  },

  async toggleAccountStatus(userId: string, user?: User | null): Promise<User> {
    verifySuperadmin(user)
    await delay(100)
    const index = localUsers.findIndex((u) => u.id === userId)
    if (index === -1) throw new Error('Pengguna tidak ditemukan')
    if (localUsers[index].is_superadmin || localUsers[index].role === 'superadmin') {
      throw new Error('Status akun Superadmin tidak dapat diubah')
    }

    const nextStatus: 'active' | 'inactive' = localUsers[index].status === 'active' ? 'inactive' : 'active'
    localUsers[index] = {
      ...localUsers[index],
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }
    setStorage('users', localUsers)

    // Sync membership status as well
    localMemberships = localMemberships.map((m) =>
      m.user_id === userId ? { ...m, status: nextStatus, updated_at: new Date().toISOString() } : m
    )
    setStorage('memberships', localMemberships)

    logAudit(user, 'update', 'Admin', userId, undefined, { status: localUsers[index].status }, { status: nextStatus })
    return localUsers[index]
  },

  async updateUserPassword(userId: string, newPassword: string): Promise<User> {
    await delay(100)
    const index = localUsers.findIndex((u) => u.id === userId)
    if (index === -1) throw new Error('Pengguna tidak ditemukan')
    localUsers[index] = {
      ...localUsers[index],
      password_hash: newPassword,
      must_change_password: false,
      updated_at: new Date().toISOString(),
    }
    setStorage('users', localUsers)
    return localUsers[index]
  },

  // --------------------------------------------------------------------------
  // CATEGORIES
  // --------------------------------------------------------------------------
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Category[]
    }
    await delay()
    return [...localCategories]
  },

  async getCategoryById(id: string): Promise<Category | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categories').select('*').eq('id', id).single()
      if (!error && data) return data as Category
    }
    await delay()
    return localCategories.find((c) => c.id === id) || null
  },

  async createCategory(data: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    const newCat: Category = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('categories').insert(newCat).select().single()
      if (!error && created) return created as Category
    }
    await delay()
    localCategories = [newCat, ...localCategories]
    setStorage('categories', localCategories)
    return newCat
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('categories').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as Category
    }
    await delay()
    const index = localCategories.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Category not found')
    localCategories[index] = { ...localCategories[index], ...data }
    setStorage('categories', localCategories)
    return localCategories[index]
  },

  async deleteCategory(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('categories').delete().eq('id', id)
      return
    }
    await delay()
    localCategories = localCategories.filter((c) => c.id !== id)
    setStorage('categories', localCategories)
  },

  async deleteCategories(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('categories').delete().in('id', ids)
      return
    }
    await delay()
    localCategories = localCategories.filter((c) => !ids.includes(c.id))
    setStorage('categories', localCategories)
  },

  // Category Relation Manager: BelongsToMany Products
  async getCategoryProducts(categoryId: string): Promise<Product[]> {
    await delay()
    const productIds = localCategoryProducts
      .filter((cp) => cp.category_id === categoryId)
      .map((cp) => cp.product_id)
    return localProducts.filter((p) => productIds.includes(p.id))
  },

  async attachProductToCategory(categoryId: string, productId: string): Promise<void> {
    await delay()
    const exists = localCategoryProducts.some(
      (cp) => cp.category_id === categoryId && cp.product_id === productId
    )
    if (!exists) {
      localCategoryProducts = [...localCategoryProducts, { category_id: categoryId, product_id: productId }]
      setStorage('category_products', localCategoryProducts)
    }
  },

  async detachProductFromCategory(categoryId: string, productId: string): Promise<void> {
    await delay()
    localCategoryProducts = localCategoryProducts.filter(
      (cp) => !(cp.category_id === categoryId && cp.product_id === productId)
    )
    setStorage('category_products', localCategoryProducts)
  },

  // --------------------------------------------------------------------------
  // BRANDS
  // --------------------------------------------------------------------------
  async getBrands(): Promise<Brand[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('brands').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Brand[]
    }
    await delay()
    return [...localBrands]
  },

  async getBrandById(id: string): Promise<Brand | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('brands').select('*').eq('id', id).single()
      if (!error && data) return data as Brand
    }
    await delay()
    return localBrands.find((b) => b.id === id) || null
  },

  async createBrand(data: Omit<Brand, 'id' | 'created_at'>): Promise<Brand> {
    const newBrand: Brand = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('brands').insert(newBrand).select().single()
      if (!error && created) return created as Brand
    }
    await delay()
    localBrands = [newBrand, ...localBrands]
    setStorage('brands', localBrands)
    return newBrand
  },

  async updateBrand(id: string, data: Partial<Brand>): Promise<Brand> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('brands').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as Brand
    }
    await delay()
    const index = localBrands.findIndex((b) => b.id === id)
    if (index === -1) throw new Error('Brand not found')
    localBrands[index] = { ...localBrands[index], ...data }
    setStorage('brands', localBrands)
    return localBrands[index]
  },

  async deleteBrand(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('brands').delete().eq('id', id)
      return
    }
    await delay()
    localBrands = localBrands.filter((b) => b.id !== id)
    setStorage('brands', localBrands)
  },

  async deleteBrands(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('brands').delete().in('id', ids)
      return
    }
    await delay()
    localBrands = localBrands.filter((b) => !ids.includes(b.id))
    setStorage('brands', localBrands)
  },

  // Brand Relation Manager: MorphToMany Addresses
  async getBrandAddresses(brandId: string): Promise<Address[]> {
    await delay()
    const addressIds = localAddressables
      .filter((a) => a.addressable_type === 'Brand' && a.addressable_id === brandId)
      .map((a) => a.address_id)
    return localAddresses.filter((addr) => addressIds.includes(addr.id))
  },

  async addBrandAddress(brandId: string, addressData: Omit<Address, 'id' | 'created_at'>): Promise<Address> {
    await delay()
    const newAddress: Address = {
      ...addressData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    localAddresses = [newAddress, ...localAddresses]
    setStorage('addresses', localAddresses)

    const newAddressable: Addressable = {
      id: generateUUID(),
      address_id: newAddress.id,
      addressable_id: brandId,
      addressable_type: 'Brand',
    }
    localAddressables = [newAddressable, ...localAddressables]
    setStorage('addressables', localAddressables)

    return newAddress
  },

  async removeBrandAddress(brandId: string, addressId: string): Promise<void> {
    await delay()
    localAddressables = localAddressables.filter(
      (a) => !(a.addressable_type === 'Brand' && a.addressable_id === brandId && a.address_id === addressId)
    )
    setStorage('addressables', localAddressables)
  },

  // --------------------------------------------------------------------------
  // PRODUCTS
  // --------------------------------------------------------------------------
  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Product[]
    }
    await delay()
    return localProducts.map((p) => ({
      ...p,
      category: localCategories.find((c) => c.id === p.category_id) || null,
      brand: localBrands.find((b) => b.id === p.brand_id) || null,
    }))
  },

  async getProductById(id: string): Promise<Product | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (!error && data) return data as Product
    }
    await delay()
    const product = localProducts.find((p) => p.id === id)
    if (!product) return null
    return {
      ...product,
      category: localCategories.find((c) => c.id === product.category_id) || null,
      brand: localBrands.find((b) => b.id === product.brand_id) || null,
    }
  },

  async createProduct(data: Omit<Product, 'id' | 'created_at' | 'category' | 'brand'>): Promise<Product> {
    const newProduct: Product = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('products').insert(newProduct).select().single()
      if (!error && created) return created as Product
    }
    await delay()
    localProducts = [newProduct, ...localProducts]
    setStorage('products', localProducts)
    // Auto-sync category_product pivot if category_id given
    if (newProduct.category_id) {
      localCategoryProducts = [...localCategoryProducts, { category_id: newProduct.category_id, product_id: newProduct.id }]
      setStorage('category_products', localCategoryProducts)
    }
    return newProduct
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('products').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as Product
    }
    await delay()
    const index = localProducts.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Product not found')
    localProducts[index] = { ...localProducts[index], ...data }
    setStorage('products', localProducts)
    return localProducts[index]
  },

  async deleteProduct(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('products').delete().eq('id', id)
      return
    }
    await delay()
    localProducts = localProducts.filter((p) => p.id !== id)
    setStorage('products', localProducts)
  },

  async deleteProducts(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('products').delete().in('id', ids)
      return
    }
    await delay()
    localProducts = localProducts.filter((p) => !ids.includes(p.id))
    setStorage('products', localProducts)
  },

  // Product Relation Manager: Comments (MorphMany)
  async getProductComments(productId: string): Promise<Comment[]> {
    await delay()
    return localComments.filter((c) => c.commentable_type === 'Product' && c.commentable_id === productId)
  },

  async addProductComment(productId: string, data: Omit<Comment, 'id' | 'created_at' | 'commentable_id' | 'commentable_type'>): Promise<Comment> {
    await delay()
    const newComment: Comment = {
      ...data,
      id: generateUUID(),
      commentable_id: productId,
      commentable_type: 'Product',
      created_at: new Date().toISOString(),
    }
    localComments = [newComment, ...localComments]
    setStorage('comments', localComments)
    return newComment
  },

  // --------------------------------------------------------------------------
  // CUSTOMERS
  // --------------------------------------------------------------------------
  async getCustomers(): Promise<Customer[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Customer[]
    }
    await delay()
    return localCustomers.map((cust) => {
      const custOrders = localOrders.filter((o) => o.customer_id === cust.id)
      const totalSpent = custOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_price : 0), 0)
      return {
        ...cust,
        orders_count: custOrders.length,
        total_spent: totalSpent,
      }
    })
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
      if (!error && data) return data as Customer
    }
    await delay()
    const cust = localCustomers.find((c) => c.id === id)
    if (!cust) return null
    const custOrders = localOrders.filter((o) => o.customer_id === cust.id)
    const totalSpent = custOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_price : 0), 0)
    return {
      ...cust,
      orders_count: custOrders.length,
      total_spent: totalSpent,
    }
  },

  async createCustomer(data: Omit<Customer, 'id' | 'created_at' | 'orders_count' | 'total_spent'>): Promise<Customer> {
    const newCust: Customer = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('customers').insert(newCust).select().single()
      if (!error && created) return created as Customer
    }
    await delay()
    localCustomers = [newCust, ...localCustomers]
    setStorage('customers', localCustomers)
    return newCust
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('customers').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as Customer
    }
    await delay()
    const index = localCustomers.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Customer not found')
    localCustomers[index] = { ...localCustomers[index], ...data }
    setStorage('customers', localCustomers)
    return localCustomers[index]
  },

  async deleteCustomer(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('customers').delete().eq('id', id)
      return
    }
    await delay()
    localCustomers = localCustomers.filter((c) => c.id !== id)
    setStorage('customers', localCustomers)
  },

  async deleteCustomers(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('customers').delete().in('id', ids)
      return
    }
    await delay()
    localCustomers = localCustomers.filter((c) => !ids.includes(c.id))
    setStorage('customers', localCustomers)
  },

  // Customer Relation Manager: HasManyThrough Payments (via Orders)
  async getCustomerPayments(customerId: string): Promise<Payment[]> {
    await delay()
    const customerOrderIds = localOrders.filter((o) => o.customer_id === customerId).map((o) => o.id)
    return localPayments.filter((p) => customerOrderIds.includes(p.order_id))
  },

  // Customer Relation Manager: MorphToMany Addresses
  async getCustomerAddresses(customerId: string): Promise<Address[]> {
    await delay()
    const addressIds = localAddressables
      .filter((a) => a.addressable_type === 'Customer' && a.addressable_id === customerId)
      .map((a) => a.address_id)
    return localAddresses.filter((addr) => addressIds.includes(addr.id))
  },

  async addCustomerAddress(customerId: string, addressData: Omit<Address, 'id' | 'created_at'>): Promise<Address> {
    await delay()
    const newAddress: Address = {
      ...addressData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    localAddresses = [newAddress, ...localAddresses]
    setStorage('addresses', localAddresses)

    const newAddressable: Addressable = {
      id: generateUUID(),
      address_id: newAddress.id,
      addressable_id: customerId,
      addressable_type: 'Customer',
    }
    localAddressables = [newAddressable, ...localAddressables]
    setStorage('addressables', localAddressables)

    return newAddress
  },

  async removeCustomerAddress(customerId: string, addressId: string): Promise<void> {
    await delay()
    localAddressables = localAddressables.filter(
      (a) => !(a.addressable_type === 'Customer' && a.addressable_id === customerId && a.address_id === addressId)
    )
    setStorage('addressables', localAddressables)
  },

  // --------------------------------------------------------------------------
  // ORDERS
  // --------------------------------------------------------------------------
  async getOrders(): Promise<Order[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Order[]
    }
    await delay()
    return localOrders.map((o) => ({
      ...o,
      customer: localCustomers.find((c) => c.id === o.customer_id),
    }))
  },

  async getOrderById(id: string): Promise<Order | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('orders').select('*').eq('id', id).single()
      if (!error && data) return data as Order
    }
    await delay()
    const order = localOrders.find((o) => o.id === id)
    if (!order) return null
    const addressable = localAddressables.find((a) => a.addressable_type === 'Order' && a.addressable_id === id)
    const address = addressable ? localAddresses.find((addr) => addr.id === addressable.address_id) : undefined

    return {
      ...order,
      customer: localCustomers.find((c) => c.id === order.customer_id),
      address,
    }
  },

  async createOrder(data: Omit<Order, 'id' | 'created_at' | 'customer' | 'address' | 'payments'>): Promise<Order> {
    const newOrder: Order = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('orders').insert(newOrder).select().single()
      if (!error && created) return created as Order
    }
    await delay()
    localOrders = [newOrder, ...localOrders]
    setStorage('orders', localOrders)
    return newOrder
  },

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('orders').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as Order
    }
    await delay()
    const index = localOrders.findIndex((o) => o.id === id)
    if (index === -1) throw new Error('Order not found')
    localOrders[index] = { ...localOrders[index], ...data }
    setStorage('orders', localOrders)
    return localOrders[index]
  },

  async deleteOrder(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('orders').delete().eq('id', id)
      return
    }
    await delay()
    localOrders = localOrders.filter((o) => o.id !== id)
    setStorage('orders', localOrders)
  },

  async deleteOrders(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('orders').delete().in('id', ids)
      return
    }
    await delay()
    localOrders = localOrders.filter((o) => !ids.includes(o.id))
    setStorage('orders', localOrders)
  },

  // Order Relation Manager: MorphOne Address
  async getOrderAddress(orderId: string): Promise<Address | null> {
    await delay()
    const addressable = localAddressables.find((a) => a.addressable_type === 'Order' && a.addressable_id === orderId)
    if (!addressable) return null
    return localAddresses.find((addr) => addr.id === addressable.address_id) || null
  },

  async setOrderAddress(orderId: string, addressData: Omit<Address, 'id' | 'created_at'>): Promise<Address> {
    await delay()
    const newAddress: Address = {
      ...addressData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    localAddresses = [newAddress, ...localAddresses]
    setStorage('addresses', localAddresses)

    // Remove any previous MorphOne addressable for this order
    localAddressables = localAddressables.filter(
      (a) => !(a.addressable_type === 'Order' && a.addressable_id === orderId)
    )
    const newAddressable: Addressable = {
      id: generateUUID(),
      address_id: newAddress.id,
      addressable_id: orderId,
      addressable_type: 'Order',
    }
    localAddressables = [newAddressable, ...localAddressables]
    setStorage('addressables', localAddressables)

    return newAddress
  },

  // Order Relation Manager: Payments (HasMany)
  async getOrderPayments(orderId: string): Promise<Payment[]> {
    await delay()
    return localPayments.filter((p) => p.order_id === orderId)
  },

  async addOrderPayment(orderId: string, data: Omit<Payment, 'id' | 'created_at' | 'order_id'>): Promise<Payment> {
    await delay()
    const newPayment: Payment = {
      ...data,
      id: generateUUID(),
      order_id: orderId,
      created_at: new Date().toISOString(),
    }
    localPayments = [newPayment, ...localPayments]
    setStorage('payments', localPayments)
    return newPayment
  },

  async deletePayment(paymentId: string): Promise<void> {
    await delay()
    localPayments = localPayments.filter((p) => p.id !== paymentId)
    setStorage('payments', localPayments)
  },

  // --------------------------------------------------------------------------
  // COMMENTS (General)
  // --------------------------------------------------------------------------

  // General Comment actions
  async toggleCommentApproval(commentId: string): Promise<Comment> {
    await delay()
    const index = localComments.findIndex((c) => c.id === commentId)
    if (index === -1) throw new Error('Comment not found')
    localComments[index].is_approved = !localComments[index].is_approved
    setStorage('comments', localComments)
    return localComments[index]
  },

  async deleteComment(commentId: string): Promise<void> {
    await delay()
    localComments = localComments.filter((c) => c.id !== commentId)
    setStorage('comments', localComments)
  },

  // --------------------------------------------------------------------------
  // DASHBOARD AGGREGATES & METRICS
  // --------------------------------------------------------------------------
  async getDashboardStats() {
    await delay(100)
    const totalUsers = localUsers.length
    const totalOrders = localOrders.length
    const totalRevenue = localOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total_price, 0)
    const totalCustomers = localCustomers.length
    const pendingOrders = localOrders.filter((o) => o.status === 'pending').length
    const lowStockProducts = localProducts.filter((p) => p.stock_quantity <= p.security_stock).length

    return {
      totalUsers,
      totalOrders,
      totalRevenue,
      totalCustomers,
      pendingOrders,
      lowStockProducts,
    }
  },

  async getRecentOrders(limit = 5): Promise<Order[]> {
    await delay(80)
    return [...localOrders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
      .map((o) => ({
        ...o,
        customer: localCustomers.find((c) => c.id === o.customer_id),
      }))
  },

  // Global search across resources
  async globalSearch(query: string) {
    if (!query || query.trim().length < 2) return []
    const q = query.toLowerCase().trim()

    const results: Array<{
      type: string
      title: string
      subtitle: string
      url: string
      badge?: string
    }> = []

    // Search Programs
    localPrograms.forEach((p) => {
      const pTitle = p.title || p.name || 'Program'
      if (pTitle.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q))) {
        results.push({
          type: 'program',
          title: pTitle,
          subtitle: `Kode: ${p.code || '-'} | Status: ${p.status}`,
          url: '/programs',
          badge: p.status,
        })
      }
    })

    // Search Agendas
    localAgendas.forEach((a) => {
      if (a.title.toLowerCase().includes(q) || (a.location && a.location.toLowerCase().includes(q))) {
        results.push({
          type: 'agenda',
          title: a.title,
          subtitle: `Lokasi: ${a.location || '-'} | Status: ${a.status}`,
          url: '/agendas',
          badge: a.status,
        })
      }
    })

    // Search Reports
    localReports.forEach((r) => {
      if (r.title.toLowerCase().includes(q) || (r.period && r.period.toLowerCase().includes(q))) {
        results.push({
          type: 'report',
          title: r.title,
          subtitle: `Periode: ${r.period || '-'} | Status: ${r.status}`,
          url: '/reports',
          badge: r.status,
        })
      }
    })

    // Search Tasks
    localTasks.forEach((t) => {
      if (t.title.toLowerCase().includes(q)) {
        results.push({
          type: 'task',
          title: t.title,
          subtitle: `Prioritas: ${t.priority || '-'} | Status: ${t.status}`,
          url: '/tasks',
          badge: t.status,
        })
      }
    })

    // Search Organizations
    localOrganizations.forEach((o) => {
      if (o.name.toLowerCase().includes(q) || (o.code && o.code.toLowerCase().includes(q))) {
        results.push({
          type: 'organization',
          title: o.name,
          subtitle: `Kode: ${o.code} | Status: ${o.status}`,
          url: '/structures',
          badge: o.status,
        })
      }
    })

    // Search Users
    localUsers.forEach((u) => {
      if (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) {
        results.push({
          type: 'user',
          title: u.name,
          subtitle: `${u.email} (${u.role})`,
          url: '/accounts',
          badge: u.role,
        })
      }
    })

    return results.slice(0, 10)
  },

  // ==========================================================================
  // MULTI-ORGANIZATION WORKFLOW ECOSYSTEM SERVICE METHODS
  // ==========================================================================

  // --------------------------------------------------------------------------
  // 1. ORGANIZATIONS (Superadmin & Multi-tenant)
  // --------------------------------------------------------------------------
  async getOrganizations(user?: User | null): Promise<Organization[]> {
    await delay(100)
    // Superadmin can view all organizations
    if (!user || user.is_superadmin || user.role === 'superadmin') {
      return [...localOrganizations]
    }
    // Tenant users only see organizations they belong to
    const userOrgIds = localMemberships
      .filter((m) => m.user_id === user.id && m.status === 'active')
      .map((m) => m.organization_id)
    return localOrganizations.filter((org) => userOrgIds.includes(org.id))
  },

  async getOrganizationById(id: string, user?: User | null): Promise<Organization | null> {
    await delay(80)
    verifyAccess(user, 'Organization', 'view', id)
    return localOrganizations.find((o) => o.id === id) || null
  },

  async createOrganization(
    data: Omit<Organization, 'id' | 'created_at' | 'updated_at'>,
    user?: User | null
  ): Promise<Organization> {
    verifyAccess(user, 'Organization', 'create')

    // Stage 8: Structural create gate — only Ketua Pengurus may add hierarchy nodes
    const parentOrg = data.parent_id ? localOrganizations.find((o) => o.id === data.parent_id) : null
    assertCanCreateOrganizationStructure(
      user,
      data.unit_type ?? null,
      data.parent_id ? (parentOrg?.unit_type ?? null) : null,
      localOrganizations
    )

    await delay(120)
    const newOrg: Organization = {
      ...data,
      id: (data as unknown as { id?: string }).id || generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localOrganizations = [newOrg, ...localOrganizations]
    setStorage('organizations', localOrganizations)

    // AUTO-PROVISIONING: Buat otomatis Struktur aktif untuk organisasi baru ini
    const currentYear = new Date().getFullYear()
    const autoStructure: Structure = {
      id: generateUUID(),
      organization_id: newOrg.id,
      period_name: `Kepengurusan ${currentYear} - ${currentYear + 2}`,
      name: `Struktur ${newOrg.name}`,
      start_year: currentYear,
      end_year: currentYear + 2,
      is_active: true,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localStructures = [autoStructure, ...localStructures]
    setStorage('structures', localStructures)

    // AUTO-PROVISIONING: Buat otomatis Periode Kepengurusan aktif untuk organisasi baru ini
    const autoPeriod: OrganizationPeriod = {
      id: generateUUID(),
      organization_id: newOrg.id,
      name: `Periode ${currentYear} - ${currentYear + 2}`,
      period_start: `${currentYear}-01-01`,
      period_end: `${currentYear + 2}-12-31`,
      is_active: true,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localPeriods = [autoPeriod, ...localPeriods]
    setStorage('periods', localPeriods)

    // AUTO-PROVISIONING: Buat otomatis Seksi & Posisi Personel (Jabatan) default
    // agar posisi ini langsung muncul di penempatan akun, bagan, dan penugasan
    const autoSection: Section = {
      id: generateUUID(),
      structure_id: autoStructure.id,
      organization_id: newOrg.id,
      name: `Bidang ${newOrg.name}`,
      code: `SEC-${newOrg.code || 'JBT'}`,
      description: newOrg.description || `Bidang tugas operasional ${newOrg.name}`,
      created_at: new Date().toISOString(),
    }
    localSections = [...localSections, autoSection]
    setStorage('sections', localSections)

    const autoPersonnel: Personnel = {
      id: generateUUID(),
      section_id: autoSection.id,
      organization_id: newOrg.id,
      period_id: autoPeriod.id,
      role_title: newOrg.name,
      position: newOrg.name,
      node_type: (newOrg.unit_type as any) === 'kepala_pengurus' ? 'ketua' : 'jabatan',
      tupoksi: newOrg.description || `Pemegang amanah dan pimpinan ${newOrg.name}`,
      status: 'active',
      created_at: new Date().toISOString(),
    }
    localPersonnels = [autoPersonnel, ...localPersonnels]
    setStorage('personnels', localPersonnels)

    // AUTO-MEMBERSHIP: Berikan membership otomatis kepada pembuat agar organisasi langsung muncul di tenant & scope
    if (user?.id) {
      const existingMem = localMemberships.find(
        (m) => m.user_id === user.id && m.organization_id === newOrg.id
      )
      if (!existingMem) {
        const creatorMembership: OrganizationMembership = {
          id: generateUUID(),
          user_id: user.id,
          organization_id: newOrg.id,
          role_id: user.role === 'superadmin' ? 'role-superadmin' : 'role-admin-org',
          level: 'admin',
          status: 'active',
          created_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        }
        localMemberships = [creatorMembership, ...localMemberships]
        setStorage('memberships', localMemberships)
      }
    }

    logAudit(user, 'create', 'Organization', newOrg.id, newOrg.id, undefined, newOrg as unknown as Record<string, unknown>)
    reloadSharedStructuralCollections()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('filament_structural_change', { detail: { collection: 'organizations' } }))
    }
    return newOrg
  },

  async updateOrganization(
    id: string,
    data: Partial<Organization>,
    user?: User | null
  ): Promise<Organization> {
    verifyAccess(user, 'Organization', 'update', id)
    await delay(120)
    const index = localOrganizations.findIndex((o) => o.id === id)
    if (index === -1) throw new Error('Organisasi tidak ditemukan')
    const oldVal = { ...localOrganizations[index] }
    localOrganizations[index] = {
      ...localOrganizations[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    setStorage('organizations', localOrganizations)

    // Sinkronkan nama posisi personel default jika nama organisasi diubah
    if (data.name) {
      let personnelChanged = false
      localPersonnels = localPersonnels.map((p) => {
        if (p.organization_id === id && (p.position === oldVal.name || p.role_title === oldVal.name)) {
          personnelChanged = true
          return {
            ...p,
            position: data.name!,
            role_title: data.name!,
            updated_at: new Date().toISOString(),
          }
        }
        return p
      })
      if (personnelChanged) {
        setStorage('personnels', localPersonnels)
      }
    }

    logAudit(user, 'update', 'Organization', id, id, oldVal as unknown as Record<string, unknown>, localOrganizations[index] as unknown as Record<string, unknown>)
    return localOrganizations[index]
  },

  async deleteOrganization(id: string, user?: User | null): Promise<void> {
    verifyAccess(user, 'Organization', 'delete', id)
    await delay(120)
    const oldVal = localOrganizations.find((o) => o.id === id)
    localOrganizations = localOrganizations.filter((o) => o.id !== id)
    setStorage('organizations', localOrganizations)

    // Bersihkan personel dan seksi yang terhubung
    localPersonnels = localPersonnels.filter((p) => p.organization_id !== id)
    setStorage('personnels', localPersonnels)
    localSections = localSections.filter((s) => s.organization_id !== id)
    setStorage('sections', localSections)

    logAudit(user, 'delete', 'Organization', id, id, oldVal as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 1B. ORGANIZATION PERIODS (Periode Kepengurusan)
  // --------------------------------------------------------------------------
  async getPeriods(organizationId: string, user?: User | null): Promise<OrganizationPeriod[]> {
    await delay(80)
    verifyAccess(user, 'Organization', 'view', organizationId)
    return localPeriods.filter((p) => p.organization_id === organizationId)
  },

  async getActivePeriod(organizationId: string, user?: User | null): Promise<OrganizationPeriod | null> {
    await delay(60)
    verifyAccess(user, 'Organization', 'view', organizationId)
    const active = localPeriods.find((p) => p.organization_id === organizationId && p.is_active)
    return active || localPeriods.find((p) => p.organization_id === organizationId) || null
  },

  async createPeriod(
    data: Omit<OrganizationPeriod, 'id' | 'created_at' | 'updated_at'>,
    user?: User | null
  ): Promise<OrganizationPeriod> {
    verifyAccess(user, 'Organization', 'update', data.organization_id)
    await delay(100)
    const newPeriod: OrganizationPeriod = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    // If set as active, deactivate other periods for this org
    if (newPeriod.is_active) {
      localPeriods = localPeriods.map((p) =>
        p.organization_id === data.organization_id ? { ...p, is_active: false } : p
      )
    }
    localPeriods = [newPeriod, ...localPeriods]
    setStorage('periods', localPeriods)
    logAudit(user, 'create', 'Organization', newPeriod.id, data.organization_id, undefined, newPeriod as unknown as Record<string, unknown>)
    return newPeriod
  },

  async updatePeriod(
    id: string,
    data: Partial<OrganizationPeriod>,
    user?: User | null
  ): Promise<OrganizationPeriod> {
    const period = localPeriods.find((p) => p.id === id)
    if (!period) throw new Error('Periode kepengurusan tidak ditemukan')
    verifyAccess(user, 'Organization', 'update', period.organization_id)
    await delay(100)
    const index = localPeriods.findIndex((p) => p.id === id)
    const oldVal = { ...localPeriods[index] }
    if (data.is_active) {
      localPeriods = localPeriods.map((p) =>
        p.organization_id === period.organization_id && p.id !== id ? { ...p, is_active: false } : p
      )
    }
    localPeriods[index] = {
      ...localPeriods[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    setStorage('periods', localPeriods)
    logAudit(user, 'update', 'Organization', id, period.organization_id, oldVal as unknown as Record<string, unknown>, localPeriods[index] as unknown as Record<string, unknown>)
    return localPeriods[index]
  },

  async setActivePeriod(id: string, organizationId: string, user?: User | null): Promise<OrganizationPeriod> {
    verifyAccess(user, 'Organization', 'update', organizationId)
    await delay(100)
    localPeriods = localPeriods.map((p) => {
      if (p.organization_id === organizationId) {
        return { ...p, is_active: p.id === id, status: p.id === id ? 'active' : p.status }
      }
      return p
    })
    setStorage('periods', localPeriods)
    const active = localPeriods.find((p) => p.id === id)!
    logAudit(user, 'update', 'Organization', id, organizationId, undefined, { is_active: true })
    return active
  },

  async deletePeriod(id: string, user?: User | null): Promise<void> {
    const period = localPeriods.find((p) => p.id === id)
    if (!period) throw new Error('Periode kepengurusan tidak ditemukan')
    verifyAccess(user, 'Organization', 'update', period.organization_id)
    await delay(100)
    localPeriods = localPeriods.filter((p) => p.id !== id)
    setStorage('periods', localPeriods)
    logAudit(user, 'delete', 'Organization', id, period.organization_id, period as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 2. ORGANIZATION MEMBERSHIPS & ADMINS
  // --------------------------------------------------------------------------
  async getMemberships(organizationId?: string, user?: User | null): Promise<OrganizationMembership[]> {
    await delay(100)
    if (user && !user.is_superadmin && user.role !== 'superadmin') {
      try {
        verifyAccess(user, 'Admin', 'viewAny', organizationId)
      } catch {
        const userMems = localMemberships.filter(
          (m) => m.user_id === user.id && (!organizationId || m.organization_id === organizationId)
        )
        return userMems.map((m) => ({
          ...m,
          user: localUsers.find((u) => u.id === m.user_id),
          role: localRoles.find((r) => r.id === m.role_id),
          organization: localOrganizations.find((o) => o.id === m.organization_id),
        }))
      }
    } else {
      verifyAccess(user, 'Admin', 'viewAny', organizationId)
    }
    let filtered = localMemberships
    if (organizationId) {
      filtered = filtered.filter((m) => m.organization_id === organizationId)
    }
    return filtered.map((m) => {
      const role = localRoles.find((r) => r.id === m.role_id)
      let resolvedLevel = m.level
      if (!resolvedLevel) {
        const roleId = m.role_id?.toLowerCase() || ''
        const roleSlug = role?.slug?.toLowerCase() || ''
        const roleName = role?.name?.toLowerCase() || ''
        if (
          roleId === 'role-admin-org' ||
          roleId === 'role-superadmin' ||
          roleSlug.includes('admin') ||
          roleName.includes('admin') ||
          roleName.includes('ketua')
        ) {
          resolvedLevel = 'admin'
        } else {
          resolvedLevel = 'anggota'
        }
      }
      const u = localUsers.find((u) => u.id === m.user_id)
      const person = u?.holder_person_id ? localPersons.find((p) => p.id === u.holder_person_id) : undefined
      const resolvedUser = u ? { ...u, holder: person, holder_name: person?.name || u.holder_name } : undefined

      return {
        ...m,
        level: resolvedLevel,
        user: resolvedUser,
        role,
        organization: localOrganizations.find((o) => o.id === m.organization_id),
      }
    })
  },

  async createMembership(
    data: Omit<OrganizationMembership, 'id' | 'joined_at' | 'created_at' | 'updated_at' | 'user' | 'role' | 'organization'>,
    user?: User | null
  ): Promise<OrganizationMembership> {
    verifyAccess(user, 'Admin', 'create', data.organization_id)
    await delay(120)
    const newMem: OrganizationMembership = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    }
    localMemberships = [newMem, ...localMemberships]
    setStorage('memberships', localMemberships)
    logAudit(user, 'create', 'Admin', newMem.id, data.organization_id, undefined, newMem as unknown as Record<string, unknown>)
    return {
      ...newMem,
      user: localUsers.find((u) => u.id === newMem.user_id),
      role: localRoles.find((r) => r.id === newMem.role_id),
      organization: localOrganizations.find((o) => o.id === newMem.organization_id),
    }
  },

  async updateMembership(
    id: string,
    data: Partial<OrganizationMembership>,
    user?: User | null
  ): Promise<OrganizationMembership> {
    const mem = localMemberships.find((m) => m.id === id)
    if (!mem) throw new Error('Data keanggotaan tidak ditemukan')
    verifyAccess(user, 'Admin', 'update', mem.organization_id)
    await delay(120)
    const index = localMemberships.findIndex((m) => m.id === id)
    const oldVal = { ...localMemberships[index] }
    localMemberships[index] = { ...localMemberships[index], ...data }
    setStorage('memberships', localMemberships)
    logAudit(user, 'update', 'Admin', id, mem.organization_id, oldVal as unknown as Record<string, unknown>, localMemberships[index] as unknown as Record<string, unknown>)
    return {
      ...localMemberships[index],
      user: localUsers.find((u) => u.id === localMemberships[index].user_id),
      role: localRoles.find((r) => r.id === localMemberships[index].role_id),
      organization: localOrganizations.find((o) => o.id === localMemberships[index].organization_id),
    }
  },

  async deleteMembership(id: string, user?: User | null): Promise<void> {
    const mem = localMemberships.find((m) => m.id === id)
    if (!mem) throw new Error('Data keanggotaan tidak ditemukan')
    verifyAccess(user, 'Admin', 'delete', mem.organization_id)
    await delay(120)
    localMemberships = localMemberships.filter((m) => m.id !== id)
    setStorage('memberships', localMemberships)
    logAudit(user, 'delete', 'Admin', id, mem.organization_id, mem as unknown as Record<string, unknown>, undefined)
  },

  async deleteAccount(userId: string, user?: User | null): Promise<void> {
    verifySuperadmin(user)
    await delay(120)
    const targetUser = localUsers.find((u) => u.id === userId)
    if (!targetUser) throw new Error('Pengguna tidak ditemukan')
    if (targetUser.is_superadmin || targetUser.role === 'superadmin') {
      throw new Error('Akun Superadmin tidak dapat dihapus')
    }
    // Hapus memberships terkait
    localMemberships = localMemberships.filter((m) => m.user_id !== userId)
    setStorage('memberships', localMemberships)

    // Hapus user
    localUsers = localUsers.filter((u) => u.id !== userId)
    setStorage('users', localUsers)
    logAudit(user, 'delete', 'Admin', userId, undefined, targetUser as unknown as Record<string, unknown>, undefined)
  },

  async deleteAccounts(userIds: string[], user?: User | null): Promise<{ deletedCount: number; skippedCount: number }> {
    verifySuperadmin(user)
    await delay(150)
    const validUserIds = userIds.filter((id) => {
      const u = localUsers.find((item) => item.id === id)
      return u && !u.is_superadmin && u.role !== 'superadmin' && u.id !== user?.id
    })

    if (validUserIds.length === 0) {
      throw new Error('Tidak ada akun yang dapat dihapus (Akun Superadmin atau akun Anda sendiri dilindungi).')
    }

    const validIdSet = new Set(validUserIds)
    localMemberships = localMemberships.filter((m) => !validIdSet.has(m.user_id))
    setStorage('memberships', localMemberships)

    localUsers = localUsers.filter((u) => !validIdSet.has(u.id))
    setStorage('users', localUsers)

    logAudit(user, 'delete', 'Admin', validUserIds.join(','), undefined, { count: validUserIds.length }, undefined)
    return {
      deletedCount: validUserIds.length,
      skippedCount: userIds.length - validUserIds.length,
    }
  },

  async moveUserOrganization(
    membershipId: string,
    targetOrgId: string,
    targetRoleId: string,
    level?: 'admin' | 'anggota',
    user?: User | null
  ): Promise<OrganizationMembership> {
    verifySuperadmin(user)
    await delay(120)
    const index = localMemberships.findIndex((m) => m.id === membershipId)
    if (index === -1) throw new Error('Keanggotaan tidak ditemukan')

    const oldVal = { ...localMemberships[index] }
    const resolvedLevel = level || localMemberships[index].level || 'anggota'
    localMemberships[index] = {
      ...localMemberships[index],
      organization_id: targetOrgId,
      role_id: targetRoleId,
      level: resolvedLevel,
      updated_at: new Date().toISOString(),
    }
    setStorage('memberships', localMemberships)
    logAudit(user, 'update', 'Admin', membershipId, targetOrgId, oldVal as unknown as Record<string, unknown>, localMemberships[index] as unknown as Record<string, unknown>)
    return {
      ...localMemberships[index],
      user: localUsers.find((u) => u.id === localMemberships[index].user_id),
      role: localRoles.find((r) => r.id === targetRoleId),
      organization: localOrganizations.find((o) => o.id === targetOrgId),
    }
  },

  async addExistingUserToOrganization(
    userId: string,
    orgId: string,
    roleId: string,
    level?: 'admin' | 'anggota',
    user?: User | null
  ): Promise<OrganizationMembership> {
    verifySuperadmin(user)
    await delay(120)
    const exists = localMemberships.find((m) => m.user_id === userId && m.organization_id === orgId)
    if (exists) {
      throw new Error('Pengguna ini sudah terdaftar sebagai anggota di organisasi ini.')
    }

    const resolvedLevel = level || 'anggota'
    const newMem: OrganizationMembership = {
      id: generateUUID(),
      user_id: userId,
      organization_id: orgId,
      role_id: roleId,
      level: resolvedLevel,
      status: 'active',
      created_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    }
    localMemberships = [newMem, ...localMemberships]
    setStorage('memberships', localMemberships)
    logAudit(user, 'create', 'Admin', newMem.id, orgId, undefined, newMem as unknown as Record<string, unknown>)
    return {
      ...newMem,
      user: localUsers.find((u) => u.id === userId),
      role: localRoles.find((r) => r.id === roleId),
      organization: localOrganizations.find((o) => o.id === orgId),
    }
  },

  // --------------------------------------------------------------------------
  // 3. ROLES & PERMISSIONS
  // --------------------------------------------------------------------------
  async getRoles(organizationId?: string, user?: User | null): Promise<RoleEntity[]> {
    await delay(100)
    verifyAccess(user, 'Role', 'viewAny', organizationId)
    // Return system roles + organization-specific roles if any
    return localRoles.filter(
      (r) => r.is_system || !r.organization_id || r.organization_id === organizationId
    )
  },

  async getRoleById(id: string, user?: User | null): Promise<RoleEntity | null> {
    await delay(80)
    const role = localRoles.find((r) => r.id === id)
    if (role) {
      verifyAccess(user, 'Role', 'view', role.organization_id)
    }
    return role || null
  },

  async createRole(
    data: Omit<RoleEntity, 'id' | 'created_at'>,
    user?: User | null
  ): Promise<RoleEntity> {
    verifyAccess(user, 'Role', 'create', data.organization_id)
    await delay(120)
    const newRole: RoleEntity = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    localRoles = [newRole, ...localRoles]
    setStorage('roles', localRoles)
    logAudit(user, 'create', 'Role', newRole.id, data.organization_id, undefined, newRole as unknown as Record<string, unknown>)
    return newRole
  },

  async updateRole(
    id: string,
    data: Partial<RoleEntity>,
    user?: User | null
  ): Promise<RoleEntity> {
    const role = localRoles.find((r) => r.id === id)
    if (!role) throw new Error('Peran tidak ditemukan')
    if (role.is_system && user?.role !== 'superadmin' && !user?.is_superadmin) {
      throw new Error('Peran sistem bawaan tidak dapat diubah kecuali oleh Superadmin')
    }
    verifyAccess(user, 'Role', 'update', role.organization_id)
    await delay(120)
    const index = localRoles.findIndex((r) => r.id === id)
    const oldVal = { ...localRoles[index] }
    localRoles[index] = { ...localRoles[index], ...data }
    setStorage('roles', localRoles)
    logAudit(user, 'update', 'Role', id, role.organization_id, oldVal as unknown as Record<string, unknown>, localRoles[index] as unknown as Record<string, unknown>)
    return localRoles[index]
  },

  async deleteRole(id: string, user?: User | null): Promise<void> {
    const role = localRoles.find((r) => r.id === id)
    if (!role) throw new Error('Peran tidak ditemukan')
    if (role.is_system) throw new Error('Peran sistem bawaan tidak dapat dihapus')
    verifyAccess(user, 'Role', 'delete', role.organization_id)
    await delay(120)
    localRoles = localRoles.filter((r) => r.id !== id)
    setStorage('roles', localRoles)
    logAudit(user, 'delete', 'Role', id, role.organization_id, role as unknown as Record<string, unknown>, undefined)
  },

  async cloneRole(sourceRoleId: string, newName: string, user?: User | null): Promise<RoleEntity> {
    verifyAccess(user, 'Role', 'create')
    await delay(120)
    const sourceRole = localRoles.find((r) => r.id === sourceRoleId)
    if (!sourceRole) throw new Error('Peran sumber tidak ditemukan')

    const newRole: RoleEntity = {
      id: `role-custom-${generateUUID().slice(0, 8)}`,
      name: newName,
      slug: newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: `Duplikasi dari ${sourceRole.name}`,
      status: 'active',
      is_system: false,
      permissions: [...sourceRole.permissions],
      created_at: new Date().toISOString(),
    }
    localRoles = [newRole, ...localRoles]
    setStorage('roles', localRoles)
    logAudit(user, 'create', 'Role', newRole.id, undefined, undefined, newRole as unknown as Record<string, unknown>)
    return newRole
  },

  // --------------------------------------------------------------------------
  // 4. STRUKTUR & SEKSI (Tupoksi)
  // --------------------------------------------------------------------------
  async getStructures(organizationId: string, user?: User | null): Promise<Structure[]> {
    await delay(100)
    verifyAccess(user, 'Structure', 'viewAny', organizationId)
    let structures = localStructures.filter((s) => s.organization_id === organizationId)

    // AUTO-PROVISIONING: Jika Organisasi belum memiliki record Struktur aktif, buat otomatis
    if (structures.length === 0 && organizationId) {
      const targetOrg = localOrganizations.find((o) => o.id === organizationId)
      const currentYear = new Date().getFullYear()
      const autoStructure: Structure = {
        id: generateUUID(),
        organization_id: organizationId,
        period_name: `Kepengurusan ${currentYear} - ${currentYear + 2}`,
        name: `Struktur ${targetOrg?.name || 'Organisasi'}`,
        start_year: currentYear,
        end_year: currentYear + 2,
        is_active: true,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      localStructures = [autoStructure, ...localStructures]
      setStorage('structures', localStructures)
      structures = [autoStructure]
    }

    return structures.map((s) => ({
      ...s,
      sections: localSections.filter((sec) => sec.structure_id === s.id),
    }))
  },

  async createStructure(
    data: Omit<Structure, 'id' | 'created_at' | 'updated_at' | 'sections'>,
    user?: User | null
  ): Promise<Structure> {
    verifyAccess(user, 'Structure', 'create', data.organization_id)
    await delay(120)
    const newStructure: Structure = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localStructures = [newStructure, ...localStructures]
    setStorage('structures', localStructures)
    logAudit(user, 'create', 'Structure', newStructure.id, data.organization_id, undefined, newStructure as unknown as Record<string, unknown>)
    return newStructure
  },

  async updateStructure(
    id: string,
    data: Partial<Structure>,
    user?: User | null
  ): Promise<Structure> {
    const struct = localStructures.find((s) => s.id === id)
    if (!struct) throw new Error('Struktur tidak ditemukan')
    verifyAccess(user, 'Structure', 'update', struct.organization_id)
    await delay(120)
    const index = localStructures.findIndex((s) => s.id === id)
    const oldVal = { ...localStructures[index] }
    localStructures[index] = {
      ...localStructures[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    setStorage('structures', localStructures)
    logAudit(user, 'update', 'Structure', id, struct.organization_id, oldVal as unknown as Record<string, unknown>, localStructures[index] as unknown as Record<string, unknown>)
    return localStructures[index]
  },

  async deleteStructure(id: string, user?: User | null): Promise<void> {
    const struct = localStructures.find((s) => s.id === id)
    if (!struct) throw new Error('Struktur tidak ditemukan')
    verifyAccess(user, 'Structure', 'delete', struct.organization_id)
    await delay(120)
    localStructures = localStructures.filter((s) => s.id !== id)
    setStorage('structures', localStructures)
    logAudit(user, 'delete', 'Structure', id, struct.organization_id, struct as unknown as Record<string, unknown>, undefined)
  },

  async getSections(organizationId: string, structureId?: string, user?: User | null): Promise<Section[]> {
    await delay(80)
    verifyAccess(user, 'Structure', 'viewAny', organizationId)
    let filtered = localSections.filter((s) => s.organization_id === organizationId)

    // Auto-reconciliation: Jika organisasi/jabatan belum memiliki seksi (misal baru dibuat atau data lama),
    // otomatis buatkan seksi default "Pelaksana Program" agar pengguna tidak terblokir saat membuat program kerja
    if (filtered.length === 0 && organizationId) {
      const org = localOrganizations.find((o) => o.id === organizationId)
      const struct = localStructures.find((s) => s.organization_id === organizationId)
      const autoSec: Section = {
        id: generateUUID(),
        structure_id: struct?.id || generateUUID(),
        organization_id: organizationId,
        name: org ? `Pelaksana ${org.name}` : 'Seksi Operasional & Pelaksana',
        code: `SEC-${org?.code || 'OPS'}`,
        description: 'Seksi pelaksana program kerja dan kegiatan operasional',
        created_at: new Date().toISOString(),
      }
      localSections = [...localSections, autoSec]
      setStorage('sections', localSections)
      filtered = [autoSec]
    }

    if (structureId) {
      filtered = filtered.filter((s) => s.structure_id === structureId)
    }
    return filtered.map((sec) => ({
      ...sec,
      personnels: localPersonnels.filter((p) => p.section_id === sec.id),
      programs: localPrograms.filter((p) => p.section_id === sec.id),
    }))
  },

  async createSection(
    data: Omit<Section, 'id' | 'created_at' | 'personnels' | 'programs'>,
    user?: User | null
  ): Promise<Section> {
    verifyAccess(user, 'Structure', 'create', data.organization_id)
    await delay(100)
    const newSection: Section = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    localSections = [...localSections, newSection]
    setStorage('sections', localSections)
    logAudit(user, 'create', 'Structure', newSection.id, data.organization_id, undefined, newSection as unknown as Record<string, unknown>)
    return newSection
  },

  async updateSection(
    id: string,
    data: Partial<Section>,
    user?: User | null
  ): Promise<Section> {
    const sec = localSections.find((s) => s.id === id)
    if (!sec) throw new Error('Seksi tidak ditemukan')
    verifyAccess(user, 'Structure', 'update', sec.organization_id)
    await delay(100)
    const index = localSections.findIndex((s) => s.id === id)
    const oldVal = { ...localSections[index] }
    localSections[index] = { ...localSections[index], ...data }
    setStorage('sections', localSections)
    logAudit(user, 'update', 'Structure', id, sec.organization_id, oldVal as unknown as Record<string, unknown>, localSections[index] as unknown as Record<string, unknown>)
    return localSections[index]
  },

  async deleteSection(id: string, user?: User | null): Promise<void> {
    const sec = localSections.find((s) => s.id === id)
    if (!sec) throw new Error('Seksi tidak ditemukan')
    verifyAccess(user, 'Structure', 'delete', sec.organization_id)
    await delay(100)
    localSections = localSections.filter((s) => s.id !== id)
    setStorage('sections', localSections)
    logAudit(user, 'delete', 'Structure', id, sec.organization_id, sec as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 5. PERSONEL (Tupoksi & Penugasan)
  // --------------------------------------------------------------------------
  async getPersonnels(organizationId?: string, sectionId?: string, user?: User | null): Promise<Personnel[]> {
    await delay(80)
    if (organizationId) {
      verifyAccess(user, 'Structure', 'viewAny', organizationId)
    }

    // Auto-reconciliation: Jika ada organisasi yang belum memiliki personel (misal dibuat sebelum auto-provisioning),
    // buatkan personel secara otomatis sehingga posisi jabatan langsung dapat dipilih di formulir akun & penempatan
    let personnelsUpdated = false
    const existingOrgIds = new Set(localPersonnels.map((p) => p.organization_id).filter(Boolean))
    for (const org of localOrganizations) {
      if (!existingOrgIds.has(org.id)) {
        const autoPrs: Personnel = {
          id: generateUUID(),
          section_id: 'sec-pimpinan',
          organization_id: org.id,
          role_title: org.name,
          position: org.name,
          node_type: (org.unit_type as any) === 'kepala_pengurus' ? 'ketua' : 'jabatan',
          tupoksi: org.description || `Pemegang amanah dan pimpinan ${org.name}`,
          status: 'active',
          created_at: org.created_at || new Date().toISOString(),
        }
        localPersonnels = [autoPrs, ...localPersonnels]
        existingOrgIds.add(org.id)
        personnelsUpdated = true
      }
    }
    if (personnelsUpdated) {
      setStorage('personnels', localPersonnels)
    }

    let filtered = organizationId
      ? localPersonnels.filter((p) => p.organization_id === organizationId)
      : [...localPersonnels]
    if (sectionId) {
      filtered = filtered.filter((p) => p.section_id === sectionId)
    }
    return filtered.map((prs) => ({
      ...prs,
      section: localSections.find((s) => s.id === prs.section_id),
      user: prs.user_id ? localUsers.find((u) => u.id === prs.user_id) : undefined,
    }))
  },

  async createPersonnel(
    data: Omit<Personnel, 'id' | 'created_at' | 'section' | 'user'>,
    user?: User | null
  ): Promise<Personnel> {
    verifyAccess(user, 'Structure', 'create', data.organization_id)
    await delay(100)
    const newPrs: Personnel = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    localPersonnels = [newPrs, ...localPersonnels]
    setStorage('personnels', localPersonnels)
    logAudit(user, 'create', 'Structure', newPrs.id, data.organization_id, undefined, newPrs as unknown as Record<string, unknown>)
    return newPrs
  },

  async updatePersonnel(
    id: string,
    data: Partial<Personnel>,
    user?: User | null
  ): Promise<Personnel> {
    const prs = localPersonnels.find((p) => p.id === id)
    if (!prs) throw new Error('Personel tidak ditemukan')
    verifyAccess(user, 'Structure', 'update', prs.organization_id)
    await delay(100)
    const index = localPersonnels.findIndex((p) => p.id === id)
    const oldVal = { ...localPersonnels[index] }
    localPersonnels[index] = { ...localPersonnels[index], ...data }
    setStorage('personnels', localPersonnels)
    logAudit(user, 'update', 'Structure', id, prs.organization_id, oldVal as unknown as Record<string, unknown>, localPersonnels[index] as unknown as Record<string, unknown>)
    return localPersonnels[index]
  },

  async deletePersonnel(
    id: string,
    options?: { reassignToParentId?: string | null; cascade?: boolean },
    user?: User | null
  ): Promise<void> {
    const prs = localPersonnels.find((p) => p.id === id)
    if (!prs) throw new Error('Personel tidak ditemukan')
    verifyAccess(user, 'Structure', 'delete', prs.organization_id)
    await delay(100)

    if (options?.cascade) {
      // Find all recursive descendants and delete them
      const toDelete = new Set<string>([id])
      let added = true
      while (added) {
        added = false
        for (const p of localPersonnels) {
          if (p.parent_id && toDelete.has(p.parent_id) && !toDelete.has(p.id)) {
            toDelete.add(p.id)
            added = true
          }
        }
      }
      localPersonnels = localPersonnels.filter((p) => !toDelete.has(p.id))
    } else {
      // Reassign children to specified parent or this node's parent
      const newParentId = options?.reassignToParentId !== undefined ? options.reassignToParentId : (prs.parent_id || null)
      localPersonnels = localPersonnels
        .map((p) => {
          if (p.parent_id === id) {
            return { ...p, parent_id: newParentId }
          }
          return p
        })
        .filter((p) => p.id !== id)
    }

    setStorage('personnels', localPersonnels)
    logAudit(user, 'delete', 'Structure', id, prs.organization_id, prs as unknown as Record<string, unknown>, undefined)
  },

  async movePersonnel(
    id: string,
    newParentId: string | null,
    newSortOrder?: number,
    user?: User | null
  ): Promise<Personnel> {
    const prs = localPersonnels.find((p) => p.id === id)
    if (!prs) throw new Error('Personel tidak ditemukan')
    verifyAccess(user, 'Structure', 'update', prs.organization_id)

    // Check circular relationship!
    if (newParentId === id) {
      throw new Error('Jabatan tidak dapat menjadi atasan dari dirinya sendiri.')
    }
    if (newParentId) {
      let currentCheck: string | null | undefined = newParentId
      while (currentCheck) {
        if (currentCheck === id) {
          throw new Error('Hubungan hierarki sirkular terdeteksi: Tidak dapat memindahkan atasan ke bawahannya.')
        }
        const parentNode = localPersonnels.find((p) => p.id === currentCheck)
        currentCheck = parentNode ? parentNode.parent_id : null
      }
    }

    await delay(100)
    const index = localPersonnels.findIndex((p) => p.id === id)
    const oldVal = { ...localPersonnels[index] }
    localPersonnels[index] = {
      ...localPersonnels[index],
      parent_id: newParentId,
      sort_order: newSortOrder !== undefined ? newSortOrder : localPersonnels[index].sort_order,
      updated_at: new Date().toISOString(),
    }
    setStorage('personnels', localPersonnels)
    logAudit(user, 'update', 'Structure', id, prs.organization_id, oldVal as unknown as Record<string, unknown>, localPersonnels[index] as unknown as Record<string, unknown>)
    return localPersonnels[index]
  },

  // --------------------------------------------------------------------------
  // 6. PROGRAM KERJA (Lifecycle Flow)
  // --------------------------------------------------------------------------
  async getPrograms(
    scope: OrganizationScopeInput,
    user?: User | null
  ): Promise<Program[]> {
    ensureAccountContext(user)
    await delay(100)
    const { organizationId, mode, targetIds } = resolveOrganizationScope(scope, localOrganizations)
    verifyAccess(user, 'Program', 'viewAny', organizationId, mode)
    const targetSet = new Set(targetIds)
    return localPrograms
      .filter((p) => targetSet.has(p.organization_id))
      .map((p) => ({
        ...p,
        duration_type: p.duration_type || 'terbatas',
        section: localSections.find((s) => s.id === p.section_id),
        agendas: localAgendas.filter((a) => a.program_id === p.id),
        performances: localPerformances.filter((perf) => perf.program_id === p.id),
        assigned_to_organization: p.assigned_to_organization_id
          ? localOrganizations.find((o) => o.id === p.assigned_to_organization_id) || null
          : null,
      }))
  },

  async getProgramById(id: string, user?: User | null): Promise<Program | null> {
    ensureAccountContext(user)
    await delay(80)
    const program = localPrograms.find((p) => p.id === id)
    if (!program) return null
    verifyAccess(user, 'Program', 'view', program.organization_id, 'descendants')
    return {
      ...program,
      duration_type: program.duration_type || 'terbatas',
      section: localSections.find((s) => s.id === program.section_id),
      agendas: localAgendas.filter((a) => a.program_id === program.id),
      performances: localPerformances.filter((perf) => perf.program_id === program.id),
      assigned_to_organization: program.assigned_to_organization_id
        ? localOrganizations.find((o) => o.id === program.assigned_to_organization_id) || null
        : null,
    }
  },

  async createProgram(
    data: Omit<Program, 'id' | 'created_at' | 'updated_at' | 'section' | 'agendas' | 'performances' | 'organization' | 'pic_personnel' | 'assigned_to_organization'>,
    user?: User | null
  ): Promise<Program> {
    ensureAccountContext(user)
    verifyAccess(user, 'Program', 'create', data.organization_id)

    // Stage 6: Enforce downward-control assignment authorization
    if (data.assigned_to_organization_id) {
      assertCanAssignToOrganization(
        data.organization_id,
        data.assigned_to_organization_id,
        localOrganizations,
        user
      )
    }

    // Validation: duration_type and date constraints
    const durationType = data.duration_type || 'terbatas'
    if (durationType === 'terbatas' || durationType === 'jangka_panjang') {
      if (!data.start_date) throw new Error('Tanggal mulai pelaksanaan wajib diisi.')
      if (!data.end_date) throw new Error('Tanggal selesai pelaksanaan wajib diisi.')
      if (data.end_date < data.start_date) {
        throw new Error('Tanggal selesai tidak boleh mendahului tanggal mulai pelaksanaan.')
      }
    } else if (durationType === 'rutin') {
      if (!data.start_date) throw new Error('Tanggal mulai pelaksanaan wajib diisi.')
      // Ensure end_date is cleared/empty for routine programs
      data.end_date = ''
    }

    await delay(120)
    const newProg: Program = {
      ...data,
      duration_type: durationType,
      id: generateUUID(),
      created_by: user?.id || data.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localPrograms = [newProg, ...localPrograms]
    setStorage('programs', localPrograms)

    // Automatically create corresponding Budget allocation record
    const allocated = newProg.budget_allocated || newProg.budget_planned || 0
    if (allocated > 0) {
      const newBudget: Budget = {
        id: generateUUID(),
        organization_id: newProg.organization_id,
        program_id: newProg.id,
        status: 'approved',
        allocated_amount: allocated,
        realized_amount: 0,
        remaining_balance: allocated,
        fiscal_year: new Date().getFullYear(),
        notes: `Alokasi anggaran awal program ${newProg.title || newProg.name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      localBudgets = [newBudget, ...localBudgets]
      setStorage('budgets', localBudgets)
    }

    logAudit(user, 'create', 'Program', newProg.id, data.organization_id, undefined, newProg as unknown as Record<string, unknown>)
    return newProg
  },

  async updateProgram(
    id: string,
    data: Partial<Program>,
    user?: User | null
  ): Promise<Program> {
    ensureAccountContext(user)
    const prog = localPrograms.find((p) => p.id === id)
    if (!prog) throw new Error('Program kerja tidak ditemukan')
    verifyAccess(user, 'Program', 'update', prog.organization_id)

    // Stage 6: Enforce downward-control assignment authorization on change
    if ('assigned_to_organization_id' in data) {
      const targetId = data.assigned_to_organization_id
      if (targetId) {
        assertCanAssignToOrganization(
          prog.organization_id,
          targetId,
          localOrganizations,
          user
        )
      }
      // If targetId is null/undefined — clearing the assignment is always allowed
    }

    // Validation: duration_type and date constraints on update
    const resolvedDurationType = data.duration_type || prog.duration_type || 'terbatas'
    const resolvedStartDate = 'start_date' in data ? data.start_date : prog.start_date
    let resolvedEndDate = 'end_date' in data ? data.end_date : prog.end_date

    if (resolvedDurationType === 'terbatas' || resolvedDurationType === 'jangka_panjang') {
      if (!resolvedStartDate) throw new Error('Tanggal mulai pelaksanaan wajib diisi.')
      if (!resolvedEndDate) throw new Error('Tanggal selesai pelaksanaan wajib diisi.')
      if (resolvedEndDate < resolvedStartDate) {
        throw new Error('Tanggal selesai tidak boleh mendahului tanggal mulai pelaksanaan.')
      }
    } else if (resolvedDurationType === 'rutin') {
      if (!resolvedStartDate) throw new Error('Tanggal mulai pelaksanaan wajib diisi.')
      resolvedEndDate = ''
      data.end_date = ''
    }

    // Protect program ownership: organization_id is canonical and CANNOT be altered
    const { organization_id: _ignoredOrgId, ...safeData } = data

    // If status transition is requested via updateProgram, validate and enforce approval gate if approving
    if (safeData.status && safeData.status !== prog.status) {
      if (!canTransitionProgramStatus(prog.status, safeData.status, prog.duration_type)) {
        throw new Error(`Transisi status program dari [${prog.status}] ke [${safeData.status}] tidak diizinkan dalam siklus kerja.`)
      }
      if (safeData.status === 'approved') {
        assertCanApproveProgram(user, prog, localOrganizations)
        safeData.approved_by = user?.id
        safeData.approved_by_organization_id = (user?.is_superadmin || user?.role === 'superadmin')
          ? (user?.active_membership?.organization_id || 'system-superadmin')
          : user?.active_membership?.organization_id
        safeData.approved_at = new Date().toISOString()
      }
    }

    await delay(120)
    const index = localPrograms.findIndex((p) => p.id === id)
    const oldVal = { ...localPrograms[index] }
    localPrograms[index] = {
      ...localPrograms[index],
      ...safeData,
      organization_id: prog.organization_id, // Immutable ownership guarantee
      updated_at: new Date().toISOString(),
    }
    setStorage('programs', localPrograms)

    // Audit assignment change specifically for traceability
    const assignmentChanged = 'assigned_to_organization_id' in data &&
      data.assigned_to_organization_id !== oldVal.assigned_to_organization_id
    if (assignmentChanged) {
      logAudit(
        user, 'update', 'Program', id, prog.organization_id,
        { assigned_to_organization_id: oldVal.assigned_to_organization_id },
        { assigned_to_organization_id: data.assigned_to_organization_id }
      )
    } else {
      logAudit(user, 'update', 'Program', id, prog.organization_id, oldVal as unknown as Record<string, unknown>, localPrograms[index] as unknown as Record<string, unknown>)
    }

    return localPrograms[index]
  },

  async transitionProgramStatus(
    id: string,
    nextStatus: ProgramStatus,
    user?: User | null
  ): Promise<Program> {
    ensureAccountContext(user)
    const prog = localPrograms.find((p) => p.id === id)
    if (!prog) throw new Error('Program kerja tidak ditemukan')

    if (!canTransitionProgramStatus(prog.status, nextStatus, prog.duration_type)) {
      throw new Error(`Transisi status program dari [${prog.status}] ke [${nextStatus}] tidak diizinkan dalam siklus kerja.`)
    }

    // Stage 4: Hierarchical Approval Security Gate vs Standard Ownership Update
    if (nextStatus === 'approved') {
      assertCanApproveProgram(user, prog, localOrganizations)
    } else {
      verifyAccess(user, 'Program', 'update', prog.organization_id)
    }

    await delay(100)
    const index = localPrograms.findIndex((p) => p.id === id)
    const oldStatus = prog.status
    const updatePayload: Partial<Program> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }

    if (nextStatus === 'approved') {
      updatePayload.approved_by = user?.id
      updatePayload.approved_by_organization_id = (user?.is_superadmin || user?.role === 'superadmin')
        ? (user?.active_membership?.organization_id || 'system-superadmin')
        : user?.active_membership?.organization_id
      updatePayload.approved_at = new Date().toISOString()
    }

    // IMMUTABLE OWNERSHIP: organization_id and created_by remain strictly untouched
    localPrograms[index] = {
      ...localPrograms[index],
      ...updatePayload,
      organization_id: prog.organization_id,
    }
    setStorage('programs', localPrograms)
    logAudit(user, 'update', 'Program', id, prog.organization_id, { status: oldStatus }, { status: nextStatus })
    return localPrograms[index]
  },

  async deleteProgram(id: string, user?: User | null): Promise<void> {
    ensureAccountContext(user)
    const prog = localPrograms.find((p) => p.id === id)
    if (!prog) throw new Error('Program kerja tidak ditemukan')
    verifyAccess(user, 'Program', 'delete', prog.organization_id)
    await delay(120)
    localPrograms = localPrograms.filter((p) => p.id !== id)
    setStorage('programs', localPrograms)
    logAudit(user, 'delete', 'Program', id, prog.organization_id, prog as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 7. AGENDA & KEGIATAN
  // --------------------------------------------------------------------------
  async getAgendas(
    scope: OrganizationScopeInput,
    programId?: string,
    user?: User | null
  ): Promise<Agenda[]> {
    ensureAccountContext(user)
    await delay(80)
    const { organizationId, mode, targetIds } = resolveOrganizationScope(scope, localOrganizations)
    verifyAccess(user, 'Agenda', 'viewAny', organizationId, mode)
    const targetSet = new Set(targetIds)
    let filtered = localAgendas.filter((a) => targetSet.has(a.organization_id))
    if (programId) {
      filtered = filtered.filter((a) => a.program_id === programId)
    }
    return filtered.map((a) => ({
      ...a,
      program: localPrograms.find((p) => p.id === a.program_id),
      section: localSections.find((s) => s.id === a.section_id),
      pic_user: a.pic_user_id ? localUsers.find((u) => u.id === a.pic_user_id) : undefined,
    }))
  },

  async getAgendaById(id: string, user?: User | null): Promise<Agenda | null> {
    ensureAccountContext(user)
    await delay(80)
    const agenda = localAgendas.find((a) => a.id === id)
    if (!agenda) return null
    verifyAccess(user, 'Agenda', 'view', agenda.organization_id)
    return {
      ...agenda,
      program: localPrograms.find((p) => p.id === agenda.program_id),
      section: localSections.find((s) => s.id === agenda.section_id),
      pic_user: agenda.pic_user_id ? localUsers.find((u) => u.id === agenda.pic_user_id) : undefined,
    }
  },

  async createAgenda(
    data: Omit<Agenda, 'id' | 'created_at' | 'program' | 'section' | 'pic_user'>,
    user?: User | null
  ): Promise<Agenda> {
    ensureAccountContext(user)
    verifyAccess(user, 'Agenda', 'create', data.organization_id)
    await delay(100)
    const newAgenda: Agenda = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    localAgendas = [newAgenda, ...localAgendas]
    setStorage('agendas', localAgendas)
    logAudit(user, 'create', 'Agenda', newAgenda.id, data.organization_id, undefined, newAgenda as unknown as Record<string, unknown>)
    return newAgenda
  },

  async updateAgenda(
    id: string,
    data: Partial<Agenda>,
    user?: User | null
  ): Promise<Agenda> {
    ensureAccountContext(user)
    const agenda = localAgendas.find((a) => a.id === id)
    if (!agenda) throw new Error('Agenda tidak ditemukan')
    verifyAccess(user, 'Agenda', 'update', agenda.organization_id)
    await delay(100)
    const index = localAgendas.findIndex((a) => a.id === id)
    const oldVal = { ...localAgendas[index] }
    localAgendas[index] = { ...localAgendas[index], ...data }
    setStorage('agendas', localAgendas)
    logAudit(user, 'update', 'Agenda', id, agenda.organization_id, oldVal as unknown as Record<string, unknown>, localAgendas[index] as unknown as Record<string, unknown>)
    return localAgendas[index]
  },

  async transitionAgendaStatus(
    id: string,
    nextStatus: AgendaStatus,
    user?: User | null
  ): Promise<Agenda> {
    ensureAccountContext(user)
    const agenda = localAgendas.find((a) => a.id === id)
    if (!agenda) throw new Error('Agenda tidak ditemukan')
    verifyAccess(user, 'Agenda', 'update', agenda.organization_id)

    if (!canTransitionAgendaStatus(agenda.status, nextStatus)) {
      throw new Error(`Transisi status agenda dari [${agenda.status}] ke [${nextStatus}] tidak diizinkan.`)
    }

    await delay(80)
    const index = localAgendas.findIndex((a) => a.id === id)
    const oldStatus = agenda.status
    localAgendas[index] = { ...localAgendas[index], status: nextStatus }
    setStorage('agendas', localAgendas)
    logAudit(user, 'update', 'Agenda', id, agenda.organization_id, { status: oldStatus }, { status: nextStatus })
    return localAgendas[index]
  },

  async deleteAgenda(id: string, user?: User | null): Promise<void> {
    ensureAccountContext(user)
    const agenda = localAgendas.find((a) => a.id === id)
    if (!agenda) throw new Error('Agenda tidak ditemukan')
    verifyAccess(user, 'Agenda', 'delete', agenda.organization_id)
    await delay(100)
    localAgendas = localAgendas.filter((a) => a.id !== id)
    setStorage('agendas', localAgendas)
    logAudit(user, 'delete', 'Agenda', id, agenda.organization_id, agenda as unknown as Record<string, unknown>, undefined)
  },

  async bulkDeleteAgendas(ids: string[], user?: User | null): Promise<{ deleted: number; denied: string[] }> {
    ensureAccountContext(user)
    if (!ids || ids.length === 0) return { deleted: 0, denied: [] }

    // Step 1: Load and authorize each record individually
    const toDelete: typeof localAgendas = []
    const denied: string[] = []
    for (const id of ids) {
      const agenda = localAgendas.find((a) => a.id === id)
      if (!agenda) { denied.push(id); continue }
      try {
        verifyAccess(user, 'Agenda', 'delete', agenda.organization_id)
        toDelete.push(agenda)
      } catch {
        denied.push(id)
      }
    }

    if (toDelete.length === 0) return { deleted: 0, denied }

    // Step 2: Only after full validation, delete the authorized set
    const toDeleteIds = new Set(toDelete.map((a) => a.id))
    localAgendas = localAgendas.filter((a) => !toDeleteIds.has(a.id))
    setStorage('agendas', localAgendas)

    // Step 3: Audit log per record
    for (const agenda of toDelete) {
      logAudit(user, 'delete', 'Agenda', agenda.id, agenda.organization_id, agenda as unknown as Record<string, unknown>, undefined)
    }

    return { deleted: toDelete.length, denied }
  },

  // --------------------------------------------------------------------------
  // 8. CAPAIAN KINERJA (KPI & Bukti)
  // --------------------------------------------------------------------------
  async getPerformances(
    scope: OrganizationScopeInput,
    programId?: string,
    user?: User | null
  ): Promise<Performance[]> {
    ensureAccountContext(user)
    await delay(80)
    const { organizationId, mode, targetIds } = resolveOrganizationScope(scope, localOrganizations)
    verifyAccess(user, 'Performance', 'viewAny', organizationId, mode)
    const targetSet = new Set(targetIds)
    let filtered = localPerformances.filter((p) => targetSet.has(p.organization_id))
    if (programId) {
      filtered = filtered.filter((p) => p.program_id === programId)
    }
    return filtered.map((perf) => ({
      ...perf,
      program: localPrograms.find((p) => p.id === perf.program_id),
    }))
  },

  async getPerformanceById(id: string, user?: User | null): Promise<Performance | null> {
    ensureAccountContext(user)
    await delay(80)
    const perf = localPerformances.find((p) => p.id === id)
    if (!perf) return null
    verifyAccess(user, 'Performance', 'view', perf.organization_id)
    return {
      ...perf,
      program: localPrograms.find((p) => p.id === perf.program_id),
    }
  },

  async createPerformance(
    data: Omit<Performance, 'id' | 'created_at' | 'updated_at' | 'program'>,
    user?: User | null
  ): Promise<Performance> {
    ensureAccountContext(user)
    verifyAccess(user, 'Performance', 'create', data.organization_id)
    const target = data.target ?? data.target_value ?? 100
    const realized = data.realized ?? data.realized_value ?? 0
    const percentage = target > 0 ? Math.min(100, Math.round((realized / target) * 100)) : 0
    const newPerf: Performance = {
      ...data,
      percentage,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localPerformances = [newPerf, ...localPerformances]
    setStorage('performances', localPerformances)
    logAudit(user, 'create', 'Performance', newPerf.id, data.organization_id, undefined, newPerf as unknown as Record<string, unknown>)
    return newPerf
  },

  async updatePerformance(
    id: string,
    data: Partial<Performance>,
    user?: User | null
  ): Promise<Performance> {
    ensureAccountContext(user)
    const perf = localPerformances.find((p) => p.id === id)
    if (!perf) throw new Error('Data capaian kinerja tidak ditemukan')
    verifyAccess(user, 'Performance', 'update', perf.organization_id)
    await delay(100)
    const index = localPerformances.findIndex((p) => p.id === id)
    const oldVal = { ...localPerformances[index] }
    const updatedTarget = data.target ?? data.target_value ?? perf.target ?? perf.target_value ?? 100
    const updatedRealized = data.realized ?? data.realized_value ?? perf.realized ?? perf.realized_value ?? 0
    const percentage = updatedTarget > 0 ? Math.min(100, Math.round((updatedRealized / updatedTarget) * 100)) : 0

    localPerformances[index] = {
      ...localPerformances[index],
      ...data,
      percentage,
      updated_at: new Date().toISOString(),
    }
    setStorage('performances', localPerformances)
    logAudit(user, 'update', 'Performance', id, perf.organization_id, oldVal as unknown as Record<string, unknown>, localPerformances[index] as unknown as Record<string, unknown>)
    return localPerformances[index]
  },

  async deletePerformance(id: string, user?: User | null): Promise<void> {
    ensureAccountContext(user)
    const perf = localPerformances.find((p) => p.id === id)
    if (!perf) throw new Error('Data capaian kinerja tidak ditemukan')
    verifyAccess(user, 'Performance', 'delete', perf.organization_id)
    await delay(100)
    localPerformances = localPerformances.filter((p) => p.id !== id)
    setStorage('performances', localPerformances)
    logAudit(user, 'delete', 'Performance', id, perf.organization_id, perf as unknown as Record<string, unknown>, undefined)
  },

  async bulkDeletePerformances(ids: string[], user?: User | null): Promise<{ deleted: number; denied: string[] }> {
    ensureAccountContext(user)
    if (!ids || ids.length === 0) return { deleted: 0, denied: [] }

    const toDelete: typeof localPerformances = []
    const denied: string[] = []
    for (const id of ids) {
      const perf = localPerformances.find((p) => p.id === id)
      if (!perf) { denied.push(id); continue }
      try {
        verifyAccess(user, 'Performance', 'delete', perf.organization_id)
        toDelete.push(perf)
      } catch {
        denied.push(id)
      }
    }

    if (toDelete.length === 0) return { deleted: 0, denied }

    const toDeleteIds = new Set(toDelete.map((p) => p.id))
    localPerformances = localPerformances.filter((p) => !toDeleteIds.has(p.id))
    setStorage('performances', localPerformances)

    for (const perf of toDelete) {
      logAudit(user, 'delete', 'Performance', perf.id, perf.organization_id, perf as unknown as Record<string, unknown>, undefined)
    }

    return { deleted: toDelete.length, denied }
  },

  // --------------------------------------------------------------------------
  // 9. KEUANGAN & TRANSAKSI (Anggaran & Realisasi)
  // --------------------------------------------------------------------------
  async getBudgets(
    scope: OrganizationScopeInput,
    programId?: string,
    user?: User | null
  ): Promise<Budget[]> {
    ensureAccountContext(user)
    await delay(80)
    const { organizationId, mode, targetIds } = resolveOrganizationScope(scope, localOrganizations)
    verifyAccess(user, 'Finance', 'viewAny', organizationId, mode)
    const targetSet = new Set(targetIds)
    let filtered = localBudgets.filter((b) => targetSet.has(b.organization_id))
    if (programId) {
      filtered = filtered.filter((b) => b.program_id === programId)
    }
    return filtered.map((b) => ({
      ...b,
      program: localPrograms.find((p) => p.id === b.program_id),
      transactions: localTransactions.filter((tx) => tx.budget_id === b.id),
    }))
  },

  async createBudget(
    data: Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'program' | 'transactions'>,
    user?: User | null
  ): Promise<Budget> {
    ensureAccountContext(user)
    verifyAccess(user, 'Finance', 'create', data.organization_id)
    await delay(100)
    const newBudget: Budget = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localBudgets = [newBudget, ...localBudgets]
    setStorage('budgets', localBudgets)
    logAudit(user, 'create', 'Finance', newBudget.id, data.organization_id, undefined, newBudget as unknown as Record<string, unknown>)
    return newBudget
  },

  async updateBudget(
    id: string,
    data: Partial<Budget>,
    user?: User | null
  ): Promise<Budget> {
    ensureAccountContext(user)
    const b = localBudgets.find((item) => item.id === id)
    if (!b) throw new Error('Data anggaran tidak ditemukan')
    verifyAccess(user, 'Finance', 'update', b.organization_id)
    await delay(100)
    const index = localBudgets.findIndex((item) => item.id === id)
    const oldVal = { ...localBudgets[index] }
    localBudgets[index] = {
      ...localBudgets[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    setStorage('budgets', localBudgets)
    logAudit(user, 'update', 'Finance', id, b.organization_id, oldVal as unknown as Record<string, unknown>, localBudgets[index] as unknown as Record<string, unknown>)
    return localBudgets[index]
  },

  async deleteBudget(id: string, user?: User | null): Promise<void> {
    ensureAccountContext(user)
    const b = localBudgets.find((item) => item.id === id)
    if (!b) throw new Error('Data anggaran tidak ditemukan')
    verifyAccess(user, 'Finance', 'delete', b.organization_id)
    await delay(100)
    localBudgets = localBudgets.filter((item) => item.id !== id)
    setStorage('budgets', localBudgets)
    logAudit(user, 'delete', 'Finance', id, b.organization_id, b as unknown as Record<string, unknown>, undefined)
  },

  async getTransactions(
    scope: OrganizationScopeInput,
    budgetId?: string,
    user?: User | null
  ): Promise<Transaction[]> {
    ensureAccountContext(user)
    await delay(80)
    const { organizationId, mode, targetIds } = resolveOrganizationScope(scope, localOrganizations)
    verifyAccess(user, 'Finance', 'viewAny', organizationId, mode)
    const targetSet = new Set(targetIds)
    let filtered = localTransactions.filter((t) => targetSet.has(t.organization_id))
    if (budgetId) {
      filtered = filtered.filter((t) => t.budget_id === budgetId)
    }
    return filtered.map((tx) => ({
      ...tx,
      budget: localBudgets.find((b) => b.id === tx.budget_id),
      recorder: tx.recorded_by ? localUsers.find((u) => u.id === tx.recorded_by) : undefined,
    }))
  },

  async createTransaction(
    data: Omit<Transaction, 'id' | 'created_at' | 'budget' | 'recorder'>,
    user?: User | null
  ): Promise<Transaction> {
    ensureAccountContext(user)
    verifyAccess(user, 'Finance', 'create', data.organization_id)
    await delay(100)
    const newTx: Transaction = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    localTransactions = [newTx, ...localTransactions]
    setStorage('transactions', localTransactions)

    // Update parent Budget realized amount and remaining balance if expense
    if (newTx.type === 'expense') {
      const budgetIndex = localBudgets.findIndex((b) => b.id === newTx.budget_id)
      if (budgetIndex !== -1) {
        const budget = localBudgets[budgetIndex]
        const realizedBase = budget.realized_amount || budget.amount_spent || 0
        const allocatedBase = budget.allocated_amount || budget.amount_allocated || budget.planned_amount || 0
        const newRealized = Math.max(0, realizedBase + newTx.amount)
        const newBalance = Math.max(0, allocatedBase - newRealized)
        localBudgets[budgetIndex] = {
          ...budget,
          realized_amount: newRealized,
          remaining_balance: newBalance,
          updated_at: new Date().toISOString(),
        }
        setStorage('budgets', localBudgets)

        // Also sync to program's budget_realized
        const progIndex = localPrograms.findIndex((p) => p.id === budget.program_id)
        if (progIndex !== -1) {
          localPrograms[progIndex] = {
            ...localPrograms[progIndex],
            budget_realized: newRealized,
            updated_at: new Date().toISOString(),
          }
          setStorage('programs', localPrograms)
        }
      }
    }

    logAudit(user, 'create', 'Finance', newTx.id, data.organization_id, undefined, newTx as unknown as Record<string, unknown>)
    return newTx
  },

  async deleteTransaction(id: string, user?: User | null): Promise<void> {
    ensureAccountContext(user)
    const tx = localTransactions.find((t) => t.id === id)
    if (!tx) throw new Error('Transaksi tidak ditemukan')
    verifyAccess(user, 'Finance', 'delete', tx.organization_id)
    await delay(100)
    localTransactions = localTransactions.filter((t) => t.id !== id)
    setStorage('transactions', localTransactions)

    // Revert budget realization if it was an expense
    if (tx.type === 'expense') {
      const budgetIndex = localBudgets.findIndex((b) => b.id === tx.budget_id)
      if (budgetIndex !== -1) {
        const budget = localBudgets[budgetIndex]
        const realizedBase = budget.realized_amount || budget.amount_spent || 0
        const allocatedBase = budget.allocated_amount || budget.amount_allocated || budget.planned_amount || 0
        const newRealized = Math.max(0, realizedBase - tx.amount)
        const newBalance = Math.max(0, allocatedBase - newRealized)
        localBudgets[budgetIndex] = {
          ...budget,
          realized_amount: newRealized,
          remaining_balance: newBalance,
          updated_at: new Date().toISOString(),
        }
        setStorage('budgets', localBudgets)

        const progIndex = localPrograms.findIndex((p) => p.id === budget.program_id)
        if (progIndex !== -1) {
          localPrograms[progIndex] = {
            ...localPrograms[progIndex],
            budget_realized: newRealized,
            updated_at: new Date().toISOString(),
          }
          setStorage('programs', localPrograms)
        }
      }
    }

    logAudit(user, 'delete', 'Finance', id, tx.organization_id, tx as unknown as Record<string, unknown>, undefined)
  },

  async updateTransaction(
    id: string,
    data: Partial<Omit<Transaction, 'id' | 'created_at' | 'budget' | 'recorder'>>,
    user?: User | null
  ): Promise<Transaction> {
    ensureAccountContext(user)
    const oldTx = localTransactions.find((t) => t.id === id)
    if (!oldTx) throw new Error('Transaksi tidak ditemukan')
    verifyAccess(user, 'Finance', 'update', oldTx.organization_id)
    await delay(100)

    // Revert old budget impact (if old was expense)
    if (oldTx.type === 'expense') {
      const bi = localBudgets.findIndex((b) => b.id === oldTx.budget_id)
      if (bi !== -1) {
        const b = localBudgets[bi]
        const alloc = b.allocated_amount || b.amount_allocated || b.planned_amount || 0
        const newReal = Math.max(0, (b.realized_amount || 0) - oldTx.amount)
        localBudgets[bi] = { ...b, realized_amount: newReal, remaining_balance: Math.max(0, alloc - newReal), updated_at: new Date().toISOString() }
        setStorage('budgets', localBudgets)
      }
    }

    const updated: Transaction = { ...oldTx, ...data }
    localTransactions = localTransactions.map((t) => (t.id === id ? updated : t))
    setStorage('transactions', localTransactions)

    // Apply new budget impact (if new/updated is expense)
    if (updated.type === 'expense') {
      const bi = localBudgets.findIndex((b) => b.id === updated.budget_id)
      if (bi !== -1) {
        const b = localBudgets[bi]
        const alloc = b.allocated_amount || b.amount_allocated || b.planned_amount || 0
        const newReal = Math.max(0, (b.realized_amount || 0) + updated.amount)
        localBudgets[bi] = { ...b, realized_amount: newReal, remaining_balance: Math.max(0, alloc - newReal), updated_at: new Date().toISOString() }
        setStorage('budgets', localBudgets)
      }
    }

    logAudit(user, 'update', 'Finance', id, oldTx.organization_id, oldTx as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>)
    return updated
  },

  // --------------------------------------------------------------------------
  // 10. LAPORAN & EVALUASI (Verifikasi Ketua)
  // --------------------------------------------------------------------------
  async getReports(
    scope: OrganizationScopeInput,
    programId?: string,
    user?: User | null
  ): Promise<Report[]> {
    ensureAccountContext(user)
    await delay(80)
    const { organizationId, mode, targetIds } = resolveOrganizationScope(scope, localOrganizations)
    verifyAccess(user, 'Report', 'viewAny', organizationId, mode)
    const targetSet = new Set(targetIds)
    let filtered = localReports.filter((r) => targetSet.has(r.organization_id))
    if (programId) {
      filtered = filtered.filter((r) => r.program_id === programId)
    }
    return filtered.map((rep) => ({
      ...rep,
      program: localPrograms.find((p) => p.id === rep.program_id),
      author: localUsers.find((u) => u.id === rep.author_id),
      reviewer: rep.reviewer_id ? localUsers.find((u) => u.id === rep.reviewer_id) : undefined,
    }))
  },

  async getReportById(id: string, user?: User | null): Promise<Report | null> {
    ensureAccountContext(user)
    await delay(80)
    const report = localReports.find((r) => r.id === id)
    if (!report) return null
    verifyAccess(user, 'Report', 'view', report.organization_id)
    return {
      ...report,
      program: localPrograms.find((p) => p.id === report.program_id),
      author: localUsers.find((u) => u.id === report.author_id),
      reviewer: report.reviewer_id ? localUsers.find((u) => u.id === report.reviewer_id) : undefined,
    }
  },

  async createReport(
    data: Omit<Report, 'id' | 'created_at' | 'program' | 'author' | 'reviewer'>,
    user?: User | null
  ): Promise<Report> {
    ensureAccountContext(user)
    verifyAccess(user, 'Report', 'create', data.organization_id)
    await delay(100)
    const newReport: Report = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      submitted_at: data.status === 'submitted' ? new Date().toISOString() : undefined,
    }
    localReports = [newReport, ...localReports]
    setStorage('reports', localReports)

    // Notify ketua if report is submitted
    if (newReport.status === 'submitted') {
      const ketuaMem = localMemberships.find(
        (m) => m.organization_id === newReport.organization_id && m.role_id === 'role-ketua'
      )
      if (ketuaMem) {
        const notif: Notification = {
          id: generateUUID(),
          user_id: ketuaMem.user_id,
          organization_id: newReport.organization_id,
          title: 'Laporan Baru Memerlukan Peninjauan',
          message: `Laporan "${newReport.title}" telah diserahkan dan menanti persetujuan Anda.`,
          type: 'action_required',
          link: `/reports/${newReport.id}`,
          is_read: false,
          created_at: new Date().toISOString(),
        }
        localNotifications = [notif, ...localNotifications]
        setStorage('notifications', localNotifications)
      }
    }

    logAudit(user, 'create', 'Report', newReport.id, data.organization_id, undefined, newReport as unknown as Record<string, unknown>)
    return newReport
  },

  async updateReport(
    id: string,
    data: Partial<Report>,
    user?: User | null
  ): Promise<Report> {
    ensureAccountContext(user)
    const report = localReports.find((r) => r.id === id)
    if (!report) throw new Error('Laporan tidak ditemukan')
    verifyAccess(user, 'Report', 'update', report.organization_id)
    await delay(100)
    const index = localReports.findIndex((r) => r.id === id)
    const oldVal = { ...localReports[index] }
    localReports[index] = { ...localReports[index], ...data }
    setStorage('reports', localReports)
    logAudit(user, 'update', 'Report', id, report.organization_id, oldVal as unknown as Record<string, unknown>, localReports[index] as unknown as Record<string, unknown>)
    return localReports[index]
  },

  async transitionReportStatus(
    id: string,
    nextStatus: ReportStatus,
    reviewNotes?: string,
    user?: User | null
  ): Promise<Report> {
    ensureAccountContext(user)
    const report = localReports.find((r) => r.id === id)
    if (!report) throw new Error('Laporan tidak ditemukan')
    verifyAccess(user, 'Report', 'update', report.organization_id)

    if (!canTransitionReportStatus(report.status, nextStatus)) {
      throw new Error(`Transisi status laporan dari [${report.status}] ke [${nextStatus}] tidak diizinkan.`)
    }

    await delay(100)
    const index = localReports.findIndex((r) => r.id === id)
    const oldStatus = report.status
    const updatePayload: Partial<Report> = {
      status: nextStatus,
      review_notes: reviewNotes !== undefined ? reviewNotes : report.review_notes,
    }

    if (nextStatus === 'approved' || nextStatus === 'revised') {
      updatePayload.reviewer_id = user?.id
      updatePayload.reviewed_at = new Date().toISOString()
    }
    if (nextStatus === 'submitted') {
      updatePayload.submitted_at = new Date().toISOString()
    }

    localReports[index] = { ...localReports[index], ...updatePayload }
    setStorage('reports', localReports)

    // Notify Author
    const authorUser = localUsers.find((u) => u.id === report.author_id)
    if (authorUser) {
      const notif: Notification = {
        id: generateUUID(),
        user_id: report.author_id,
        organization_id: report.organization_id,
        title: nextStatus === 'approved' ? 'Laporan Telah Disetujui' : 'Catatan Revisi Laporan',
        message: nextStatus === 'approved'
          ? `Laporan "${report.title}" telah disetujui pimpinan.`
          : `Laporan "${report.title}" memerlukan perbaikan: ${reviewNotes || 'Lihat catatan evaluasi.'}`,
        type: nextStatus === 'approved' ? 'success' : 'warning',
        link: `/reports/${report.id}`,
        is_read: false,
        created_at: new Date().toISOString(),
      }
      localNotifications = [notif, ...localNotifications]
      setStorage('notifications', localNotifications)
    }

    logAudit(user, 'update', 'Report', id, report.organization_id, { status: oldStatus }, { status: nextStatus, review_notes: reviewNotes })
    return localReports[index]
  },

  async deleteReport(id: string, user?: User | null): Promise<void> {
    ensureAccountContext(user)
    const report = localReports.find((r) => r.id === id)
    if (!report) throw new Error('Laporan tidak ditemukan')
    verifyAccess(user, 'Report', 'delete', report.organization_id)
    await delay(100)
    localReports = localReports.filter((r) => r.id !== id)
    setStorage('reports', localReports)
    logAudit(user, 'delete', 'Report', id, report.organization_id, report as unknown as Record<string, unknown>, undefined)
  },

  /**
   * Bulk delete Reports.
   * Business rule: Only reports with status 'draft' or 'revised' are eligible.
   * Reports with status submitted/in_review/approved/archived are always protected.
   */
  async bulkDeleteReports(ids: string[], user?: User | null): Promise<{ deleted: number; denied: string[]; protected: string[] }> {
    ensureAccountContext(user)
    if (!ids || ids.length === 0) return { deleted: 0, denied: [], protected: [] }

    const DELETABLE_STATUSES = new Set(['draft', 'revised'])
    const toDelete: typeof localReports = []
    const denied: string[] = []
    const protectedIds: string[] = []

    for (const id of ids) {
      const report = localReports.find((r) => r.id === id)
      if (!report) { denied.push(id); continue }

      // Business rule: only draft/revised can be bulk-deleted
      if (!DELETABLE_STATUSES.has(report.status)) {
        protectedIds.push(id)
        continue
      }

      try {
        verifyAccess(user, 'Report', 'delete', report.organization_id)
        toDelete.push(report)
      } catch {
        denied.push(id)
      }
    }

    if (toDelete.length === 0) return { deleted: 0, denied, protected: protectedIds }

    const toDeleteIds = new Set(toDelete.map((r) => r.id))
    localReports = localReports.filter((r) => !toDeleteIds.has(r.id))
    setStorage('reports', localReports)

    for (const report of toDelete) {
      logAudit(user, 'delete', 'Report', report.id, report.organization_id, report as unknown as Record<string, unknown>, undefined)
    }

    return { deleted: toDelete.length, denied, protected: protectedIds }
  },

  // --------------------------------------------------------------------------
  // 11. TINDAK LANJUT & TUGAS (Task Execution)
  // --------------------------------------------------------------------------
  async getTasks(
    scope: OrganizationScopeInput,
    programId?: string,
    user?: User | null
  ): Promise<Task[]> {
    ensureAccountContext(user)
    await delay(80)
    const { organizationId, mode, targetIds } = resolveOrganizationScope(scope, localOrganizations)
    verifyAccess(user, 'Task', 'viewAny', organizationId, mode)
    const targetSet = new Set(targetIds)
    let filtered = localTasks.filter((t) => targetSet.has(t.organization_id))
    if (programId) {
      filtered = filtered.filter((t) => t.program_id === programId)
    }
    return filtered.map((t) => ({
      ...t,
      program: localPrograms.find((p) => p.id === t.program_id),
      agenda: t.agenda_id ? localAgendas.find((a) => a.id === t.agenda_id) : undefined,
      assignee: t.assigned_to ? localUsers.find((u) => u.id === t.assigned_to) : undefined,
      assigned_to_organization: t.assigned_to_organization_id
        ? localOrganizations.find((o) => o.id === t.assigned_to_organization_id) || null
        : null,
    }))
  },

  async getTaskById(id: string, user?: User | null): Promise<Task | null> {
    ensureAccountContext(user)
    await delay(80)
    const task = localTasks.find((t) => t.id === id)
    if (!task) return null
    verifyAccess(user, 'Task', 'view', task.organization_id)
    return {
      ...task,
      program: localPrograms.find((p) => p.id === task.program_id),
      agenda: task.agenda_id ? localAgendas.find((a) => a.id === task.agenda_id) : undefined,
      assignee: task.assigned_to ? localUsers.find((u) => u.id === task.assigned_to) : undefined,
      assigned_to_organization: task.assigned_to_organization_id
        ? localOrganizations.find((o) => o.id === task.assigned_to_organization_id) || null
        : null,
    }
  },

  async createTask(
    data: Omit<Task, 'id' | 'created_at' | 'program' | 'agenda' | 'assignee' | 'assigned_to_organization'>,
    user?: User | null
  ): Promise<Task> {
    ensureAccountContext(user)
    verifyAccess(user, 'Task', 'create', data.organization_id)

    // Stage 6: Enforce downward-control assignment authorization
    if (data.assigned_to_organization_id) {
      assertCanAssignToOrganization(
        data.organization_id,
        data.assigned_to_organization_id,
        localOrganizations,
        user
      )
    }

    await delay(100)
    const newTask: Task = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    localTasks = [newTask, ...localTasks]
    setStorage('tasks', localTasks)
    logAudit(user, 'create', 'Task', newTask.id, data.organization_id, undefined, newTask as unknown as Record<string, unknown>)
    return newTask
  },

  async updateTask(
    id: string,
    data: Partial<Task>,
    user?: User | null
  ): Promise<Task> {
    ensureAccountContext(user)
    const task = localTasks.find((t) => t.id === id)
    if (!task) throw new Error('Tugas tidak ditemukan')
    verifyAccess(user, 'Task', 'update', task.organization_id)

    // Stage 6: Enforce downward-control assignment authorization on change
    if ('assigned_to_organization_id' in data) {
      const targetId = data.assigned_to_organization_id
      if (targetId) {
        assertCanAssignToOrganization(
          task.organization_id,
          targetId,
          localOrganizations,
          user
        )
      }
      // Clearing assignment (null/undefined) is always allowed
    }

    await delay(100)
    const index = localTasks.findIndex((t) => t.id === id)
    const oldVal = { ...localTasks[index] }
    localTasks[index] = { ...localTasks[index], ...data }
    setStorage('tasks', localTasks)

    // Audit assignment change separately for traceability
    const assignmentChanged = 'assigned_to_organization_id' in data &&
      data.assigned_to_organization_id !== oldVal.assigned_to_organization_id
    if (assignmentChanged) {
      logAudit(
        user, 'update', 'Task', id, task.organization_id,
        { assigned_to_organization_id: oldVal.assigned_to_organization_id },
        { assigned_to_organization_id: data.assigned_to_organization_id }
      )
    } else {
      logAudit(user, 'update', 'Task', id, task.organization_id, oldVal as unknown as Record<string, unknown>, localTasks[index] as unknown as Record<string, unknown>)
    }

    return localTasks[index]
  },

  async transitionTaskStatus(
    id: string,
    nextStatus: TaskStatus,
    user?: User | null
  ): Promise<Task> {
    ensureAccountContext(user)
    const task = localTasks.find((t) => t.id === id)
    if (!task) throw new Error('Tugas tidak ditemukan')
    verifyAccess(user, 'Task', 'update', task.organization_id)

    if (!canTransitionTaskStatus(task.status, nextStatus)) {
      throw new Error(`Transisi status tugas dari [${task.status}] ke [${nextStatus}] tidak diizinkan.`)
    }

    await delay(80)
    const index = localTasks.findIndex((t) => t.id === id)
    const oldStatus = task.status
    const updatePayload: Partial<Task> = {
      status: nextStatus,
    }
    if (nextStatus === 'completed') {
      updatePayload.completed_at = new Date().toISOString()
    }

    localTasks[index] = { ...localTasks[index], ...updatePayload }
    setStorage('tasks', localTasks)
    logAudit(user, 'update', 'Task', id, task.organization_id, { status: oldStatus }, { status: nextStatus })
    return localTasks[index]
  },

  async deleteTask(id: string, user?: User | null): Promise<void> {
    ensureAccountContext(user)
    const task = localTasks.find((t) => t.id === id)
    if (!task) throw new Error('Tugas tidak ditemukan')
    verifyAccess(user, 'Task', 'delete', task.organization_id)
    await delay(100)
    localTasks = localTasks.filter((t) => t.id !== id)
    setStorage('tasks', localTasks)
    logAudit(user, 'delete', 'Task', id, task.organization_id, task as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 12. NOTIFIKASI & AUDIT LOG
  // --------------------------------------------------------------------------
  async getNotifications(userId: string, organizationId?: string): Promise<Notification[]> {
    ensureAccountContext()
    await delay(60)
    let filtered = localNotifications.filter((n) => n.user_id === userId)
    if (organizationId) {
      filtered = filtered.filter((n) => !n.organization_id || n.organization_id === organizationId)
    }
    return filtered
  },

  async markNotificationAsRead(id: string): Promise<void> {
    ensureAccountContext()
    await delay(40)
    const index = localNotifications.findIndex((n) => n.id === id)
    if (index !== -1) {
      localNotifications[index].is_read = true
      setStorage('notifications', localNotifications)
    }
  },

  async getAuditLogs(organizationId?: string, user?: User | null): Promise<AuditLog[]> {
    ensureAccountContext(user)
    await delay(80)
    verifyAccess(user, 'Audit', 'viewAny', organizationId)
    let logs = [...localAuditLogs]
    if (organizationId && (!user || (!user.is_superadmin && user.role !== 'superadmin'))) {
      logs = logs.filter((l) => l.organization_id === organizationId)
    }
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  async deleteAuditLog(id: string, organizationId?: string, user?: User | null): Promise<boolean> {
    ensureAccountContext(user)
    await delay(60)
    verifyAccess(user, 'Audit', 'delete', organizationId)
    const target = localAuditLogs.find((l) => l.id === id)
    if (!target) return false
    localAuditLogs = localAuditLogs.filter((l) => l.id !== id)
    setStorage('audit_logs', localAuditLogs)
    return true
  },

  async deleteAuditLogs(ids: string[], organizationId?: string, user?: User | null): Promise<boolean> {
    ensureAccountContext(user)
    await delay(80)
    verifyAccess(user, 'Audit', 'deleteAny', organizationId)
    const idSet = new Set(ids)
    localAuditLogs = localAuditLogs.filter((l) => !idSet.has(l.id))
    setStorage('audit_logs', localAuditLogs)
    return true
  },

  async clearAuditLogs(organizationId?: string, user?: User | null): Promise<boolean> {
    ensureAccountContext(user)
    await delay(100)
    verifyAccess(user, 'Audit', 'forceDeleteAny', organizationId)
    if (organizationId && (!user || (!user.is_superadmin && user.role !== 'superadmin'))) {
      localAuditLogs = localAuditLogs.filter((l) => l.organization_id !== organizationId)
    } else {
      localAuditLogs = []
    }
    setStorage('audit_logs', localAuditLogs)
    return true
  },

  // --------------------------------------------------------------------------
  // 13. ECOSYSTEM STATS & METRICS (Dashboard Ringkasan Operasional & Roll-up)
  // --------------------------------------------------------------------------
  async getEcosystemStats(scope: OrganizationScopeInput, user?: User | null) {
    ensureAccountContext(user)
    await delay(80)
    const { organizationId, mode, targetIds } = resolveOrganizationScope(scope, localOrganizations)
    verifyAccess(user, 'Program', 'viewAny', organizationId, mode)
    const targetSet = new Set(targetIds)
    const orgPrograms = localPrograms.filter((p) => targetSet.has(p.organization_id))
    const orgAgendas = localAgendas.filter((a) => targetSet.has(a.organization_id))
    const orgReports = localReports.filter((r) => targetSet.has(r.organization_id))
    const orgTasks = localTasks.filter((t) => targetSet.has(t.organization_id))
    const orgBudgets = localBudgets.filter((b) => targetSet.has(b.organization_id))

    const totalBudget = orgBudgets.reduce((sum, b) => sum + (b.allocated_amount || b.amount_allocated || b.planned_amount || 0), 0)
    const realizedBudget = orgBudgets.reduce((sum, b) => sum + (b.realized_amount || b.amount_spent || 0), 0)
    const absorptionRate = totalBudget > 0 ? Math.round((realizedBudget / totalBudget) * 100) : 0

    return {
      totalPrograms: orgPrograms.length,
      activePrograms: orgPrograms.filter((p) => p.status === 'active').length,
      completedPrograms: orgPrograms.filter((p) => p.status === 'completed').length,
      totalAgendas: orgAgendas.length,
      inProgressAgendas: orgAgendas.filter((a) => a.status === 'in_progress').length,
      upcomingAgendas: orgAgendas.filter((a) => a.status === 'upcoming').length,
      totalReports: orgReports.length,
      pendingReports: orgReports.filter((r) => r.status === 'submitted' || r.status === 'in_review').length,
      approvedReports: orgReports.filter((r) => r.status === 'approved').length,
      totalTasks: orgTasks.length,
      pendingTasks: orgTasks.filter((t) => t.status === 'new' || t.status === 'in_progress').length,
      totalBudget,
      realizedBudget,
      absorptionRate,
      scopeMode: mode,
      resolvedOrganizationIds: targetIds,
    }
  },

  // --------------------------------------------------------------------------
  // 14. PERSON & ACCOUNT HOLDER MODEL (Model A)
  // --------------------------------------------------------------------------
  async getPersons(): Promise<Person[]> {
    await delay(60)
    return [...localPersons]
  },

  async getPersonById(id: string): Promise<Person | null> {
    await delay(40)
    return localPersons.find((p) => p.id === id) || null
  },

  async createPerson(
    data: Omit<Person, 'id' | 'created_at' | 'updated_at'>,
    user?: User | null
  ): Promise<Person> {
    await delay(80)
    if (data.identifier && data.identifier.trim()) {
      const cleanId = data.identifier.trim().toLowerCase()
      const exists = localPersons.find((p) => p.identifier && p.identifier.trim().toLowerCase() === cleanId)
      if (exists) {
        throw new Error(`Nomor identitas [${data.identifier}] sudah digunakan oleh person [${exists.name}].`)
      }
    }
    const newPerson: Person = {
      ...data,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localPersons = [newPerson, ...localPersons]
    setStorage('persons', localPersons)
    logAudit(user, 'create', 'Admin', newPerson.id, undefined, undefined, newPerson as unknown as Record<string, unknown>)
    return newPerson
  },

  async updatePerson(
    id: string,
    data: Partial<Person>,
    user?: User | null
  ): Promise<Person> {
    await delay(80)
    const index = localPersons.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Person tidak ditemukan')
    const oldVal = { ...localPersons[index] }
    localPersons[index] = {
      ...localPersons[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    setStorage('persons', localPersons)
    logAudit(user, 'update', 'Admin', id, undefined, oldVal as unknown as Record<string, unknown>, localPersons[index] as unknown as Record<string, unknown>)
    return localPersons[index]
  },

  async getAccountHolderHistories(accountId?: string): Promise<AccountHolderHistory[]> {
    await delay(60)
    if (accountId) {
      return localAccountHolderHistories.filter((h) => h.account_id === accountId)
    }
    return [...localAccountHolderHistories]
  },

  async addAccountHolderHistory(
    historyData: Omit<AccountHolderHistory, 'id' | 'created_at'>
  ): Promise<AccountHolderHistory> {
    await delay(60)
    const newHistory: AccountHolderHistory = {
      ...historyData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    }
    localAccountHolderHistories = [newHistory, ...localAccountHolderHistories]
    setStorage('account_holder_histories', localAccountHolderHistories)
    return newHistory
  },

  /**
   * STAGE 5: SERAH TERIMA PEMEGANG AKUN (PERSON HOLDER HANDOVER)
   *
   * Mengalihkan tanggung jawab operasional Account Unit kepada Person baru.
   * Aturan Bisnis & Integritas Data:
   * - Account Unit tetap permanen dan melekat pada Organization.
   * - Organization ID, User ID, Username, dan Email akun TIDAK PERNAH berubah.
   * - Seluruh data operasional (Program, Agenda, Task, Finance, Performance, Report) TETAP UTUH.
   * - Approval history dan creator history TETAP UTUH.
   * - Histori pemegang lama ditutup (period_end diisi) dan record histori baru dibuat.
   * - Wewenang diuji melalui assertCanManageAccountHandover (Superior -> Subordinate, anti-self, anti-sibling).
   */
  async handoverAccountHolder(
    params: HandoverAccountHolderParams,
    actorUser?: User | null
  ): Promise<{ account: User; person: Person; history: AccountHolderHistory }> {
    ensureAccountContext(actorUser)
    await delay(120)

    const { accountId, newPersonId, newPersonData, periodStart, notes } = params
    if (!accountId) throw new Error('Account ID wajib diisi')

    const userIndex = localUsers.findIndex((u) => u.id === accountId)
    if (userIndex === -1) throw new Error('Account Unit tidak ditemukan')

    const targetAccount = localUsers[userIndex]
    const targetOrgId = targetAccount.organization_id
    if (!targetOrgId) {
      throw new Error('Account Unit tidak terasosiasi dengan organisasi manapun')
    }

    // 1. Verifikasi wewenang hierarki (Superior -> Subordinate, anti-self, anti-sibling)
    assertCanManageAccountHandover(actorUser, accountId, targetOrgId, localOrganizations)

    // 2. Resolve Person (pilih person existing atau daftarkan baru dengan deduplikasi)
    let person: Person | undefined
    if (newPersonId) {
      person = localPersons.find((p) => p.id === newPersonId)
      if (!person) throw new Error('Person tidak ditemukan')
      if (person.status === 'inactive') {
        throw new Error('Person tidak aktif dan tidak dapat ditunjuk sebagai pemegang akun')
      }
    } else if (newPersonData) {
      if (!newPersonData.name || !newPersonData.name.trim()) {
        throw new Error('Nama lengkap person wajib diisi')
      }

      const cleanName = newPersonData.name.trim()
      const cleanIdentifier = newPersonData.identifier?.trim() || undefined

      // Deduplication: cek apakah person sudah ada berdasarkan identifier atau nama yang sama
      const existing = localPersons.find((p) => {
        if (cleanIdentifier && p.identifier && p.identifier.toLowerCase() === cleanIdentifier.toLowerCase()) {
          return true
        }
        return p.name.trim().toLowerCase() === cleanName.toLowerCase()
      })

      if (existing) {
        if (existing.status === 'inactive') {
          throw new Error('Person yang cocok berstatus tidak aktif')
        }
        person = existing
        if (newPersonData.phone || newPersonData.email) {
          existing.phone = newPersonData.phone?.trim() || existing.phone
          existing.email = newPersonData.email?.trim() || existing.email
          existing.updated_at = new Date().toISOString()
          setStorage('persons', localPersons)
        }
      } else {
        person = {
          id: generateUUID(),
          name: cleanName,
          identifier: cleanIdentifier,
          phone: newPersonData.phone?.trim() || undefined,
          email: newPersonData.email?.trim() || undefined,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        localPersons = [person, ...localPersons]
        setStorage('persons', localPersons)
      }
    } else {
      throw new Error('Data person pemegang baru tidak diberikan')
    }

    // 3. Cegah handover ke person yang sama
    if (targetAccount.holder_person_id === person.id) {
      throw new Error(
        'Person pemegang baru tidak boleh sama dengan pemegang aktif saat ini (Handover ke person yang sama ditolak).'
      )
    }

    const effectiveDate = periodStart?.trim() || new Date().toISOString().split('T')[0]

    // 4. Tutup histori aktif lama (mencegah duplicate active holder history)
    localAccountHolderHistories = localAccountHolderHistories.map((h) => {
      if (h.account_id === accountId && (!h.period_end || h.period_end === '')) {
        return {
          ...h,
          period_end: effectiveDate,
        }
      }
      return h
    })

    // 5. Buat record histori pemegang baru
    const newHistory: AccountHolderHistory = {
      id: generateUUID(),
      account_id: targetAccount.id,
      organization_id: targetOrgId,
      person_id: person.id,
      person_name: person.name,
      period_start: effectiveDate,
      period_end: undefined, // Aktif bertugas
      handover_notes: notes?.trim() || 'Serah terima pemegang akun resmi',
      created_by: actorUser?.id,
      created_at: new Date().toISOString(),
    }
    localAccountHolderHistories = [newHistory, ...localAccountHolderHistories]
    setStorage('account_holder_histories', localAccountHolderHistories)

    // 6. Update target Account pada localUsers (menjaga permanensi organization_id & kredensial)
    const oldHolderName = targetAccount.holder_name
    localUsers[userIndex] = {
      ...targetAccount,
      holder_person_id: person.id,
      holder_name: person.name,
      holder_phone: person.phone,
      holder: person,
      updated_at: new Date().toISOString(),
      // Kunci integritas identitas & organisasi
      id: targetAccount.id,
      email: targetAccount.email,
      username: targetAccount.username,
      organization_id: targetOrgId,
    }
    setStorage('users', localUsers)

    // 7. Audit log serah terima
    logAudit(
      actorUser,
      'update',
      'Admin',
      targetAccount.id,
      targetOrgId,
      { holder_name: oldHolderName, holder_person_id: targetAccount.holder_person_id },
      { holder_name: person.name, holder_person_id: person.id }
    )

    return {
      account: localUsers[userIndex],
      person,
      history: newHistory,
    }
  },

  // --------------------------------------------------------------------------
  // 15. QUARANTINE & OPERATIONAL MIGRATION INSPECTION
  // --------------------------------------------------------------------------
  async getQuarantineReport(): Promise<QuarantineReportItem[]> {
    await delay(40)
    const raw = getRawStorageItem(`${DEMO_STORAGE_PREFIX}_quarantine_report`)
    try {
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  async getQuarantineRecords(collection: string): Promise<unknown[]> {
    await delay(40)
    const raw = getRawStorageItem(`${DEMO_STORAGE_PREFIX}_quarantine_${collection}`)
    try {
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  runOperationalMigration(): void {
    migrateOperationalToSharedStore()
    reloadSharedStructuralCollections()
  },

  // --------------------------------------------------------------------------
  // 16. HIERARCHY RESOLVER HELPERS
  // --------------------------------------------------------------------------
  getParentOrganization(id: string): Organization | null {
    return getParentOrganization(id, localOrganizations)
  },
  getChildrenOrganizations(id: string, includeInactive = false): Organization[] {
    return getChildrenOrganizations(id, localOrganizations, includeInactive)
  },
  getDescendantOrganizationIds(id: string, includeInactive = false): string[] {
    return getDescendantOrganizationIds(id, localOrganizations, includeInactive)
  },
  getAncestorOrganizationIds(id: string): string[] {
    return getAncestorOrganizationIds(id, localOrganizations)
  },
  isAncestor(ancestorId: string, descendantId: string): boolean {
    return isAncestor(ancestorId, descendantId, localOrganizations)
  },
  isDescendant(descendantId: string, ancestorId: string): boolean {
    return isDescendant(descendantId, ancestorId, localOrganizations)
  },
  getOrganizationTree(rootId?: string | null): OrganizationTreeNode[] {
    return getOrganizationTree(rootId, localOrganizations)
  },
  resolveOrganizationScope(scope: OrganizationScopeInput): {
    organizationId: string
    mode: OrganizationScopeMode
    targetIds: string[]
  } {
    return resolveOrganizationScope(scope, localOrganizations)
  },
  reloadSharedStructuralCollections(): void {
    reloadSharedStructuralCollections()
  },
}
