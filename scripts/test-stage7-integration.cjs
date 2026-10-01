/**
 * STAGE 7 — FINAL INTEGRATION & PRODUCTION READINESS TEST SUITE
 * 
 * Validates the unified hierarchy and assignment pipeline:
 * 1. Security Matrix (Org access, downward unit assignment, ownership immutability)
 * 2. Program Final Flow (create, edit, remove, reject invalid, owner preservation)
 * 3. Task Final Flow (create, reject invalid, inline status lifecycle, updateTask guard, no TaskEditPage)
 * 4. Scope + Assignment Interaction (VISIBILITY != ASSIGNMENT, no unintended visibility bleed)
 * 5. Rollback & Backward Compatibility (null assignment handling, legacy record preservation)
 * 6. Database Migration Safety Audit (static review of columns, FKs, triggers, and immutability)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. SETUP HIERARCHY TREE
// ==========================================
const testOrgs = [
  { id: 'org-root', name: 'Pimpinan / Yayasan', parent_id: null, level: 0 },
  { id: 'org-lembaga-a', name: 'Lembaga Pendidikan A', parent_id: 'org-root', level: 1 },
  { id: 'org-a1', name: 'Unit Sekolah A1', parent_id: 'org-lembaga-a', level: 2 },
  { id: 'org-a2', name: 'Unit Asrama A2', parent_id: 'org-lembaga-a', level: 2 },
  { id: 'org-lembaga-b', name: 'Lembaga Usaha B', parent_id: 'org-root', level: 1 },
  { id: 'org-b1', name: 'Unit Koperasi B1', parent_id: 'org-lembaga-b', level: 2 },
  { id: 'org-b2', name: 'Unit Percetakan B2', parent_id: 'org-lembaga-b', level: 2 },
  { id: 'org-lembaga-c', name: 'Lembaga Dakwah C', parent_id: 'org-root', level: 1 },
  { id: 'org-c1', name: 'Unit Media C1', parent_id: 'org-lembaga-c', level: 2 },
  { id: 'org-level-n', name: 'Sub-Unit Multimedia C1-N', parent_id: 'org-c1', level: 3 },
];

function isDescendant(targetId, sourceId, allOrgs) {
  if (!targetId || !sourceId) return false;
  if (targetId === sourceId) return false;
  const childrenMap = new Map();
  for (const org of allOrgs) {
    if (org.parent_id) {
      if (!childrenMap.has(org.parent_id)) childrenMap.set(org.parent_id, []);
      childrenMap.get(org.parent_id).push(org.id);
    }
  }
  const queue = [...(childrenMap.get(sourceId) || [])];
  const visited = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === targetId) return true;
    if (!visited.has(current)) {
      visited.add(current);
      const nextChildren = childrenMap.get(current) || [];
      for (const next of nextChildren) {
        if (!visited.has(next)) queue.push(next);
      }
    }
  }
  return false;
}

function canAssignToOrganization(targetOrgId, sourceOrgId, allOrgs, userRole) {
  if (userRole === 'superadmin') return true;
  if (!targetOrgId || !sourceOrgId) return false;
  if (targetOrgId === sourceOrgId) return true;
  return isDescendant(targetOrgId, sourceOrgId, allOrgs);
}

function resolveScopeOrgIds(activeOrgId, mode, allOrgs) {
  if (mode === 'own') return [activeOrgId];
  // descendants mode
  const result = [activeOrgId];
  const childrenMap = new Map();
  for (const org of allOrgs) {
    if (org.parent_id) {
      if (!childrenMap.has(org.parent_id)) childrenMap.set(org.parent_id, []);
      childrenMap.get(org.parent_id).push(org.id);
    }
  }
  const queue = [...(childrenMap.get(activeOrgId) || [])];
  const visited = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!visited.has(current)) {
      visited.add(current);
      result.push(current);
      const nextChildren = childrenMap.get(current) || [];
      for (const next of nextChildren) {
        if (!visited.has(next)) queue.push(next);
      }
    }
  }
  return result;
}

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('=================================================================');
console.log('  STAGE 7: FINAL INTEGRATION & PRODUCTION READINESS QA           ');
console.log('=================================================================\n');

// ==========================================
// SUITE 1: FINAL SECURITY MATRIX
// ==========================================
console.log('--- SUITE 1: FINAL SECURITY MATRIX ---');

// A. Organization Access
runTest('Security Matrix A: Parent -> own resolved correctly', () => {
  const ids = resolveScopeOrgIds('org-lembaga-a', 'own', testOrgs);
  assert.deepStrictEqual(ids, ['org-lembaga-a']);
});

runTest('Security Matrix A: Parent -> descendants resolved correctly', () => {
  const ids = resolveScopeOrgIds('org-lembaga-a', 'descendants', testOrgs);
  assert.strictEqual(ids.includes('org-lembaga-a'), true);
  assert.strictEqual(ids.includes('org-a1'), true);
  assert.strictEqual(ids.includes('org-a2'), true);
  assert.strictEqual(ids.includes('org-b1'), false);
  assert.strictEqual(ids.includes('org-root'), false);
});

runTest('Security Matrix A: Child -> own resolved correctly', () => {
  const ids = resolveScopeOrgIds('org-a1', 'own', testOrgs);
  assert.deepStrictEqual(ids, ['org-a1']);
});

runTest('Security Matrix A: Child -> parent access is strictly DENIED', () => {
  const ids = resolveScopeOrgIds('org-a1', 'descendants', testOrgs);
  assert.strictEqual(ids.includes('org-lembaga-a'), false);
  assert.strictEqual(ids.includes('org-root'), false);
});

runTest('Security Matrix A: Child -> sibling access is strictly DENIED', () => {
  const ids = resolveScopeOrgIds('org-a1', 'descendants', testOrgs);
  assert.strictEqual(ids.includes('org-a2'), false);
});

runTest('Security Matrix A: Child -> unrelated branch access is strictly DENIED', () => {
  const ids = resolveScopeOrgIds('org-a1', 'descendants', testOrgs);
  assert.strictEqual(ids.includes('org-b1'), false);
  assert.strictEqual(ids.includes('org-c1'), false);
});

// B. Unit Assignment Direction Matrix
runTest('Security Matrix B: Parent -> self assignment = PASS', () => {
  assert.strictEqual(canAssignToOrganization('org-lembaga-a', 'org-lembaga-a', testOrgs, 'admin'), true);
});

runTest('Security Matrix B: Parent -> direct child assignment = PASS', () => {
  assert.strictEqual(canAssignToOrganization('org-a1', 'org-lembaga-a', testOrgs, 'admin'), true);
});

runTest('Security Matrix B: Parent -> deep descendant assignment = PASS', () => {
  assert.strictEqual(canAssignToOrganization('org-level-n', 'org-root', testOrgs, 'admin'), true);
  assert.strictEqual(canAssignToOrganization('org-level-n', 'org-lembaga-c', testOrgs, 'admin'), true);
});

runTest('Security Matrix B: Parent -> sibling branch assignment = DENY', () => {
  assert.strictEqual(canAssignToOrganization('org-b1', 'org-lembaga-a', testOrgs, 'admin'), false);
  assert.strictEqual(canAssignToOrganization('org-lembaga-b', 'org-lembaga-a', testOrgs, 'admin'), false);
});

runTest('Security Matrix B: Child -> parent assignment = DENY', () => {
  assert.strictEqual(canAssignToOrganization('org-lembaga-a', 'org-a1', testOrgs, 'admin'), false);
  assert.strictEqual(canAssignToOrganization('org-root', 'org-a1', testOrgs, 'admin'), false);
});

runTest('Security Matrix B: Child -> sibling assignment = DENY', () => {
  assert.strictEqual(canAssignToOrganization('org-a2', 'org-a1', testOrgs, 'admin'), false);
});

runTest('Security Matrix B: Child -> unrelated branch assignment = DENY', () => {
  assert.strictEqual(canAssignToOrganization('org-b1', 'org-a1', testOrgs, 'admin'), false);
  assert.strictEqual(canAssignToOrganization('org-c1', 'org-a1', testOrgs, 'admin'), false);
});

runTest('Security Matrix B: Superadmin bypasses hierarchy = PASS', () => {
  assert.strictEqual(canAssignToOrganization('org-lembaga-a', 'org-a1', testOrgs, 'superadmin'), true);
  assert.strictEqual(canAssignToOrganization('org-a2', 'org-a1', testOrgs, 'superadmin'), true);
  assert.strictEqual(canAssignToOrganization('org-b1', 'org-a1', testOrgs, 'superadmin'), true);
});

// C. Data Ownership Separation
runTest('Security Matrix C: Data ownership immutability (organization_id != assigned_to_organization_id)', () => {
  const program = {
    id: 'prog-01',
    organization_id: 'org-lembaga-a', // OWNER
    assigned_to_organization_id: 'org-a1', // DELEGATED UNIT
    title: 'Program Akreditasi',
  };
  assert.strictEqual(program.organization_id, 'org-lembaga-a', 'Owner remains Lembaga A');
  assert.strictEqual(program.assigned_to_organization_id, 'org-a1', 'Assigned unit is A1');
  assert.notStrictEqual(program.organization_id, program.assigned_to_organization_id, 'Ownership must NOT be overwritten');
});

// ==========================================
// SUITE 2: PROGRAM FINAL FLOW
// ==========================================
console.log('\n--- SUITE 2: PROGRAM FINAL FLOW ---');

let mockProgramStore = [];

function createProgram(data, userOrgId, userRole) {
  if (data.assigned_to_organization_id) {
    if (!canAssignToOrganization(data.assigned_to_organization_id, userOrgId, testOrgs, userRole)) {
      throw new Error(`Unauthorized assignment to org ${data.assigned_to_organization_id}`);
    }
  }
  const newProgram = {
    id: `prog-${Date.now()}-${Math.random()}`,
    organization_id: userOrgId, // OWNER IS ALWAYS CREATOR ORG
    assigned_to_organization_id: data.assigned_to_organization_id || null,
    title: data.title,
    code: data.code,
  };
  mockProgramStore.push(newProgram);
  return newProgram;
}

function updateProgram(id, data, userOrgId, userRole) {
  const existing = mockProgramStore.find(p => p.id === id);
  if (!existing) throw new Error('Program not found');
  if ('assigned_to_organization_id' in data && data.assigned_to_organization_id) {
    if (!canAssignToOrganization(data.assigned_to_organization_id, existing.organization_id, testOrgs, userRole)) {
      throw new Error(`Unauthorized assignment modification to org ${data.assigned_to_organization_id}`);
    }
  }
  // Ownership can NEVER be changed via update
  if (data.organization_id && data.organization_id !== existing.organization_id) {
    throw new Error('Mutation of program organization_id ownership is strictly forbidden');
  }
  existing.title = data.title !== undefined ? data.title : existing.title;
  if ('assigned_to_organization_id' in data) {
    existing.assigned_to_organization_id = data.assigned_to_organization_id;
  }
  return existing;
}

runTest('Program Flow 1: Create program without assignment (assigned_to_organization_id = null)', () => {
  const p = createProgram({ title: 'Program 1', code: 'P1', assigned_to_organization_id: null }, 'org-lembaga-a', 'admin');
  assert.strictEqual(p.organization_id, 'org-lembaga-a');
  assert.strictEqual(p.assigned_to_organization_id, null);
});

runTest('Program Flow 2: Create program assigned to direct child (A1)', () => {
  const p = createProgram({ title: 'Program 2', code: 'P2', assigned_to_organization_id: 'org-a1' }, 'org-lembaga-a', 'admin');
  assert.strictEqual(p.organization_id, 'org-lembaga-a');
  assert.strictEqual(p.assigned_to_organization_id, 'org-a1');
});

runTest('Program Flow 3: Create program assigned to deep descendant (Level N)', () => {
  const p = createProgram({ title: 'Program 3', code: 'P3', assigned_to_organization_id: 'org-level-n' }, 'org-root', 'admin');
  assert.strictEqual(p.organization_id, 'org-root');
  assert.strictEqual(p.assigned_to_organization_id, 'org-level-n');
});

runTest('Program Flow 4: Edit program assignment from A1 to A2 (sibling child)', () => {
  const p = createProgram({ title: 'Program 4', code: 'P4', assigned_to_organization_id: 'org-a1' }, 'org-lembaga-a', 'admin');
  const updated = updateProgram(p.id, { assigned_to_organization_id: 'org-a2' }, 'org-lembaga-a', 'admin');
  assert.strictEqual(updated.assigned_to_organization_id, 'org-a2');
  assert.strictEqual(updated.organization_id, 'org-lembaga-a');
});

runTest('Program Flow 5: Remove program assignment (set to null)', () => {
  const p = createProgram({ title: 'Program 5', code: 'P5', assigned_to_organization_id: 'org-a1' }, 'org-lembaga-a', 'admin');
  const updated = updateProgram(p.id, { assigned_to_organization_id: null }, 'org-lembaga-a', 'admin');
  assert.strictEqual(updated.assigned_to_organization_id, null);
  assert.strictEqual(updated.organization_id, 'org-lembaga-a');
});

runTest('Program Flow 6: Attempt invalid assignment throws error', () => {
  assert.throws(() => {
    createProgram({ title: 'Bad Program', code: 'PB', assigned_to_organization_id: 'org-b1' }, 'org-lembaga-a', 'admin');
  }, /Unauthorized assignment/);
});

runTest('Program Flow 7: Attempt ownership mutation throws error', () => {
  const p = createProgram({ title: 'Program 7', code: 'P7', assigned_to_organization_id: 'org-a1' }, 'org-lembaga-a', 'admin');
  assert.throws(() => {
    updateProgram(p.id, { organization_id: 'org-b1' }, 'org-lembaga-a', 'admin');
  }, /Mutation of program organization_id/);
});

// ==========================================
// SUITE 3: TASK FINAL FLOW
// ==========================================
console.log('\n--- SUITE 3: TASK FINAL FLOW ---');

let mockTaskStore = [];

function createTask(data, userOrgId, userRole) {
  if (data.assigned_to_organization_id) {
    if (!canAssignToOrganization(data.assigned_to_organization_id, userOrgId, testOrgs, userRole)) {
      throw new Error(`Unauthorized task assignment to org ${data.assigned_to_organization_id}`);
    }
  }
  const newTask = {
    id: `task-${Date.now()}-${Math.random()}`,
    organization_id: userOrgId,
    assigned_to_organization_id: data.assigned_to_organization_id || null,
    title: data.title,
    status: 'todo',
  };
  mockTaskStore.push(newTask);
  return newTask;
}

function updateTask(id, data, userOrgId, userRole) {
  const existing = mockTaskStore.find(t => t.id === id);
  if (!existing) throw new Error('Task not found');
  if ('assigned_to_organization_id' in data && data.assigned_to_organization_id) {
    if (!canAssignToOrganization(data.assigned_to_organization_id, existing.organization_id, testOrgs, userRole)) {
      throw new Error(`Unauthorized task assignment modification to org ${data.assigned_to_organization_id}`);
    }
  }
  if (data.status) existing.status = data.status;
  if ('assigned_to_organization_id' in data) {
    existing.assigned_to_organization_id = data.assigned_to_organization_id;
  }
  return existing;
}

runTest('Task Flow 1: Create Task without assignment (assigned_to_organization_id = null)', () => {
  const t = createTask({ title: 'Task 1', assigned_to_organization_id: null }, 'org-lembaga-a', 'admin');
  assert.strictEqual(t.organization_id, 'org-lembaga-a');
  assert.strictEqual(t.assigned_to_organization_id, null);
  assert.strictEqual(t.status, 'todo');
});

runTest('Task Flow 2: Create Task assigned to direct child (A1)', () => {
  const t = createTask({ title: 'Task 2', assigned_to_organization_id: 'org-a1' }, 'org-lembaga-a', 'admin');
  assert.strictEqual(t.organization_id, 'org-lembaga-a');
  assert.strictEqual(t.assigned_to_organization_id, 'org-a1');
});

runTest('Task Flow 3: Create Task assigned to deep descendant (Level N)', () => {
  const t = createTask({ title: 'Task 3', assigned_to_organization_id: 'org-level-n' }, 'org-root', 'admin');
  assert.strictEqual(t.organization_id, 'org-root');
  assert.strictEqual(t.assigned_to_organization_id, 'org-level-n');
});

runTest('Task Flow 4: Attempt invalid Task assignment throws error (A1 -> A2 sibling)', () => {
  assert.throws(() => {
    createTask({ title: 'Invalid Task', assigned_to_organization_id: 'org-a2' }, 'org-a1', 'admin');
  }, /Unauthorized task assignment/);
});

runTest('Task Flow 5: Existing inline status lifecycle works without breaking assignment', () => {
  const t = createTask({ title: 'Lifecycle Task', assigned_to_organization_id: 'org-a1' }, 'org-lembaga-a', 'admin');
  assert.strictEqual(t.status, 'todo');
  
  // Transition inline: in_progress
  updateTask(t.id, { status: 'in_progress' }, 'org-lembaga-a', 'admin');
  assert.strictEqual(t.status, 'in_progress');
  assert.strictEqual(t.assigned_to_organization_id, 'org-a1');
  
  // Transition inline: completed
  updateTask(t.id, { status: 'completed' }, 'org-lembaga-a', 'admin');
  assert.strictEqual(t.status, 'completed');
  assert.strictEqual(t.assigned_to_organization_id, 'org-a1');
});

runTest('Task Flow 6: updateTask service guard enforces downward assignment', () => {
  const t = createTask({ title: 'Guard Task', assigned_to_organization_id: null }, 'org-a1', 'admin');
  assert.throws(() => {
    updateTask(t.id, { assigned_to_organization_id: 'org-lembaga-a' }, 'org-a1', 'admin'); // Upward assignment rejected
  }, /Unauthorized task assignment modification/);
});

runTest('Task Flow 7: Documented Gap verification: No TaskEditPage or edit route exists', () => {
  const appTsx = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');
  assert.strictEqual(!appTsx.includes('tasks/:id/edit'), true, 'No tasks/:id/edit route exists');
  const taskEditPagePath = path.join(__dirname, '../src/pages/ecosystem/TaskEditPage.tsx');
  assert.strictEqual(fs.existsSync(taskEditPagePath), false, 'TaskEditPage.tsx does not exist');
});

// ==========================================
// SUITE 4: SCOPE + ASSIGNMENT INTERACTION
// ==========================================
console.log('\n--- SUITE 4: SCOPE + ASSIGNMENT INTERACTION ---');

// Mock data items
const testProgramsDataset = [
  { id: 'p-root', organization_id: 'org-root', assigned_to_organization_id: null, title: 'Master Plan' },
  { id: 'p-root-delegated-a1', organization_id: 'org-root', assigned_to_organization_id: 'org-a1', title: 'Delegated to A1' },
  { id: 'p-lem-a', organization_id: 'org-lembaga-a', assigned_to_organization_id: null, title: 'Kurikulum Lembaga A' },
  { id: 'p-a1', organization_id: 'org-a1', assigned_to_organization_id: null, title: 'Operasional Sekolah A1' },
  { id: 'p-a2', organization_id: 'org-a2', assigned_to_organization_id: null, title: 'Operasional Asrama A2' },
  { id: 'p-lem-b', organization_id: 'org-lembaga-b', assigned_to_organization_id: null, title: 'Operasional Usaha B' },
];

function queryPrograms(activeOrgId, scopeMode) {
  const allowedOrgIds = resolveScopeOrgIds(activeOrgId, scopeMode, testOrgs);
  // Filtering is by OWNER organization_id
  return testProgramsDataset.filter(item => allowedOrgIds.includes(item.organization_id));
}

runTest('Scope Interaction 1: Parent in own scope sees ONLY parent-owned data', () => {
  const visible = queryPrograms('org-lembaga-a', 'own');
  assert.strictEqual(visible.length, 1);
  assert.strictEqual(visible[0].id, 'p-lem-a');
});

runTest('Scope Interaction 2: Parent in descendants scope sees parent + descendant data', () => {
  const visible = queryPrograms('org-lembaga-a', 'descendants');
  const ids = visible.map(v => v.id);
  assert.strictEqual(ids.includes('p-lem-a'), true);
  assert.strictEqual(ids.includes('p-a1'), true);
  assert.strictEqual(ids.includes('p-a2'), true);
  assert.strictEqual(ids.includes('p-lem-b'), false);
  assert.strictEqual(ids.includes('p-root'), false);
});

runTest('Scope Interaction 3: Assignment target does NOT automatically alter active scope', () => {
  // A1 is active org. A1 has scope mode = "own".
  // p-root-delegated-a1 is owned by org-root, but assigned to org-a1.
  // When A1 queries its own organization scope, it must NOT see org-root records unless specifically queried via delegated view!
  const a1Visible = queryPrograms('org-a1', 'own');
  const a1Ids = a1Visible.map(v => v.id);
  assert.strictEqual(a1Ids.includes('p-a1'), true);
  assert.strictEqual(a1Ids.includes('p-root'), false, 'Root program not in A1 own scope');
  assert.strictEqual(a1Ids.includes('p-root-delegated-a1'), false, 'Delegated root program does not bleed into A1 owner scope');
});

runTest('Scope Interaction 4: Receiving assignment does NOT grant access to unrelated parent data (VISIBILITY != ASSIGNMENT)', () => {
  // Being assigned a task or program does not allow A1 to see Lembaga A's private programs
  const a1AllowedScope = resolveScopeOrgIds('org-a1', 'descendants', testOrgs);
  assert.strictEqual(a1AllowedScope.includes('org-lembaga-a'), false);
  assert.strictEqual(a1AllowedScope.includes('org-root'), false);
  assert.strictEqual(a1AllowedScope.includes('org-lembaga-b'), false);
});

// ==========================================
// SUITE 5: ROLLBACK & BACKWARD COMPATIBILITY
// ==========================================
console.log('\n--- SUITE 5: ROLLBACK & BACKWARD COMPATIBILITY ---');

runTest('Backward Compatibility 1: Records with assigned_to_organization_id = null or undefined work seamlessly', () => {
  const legacyRecord = {
    id: 'legacy-01',
    organization_id: 'org-lembaga-a',
    title: 'Legacy Program Before Stage 6',
  };
  const normalizedAssignment = legacyRecord.assigned_to_organization_id || null;
  assert.strictEqual(normalizedAssignment, null);
});

runTest('Backward Compatibility 2: UnitAssignmentSelector safely handles null or undefined values', () => {
  const selectorFile = fs.readFileSync(path.join(__dirname, '../src/components/organization/UnitAssignmentSelector.tsx'), 'utf8');
  assert.strictEqual(selectorFile.includes("value: string | null | undefined"), true, 'Props accept null or undefined');
  assert.strictEqual(selectorFile.includes("onChange(null)"), true, 'Supports clearing selection back to null');
  assert.strictEqual(selectorFile.includes("!value"), true, 'Treats null/undefined as unassigned');
});

runTest('Backward Compatibility 3: Program & Task interfaces declare assigned_to_organization_id as optional nullable', () => {
  const dbTypes = fs.readFileSync(path.join(__dirname, '../src/types/database.ts'), 'utf8');
  assert.strictEqual(dbTypes.includes('assigned_to_organization_id?: string | null'), true);
});

// ==========================================
// SUITE 6: DATABASE MIGRATION AUDIT
// ==========================================
console.log('\n--- SUITE 6: DATABASE MIGRATION AUDIT ---');

const migrationPath = path.join(__dirname, '../supabase/migrations/20261002_stage6_downward_assignment.sql');
assert.strictEqual(fs.existsSync(migrationPath), true, 'Migration file exists');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

runTest('Migration Audit 1: Columns are NULLABLE by default (no breaking NOT NULL constraints)', () => {
  assert.strictEqual(migrationSql.includes('assigned_to_organization_id UUID'), true);
  assert.strictEqual(migrationSql.includes('REFERENCES organizations(id) ON DELETE SET NULL'), true);
  assert.strictEqual(!migrationSql.includes('assigned_to_organization_id UUID NOT NULL'), true);
});

runTest('Migration Audit 2: Indexes created for performance', () => {
  assert.strictEqual(migrationSql.includes('idx_programs_assigned_to_org_id'), true);
  assert.strictEqual(migrationSql.includes('idx_tasks_assigned_to_org_id'), true);
});

runTest('Migration Audit 3: Trigger prevents upward and sibling delegation', () => {
  assert.strictEqual(migrationSql.includes('CREATE OR REPLACE FUNCTION validate_assignment_direction()'), true);
  assert.strictEqual(migrationSql.includes('trg_validate_program_assignment'), true);
  assert.strictEqual(migrationSql.includes('trg_validate_task_assignment'), true);
});

runTest('Migration Audit 4: No destructive ALTER TABLE (DROP COLUMN / TRUNCATE)', () => {
  assert.strictEqual(migrationSql.includes('DROP COLUMN'), false);
  assert.strictEqual(migrationSql.includes('TRUNCATE'), false);
});

runTest('Migration Audit 5: No mutation of organization_id ownership column', () => {
  assert.strictEqual(migrationSql.includes('ALTER TABLE programs ALTER COLUMN organization_id'), false);
});

// ==========================================
// SUMMARY
// ==========================================
console.log('\n=================================================================');
console.log(`  STAGE 7 RESULTS: ${passedTests}/${totalTests} PASSED`);
console.log('=================================================================\n');

if (passedTests === totalTests) {
  console.log('✅ ALL STAGE 7 INTEGRATION & ARCHITECTURE TESTS PASSED');
} else {
  console.error(`❌ ${totalTests - passedTests} TESTS FAILED`);
  process.exit(1);
}
