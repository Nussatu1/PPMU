const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BROWSER_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const findBrowser = () => {
  for (const p of BROWSER_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No compatible Chromium browser found');
};

const BASE = process.env.AUDIT_BASE || 'http://localhost:5173';
const log = (msg) => console.log(`[SESSION-QA] ${msg}`);

async function loginAs(page, buttonKeyword) {
  await page.bringToFront();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
  await page.evaluate((keyword) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find(b => b.textContent && b.textContent.includes(keyword));
    if (target) target.click();
  }, buttonKeyword);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => {
    const auth = sessionStorage.getItem('filament_bakid_auth_user');
    return auth !== null;
  }, { timeout: 8000 });
  await page.waitForFunction(() => window.location.pathname === '/', { timeout: 8000 });
}

async function runSessionIsolationQA() {
  log('======================================================================');
  log('TESTING MULTI-ACCOUNT SESSION ISOLATION & PERSISTENCE');
  log('======================================================================');

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  const results = {
    unauthenticatedRedirectToLogin: false,
    noAutoLoginSuperadmin: false,
    superadminLogin: false,
    adminOrgLogin: false,
    adminUnitLogin: false,
    adminOrgRefreshStaysAdminOrg: false,
    superadminRefreshStaysSuperadmin: false,
    adminUnitRefreshStaysAdminUnit: false,
    crossContextIsolation: false,
    logoutIsolation: false,
    tabLevelIsolation: false,
    roleAndOrgPersistence: false,
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Clean context without session shows login (NO auto-login to Superadmin)
    // -------------------------------------------------------------
    log('--- Test 1: Clean Unauthenticated Session ---');
    const cleanCtx = await browser.createBrowserContext();
    const cleanPage = await cleanCtx.newPage();
    await cleanPage.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    const currentUrl = cleanPage.url();
    const isAtLogin = currentUrl.includes('/login');
    log(`Clean context redirected to: ${currentUrl} (isLogin=${isAtLogin})`);
    results.unauthenticatedRedirectToLogin = isAtLogin;

    const noFallbackUser = await cleanPage.evaluate(() => {
      const sess = sessionStorage.getItem('filament_bakid_auth_user');
      const loc = localStorage.getItem('filament_bakid_auth_user');
      return !sess && !loc;
    });
    results.noAutoLoginSuperadmin = noFallbackUser;
    log(`No fallback/auto-login user present in storage: ${noFallbackUser ? 'PASS' : 'FAIL'}`);
    await cleanCtx.close();

    // -------------------------------------------------------------
    // TEST 2: Multi-Context Login (Context A: Superadmin, Context B: Admin Organisasi, Context C: Admin Unit)
    // -------------------------------------------------------------
    log('--- Test 2: Multi-Context Concurrent Logins ---');
    const ctxA = await browser.createBrowserContext();
    const pageA = await ctxA.newPage();

    const ctxB = await browser.createBrowserContext();
    const pageB = await ctxB.newPage();

    const ctxC = await browser.createBrowserContext();
    const pageC = await ctxC.newPage();

    // Context A: Login as Superadmin (Pengurus 1)
    await loginAs(pageA, 'Pengurus 1');
    const userA = await pageA.evaluate(() => {
      const raw = sessionStorage.getItem('filament_bakid_auth_user');
      return raw ? JSON.parse(raw) : null;
    });
    log(`Context A Logged in: ${userA?.name} (email=${userA?.email}, role=${userA?.role}, is_superadmin=${userA?.is_superadmin})`);
    results.superadminLogin = userA?.email === 'pengurus1@bakid.ponpes.id';

    // Context B: Login as Admin Organisasi (Ubudiyah)
    await loginAs(pageB, 'Ubudiyah');
    const userB = await pageB.evaluate(() => {
      const raw = sessionStorage.getItem('filament_bakid_auth_user');
      return raw ? JSON.parse(raw) : null;
    });
    log(`Context B Logged in: ${userB?.name} (email=${userB?.email})`);
    results.adminOrgLogin = userB?.email === 'ubudiyah@bakid.ponpes.id';

    // Context C: Login as Admin Unit (Multimedia)
    await loginAs(pageC, 'Multimedia');
    const userC = await pageC.evaluate(() => {
      const raw = sessionStorage.getItem('filament_bakid_auth_user');
      return raw ? JSON.parse(raw) : null;
    });
    log(`Context C Logged in: ${userC?.name} (email=${userC?.email})`);
    results.adminUnitLogin = userC?.email === 'multimedia@bakid.ponpes.id';

    // -------------------------------------------------------------
    // TEST 3: Refresh Context B (Admin Organisasi)
    // CRITICAL: MUST REMAIN Admin Organisasi, MUST NOT BECOME Superadmin
    // -------------------------------------------------------------
    log('--- Test 3: Refresh Context B (Admin Organisasi) ---');
    await pageB.bringToFront();
    await pageB.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    const userBAfterRefresh = await pageB.evaluate(() => {
      const raw = sessionStorage.getItem('filament_bakid_auth_user');
      return raw ? JSON.parse(raw) : null;
    });
    log(`Context B After Refresh: ${userBAfterRefresh?.name} (email=${userBAfterRefresh?.email})`);
    results.adminOrgRefreshStaysAdminOrg = userBAfterRefresh?.email === 'ubudiyah@bakid.ponpes.id';

    // -------------------------------------------------------------
    // TEST 4: Refresh Context A (Superadmin)
    // MUST REMAIN Superadmin
    // -------------------------------------------------------------
    log('--- Test 4: Refresh Context A (Superadmin) ---');
    await pageA.bringToFront();
    await pageA.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    const userAAfterRefresh = await pageA.evaluate(() => {
      const raw = sessionStorage.getItem('filament_bakid_auth_user');
      return raw ? JSON.parse(raw) : null;
    });
    log(`Context A After Refresh: ${userAAfterRefresh?.name} (email=${userAAfterRefresh?.email})`);
    results.superadminRefreshStaysSuperadmin = userAAfterRefresh?.email === 'pengurus1@bakid.ponpes.id';

    // -------------------------------------------------------------
    // TEST 5: Refresh Context C (Admin Unit)
    // MUST REMAIN Admin Unit
    // -------------------------------------------------------------
    log('--- Test 5: Refresh Context C (Admin Unit) ---');
    await pageC.bringToFront();
    await pageC.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    const userCAfterRefresh = await pageC.evaluate(() => {
      const raw = sessionStorage.getItem('filament_bakid_auth_user');
      return raw ? JSON.parse(raw) : null;
    });
    log(`Context C After Refresh: ${userCAfterRefresh?.name} (email=${userCAfterRefresh?.email})`);
    results.adminUnitRefreshStaysAdminUnit = userCAfterRefresh?.email === 'multimedia@bakid.ponpes.id';

    results.crossContextIsolation = (
      results.adminOrgRefreshStaysAdminOrg &&
      results.superadminRefreshStaysSuperadmin &&
      results.adminUnitRefreshStaysAdminUnit
    );

    // -------------------------------------------------------------
    // TEST 6: Logout Isolation (Logout Context B does not affect A or C)
    // -------------------------------------------------------------
    log('--- Test 6: Logout Isolation ---');
    await pageB.bringToFront();
    await pageB.evaluate(() => {
      sessionStorage.setItem('filament_bakid_logged_out', 'true');
      sessionStorage.removeItem('filament_bakid_auth_user');
      sessionStorage.removeItem('filament_bakid_active_org_id');
      window.location.href = '/login';
    });
    await pageB.waitForFunction(() => window.location.pathname.includes('/login'), { timeout: 5000 });

    const isBLoggedOut = pageB.url().includes('/login');
    log(`Context B logged out: ${isBLoggedOut}`);

    // Context A still logged in
    await pageA.bringToFront();
    await pageA.reload({ waitUntil: 'networkidle0' });
    const userAStillIn = await pageA.evaluate(() => {
      const raw = sessionStorage.getItem('filament_bakid_auth_user');
      return raw ? JSON.parse(raw) : null;
    });
    const aPreserved = userAStillIn?.email === 'pengurus1@bakid.ponpes.id';
    log(`Context A still logged in: ${aPreserved}`);

    // Context C still logged in
    await pageC.bringToFront();
    await pageC.reload({ waitUntil: 'networkidle0' });
    const userCStillIn = await pageC.evaluate(() => {
      const raw = sessionStorage.getItem('filament_bakid_auth_user');
      return raw ? JSON.parse(raw) : null;
    });
    const cPreserved = userCStillIn?.email === 'multimedia@bakid.ponpes.id';
    log(`Context C still logged in: ${cPreserved}`);

    results.logoutIsolation = isBLoggedOut && aPreserved && cPreserved;

    await ctxA.close();
    await ctxB.close();
    await ctxC.close();

    // -------------------------------------------------------------
    // TEST 7: Tab-Level Isolation within the SAME Browser Context
    // -------------------------------------------------------------
    log('--- Test 7: Tab-Level Isolation (Same Browser Profile / Window) ---');
    const sharedProfileCtx = await browser.createBrowserContext();
    const tab1 = await sharedProfileCtx.newPage();
    // Tab 1 logs in as Superadmin
    await loginAs(tab1, 'Pengurus 1');

    const tab2 = await sharedProfileCtx.newPage();
    // Tab 2 logs in as Ubudiyah (Admin Organisasi)
    await loginAs(tab2, 'Ubudiyah');

    const tab1User = await tab1.evaluate(() => JSON.parse(sessionStorage.getItem('filament_bakid_auth_user') || '{}'));
    const tab2User = await tab2.evaluate(() => JSON.parse(sessionStorage.getItem('filament_bakid_auth_user') || '{}'));
    log(`Tab 1 user: ${tab1User.name} (${tab1User.email})`);
    log(`Tab 2 user: ${tab2User.name} (${tab2User.email})`);

    // Reload Tab 2 -> Must STAY Ubudiyah!
    await tab2.bringToFront();
    await tab2.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));
    const tab2AfterReload = await tab2.evaluate(() => JSON.parse(sessionStorage.getItem('filament_bakid_auth_user') || '{}'));
    log(`Tab 2 after reload: ${tab2AfterReload.name} (${tab2AfterReload.email})`);

    // Reload Tab 1 -> Must STAY Superadmin!
    await tab1.bringToFront();
    await tab1.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));
    const tab1AfterReload = await tab1.evaluate(() => JSON.parse(sessionStorage.getItem('filament_bakid_auth_user') || '{}'));
    log(`Tab 1 after reload: ${tab1AfterReload.name} (${tab1AfterReload.email})`);

    results.tabLevelIsolation = (
      tab1AfterReload.email === 'pengurus1@bakid.ponpes.id' &&
      tab2AfterReload.email === 'ubudiyah@bakid.ponpes.id'
    );
    results.roleAndOrgPersistence = results.tabLevelIsolation && results.crossContextIsolation;

    await sharedProfileCtx.close();
  } catch (err) {
    log(`QA Script error: ${err.message}`);
  } finally {
    await browser.close();
  }

  log('======================================================================');
  log('FINAL QA SUMMARY:');
  log(`1. Unauthenticated Redirect to Login: ${results.unauthenticatedRedirectToLogin ? 'PASS' : 'FAIL'}`);
  log(`2. No Auto-Login / Superadmin Fallback: ${results.noAutoLoginSuperadmin ? 'PASS' : 'FAIL'}`);
  log(`3. Superadmin Login:                 ${results.superadminLogin ? 'PASS' : 'FAIL'}`);
  log(`4. Admin Organisasi Login:            ${results.adminOrgLogin ? 'PASS' : 'FAIL'}`);
  log(`5. Admin Unit Login:                  ${results.adminUnitLogin ? 'PASS' : 'FAIL'}`);
  log(`6. Admin Org Refresh Stays Admin Org: ${results.adminOrgRefreshStaysAdminOrg ? 'PASS' : 'FAIL'}`);
  log(`7. Superadmin Refresh Stays S-Admin:  ${results.superadminRefreshStaysSuperadmin ? 'PASS' : 'FAIL'}`);
  log(`8. Admin Unit Refresh Stays Unit:     ${results.adminUnitRefreshStaysAdminUnit ? 'PASS' : 'FAIL'}`);
  log(`9. Cross-Context Isolation:           ${results.crossContextIsolation ? 'PASS' : 'FAIL'}`);
  log(`10. Logout Isolation:                 ${results.logoutIsolation ? 'PASS' : 'FAIL'}`);
  log(`11. Tab-Level Isolation:              ${results.tabLevelIsolation ? 'PASS' : 'FAIL'}`);
  log(`12. Role & Org Persistence:           ${results.roleAndOrgPersistence ? 'PASS' : 'FAIL'}`);
  log('======================================================================');

  const allPassed = Object.values(results).every(v => v === true);
  if (!allPassed) {
    process.exit(1);
  }
  log('ALL TESTS PASSED WITH 100% SUCCESS!');
}

runSessionIsolationQA();
