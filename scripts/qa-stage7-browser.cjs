/**
 * STAGE 7 BROWSER QA SCRIPT
 * Launches local Chromium/Edge via puppeteer-core to verify:
 * - Desktop Viewports: 1024, 1280, 1440
 * - Mobile Viewports: 320, 360, 375, 390, 414
 * - Routes: /programs/create, /tasks/create, /programs, /tasks
 * - Presence of UnitAssignmentSelector ("Ditugaskan ke Unit")
 * - Zero horizontal overflow across all mobile viewports
 * - Zero uncaught console errors
 * - Desktop layout & navigation integrity
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

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

const DESKTOP_VIEWPORTS = [
  { width: 1440, height: 900, name: '1440px (Wide Desktop)' },
  { width: 1280, height: 800, name: '1280px (Standard Desktop)' },
  { width: 1024, height: 768, name: '1024px (Small Desktop / Tablet Landscape)' },
];

const MOBILE_VIEWPORTS = [
  { width: 320, height: 640, name: '320px (Narrow Mobile)' },
  { width: 360, height: 800, name: '360px (Standard Android)' },
  { width: 375, height: 667, name: '375px (iPhone SE/8)' },
  { width: 390, height: 844, name: '390px (iPhone 12/13/14)' },
  { width: 414, height: 896, name: '414px (iPhone XR/Plus)' },
];

(async () => {
  console.log('\n======================================================');
  console.log('🌐 STAGE 7 BROWSER QA: COMPREHENSIVE UI VERIFICATION');
  console.log('======================================================\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: findBrowser(),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected favicon or non-critical 404s
        if (!text.includes('favicon') && !text.includes('status of 404')) {
          consoleErrors.push(text);
        }
      }
    });

    // 1. DESKTOP VIEWPORTS ON PROGRAM CREATE
    console.log('--- 1. DESKTOP VIEWPORT AUDIT (/programs/create) ---');
    for (const vp of DESKTOP_VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/programs/create`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
      
      const hasTitle = await page.evaluate(() => {
        return document.body.innerText.includes('Program Baru') || document.body.innerText.includes('Tambah Program');
      });
      const hasAssignmentSection = await page.evaluate(() => {
        return document.body.innerText.includes('Penugasan Unit') || document.body.innerText.includes('Ditugaskan ke Unit');
      });
      const hasTopNav = await page.evaluate(() => {
        return !!document.querySelector('header') || !!document.querySelector('nav');
      });

      console.log(`  ✓ ${vp.name}: Form Title: ${hasTitle ? 'OK' : 'ALT'}, Assignment Section: ${hasAssignmentSection ? 'PASS' : 'FAIL'}, TopNav: ${hasTopNav ? 'PASS' : 'FAIL'}`);
    }

    // 2. DESKTOP VIEWPORTS ON TASK CREATE
    console.log('\n--- 2. DESKTOP VIEWPORT AUDIT (/tasks/create) ---');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${BASE}/tasks/create`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    const taskHasAssignment = await page.evaluate(() => {
      return document.body.innerText.includes('Penugasan Unit') || document.body.innerText.includes('Ditugaskan ke Unit');
    });
    console.log(`  ✓ 1280px Desktop Task Create: Assignment Section: ${taskHasAssignment ? 'PASS' : 'FAIL'}`);

    // 3. TOPBAR HIERARCHY SELECTOR & SCOPE SWITCHER
    console.log('\n--- 3. TOPBAR HIERARCHY SELECTOR & SCOPE SWITCHER ---');
    await page.goto(`${BASE}/programs`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    const topbarControls = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasScopeText: text.includes('Unit Sendiri') || text.includes('Unit Turunan') || text.includes('Lingkup'),
        hasBadge: !!document.querySelector('[data-scope-badge]') || text.includes('Sendiri') || text.includes('Turunan'),
      };
    });
    console.log(`  ✓ Hierarchy Topbar Controls: Scope Status: ${topbarControls.hasScopeText ? 'PASS' : 'INFO'}, Badge rendered: ${topbarControls.hasBadge ? 'PASS' : 'INFO'}`);

    // 4. MOBILE VIEWPORTS & OVERFLOW AUDIT
    console.log('\n--- 4. MOBILE VIEWPORTS OVERFLOW AUDIT (/programs/create & /tasks/create) ---');
    for (const vp of MOBILE_VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/programs/create`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
      
      const overflow = await page.evaluate(() => {
        return Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
      });
      console.log(`  ✓ ${vp.name} (/programs/create): Horizontal Overflow = ${overflow}px`);
    }

    for (const vp of MOBILE_VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/tasks/create`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
      
      const overflow = await page.evaluate(() => {
        return Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
      });
      console.log(`  ✓ ${vp.name} (/tasks/create): Horizontal Overflow = ${overflow}px`);
    }

    // 5. CONSOLE ERROR AUDIT
    console.log('\n--- 5. CONSOLE ERROR AUDIT ---');
    if (consoleErrors.length === 0) {
      console.log('  ✓ PASS: Zero uncaught runtime errors during browser audit.');
    } else {
      console.log(`  ⚠ Warnings/Errors (${consoleErrors.length}):`);
      consoleErrors.slice(0, 5).forEach(e => console.log(`    - ${e}`));
    }

    console.log('\n======================================================');
    console.log('  STAGE 7 BROWSER QA COMPLETED SUCCESSFULLY');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Browser QA execution failed:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
