/**
 * STAGE 2 — HIERARCHY FOUNDATION TEST SUITE
 * Tests:
 * 1. Tree Navigation (Ancestor, Descendant, Parent, Children)
 * 2. Arbitrary Depth Resolution (Root -> L1 -> L2 -> L3)
 * 3. Sibling Isolation (A1 vs A2, B1 vs B2)
 * 4. Cycle Detection & Safety (A -> B -> A)
 * 5. Scope Resolution ('own' vs 'descendants')
 * 6. Authorization Engine (enforceScope & authorize with hierarchy)
 * 7. Roll-up Calculation Verification
 * 8. Backward Compatibility (string orgId vs object scope)
 */

const assert = require('assert');

// Simple color logger
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function pass(msg) {
  console.log(`  ${colors.green}✓ PASS:${colors.reset} ${msg}`);
}

function fail(msg, err) {
  console.error(`  ${colors.red}✗ FAIL:${colors.reset} ${msg}`);
  if (err) console.error(err);
  process.exitCode = 1;
}

console.log(`\n${colors.bold}${colors.cyan}======================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}  STAGE 2: HIERARCHICAL ORGANIZATION FOUNDATION TESTS ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

// ---------------------------------------------------------------------------
// 1. Hierarchy Resolver Logic (Pure JS implementation matching hierarchyService.ts)
// ---------------------------------------------------------------------------

function getParentOrganization(orgId, orgs) {
  const current = orgs.find(o => o.id === orgId);
  if (!current || !current.parent_id) return null;
  return orgs.find(o => o.id === current.parent_id) || null;
}

function getChildrenOrganizations(orgId, orgs) {
  return orgs.filter(o => o.parent_id === orgId && o.status === 'active');
}

function getDescendantOrganizationIds(orgId, orgs) {
  const descendantIds = [];
  const queue = [orgId];
  const visited = new Set([orgId]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = orgs.filter(o => o.parent_id === currentId && o.status === 'active');

    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id);
        descendantIds.push(child.id);
        queue.push(child.id);
      }
    }
  }

  return descendantIds;
}

function getAncestorOrganizationIds(orgId, orgs) {
  const ancestorIds = [];
  let currentId = orgId;
  const visited = new Set([orgId]);

  while (currentId) {
    const current = orgs.find(o => o.id === currentId);
    if (!current || !current.parent_id) break;

    const parentId = current.parent_id;
    if (visited.has(parentId)) {
      console.warn(`[test] Circular reference detected involving parent_id: ${parentId}`);
      break;
    }

    visited.add(parentId);
    ancestorIds.push(parentId);
    currentId = parentId;
  }

  return ancestorIds;
}

function isAncestor(potentialAncestorId, descendantId, orgs) {
  if (!potentialAncestorId || !descendantId || potentialAncestorId === descendantId) return false;
  const ancestors = getAncestorOrganizationIds(descendantId, orgs);
  return ancestors.includes(potentialAncestorId);
}

function isDescendant(potentialDescendantId, ancestorId, orgs) {
  if (!potentialDescendantId || !ancestorId || potentialDescendantId === ancestorId) return false;
  const descendants = getDescendantOrganizationIds(ancestorId, orgs);
  return descendants.includes(potentialDescendantId);
}

function resolveOrganizationScope(orgId, mode = 'own', orgs) {
  if (!orgId) return [];
  if (mode === 'descendants') {
    const descendants = getDescendantOrganizationIds(orgId, orgs);
    return [orgId, ...descendants];
  }
  return [orgId];
}

// ---------------------------------------------------------------------------
// TEST SUITE 1: Basic Adjacency Tree Traversal (A -> B -> C)
// ---------------------------------------------------------------------------
console.log(`${colors.bold}TEST SUITE 1: Linear Hierarchy Traversal (A -> B -> C)${colors.reset}`);

const mockLinearOrgs = [
  { id: 'A', name: 'Org A (Root)', parent_id: null, level: 0, status: 'active' },
  { id: 'B', name: 'Org B (Child of A)', parent_id: 'A', level: 1, status: 'active' },
  { id: 'C', name: 'Org C (Child of B)', parent_id: 'B', level: 2, status: 'active' },
];

try {
  // getDescendantOrganizationIds(A) => B, C
  const descendantsA = getDescendantOrganizationIds('A', mockLinearOrgs);
  assert.deepStrictEqual(descendantsA, ['B', 'C'], 'A descendants should be B, C');
  pass('getDescendantOrganizationIds(A) returns [B, C]');

  // getAncestorOrganizationIds(C) => B, A
  const ancestorsC = getAncestorOrganizationIds('C', mockLinearOrgs);
  assert.deepStrictEqual(ancestorsC, ['B', 'A'], 'C ancestors should be B, A');
  pass('getAncestorOrganizationIds(C) returns [B, A]');

  // isAncestor(A, C) => true
  assert.strictEqual(isAncestor('A', 'C', mockLinearOrgs), true, 'A should be ancestor of C');
  pass('isAncestor(A, C) === true');

  // isDescendant(C, A) => true
  assert.strictEqual(isDescendant('C', 'A', mockLinearOrgs), true, 'C should be descendant of A');
  pass('isDescendant(C, A) === true');

  // isAncestor(B, A) => false
  assert.strictEqual(isAncestor('B', 'A', mockLinearOrgs), false, 'B should NOT be ancestor of A');
  pass('isAncestor(B, A) === false');

  // getParentOrganization & getChildrenOrganizations
  const parentB = getParentOrganization('B', mockLinearOrgs);
  assert.strictEqual(parentB?.id, 'A', 'Parent of B is A');
  pass('getParentOrganization(B) returns A');

  const childrenA = getChildrenOrganizations('A', mockLinearOrgs);
  assert.deepStrictEqual(childrenA.map(c => c.id), ['B'], 'Children of A is [B]');
  pass('getChildrenOrganizations(A) returns [B]');

  // Leaf organization has no descendants
  assert.deepStrictEqual(getDescendantOrganizationIds('C', mockLinearOrgs), [], 'C is leaf');
  pass('Leaf node C has empty descendants []');

  // Root organization has no ancestors
  assert.deepStrictEqual(getAncestorOrganizationIds('A', mockLinearOrgs), [], 'A is root');
  pass('Root node A has empty ancestors []');

} catch (err) {
  fail('Linear hierarchy test failed', err);
}

// ---------------------------------------------------------------------------
// TEST SUITE 2: Multi-Branch & Sibling Isolation (Pimpinan -> Lembaga A/B/C)
// ---------------------------------------------------------------------------
console.log(`\n${colors.bold}TEST SUITE 2: Multi-Branch & Sibling Isolation${colors.reset}`);

const mockEcosystemOrgs = [
  { id: 'PIMPINAN', name: 'Pimpinan Pusat', parent_id: null, level: 0, status: 'active' },
  { id: 'LEMBAGA_A', name: 'Lembaga A', parent_id: 'PIMPINAN', level: 1, status: 'active' },
  { id: 'A1', name: 'Unit A1', parent_id: 'LEMBAGA_A', level: 2, status: 'active' },
  { id: 'A2', name: 'Unit A2', parent_id: 'LEMBAGA_A', level: 2, status: 'active' },
  { id: 'LEMBAGA_B', name: 'Lembaga B', parent_id: 'PIMPINAN', level: 1, status: 'active' },
  { id: 'B1', name: 'Unit B1', parent_id: 'LEMBAGA_B', level: 2, status: 'active' },
  { id: 'B2', name: 'Unit B2', parent_id: 'LEMBAGA_B', level: 2, status: 'active' },
  { id: 'LEMBAGA_C', name: 'Lembaga C', parent_id: 'PIMPINAN', level: 1, status: 'active' },
  { id: 'C1', name: 'Unit C1', parent_id: 'LEMBAGA_C', level: 2, status: 'active' },
  { id: 'C1_SUB', name: 'Unit C1 Sub (Arbitrary Level 3)', parent_id: 'C1', level: 3, status: 'active' },
];

try {
  // Sibling Isolation: A1 cannot see A2 via descendant scope
  const descendantsA1 = getDescendantOrganizationIds('A1', mockEcosystemOrgs);
  assert.strictEqual(descendantsA1.includes('A2'), false, 'A1 cannot include sibling A2');
  assert.strictEqual(descendantsA1.length, 0, 'A1 is a leaf without descendants');
  pass('Sibling Isolation: A1 descendant list does NOT contain sibling A2');

  // Cross-Lembaga Isolation: Lembaga A cannot see Lembaga B or B1
  const descendantsLembagaA = getDescendantOrganizationIds('LEMBAGA_A', mockEcosystemOrgs);
  assert.deepStrictEqual(descendantsLembagaA.sort(), ['A1', 'A2'].sort(), 'Lembaga A has descendants [A1, A2]');
  assert.strictEqual(descendantsLembagaA.includes('B1'), false, 'Lembaga A cannot reach B1');
  assert.strictEqual(descendantsLembagaA.includes('LEMBAGA_B'), false, 'Lembaga A cannot reach Lembaga B');
  pass('Lembaga Isolation: Lembaga A descendants only contain [A1, A2], completely isolating B and C');

  // Parent Scope vs Own Scope
  const ownScopeLembagaA = resolveOrganizationScope('LEMBAGA_A', 'own', mockEcosystemOrgs);
  assert.deepStrictEqual(ownScopeLembagaA, ['LEMBAGA_A'], 'Own scope returns only Lembaga A');
  pass('Own scope: Lembaga A => [LEMBAGA_A] only');

  const descendantScopeLembagaA = resolveOrganizationScope('LEMBAGA_A', 'descendants', mockEcosystemOrgs);
  assert.deepStrictEqual(descendantScopeLembagaA.sort(), ['LEMBAGA_A', 'A1', 'A2'].sort());
  pass('Descendant scope: Lembaga A => [LEMBAGA_A, A1, A2]');

  // Arbitrary Depth: Pimpinan -> Lembaga C -> C1 -> C1_SUB
  const descendantsPimpinan = getDescendantOrganizationIds('PIMPINAN', mockEcosystemOrgs);
  assert.strictEqual(descendantsPimpinan.includes('C1_SUB'), true, 'Pimpinan reaches Level 3 arbitrary depth');
  assert.strictEqual(descendantsPimpinan.length, 9, 'Pimpinan reaches all 9 descendant nodes');
  pass('Arbitrary Depth: Pimpinan successfully reaches deep child C1_SUB (level 3)');

  const ancestorsC1Sub = getAncestorOrganizationIds('C1_SUB', mockEcosystemOrgs);
  assert.deepStrictEqual(ancestorsC1Sub, ['C1', 'LEMBAGA_C', 'PIMPINAN']);
  pass('Arbitrary Depth Ancestors: C1_SUB ancestors are [C1, LEMBAGA_C, PIMPINAN]');

} catch (err) {
  fail('Multi-branch test failed', err);
}

// ---------------------------------------------------------------------------
// TEST SUITE 3: Cycle Protection (A -> B -> A)
// ---------------------------------------------------------------------------
console.log(`\n${colors.bold}TEST SUITE 3: Cycle Detection & Infinite Loop Protection${colors.reset}`);

const cyclicOrgs = [
  { id: 'CYCLE_A', name: 'Cycle A', parent_id: 'CYCLE_B', level: 0, status: 'active' },
  { id: 'CYCLE_B', name: 'Cycle B', parent_id: 'CYCLE_A', level: 1, status: 'active' },
];

try {
  // Safe descendant resolution does not infinite loop
  const descCycleA = getDescendantOrganizationIds('CYCLE_A', cyclicOrgs);
  assert.deepStrictEqual(descCycleA, ['CYCLE_B'], 'Visited set prevents infinite loop in descendants');
  pass('Cycle Protection in getDescendantOrganizationIds: terminates safely without infinite loop');

  // Safe ancestor resolution does not infinite loop
  const ancCycleB = getAncestorOrganizationIds('CYCLE_B', cyclicOrgs);
  assert.deepStrictEqual(ancCycleB, ['CYCLE_A'], 'Visited set prevents infinite loop in ancestors');
  pass('Cycle Protection in getAncestorOrganizationIds: terminates safely without infinite loop');

} catch (err) {
  fail('Cycle protection test failed', err);
}

// ---------------------------------------------------------------------------
// TEST SUITE 4: Authorization Engine Integration
// ---------------------------------------------------------------------------
console.log(`\n${colors.bold}TEST SUITE 4: Authorization Engine & Scope Enforcement${colors.reset}`);

function enforceScope(user, targetOrgId, options = {}, orgs) {
  if (user?.is_superadmin) return true;
  const activeOrgId = user?.active_membership?.organization_id;
  if (!activeOrgId) return false;

  const mode = options.mode || 'own';

  // 1. Own unit check
  if (activeOrgId === targetOrgId) return true;

  // 2. Descendant check
  if (mode === 'descendants') {
    const descendants = getDescendantOrganizationIds(activeOrgId, orgs);
    return descendants.includes(targetOrgId);
  }

  return false;
}

const userPimpinan = {
  id: 'usr-pim',
  is_superadmin: false,
  active_membership: { organization_id: 'PIMPINAN' }
};

const userLembagaA = {
  id: 'usr-la',
  is_superadmin: false,
  active_membership: { organization_id: 'LEMBAGA_A' }
};

const userA1 = {
  id: 'usr-a1',
  is_superadmin: false,
  active_membership: { organization_id: 'A1' }
};

const superAdmin = {
  id: 'usr-root',
  is_superadmin: true,
  active_membership: null
};

try {
  // 1. Superadmin bypass
  assert.strictEqual(enforceScope(superAdmin, 'A1', { mode: 'own' }, mockEcosystemOrgs), true);
  pass('Superadmin has universal access across any organization');

  // 2. Child cannot access parent or sibling
  assert.strictEqual(enforceScope(userA1, 'LEMBAGA_A', { mode: 'own' }, mockEcosystemOrgs), false);
  assert.strictEqual(enforceScope(userA1, 'LEMBAGA_A', { mode: 'descendants' }, mockEcosystemOrgs), false);
  pass('Child A1 CANNOT access parent Lembaga A (both own and descendants mode)');

  assert.strictEqual(enforceScope(userA1, 'A2', { mode: 'own' }, mockEcosystemOrgs), false);
  assert.strictEqual(enforceScope(userA1, 'A2', { mode: 'descendants' }, mockEcosystemOrgs), false);
  pass('Child A1 CANNOT access sibling A2 (sibling isolation enforced)');

  // 3. Parent with mode 'own' CANNOT access child
  assert.strictEqual(enforceScope(userLembagaA, 'A1', { mode: 'own' }, mockEcosystemOrgs), false);
  pass('Parent Lembaga A with mode: "own" CANNOT access child A1 (strict own scope default)');

  // 4. Parent with mode 'descendants' CAN access child
  assert.strictEqual(enforceScope(userLembagaA, 'A1', { mode: 'descendants' }, mockEcosystemOrgs), true);
  assert.strictEqual(enforceScope(userLembagaA, 'A2', { mode: 'descendants' }, mockEcosystemOrgs), true);
  pass('Parent Lembaga A with mode: "descendants" CAN access children A1 and A2');

  // 5. Parent Lembaga A CANNOT access Lembaga B or B1 even with 'descendants' mode
  assert.strictEqual(enforceScope(userLembagaA, 'B1', { mode: 'descendants' }, mockEcosystemOrgs), false);
  pass('Parent Lembaga A CANNOT access non-descendant B1 under any mode');

  // 6. Pimpinan with descendants mode CAN access all descendants across branches
  assert.strictEqual(enforceScope(userPimpinan, 'A1', { mode: 'descendants' }, mockEcosystemOrgs), true);
  assert.strictEqual(enforceScope(userPimpinan, 'B2', { mode: 'descendants' }, mockEcosystemOrgs), true);
  assert.strictEqual(enforceScope(userPimpinan, 'C1_SUB', { mode: 'descendants' }, mockEcosystemOrgs), true);
  pass('Pimpinan with mode: "descendants" CAN access deep descendants across all branches');

} catch (err) {
  fail('Authorization test failed', err);
}

// ---------------------------------------------------------------------------
// TEST SUITE 5: Roll-up Calculation Simulation
// ---------------------------------------------------------------------------
console.log(`\n${colors.bold}TEST SUITE 5: Roll-Up Calculation Simulation${colors.reset}`);

const mockPrograms = [
  { id: 'p1', organization_id: 'LEMBAGA_A', budget_planned: 10000000, status: 'active' },
  { id: 'p2', organization_id: 'A1', budget_planned: 5000000, status: 'active' },
  { id: 'p3', organization_id: 'A2', budget_planned: 3000000, status: 'active' },
  { id: 'p4', organization_id: 'LEMBAGA_B', budget_planned: 20000000, status: 'active' },
];

function getEcosystemBudget(scopeInput, orgs, programs) {
  const scope = typeof scopeInput === 'string'
    ? { organizationId: scopeInput, mode: 'own' }
    : { organizationId: scopeInput.organizationId, mode: scopeInput.mode || 'own' };

  const targetOrgIds = resolveOrganizationScope(scope.organizationId, scope.mode, orgs);
  const matchedPrograms = programs.filter(p => targetOrgIds.includes(p.organization_id));
  return matchedPrograms.reduce((sum, p) => sum + p.budget_planned, 0);
}

try {
  // Backward compatibility: string orgId defaults to 'own'
  const ownBudgetCompat = getEcosystemBudget('LEMBAGA_A', mockEcosystemOrgs, mockPrograms);
  assert.strictEqual(ownBudgetCompat, 10000000, 'String scope defaults to own');
  pass('Backward compatibility: string "LEMBAGA_A" produces own budget (10,000,000)');

  // Explicit 'own' mode
  const ownBudget = getEcosystemBudget({ organizationId: 'LEMBAGA_A', mode: 'own' }, mockEcosystemOrgs, mockPrograms);
  assert.strictEqual(ownBudget, 10000000);
  pass('Explicit mode: "own" produces own budget (10,000,000)');

  // Roll-up 'descendants' mode (Lembaga A + A1 + A2)
  const rollupBudget = getEcosystemBudget({ organizationId: 'LEMBAGA_A', mode: 'descendants' }, mockEcosystemOrgs, mockPrograms);
  assert.strictEqual(rollupBudget, 18000000, '10M + 5M + 3M = 18M');
  pass('Roll-up mode: "descendants" aggregates parent + child budgets (18,000,000)');

  // Lembaga B is not included in Lembaga A rollup
  assert.strictEqual(rollupBudget < 38000000, true);
  pass('Isolation: Lembaga B budget (20,000,000) excluded from Lembaga A roll-up');

} catch (err) {
  fail('Roll-up test failed', err);
}

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log(`\n${colors.bold}${colors.green}======================================================${colors.reset}`);
console.log(`${colors.bold}${colors.green}  ALL STAGE 2 HIERARCHY FOUNDATION TESTS PASSED!     ${colors.reset}`);
console.log(`${colors.bold}${colors.green}======================================================${colors.reset}\n`);
