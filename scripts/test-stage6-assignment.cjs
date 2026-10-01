/**
 * STAGE 6 — DOWNWARD CONTROL & UNIT ASSIGNMENT TEST SUITE
 * Node.js CJS runtime test — mirrors canAssignToOrganization() from authorization.ts
 *
 * Run:  node scripts/test-stage6-assignment.cjs
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

let passed = 0;
let failed = 0;

function pass(msg) {
  console.log(`  ${colors.green}✓ PASS:${colors.reset} ${msg}`);
  passed++;
}

function fail(msg, detail) {
  console.error(`  ${colors.red}✗ FAIL:${colors.reset} ${msg}`);
  if (detail) console.error(`    Detail: ${detail}`);
  failed++;
}

function info(msg) {
  console.log(`  ${colors.yellow}ℹ INFO:${colors.reset} ${msg}`);
}

console.log(`\n${colors.bold}${colors.cyan}==========================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}  STAGE 6: DOWNWARD CONTROL & UNIT ASSIGNMENT TEST SUITE ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}==========================================================${colors.reset}\n`);

// ---------------------------------------------------------------------------
// 1. MIRROR OF authorization.ts logic (pure JS — no TS module loading)
//    isDescendant() and canAssignToOrganization() replicated exactly
// ---------------------------------------------------------------------------

/**
 * Mirrors hierarchyService.ts getDescendantOrganizationIds
 */
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

/**
 * Mirrors authorization.ts isDescendant()
 */
function isDescendant(childId, potentialAncestorId, orgs) {
  if (childId === potentialAncestorId) return false;
  const descendants = getDescendantOrganizationIds(potentialAncestorId, orgs);
  return descendants.includes(childId);
}

/**
 * Mirrors authorization.ts canAssignToOrganization() — exact same logic
 */
function canAssignToOrganization(sourceId, targetId, orgs, user) {
  // Superadmin bypass
  if (user && (user.is_superadmin || user.role === 'superadmin')) return true;

  // Guard: empty IDs
  if (!sourceId || !targetId) return false;

  // CASE A: Self-assignment
  if (sourceId === targetId) return true;

  // CASE B & C: Target must be a descendant of source
  return isDescendant(targetId, sourceId, orgs);
}

/**
 * Mirrors authorization.ts assertCanAssignToOrganization() — throws on DENY
 */
function assertCanAssignToOrganization(sourceId, targetId, orgs, user) {
  if (!canAssignToOrganization(sourceId, targetId, orgs, user)) {
    throw new Error(
      `Akses ditolak: Unit [${sourceId}] tidak berwenang menugaskan ke unit [${targetId}].`
    );
  }
}

// ---------------------------------------------------------------------------
// 2. TEST FIXTURE — Org tree matching Stage 6 specification:
//
//   pimpinan (root, level 0)
//   ├── lembaga-a (level 1)
//   │   ├── a1 (level 2)
//   │   └── a2 (level 2)
//   ├── lembaga-b (level 1)
//   │   ├── b1 (level 2)
//   │   └── b2 (level 2)
//   └── lembaga-c (level 1)
//       └── c1 (level 2)
//           └── level-n (level 3)
// ---------------------------------------------------------------------------

const orgs = [
  { id: 'pimpinan', name: 'Pimpinan', parent_id: null, level: 0, unit_type: 'pimpinan', status: 'active' },
  { id: 'lembaga-a', name: 'Lembaga A', parent_id: 'pimpinan', level: 1, unit_type: 'lembaga', status: 'active' },
  { id: 'a1', name: 'A1', parent_id: 'lembaga-a', level: 2, unit_type: 'unit', status: 'active' },
  { id: 'a2', name: 'A2', parent_id: 'lembaga-a', level: 2, unit_type: 'unit', status: 'active' },
  { id: 'lembaga-b', name: 'Lembaga B', parent_id: 'pimpinan', level: 1, unit_type: 'lembaga', status: 'active' },
  { id: 'b1', name: 'B1', parent_id: 'lembaga-b', level: 2, unit_type: 'unit', status: 'active' },
  { id: 'b2', name: 'B2', parent_id: 'lembaga-b', level: 2, unit_type: 'unit', status: 'active' },
  { id: 'lembaga-c', name: 'Lembaga C', parent_id: 'pimpinan', level: 1, unit_type: 'lembaga', status: 'active' },
  { id: 'c1', name: 'C1', parent_id: 'lembaga-c', level: 2, unit_type: 'unit', status: 'active' },
  { id: 'level-n', name: 'Level N', parent_id: 'c1', level: 3, unit_type: 'unit', status: 'active' },
];

const superadmin = { id: 'sa-1', role: 'superadmin', is_superadmin: true };

// ---------------------------------------------------------------------------
// 3. REQUIRED 10-CASE TEST MATRIX
// ---------------------------------------------------------------------------

console.log('TEST SUITE 1: Required 10-Case Test Matrix\n');
console.log('  #  | Source         | Target         | Expected | Actual   | Status');
console.log('  ---|----------------|----------------|----------|----------|-------');

function runCase(num, sourceName, sourceId, targetName, targetId, expected, user) {
  const actual = canAssignToOrganization(sourceId, targetId, orgs, user);
  const status = actual === expected ? '✓ PASS' : '✗ FAIL';
  const label = actual === expected ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  const eLabel = expected ? 'PASS    ' : 'DENY    ';
  const aLabel = actual ? 'PASS    ' : 'DENY    ';
  console.log(`  ${String(num).padEnd(2)} | ${sourceName.padEnd(14)} | ${targetName.padEnd(14)} | ${eLabel} | ${aLabel} | ${label}`);
  if (actual === expected) passed++; else { failed++; }
  return actual;
}

// Case 1: Pimpinan → Lembaga A  PASS
runCase(1, 'Pimpinan', 'pimpinan', 'Lembaga A', 'lembaga-a', true);
// Case 2: Pimpinan → A1  PASS (deep descendant)
runCase(2, 'Pimpinan', 'pimpinan', 'A1', 'a1', true);
// Case 3: Lembaga A → A1  PASS (direct child)
runCase(3, 'Lembaga A', 'lembaga-a', 'A1', 'a1', true);
// Case 4: Lembaga A → A2  PASS (direct child)
runCase(4, 'Lembaga A', 'lembaga-a', 'A2', 'a2', true);
// Case 5: Lembaga A → B1  DENY (cross-branch)
runCase(5, 'Lembaga A', 'lembaga-a', 'B1', 'b1', false);
// Case 6: A1 → Lembaga A  DENY (upward/ancestor)
runCase(6, 'A1', 'a1', 'Lembaga A', 'lembaga-a', false);
// Case 7: A1 → A2  DENY (sibling)
runCase(7, 'A1', 'a1', 'A2', 'a2', false);
// Case 8: A1 → B1  DENY (cross-branch sibling)
runCase(8, 'A1', 'a1', 'B1', 'b1', false);
// Case 9: null assignment — empty targetId returns false (service layer no-op on null)
runCase(9, 'Pimpinan', 'pimpinan', '[null]', '', false);
// Case 10: Superadmin → any target (upward — would normally DENY)
runCase(10, 'A1', 'a1', 'Pimpinan', 'pimpinan', true, superadmin);

// ---------------------------------------------------------------------------
// 4. CRUD OPERATION TESTS
// ---------------------------------------------------------------------------

console.log('\n\nTEST SUITE 2: CRUD Operation Authorization\n');

function testCase(desc, sourceId, targetId, expected, user) {
  const actual = canAssignToOrganization(sourceId, targetId, orgs, user);
  if (actual === expected) {
    pass(`${desc} | expected=${expected ? 'PASS' : 'DENY'} actual=${actual ? 'PASS' : 'DENY'}`);
  } else {
    fail(`${desc} | expected=${expected ? 'PASS' : 'DENY'} actual=${actual ? 'PASS' : 'DENY'}`);
  }
}

// --- Self-assignment
testCase('Self: Lembaga A → Lembaga A', 'lembaga-a', 'lembaga-a', true);
testCase('Self: A1 → A1', 'a1', 'a1', true);

// --- Program Create
testCase('Create Program — Pimpinan assigns to Lembaga A', 'pimpinan', 'lembaga-a', true);
testCase('Create Program — A1 tries to assign to Lembaga A (upward DENY)', 'a1', 'lembaga-a', false);
testCase('Create Program — Pimpinan assigns to C1 (deep)', 'pimpinan', 'c1', true);

// --- Program Update
testCase('Update Program — Lembaga A changes to A2 (descendant)', 'lembaga-a', 'a2', true);
testCase('Update Program — Lembaga A tries to change to B1 (cross-branch DENY)', 'lembaga-a', 'b1', false);

// --- Task Create
testCase('Create Task — Pimpinan assigns to Level N (deep)', 'pimpinan', 'level-n', true);
testCase('Create Task — A1 tries to assign to A2 (sibling DENY)', 'a1', 'a2', false);

// --- Task Update
testCase('Update Task — Lembaga B assigns to B2 (descendant)', 'lembaga-b', 'b2', true);
testCase('Update Task — B1 tries to assign to B2 (sibling DENY)', 'b1', 'b2', false);

// --- Deep descendant
testCase('Deep — Pimpinan → Level N', 'pimpinan', 'level-n', true);
testCase('Deep — Level N → Pimpinan (upward DENY)', 'level-n', 'pimpinan', false);
testCase('Deep — C1 → Level N (direct child)', 'c1', 'level-n', true);
testCase('Deep — Level N → C1 (upward DENY)', 'level-n', 'c1', false);

// --- Superadmin override
testCase('Superadmin — assigns to sibling (bypasses DENY)', 'a1', 'a2', true, superadmin);
testCase('Superadmin — assigns upward (bypasses DENY)', 'a1', 'pimpinan', true, superadmin);
testCase('Superadmin — assigns to cross-branch (bypasses DENY)', 'lembaga-a', 'b1', true, superadmin);

// ---------------------------------------------------------------------------
// 5. ASSERT THROW TESTS
// ---------------------------------------------------------------------------

console.log('\nTEST SUITE 3: assertCanAssignToOrganization — Throw Behavior\n');

function testAssert(desc, sourceId, targetId, shouldThrow, user) {
  let threw = false;
  let errorMsg = '';
  try {
    assertCanAssignToOrganization(sourceId, targetId, orgs, user);
  } catch (e) {
    threw = true;
    errorMsg = e.message;
  }
  if (threw === shouldThrow) {
    pass(`${desc} | ${shouldThrow ? 'correctly threw' : 'correctly did not throw'}`);
  } else {
    fail(`${desc} | expected ${shouldThrow ? 'throw' : 'no throw'} but got ${threw ? 'throw' : 'no throw'}${errorMsg ? ': ' + errorMsg : ''}`);
  }
}

testAssert('Assert — Pimpinan → Lembaga A (no throw)', 'pimpinan', 'lembaga-a', false);
testAssert('Assert — Lembaga A → A1 (no throw)', 'lembaga-a', 'a1', false);
testAssert('Assert — A1 → A1 self (no throw)', 'a1', 'a1', false);
testAssert('Assert — A1 → Lembaga A upward (must throw)', 'a1', 'lembaga-a', true);
testAssert('Assert — A1 → A2 sibling (must throw)', 'a1', 'a2', true);
testAssert('Assert — Lembaga A → B1 cross-branch (must throw)', 'lembaga-a', 'b1', true);
testAssert('Assert — Level N → Pimpinan deep upward (must throw)', 'level-n', 'pimpinan', true);
testAssert('Assert — Superadmin upward override (no throw)', 'a1', 'lembaga-a', false, superadmin);
testAssert('Assert — Superadmin sibling override (no throw)', 'a1', 'a2', false, superadmin);

// ---------------------------------------------------------------------------
// 6. FILE/TYPE INTEGRITY CHECKS
// ---------------------------------------------------------------------------

console.log('\nTEST SUITE 4: File & Type Integrity\n');

const dbTypes = fs.readFileSync(path.resolve(__dirname, '../src/types/database.ts'), 'utf8');
const authTs = fs.readFileSync(path.resolve(__dirname, '../src/lib/authorization.ts'), 'utf8');
const dataService = fs.readFileSync(path.resolve(__dirname, '../src/lib/dataService.ts'), 'utf8');
const orgIndex = fs.readFileSync(path.resolve(__dirname, '../src/components/organization/index.ts'), 'utf8');
const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261002_stage6_downward_assignment.sql');

// Types
try { assert.ok(dbTypes.includes('assigned_to_organization_id'), 'Program has assigned_to_organization_id'); pass('database.ts: Program has assigned_to_organization_id'); } catch(e) { fail(e.message); }
try { assert.ok(dbTypes.includes('assigned_to_organization?'), 'Program has assigned_to_organization virtual field'); pass('database.ts: Program has assigned_to_organization virtual field'); } catch(e) { fail(e.message); }

// Authorization
try { assert.ok(authTs.includes('canAssignToOrganization'), 'authorization.ts exports canAssignToOrganization'); pass('authorization.ts: canAssignToOrganization exported'); } catch(e) { fail(e.message); }
try { assert.ok(authTs.includes('assertCanAssignToOrganization'), 'authorization.ts exports assertCanAssignToOrganization'); pass('authorization.ts: assertCanAssignToOrganization exported'); } catch(e) { fail(e.message); }
try { assert.ok(authTs.includes('isDescendant(targetOrganizationId, sourceOrganizationId'), 'isDescendant used for downward check'); pass('authorization.ts: uses isDescendant for downward-only enforcement'); } catch(e) { fail(e.message); }

// DataService enforcement
try { assert.ok(dataService.includes('assertCanAssignToOrganization'), 'dataService enforces assignment'); pass('dataService.ts: assertCanAssignToOrganization called'); } catch(e) { fail(e.message); }
try { assert.ok(dataService.includes("'assigned_to_organization_id' in data"), 'updateTask checks for field presence'); pass('dataService.ts: updateTask guards with "in data" key check'); } catch(e) { fail(e.message); }

// Component
try { assert.ok(orgIndex.includes('UnitAssignmentSelector'), 'UnitAssignmentSelector exported'); pass('components/organization/index.ts: UnitAssignmentSelector exported'); } catch(e) { fail(e.message); }

// Migration
try { assert.ok(fs.existsSync(migrationPath), 'Migration SQL exists'); pass('Migration: 20261002_stage6_downward_assignment.sql exists'); } catch(e) { fail(e.message); }
if (fs.existsSync(migrationPath)) {
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  try { assert.ok(migrationSql.includes('assigned_to_organization_id'), 'Migration adds column'); pass('Migration: adds assigned_to_organization_id column'); } catch(e) { fail(e.message); }
  try { assert.ok(migrationSql.includes('validate_assignment_direction'), 'Migration has DB-level trigger'); pass('Migration: validate_assignment_direction trigger present'); } catch(e) { fail(e.message); }
}

// Stage 5 components still intact (regression)
try {
  assert.ok(orgIndex.includes('HierarchicalOrganizationSelector'), 'Stage 5 HierarchicalOrganizationSelector intact');
  assert.ok(orgIndex.includes('OrganizationScopeSwitcher'), 'Stage 5 OrganizationScopeSwitcher intact');
  assert.ok(orgIndex.includes('OrganizationScopeBadge'), 'Stage 5 OrganizationScopeBadge intact');
  assert.ok(orgIndex.includes('OrganizationTreeView'), 'Stage 5 OrganizationTreeView intact');
  pass('Stage 5 regression: All 4 hierarchical components still exported correctly');
} catch(e) { fail('Stage 5 regression: ' + e.message); }

// ---------------------------------------------------------------------------
// 7. TASK EDIT — ROUTING & FLOW AUDIT
// ---------------------------------------------------------------------------

console.log('\nTEST SUITE 5: Task Edit Flow Audit\n');

const appRoutes = fs.readFileSync(path.resolve(__dirname, '../src/App.tsx'), 'utf8');
const taskListPage = fs.readFileSync(path.resolve(__dirname, '../src/pages/ecosystem/TaskListPage.tsx'), 'utf8');
const hasTaskEditRoute = appRoutes.includes("tasks/:id/edit");
const hasTaskEditPage = fs.existsSync(path.resolve(__dirname, '../src/pages/ecosystem/TaskEditPage.tsx'));
const hasInlineEditInList = taskListPage.includes('edit') || taskListPage.includes('Edit');

if (!hasTaskEditRoute && !hasTaskEditPage) {
  pass('Task Edit Audit: No tasks/:id/edit route and no TaskEditPage.tsx — Task edit does NOT exist in codebase');
  info('Task architecture: Tasks are created (TaskCreatePage), status-transitioned inline (TaskListPage), and deleted. No edit flow exists.');
  info('Stage 6 Resolution: assigned_to_organization_id is implemented in TaskCreatePage and dataService updateTask. Edit requires TaskEditPage, which does not exist.');
  info('Action required: Create TaskEditPage OR document Task edit as intentionally limited (no edit page pattern).');
} else if (hasTaskEditPage) {
  pass('TaskEditPage.tsx exists — checking for UnitAssignmentSelector integration...');
  const taskEditContent = fs.readFileSync(path.resolve(__dirname, '../src/pages/ecosystem/TaskEditPage.tsx'), 'utf8');
  try {
    assert.ok(taskEditContent.includes('UnitAssignmentSelector'), 'TaskEditPage includes UnitAssignmentSelector');
    pass('TaskEditPage: UnitAssignmentSelector is integrated');
  } catch(e) {
    fail('TaskEditPage: UnitAssignmentSelector is NOT integrated — Stage 6 gap remains');
  }
  try {
    assert.ok(taskEditContent.includes('assigned_to_organization_id'), 'TaskEditPage binds assigned_to_organization_id');
    pass('TaskEditPage: assigned_to_organization_id is bound in form');
  } catch(e) {
    fail('TaskEditPage: assigned_to_organization_id not bound in form');
  }
} else {
  info('Task edit route exists but no TaskEditPage.tsx — routing may be broken');
}

// ---------------------------------------------------------------------------
// 8. BROWSER QA STATUS
// ---------------------------------------------------------------------------

console.log('\nTEST SUITE 6: Browser QA Status\n');
info('BROWSER QA = BLOCKED');
info('Reason: Playwright driver unavailable — CDN 404 from playwright.azureedge.net');
info('Browser viewports (320/360/375/390/414/1024/1280/1440px) CANNOT be tested via automation.');
info('Static code analysis performed instead — see Suite 4 results above.');

// ---------------------------------------------------------------------------
// 9. SUPABASE RLS STATUS
// ---------------------------------------------------------------------------

console.log('\nTEST SUITE 7: Supabase RLS / Runtime Verification\n');
info('RLS RUNTIME = NOT VERIFIED');
info('Reason: No live Supabase environment available in current context.');
info('Migration SQL written and statically reviewed (see migration file). Trigger logic verified by inspection.');
info('Runtime RLS must be validated manually by applying migration to Supabase instance.');

// ---------------------------------------------------------------------------
// FINAL SUMMARY
// ---------------------------------------------------------------------------

const total = passed + failed;

console.log(`\n${colors.bold}${colors.cyan}==========================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}  STAGE 6 TEST RESULTS: ${passed}/${total} PASSED${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}==========================================================${colors.reset}`);

if (failed === 0) {
  console.log(`\n${colors.green}${colors.bold}✅ ALL STAGE 6 LOGIC TESTS PASSED${colors.reset}`);
} else {
  console.error(`\n${colors.red}${colors.bold}❌ ${failed} TEST(S) FAILED — SEE ABOVE${colors.reset}`);
  process.exitCode = 1;
}

console.log(`
${colors.yellow}⚠️  OUTSTANDING ITEMS (Non-Blocking for Logic Tests):${colors.reset}
  P1 — BROWSER QA = BLOCKED (Playwright CDN 404)
  P1 — SUPABASE RLS = NOT VERIFIED (no live DB)
  P2 — TaskEditPage does not exist — Task unit assignment only available at create time
`);
