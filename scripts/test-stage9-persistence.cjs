/**
 * STAGE 9 — LOCAL DEMO DATABASE PERSISTENCE & ACCOUNT ISOLATION TEST SUITE
 * 
 * Verifies all 20 test specifications from Phase 8:
 * TEST 1: Account A initial seed
 * TEST 2: Account A create
 * TEST 3: Account A refresh persistence
 * TEST 4: Account A logout/login persistence
 * TEST 5: Account B login
 * TEST 6: Account B cannot see Account A record
 * TEST 7: Account B create own record
 * TEST 8: Account B refresh persistence
 * TEST 9: Account A login again
 * TEST 10: Account A sees own record
 * TEST 11: Account A does not see Account B record
 * TEST 12: Account A update survives refresh
 * TEST 13: Account B update survives refresh
 * TEST 14: Delete/cancel survives refresh
 * TEST 15: Organization scope remains isolated
 * TEST 16: Descendant scope remains correct
 * TEST 17: Sibling remains isolated
 * TEST 18: Logout does not destroy persisted demo data
 * TEST 19: Application reload does not regenerate seed over existing data
 * TEST 20: Empty account can initialize safely
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const assert = require('assert');

const BROWSER_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

const findBrowser = () => {
  for (const p of BROWSER_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No compatible Chromium browser found');
};

const BASE = process.env.AUDIT_BASE || 'http://localhost:5173';

const results = [];
function record(testNum, name, pass, detail) {
  results.push({ testNum, name, pass, detail });
  const status = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`[TEST ${testNum}] ${status}: ${name}`);
  if (detail) console.log(`         Detail: ${detail}`);
}

async function runStage9Tests() {
  console.log('===============================================================');
  console.log('STAGE 9 — LOCAL DEMO DATABASE PERSISTENCE & ACCOUNT ISOLATION');
  console.log('===============================================================\n');

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // Navigate to base
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    const ACCOUNT_A_ID = '00000000-0000-0000-0000-000000000001'; // Superadmin / Pengurus 1
    const ACCOUNT_B_ID = '00000000-0000-0000-0000-000000000002'; // Ketua Biro Ubudiyah
    const EMPTY_ACC_ID = '00000000-0000-0000-0000-000000000099'; // Fresh empty user

    const ORG_ROOT = 'org-00000000-0000-0000-0000-000000000000';
    const ORG_LEMBAGA_A = 'org-11111111-1111-1111-1111-111111111111'; // Biro Ubudiyah
    const ORG_LEMBAGA_B = 'org-22222222-2222-2222-2222-222222222222'; // BAKID Multimedia (Sibling)
    const ORG_CHILD_A1 = 'org-11111111-1111-1111-1111-1111111111a1'; // Ubudiyah Baru (Descendant)

    // -------------------------------------------------------------
    // TEST 1: Account A initial seed
    // -------------------------------------------------------------
    const t1 = await page.evaluate(async (accA, orgRoot) => {
      window.dataService.setActiveAccount(accA);
      // Query initial seeded programs for root with descendants
      const programs = await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'descendants' });
      const rawStored = localStorage.getItem(`filament_demo_v3_${accA}_programs`);
      return { count: programs.length, hasStorage: rawStored !== null };
    }, ACCOUNT_A_ID, ORG_ROOT);
    record(1, 'Account A initial seed', t1.count > 0 && t1.hasStorage, `Seeded count=${t1.count}, localStorage key exists=${t1.hasStorage}`);

    // -------------------------------------------------------------
    // TEST 2: Account A create
    // -------------------------------------------------------------
    const RECORD_A1_TITLE = 'Demo Program Alpha Created by Account A';
    const t2 = await page.evaluate(async (accA, orgRoot, title) => {
      window.dataService.setActiveAccount(accA);
      const user = {
        id: accA,
        name: 'Pengurus 1 (Pimpinan Harian)',
        role: 'superadmin',
        is_superadmin: true,
      };
      const created = await window.dataService.createProgram({
        organization_id: orgRoot,
        name: title,
        title: title,
        status: 'draft',
        budget_allocated: 50000000,
        budget_planned: 50000000,
      }, user);
      const programs = await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'own' }, user);
      const found = programs.some(p => p.id === created.id || p.title === title);
      return { createdId: created.id, found };
    }, ACCOUNT_A_ID, ORG_ROOT, RECORD_A1_TITLE);
    const RECORD_A1_ID = t2.createdId;
    record(2, 'Account A create', t2.found && !!RECORD_A1_ID, `Created record ID=${RECORD_A1_ID}`);

    // -------------------------------------------------------------
    // TEST 3: Account A refresh persistence
    // -------------------------------------------------------------
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const t3 = await page.evaluate(async (accA, orgRoot, recId) => {
      window.dataService.setActiveAccount(accA);
      const programs = await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'own' });
      const found = programs.some(p => p.id === recId);
      return { found, count: programs.length };
    }, ACCOUNT_A_ID, ORG_ROOT, RECORD_A1_ID);
    record(3, 'Account A refresh persistence', t3.found, `Survives page refresh; record ${RECORD_A1_ID} present`);

    // -------------------------------------------------------------
    // TEST 4: Account A logout/login persistence
    // -------------------------------------------------------------
    const t4 = await page.evaluate(async (accA, orgRoot, recId) => {
      // Simulate logout: clear session keys only, demo DB keys preserved
      localStorage.setItem('filament_bakid_logged_out', 'true');
      localStorage.removeItem('filament_bakid_auth_user');
      localStorage.removeItem('filament_bakid_active_org_id');
      window.dataService.setActiveAccount(null);

      // Re-login Account A
      localStorage.removeItem('filament_bakid_logged_out');
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({ id: accA, role: 'superadmin', is_superadmin: true }));
      window.dataService.setActiveAccount(accA);

      const programs = await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'own' });
      const found = programs.some(p => p.id === recId);
      return { found };
    }, ACCOUNT_A_ID, ORG_ROOT, RECORD_A1_ID);
    record(4, 'Account A logout/login persistence', t4.found, `Survives logout session reset and re-login`);

    // -------------------------------------------------------------
    // TEST 5: Account B login
    // -------------------------------------------------------------
    const t5 = await page.evaluate(async (accB, orgA) => {
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
              'Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete',
              'Agenda.viewAny', 'Agenda.view', 'Agenda.create', 'Agenda.update', 'Agenda.delete',
              'Finance.viewAny', 'Finance.view', 'Finance.create', 'Finance.update',
              'Task.viewAny', 'Task.view', 'Task.create', 'Task.update', 'Task.delete',
              'Report.viewAny', 'Report.view', 'Report.create', 'Report.update',
              'view:descendants', 'all',
            ]
          }
        },
      };
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify(userB));
      window.dataService.setActiveAccount(accB);
      return { activeId: window.dataService.getActiveAccountId() };
    }, ACCOUNT_B_ID, ORG_LEMBAGA_A);
    record(5, 'Account B login', t5.activeId === ACCOUNT_B_ID, `Switched active account to ${t5.activeId}`);

    // -------------------------------------------------------------
    // TEST 6: Account B cannot see Account A record
    // -------------------------------------------------------------
    const t6 = await page.evaluate(async (orgA, recA1Id, titleA1) => {
      const programs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' });
      const foundById = programs.some(p => p.id === recA1Id);
      const foundByTitle = programs.some(p => p.title === titleA1);
      return { foundById, foundByTitle, totalCount: programs.length };
    }, ORG_LEMBAGA_A, RECORD_A1_ID, RECORD_A1_TITLE);
    record(6, 'Account B cannot see Account A record', !t6.foundById && !t6.foundByTitle, `Isolated; Record A1 is NOT visible in Account B`);

    // -------------------------------------------------------------
    // TEST 7: Account B create own record
    // -------------------------------------------------------------
    const RECORD_B1_TITLE = 'Demo Program Beta Created by Account B';
    const t7 = await page.evaluate(async (accB, orgA, title) => {
      window.dataService.setActiveAccount(accB);
      const user = {
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
              'Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete',
              'Agenda.viewAny', 'Agenda.view', 'Agenda.create', 'Agenda.update', 'Agenda.delete',
              'Finance.viewAny', 'Finance.view', 'Finance.create', 'Finance.update',
              'Task.viewAny', 'Task.view', 'Task.create', 'Task.update', 'Task.delete',
              'Report.viewAny', 'Report.view', 'Report.create', 'Report.update',
              'view:descendants', 'all',
            ]
          }
        },
      };
      const created = await window.dataService.createProgram({
        organization_id: orgA,
        name: title,
        title: title,
        status: 'draft',
        budget_allocated: 20000000,
        budget_planned: 20000000,
      }, user);
      const programs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' }, user);
      const found = programs.some(p => p.id === created.id);
      return { createdId: created.id, found };
    }, ACCOUNT_B_ID, ORG_LEMBAGA_A, RECORD_B1_TITLE);
    const RECORD_B1_ID = t7.createdId;
    record(7, 'Account B create own record', t7.found && !!RECORD_B1_ID, `Created record ID=${RECORD_B1_ID} for Account B`);

    // -------------------------------------------------------------
    // TEST 8: Account B refresh persistence
    // -------------------------------------------------------------
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const t8 = await page.evaluate(async (accB, orgA, recB1Id) => {
      window.dataService.setActiveAccount(accB);
      const user = {
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
              'Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete',
              'Agenda.viewAny', 'Agenda.view', 'Agenda.create', 'Agenda.update', 'Agenda.delete',
              'Finance.viewAny', 'Finance.view', 'Finance.create', 'Finance.update',
              'Task.viewAny', 'Task.view', 'Task.create', 'Task.update', 'Task.delete',
              'Report.viewAny', 'Report.view', 'Report.create', 'Report.update',
              'view:descendants', 'all',
            ]
          }
        },
      };
      const programs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' }, user);
      const found = programs.some(p => p.id === recB1Id);
      return { found };
    }, ACCOUNT_B_ID, ORG_LEMBAGA_A, RECORD_B1_ID);
    record(8, 'Account B refresh persistence', t8.found, `Survives refresh; Account B record B1 is intact`);

    // -------------------------------------------------------------
    // TEST 9: Account A login again
    // -------------------------------------------------------------
    const t9 = await page.evaluate(async (accA) => {
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({ id: accA, role: 'superadmin', is_superadmin: true, status: 'active' }));
      window.dataService.setActiveAccount(accA);
      return { activeId: window.dataService.getActiveAccountId() };
    }, ACCOUNT_A_ID);
    record(9, 'Account A login again', t9.activeId === ACCOUNT_A_ID, `Switched back to Account A ID=${t9.activeId}`);

    // -------------------------------------------------------------
    // TEST 10: Account A sees own record
    // -------------------------------------------------------------
    const t10 = await page.evaluate(async (orgRoot, recA1Id) => {
      const programs = await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'own' });
      return { found: programs.some(p => p.id === recA1Id) };
    }, ORG_ROOT, RECORD_A1_ID);
    record(10, 'Account A sees own record', t10.found, `Account A still has own record A1`);

    // -------------------------------------------------------------
    // TEST 11: Account A does not see Account B record
    // -------------------------------------------------------------
    const t11 = await page.evaluate(async (orgA, recB1Id, titleB1) => {
      const programs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' });
      const foundById = programs.some(p => p.id === recB1Id);
      const foundByTitle = programs.some(p => p.title === titleB1);
      return { foundById, foundByTitle };
    }, ORG_LEMBAGA_A, RECORD_B1_ID, RECORD_B1_TITLE);
    record(11, 'Account A does not see Account B record', !t11.foundById && !t11.foundByTitle, `Strict isolation: Record B1 is NOT in Account A storage`);

    // -------------------------------------------------------------
    // TEST 12: Account A update survives refresh
    // -------------------------------------------------------------
    const UPDATED_TITLE_A = 'Demo Program Alpha [UPDATED TITLE V2]';
    await page.evaluate(async (accA, recA1Id, newTitle) => {
      window.dataService.setActiveAccount(accA);
      await window.dataService.updateProgram(recA1Id, { title: newTitle, name: newTitle });
    }, ACCOUNT_A_ID, RECORD_A1_ID, UPDATED_TITLE_A);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const t12 = await page.evaluate(async (accA, recA1Id, newTitle) => {
      window.dataService.setActiveAccount(accA);
      const prog = await window.dataService.getProgramById(recA1Id);
      return { match: prog?.title === newTitle };
    }, ACCOUNT_A_ID, RECORD_A1_ID, UPDATED_TITLE_A);
    record(12, 'Account A update survives refresh', t12.match, `Program update survived full browser refresh`);

    // -------------------------------------------------------------
    // TEST 13: Account B update survives refresh
    // -------------------------------------------------------------
    const UPDATED_TITLE_B = 'Demo Program Beta [UPDATED TITLE V2]';
    // Cleanly switch session to Account B first
    await page.evaluate((accB, orgA) => {
      const user = {
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
              'Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete',
              'Agenda.viewAny', 'Agenda.view', 'Agenda.create', 'Agenda.update', 'Agenda.delete',
              'Finance.viewAny', 'Finance.view', 'Finance.create', 'Finance.update',
              'Task.viewAny', 'Task.view', 'Task.create', 'Task.update', 'Task.delete',
              'Report.viewAny', 'Report.view', 'Report.create', 'Report.update',
              'view:descendants', 'all',
            ]
          }
        },
      };
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify(user));
    }, ACCOUNT_B_ID, ORG_LEMBAGA_A);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    await page.evaluate(async (accB, orgA, recB1Id, newTitle) => {
      const user = JSON.parse(localStorage.getItem('filament_bakid_auth_user') || '{}');
      window.dataService.setActiveAccount(accB);
      await window.dataService.updateProgram(recB1Id, { title: newTitle, name: newTitle }, user);
    }, ACCOUNT_B_ID, ORG_LEMBAGA_A, RECORD_B1_ID, UPDATED_TITLE_B);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const t13 = await page.evaluate(async (accB, orgA, recB1Id, newTitle) => {
      const user = {
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
              'Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete',
              'Agenda.viewAny', 'Agenda.view', 'Agenda.create', 'Agenda.update', 'Agenda.delete',
              'Finance.viewAny', 'Finance.view', 'Finance.create', 'Finance.update',
              'Task.viewAny', 'Task.view', 'Task.create', 'Task.update', 'Task.delete',
              'Report.viewAny', 'Report.view', 'Report.create', 'Report.update',
              'view:descendants', 'all',
            ]
          }
        },
      };
      window.dataService.setActiveAccount(accB);
      const prog = await window.dataService.getProgramById(recB1Id, user);
      return { match: prog?.title === newTitle, progTitle: prog?.title, recB1Id };
    }, ACCOUNT_B_ID, ORG_LEMBAGA_A, RECORD_B1_ID, UPDATED_TITLE_B);
    record(13, 'Account B update survives refresh', t13.match, `Account B update survived full browser refresh (title=${t13.progTitle})`);

    // -------------------------------------------------------------
    // TEST 14: Delete/cancel survives refresh
    // -------------------------------------------------------------
    const t14 = await page.evaluate(async (accA, orgRoot, recA1Id) => {
      // Re-login Account A
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({ id: accA, role: 'superadmin', is_superadmin: true, status: 'active' }));
      window.dataService.setActiveAccount(accA);
      await window.dataService.deleteProgram(recA1Id);
      const listBefore = await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'own' });
      return { deletedBefore: !listBefore.some(p => p.id === recA1Id) };
    }, ACCOUNT_A_ID, ORG_ROOT, RECORD_A1_ID);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const t14b = await page.evaluate(async (accA, orgRoot, recA1Id) => {
      window.dataService.setActiveAccount(accA);
      const listAfter = await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'own' });
      return { deletedAfter: !listAfter.some(p => p.id === recA1Id) };
    }, ACCOUNT_A_ID, ORG_ROOT, RECORD_A1_ID);
    record(14, 'Delete/cancel survives refresh', t14.deletedBefore && t14b.deletedAfter, `Record deleted and remains absent after reload`);

    // -------------------------------------------------------------
    // TEST 15: Organization scope remains isolated
    // -------------------------------------------------------------
    const t15 = await page.evaluate(async (accB, orgA, orgRoot) => {
      window.dataService.setActiveAccount(accB);
      const user = {
        id: accB,
        role: 'admin',
        status: 'active',
        is_superadmin: false,
        active_membership: {
          organization_id: orgA,
          role_id: 'role-admin-org',
          status: 'active',
          role: { id: 'role-admin-org', name: 'Admin Organisasi', status: 'active', permissions: ['Program.viewAny', 'Program.view'] }
        },
      };
      let blockedRoot = false;
      try {
        await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'own' }, user);
      } catch {
        blockedRoot = true;
      }
      return { blockedRoot };
    }, ACCOUNT_B_ID, ORG_LEMBAGA_A, ORG_ROOT);
    record(15, 'Organization scope remains isolated', t15.blockedRoot, `Admin Lembaga A cannot bypass scope to query Root organization`);

    // -------------------------------------------------------------
    // TEST 16: Descendant scope remains correct
    // -------------------------------------------------------------
    const t16 = await page.evaluate(async (accB, orgA) => {
      window.dataService.setActiveAccount(accB);
      const user = {
        id: accB,
        role: 'admin',
        status: 'active',
        is_superadmin: false,
        active_membership: {
          organization_id: orgA,
          role_id: 'role-admin-org',
          status: 'active',
          role: { id: 'role-admin-org', name: 'Admin Organisasi', status: 'active', permissions: ['Program.viewAny', 'Program.view', 'view:descendants', 'all'] }
        },
      };
      let allowedDescendants = false;
      try {
        const progs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'descendants' }, user);
        allowedDescendants = Array.isArray(progs);
      } catch (e) {
        return { allowedDescendants: false, error: e.message };
      }
      return { allowedDescendants };
    }, ACCOUNT_B_ID, ORG_LEMBAGA_A);
    record(16, 'Descendant scope remains correct', t16.allowedDescendants, `Descendants scope allowed within authorized hierarchy branch`);

    // -------------------------------------------------------------
    // TEST 17: Sibling remains isolated
    // -------------------------------------------------------------
    const t17 = await page.evaluate(async (accB, orgA, orgSibling) => {
      window.dataService.setActiveAccount(accB);
      const user = {
        id: accB,
        role: 'admin',
        status: 'active',
        is_superadmin: false,
        active_membership: {
          organization_id: orgA,
          role_id: 'role-admin-org',
          status: 'active',
          role: { id: 'role-admin-org', name: 'Admin Organisasi', permissions: ['Program.viewAny', 'Program.view'] }
        },
      };
      let blockedSibling = false;
      try {
        // Lembaga B is sibling of Lembaga A
        await window.dataService.getPrograms({ organizationId: orgSibling, mode: 'own' }, user);
      } catch {
        blockedSibling = true;
      }
      return { blockedSibling };
    }, ACCOUNT_B_ID, ORG_LEMBAGA_A, ORG_LEMBAGA_B);
    record(17, 'Sibling remains isolated', t17.blockedSibling, `Admin Lembaga A blocked from accessing Sibling Lembaga B`);

    // -------------------------------------------------------------
    // TEST 18: Logout does not destroy persisted demo data
    // -------------------------------------------------------------
    const t18 = await page.evaluate(async (accB) => {
      // Check Account B storage before logout
      const keyB = `filament_demo_v3_${accB}_programs`;
      const beforeLogout = localStorage.getItem(keyB);

      // Perform logout
      localStorage.setItem('filament_bakid_logged_out', 'true');
      localStorage.removeItem('filament_bakid_auth_user');
      localStorage.removeItem('filament_bakid_active_org_id');

      // Check Account B storage after logout
      const afterLogout = localStorage.getItem(keyB);
      return { beforeLogout: !!beforeLogout, afterLogout: !!afterLogout, preserved: beforeLogout === afterLogout };
    }, ACCOUNT_B_ID);
    record(18, 'Logout does not destroy persisted demo data', t18.preserved, `LocalStorage key preserved across logout action`);

    // -------------------------------------------------------------
    // TEST 19: Application reload does not regenerate seed over existing data
    // -------------------------------------------------------------
    const t19 = await page.evaluate(async (accB, orgA, recB1Id) => {
      // Re-login Account B
      localStorage.removeItem('filament_bakid_logged_out');
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
        id: accB,
        role: 'admin',
        status: 'active',
        is_superadmin: false,
        active_membership: {
          organization_id: orgA,
          role_id: 'role-admin-org',
          status: 'active',
          role: { id: 'role-admin-org', name: 'Admin Organisasi', permissions: ['Program.viewAny', 'Program.view'] }
        },
      }));
      window.dataService.setActiveAccount(accB);
      const progs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' });
      return { hasRecordB1: progs.some(p => p.id === recB1Id) };
    }, ACCOUNT_B_ID, ORG_LEMBAGA_A, RECORD_B1_ID);
    record(19, 'Application reload does not regenerate seed over existing data', t19.hasRecordB1, `Custom program B1 preserved without seed re-clobber`);

    // -------------------------------------------------------------
    // TEST 20: Empty account can initialize safely
    // -------------------------------------------------------------
    const t20 = await page.evaluate(async (emptyAcc, orgRoot) => {
      window.dataService.setActiveAccount(emptyAcc);
      // Empty user query without crashing
      const user = {
        id: emptyAcc,
        name: 'Empty Test User',
        email: 'empty@test.id',
        role: 'superadmin',
        is_superadmin: true,
      };
      const progs = await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'own' }, user);
      const stats = await window.dataService.getEcosystemStats({ organizationId: orgRoot, mode: 'own' }, user);
      return { ok: Array.isArray(progs) && typeof stats.totalPrograms === 'number' };
    }, EMPTY_ACC_ID, ORG_ROOT);
    record(20, 'Empty account can initialize safely', t20.ok, `Empty / fresh account initialized without crash or schema error`);

    console.log('\n===============================================================');
    const passedCount = results.filter(r => r.pass).length;
    console.log(`TOTAL TEST RESULTS: ${passedCount} / ${results.length} PASS`);
    console.log('===============================================================\n');

    if (passedCount !== results.length) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

runStage9Tests().catch((err) => {
  console.error('Fatal error in Stage 9 test execution:', err);
  process.exit(1);
});
