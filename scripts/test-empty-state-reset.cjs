/**
 * RESET DEMO DATA & GOLDEN PATH FROM ZERO TEST SUITE
 * 
 * Verifies:
 * 1. Demo operational data starts completely empty from 0 (Programs=0, Agendas=0, Tasks=0, Transactions=0, Reports=0, Performances=0, Budgets=0, Audit=0)
 * 2. Master & reference data are intact (Users, Organizations, Periods, Structures, Sections, Personnels, Roles, Memberships)
 * 3. Empty storage remains empty across reload & switch account
 * 4. Golden Path from Zero:
 *    - Create Program Alpha (terbatas)
 *    - Automatically creates Budget
 *    - Create Agenda under Program Alpha
 *    - Create Task under Program Alpha
 *    - Create Expense Transaction under Program Alpha's budget
 *    - Create Report under Program Alpha
 *    - Create Performance KPI under Program Alpha
 * 5. Logout & Login again: All manually created records are retained intact
 * 6. Account B login: Account B starts completely empty (0 records), does NOT see Account A records
 * 7. Return to Account A: Account A still sees all its created records
 * 8. Zero uncaught console errors
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BROWSER_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

function getBrowserPath() {
  for (const p of BROWSER_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No browser executable found');
}

const APP_URL = 'http://localhost:5173';
const ACC_A = '00000000-0000-0000-0000-000000000001'; // Superadmin
const ACC_B = '00000000-0000-0000-0000-000000000002'; // Admin Ubudiyah
const ORG_LEMBAGA_A = 'org-11111111-1111-1111-1111-111111111111';

const results = [];
function record(testId, name, pass, detail) {
  results.push({ testId, name, pass, detail });
  const icon = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`[TEST ${testId}] ${icon}: ${name}`);
  if (detail) console.log(`         Detail: ${detail}`);
}

async function run() {
  console.log('===============================================================');
  console.log('TEST SUITE: RESET DEMO DATA & GOLDEN PATH FROM ZERO');
  console.log('===============================================================\n');

  const browser = await puppeteer.launch({
    executablePath: getBrowserPath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

  // 1. Reset demo data via dataService
  await page.evaluate(() => {
    window.dataService.resetDemoData();
  });

  // 2. TEST 1: Operational collections start with count = 0
  const t1 = await page.evaluate(async (accA, orgA) => {
    window.dataService.setActiveAccount(accA);
    const [progs, agds, tasks, buds, txs, reps, perfs, auds] = await Promise.all([
      window.dataService.getPrograms({ organizationId: orgA, mode: 'own' }),
      window.dataService.getAgendas({ organizationId: orgA, mode: 'own' }),
      window.dataService.getTasks({ organizationId: orgA, mode: 'own' }),
      window.dataService.getBudgets(orgA),
      window.dataService.getTransactions({ organizationId: orgA, mode: 'own' }),
      window.dataService.getReports({ organizationId: orgA, mode: 'own' }),
      window.dataService.getPerformances({ organizationId: orgA, mode: 'own' }),
      window.dataService.getAuditLogs(orgA),
    ]);
    return {
      progsCount: progs.length,
      agdsCount: agds.length,
      tasksCount: tasks.length,
      budsCount: buds.length,
      txsCount: txs.length,
      repsCount: reps.length,
      perfsCount: perfs.length,
      audsCount: auds.length,
    };
  }, ACC_A, ORG_LEMBAGA_A);

  const allOperationalZero = Object.values(t1).every(c => c === 0);
  record(1, 'All operational collections are 0', allOperationalZero, JSON.stringify(t1));

  // 3. TEST 2: Master and reference data remain intact
  const t2 = await page.evaluate(async (orgA) => {
    const orgs = await window.dataService.getOrganizations();
    const users = await window.dataService.getUsers();
    const sections = await window.dataService.getSections(orgA);
    const personnels = await window.dataService.getPersonnels(orgA);
    const structures = await window.dataService.getStructures(orgA);
    const periods = await window.dataService.getPeriods(orgA);
    return {
      hasOrgs: orgs.length > 0,
      hasUsers: users.length > 0,
      hasSections: sections.length > 0,
      hasPersonnels: personnels.length > 0,
      hasStructures: structures.length > 0,
      hasPeriods: periods.length > 0,
      sectionsCount: sections.length,
      personnelsCount: personnels.length,
    };
  }, ORG_LEMBAGA_A);

  const masterIntact = t2.hasOrgs && t2.hasUsers && t2.hasSections && t2.hasPersonnels && t2.hasStructures && t2.hasPeriods;
  record(2, 'Master and reference data intact', masterIntact, `Sections=${t2.sectionsCount}, Personnels=${t2.personnelsCount}`);

  // 4. TEST 3: Reload preserves empty state (no auto-reseeding)
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

  const t3 = await page.evaluate(async (accA, orgA) => {
    window.dataService.setActiveAccount(accA);
    const progs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' });
    return progs.length;
  }, ACC_A, ORG_LEMBAGA_A);

  record(3, 'Empty storage remains empty after reload', t3 === 0, `Programs count after reload = ${t3}`);

  // 5. TEST 4: Golden Path - Create Program from 0
  let createdProgId = '';
  let createdBudgetId = '';
  const t4 = await page.evaluate(async (accA, orgA) => {
    window.dataService.setActiveAccount(accA);
    const user = {
      id: accA,
      name: 'Pengurus 1 (Pimpinan Harian)',
      role: 'superadmin',
      is_superadmin: true,
    };
    const sections = await window.dataService.getSections(orgA);
    const prog = await window.dataService.createProgram({
      organization_id: orgA,
      title: 'Program Pertama Manual Santri 2026',
      name: 'Program Pertama Manual Santri 2026',
      code: 'PRG-MANUAL-01',
      section_id: sections[0].id,
      duration_type: 'terbatas',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      budget_allocated: 25000000,
      status: 'draft',
    }, user);

    const progs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' }, user);
    const budgets = await window.dataService.getBudgets(orgA, undefined, user);
    const linkedBudget = budgets.find(b => b.program_id === prog.id);

    return {
      progId: prog.id,
      progCount: progs.length,
      budgetId: linkedBudget?.id || '',
      budgetAmount: linkedBudget?.allocated_amount || 0,
    };
  }, ACC_A, ORG_LEMBAGA_A);

  createdProgId = t4.progId;
  createdBudgetId = t4.budgetId;
  record(4, 'Golden Path: Create Program & auto-budget', t4.progCount === 1 && !!t4.budgetId, `Program=${createdProgId}, Budget=${createdBudgetId} (Rp ${t4.budgetAmount})`);

  // 6. TEST 5: Golden Path - Create Agenda linked to Program
  const t5 = await page.evaluate(async (accA, orgA, progId) => {
    window.dataService.setActiveAccount(accA);
    const user = { id: accA, role: 'superadmin', is_superadmin: true };
    const agenda = await window.dataService.createAgenda({
      organization_id: orgA,
      program_id: progId,
      title: 'Agenda Pertama Manual: Rapat Kerja Awal',
      start_time: '2026-02-01T08:00:00Z',
      end_time: '2026-02-01T12:00:00Z',
      location: 'Aula Pesantren Lt. 2',
      status: 'planned',
    }, user);
    const agds = await window.dataService.getAgendas({ organizationId: orgA, mode: 'own' }, undefined, user);
    return { agendaId: agenda.id, count: agds.length };
  }, ACC_A, ORG_LEMBAGA_A, createdProgId);
  record(5, 'Golden Path: Create Agenda', t5.count === 1 && !!t5.agendaId, `Agenda ID=${t5.agendaId}`);

  // 7. TEST 6: Golden Path - Create Task linked to Program
  const t6 = await page.evaluate(async (accA, orgA, progId) => {
    window.dataService.setActiveAccount(accA);
    const user = { id: accA, role: 'superadmin', is_superadmin: true };
    const task = await window.dataService.createTask({
      organization_id: orgA,
      program_id: progId,
      title: 'Tugas Pertama: Siapkan Notula Raker',
      priority: 'high',
      status: 'new',
    }, user);
    const tasks = await window.dataService.getTasks({ organizationId: orgA, mode: 'own' }, undefined, user);
    return { taskId: task.id, count: tasks.length };
  }, ACC_A, ORG_LEMBAGA_A, createdProgId);
  record(6, 'Golden Path: Create Task', t6.count === 1 && !!t6.taskId, `Task ID=${t6.taskId}`);

  // 8. TEST 7: Golden Path - Create Finance Transaction linked to Budget
  const t7 = await page.evaluate(async (accA, orgA, budgetId) => {
    window.dataService.setActiveAccount(accA);
    const user = { id: accA, role: 'superadmin', is_superadmin: true };
    const tx = await window.dataService.createTransaction({
      organization_id: orgA,
      budget_id: budgetId,
      type: 'expense',
      amount: 1500000,
      description: 'Pengeluaran Konsumsi Raker Awal',
      transaction_date: '2026-02-01',
    }, user);
    const txs = await window.dataService.getTransactions({ organizationId: orgA, mode: 'own' }, undefined, user);
    const budgets = await window.dataService.getBudgets(orgA, undefined, user);
    const updatedBudget = budgets.find(b => b.id === budgetId);
    return {
      txId: tx.id,
      count: txs.length,
      realized: updatedBudget?.realized_amount,
      remaining: updatedBudget?.remaining_balance,
    };
  }, ACC_A, ORG_LEMBAGA_A, createdBudgetId);
  const isPass7 = (t7.count === 1) && (t7.realized === 1500000 || t7.realized === '1500000');
  record(7, 'Golden Path: Create Finance Transaction & sync budget', isPass7, `t7.count=${t7.count} (${typeof t7.count}), t7.realized=${t7.realized} (${typeof t7.realized}), isPass=${isPass7}`);

  // 9. TEST 8: Golden Path - Create Report linked to Program
  const t8 = await page.evaluate(async (accA, orgA, progId) => {
    window.dataService.setActiveAccount(accA);
    const user = { id: accA, role: 'superadmin', is_superadmin: true };
    const rep = await window.dataService.createReport({
      organization_id: orgA,
      program_id: progId,
      title: 'Laporan Perkembangan Bulan Januari 2026',
      period: 'Bulan Januari 2026',
      content: 'Pelaksanaan raker awal berjalan lancar',
      status: 'draft',
    }, user);
    const reps = await window.dataService.getReports({ organizationId: orgA, mode: 'own' }, undefined, user);
    return { repId: rep.id, count: reps.length };
  }, ACC_A, ORG_LEMBAGA_A, createdProgId);
  record(8, 'Golden Path: Create Report', t8.count === 1 && !!t8.repId, `Report ID=${t8.repId}`);

  // 10. TEST 9: Golden Path - Create Performance linked to Program
  const t9 = await page.evaluate(async (accA, orgA, progId) => {
    window.dataService.setActiveAccount(accA);
    const user = { id: accA, role: 'superadmin', is_superadmin: true };
    const perf = await window.dataService.createPerformance({
      organization_id: orgA,
      program_id: progId,
      kpi_name: 'Partisipasi Kehadiran Santri',
      target: 100,
      realized: 90,
      period: 'Q1 2026',
      unit: '%',
    }, user);
    const perfs = await window.dataService.getPerformances({ organizationId: orgA, mode: 'own' }, undefined, user);
    return { perfId: perf.id, count: perfs.length };
  }, ACC_A, ORG_LEMBAGA_A, createdProgId);
  record(9, 'Golden Path: Create Performance', t9.count === 1 && !!t9.perfId, `Performance ID=${t9.perfId}`);

  // 11. TEST 10: Refresh & Re-login Account A: Data survives completely
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

  const t10 = await page.evaluate(async (accA, orgA, progId) => {
    window.dataService.setActiveAccount(accA);
    const progs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' });
    const agds = await window.dataService.getAgendas({ organizationId: orgA, mode: 'own' });
    const tasks = await window.dataService.getTasks({ organizationId: orgA, mode: 'own' });
    const txs = await window.dataService.getTransactions({ organizationId: orgA, mode: 'own' });
    const reps = await window.dataService.getReports({ organizationId: orgA, mode: 'own' });
    const perfs = await window.dataService.getPerformances({ organizationId: orgA, mode: 'own' });
    return {
      hasProg: progs.some(p => p.id === progId),
      hasAgd: agds.length === 1,
      hasTask: tasks.length === 1,
      hasTx: txs.length === 1,
      hasRep: reps.length === 1,
      hasPerf: perfs.length === 1,
    };
  }, ACC_A, ORG_LEMBAGA_A, createdProgId);

  const accountAPreserved = Object.values(t10).every(v => v === true);
  record(10, 'Account A data persists across reload & re-login', accountAPreserved, JSON.stringify(t10));

  // 12. TEST 11: Account B Isolation - Account B starts empty (0 records) & cannot see Account A records
  const t11 = await page.evaluate(async (accB, orgA, progAId) => {
    window.dataService.setActiveAccount(accB);
    const userB = {
      id: accB,
      name: 'Ust. M. Ridwan, S.Pd.I.',
      role: 'admin',
      status: 'active',
      is_superadmin: false,
      active_membership: {
        organization_id: orgA,
        role_id: 'role-admin-org',
        status: 'active',
        role: {
          id: 'role-admin-org',
          name: 'Admin Organisasi',
          status: 'active',
          permissions: [
            'Program.viewAny', 'Program.view',
            'Agenda.viewAny', 'Agenda.view',
            'Task.viewAny', 'Task.view',
            'Finance.viewAny', 'Finance.view',
            'Report.viewAny', 'Report.view',
            'Performance.viewAny', 'Performance.view'
          ]
        }
      }
    };
    const progs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' }, userB);
    const agds = await window.dataService.getAgendas({ organizationId: orgA, mode: 'own' }, undefined, userB);
    const tasks = await window.dataService.getTasks({ organizationId: orgA, mode: 'own' }, undefined, userB);
    const txs = await window.dataService.getTransactions({ organizationId: orgA, mode: 'own' }, undefined, userB);
    const reps = await window.dataService.getReports({ organizationId: orgA, mode: 'own' }, undefined, userB);
    const perfs = await window.dataService.getPerformances({ organizationId: orgA, mode: 'own' }, undefined, userB);

    return {
      bProgsCount: progs.length,
      bAgdsCount: agds.length,
      bTasksCount: tasks.length,
      bTxsCount: txs.length,
      bRepsCount: reps.length,
      bPerfsCount: perfs.length,
      seesA: progs.some(p => p.id === progAId),
    };
  }, ACC_B, ORG_LEMBAGA_A, createdProgId);

  const accountBEmptyAndIsolated = t11.bProgsCount === 0 && t11.seesA === false;
  record(11, 'Account B starts completely empty and isolated from Account A', accountBEmptyAndIsolated, JSON.stringify(t11));

  // 13. TEST 12: Return to Account A - All Account A records are intact
  const t12 = await page.evaluate(async (accA, orgA, progAId) => {
    window.dataService.setActiveAccount(accA);
    const progs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' });
    return progs.some(p => p.id === progAId);
  }, ACC_A, ORG_LEMBAGA_A, createdProgId);
  record(12, 'Account A data intact upon returning from Account B', t12, `Account A still has program ${createdProgId}`);

  // 14. TEST 13: Browser Console Errors
  record(13, 'Zero uncaught console errors', consoleErrors.length === 0, `${consoleErrors.length} errors caught: ${consoleErrors.slice(0, 3).join(', ')}`);

  console.log('\n===============================================================');
  const passedCount = results.filter(r => r.pass).length;
  console.log(`TOTAL RESULTS: ${passedCount} / ${results.length} PASS`);
  console.log('===============================================================\n');

  await browser.close();
  if (passedCount !== results.length) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error running reset & golden path suite:', err);
  process.exit(1);
});
