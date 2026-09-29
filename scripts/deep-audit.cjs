const puppeteer = require('puppeteer-core');

const BRAVE_PATH = 'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';

async function runDeepAudit() {
  console.log('=== RUNNING ULTRA-DEEP COLOR, CONTRAST & SURFACE AUDIT IN BRAVE ===');
  console.log('Target Browser:', BRAVE_PATH);

  const browser = await puppeteer.launch({
    executablePath: BRAVE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleLogs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.toString()}`));

  const auditReport = {
    light: [],
    dark: [],
    issues: [],
    surfaceHierarchyChecks: []
  };

  try {
    // Inject color measurement helper
    await page.evaluateOnNewDocument(() => {
      window.__measureContrast = (fgEl, bgEl) => {
        if (!fgEl) return null;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const parseColor = (colStr) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = colStr;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
          return { r, g, b, a: a / 255 };
        };

        const fgStyle = window.getComputedStyle(fgEl);

        // Multi-layer CSS alpha compositing to resolve exact screen pixels
        const bgChain = [];
        let curr = bgEl || fgEl;
        while (curr && curr !== document) {
          const s = window.getComputedStyle(curr);
          const bg = s.backgroundColor;
          if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
            bgChain.unshift(bg);
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, 1, 1);
            if (ctx.getImageData(0, 0, 1, 1).data[3] === 255) {
              break;
            }
          }
          curr = curr.parentElement;
        }

        // Composite layers from opaque ancestor to element
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#09090b' : '#ffffff';
        ctx.fillRect(0, 0, 1, 1);
        for (const layer of bgChain) {
          ctx.fillStyle = layer;
          ctx.fillRect(0, 0, 1, 1);
        }
        const [br, bgg, bb] = ctx.getImageData(0, 0, 1, 1).data;
        const bgRgb = { r: br, g: bgg, b: bb, a: 1 };
        const fgRgb = parseColor(fgStyle.color);
        const effectiveBg = `rgb(${br}, ${bgg}, ${bb})`;

        const lum = (rgb) => {
          const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(v => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        const l1 = lum(fgRgb);
        const l2 = lum(bgRgb);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        return {
          fgText: fgStyle.color,
          fgHex: '#' + ((1 << 24) + (fgRgb.r << 16) + (fgRgb.g << 8) + fgRgb.b).toString(16).slice(1).toUpperCase(),
          bgText: effectiveBg,
          bgHex: '#' + ((1 << 24) + (bgRgb.r << 16) + (bgRgb.g << 8) + bgRgb.b).toString(16).slice(1).toUpperCase(),
          bgLum: parseFloat(l2.toFixed(4)),
          ratio: parseFloat(ratio.toFixed(2)),
          fontSize: fgStyle.fontSize,
          fontWeight: fgStyle.fontWeight
        };
      };

      window.__getLuminance = (el) => {
        if (!el) return null;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const bg = window.getComputedStyle(el).backgroundColor;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const [rs, gs, bs] = [r, g, b].map(v => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return {
          bg,
          hex: '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase(),
          lum: parseFloat((0.2126 * rs + 0.7152 * gs + 0.0722 * bs).toFixed(4))
        };
      };
    });

    // 1. Audit Login Page
    console.log('\n--- 1. Auditing /login ---');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

    for (const mode of ['light', 'dark']) {
      await page.evaluate((m) => {
        if (m === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, mode);
      await new Promise(r => setTimeout(r, 200));

      const loginResults = await page.evaluate((m) => {
        const h1 = document.querySelector('h1');
        const subtitle = document.querySelector('div.flex-col.items-center p');
        const card = document.querySelector('.rounded-xl');
        const emailLabel = document.querySelector('label[for="email"]');
        const _emailInput = document.querySelector('input#email');
        const submitBtn = document.querySelector('button[type="submit"]');
        const logoSvg = document.querySelector('svg');

        // Check if demo credentials exist (should be removed!)
        const demoCreds = Array.from(document.querySelectorAll('*')).some(el => el.textContent && el.textContent.includes('Demo credentials'));

        return {
          mode: m,
          page: '/login',
          demoCredentialsFound: demoCreds,
          logoVisible: logoSvg !== null,
          h1: window.__measureContrast(h1),
          subtitle: window.__measureContrast(subtitle),
          emailLabel: window.__measureContrast(emailLabel),
          submitBtn: window.__measureContrast(submitBtn, submitBtn),
          cardBg: card ? window.__getLuminance(card) : null,
          pageBg: window.__getLuminance(document.body)
        };
      }, mode);

      auditReport[mode].push(loginResults);
    }

    // Submit login to enter dashboard
    await page.click('button[type="submit"]');
    await page.waitForSelector('main', { timeout: 10000 });
    console.log('Login completed, session initialized.');

    // Helper to audit any app route
    async function auditRoute(routeName, routePath) {
      console.log(`\n--- Auditing ${routeName} (${routePath}) ---`);
      if (page.url() !== `http://localhost:5173${routePath}`) {
        await page.goto(`http://localhost:5173${routePath}`, { waitUntil: 'networkidle0' });
      }

      for (const mode of ['light', 'dark']) {
        await page.evaluate((m) => {
          if (m === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }, mode);
        await new Promise(r => setTimeout(r, 300));

        const pageData = await page.evaluate((m, rName, rPath) => {
          const h1 = document.querySelector('h1');
          const pageDesc = document.querySelector('main p.text-xs, main p.text-sm');
          const sidebarBrand = document.querySelector('aside span.font-bold');
          const sidebarGroupLabel = document.querySelector('aside nav p');
          const sidebarItem = document.querySelector('aside a');
          const card = document.querySelector('.rounded-xl, .fi-card, .border');
          const cardBg = card ? window.__getLuminance(card) : null;
          const tableThead = document.querySelector('thead tr');
          const tableTheadBg = tableThead ? window.__getLuminance(tableThead) : null;
          const bodyBg = window.__getLuminance(document.body);

          const tableTh = document.querySelector('thead tr th');
          const tableTd = document.querySelector('tbody tr td');
          const badge = document.querySelector('tbody tr td span.inline-flex, .fi-badge');
          const _input = document.querySelector('input:not([type="checkbox"]), select, textarea');
          const inputLabel = document.querySelector('label');

          return {
            mode: m,
            route: rName,
            path: rPath,
            h1: window.__measureContrast(h1),
            pageDesc: window.__measureContrast(pageDesc),
            sidebarBrand: window.__measureContrast(sidebarBrand),
            sidebarGroupLabel: window.__measureContrast(sidebarGroupLabel),
            sidebarItem: window.__measureContrast(sidebarItem),
            tableHeader: window.__measureContrast(tableTh),
            tableData: window.__measureContrast(tableTd),
            badge: badge && badge.textContent.trim() ? window.__measureContrast(badge, badge) : null,
            inputLabel: window.__measureContrast(inputLabel),
            bodyBg,
            cardBg,
            tableTheadBg
          };
        }, mode, routeName, routePath);

        auditReport[mode].push(pageData);

        // Surface hierarchy check in dark mode:
        // Table thead should NOT be darker than card (i.e. tableTheadBg.lum >= cardBg.lum)
        if (mode === 'dark' && pageData.cardBg && pageData.tableTheadBg) {
          const isHeaderElevatedOrEqual = pageData.tableTheadBg.lum >= pageData.cardBg.lum;
          auditReport.surfaceHierarchyChecks.push({
            route: routeName,
            headerHex: pageData.tableTheadBg.hex,
            cardHex: pageData.cardBg.hex,
            valid: isHeaderElevatedOrEqual
          });
        }
      }
    }

    // Audit key pages
    await auditRoute('Dashboard', '/');
    await auditRoute('Products List', '/products');
    await auditRoute('Product Create Form', '/products/create');
    await auditRoute('Orders List', '/orders');
    await auditRoute('Customers List', '/customers');
    await auditRoute('Categories List', '/categories');

    // 3. Test Topbar Interactive Menus (Notifications & User Menu)
    console.log('\n--- Auditing Interactive Topbar Menus ---');
    for (const mode of ['light', 'dark']) {
      await page.evaluate((m) => {
        if (m === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, mode);

      // Open Notifications
      const notifBtn = await page.$('button[title*="Notification"], button[aria-label*="Notification"]');
      if (notifBtn) {
        await notifBtn.click();
        await new Promise(r => setTimeout(r, 200));

        const notifData = await page.evaluate((m) => {
          const popoverHeader = document.querySelector('.animate-scale-in div');
          const popoverHeaderText = popoverHeader ? popoverHeader.querySelector('span') : null;
          return {
            mode: m,
            component: 'Topbar Notification Popover',
            headerBg: window.__getLuminance(popoverHeader),
            headerTextContrast: window.__measureContrast(popoverHeaderText)
          };
        }, mode);
        auditReport[mode].push(notifData);
        // Close popover
        await page.click('body');
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // 4. Contrast Evaluation
    for (const mode of ['light', 'dark']) {
      for (const entry of auditReport[mode]) {
        for (const [elemName, m] of Object.entries(entry)) {
          if (m && typeof m === 'object' && m.ratio !== undefined) {
            const isLarge = parseInt(m.fontSize || '14') >= 18 || (parseInt(m.fontSize || '14') >= 14 && parseInt(m.fontWeight || '400') >= 700);
            const minRequired = isLarge ? 3.0 : 4.5;
            if (m.ratio < minRequired) {
              auditReport.issues.push({
                mode,
                route: entry.route || entry.page || entry.component,
                element: elemName,
                fgHex: m.fgHex,
                bgHex: m.bgHex,
                ratio: m.ratio,
                minRequired,
                fontSize: m.fontSize,
                fontWeight: m.fontWeight
              });
            }
          }
        }
      }
    }

    console.log('\n======================================================');
    console.log('             COMPREHENSIVE AUDIT REPORT               ');
    console.log('======================================================');
    console.log('1. Demo Credentials in Login Page:');
    const loginLight = auditReport.light.find(r => r.page === '/login');
    console.log('   - Demo credentials found:', loginLight?.demoCredentialsFound ? 'FAILED (Still Present!)' : 'PASSED (Cleanly Removed)');

    console.log('\n2. Logo SVG Visibility:');
    console.log('   - Login Logo present:', loginLight?.logoVisible ? 'PASSED' : 'FAILED');

    console.log('\n3. Console Errors / Warnings:');
    console.log('   - Total page console issues:', consoleLogs.length === 0 ? '0 (Clean)' : consoleLogs);

    console.log('\n4. Dark Mode Surface Hierarchy (Table Thead vs Card Surface):');
    if (auditReport.surfaceHierarchyChecks.length === 0) {
      console.log('   - No table headers checked.');
    } else {
      auditReport.surfaceHierarchyChecks.forEach(check => {
        console.log(`   - [${check.route}] Header (${check.headerHex}) >= Card (${check.cardHex}) -> ${check.valid ? 'PASSED (Correctly elevated sub-surface)' : 'FAILED (Inverted/sunken background)'}`);
      });
    }

    console.log('\n5. Contrast Issues (WCAG AA Strict 4.5:1 / 3.0:1):');
    console.log('   - Total contrast issues detected:', auditReport.issues.length);
    if (auditReport.issues.length > 0) {
      auditReport.issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. [${issue.mode.toUpperCase()}] ${issue.route} -> ${issue.element}`);
        console.log(`      Color: ${issue.fgHex} on ${issue.bgHex} | Ratio: ${issue.ratio}:1 (Min: ${issue.minRequired}:1)`);
      });
    } else {
      console.log('   >>> 100% WCAG AA COMPLIANT ACROSS ALL AUDITED ROUTES & MODES! <<<');
    }

    console.log('\n======================================================\n');

  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    await browser.close();
  }
}

runDeepAudit();
