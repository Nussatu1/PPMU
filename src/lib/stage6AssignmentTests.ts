// ==============================================================================
// STAGE 6 — ASSIGNMENT AUTHORIZATION TEST MATRIX
// Tests canAssignToOrganization() against the 10 required cases + CRUD operations
// ==============================================================================

import {
  canAssignToOrganization,
  assertCanAssignToOrganization,
} from '@/lib/authorization'
import type { Organization, User } from '@/types/database'

// ---------------------------------------------------------------------------
// TEST FIXTURE — Org tree matching spec:
//
//   pimpinan (root)
//   ├── lembaga-a
//   │   ├── a1
//   │   └── a2
//   ├── lembaga-b
//   │   ├── b1
//   │   └── b2
//   └── lembaga-c
//       └── c1
//           └── level-n
// ---------------------------------------------------------------------------

const orgs: Organization[] = [
  {
    id: 'pimpinan',
    name: 'Pimpinan',
    code: 'PIM',
    unit_type: 'pimpinan',
    level: 0,
    parent_id: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lembaga-a',
    name: 'Lembaga A',
    code: 'LEM-A',
    unit_type: 'lembaga',
    level: 1,
    parent_id: 'pimpinan',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a1',
    name: 'A1',
    code: 'A1',
    unit_type: 'unit',
    level: 2,
    parent_id: 'lembaga-a',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a2',
    name: 'A2',
    code: 'A2',
    unit_type: 'unit',
    level: 2,
    parent_id: 'lembaga-a',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lembaga-b',
    name: 'Lembaga B',
    code: 'LEM-B',
    unit_type: 'lembaga',
    level: 1,
    parent_id: 'pimpinan',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b1',
    name: 'B1',
    code: 'B1',
    unit_type: 'unit',
    level: 2,
    parent_id: 'lembaga-b',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b2',
    name: 'B2',
    code: 'B2',
    unit_type: 'unit',
    level: 2,
    parent_id: 'lembaga-b',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lembaga-c',
    name: 'Lembaga C',
    code: 'LEM-C',
    unit_type: 'lembaga',
    level: 1,
    parent_id: 'pimpinan',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1',
    name: 'C1',
    code: 'C1',
    unit_type: 'unit',
    level: 2,
    parent_id: 'lembaga-c',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'level-n',
    name: 'Level N',
    code: 'LEVN',
    unit_type: 'unit',
    level: 3,
    parent_id: 'c1',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  },
]

const superadminUser: User = {
  id: 'superadmin-1',
  name: 'Superadmin',
  email: 'superadmin@test.id',
  role: 'superadmin',
  is_superadmin: true,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
}


// TEST RUNNER — simple synchronous assertions (no test framework needed)
// ---------------------------------------------------------------------------

type TestResult = {
  case: string
  source: string
  target: string
  expected: boolean
  actual: boolean
  pass: boolean
}

function runTest(
  caseName: string,
  source: string,
  target: string,
  expectedPass: boolean,
  user?: User | null
): TestResult {
  const actual = canAssignToOrganization(source, target, orgs, user)
  return {
    case: caseName,
    source,
    target,
    expected: expectedPass,
    actual,
    pass: actual === expectedPass,
  }
}

// ---------------------------------------------------------------------------
// CASE 1–10: Required Spec Test Matrix
// ---------------------------------------------------------------------------

export const stage6TestMatrix: TestResult[] = [
  // Case 1: Pimpinan → Lembaga A (direct child)  PASS
  runTest('Case 1 — Pimpinan → Lembaga A', 'pimpinan', 'lembaga-a', true),

  // Case 2: Pimpinan → Unit A1 (deep descendant)  PASS
  runTest('Case 2 — Pimpinan → A1', 'pimpinan', 'a1', true),

  // Case 3: Lembaga A → A1 (direct child)  PASS
  runTest('Case 3 — Lembaga A → A1', 'lembaga-a', 'a1', true),

  // Case 4: Lembaga A → A2 (direct child sibling of A1)  PASS
  runTest('Case 4 — Lembaga A → A2', 'lembaga-a', 'a2', true),

  // Case 5: Lembaga A → B1 (cross-branch)  DENY
  runTest('Case 5 — Lembaga A → B1 (cross-branch)', 'lembaga-a', 'b1', false),

  // Case 6: A1 → Lembaga A (upward/ancestor)  DENY
  runTest('Case 6 — A1 → Lembaga A (upward)', 'a1', 'lembaga-a', false),

  // Case 7: A1 → A2 (sibling)  DENY
  runTest('Case 7 — A1 → A2 (sibling)', 'a1', 'a2', false),

  // Case 8: A1 → B1 (cross-branch sibling)  DENY
  runTest('Case 8 — A1 → B1 (cross-branch sibling)', 'a1', 'b1', false),

  // Case 9: Null assignment — backward compatible (no target = no check needed)
  // canAssignToOrganization with empty targetId returns false but service allows null passthrough
  {
    case: 'Case 9 — Null assignment (backward compatible)',
    source: 'pimpinan',
    target: '',
    expected: false, // empty targetId = guard returns false (no-op in service)
    actual: canAssignToOrganization('pimpinan', '', orgs),
    pass: canAssignToOrganization('pimpinan', '', orgs) === false,
  },

  // Case 10: Superadmin → any valid organization  PASS
  runTest('Case 10 — Superadmin → any org', 'a1', 'pimpinan', true, superadminUser),
]

// ---------------------------------------------------------------------------
// ADDITIONAL CRUD OPERATION TESTS
// ---------------------------------------------------------------------------

export const stage6CrudTests: TestResult[] = [
  // Create Program Assignment
  runTest('Create Program — Pimpinan assigns to Lembaga A', 'pimpinan', 'lembaga-a', true),
  runTest('Create Program — A1 tries to assign to Lembaga A (DENY)', 'a1', 'lembaga-a', false),

  // Update Program Assignment
  runTest('Update Program — Lembaga A changes to A2 (descendant)', 'lembaga-a', 'a2', true),
  runTest('Update Program — Lembaga A tries to change to B1 (cross-branch DENY)', 'lembaga-a', 'b1', false),

  // Remove Program Assignment (clearing to null is always allowed — tested via service layer)

  // Create Task Assignment
  runTest('Create Task — Pimpinan assigns to C1 (deep)', 'pimpinan', 'c1', true),
  runTest('Create Task — A1 tries to assign to A2 (sibling DENY)', 'a1', 'a2', false),

  // Update Task Assignment
  runTest('Update Task — Lembaga B assigns to B2 (descendant)', 'lembaga-b', 'b2', true),
  runTest('Update Task — B1 tries to assign to B2 (sibling DENY)', 'b1', 'b2', false),

  // Deep descendant tests
  runTest('Deep — Pimpinan → Level N (deep descendant)', 'pimpinan', 'level-n', true),
  runTest('Deep — Level N → Pimpinan (upward DENY)', 'level-n', 'pimpinan', false),
  runTest('Deep — C1 → Level N (direct child)', 'c1', 'level-n', true),
  runTest('Deep — Level N → C1 (upward DENY)', 'level-n', 'c1', false),

  // Self-assignment
  runTest('Self — Lembaga A → Lembaga A (self PASS)', 'lembaga-a', 'lembaga-a', true),
  runTest('Self — A1 → A1 (self PASS)', 'a1', 'a1', true),

  // Superadmin override
  runTest('Superadmin — assigns to sibling (would normally DENY)', 'a1', 'a2', true, superadminUser),
  runTest('Superadmin — assigns upward (would normally DENY)', 'a1', 'pimpinan', true, superadminUser),
]

// ---------------------------------------------------------------------------
// assertCanAssignToOrganization THROW TESTS
// ---------------------------------------------------------------------------

export function runAssertTests(): { name: string; pass: boolean; error?: string }[] {
  const results: { name: string; pass: boolean; error?: string }[] = []

  // Should NOT throw — valid downward
  try {
    assertCanAssignToOrganization('pimpinan', 'lembaga-a', orgs)
    results.push({ name: 'Assert — Pimpinan → Lembaga A (no throw)', pass: true })
  } catch (e) {
    results.push({ name: 'Assert — Pimpinan → Lembaga A (no throw)', pass: false, error: String(e) })
  }

  // MUST throw — upward assignment
  try {
    assertCanAssignToOrganization('a1', 'lembaga-a', orgs)
    results.push({ name: 'Assert — A1 → Lembaga A (must throw)', pass: false, error: 'Did not throw' })
  } catch (_) {
    results.push({ name: 'Assert — A1 → Lembaga A (must throw)', pass: true })
  }

  // MUST throw — sibling
  try {
    assertCanAssignToOrganization('a1', 'a2', orgs)
    results.push({ name: 'Assert — A1 → A2 sibling (must throw)', pass: false, error: 'Did not throw' })
  } catch (_) {
    results.push({ name: 'Assert — A1 → A2 sibling (must throw)', pass: true })
  }

  // MUST throw — cross-branch
  try {
    assertCanAssignToOrganization('lembaga-a', 'b1', orgs)
    results.push({ name: 'Assert — Lembaga A → B1 cross-branch (must throw)', pass: false, error: 'Did not throw' })
  } catch (_) {
    results.push({ name: 'Assert — Lembaga A → B1 cross-branch (must throw)', pass: true })
  }

  // Superadmin should NOT throw — even for normally-DENY paths
  try {
    assertCanAssignToOrganization('a1', 'lembaga-a', orgs, superadminUser)
    results.push({ name: 'Assert — Superadmin upward (no throw)', pass: true })
  } catch (e) {
    results.push({ name: 'Assert — Superadmin upward (no throw)', pass: false, error: String(e) })
  }

  return results
}

// ---------------------------------------------------------------------------
// SUMMARY REPORTER (callable from browser console or test runner)
// ---------------------------------------------------------------------------

export function runAllStage6Tests(): void {
  const matrixResults = stage6TestMatrix
  const crudResults = stage6CrudTests
  const assertResults = runAssertTests()

  const allMatrix = matrixResults.filter((r) => !r.pass)
  const allCrud = crudResults.filter((r) => !r.pass)
  const allAssert = assertResults.filter((r) => !r.pass)

  console.group('=== STAGE 6 TEST MATRIX (canAssignToOrganization) ===')
  matrixResults.forEach((r) => {
    const icon = r.pass ? '✅' : '❌'
    console.log(`${icon} ${r.case} | source=${r.source} target=${r.target} | expected=${r.expected} actual=${r.actual}`)
  })
  console.groupEnd()

  console.group('=== STAGE 6 CRUD OPERATION TESTS ===')
  crudResults.forEach((r) => {
    const icon = r.pass ? '✅' : '❌'
    console.log(`${icon} ${r.case} | source=${r.source} target=${r.target} | expected=${r.expected} actual=${r.actual}`)
  })
  console.groupEnd()

  console.group('=== STAGE 6 ASSERT THROW TESTS ===')
  assertResults.forEach((r) => {
    const icon = r.pass ? '✅' : '❌'
    console.log(`${icon} ${r.name}${r.error ? ` | error: ${r.error}` : ''}`)
  })
  console.groupEnd()

  const totalFail = allMatrix.length + allCrud.length + allAssert.length
  const total = matrixResults.length + crudResults.length + assertResults.length

  console.log(`\n=== STAGE 6 FINAL: ${total - totalFail}/${total} PASSED ===`)
  if (totalFail > 0) {
    console.warn(`FAILURES:`)
    ;[...allMatrix, ...allCrud].forEach((r) => console.warn('  ❌', r.case))
    allAssert.forEach((r) => console.warn('  ❌', r.name, r.error || ''))
  } else {
    console.log('✅ ALL STAGE 6 TESTS PASSED')
  }
}

// Expose to window for browser QA
if (typeof window !== 'undefined') {
  // @ts-expect-error — intentional for QA console access
  window.__stage6Tests = runAllStage6Tests
  // @ts-expect-error
  window.__stage6Matrix = () => ({ matrix: stage6TestMatrix, crud: stage6CrudTests, asserts: runAssertTests() })
}
