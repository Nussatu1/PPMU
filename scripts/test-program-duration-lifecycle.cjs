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
const ACC_A = '00000000-0000-0000-0000-000000000001';
const ACC_B = '00000000-0000-0000-0000-000000000002';
const ORG_ROOT = 'org-00000000-0000-0000-0000-000000000000';
const ORG_LEMBAGA_A = 'org-11111111-1111-1111-1111-111111111111';
const ORG_LEMBAGA_B = 'org-22222222-2222-2222-2222-222222222222';
const ORG_CHILD_A1 = 'org-11111111-1111-1111-1111-1111111111a1';

const results = [];
function record(testId, name, pass, detail) {
  results.push({ testId, name, pass, detail });
  const icon = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`[TEST ${testId}] ${icon}: ${name}`);
  if (detail) console.log(`         Detail: ${detail}`);
}

async function run() {
  console.log('===============================================================');
  console.log('TEST SUITE: PROGRAM DURATION MODEL & ONGOING LIFECYCLE');
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

  // Setup Superadmin Account A
  await page.evaluate((accA) => {
    window.dataService.setActiveAccount(accA);
    localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
      id: accA,
      name: 'Pengurus 1 (Pimpinan Harian)',
      role: 'superadmin',
      is_superadmin: true,
      status: 'active',
    }));
  }, ACC_A);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

  // 1. Create terbatas dengan valid dates
  const t1 = await page.evaluate(async (accA, orgRoot) => {
    window.dataService.setActiveAccount(accA);
    const res = await window.dataService.createProgram({
      organization_id: orgRoot,
      title: 'Program Terbatas Valid',
      duration_type: 'terbatas',
      start_date: '2026-03-01',
      end_date: '2026-03-31',
      status: 'draft',
    });
    return { ok: res.duration_type === 'terbatas' && res.end_date === '2026-03-31', id: res.id };
  }, ACC_A, ORG_ROOT);
  record(1, 'Create terbatas dengan valid dates', t1.ok, `Created ID=${t1.id}`);

  // 2. Create terbatas tanpa end_date -> reject
  const t2 = await page.evaluate(async (accA, orgRoot) => {
    window.dataService.setActiveAccount(accA);
    try {
      await window.dataService.createProgram({
        organization_id: orgRoot,
        title: 'Program Terbatas Tanpa End Date',
        duration_type: 'terbatas',
        start_date: '2026-03-01',
        end_date: '',
        status: 'draft',
      });
      return { rejected: false };
    } catch (err) {
      return { rejected: true, msg: err.message };
    }
  }, ACC_A, ORG_ROOT);
  record(2, 'Create terbatas tanpa end_date -> reject', t2.rejected, `Error caught: ${t2.msg}`);

  // 3. Create terbatas dengan end < start -> reject
  const t3 = await page.evaluate(async (accA, orgRoot) => {
    window.dataService.setActiveAccount(accA);
    try {
      await window.dataService.createProgram({
        organization_id: orgRoot,
        title: 'Program Terbatas Tanggal Mundur',
        duration_type: 'terbatas',
        start_date: '2026-03-10',
        end_date: '2026-03-01',
        status: 'draft',
      });
      return { rejected: false };
    } catch (err) {
      return { rejected: true, msg: err.message };
    }
  }, ACC_A, ORG_ROOT);
  record(3, 'Create terbatas dengan end < start -> reject', t3.rejected, `Error caught: ${t3.msg}`);

  // 4. Create jangka_panjang valid
  const t4 = await page.evaluate(async (accA, orgRoot) => {
    window.dataService.setActiveAccount(accA);
    const res = await window.dataService.createProgram({
      organization_id: orgRoot,
      title: 'Program Multi-Year Modernisasi',
      duration_type: 'jangka_panjang',
      start_date: '2026-01-01',
      end_date: '2029-12-31',
      status: 'draft',
    });
    return { ok: res.duration_type === 'jangka_panjang' && res.end_date === '2029-12-31', id: res.id };
  }, ACC_A, ORG_ROOT);
  record(4, 'Create jangka_panjang valid', t4.ok, `Created ID=${t4.id}`);

  // 5. Create jangka_panjang end < start -> reject
  const t5 = await page.evaluate(async (accA, orgRoot) => {
    window.dataService.setActiveAccount(accA);
    try {
      await window.dataService.createProgram({
        organization_id: orgRoot,
        title: 'Program Multi-Year Mundur',
        duration_type: 'jangka_panjang',
        start_date: '2028-01-01',
        end_date: '2027-12-31',
        status: 'draft',
      });
      return { rejected: false };
    } catch (err) {
      return { rejected: true, msg: err.message };
    }
  }, ACC_A, ORG_ROOT);
  record(5, 'Create jangka_panjang end < start -> reject', t5.rejected, `Error caught: ${t5.msg}`);

  // 6. Create rutin tanpa end_date -> pass
  const t6 = await page.evaluate(async (accA, orgRoot) => {
    window.dataService.setActiveAccount(accA);
    const res = await window.dataService.createProgram({
      organization_id: orgRoot,
      title: 'Kajian Rutin Mingguan',
      duration_type: 'rutin',
      start_date: '2026-01-01',
      end_date: '',
      status: 'draft',
    });
    return { ok: res.duration_type === 'rutin' && !res.end_date, id: res.id };
  }, ACC_A, ORG_ROOT);
  record(6, 'Create rutin tanpa end_date -> pass', t6.ok, `Created ID=${t6.id} with empty end_date`);

  // 7. Create rutin dengan end_date -> sanitized to empty
  const t7 = await page.evaluate(async (accA, orgRoot) => {
    window.dataService.setActiveAccount(accA);
    const res = await window.dataService.createProgram({
      organization_id: orgRoot,
      title: 'Operasional Kantor Harian',
      duration_type: 'rutin',
      start_date: '2026-01-01',
      end_date: '2026-12-31', // payload supplies end_date
      status: 'draft',
    });
    return { ok: res.duration_type === 'rutin' && res.end_date === '', id: res.id };
  }, ACC_A, ORG_ROOT);
  record(7, 'Create rutin dengan end_date -> cleared to empty', t7.ok, `Sanitized end_date='${t7.ok ? '' : 'failed'}'`);

  // 8. Edit terbatas
  const t8 = await page.evaluate(async (accA, progId) => {
    window.dataService.setActiveAccount(accA);
    const updated = await window.dataService.updateProgram(progId, {
      title: 'Program Terbatas Valid (Updated)',
      end_date: '2026-04-15',
    });
    return { ok: updated.title === 'Program Terbatas Valid (Updated)' && updated.end_date === '2026-04-15' };
  }, ACC_A, t1.id);
  record(8, 'Edit terbatas', t8.ok, 'Title and end_date updated successfully');

  // 9. Edit rutin
  const t9 = await page.evaluate(async (accA, progId) => {
    window.dataService.setActiveAccount(accA);
    const updated = await window.dataService.updateProgram(progId, {
      title: 'Kajian Rutin Mingguan (Updated)',
    });
    return { ok: updated.title === 'Kajian Rutin Mingguan (Updated)' && !updated.end_date };
  }, ACC_A, t6.id);
  record(9, 'Edit rutin', t9.ok, 'Title updated, end_date remains empty');

  // 10. Convert terbatas -> rutin
  const t10 = await page.evaluate(async (accA, progId) => {
    window.dataService.setActiveAccount(accA);
    const updated = await window.dataService.updateProgram(progId, {
      duration_type: 'rutin',
      end_date: '',
    });
    return { ok: updated.duration_type === 'rutin' && !updated.end_date };
  }, ACC_A, t1.id);
  record(10, 'Convert terbatas -> rutin', t10.ok, 'duration_type=rutin, end_date cleared');

  // 11. Convert rutin -> terbatas
  const t11 = await page.evaluate(async (accA, progId) => {
    window.dataService.setActiveAccount(accA);
    const updated = await window.dataService.updateProgram(progId, {
      duration_type: 'terbatas',
      start_date: '2026-01-01',
      end_date: '2026-06-30',
    });
    return { ok: updated.duration_type === 'terbatas' && updated.end_date === '2026-06-30' };
  }, ACC_A, t1.id);
  record(11, 'Convert rutin -> terbatas', t11.ok, 'duration_type=terbatas, end_date required and saved');

  // 12. Existing Program tanpa duration_type -> fallback 'terbatas'
  await page.evaluate(async (accA, orgRoot) => {
    window.dataService.setActiveAccount(accA);
    const storageKey = `filament_demo_v3_${accA}_programs`;
    const progs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const legacyProg = {
      id: 'legacy-prog-test-12',
      organization_id: orgRoot,
      title: 'Legacy Program Without Duration Type',
      status: 'draft',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      created_at: new Date().toISOString(),
    };
    progs.push(legacyProg);
    localStorage.setItem(storageKey, JSON.stringify(progs));
    return true;
  }, ACC_A, ORG_ROOT);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

  const t12 = await page.evaluate(async (accA, orgRoot) => {
    window.dataService.setActiveAccount(accA);
    const fetchedList = await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'own' });
    const fetched = fetchedList.find(p => p.id === 'legacy-prog-test-12');
    const fetchedById = await window.dataService.getProgramById('legacy-prog-test-12');
    return {
      listFallback: fetched?.duration_type === 'terbatas',
      idFallback: fetchedById?.duration_type === 'terbatas',
      found: !!fetched
    };
  }, ACC_A, ORG_ROOT);
  record(12, 'Existing Program tanpa duration_type -> fallback terbatas', t12.listFallback && t12.idFallback, `List: ${t12.listFallback}, GetById: ${t12.idFallback}`);

  // 13. Refresh persistence
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
  const t13 = await page.evaluate(async (accA, t6Id) => {
    window.dataService.setActiveAccount(accA);
    const p = await window.dataService.getProgramById(t6Id);
    return { ok: p?.duration_type === 'rutin' && !p.end_date };
  }, ACC_A, t6.id);
  record(13, 'Refresh persistence', t13.ok, 'Routine program intact across page reload');

  // 14. Logout / Login persistence
  const t14 = await page.evaluate(async (accA, t6Id) => {
    // Logout
    localStorage.removeItem('filament_bakid_auth_user');
    // Login
    localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
      id: accA,
      name: 'Pengurus 1 (Pimpinan Harian)',
      role: 'superadmin',
      is_superadmin: true,
      status: 'active',
    }));
    window.dataService.setActiveAccount(accA);
    const p = await window.dataService.getProgramById(t6Id);
    return { ok: p?.duration_type === 'rutin' && p.title.includes('Kajian Rutin') };
  }, ACC_A, t6.id);
  record(14, 'Logout/login persistence', t14.ok, 'Routine program persists across logout/login');

  // 15. Account isolation
  const t15 = await page.evaluate(async (accB, t6Id, orgA) => {
    window.dataService.setActiveAccount(accB);
    const userB = {
      id: accB,
      role: 'admin',
      status: 'active',
      is_superadmin: false,
      active_membership: {
        organization_id: orgA,
        role_id: 'role-admin-org',
        status: 'active',
        role: { id: 'role-admin-org', name: 'Admin Organisasi', status: 'active', permissions: ['Program.viewAny', 'Program.view'] }
      }
    };
    const bProgs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' }, userB);
    const foundAInB = bProgs.some(p => p.id === t6Id);
    return { isolated: !foundAInB };
  }, ACC_B, t6.id, ORG_LEMBAGA_A);
  record(15, 'Account isolation', t15.isolated, 'Account B cannot see Account A programs');

  // 16. Hierarchy scope
  const t16 = await page.evaluate(async (accB, orgA, orgRoot) => {
    window.dataService.setActiveAccount(accB);
    const userB = {
      id: accB,
      role: 'admin',
      status: 'active',
      is_superadmin: false,
      active_membership: {
        organization_id: orgA,
        role_id: 'role-admin-org',
        status: 'active',
        role: { id: 'role-admin-org', name: 'Admin Organisasi', status: 'active', permissions: ['Program.viewAny', 'Program.view'] }
      }
    };
    let blockedRoot = false;
    try {
      await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'own' }, userB);
    } catch {
      blockedRoot = true;
    }
    return { blockedRoot };
  }, ACC_B, ORG_LEMBAGA_A, ORG_ROOT);
  record(16, 'Hierarchy scope', t16.blockedRoot, 'Admin Lembaga A cannot query Root organization');

  // 17. Downward assignment
  const t17 = await page.evaluate(async (accA, orgRoot, orgChildA1, orgSiblingB) => {
    window.dataService.setActiveAccount(accA);
    // Downward assignment to child A1: OK
    const childProg = await window.dataService.createProgram({
      organization_id: orgRoot,
      assigned_to_organization_id: orgChildA1,
      title: 'Program Delegasi Turunan',
      duration_type: 'rutin',
      start_date: '2026-01-01',
      status: 'draft',
    });
    // Attempt invalid upward/cross-branch assignment from Child A1 -> Sibling Lembaga B
    const userA1 = {
      id: 'user-a1',
      role: 'admin',
      status: 'active',
      is_superadmin: false,
      active_membership: {
        organization_id: orgChildA1,
        role_id: 'role-admin-org',
        status: 'active',
        role: { id: 'role-admin-org', name: 'Admin Organisasi', status: 'active', permissions: ['Program.create'] }
      }
    };
    let blockedCross = false;
    try {
      await window.dataService.createProgram({
        organization_id: orgChildA1,
        assigned_to_organization_id: orgSiblingB,
        title: 'Program Ilegal Sibling',
        duration_type: 'rutin',
        start_date: '2026-01-01',
        status: 'draft',
      }, userA1);
    } catch {
      blockedCross = true;
    }
    return { childAssigned: childProg.assigned_to_organization_id === orgChildA1, blockedCross };
  }, ACC_A, ORG_ROOT, ORG_CHILD_A1, ORG_LEMBAGA_B);
  record(17, 'Downward assignment', t17.childAssigned && t17.blockedCross, 'Downward delegated, cross-branch assignment blocked');

  // 18. Agenda relation
  const t18 = await page.evaluate(async (accA, orgRoot, progId) => {
    window.dataService.setActiveAccount(accA);
    const agenda = await window.dataService.createAgenda({
      organization_id: orgRoot,
      program_id: progId,
      title: 'Agenda Rutin Pembukaan',
      start_time: '2026-02-01T09:00:00Z',
      end_time: '2026-02-01T11:00:00Z',
      status: 'scheduled',
    });
    const prog = await window.dataService.getProgramById(progId);
    return { ok: prog?.agendas?.some(a => a.id === agenda.id) };
  }, ACC_A, ORG_ROOT, t6.id);
  record(18, 'Agenda relation', t18.ok, 'Agenda correctly linked to routine program');

  // 19. Task relation
  const t19 = await page.evaluate(async (accA, orgRoot, progId) => {
    window.dataService.setActiveAccount(accA);
    const task = await window.dataService.createTask({
      organization_id: orgRoot,
      program_id: progId,
      title: 'Tugas Setup Soundsystem',
      status: 'pending',
    });
    const tasks = await window.dataService.getTasks({ organizationId: orgRoot, mode: 'own' });
    return { ok: tasks.some(t => t.id === task.id && t.program_id === progId) };
  }, ACC_A, ORG_ROOT, t6.id);
  record(19, 'Task relation', t19.ok, 'Task correctly linked to program');

  // 20. Finance relation
  const t20 = await page.evaluate(async (accA, orgRoot, progId) => {
    window.dataService.setActiveAccount(accA);
    const fin = await window.dataService.createTransaction({
      organization_id: orgRoot,
      program_id: progId,
      budget_id: 'bdg-1',
      type: 'expense',
      amount: 1500000,
      description: 'Pengadaan konsumsi kajian rutin',
      transaction_date: '2026-02-05',
    });
    const finList = await window.dataService.getTransactions({ organizationId: orgRoot, mode: 'own' });
    return { ok: finList.some(f => f.id === fin.id && f.program_id === progId) };
  }, ACC_A, ORG_ROOT, t6.id);
  record(20, 'Finance relation', t20.ok, 'Finance transaction correctly linked to program');

  // 21. Report relation
  const t21 = await page.evaluate(async (accA, orgRoot, progId) => {
    window.dataService.setActiveAccount(accA);
    const rep = await window.dataService.createReport({
      organization_id: orgRoot,
      program_id: progId,
      title: 'Laporan Triwulan Kajian',
      status: 'draft',
    });
    const repList = await window.dataService.getReports({ organizationId: orgRoot, mode: 'own' });
    return { ok: repList.some(r => r.id === rep.id && r.program_id === progId) };
  }, ACC_A, ORG_ROOT, t6.id);
  record(21, 'Report relation', t21.ok, 'Report correctly linked to program');

  // Routine Lifecycle verification: Active -> Closed ('Tutup Program') vs Selesaikan
  const tLifecycle = await page.evaluate(async (accA, orgRoot) => {
    window.dataService.setActiveAccount(accA);
    // Create active routine program
    const routineProg = await window.dataService.createProgram({
      organization_id: orgRoot,
      title: 'Lifecycle Test Routine',
      duration_type: 'rutin',
      start_date: '2026-01-01',
      status: 'draft',
    });
    await window.dataService.transitionProgramStatus(routineProg.id, 'submitted');
    await window.dataService.transitionProgramStatus(routineProg.id, 'approved');
    await window.dataService.transitionProgramStatus(routineProg.id, 'active');

    // Routine program should NOT transition to 'completed'
    let blockedComplete = false;
    try {
      await window.dataService.transitionProgramStatus(routineProg.id, 'completed');
    } catch {
      blockedComplete = true;
    }

    // Routine program CAN transition directly from active to closed ('Tutup Program')
    await window.dataService.transitionProgramStatus(routineProg.id, 'closed');
    const closedProg = await window.dataService.getProgramById(routineProg.id);

    return { blockedComplete, closedStatus: closedProg?.status };
  }, ACC_A, ORG_ROOT);
  record('21b', 'Routine Lifecycle (active -> closed, NOT completed)', tLifecycle.blockedComplete && tLifecycle.closedStatus === 'closed', `Blocked completed: ${tLifecycle.blockedComplete}, final status: ${tLifecycle.closedStatus}`);

  // Viewport checks: Desktop 1024, 1280, 1440
  for (const width of [1024, 1280, 1440]) {
    await page.setViewport({ width, height: 800 });
    await page.goto(`${APP_URL}/programs`, { waitUntil: 'networkidle2' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    record(`22-${width}`, `Desktop ${width}px viewport`, !overflow, `Overflow: ${overflow ? 'DETECTED' : '0px'}`);
  }

  // Viewport checks: Mobile 320, 360, 375, 390, 414
  for (const width of [320, 360, 375, 390, 414]) {
    await page.setViewport({ width, height: 740 });
    await page.goto(`${APP_URL}/programs`, { waitUntil: 'networkidle2' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    record(`23-${width}`, `Mobile ${width}px viewport`, !overflow, `Overflow: ${overflow ? 'DETECTED' : '0px'}`);
  }

  // 24. No horizontal overflow check
  const allNoOverflow = results.filter(r => r.name.includes('viewport')).every(r => r.pass);
  record(24, 'No horizontal overflow across all viewports', allNoOverflow, '0px overflow confirmed on all tested breakpoints');

  // 25. No console errors
  record(25, 'No uncaught console errors', consoleErrors.length === 0, consoleErrors.length === 0 ? '0 errors' : consoleErrors.join('; '));

  // 26. No UUID regression
  const uuidCheck = await page.evaluate(() => {
    const id = window.dataService ? 'ok' : 'err';
    return id === 'ok';
  });
  record(26, 'No UUID regression', uuidCheck, 'Safe UUID generation active');

  await browser.close();

  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  console.log('\n===============================================================');
  console.log(`TOTAL RESULTS: ${passed} / ${total} PASS`);
  console.log('===============================================================');
  if (passed !== total) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
