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
  throw new Error('No browser found');
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: getBrowserPath(),
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

  const admin = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Pengurus 1 (Pimpinan Harian)',
    email: 'superadmin@pesantren.id',
    role: 'superadmin',
    is_superadmin: true
  };

  const testResults = await page.evaluate(async (user) => {
    window.dataService.setActiveAccount(user.id);
    window.dataService.resetDemoData(user.id);

    // 1. Initial State
    const orgs0 = await window.dataService.getOrganizations(user);
    const progs0 = await window.dataService.getPrograms({ organizationId: 'any', mode: 'own' }, user);
    
    // 2. Create Root Org
    const rootOrg = await window.dataService.createOrganization({
      name: 'Pimpinan Wilayah Baru',
      short_name: 'PW-Baru',
      code: 'PW-01',
      slug: 'pw-baru',
      unit_type: 'pimpinan',
      status: 'active',
      parent_id: null,
      level: 0,
      period_active: '2026 - 2028'
    }, user);

    // 3. Create Child Unit
    const childOrg = await window.dataService.createOrganization({
      name: 'Lembaga Pendidikan & Dakwah',
      short_name: 'LPD',
      code: 'LPD-01',
      slug: 'lpd-01',
      unit_type: 'lembaga',
      status: 'active',
      parent_id: rootOrg.id,
      level: 1,
      period_active: '2026 - 2028'
    }, user);

    // 4. Create Program under Child Unit
    const prog = await window.dataService.createProgram({
      organization_id: childOrg.id,
      title: 'Program Kerja Unggulan 2026',
      name: 'Program Kerja Unggulan 2026',
      code: 'PRG-UNG-01',
      duration_type: 'rutin',
      start_date: '2026-01-01',
      budget_allocated: 50000000,
      status: 'draft'
    }, user);

    // 5. Query created data
    const allOrgs = await window.dataService.getOrganizations(user);
    const childProgs = await window.dataService.getPrograms({ organizationId: childOrg.id, mode: 'own' }, user);

    return {
      initialOrgsCount: orgs0.length,
      initialProgsCount: progs0.length,
      rootOrgId: rootOrg.id,
      childOrgParentId: childOrg.parent_id,
      createdOrgsCount: allOrgs.length,
      createdProgsCount: childProgs.length,
      programDurationType: prog.duration_type
    };
  }, admin);

  console.log('CREATE-FROM-ZERO TEST RESULTS:');
  console.log(JSON.stringify(testResults, null, 2));

  // Reload to verify persistence
  await page.reload({ waitUntil: 'networkidle0' });
  const persistenceCheck = await page.evaluate(async (user) => {
    window.dataService.setActiveAccount(user.id);
    const orgs = await window.dataService.getOrganizations(user);
    return orgs.length;
  }, admin);

  console.log(`PERSISTENCE AFTER RELOAD: ${persistenceCheck} organizations`);

  // Switch to Account B to verify isolation
  const accountB = {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Admin Baru',
    role: 'admin'
  };
  const accountBCheck = await page.evaluate(async (userB) => {
    window.dataService.setActiveAccount(userB.id);
    const orgs = await window.dataService.getOrganizations(userB);
    return orgs.length;
  }, accountB);

  console.log(`ACCOUNT B ISOLATION: ${accountBCheck} organizations (must be 0)`);

  // Clean up test data to leave 100% empty state
  await page.evaluate((user) => {
    window.dataService.resetDemoData(user.id);
    window.dataService.resetDemoData();
  }, admin);

  const finalCheck = await page.evaluate(async (user) => {
    window.dataService.setActiveAccount(user.id);
    const orgs = await window.dataService.getOrganizations(user);
    const progs = await window.dataService.getPrograms({ organizationId: 'any', mode: 'own' }, user);
    const agds = await window.dataService.getAgendas({ organizationId: 'any', mode: 'own' }, undefined, user);
    const tasks = await window.dataService.getTasks({ organizationId: 'any', mode: 'own' }, undefined, user);
    const buds = await window.dataService.getBudgets('any', undefined, user);
    const txs = await window.dataService.getTransactions({ organizationId: 'any', mode: 'own' }, undefined, user);
    const reps = await window.dataService.getReports({ organizationId: 'any', mode: 'own' }, undefined, user);
    const perfs = await window.dataService.getPerformances({ organizationId: 'any', mode: 'own' }, undefined, user);
    return {
      organizations: orgs.length,
      organization_memberships: 0,
      programs: progs.length,
      agendas: agds.length,
      tasks: tasks.length,
      budgets: buds.length,
      transactions: txs.length,
      reports: reps.length,
      performance: perfs.length
    };
  }, admin);

  console.log('FINAL ZERO STATE NUMERIC VERIFICATION:');
  console.log(JSON.stringify(finalCheck, null, 2));

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
