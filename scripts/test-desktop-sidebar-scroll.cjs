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

const DESKTOP_VIEWPORTS = [
  { width: 1024, height: 768, name: '1024x768' },
  { width: 1280, height: 800, name: '1280x800' },
  { width: 1440, height: 900, name: '1440x900' },
];

const MOBILE_VIEWPORTS = [
  { width: 320, height: 568, name: '320x568' },
  { width: 360, height: 640, name: '360x640' },
  { width: 375, height: 667, name: '375x667' },
  { width: 390, height: 844, name: '390x844' },
  { width: 414, height: 896, name: '414x896' },
];

const ROUTES = ['/', '/programs', '/agendas', '/finance', '/reports', '/organizations', '/tasks'];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: getBrowserPath(),
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  // Set auth
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const adminUser = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Pengurus 1 (Pimpinan Harian)',
      email: 'superadmin@pesantren.id',
      role: 'superadmin',
      is_superadmin: true,
      status: 'active'
    };
    localStorage.setItem('filament_bakid_auth_user', JSON.stringify(adminUser));
  });

  console.log('\n===============================================================');
  console.log('TEST 1: DESKTOP SIDEBAR SCROLL FIX (1024, 1280, 1440)');
  console.log('===============================================================\n');

  for (const vp of DESKTOP_VIEWPORTS) {
    await page.setViewport(vp);
    console.log(`--- Testing Viewport: ${vp.name} ---`);

    for (const route of ROUTES) {
      await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle0' }).catch(() => {});
      await new Promise(r => setTimeout(r, 400));

      const scrollTest = await page.evaluate(async () => {
        const sidebar = document.querySelector('aside.hidden.lg\\:block');
        const mainCol = document.querySelector('.lg\\:overflow-y-auto') || document.querySelector('main');
        if (!sidebar) return { hasSidebar: false };

        const sidebarRectBefore = sidebar.getBoundingClientRect();
        const topBefore = sidebarRectBefore.top;
        const leftBefore = sidebarRectBefore.left;

        // Add dummy height to main content if content is short to test scrolling
        const main = document.querySelector('main');
        const dummyDiv = document.createElement('div');
        dummyDiv.style.height = '2000px';
        dummyDiv.id = 'test-dummy-scroll';
        main.appendChild(dummyDiv);

        // Scroll the main column
        const scrollContainer = document.querySelector('.lg\\:overflow-y-auto') || window;
        if (scrollContainer === window) {
          window.scrollTo(0, 800);
        } else {
          scrollContainer.scrollTop = 800;
        }

        await new Promise(r => setTimeout(r, 100));

        const sidebarRectAfter = sidebar.getBoundingClientRect();
        const topAfter = sidebarRectAfter.top;
        const leftAfter = sidebarRectAfter.left;
        const scrollDistance = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;

        // Cleanup dummy
        dummyDiv.remove();
        if (scrollContainer !== window) scrollContainer.scrollTop = 0;

        return {
          hasSidebar: true,
          topBefore,
          topAfter,
          leftBefore,
          leftAfter,
          isStationary: topBefore === topAfter && leftBefore === leftAfter,
          scrollDistance
        };
      });

      const pass = scrollTest.hasSidebar && scrollTest.isStationary && scrollTest.scrollDistance > 0;
      console.log(`  [${route}] Stationary: ${scrollTest.isStationary ? '✓ PASS' : '✗ FAIL'} (Top: ${scrollTest.topBefore} -> ${scrollTest.topAfter}, Scrolled: ${scrollTest.scrollDistance}px)`);
      if (!pass) {
        console.error('FAILED ON ROUTE:', route, scrollTest);
        process.exit(1);
      }
    }
  }

  console.log('\n===============================================================');
  console.log('TEST 2: MOBILE REGRESSION SMOKE TEST (320, 360, 375, 390, 414)');
  console.log('===============================================================\n');

  for (const vp of MOBILE_VIEWPORTS) {
    await page.setViewport(vp);
    await page.goto('http://localhost:5173/programs', { waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise(r => setTimeout(r, 400));

    const mobileCheck = await page.evaluate(() => {
      const desktopSidebar = document.querySelector('aside.hidden.lg\\:block');
      const isDesktopSidebarVisible = desktopSidebar ? window.getComputedStyle(desktopSidebar).display !== 'none' : false;
      const bottomNav = document.querySelector('nav.fixed, nav.bottom-0');
      const header = document.querySelector('header');
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;

      return {
        isDesktopSidebarHidden: !isDesktopSidebarVisible,
        hasBottomNav: !!bottomNav,
        hasHeader: !!header,
        noHorizontalOverflow: overflow <= 1
      };
    });

    const passMobile = mobileCheck.isDesktopSidebarHidden && mobileCheck.hasBottomNav && mobileCheck.noHorizontalOverflow;
    console.log(`  [${vp.name}] Mobile Safe: ${passMobile ? '✓ PASS' : '✗ FAIL'} (Desktop Sidebar Hidden: ${mobileCheck.isDesktopSidebarHidden}, Bottom Nav: ${mobileCheck.hasBottomNav}, Overflow: ${mobileCheck.noHorizontalOverflow})`);
    if (!passMobile) {
      console.error('FAILED ON MOBILE VIEWPORT:', vp.name, mobileCheck);
      process.exit(1);
    }
  }

  console.log('\nALL DESKTOP & MOBILE SCROLL TESTS PASSED SUCCESSFULLY!\n');
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
