/**
 * STAGE 9 — FULL BROWSER QA & STORAGE INSPECTION SCRIPT
 * 
 * Verifies Phase 9 (Browser QA across Programs, Tasks, Finance)
 * and Phase 10 (Storage Inspection, no passwords/secrets, malformed fallback).
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

const log = (msg) => console.log(`[QA-STAGE9] ${msg}`);

async function runBrowserQA() {
  log('Starting Stage 9 Real Browser QA & Storage Inspection...');

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

  const results = {
    programs: {},
    tasks: {},
    finance: {},
    storage: {},
    malformedFallback: false,
    consoleErrors: [],
  };

  const ACC_A = '00000000-0000-0000-0000-000000000001';
  const ACC_B = '00000000-0000-0000-0000-000000000002';
  const ORG_ROOT = 'org-00000000-0000-0000-0000-000000000000';
  const ORG_LEMBAGA_A = 'org-11111111-1111-1111-1111-111111111111';

  try {
    // -------------------------------------------------------------
    // MODULE 1: PROGRAMS (Scenarios A, B, C)
    // -------------------------------------------------------------
    log('--- Executing Programs Scenario A, B, C ---');
    // Scenario A: Login Account A -> Create "Demo A" -> Refresh -> Verify -> Logout
    await page.goto(`${BASE}/programs`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    const progA = await page.evaluate(async (accA, orgRoot) => {
      // 1. Login Account A
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
        id: accA,
        name: 'Pengurus 1 (Pimpinan Harian)',
        role: 'superadmin',
        is_superadmin: true,
        status: 'active',
      }));
      window.dataService.setActiveAccount(accA);

      // 2. Create program "Demo A"
      const created = await window.dataService.createProgram({
        organization_id: orgRoot,
        title: 'Program Kerja Demo A - Superadmin',
        name: 'Program Kerja Demo A - Superadmin',
        status: 'draft',
        budget_allocated: 35000000,
        budget_planned: 35000000,
      });
      return created;
    }, ACC_A, ORG_ROOT);

    // Refresh & Verify Demo A
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const verifyProgA = await page.evaluate(async (accA, id) => {
      window.dataService.setActiveAccount(accA);
      const prog = await window.dataService.getProgramById(id);
      return { found: !!prog, title: prog?.title };
    }, ACC_A, progA.id);
    results.programs.scenarioA = verifyProgA.found;
    log(`Scenario A (Account A create & refresh persistence): ${verifyProgA.found ? 'PASS' : 'FAIL'}`);

    // Logout
    await page.evaluate(() => {
      localStorage.setItem('filament_bakid_logged_out', 'true');
      localStorage.removeItem('filament_bakid_auth_user');
      localStorage.removeItem('filament_bakid_active_org_id');
      window.dataService.setActiveAccount(null);
    });

    // Scenario B: Login Account B -> Verify Demo A hidden -> Create "Demo B" -> Refresh -> Verify -> Logout
    const progB = await page.evaluate(async (accB, orgA, progAId) => {
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
            permissions: ['Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete']
          }
        },
      };
      localStorage.removeItem('filament_bakid_logged_out');
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify(userB));
      window.dataService.setActiveAccount(accB);

      // Verify Demo A NOT visible
      const progs = await window.dataService.getPrograms({ organizationId: orgA, mode: 'own' }, userB);
      const demoAVisible = progs.some(p => p.id === progAId);

      // Create Demo B
      const created = await window.dataService.createProgram({
        organization_id: orgA,
        title: 'Program Kerja Demo B - Biro Ubudiyah',
        name: 'Program Kerja Demo B - Biro Ubudiyah',
        status: 'draft',
        budget_allocated: 15000000,
        budget_planned: 15000000,
      }, userB);

      return { demoAVisible, createdB: created };
    }, ACC_B, ORG_LEMBAGA_A, progA.id);

    // Refresh & Verify Demo B
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const verifyProgB = await page.evaluate(async (accB, orgA, id) => {
      const userB = JSON.parse(localStorage.getItem('filament_bakid_auth_user') || '{}');
      window.dataService.setActiveAccount(accB);
      const prog = await window.dataService.getProgramById(id, userB);
      return { found: !!prog, title: prog?.title };
    }, ACC_B, ORG_LEMBAGA_A, progB.createdB.id);
    results.programs.scenarioB = !progB.demoAVisible && verifyProgB.found;
    log(`Scenario B (Account B isolation & create persistence): ${results.programs.scenarioB ? 'PASS' : 'FAIL'}`);

    // Logout Account B
    await page.evaluate(() => {
      localStorage.setItem('filament_bakid_logged_out', 'true');
      localStorage.removeItem('filament_bakid_auth_user');
      localStorage.removeItem('filament_bakid_active_org_id');
      window.dataService.setActiveAccount(null);
    });

    // Scenario C: Login Account A -> Verify Demo A present, Demo B absent
    const scenarioC = await page.evaluate(async (accA, orgRoot, progAId, progBId) => {
      localStorage.removeItem('filament_bakid_logged_out');
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
        id: accA,
        name: 'Pengurus 1 (Pimpinan Harian)',
        role: 'superadmin',
        is_superadmin: true,
        status: 'active',
      }));
      window.dataService.setActiveAccount(accA);

      const rawA = localStorage.getItem(`filament_demo_v3_${accA}_programs`);
      const parsedA = rawA ? JSON.parse(rawA) : [];
      const hasDemoA = parsedA.some(p => p.id === progAId);
      const hasDemoB = parsedA.some(p => p.id === progBId);
      const progs = await window.dataService.getPrograms({ organizationId: orgRoot, mode: 'own' });
      return {
        hasDemoA,
        hasDemoB,
        progAId,
        rawCount: parsedA.length,
        parsedSample: parsedA.slice(0, 3).map(p => ({ id: p.id, org: p.organization_id, title: p.title })),
        progsCount: progs.length,
      };
    }, ACC_A, ORG_ROOT, progA.id, progB.createdB.id);
    log(`Scenario C details: ${JSON.stringify(scenarioC)}`);
    results.programs.scenarioC = scenarioC.hasDemoA && !scenarioC.hasDemoB;
    log(`Scenario C (Account A sees Demo A, does NOT see Demo B): ${results.programs.scenarioC ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // MODULE 2: TASKS (Scenarios A, B, C)
    // -------------------------------------------------------------
    log('--- Executing Tasks Scenario A, B, C ---');
    // Account A creates Task A
    const taskA = await page.evaluate(async (accA, orgRoot) => {
      window.dataService.setActiveAccount(accA);
      const created = await window.dataService.createTask({
        organization_id: orgRoot,
        title: 'Tugas Operasional QA - Superadmin',
        priority: 'high',
        status: 'new',
      });
      return created;
    }, ACC_A, ORG_ROOT);

    // Refresh & check Task A
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const verifyTaskA = await page.evaluate(async (accA, taskId) => {
      window.dataService.setActiveAccount(accA);
      const task = await window.dataService.getTaskById(taskId);
      return { found: !!task };
    }, ACC_A, taskA.id);
    results.tasks.scenarioA = verifyTaskA.found;

    // Account B login -> Verify Task A hidden -> Create Task B
    const taskB = await page.evaluate(async (accB, orgA, taskAId) => {
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
            permissions: ['Task.viewAny', 'Task.view', 'Task.create', 'Task.update', 'Task.delete']
          }
        },
      };
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify(userB));
      window.dataService.setActiveAccount(accB);

      const tasks = await window.dataService.getTasks({ organizationId: orgA, mode: 'own' }, undefined, userB);
      const taskAVisible = tasks.some(t => t.id === taskAId);

      const created = await window.dataService.createTask({
        organization_id: orgA,
        title: 'Tugas Operasional QA - Biro Ubudiyah',
        priority: 'medium',
        status: 'new',
      }, userB);

      return { taskAVisible, createdB: created };
    }, ACC_B, ORG_LEMBAGA_A, taskA.id);

    // Refresh & verify Task B
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const verifyTaskB = await page.evaluate(async (accB, orgA, taskId) => {
      const userB = JSON.parse(localStorage.getItem('filament_bakid_auth_user') || '{}');
      window.dataService.setActiveAccount(accB);
      const task = await window.dataService.getTaskById(taskId, userB);
      return { found: !!task };
    }, ACC_B, ORG_LEMBAGA_A, taskB.createdB.id);
    results.tasks.scenarioB = !taskB.taskAVisible && verifyTaskB.found;

    // Account A login -> Verify Task A present, Task B absent
    const taskScenarioC = await page.evaluate(async (accA, orgRoot, taskAId, taskBId) => {
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
        id: accA,
        role: 'superadmin',
        is_superadmin: true,
        status: 'active',
      }));
      window.dataService.setActiveAccount(accA);

      const rawTasksA = localStorage.getItem(`filament_demo_v3_${accA}_tasks`);
      const parsedTasksA = rawTasksA ? JSON.parse(rawTasksA) : [];
      const hasA = parsedTasksA.some(t => t.id === taskAId);
      const hasB = parsedTasksA.some(t => t.id === taskBId);
      return { hasA, hasB };
    }, ACC_A, ORG_ROOT, taskA.id, taskB.createdB.id);
    results.tasks.scenarioC = taskScenarioC.hasA && !taskScenarioC.hasB;
    log(`Tasks Isolation & CRUD: Scenario A=${results.tasks.scenarioA}, B=${results.tasks.scenarioB}, C=${results.tasks.scenarioC}`);

    // -------------------------------------------------------------
    // MODULE 3: FINANCE (Scenarios A, B, C)
    // -------------------------------------------------------------
    log('--- Executing Finance Scenario A, B, C ---');
    // Ensure clean Account A login state with page reload
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
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    // Account A creates Budget A
    const budgetA = await page.evaluate(async (accA, orgRoot) => {
      const userA = JSON.parse(localStorage.getItem('filament_bakid_auth_user') || '{}');
      window.dataService.setActiveAccount(accA);
      const created = await window.dataService.createBudget({
        organization_id: orgRoot,
        program_id: 'prg-1',
        allocated_amount: 100000000,
        realized_amount: 0,
        remaining_balance: 100000000,
        fiscal_year: 2026,
        status: 'approved',
        notes: 'Anggaran QA Demo Account A',
      }, userA);
      return created;
    }, ACC_A, ORG_ROOT);

    // Refresh & check Budget A
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const verifyBudgetA = await page.evaluate(async (accA, orgRoot, id) => {
      window.dataService.setActiveAccount(accA);
      const raw = localStorage.getItem(`filament_demo_v3_${accA}_budgets`);
      const parsed = raw ? JSON.parse(raw) : [];
      return { found: parsed.some(b => b.id === id) };
    }, ACC_A, ORG_ROOT, budgetA.id);
    results.finance.scenarioA = verifyBudgetA.found;

    // Switch to Account B with page reload
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
            permissions: ['Finance.viewAny', 'Finance.view', 'Finance.create', 'Finance.update']
          }
        },
      };
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify(userB));
    }, ACC_B, ORG_LEMBAGA_A);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    // Account B verifies Budget A hidden -> creates Budget B
    const budgetB = await page.evaluate(async (accB, orgA, budgetAId) => {
      const userB = JSON.parse(localStorage.getItem('filament_bakid_auth_user') || '{}');
      window.dataService.setActiveAccount(accB);

      const raw = localStorage.getItem(`filament_demo_v3_${accB}_budgets`);
      const parsed = raw ? JSON.parse(raw) : [];
      const budgetAVisible = parsed.some(b => b.id === budgetAId);

      const created = await window.dataService.createBudget({
        organization_id: orgA,
        program_id: 'prg-1',
        allocated_amount: 25000000,
        realized_amount: 0,
        remaining_balance: 25000000,
        fiscal_year: 2026,
        status: 'approved',
        notes: 'Anggaran QA Demo Account B',
      }, userB);

      return { budgetAVisible, createdB: created };
    }, ACC_B, ORG_LEMBAGA_A, budgetA.id);

    // Refresh & verify Budget B
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    const verifyBudgetB = await page.evaluate(async (accB, orgA, id) => {
      window.dataService.setActiveAccount(accB);
      const raw = localStorage.getItem(`filament_demo_v3_${accB}_budgets`);
      const parsed = raw ? JSON.parse(raw) : [];
      return { found: parsed.some(b => b.id === id) };
    }, ACC_B, ORG_LEMBAGA_A, budgetB.createdB.id);
    results.finance.scenarioB = !budgetB.budgetAVisible && verifyBudgetB.found;

    // Switch back to Account A with page reload
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

    // Account A login -> Verify Budget A present, Budget B absent
    const financeScenarioC = await page.evaluate(async (accA, orgRoot, budgetAId, budgetBId) => {
      window.dataService.setActiveAccount(accA);
      const rawBudgetsA = localStorage.getItem(`filament_demo_v3_${accA}_budgets`);
      const parsedBudgetsA = rawBudgetsA ? JSON.parse(rawBudgetsA) : [];
      const hasA = parsedBudgetsA.some(b => b.id === budgetAId);
      const hasB = parsedBudgetsA.some(b => b.id === budgetBId);
      return { hasA, hasB };
    }, ACC_A, ORG_ROOT, budgetA.id, budgetB.createdB.id);
    results.finance.scenarioC = financeScenarioC.hasA && !financeScenarioC.hasB;
    log(`Finance Isolation & CRUD: Scenario A=${results.finance.scenarioA}, B=${results.finance.scenarioB}, C=${results.finance.scenarioC}`);

    // -------------------------------------------------------------
    // PHASE 10: STORAGE INSPECTION & MALFORMED RECOVERY
    // -------------------------------------------------------------
    log('--- Performing Storage Inspection ---');
    const storageAudit = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const demoKeys = keys.filter(k => k.startsWith('filament_demo_v3_'));
      let hasPasswords = false;
      let hasSecrets = false;
      let allJsonValid = true;

      for (const k of demoKeys) {
        const val = localStorage.getItem(k);
        if (!val) continue;
        if (val.includes('"password"') || val.includes('"password_hash"') || val.includes('"secret"')) {
          hasPasswords = true;
        }
        try {
          JSON.parse(val);
        } catch {
          allJsonValid = false;
        }
      }

      return {
        totalDemoKeys: demoKeys.length,
        hasPasswords,
        hasSecrets,
        allJsonValid,
      };
    });
    results.storage = storageAudit;
    log(`Storage Audit: ${storageAudit.totalDemoKeys} keys inspected. No passwords=${!storageAudit.hasPasswords}, Valid JSON=${storageAudit.allJsonValid}`);

    // Malformed storage recovery test:
    log('--- Testing Malformed Storage Recovery ---');
    const malformedTest = await page.evaluate(async () => {
      const corruptAccountId = '00000000-0000-0000-0000-corrupt-0001';
      const corruptKey = `filament_demo_v3_${corruptAccountId}_programs`;
      // Inject invalid JSON
      localStorage.setItem(corruptKey, '{corrupted-json-data');

      window.dataService.setActiveAccount(corruptAccountId);
      // Calling getPrograms should NOT throw, should fall back to seed/empty safely
      let survived = false;
      try {
        const progs = await window.dataService.getPrograms({ organizationId: 'org-00000000-0000-0000-0000-000000000000', mode: 'descendants' });
        survived = Array.isArray(progs);
      } catch (e) {
        survived = false;
      }

      // Ensure it did NOT silently destroy or overwrite the corrupted data
      const stillCorrupted = localStorage.getItem(corruptKey) === '{corrupted-json-data';
      return survived && stillCorrupted;
    });
    results.malformedFallback = malformedTest;
    log(`Malformed Storage Recovery: ${malformedTest ? 'PASS (Safely handled without overwrite or crash)' : 'FAIL'}`);

    results.consoleErrors = consoleErrors.filter(e => !e.includes('Malformed data detected'));

    console.log('\n===============================================================');
    console.log('BROWSER QA & STORAGE INSPECTION SUMMARY');
    console.log('===============================================================');
    console.log(`Programs CRUD & Isolation: A=${results.programs.scenarioA}, B=${results.programs.scenarioB}, C=${results.programs.scenarioC}`);
    console.log(`Tasks CRUD & Isolation:    A=${results.tasks.scenarioA}, B=${results.tasks.scenarioB}, C=${results.tasks.scenarioC}`);
    console.log(`Finance CRUD & Isolation:  A=${results.finance.scenarioA}, B=${results.finance.scenarioB}, C=${results.finance.scenarioC}`);
    console.log(`Storage Security:          No Passwords=${!results.storage.hasPasswords}, JSON Valid=${results.storage.allJsonValid}`);
    console.log(`Malformed Storage Resil.:  ${results.malformedFallback ? 'PASS' : 'FAIL'}`);
    console.log(`App Console Errors:        ${results.consoleErrors.length} errors`);
    console.log('===============================================================\n');

    const allPass = results.programs.scenarioA && results.programs.scenarioB && results.programs.scenarioC &&
      results.tasks.scenarioA && results.tasks.scenarioB && results.tasks.scenarioC &&
      results.finance.scenarioA && results.finance.scenarioB && results.finance.scenarioC &&
      !results.storage.hasPasswords && results.storage.allJsonValid &&
      results.malformedFallback;

    if (!allPass) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

runBrowserQA().catch((err) => {
  console.error('Fatal error in Browser QA script:', err);
  process.exit(1);
});
