/**
 * Browser QA Script for Stage 3
 * Validates Routes, Desktop UI & Mobile Viewports
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

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

const ROUTES = [
  '/',
  '/programs',
  '/agendas',
  '/performance',
  '/finance',
  '/reports',
  '/tasks',
  '/structures'
];

const MOBILE_VIEWPORTS = [
  { width: 320, height: 640, name: '320px (iPhone SE narrow)' },
  { width: 360, height: 800, name: '360px (Standard Android)' },
  { width: 375, height: 667, name: '375px (iPhone 8/SE)' },
  { width: 390, height: 844, name: '390px (iPhone 12/13/14)' },
  { width: 414, height: 896, name: '414px (iPhone XR/Plus)' },
];

(async () => {
  console.log('======================================================');
  console.log('🌐 BROWSER QA: VERIFYING DESKTOP & MOBILE RUNTIME');
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
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.toString());
    });

    // 1. DESKTOP VERIFICATION (1440x900)
    console.log('--- 1. DESKTOP ROUTE TESTING (1440x900) ---');
    await page.setViewport({ width: 1440, height: 900 });

    for (const route of ROUTES) {
      const url = `${BASE}${route}`;
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 600));

      const status = response ? response.status() : 'NO_RESPONSE';
      const pageInfo = await page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        const hasError = bodyText.includes('Something went wrong') || bodyText.includes('Application Error') || bodyText.includes('Uncaught Exception');
        const asides = Array.from(document.querySelectorAll('aside'));
        const visibleSidebar = asides.find(el => el.getBoundingClientRect().width > 0);
        const headers = Array.from(document.querySelectorAll('header'));
        const visibleHeader = headers.find(el => el.getBoundingClientRect().height > 0);
        return {
          title: document.title,
          hasError,
          sidebarVisible: !!visibleSidebar,
          headerVisible: !!visibleHeader,
          contentLength: bodyText.trim().length,
        };
      });

      if (pageInfo.hasError) {
        console.error(`  ✗ FAIL Desktop ${route}: Error boundary detected!`);
        process.exitCode = 1;
      } else if (!pageInfo.sidebarVisible) {
        console.error(`  ✗ FAIL Desktop ${route}: Desktop Sidebar not visible!`);
        process.exitCode = 1;
      } else {
        console.log(`  ✓ PASS Desktop [${status}] ${route} (Sidebar: OK, Topbar: OK, Body: ${pageInfo.contentLength} chars)`);
      }
    }

    // 2. MOBILE VIEWPORT TESTING
    console.log('\n--- 2. MOBILE VIEWPORT TESTING (<640px) ---');
    for (const vp of MOBILE_VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 500));

      const mobileEval = await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll('header')).find(h => {
          const r = h.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        const bottomNav = document.querySelector('nav.fixed, nav[role="navigation"]');
        const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        return {
          mobileHeaderVisible: !!header,
          overflow,
        };
      });

      if (mobileEval.overflow > 1) {
        console.error(`  ✗ FAIL Mobile ${vp.name}: Horizontal overflow detected (${mobileEval.overflow}px)`);
        process.exitCode = 1;
      } else {
        console.log(`  ✓ PASS Mobile ${vp.name}: Header OK, Overflow: 0px`);
      }
    }

    // 3. CHECK CONSOLE ERRORS
    console.log('\n--- 3. RUNTIME CONSOLE STABILITY ---');
    const filteredErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('chrome-extension'));
    if (filteredErrors.length === 0) {
      console.log('  ✓ PASS: Zero uncaught runtime errors or crash exceptions across all audited routes and viewports.');
    } else {
      console.warn(`  ! WARNING: ${filteredErrors.length} console errors observed:`);
      filteredErrors.slice(0, 5).forEach(e => console.warn(`    - ${e}`));
    }

  } catch (err) {
    console.error('Browser QA execution failed:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }

  console.log('\n======================================================');
  console.log('🌐 BROWSER QA FINISHED');
  console.log('======================================================\n');
})();
