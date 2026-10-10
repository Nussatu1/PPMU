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

const VIEWPORTS = [
  { name: 'Desktop 1024', width: 1024, height: 768, isMobile: false },
  { name: 'Desktop 1280', width: 1280, height: 800, isMobile: false },
  { name: 'Desktop 1440', width: 1440, height: 900, isMobile: false },
  { name: 'Mobile 320', width: 320, height: 568, isMobile: true },
  { name: 'Mobile 360', width: 360, height: 640, isMobile: true },
  { name: 'Mobile 375', width: 375, height: 667, isMobile: true },
  { name: 'Mobile 390', width: 390, height: 844, isMobile: true },
  { name: 'Mobile 414', width: 414, height: 896, isMobile: true },
];

async function runViewportQA() {
  console.log('======================================================================');
  console.log('STAGE 3 BROWSER QA: VIEWPORTS & RESPONSIVE AUDIT');
  console.log('======================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let allPassed = true;

  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
      });

      await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

      // Check overflow
      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        return {
          scrollWidth: docWidth,
          innerWidth: winWidth,
          hasOverflow: docWidth > winWidth,
        };
      });

      // Filter non-critical console errors (like favicon 404)
      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes('favicon') && !e.includes('ERR_CONNECTION_REFUSED')
      );

      const pass = !overflow.hasOverflow && criticalErrors.length === 0;
      if (!pass) allPassed = false;

      console.log(
        `[${pass ? 'PASS' : 'FAIL'}] ${vp.name.padEnd(14)} (${vp.width}x${vp.height}): ` +
        `scrollWidth=${overflow.scrollWidth}, innerWidth=${overflow.innerWidth}` +
        (criticalErrors.length > 0 ? `, errors=${criticalErrors.length}` : '')
      );

      await page.close();
    }
  } catch (err) {
    console.error('Browser QA Error:', err);
    allPassed = false;
  } finally {
    await browser.close();
  }

  console.log('\n======================================================================');
  console.log(`VIEWPORT QA SUMMARY: ${allPassed ? 'ALL VIEWPORTS PASS (NO OVERFLOW, NO ERRORS)' : 'FAILURES DETECTED'}`);
  console.log('======================================================================');

  if (!allPassed) process.exit(1);
}

runViewportQA();
