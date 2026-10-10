/**
 * STAGE 8 — HIERARCHICAL STRUCTURE CREATE AUTHORIZATION
 * Targeted Test Suite (Node.js CJS)
 */

'use strict'

// ─── Inline logic (mirrors authorization.ts) ──────────────────────────────────

const KETUA_PENGURUS_UNIT_TYPES = ['kepala_pengurus', 'pimpinan']

const VALID_PARENT_CHILD = {
  kepala_pengurus: ['waka', 'seksi', 'organisasi', 'lembaga', 'kelompok', 'unit'],
  pimpinan: ['waka', 'lembaga', 'kelompok', 'unit', 'seksi', 'organisasi'],
  waka: ['seksi', 'organisasi', 'lembaga', 'kelompok', 'unit'],
  seksi: ['organisasi', 'kelompok', 'unit'],
  organisasi: ['organisasi', 'unit', 'kelompok'],
  lembaga: ['kelompok', 'unit', 'seksi', 'organisasi'],
  kelompok: ['unit', 'organisasi', 'kelompok'],
  unit: ['unit', 'organisasi', 'kelompok'],
}

function getPesantrenEchelonLevel(unitType) {
  if (!unitType) return 3
  const t = unitType.toLowerCase()
  if (t === 'kepala_pengurus' || t === 'pimpinan') return 0
  if (t === 'waka') return 1
  if (t === 'seksi') return 2
  return 3
}

function hasPermission(user, resource, action) {
  if (!user || user.status !== 'active') return false
  if (user.is_superadmin || user.role === 'superadmin') return true
  const membership = user.active_membership
  if (!membership || membership.status !== 'active') return false
  const key = `${resource}.${action}`
  const role = membership.role
  if (!role || role.status !== 'active') return false
  return role.permissions.includes(key)
}

function canCreateOrgStructure(user, childUnitType, parentUnitType, organizations) {
  if (!user || user.status !== 'active') return false
  if (user.is_superadmin || user.role === 'superadmin') return true
  const membership = user.active_membership
  if (!membership || membership.status !== 'active' || !membership.organization_id) return false
  if (!hasPermission(user, 'Organization', 'create')) return false
  const callerOrg = (organizations || []).find(o => o.id === membership.organization_id)
  const callerUnitType = ((callerOrg && callerOrg.unit_type) || 'unit').toLowerCase()
  const callerEchelon = getPesantrenEchelonLevel(callerUnitType)
  if (callerEchelon !== 0 && !KETUA_PENGURUS_UNIT_TYPES.includes(callerUnitType)) return false
  if (childUnitType && parentUnitType !== undefined) {
    if (parentUnitType === null) {
      if (!KETUA_PENGURUS_UNIT_TYPES.includes(childUnitType.toLowerCase())) return false
    } else {
      const allowed = VALID_PARENT_CHILD[parentUnitType.toLowerCase()] || []
      if (!allowed.includes(childUnitType.toLowerCase())) return false
    }
  }
  return true
}

function assertCanCreateOrgStructure(user, childUnitType, parentUnitType, organizations) {
  if (!user || user.status !== 'active') throw new Error('Akses ditolak: Akun tidak aktif.')
  if (user.is_superadmin || user.role === 'superadmin') return
  const membership = user.active_membership
  if (!membership || membership.status !== 'active' || !membership.organization_id)
    throw new Error('Akses ditolak: Tidak ada keanggotaan aktif.')
  if (!hasPermission(user, 'Organization', 'create'))
    throw new Error('Akses ditolak: Tidak ada izin Organization.create.')
  const callerOrg = (organizations || []).find(o => o.id === membership.organization_id)
  const callerUnitType = ((callerOrg && callerOrg.unit_type) || 'unit').toLowerCase()
  const callerEchelon = getPesantrenEchelonLevel(callerUnitType)
  if (callerEchelon !== 0 && !KETUA_PENGURUS_UNIT_TYPES.includes(callerUnitType))
    throw new Error(`Akses ditolak: Unit [${callerUnitType}] tidak berwenang membuat unit hierarki baru.`)
  if (childUnitType && parentUnitType !== undefined) {
    if (parentUnitType === null) {
      if (!KETUA_PENGURUS_UNIT_TYPES.includes(childUnitType.toLowerCase()))
        throw new Error(`Akses ditolak: Root node hanya boleh bertipe kepala_pengurus/pimpinan.`)
    } else {
      const allowed = VALID_PARENT_CHILD[parentUnitType.toLowerCase()] || []
      if (!allowed.includes(childUnitType.toLowerCase()))
        throw new Error(`Akses ditolak: [${parentUnitType}] tidak dapat memiliki anak bertipe [${childUnitType}].`)
    }
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORGS = [
  { id: 'org-kp', parent_id: null, unit_type: 'pimpinan', level: 0, name: 'Ketua Pengurus' },
  { id: 'org-waka', parent_id: 'org-kp', unit_type: 'waka', level: 1, name: 'Waka 1' },
  { id: 'org-seksi', parent_id: 'org-waka', unit_type: 'seksi', level: 2, name: 'Seksi 1' },
  { id: 'org-org', parent_id: 'org-seksi', unit_type: 'organisasi', level: 3, name: 'Org A' },
]

const ROLE_ORG_CREATE = { id: 'role-admin', name: 'Admin', status: 'active', permissions: ['Organization.create'] }
const ROLE_NO_PERM    = { id: 'role-noperm', name: 'NoPerm', status: 'active', permissions: ['Program.view'] }

function makeUser(orgId, unitType, opts) {
  opts = opts || {}
  return {
    id: 'user-' + orgId,
    name: 'User ' + orgId,
    email: orgId + '@test.id',
    status: opts.status || 'active',
    is_superadmin: opts.is_superadmin || false,
    role: opts.role || 'admin',
    created_at: new Date().toISOString(),
    active_membership: opts.noMembership ? null : {
      id: 'mem-' + orgId,
      organization_id: orgId,
      status: opts.membershipStatus || 'active',
      role: opts.role_obj !== undefined ? opts.role_obj : ROLE_ORG_CREATE,
    },
  }
}

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0

function test(label, fn) {
  try {
    fn()
    console.log(`[PASS] ${label}`)
    passed++
  } catch (e) {
    console.error(`[FAIL] ${label}`)
    console.error(`       ${e.message}`)
    failed++
  }
}

function assertAllowed(user, childType, parentType) {
  if (!canCreateOrgStructure(user, childType, parentType, ORGS))
    throw new Error('Expected ALLOWED but got DENIED')
  assertCanCreateOrgStructure(user, childType, parentType, ORGS)
}

function assertDenied(user, childType, parentType) {
  if (canCreateOrgStructure(user, childType, parentType, ORGS))
    throw new Error('Expected DENIED but got ALLOWED')
  let threw = false
  try { assertCanCreateOrgStructure(user, childType, parentType, ORGS) } catch (e) { threw = true }
  if (!threw) throw new Error('assertCanCreate should have thrown')
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\n====================================================================')
console.log('STAGE 8: HIERARCHICAL STRUCTURE CREATE AUTHORIZATION')
console.log('====================================================================\n')

test('Point 1: Ketua Pengurus create WAKA → ALLOWED', () => {
  assertAllowed(makeUser('org-kp', 'pimpinan'), 'waka', 'pimpinan')
})

test('Point 2: Ketua Pengurus create SEKSI → ALLOWED', () => {
  assertAllowed(makeUser('org-kp', 'pimpinan'), 'seksi', 'waka')
})

test('Point 3: Ketua Pengurus create ORGANISASI → ALLOWED', () => {
  assertAllowed(makeUser('org-kp', 'pimpinan'), 'organisasi', 'seksi')
})

test('Point 4: WAKA create WAKA → DENIED', () => {
  assertDenied(makeUser('org-waka', 'waka'), 'waka', 'pimpinan')
})

test('Point 5: WAKA create SEKSI → DENIED', () => {
  assertDenied(makeUser('org-waka', 'waka'), 'seksi', 'waka')
})

test('Point 6: WAKA create ORGANISASI → DENIED', () => {
  assertDenied(makeUser('org-waka', 'waka'), 'organisasi', 'seksi')
})

test('Point 7: SEKSI create SEKSI → DENIED', () => {
  assertDenied(makeUser('org-seksi', 'seksi'), 'seksi', 'waka')
})

test('Point 8: SEKSI create ORGANISASI → DENIED', () => {
  assertDenied(makeUser('org-seksi', 'seksi'), 'organisasi', 'seksi')
})

test('Point 9: ORGANISASI create ORGANISASI → DENIED', () => {
  assertDenied(makeUser('org-org', 'organisasi'), 'organisasi', 'seksi')
})

test('Point 10: User tanpa Organization.create permission → DENIED', () => {
  assertDenied(makeUser('org-kp', 'pimpinan', { role_obj: ROLE_NO_PERM }), 'waka', 'pimpinan')
})

test('Point 11: Inactive membership → DENIED', () => {
  assertDenied(makeUser('org-kp', 'pimpinan', { membershipStatus: 'inactive' }), 'waka', 'pimpinan')
})

test('Point 12: Direct assertCanCreate call untuk WAKA → throws dengan "Akses ditolak"', () => {
  let threw = false; let errMsg = ''
  try { assertCanCreateOrgStructure(makeUser('org-waka', 'waka'), 'seksi', 'waka', ORGS) } catch (e) { threw = true; errMsg = e.message }
  if (!threw) throw new Error('Expected throw but did not throw')
  if (!errMsg.includes('Akses ditolak')) throw new Error(`Expected "Akses ditolak", got: ${errMsg}`)
})

test('Point 13: Invalid combo seksi→waka (waka cannot be child of seksi) → DENIED', () => {
  assertDenied(makeUser('org-kp', 'pimpinan'), 'waka', 'seksi')
})

test('Point 14: Superadmin create WAKA → ALLOWED via global override', () => {
  const su = { id: 'user-sa', name: 'Superadmin', email: 'sa@test.id', status: 'active', is_superadmin: true, role: 'superadmin', created_at: new Date().toISOString(), active_membership: null }
  assertAllowed(su, 'waka', 'pimpinan')
})

test('Point 15: Existing organizations array tidak berubah', () => {
  if (ORGS.length !== 4) throw new Error(`Expected 4 orgs, got ${ORGS.length}`)
  if (ORGS[0].unit_type !== 'pimpinan') throw new Error('org-kp corrupted')
  if (ORGS[1].unit_type !== 'waka') throw new Error('org-waka corrupted')
  if (ORGS[2].unit_type !== 'seksi') throw new Error('org-seksi corrupted')
  if (ORGS[3].unit_type !== 'organisasi') throw new Error('org-org corrupted')
})

console.log('\n====================================================================')
const total = passed + failed
console.log(`STAGE 8 VERIFICATION SUMMARY: ${passed}/${total} TESTS PASSED${failed > 0 ? ' — ' + failed + ' FAILED' : ''}`)
console.log('====================================================================\n')
process.exit(failed > 0 ? 1 : 0)
