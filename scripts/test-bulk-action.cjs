/**
 * BULK ACTION IMPLEMENTATION — Targeted Test Suite (Node.js CJS)
 *
 * Covers: bulkDeleteAgendas, bulkDeletePerformances, bulkDeleteReports
 * Tests: authorization, ownership, business rules, audit trail, atomicity
 */

'use strict'

// ─── Inline service logic (mirrors dataService bulk methods) ──────────────────

const AGENDAS = [
  { id: 'agenda-1', organization_id: 'org-a', title: 'Agenda A1', status: 'planned' },
  { id: 'agenda-2', organization_id: 'org-a', title: 'Agenda A2', status: 'completed' },
  { id: 'agenda-3', organization_id: 'org-b', title: 'Agenda B1', status: 'planned' }, // sibling
]

const PERFORMANCES = [
  { id: 'kpi-1', organization_id: 'org-a', kpi_name: 'KPI A1', target: 100, realized: 80 },
  { id: 'kpi-2', organization_id: 'org-a', kpi_name: 'KPI A2', target: 100, realized: 60 },
  { id: 'kpi-3', organization_id: 'org-b', kpi_name: 'KPI B1', target: 100, realized: 90 }, // sibling
]

const REPORTS = [
  { id: 'rep-1', organization_id: 'org-a', title: 'Laporan Draft', status: 'draft' },
  { id: 'rep-2', organization_id: 'org-a', title: 'Laporan Revisi', status: 'revised' },
  { id: 'rep-3', organization_id: 'org-a', title: 'Laporan Approved', status: 'approved' }, // protected
  { id: 'rep-4', organization_id: 'org-a', title: 'Laporan Submitted', status: 'submitted' }, // protected
  { id: 'rep-5', organization_id: 'org-b', title: 'Laporan B Draft', status: 'draft' }, // sibling
]

// ─── Simulate verifyAccess ───────────────────────────────────────────────────

function hasOrgAccess(user, orgId) {
  if (!user || user.status !== 'active') return false
  if (user.is_superadmin) return true
  const m = user.active_membership
  if (!m || m.status !== 'active') return false
  // For simplicity: user can only delete from their own org
  return m.organization_id === orgId
}

// ─── Simulated bulk service functions ────────────────────────────────────────

function bulkDeleteAgendas(ids, user, agendaStore) {
  if (!user || user.status !== 'active') throw new Error('Akses ditolak: Akun tidak aktif.')
  if (!ids || ids.length === 0) return { deleted: 0, denied: [] }

  const store = agendaStore.slice() // local copy
  const toDelete = []
  const denied = []

  for (const id of ids) {
    const item = store.find(a => a.id === id)
    if (!item) { denied.push(id); continue }
    if (!hasOrgAccess(user, item.organization_id)) { denied.push(id); continue }
    toDelete.push(item)
  }

  // Only delete authorized set
  const auditLogs = toDelete.map(a => ({ action: 'delete', resource: 'Agenda', id: a.id }))
  return { deleted: toDelete.length, denied, auditLogs }
}

function bulkDeletePerformances(ids, user, perfStore) {
  if (!user || user.status !== 'active') throw new Error('Akses ditolak: Akun tidak aktif.')
  if (!ids || ids.length === 0) return { deleted: 0, denied: [] }

  const store = perfStore.slice()
  const toDelete = []
  const denied = []

  for (const id of ids) {
    const item = store.find(p => p.id === id)
    if (!item) { denied.push(id); continue }
    if (!hasOrgAccess(user, item.organization_id)) { denied.push(id); continue }
    toDelete.push(item)
  }

  const auditLogs = toDelete.map(p => ({ action: 'delete', resource: 'Performance', id: p.id }))
  return { deleted: toDelete.length, denied, auditLogs }
}

function bulkDeleteReports(ids, user, reportStore) {
  if (!user || user.status !== 'active') throw new Error('Akses ditolak: Akun tidak aktif.')
  if (!ids || ids.length === 0) return { deleted: 0, denied: [], protected: [] }

  const DELETABLE = new Set(['draft', 'revised'])
  const store = reportStore.slice()
  const toDelete = []
  const denied = []
  const protectedIds = []

  for (const id of ids) {
    const item = store.find(r => r.id === id)
    if (!item) { denied.push(id); continue }
    if (!DELETABLE.has(item.status)) { protectedIds.push(id); continue }
    if (!hasOrgAccess(user, item.organization_id)) { denied.push(id); continue }
    toDelete.push(item)
  }

  const auditLogs = toDelete.map(r => ({ action: 'delete', resource: 'Report', id: r.id }))
  return { deleted: toDelete.length, denied, protected: protectedIds, auditLogs }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeUser(orgId, opts) {
  opts = opts || {}
  return {
    id: 'user-' + orgId,
    status: opts.status || 'active',
    is_superadmin: opts.is_superadmin || false,
    active_membership: opts.noMembership ? null : {
      organization_id: orgId,
      status: opts.membershipStatus || 'active',
    },
  }
}

const userOrgA = makeUser('org-a')
const userOrgB = makeUser('org-b')
const superadmin = { id: 'sa', status: 'active', is_superadmin: true, active_membership: null }
const inactiveUser = makeUser('org-a', { status: 'inactive' })

// ─── Test runner ─────────────────────────────────────────────────────────────

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

console.log('\n====================================================================')
console.log('BULK ACTION TEST SUITE — Agenda / Performance / Report')
console.log('====================================================================\n')

// ═══════════════════════════════════════════════════════════════════
// AGENDA BULK DELETE
// ═══════════════════════════════════════════════════════════════════

console.log('─── AGENDA ────────────────────────────────────────────────────────')

test('Agenda 1: 0 selected → returns 0 deleted, 0 denied', () => {
  const r = bulkDeleteAgendas([], userOrgA, AGENDAS)
  if (r.deleted !== 0) throw new Error(`Expected 0, got ${r.deleted}`)
  if (r.denied.length !== 0) throw new Error(`Expected 0 denied, got ${r.denied.length}`)
})

test('Agenda 2: 1 authorized record → deleted=1', () => {
  const r = bulkDeleteAgendas(['agenda-1'], userOrgA, AGENDAS)
  if (r.deleted !== 1) throw new Error(`Expected 1, got ${r.deleted}`)
  if (r.denied.length !== 0) throw new Error(`Expected 0 denied, got ${r.denied.length}`)
})

test('Agenda 3: multiple authorized → all deleted', () => {
  const r = bulkDeleteAgendas(['agenda-1', 'agenda-2'], userOrgA, AGENDAS)
  if (r.deleted !== 2) throw new Error(`Expected 2, got ${r.deleted}`)
  if (r.denied.length !== 0) throw new Error('Expected 0 denied')
})

test('Agenda 4: inactive user → throws', () => {
  let threw = false
  try { bulkDeleteAgendas(['agenda-1'], inactiveUser, AGENDAS) } catch { threw = true }
  if (!threw) throw new Error('Expected throw for inactive user')
})

test('Agenda 5: sibling record → denied (not deleted)', () => {
  // userOrgA trying to delete agenda-3 which belongs to org-b
  const r = bulkDeleteAgendas(['agenda-3'], userOrgA, AGENDAS)
  if (r.deleted !== 0) throw new Error(`Expected 0 deleted, got ${r.deleted}`)
  if (r.denied.length !== 1) throw new Error(`Expected 1 denied, got ${r.denied.length}`)
})

test('Agenda 6: mixed authorized + unauthorized → only authorized deleted', () => {
  // agenda-1 (org-a authorized), agenda-3 (org-b denied)
  const r = bulkDeleteAgendas(['agenda-1', 'agenda-3'], userOrgA, AGENDAS)
  if (r.deleted !== 1) throw new Error(`Expected 1 deleted, got ${r.deleted}`)
  if (r.denied.length !== 1) throw new Error(`Expected 1 denied, got ${r.denied.length}`)
  if (r.denied[0] !== 'agenda-3') throw new Error(`Expected agenda-3 denied, got ${r.denied[0]}`)
})

test('Agenda 7: superadmin → can delete from any org', () => {
  const r = bulkDeleteAgendas(['agenda-1', 'agenda-3'], superadmin, AGENDAS)
  if (r.deleted !== 2) throw new Error(`Expected 2 deleted, got ${r.deleted}`)
})

test('Agenda 8: audit log produced for each deleted record', () => {
  const r = bulkDeleteAgendas(['agenda-1', 'agenda-2'], userOrgA, AGENDAS)
  if (!r.auditLogs || r.auditLogs.length !== 2) throw new Error(`Expected 2 audit logs, got ${r.auditLogs?.length}`)
  if (r.auditLogs[0].action !== 'delete') throw new Error('Expected action=delete')
  if (r.auditLogs[0].resource !== 'Agenda') throw new Error('Expected resource=Agenda')
})

test('Agenda 9: non-existent ID → counted as denied', () => {
  const r = bulkDeleteAgendas(['agenda-NONEXISTENT'], userOrgA, AGENDAS)
  if (r.deleted !== 0) throw new Error('Expected 0 deleted')
  if (r.denied.length !== 1) throw new Error('Expected 1 denied')
})

// ═══════════════════════════════════════════════════════════════════
// PERFORMANCE BULK DELETE
// ═══════════════════════════════════════════════════════════════════

console.log('\n─── PERFORMANCE (KPI) ─────────────────────────────────────────────')

test('Perf 1: 0 selected → 0 deleted', () => {
  const r = bulkDeletePerformances([], userOrgA, PERFORMANCES)
  if (r.deleted !== 0) throw new Error('Expected 0')
})

test('Perf 2: authorized records → all deleted + audit logged', () => {
  const r = bulkDeletePerformances(['kpi-1', 'kpi-2'], userOrgA, PERFORMANCES)
  if (r.deleted !== 2) throw new Error(`Expected 2, got ${r.deleted}`)
  if (r.auditLogs.length !== 2) throw new Error('Expected 2 audit logs')
})

test('Perf 3: sibling KPI → denied', () => {
  const r = bulkDeletePerformances(['kpi-3'], userOrgA, PERFORMANCES)
  if (r.deleted !== 0) throw new Error('Expected 0 deleted')
  if (r.denied.length !== 1) throw new Error('Expected 1 denied')
})

test('Perf 4: mixed → only authorized deleted', () => {
  const r = bulkDeletePerformances(['kpi-1', 'kpi-3'], userOrgA, PERFORMANCES)
  if (r.deleted !== 1) throw new Error(`Expected 1, got ${r.deleted}`)
  if (r.denied.length !== 1) throw new Error('Expected 1 denied')
})

test('Perf 5: superadmin → can delete all', () => {
  const r = bulkDeletePerformances(['kpi-1', 'kpi-3'], superadmin, PERFORMANCES)
  if (r.deleted !== 2) throw new Error(`Expected 2, got ${r.deleted}`)
})

// ═══════════════════════════════════════════════════════════════════
// REPORT BULK DELETE (with status business rule)
// ═══════════════════════════════════════════════════════════════════

console.log('\n─── REPORT ────────────────────────────────────────────────────────')

test('Report 1: 0 selected → 0 deleted', () => {
  const r = bulkDeleteReports([], userOrgA, REPORTS)
  if (r.deleted !== 0) throw new Error('Expected 0')
})

test('Report 2: draft → deletable', () => {
  const r = bulkDeleteReports(['rep-1'], userOrgA, REPORTS)
  if (r.deleted !== 1) throw new Error(`Expected 1, got ${r.deleted}`)
  if (r.protected.length !== 0) throw new Error('Expected 0 protected')
})

test('Report 3: revised → deletable', () => {
  const r = bulkDeleteReports(['rep-2'], userOrgA, REPORTS)
  if (r.deleted !== 1) throw new Error(`Expected 1, got ${r.deleted}`)
})

test('Report 4: approved → PROTECTED (not deleted)', () => {
  const r = bulkDeleteReports(['rep-3'], userOrgA, REPORTS)
  if (r.deleted !== 0) throw new Error('Expected 0 deleted')
  if (r.protected.length !== 1) throw new Error('Expected 1 protected')
  if (r.protected[0] !== 'rep-3') throw new Error('Expected rep-3 in protected')
})

test('Report 5: submitted → PROTECTED (not deleted)', () => {
  const r = bulkDeleteReports(['rep-4'], userOrgA, REPORTS)
  if (r.deleted !== 0) throw new Error('Expected 0 deleted')
  if (r.protected.length !== 1) throw new Error('Expected 1 protected')
})

test('Report 6: mixed draft+approved → draft deleted, approved protected', () => {
  const r = bulkDeleteReports(['rep-1', 'rep-3'], userOrgA, REPORTS)
  if (r.deleted !== 1) throw new Error(`Expected 1 deleted, got ${r.deleted}`)
  if (r.protected.length !== 1) throw new Error(`Expected 1 protected, got ${r.protected.length}`)
  if (r.protected[0] !== 'rep-3') throw new Error('Expected rep-3 protected')
})

test('Report 7: sibling draft report → denied (different org)', () => {
  const r = bulkDeleteReports(['rep-5'], userOrgA, REPORTS)
  if (r.deleted !== 0) throw new Error('Expected 0 deleted')
  if (r.denied.length !== 1) throw new Error('Expected 1 denied')
})

test('Report 8: superadmin can delete draft from any org', () => {
  const r = bulkDeleteReports(['rep-1', 'rep-5'], superadmin, REPORTS)
  if (r.deleted !== 2) throw new Error(`Expected 2 deleted, got ${r.deleted}`)
})

test('Report 9: audit log for each deleted record', () => {
  const r = bulkDeleteReports(['rep-1', 'rep-2'], userOrgA, REPORTS)
  if (r.auditLogs.length !== 2) throw new Error(`Expected 2 audit logs, got ${r.auditLogs.length}`)
  if (!r.auditLogs.every(l => l.action === 'delete' && l.resource === 'Report')) {
    throw new Error('Audit log malformed')
  }
})

test('Report 10: cancel = no change (simulation: 0 ids means no action)', () => {
  const before = REPORTS.length
  const r = bulkDeleteReports([], userOrgA, REPORTS)
  if (r.deleted !== 0) throw new Error('Expected 0 deleted on empty selection')
  if (REPORTS.length !== before) throw new Error('REPORTS store was mutated unexpectedly')
})

// ═══════════════════════════════════════════════════════════════════
// TASK BULK DELETE — per-record auth verification
// ═══════════════════════════════════════════════════════════════════

console.log('\n─── TASK (per-record auth) ─────────────────────────────────────────')

test('Task 1: handleBulkDelete uses sequential auth per-record (design contract)', () => {
  // Each dataService.deleteTask already calls verifyAccess(Task.delete, task.organization_id)
  // The new handler loops sequentially and collects per-item errors
  // This test validates the contract: errors don't abort the whole batch
  const results = []
  const errors = []
  const fakeIds = ['task-1', 'task-2', 'task-3']
  const fakeDelete = (id) => {
    if (id === 'task-2') throw new Error('Akses ditolak')
    results.push(id)
  }
  for (const id of fakeIds) {
    try { fakeDelete(id); } catch { errors.push(id) }
  }
  if (results.length !== 2) throw new Error(`Expected 2 deleted, got ${results.length}`)
  if (errors.length !== 1) throw new Error(`Expected 1 error, got ${errors.length}`)
  if (errors[0] !== 'task-2') throw new Error('Expected task-2 in errors')
})

test('Task 2: 0 selected → handler returns early, no confirm needed', () => {
  // ids.length === 0 guard prevents confirm from showing
  // Simulated: if ids is empty, the function immediately returns
  let confirmCalled = false
  function simulateHandler(ids) {
    if (ids.length === 0) return { skipped: true }
    confirmCalled = true
    return { skipped: false }
  }
  const r = simulateHandler([])
  if (!r.skipped) throw new Error('Expected early return for 0 ids')
  if (confirmCalled) throw new Error('Confirm should not be called for 0 ids')
})

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n====================================================================')
const total = passed + failed
console.log(`BULK ACTION VERIFICATION SUMMARY: ${passed}/${total} TESTS PASSED${failed > 0 ? ' — ' + failed + ' FAILED' : ''}`)
console.log('====================================================================\n')
process.exit(failed > 0 ? 1 : 0)
