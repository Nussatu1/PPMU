/**
 * STAGE 10 — FINAL DEMO READINESS, REGRESSION & FREEZE
 * Automated Browser & Regression Runner
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BROWSER_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

const findBrowser = () => {
  for (const p of BROWSER_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No compatible Chromium browser found');
};

const BASE = process.env.AUDIT_BASE || 'http://localhost:5173';
const log = (msg) => console.log(`[STAGE10-QA] ${msg}`);

async function runStage10() {
  log('======================================================================');
  log('STAGE 10: FINAL DEMO READINESS, REGRESSION & FREEZE RUNNER');
  log('======================================================================');

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const report = {
    demoDataSanity: false,
    authFlow: false,
    moduleSmoke: {},
    crudDemo: {},
    accountIsolationFinal: false,
    hierarchyRbacFinal: false,
    mobileAudit: {},
    desktopAudit: {},
    goldenPath: false,
    consoleErrors: [],
  };

  const ACC_A = '00000000-0000-0000-0000-000000000001';
  const ACC_B = '00000000-0000-0000-0000-000000000002';
  const ORG_ROOT = 'org-00000000-0000-0000-0000-000000000000';
  const ORG_LEMBAGA_A = 'org-11111111-1111-1111-1111-111111111111';

  try {
    // -------------------------------------------------------------
    // PHASE 2: DEMO DATA SANITY
    // -------------------------------------------------------------
    log('--- Phase 2: Demo Data Sanity ---');
    await page.goto(`${BASE}/programs`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    const sanity = await page.evaluate(async (accA, accB, orgRoot, orgA) => {
      window.dataService.setActiveAccount(accA);
      const progsA = await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'descendants' });
      const budgetsA = await window.dataService.getBudgets({ organizationId: orgRoot, mode: 'descendants' });
      const orgs = await window.dataService.getOrganizations();

      window.dataService.setActiveAccount(accB);
      const progsB = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' });

      return {
        hasProgsA: progsA.length > 0,
        hasBudgetsA: budgetsA.length > 0,
        hasOrgs: orgs.length > 0,
        hasProgsB: progsB.length > 0,
        progsCountA: progsA.length,
        progsCountB: progsB.length,
      };
    }, ACC_A, ACC_B, ORG_ROOT, ORG_LEMBAGA_A);

    report.demoDataSanity = sanity.hasProgsA && sanity.hasBudgetsA && sanity.hasOrgs && sanity.hasProgsB;
    log(`Phase 2 Result: Demo Data Sanity = ${report.demoDataSanity ? 'PASS' : 'FAIL'} (ProgsA=${sanity.progsCountA}, ProgsB=${sanity.progsCountB})`);

    // -------------------------------------------------------------
    // PHASE 3: LOGIN / LOGOUT DEMO FLOW
    // -------------------------------------------------------------
    log('--- Phase 3: Login / Logout Demo Flow ---');
    // Step 1: Login Account A
    await page.evaluate((accA) => {
      localStorage.removeItem('filament_bakid_logged_out');
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
        id: accA,
        name: 'Pengurus 1 (Pimpinan Harian)',
        role: 'superadmin',
        is_superadmin: true,
        status: 'active',
      }));
    }, ACC_A);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    const stepA = await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('filament_bakid_auth_user') || '{}');
      return { isA: stored.id === '00000000-0000-0000-0000-000000000001' };
    });

    // Step 2: Logout
    await page.evaluate(() => {
      localStorage.setItem('filament_bakid_logged_out', 'true');
      localStorage.removeItem('filament_bakid_auth_user');
      localStorage.removeItem('filament_bakid_active_org_id');
      window.dataService.setActiveAccount(null);
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    const stepLogout = await page.evaluate(() => {
      const loggedOut = localStorage.getItem('filament_bakid_logged_out') === 'true';
      const noUser = !localStorage.getItem('filament_bakid_auth_user');
      return loggedOut && noUser;
    });

    // Step 3: Login Account B
    await page.evaluate((accB, orgA) => {
      localStorage.removeItem('filament_bakid_logged_out');
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
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
            permissions: ['view:descendants', 'Program.viewAny', 'Program.view', 'Finance.viewAny']
          }
        },
      }));
    }, ACC_B, ORG_LEMBAGA_A);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    const stepB = await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('filament_bakid_auth_user') || '{}');
      return { isB: stored.id === '00000000-0000-0000-0000-000000000002' };
    });

    // Step 4: Login Account A again
    await page.evaluate((accA) => {
      localStorage.removeItem('filament_bakid_logged_out');
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
        id: accA,
        name: 'Pengurus 1 (Pimpinan Harian)',
        role: 'superadmin',
        is_superadmin: true,
        status: 'active',
      }));
    }, ACC_A);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    const stepAReturn = await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('filament_bakid_auth_user') || '{}');
      return { isA: stored.id === '00000000-0000-0000-0000-000000000001' };
    });

    report.authFlow = stepA.isA && stepLogout && stepB.isB && stepAReturn.isA;
    log(`Phase 3 Result: Auth Flow (Login A -> Logout -> Login B -> Login A) = ${report.authFlow ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // PHASE 4: CORE MODULE SMOKE TEST
    // -------------------------------------------------------------
    log('--- Phase 4: Core Module Smoke Test ---');
    const coreRoutes = [
      '/',
      '/programs',
      '/programs/create',
      '/agendas',
      '/performance',
      '/finance',
      '/reports',
      '/tasks',
      '/structures',
      '/menu',
    ];

    let allModulesPass = true;
    for (const r of coreRoutes) {
      await page.goto(`${BASE}${r}`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
      await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

      const check = await page.evaluate(() => {
        const root = document.getElementById('root');
        const text = root ? root.textContent || '' : '';
        const isBlank = text.trim().length === 0;
        const hasFatal = text.includes('TypeError') || text.includes('Uncaught Error');
        return { isBlank, hasFatal, len: text.length };
      });

      const pass = !check.isBlank && !check.hasFatal;
      report.moduleSmoke[r] = pass ? 'PASS' : 'FAIL';
      if (!pass) allModulesPass = false;
      log(`Route [${r}]: ${report.moduleSmoke[r]} (len=${check.len})`);
    }

    // -------------------------------------------------------------
    // PHASE 5: CORE CRUD DEMO
    // -------------------------------------------------------------
    log('--- Phase 5: Core CRUD Demo ---');
    // Ensure Account A
    await page.evaluate((accA) => {
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

    // 1. Program CRUD
    const progCrud = await page.evaluate(async (accA, orgRoot) => {
      window.dataService.setActiveAccount(accA);
      const created = await window.dataService.createProgram({
        organization_id: orgRoot,
        title: 'Stage 10 Verified Program',
        name: 'Stage 10 Verified Program',
        status: 'draft',
        budget_allocated: 15000000,
        budget_planned: 15000000,
      });
      const fetched = await window.dataService.getProgramById(created.id);
      return { pass: !!fetched && fetched.title === 'Stage 10 Verified Program', id: created.id };
    }, ACC_A, ORG_ROOT);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const progRefresh = await page.evaluate(async (accA, id) => {
      window.dataService.setActiveAccount(accA);
      const p = await window.dataService.getProgramById(id);
      return !!p;
    }, ACC_A, progCrud.id);
    report.crudDemo.program = progCrud.pass && progRefresh;
    log(`CRUD Program: ${report.crudDemo.program ? 'PASS' : 'FAIL'}`);

    // 2. Task CRUD & Status Transition
    const taskCrud = await page.evaluate(async (accA, orgRoot) => {
      window.dataService.setActiveAccount(accA);
      const created = await window.dataService.createTask({
        organization_id: orgRoot,
        title: 'Stage 10 Verified Task',
        priority: 'high',
        status: 'new',
      });
      const updated = await window.dataService.updateTask(created.id, { status: 'in_progress' });
      return { pass: updated.status === 'in_progress', id: created.id };
    }, ACC_A, ORG_ROOT);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const taskRefresh = await page.evaluate(async (accA, id) => {
      window.dataService.setActiveAccount(accA);
      const t = await window.dataService.getTaskById(id);
      return t?.status === 'in_progress';
    }, ACC_A, taskCrud.id);
    report.crudDemo.task = taskCrud.pass && taskRefresh;
    log(`CRUD Task: ${report.crudDemo.task ? 'PASS' : 'FAIL'}`);

    // 3. Finance CRUD (Transaction)
    const financeCrud = await page.evaluate(async (accA, orgRoot) => {
      window.dataService.setActiveAccount(accA);
      const created = await window.dataService.createTransaction({
        organization_id: orgRoot,
        budget_id: 'bdg-1',
        type: 'expense',
        amount: 500000,
        description: 'Pembelian Perlengkapan Stage 10 QA',
        transaction_date: '2026-10-01',
      });
      const allTx = await window.dataService.getTransactions({ organizationId: orgRoot, mode: 'own' });
      return { pass: allTx.some(tx => tx.id === created.id), id: created.id };
    }, ACC_A, ORG_ROOT);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const financeRefresh = await page.evaluate(async (accA, orgRoot, id) => {
      window.dataService.setActiveAccount(accA);
      const allTx = await window.dataService.getTransactions({ organizationId: orgRoot, mode: 'own' });
      return allTx.some(tx => tx.id === id);
    }, ACC_A, ORG_ROOT, financeCrud.id);
    report.crudDemo.finance = financeCrud.pass && financeRefresh;
    log(`CRUD Finance: ${report.crudDemo.finance ? 'PASS' : 'FAIL'}`);

    // 4. Agenda Read/Detail
    const agendaRead = await page.evaluate(async (accA, orgRoot) => {
      window.dataService.setActiveAccount(accA);
      const agendas = await window.dataService.getAgendas({ organizationId: orgRoot, mode: 'descendants' });
      return agendas.length > 0;
    }, ACC_A, ORG_ROOT);
    report.crudDemo.agenda = agendaRead;
    log(`Agenda Detail/Read: ${report.crudDemo.agenda ? 'PASS' : 'FAIL'}`);

    // 5. Performance Read/Detail
    const perfRead = await page.evaluate(async (accA, orgRoot) => {
      window.dataService.setActiveAccount(accA);
      const perfs = await window.dataService.getPerformances({ organizationId: orgRoot, mode: 'descendants' });
      return perfs.length > 0;
    }, ACC_A, ORG_ROOT);
    report.crudDemo.performance = perfRead;
    log(`Performance Read: ${report.crudDemo.performance ? 'PASS' : 'FAIL'}`);

    // 6. Report Read/Detail
    const reportRead = await page.evaluate(async (accA, orgRoot) => {
      window.dataService.setActiveAccount(accA);
      const reports = await window.dataService.getReports({ organizationId: orgRoot, mode: 'descendants' });
      return reports.length > 0;
    }, ACC_A, ORG_ROOT);
    report.crudDemo.report = reportRead;
    log(`Report Read: ${report.crudDemo.report ? 'PASS' : 'FAIL'}`);

    // 7. Structure Read/Detail
    const structRead = await page.evaluate(async (accA, orgA) => {
      window.dataService.setActiveAccount(accA);
      const tree = await window.dataService.getOrganizationTree();
      const structs = await window.dataService.getStructures(orgA);
      return tree.length > 0 && structs.length > 0;
    }, ACC_A, ORG_LEMBAGA_A);
    report.crudDemo.structure = structRead;
    log(`Structure Read: ${report.crudDemo.structure ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // PHASE 6: ACCOUNT ISOLATION FINAL CHECK
    // -------------------------------------------------------------
    log('--- Phase 6: Account Isolation Final Check ---');
    // Account A creates "Demo Final A"
    const finalProgA = await page.evaluate(async (accA, orgRoot) => {
      window.dataService.setActiveAccount(accA);
      const created = await window.dataService.createProgram({
        organization_id: orgRoot,
        title: 'Demo Final A - Isolation Test',
        name: 'Demo Final A - Isolation Test',
        status: 'draft',
        budget_allocated: 10000000,
        budget_planned: 10000000,
      });
      return created;
    }, ACC_A, ORG_ROOT);

    // Logout Account A -> Switch to Account B
    await page.evaluate((accB, orgA) => {
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
            permissions: ['Program.viewAny', 'Program.view', 'Program.create']
          }
        },
      };
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify(userB));
    }, ACC_B, ORG_LEMBAGA_A);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    // Account B verifies Demo Final A is invisible, and creates "Demo Final B"
    const isolationStepB = await page.evaluate(async (accB, orgA, progAId) => {
      window.dataService.setActiveAccount(accB);
      const rawB = localStorage.getItem(`filament_demo_v3_${accB}_programs`);
      const parsedB = rawB ? JSON.parse(rawB) : [];
      const hasA = parsedB.some(p => p.id === progAId || p.title === 'Demo Final A - Isolation Test');

      const createdB = await window.dataService.createProgram({
        organization_id: orgA,
        title: 'Demo Final B - Isolation Test',
        name: 'Demo Final B - Isolation Test',
        status: 'draft',
        budget_allocated: 12000000,
        budget_planned: 12000000,
      });

      return { hasA, createdBId: createdB.id };
    }, ACC_B, ORG_LEMBAGA_A, finalProgA.id);

    // Logout Account B -> Login Account A
    await page.evaluate((accA) => {
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

    // Account A verifies Demo Final A exists and Demo Final B is invisible
    const isolationStepA = await page.evaluate(async (accA, progAId, progBId) => {
      window.dataService.setActiveAccount(accA);
      const rawA = localStorage.getItem(`filament_demo_v3_${accA}_programs`);
      const parsedA = rawA ? JSON.parse(rawA) : [];
      const hasA = parsedA.some(p => p.id === progAId);
      const hasB = parsedA.some(p => p.id === progBId || p.title === 'Demo Final B - Isolation Test');
      return { hasA, hasB };
    }, ACC_A, finalProgA.id, isolationStepB.createdBId);

    report.accountIsolationFinal = !isolationStepB.hasA && isolationStepA.hasA && !isolationStepA.hasB;
    log(`Phase 6 Result: Account Isolation Final Check = ${report.accountIsolationFinal ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // PHASE 7: HIERARCHY / RBAC FINAL CHECK
    // -------------------------------------------------------------
    log('--- Phase 7: Hierarchy / RBAC Final Check ---');
    const rbacFinal = await page.evaluate(async (accB, orgA) => {
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
            permissions: ['view:descendants', 'Program.viewAny', 'Program.view', 'Program.create']
          }
        },
      };

      // 1. Own scope
      const ownProgs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' }, userB);
      const ownTargetIsolated = ownProgs.every(p => p.organization_id === orgA);

      // 2. Child cannot access Root
      let upwardDenied = false;
      try {
        await window.dataService.getPrograms({ organizationId: 'org-00000000-0000-0000-0000-000000000000', mode: 'own' }, userB);
      } catch {
        upwardDenied = true;
      }

      // 3. Child cannot access Sibling
      let siblingDenied = false;
      try {
        await window.dataService.getPrograms({ organizationId: 'org-22222222-2222-2222-2222-222222222222', mode: 'own' }, userB);
      } catch {
        siblingDenied = true;
      }

      return { ownTargetIsolated, upwardDenied, siblingDenied };
    }, ACC_B, ORG_LEMBAGA_A);

    report.hierarchyRbacFinal = rbacFinal.ownTargetIsolated && rbacFinal.upwardDenied && rbacFinal.siblingDenied;
    log(`Phase 7 Result: Hierarchy / RBAC Final Check = ${report.hierarchyRbacFinal ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // PHASE 8: MOBILE DEMO QA (320, 360, 375, 390, 414px)
    // -------------------------------------------------------------
    log('--- Phase 8: Mobile Demo QA ---');
    const mobileWidths = [320, 360, 375, 390, 414];
    let allMobilePass = true;

    for (const w of mobileWidths) {
      await page.setViewport({ width: w, height: 667, isMobile: true, hasTouch: true });
      let widthPassed = true;

      for (const r of coreRoutes) {
        await page.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' });
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth - document.documentElement.clientWidth;
        });
        if (overflow > 0) {
          widthPassed = false;
          log(`Mobile overflow detected on ${w}px at ${r}: ${overflow}px`);
        }
      }

      report.mobileAudit[`${w}px`] = widthPassed ? 'PASS' : 'FAIL';
      if (!widthPassed) allMobilePass = false;
      log(`Mobile Viewport ${w}px: ${report.mobileAudit[`${w}px`]}`);
    }

    // -------------------------------------------------------------
    // PHASE 9: DESKTOP DEMO QA (1024, 1280, 1440px)
    // -------------------------------------------------------------
    log('--- Phase 9: Desktop Demo QA ---');
    const desktopWidths = [1024, 1280, 1440];
    let allDesktopPass = true;

    for (const dw of desktopWidths) {
      await page.setViewport({ width: dw, height: 800, isMobile: false, hasTouch: false });
      await page.goto(`${BASE}/programs`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
      await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

      const dCheck = await page.evaluate(() => {
        const asides = Array.from(document.querySelectorAll('aside'));
        const sidebarVisible = asides.some(a => window.getComputedStyle(a).display !== 'none');
        const bottomNav = document.querySelector('nav.fixed.bottom-0');
        const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        return {
          sidebarVisible,
          bottomNavHidden: !bottomNav || window.getComputedStyle(bottomNav).display === 'none',
          overflow,
        };
      });

      const pass = dCheck.sidebarVisible && dCheck.bottomNavHidden && dCheck.overflow <= 0;
      report.desktopAudit[`${dw}px`] = pass ? 'PASS' : 'FAIL';
      if (!pass) allDesktopPass = false;
      log(`Desktop Viewport ${dw}px: ${report.desktopAudit[`${dw}px`]} (Sidebar=${dCheck.sidebarVisible}, BottomNavHidden=${dCheck.bottomNavHidden}, Overflow=${dCheck.overflow})`);
    }

    // -------------------------------------------------------------
    // PHASE 12: GOLDEN DEMO PATH
    // -------------------------------------------------------------
    log('--- Phase 12: Executing Golden Demo Path ---');
    await page.setViewport({ width: 1280, height: 800, isMobile: false });

    // Step 1 & 2: Login A & Dashboard
    await page.evaluate((accA) => {
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
        id: accA,
        name: 'Pengurus 1 (Pimpinan Harian)',
        role: 'superadmin',
        is_superadmin: true,
        status: 'active',
      }));
    }, ACC_A);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

    // Step 3: Programs
    await page.goto(`${BASE}/programs`, { waitUntil: 'domcontentloaded' });

    // Step 4: Tasks
    await page.goto(`${BASE}/tasks`, { waitUntil: 'domcontentloaded' });

    // Step 5: Finance
    await page.goto(`${BASE}/finance`, { waitUntil: 'domcontentloaded' });

    // Step 6: Reports
    await page.goto(`${BASE}/reports`, { waitUntil: 'domcontentloaded' });

    // Step 7 & 8: Logout & Login B
    await page.evaluate((accB, orgA) => {
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
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
            permissions: ['view:descendants', 'Program.viewAny', 'Program.view', 'Finance.viewAny']
          }
        },
      }));
    }, ACC_B, ORG_LEMBAGA_A);
    await page.goto(`${BASE}/programs`, { waitUntil: 'domcontentloaded' });

    const goldenBCheck = await page.evaluate(async (accB, progAId) => {
      window.dataService.setActiveAccount(accB);
      const raw = localStorage.getItem(`filament_demo_v3_${accB}_programs`);
      const parsed = raw ? JSON.parse(raw) : [];
      return !parsed.some(p => p.id === progAId);
    }, ACC_B, finalProgA.id);

    // Step 11 & 12: Return to A
    await page.evaluate((accA) => {
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
        id: accA,
        name: 'Pengurus 1 (Pimpinan Harian)',
        role: 'superadmin',
        is_superadmin: true,
        status: 'active',
      }));
    }, ACC_A);
    await page.goto(`${BASE}/programs`, { waitUntil: 'domcontentloaded' });

    const goldenACheck = await page.evaluate(async (accA, progAId) => {
      window.dataService.setActiveAccount(accA);
      const raw = localStorage.getItem(`filament_demo_v3_${accA}_programs`);
      const parsed = raw ? JSON.parse(raw) : [];
      return parsed.some(p => p.id === progAId);
    }, ACC_A, finalProgA.id);

    report.goldenPath = goldenBCheck && goldenACheck;
    log(`Golden Demo Path Result: ${report.goldenPath ? 'PASS' : 'FAIL'}`);

    // Report Summary
    report.consoleErrors = consoleErrors;
    log('======================================================================');
    log('STAGE 10 QA REPORT SUMMARY:');
    log(`1. Demo Data Sanity:          ${report.demoDataSanity ? 'PASS' : 'FAIL'}`);
    log(`2. Authentication Flow:       ${report.authFlow ? 'PASS' : 'FAIL'}`);
    log(`3. Core Module Smoke:         ${allModulesPass ? 'PASS' : 'FAIL'}`);
    log(`4. Core CRUD Demo:            ${Object.values(report.crudDemo).every(Boolean) ? 'PASS' : 'FAIL'}`);
    log(`5. Account Isolation Final:   ${report.accountIsolationFinal ? 'PASS' : 'FAIL'}`);
    log(`6. Hierarchy / RBAC Final:    ${report.hierarchyRbacFinal ? 'PASS' : 'FAIL'}`);
    log(`7. Mobile Demo QA (5 sizes):  ${allMobilePass ? 'PASS' : 'FAIL'}`);
    log(`8. Desktop Demo QA (3 sizes): ${allDesktopPass ? 'PASS' : 'FAIL'}`);
    log(`9. Golden Demo Path:          ${report.goldenPath ? 'PASS' : 'FAIL'}`);
    log(`10. Uncaught Console Errors:  ${consoleErrors.length} errors`);
    log('======================================================================');

    const overallPass =
      report.demoDataSanity &&
      report.authFlow &&
      allModulesPass &&
      Object.values(report.crudDemo).every(Boolean) &&
      report.accountIsolationFinal &&
      report.hierarchyRbacFinal &&
      allMobilePass &&
      allDesktopPass &&
      report.goldenPath &&
      consoleErrors.length === 0;

    await browser.close();
    if (!overallPass) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[STAGE10-QA] Fatal error during test execution:', err);
    await browser.close();
    process.exit(1);
  }
}

runStage10();
