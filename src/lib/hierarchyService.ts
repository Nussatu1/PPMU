// ==============================================================================
// FILAMENT ECOSYSTEM - HIERARCHICAL ORGANIZATION RESOLVER
// Single Source of Truth for Tree Traversal, Scopes, and Roll-up Resolution
// ==============================================================================

import type {
  Organization,
  OrganizationScopeInput,
  OrganizationScopeMode,
} from '@/types/database'

export interface OrganizationTreeNode extends Organization {
  children: OrganizationTreeNode[]
}

/**
 * Mencari organisasi induk langsung (parent).
 */
export function getParentOrganization(
  id: string,
  organizations: Organization[]
): Organization | null {
  const current = organizations.find((o) => o.id === id)
  if (!current || !current.parent_id) return null
  return organizations.find((o) => o.id === current.parent_id) || null
}

/**
 * Mendapatkan seluruh anak langsung (direct children) dari sebuah organisasi.
 * Mengabaikan organisasi yang statusnya 'archived' atau 'inactive' bila includeInactive = false.
 */
export function getChildrenOrganizations(
  id: string,
  organizations: Organization[],
  includeInactive = false
): Organization[] {
  return organizations.filter(
    (o) =>
      o.parent_id === id &&
      (includeInactive || o.status === 'active' || !o.status)
  )
}

/**
 * Mendapatkan seluruh ID turunan (descendants) pada arbitrary depth secara rekursif.
 * Dilengkapi dengan cycle protection (mencegah loop tak terhingga jika terjadi referensi siklik).
 */
export function getDescendantOrganizationIds(
  id: string,
  organizations: Organization[],
  includeInactive = false
): string[] {
  const descendantIds: string[] = []
  const visited = new Set<string>([id])
  const queue: string[] = [id]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const children = organizations.filter(
      (o) =>
        o.parent_id === currentId &&
        (includeInactive || o.status === 'active' || !o.status)
    )

    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id)
        descendantIds.push(child.id)
        queue.push(child.id)
      }
    }
  }

  return descendantIds
}

/**
 * Mendapatkan seluruh ID leluhur (ancestors) dari bawah ke atas sampai root.
 * Dilengkapi dengan cycle protection.
 */
export function getAncestorOrganizationIds(
  id: string,
  organizations: Organization[]
): string[] {
  const ancestorIds: string[] = []
  const visited = new Set<string>([id])
  let current = organizations.find((o) => o.id === id)

  while (current && current.parent_id) {
    const parentId = current.parent_id
    if (visited.has(parentId)) {
      // Siklus terdeteksi, hentikan transversal secara aman
      break
    }
    visited.add(parentId)
    ancestorIds.push(parentId)
    current = organizations.find((o) => o.id === parentId)
  }

  return ancestorIds
}

/**
 * Memeriksa apakah ancestorId adalah leluhur dari descendantId.
 */
export function isAncestor(
  ancestorId: string,
  descendantId: string,
  organizations: Organization[]
): boolean {
  if (ancestorId === descendantId) return false
  const ancestors = getAncestorOrganizationIds(descendantId, organizations)
  return ancestors.includes(ancestorId)
}

/**
 * Memeriksa apakah descendantId adalah turunan dari ancestorId.
 */
export function isDescendant(
  descendantId: string,
  ancestorId: string,
  organizations: Organization[]
): boolean {
  if (descendantId === ancestorId) return false
  const descendants = getDescendantOrganizationIds(ancestorId, organizations, true)
  return descendants.includes(descendantId)
}

/**
 * Menyusun struktur pohon (Tree) dari daftar flat organisasi.
 * Mendukung root spesifik atau seluruh root (parent_id == null).
 */
export function getOrganizationTree(
  rootId?: string | null,
  organizations: Organization[] = []
): OrganizationTreeNode[] {
  const orgMap = new Map<string, OrganizationTreeNode>()

  organizations.forEach((org) => {
    orgMap.set(org.id, {
      ...org,
      children: [],
    })
  })

  const tree: OrganizationTreeNode[] = []

  orgMap.forEach((node) => {
    if (node.parent_id && orgMap.has(node.parent_id)) {
      // Hubungkan ke parent
      const parent = orgMap.get(node.parent_id)!
      // Hindari self-nesting atau siklus langsung
      if (node.id !== parent.id) {
        parent.children.push(node)
      }
    } else {
      // Tidak punya parent di map -> kandidat root
      if (!rootId) {
        tree.push(node)
      }
    }
  })

  if (rootId) {
    const specificRoot = orgMap.get(rootId)
    return specificRoot ? [specificRoot] : []
  }

  return tree
}

/**
 * Normalisasi dan resolusi scope organisasi untuk query dan roll-up data.
 * - mode 'own': hanya mengembalikan [organizationId]
 * - mode 'descendants': mengembalikan [organizationId, ...seluruhDescendants]
 */
export function resolveOrganizationScope(
  scopeInput: OrganizationScopeInput,
  organizations: Organization[]
): {
  organizationId: string
  mode: OrganizationScopeMode
  targetIds: string[]
} {
  const organizationId =
    typeof scopeInput === 'string' ? scopeInput : scopeInput.organizationId
  const mode: OrganizationScopeMode =
    typeof scopeInput === 'string' ? 'own' : scopeInput.mode || 'own'

  if (!organizationId) {
    return {
      organizationId: '',
      mode,
      targetIds: [],
    }
  }

  if (mode === 'descendants') {
    const descendants = getDescendantOrganizationIds(organizationId, organizations, false)
    return {
      organizationId,
      mode,
      targetIds: [organizationId, ...descendants],
    }
  }

  return {
    organizationId,
    mode: 'own',
    targetIds: [organizationId],
  }
}
