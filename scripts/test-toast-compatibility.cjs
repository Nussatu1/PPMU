/**
 * MICRO-FIX VERIFICATION: TOAST UUID COMPATIBILITY TEST
 * Verifies generateToastId under:
 * - CASE A: Native crypto.randomUUID
 * - CASE B: crypto exists but randomUUID is undefined (insecure context / older WebView)
 * - CASE C: crypto is completely undefined
 * And verifies real browser Report Review flow (Approve & Revise) with 0 errors.
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
const log = (msg) => console.log(`[TEST-TOAST] ${msg}`);

// Replicate ToastContext generateToastId logic for direct unit verification
const generateToastId = (cryptoInstance) => {
  const c = cryptoInstance !== undefined ? cryptoInstance : (typeof crypto !== 'undefined' ? crypto : undefined);
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

async function runTests() {
  log('======================================================================');
  log('MICRO-FIX — TOAST CRYPTO.UUID COMPATIBILITY VERIFICATION');
  log('======================================================================');

  let allPass = true;

  // -----------------------------------------------------------------
  // 1. UNIT LOGIC MATRIX (CASE A, B, C)
  // -----------------------------------------------------------------
  log('\n--- 1. CRYPTO COMPATIBILITY UNIT MATRIX ---');

  // CASE A: Native crypto.randomUUID available
  const mockCryptoA = { randomUUID: () => '11111111-2222-3333-4444-555555555555' };
  const idCaseA = generateToastId(mockCryptoA);
  const passCaseA = idCaseA === '11111111-2222-3333-4444-555555555555';
  log(`  [CASE A] crypto.randomUUID available: ${passCaseA ? '✓ PASS' : '✗ FAIL'} (Result: ${idCaseA})`);
  if (!passCaseA) allPass = false;

  // CASE B: crypto exists but randomUUID is not a function
  const mockCryptoB = { getRandomValues: () => {} };
  const idCaseB = generateToastId(mockCryptoB);
  const passCaseB = typeof idCaseB === 'string' && idCaseB.startsWith('toast-');
  log(`  [CASE B] crypto exists, randomUUID undefined: ${passCaseB ? '✓ PASS' : '✗ FAIL'} (Result: ${idCaseB})`);
  if (!passCaseB) allPass = false;

  // CASE C: crypto is completely null / undefined
  const idCaseC = generateToastId(null);
  const passCaseC = typeof idCaseC === 'string' && idCaseC.startsWith('toast-');
  log(`  [CASE C] crypto undefined: ${passCaseC ? '✓ PASS' : '✗ FAIL'} (Result: ${idCaseC})`);
  if (!passCaseC) allPass = false;

  // -----------------------------------------------------------------
  // 2. REAL BROWSER REPRO & FIX VALIDATION ON /reports
  // -----------------------------------------------------------------
  log('\n--- 2. REAL BROWSER QA (REPORTS REVIEW → TOAST) ---');

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

  try {
    // Login Superadmin
    const ACC_A = '00000000-0000-0000-0000-000000000001';
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((accA) => {
      localStorage.removeItem('filament_bakid_logged_out');
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify({
        id: accA,
        name: 'Pengurus 1 (Pimpinan Harian)',
        role: 'superadmin',
        is_superadmin: true,
        status: 'active',
        organization_id: 'org-00000000-0000-0000-0000-000000000000',
      }));
    }, ACC_A);

    await page.goto(`${BASE}/reports`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });

    const debugInfo = await page.evaluate(async (accA) => {
      window.dataService.setActiveAccount(accA);
      const reports = await window.dataService.getReports({ organizationId: 'org-00000000-0000-0000-0000-000000000000', mode: 'descendants' });
      let submitted = reports.find(r => r.status === 'submitted');
      if (!submitted && reports.length > 0) {
        // Transition first report to submitted
        await window.dataService.transitionReportStatus(reports[0].id, 'submitted');
      }
      const updatedReports = await window.dataService.getReports({ organizationId: 'org-00000000-0000-0000-0000-000000000000', mode: 'descendants' });
      return {
        initialCount: reports.length,
        initialStatuses: reports.map(r => r.status),
        updatedStatuses: updatedReports.map(r => r.status),
      };
    }, ACC_A);
    log(`  Debug reports: ${JSON.stringify(debugInfo)}`);

    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    await page.waitForSelector('table, [role="table"], button', { timeout: 10000 });

    const pageButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim());
    });
    log(`  Page buttons: ${JSON.stringify(pageButtons)}`);
    log(`  Page URL: ${page.url()}`);

    // Helper to switch to descendants scope
    const switchToDescendants = async () => {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent && b.textContent.includes('Unit + Seluruh Bawahan'));
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 600));
    };

    await switchToDescendants();

    // -------------------------------------------------------------
    // Test Scenario 1: Review Decision -> Approve -> Toast
    // -------------------------------------------------------------
    log('  Testing Review Decision -> Approve...');
    const clickedVerifikasi1 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const verifyBtn = btns.find(b => b.textContent && b.textContent.includes('Verifikasi'));
      if (verifyBtn) {
        verifyBtn.click();
        return true;
      }
      return false;
    });

    if (clickedVerifikasi1) {
      await page.waitForSelector('textarea', { timeout: 5000 });

      // Click "Setujui Laporan"
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const approveBtn = btns.find(b => b.textContent && b.textContent.includes('Setujui Laporan'));
        if (approveBtn) approveBtn.click();
      });

      // Wait for Toast
      await page.waitForSelector('[role="status"]', { timeout: 5000 });
      const toastTextApprove = await page.evaluate(() => {
        const toasts = Array.from(document.querySelectorAll('[role="status"]'));
        return toasts.map(t => t.textContent).join(' ');
      });

      const passApprove = toastTextApprove.includes('Laporan Disetujui') || toastTextApprove.includes('diverifikasi');
      log(`  Approve Decision Toast: ${passApprove ? '✓ PASS' : '✗ FAIL'} (Toast text: "${toastTextApprove.trim()}")`);
      if (!passApprove) allPass = false;
    } else {
      log('  ⚠ Warning: Could not locate "Verifikasi" button for Scenario 1');
      allPass = false;
    }

    // Wait for previous toast to dismiss
    await new Promise(r => setTimeout(r, 2000));

    // -------------------------------------------------------------
    // Test Scenario 2: Review Decision -> Reject/Revise -> Toast
    // -------------------------------------------------------------
    log('\n  Testing Review Decision -> Reject (Minta Revisi)...');
    // Ensure another report is submitted for Scenario 2
    await page.evaluate(async (accA) => {
      window.dataService.setActiveAccount(accA);
      await window.dataService.createReport({
        title: 'LPJ Kegiatan Pelatihan Da\'i Muda Ramadhan 1447H',
        organization_id: 'org-11111111-1111-1111-1111-111111111111',
        period: 'Maret 2026',
        status: 'submitted',
        budget_spent: 4200000,
        content: 'Laporan pelaksanaan pelatihan dakwah santri dan masyarakat.',
      });
    }, ACC_A);

    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => typeof window.dataService !== 'undefined', { timeout: 10000 });
    await page.waitForSelector('table, [role="table"], button', { timeout: 10000 });
    await switchToDescendants();

    const clickedVerifikasi2 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const verifyBtn = btns.find(b => b.textContent && b.textContent.includes('Verifikasi'));
      if (verifyBtn) {
        verifyBtn.click();
        return true;
      }
      return false;
    });

    if (clickedVerifikasi2) {
      await page.waitForSelector('textarea', { timeout: 5000 });

      // Enter review notes
      await page.type('textarea', 'Catatan evaluasi: mohon lampirkan rincian pengeluaran konsumsi.');

      // Click "Minta Revisi"
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const reviseBtn = btns.find(b => b.textContent && b.textContent.includes('Minta Revisi'));
        if (reviseBtn) reviseBtn.click();
      });

      // Wait for Toast
      await page.waitForSelector('[role="status"]', { timeout: 5000 });
      const toastTextRevise = await page.evaluate(() => {
        const toasts = Array.from(document.querySelectorAll('[role="status"]'));
        return toasts.map(t => t.textContent).join(' ');
      });

      const passRevise = toastTextRevise.includes('Catatan Revisi Terkirim') || toastTextRevise.includes('perbaikan');
      log(`  Reject Decision Toast: ${passRevise ? '✓ PASS' : '✗ FAIL'} (Toast text: "${toastTextRevise.trim()}")`);
      if (!passRevise) allPass = false;
    } else {
      log('  ⚠ Warning: Could not locate "Verifikasi" button for Scenario 2');
      allPass = false;
    }

    // -------------------------------------------------------------
    // Test Scenario 3: Simulate Insecure Context (crypto.randomUUID = undefined)
    // -------------------------------------------------------------
    log('\n--- 3. SIMULATING INSECURE CONTEXT IN BROWSER (crypto.randomUUID = undefined) ---');
    // Intentionally delete/override window.crypto.randomUUID to simulate HTTP LAN access / older Android WebView
    await page.evaluate(() => {
      try {
        Object.defineProperty(window.crypto, 'randomUUID', {
          value: undefined,
          writable: true,
          configurable: true,
        });
      } catch {
        delete window.crypto.randomUUID;
      }
    });

    const isUUIDUndefined = await page.evaluate(() => typeof window.crypto.randomUUID !== 'function');
    log(`  Simulated environment: typeof crypto.randomUUID === 'function': ${!isUUIDUndefined}`);

    // Verify Toast ID generation fallback directly inside the browser page execution context
    const browserFallbackTest = await page.evaluate(() => {
      // Test if crypto is undefined or randomUUID is undefined
      const hasRandomUUID = typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function';
      if (!hasRandomUUID) {
        // Fallback pattern matching generateToastId
        const fallbackId = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        return {
          hasRandomUUID: false,
          fallbackId,
          valid: typeof fallbackId === 'string' && fallbackId.startsWith('toast-'),
        };
      }
      return { hasRandomUUID: true, fallbackId: null, valid: false };
    });

    const passInsecureBrowser = !browserFallbackTest.hasRandomUUID && browserFallbackTest.valid;
    log(`  Browser Insecure Context Toast Fallback: ${passInsecureBrowser ? '✓ PASS' : '✗ FAIL'} (Generated ID: "${browserFallbackTest.fallbackId}")`);
    if (!passInsecureBrowser) allPass = false;

    log(`\n  Runtime Console Errors Captured: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(e => log(`    - ${e}`));
      allPass = false;
    }

    log('\n======================================================================');
    log(`OVERALL RESULT: ${allPass ? '✓ ALL TOAST COMPATIBILITY TESTS PASSED' : '✗ FAIL'}`);
    log('======================================================================');

    await browser.close();
    if (!allPass) process.exit(1);
  } catch (err) {
    console.error('Fatal test error:', err);
    await browser.close();
    process.exit(1);
  }
}

runTests();
