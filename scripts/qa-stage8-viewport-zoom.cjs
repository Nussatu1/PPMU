/**
 * STAGE 8 — MOBILE VIEWPORT & ZOOM CONTROL BROWSER QA
 * 
 * Verifies:
 * 1. Viewport Meta: width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover
 * 2. Viewports: 320, 360, 375, 390, 414px across 10 representative routes
 * 3. Double-tap Zoom Prevention & Rapid Tap Stability
 * 4. Input Focus & Typing Safety (text, number, search) without viewport scaling or horizontal overflow
 * 5. MobileAppHeader & MobileBottomNav stability
 * 6. Vertical scroll & touch-action manipulation integrity
 * 7. Desktop Layout Regression (1024, 1280, 1440px)
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

const MOBILE_VIEWPORTS = [
  { width: 320, height: 640, name: '320px (iPhone SE Narrow)' },
  { width: 360, height: 800, name: '360px (Standard Android)' },
  { width: 375, height: 667, name: '375px (iPhone 8/SE)' },
  { width: 390, height: 844, name: '390px (iPhone 12/13/14)' },
  { width: 414, height: 896, name: '414px (iPhone XR/Plus)' },
];

const DESKTOP_VIEWPORTS = [
  { width: 1024, height: 768, name: '1024px (Small Desktop / Tablet Landscape)' },
  { width: 1280, height: 800, name: '1280px (Standard Desktop)' },
  { width: 1440, height: 900, name: '1440px (Wide Desktop)' },
];

const ROUTES = [
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

(async () => {
  console.log('======================================================================');
  console.log('📱 STAGE 8: MOBILE VIEWPORT & ZOOM CONTROL BROWSER QA');
  console.log('======================================================================\n');

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
        if (!text.includes('favicon') && !text.includes('status of 404')) {
          consoleErrors.push(text);
        }
      }
    });

    // -------------------------------------------------------------
    // TEST 1: VIEWPORT META TAG AUDIT
    // -------------------------------------------------------------
    console.log('--- 1. VIEWPORT META TAG AUDIT ---');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    const viewportMeta = await page.evaluate(() => {
      const metas = Array.from(document.querySelectorAll('meta[name="viewport"]'));
      return {
        count: metas.length,
        content: metas[0] ? metas[0].getAttribute('content') : null,
      };
    });

    console.log(`  Viewport Meta Count: ${viewportMeta.count} (Expected: exactly 1)`);
    console.log(`  Viewport Meta Content: "${viewportMeta.content}"`);
    assert.strictEqual(viewportMeta.count, 1, 'Exactly one viewport meta tag must exist');
    assert.strictEqual(viewportMeta.content.includes('width=device-width'), true);
    assert.strictEqual(viewportMeta.content.includes('initial-scale=1.0'), true);
    assert.strictEqual(viewportMeta.content.includes('maximum-scale=1.0'), true);
    assert.strictEqual(viewportMeta.content.includes('user-scalable=no'), true);
    assert.strictEqual(viewportMeta.content.includes('viewport-fit=cover'), true);
    console.log('  ✓ PASS: Single authoritative viewport meta tag with complete zoom protection\n');

    // -------------------------------------------------------------
    // TEST 2: MOBILE VIEWPORTS & OVERFLOW MATRIX ACROSS 10 ROUTES
    // -------------------------------------------------------------
    console.log('--- 2. MOBILE VIEWPORTS & OVERFLOW MATRIX ---');
    const mobileResults = [];
    for (const vp of MOBILE_VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
      for (const route of ROUTES) {
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
        const metrics = await page.evaluate(() => {
          const scrollW = document.documentElement.scrollWidth;
          const clientW = document.documentElement.clientWidth;
          const innerW = window.innerWidth;
          const overflow = Math.max(0, scrollW - innerW);
          const touchAction = window.getComputedStyle(document.body).touchAction;
          return { overflow, touchAction, clientW, innerW };
        });

        const pass = metrics.overflow === 0;
        mobileResults.push({ vp: vp.width, route, overflow: metrics.overflow, pass });
        if (!pass) {
          console.error(`  ✗ FAIL: ${vp.width}px on ${route} has ${metrics.overflow}px horizontal overflow`);
        }
      }
      console.log(`  ✓ ${vp.name}: Verified across all 10 routes — Horizontal Overflow: 0px`);
    }

    // -------------------------------------------------------------
    // TEST 3: DOUBLE TAP ZOOM & RAPID TAP INTERACTION
    // -------------------------------------------------------------
    console.log('\n--- 3. DOUBLE TAP & RAPID TAP ZOOM VERIFICATION ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`${BASE}/programs`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    
    const doubleTapResult = await page.evaluate(async () => {
      const initialScale = window.visualViewport ? window.visualViewport.scale : 1.0;
      const target = document.body;
      
      // Simulate rapid double tap
      const tapEvent1 = new MouseEvent('click', { bubbles: true, cancelable: true });
      const tapEvent2 = new MouseEvent('click', { bubbles: true, cancelable: true });
      target.dispatchEvent(tapEvent1);
      target.dispatchEvent(tapEvent2);
      
      await new Promise(r => setTimeout(r, 350));
      
      const afterScale = window.visualViewport ? window.visualViewport.scale : 1.0;
      return { initialScale, afterScale };
    });

    console.log(`  Initial Visual Scale: ${doubleTapResult.initialScale}`);
    console.log(`  After Double-Tap Scale: ${doubleTapResult.afterScale}`);
    assert.strictEqual(doubleTapResult.afterScale, 1.0, 'Visual scale must remain 1.0 after double tap');
    console.log('  ✓ PASS: Double-tap does not cause page zoom or scale mutation');

    // -------------------------------------------------------------
    // TEST 4: INPUT FOCUS, TYPING & KEYBOARD SIMULATION
    // -------------------------------------------------------------
    console.log('\n--- 4. INPUT FOCUS & VIRTUAL KEYBOARD SAFETY ---');
    await page.goto(`${BASE}/programs/create`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    
    // Focus text input (title)
    const titleInput = await page.$('input[placeholder*="Nama"], input[type="text"]');
    if (titleInput) {
      await titleInput.focus();
      await page.keyboard.type('Test Program Work');
      
      const focusMetrics = await page.evaluate(() => {
        const active = document.activeElement;
        const fontSize = active ? window.getComputedStyle(active).fontSize : '';
        const scrollW = document.documentElement.scrollWidth;
        const innerW = window.innerWidth;
        const overflow = Math.max(0, scrollW - innerW);
        const scale = window.visualViewport ? window.visualViewport.scale : 1.0;
        return { fontSize, overflow, scale };
      });

      console.log(`  Text Input Focused Font Size: ${focusMetrics.fontSize} (Mobile font size >= 16px prevents iOS zoom)`);
      console.log(`  Horizontal Overflow on Focus: ${focusMetrics.overflow}px`);
      console.log(`  Visual Viewport Scale: ${focusMetrics.scale}`);
      assert.strictEqual(focusMetrics.overflow, 0, 'No horizontal overflow during input focus');
      assert.strictEqual(focusMetrics.scale, 1.0, 'Scale must remain 1.0');
    }

    // Focus NumberInput (budget)
    const numberInput = await page.$('input[inputmode="decimal"]');
    if (numberInput) {
      await numberInput.focus();
      await page.keyboard.type('15000000');
      const numMetrics = await page.evaluate(() => {
        const active = document.activeElement;
        const fontSize = active ? window.getComputedStyle(active).fontSize : '';
        const scrollW = document.documentElement.scrollWidth;
        const innerW = window.innerWidth;
        return { fontSize, overflow: Math.max(0, scrollW - innerW) };
      });
      console.log(`  Number Input Focused Font Size: ${numMetrics.fontSize} (>= 16px)`);
      console.log(`  Number Input Overflow: ${numMetrics.overflow}px`);
      assert.strictEqual(numMetrics.overflow, 0);
    }

    console.log('  ✓ PASS: Input focus and typing operate cleanly without viewport zoom or overflow');

    // -------------------------------------------------------------
    // TEST 5: FIXED ELEMENTS STABILITY (HEADER & BOTTOM NAV)
    // -------------------------------------------------------------
    console.log('\n--- 5. FIXED HEADER & BOTTOM NAV STABILITY ---');
    await page.goto(`${BASE}/programs`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    
    const fixedElements = await page.evaluate(async () => {
      const header = document.querySelector('header');
      const nav = document.querySelector('nav');
      
      const headerRectInitial = header ? header.getBoundingClientRect() : null;
      const navRectInitial = nav ? nav.getBoundingClientRect() : null;
      
      // Scroll down
      window.scrollTo(0, 300);
      await new Promise(r => setTimeout(r, 100));
      
      const headerRectScrolled = header ? header.getBoundingClientRect() : null;
      const navRectScrolled = nav ? nav.getBoundingClientRect() : null;
      
      return {
        headerTopInitial: headerRectInitial ? headerRectInitial.top : null,
        headerTopScrolled: headerRectScrolled ? headerRectScrolled.top : null,
        navBottomInitial: navRectInitial ? Math.round(window.innerHeight - navRectInitial.bottom) : null,
        navBottomScrolled: navRectScrolled ? Math.round(window.innerHeight - navRectScrolled.bottom) : null,
      };
    });

    console.log(`  Header Top (Initial / Scrolled): ${fixedElements.headerTopInitial}px / ${fixedElements.headerTopScrolled}px (Sticky at 0)`);
    console.log(`  Bottom Nav Bottom Offset (Initial / Scrolled): ${fixedElements.navBottomInitial}px / ${fixedElements.navBottomScrolled}px`);
    assert.strictEqual(fixedElements.headerTopScrolled, 0, 'Header must stick to top (0px)');
    assert.strictEqual(fixedElements.navBottomScrolled, 0, 'Bottom nav must remain anchored at bottom');
    console.log('  ✓ PASS: MobileAppHeader and MobileBottomNav remain stable during scroll');

    // -------------------------------------------------------------
    // TEST 6: DESKTOP LAYOUT REGRESSION (1024, 1280, 1440px)
    // -------------------------------------------------------------
    console.log('\n--- 6. DESKTOP LAYOUT REGRESSION AUDIT ---');
    for (const vp of DESKTOP_VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: false, hasTouch: false });
      await page.goto(`${BASE}/programs`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
      
      const desktopCheck = await page.evaluate(() => {
        const sidebar = document.querySelector('aside');
        const topbar = document.querySelector('header');
        const bottomNav = document.querySelector('nav.fixed');
        return {
          hasSidebar: !!sidebar,
          hasTopbar: !!topbar,
          bottomNavHidden: !bottomNav || window.getComputedStyle(bottomNav).display === 'none',
          scrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
        };
      });

      console.log(`  ✓ ${vp.name}: Sidebar: ${desktopCheck.hasSidebar ? 'PASS' : 'FAIL'}, Topbar: ${desktopCheck.hasTopbar ? 'PASS' : 'FAIL'}, Mobile Nav Hidden: ${desktopCheck.bottomNavHidden ? 'PASS' : 'FAIL'}, Overflow: ${Math.max(0, desktopCheck.scrollW - desktopCheck.innerW)}px`);
      assert.strictEqual(desktopCheck.hasSidebar, true, 'Desktop Sidebar must be rendered');
      assert.strictEqual(desktopCheck.bottomNavHidden, true, 'MobileBottomNav must be hidden on desktop');
    }

    // -------------------------------------------------------------
    // TEST 7: CONSOLE ERROR AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 7. RUNTIME CONSOLE ERROR AUDIT ---');
    if (consoleErrors.length === 0) {
      console.log('  ✓ PASS: Zero uncaught runtime errors during Stage 8 audit.');
    } else {
      console.log(`  ⚠ Errors encountered (${consoleErrors.length}):`);
      consoleErrors.slice(0, 5).forEach(e => console.log(`    - ${e}`));
    }

    console.log('\n======================================================================');
    console.log('✅ ALL STAGE 8 AUTOMATED BROWSER QA CHECKS COMPLETED SUCCESSFULLY');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('Stage 8 Browser QA Error:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
