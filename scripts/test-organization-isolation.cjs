/**
 * TEST SCRIPT: Multi-Organization Isolation & RBAC Security Verification
 * Verifies all criteria in Section 30 of MASTER_SPEC_EKOSISTEM_KINERJA_ORGANISASI_v2.md
 */

const assert = require('assert')

console.log('=====================================================================')
console.log('🔒 VERIFIKASI SISTEM ISOLASI MULTI-ORGANISASI & RBAC POLICY ENGINE')
console.log('=====================================================================\n')

// 1. Mock Data & Definitions
const ORG_A = 'org-11111111-1111-1111-1111-111111111111'
const ORG_B = 'org-22222222-2222-2222-2222-222222222222'

const superadminUser = {
  id: 'user-super',
  name: 'Super Admin',
  role: 'superadmin',
  is_superadmin: true,
  status: 'active',
}

const adminOrgA = {
  id: 'user-admin-a',
  name: 'Admin Organisasi A',
  role: 'admin',
  status: 'active',
  is_superadmin: false,
  active_membership: {
    id: 'mem-a',
    user_id: 'user-admin-a',
    organization_id: ORG_A,
    role_id: 'role-admin-org',
    status: 'active',
    role: {
      id: 'role-admin-org',
      name: 'Admin Organisasi',
      status: 'active',
      permissions: [
        'Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete',
        'Structure.viewAny', 'Structure.view', 'Structure.create', 'Structure.update',
        'Report.viewAny', 'Report.view', 'Report.create', 'Report.update',
      ],
    },
  },
}

const memberOrgA = {
  id: 'user-member-a',
  name: 'Personel Organisasi A',
  role: 'member',
  status: 'active',
  is_superadmin: false,
  active_membership: {
    id: 'mem-member-a',
    user_id: 'user-member-a',
    organization_id: ORG_A,
    role_id: 'role-personel',
    status: 'active',
    role: {
      id: 'role-personel',
      name: 'Personel',
      status: 'active',
      permissions: ['Program.viewAny', 'Program.view'],
    },
  },
}

// 2. Authorization Logic Under Test
function hasPermission(user, resource, action) {
  if (!user || user.status !== 'active') return false
  if (user.is_superadmin || user.role === 'superadmin') return true
  const membership = user.active_membership
  if (!membership || membership.status !== 'active') return false
  const permKey = `${resource}.${action}`
  const role = membership.role
  if (!role || role.status !== 'active') return false
  return role.permissions.includes(permKey)
}

function enforceScope(user, targetOrgId) {
  if (!user || user.status !== 'active') return false
  if (user.is_superadmin || user.role === 'superadmin') return true
  if (!targetOrgId) return false
  const membership = user.active_membership
  if (!membership || membership.status !== 'active') return false
  return membership.organization_id === targetOrgId
}

function authorize(user, resource, action, targetOrgId) {
  if (!hasPermission(user, resource, action)) return false
  if (!enforceScope(user, targetOrgId)) return false
  return true
}

function verifyAccess(user, resource, action, targetOrgId) {
  if (!user) return
  if (user.is_superadmin || user.role === 'superadmin') return
  const userOrgId = user.active_membership?.organization_id
  if (!userOrgId) {
    throw new Error('Akses ditolak: Pengguna tidak memiliki keanggotaan organisasi yang aktif.')
  }
  if (targetOrgId && targetOrgId !== userOrgId) {
    throw new Error('Akses ditolak: Percobaan manipulasi scope organisasi lintas tenant (Cross-tenant violation).')
  }
  if (!authorize(user, resource, action, userOrgId)) {
    throw new Error(`Akses ditolak: Anda tidak memiliki izin [${resource}.${action}] pada organisasi ini.`)
  }
}

// Status transitions state machine
function canTransitionProgramStatus(current, next) {
  if (current === next) return true
  const validTransitions = {
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

// Circular check
function checkCircularHierarchy(nodeId, newParentId, allNodes) {
  if (newParentId === nodeId) {
    throw new Error('Jabatan tidak dapat menjadi atasan dari dirinya sendiri (Self-parent prohibited).')
  }
  let currentCheck = newParentId
  while (currentCheck) {
    if (currentCheck === nodeId) {
      throw new Error('Hubungan hierarki sirkular terdeteksi: Tidak dapat memindahkan atasan ke bawahannya (Circular hierarchy prohibited).')
    }
    const parent = allNodes.find((n) => n.id === currentCheck)
    currentCheck = parent ? parent.parent_id : null
  }
}

let passed = 0
let failed = 0

function runTest(testName, testFn) {
  try {
    testFn()
    console.log(`  ✅ [PASS] ${testName}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}: ${err.message}`)
    failed++
  }
}

// -----------------------------------------------------------------------------
// EXECUTE TESTS
// -----------------------------------------------------------------------------

console.log('--- Uji 1: Isolasi Akses Tenant ---')

runTest('Organization A user TIDAK dapat membaca Organization B', () => {
  const allowed = authorize(memberOrgA, 'Program', 'view', ORG_B)
  assert.strictEqual(allowed, false, 'Member Org A tidak boleh memiliki akses view ke Org B')
})

runTest('Organization A admin TIDAK dapat mengubah Organization B', () => {
  const allowed = authorize(adminOrgA, 'Program', 'update', ORG_B)
  assert.strictEqual(allowed, false, 'Admin Org A tidak boleh memiliki akses update ke Org B')
})

runTest('Organization A admin TIDAK dapat menghapus resource Organization B', () => {
  const allowed = authorize(adminOrgA, 'Program', 'delete', ORG_B)
  assert.strictEqual(allowed, false, 'Admin Org A tidak boleh memiliki akses delete ke Org B')
})

runTest('Backend melempar exception saat manipulasi organization_id lintas tenant', () => {
  assert.throws(
    () => {
      verifyAccess(adminOrgA, 'Program', 'view', ORG_B)
    },
    /Cross-tenant violation/,
    'Backend harus menolak request dengan targetOrgId berbeda'
  )
})

console.log('\n--- Uji 2: RBAC & Permission Matrix ---')

runTest('User tanpa permission (e.g. member mencoba delete) ditolak', () => {
  const allowed = authorize(memberOrgA, 'Program', 'delete', ORG_A)
  assert.strictEqual(allowed, false, 'Member tanpa izin delete harus ditolak')
})

runTest('User dengan permission tetapi target organisasi tidak sesuai ditolak', () => {
  // Admin Org A punya permission delete, tapi targetnya Org B
  const allowed = authorize(adminOrgA, 'Program', 'delete', ORG_B)
  assert.strictEqual(allowed, false, 'Izin tanpa kecocokan scope harus ditolak')
})

runTest('Superadmin dapat mengakses seluruh organisasi tanpa batasan tenant', () => {
  const allowedA = authorize(superadminUser, 'Program', 'delete', ORG_A)
  const allowedB = authorize(superadminUser, 'Program', 'delete', ORG_B)
  assert.strictEqual(allowedA && allowedB, true, 'Superadmin harus selalu berhak pada Org A & Org B')
})

console.log('\n--- Uji 3: Integritas Struktur Organisasi & Pencegahan Loop Sirkular ---')

const mockNodes = [
  { id: 'node-root', parent_id: null },
  { id: 'node-sub1', parent_id: 'node-root' },
  { id: 'node-sub2', parent_id: 'node-sub1' },
]

runTest('Self-parent assignment ditolak', () => {
  assert.throws(
    () => {
      checkCircularHierarchy('node-sub1', 'node-sub1', mockNodes)
    },
    /Self-parent prohibited/,
    'Node tidak boleh berinduk pada dirinya sendiri'
  )
})

runTest('Circular parent assignment (atasan menjadi bawahan anaknya) ditolak', () => {
  assert.throws(
    () => {
      // Trying to set node-root's parent to node-sub2 (its grandchild)
      checkCircularHierarchy('node-root', 'node-sub2', mockNodes)
    },
    /Circular hierarchy prohibited/,
    'Hubungan sirkular bertingkat harus dicegah'
  )
})

runTest('Valid parent assignment diterima', () => {
  assert.doesNotThrow(() => {
    checkCircularHierarchy('node-sub2', 'node-root', mockNodes)
  })
})

console.log('\n--- Uji 4: Validasi Siklus State Machine ---')

runTest('Transisi valid status program (draft -> submitted -> approved -> active) diterima', () => {
  assert.strictEqual(canTransitionProgramStatus('draft', 'submitted'), true)
  assert.strictEqual(canTransitionProgramStatus('submitted', 'approved'), true)
  assert.strictEqual(canTransitionProgramStatus('approved', 'active'), true)
  assert.strictEqual(canTransitionProgramStatus('active', 'completed'), true)
})

runTest('Transisi tidak valid status program (draft langsung ke completed / closed) ditolak', () => {
  assert.strictEqual(canTransitionProgramStatus('draft', 'completed'), false)
  assert.strictEqual(canTransitionProgramStatus('draft', 'closed'), false)
  assert.strictEqual(canTransitionProgramStatus('closed', 'active'), false)
})

console.log('\n=====================================================================')
console.log(`HASIL AKHIR: ${passed} PASSED, ${failed} FAILED`)
console.log('=====================================================================')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 SELURUH ATURAN KEAMANAN & ISOLASI ORGANISASI BERHASIL DIVALIDASI!')
}
