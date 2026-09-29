const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BROWSER_PATHS = [
  'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

function findBrowserPath() {
  for (const p of BROWSER_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No browser found');
}

async function runTest() {
  console.log('===========================================================');
  console.log(' RUNNING DEEP FEATURE & UI/UX AUDIT (FILAMENT STANDARDS)   ');
  console.log('===========================================================');

  const browser = await puppeteer.launch({
    executablePath: findBrowserPath(),
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error]: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => consoleErrors.push(`[Page Error]: ${err.toString()}`));

  const findings = [];

  // Helper to record finding
  function addFinding(type, route, detail) {
    findings.push({ type, route, detail });
    console.log(`[${type}] on ${route}: ${detail}`);
  }

  // 1. Visit Login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.click('button[type="submit"]');
  await page.waitForSelector('main', { timeout: 10000 });
  console.log('✓ Login successful');

  const routes = [
    '/',
    '/organizations',
    '/admins',
    '/roles',
    '/audit-logs',
    '/structures',
    '/programs',
    '/agendas',
    '/performance',
    '/finance',
    '/reports',
    '/tasks',
    '/users',
    '/posts'
  ];

  for (const route of routes) {
    console.log(`\nAuditing route: ${route}`);
    await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    // Check DOM for em dashes
    const pageEmDashes = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const emDashMatches = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.includes('—')) {
          const parent = node.parentElement;
          if (parent && parent.offsetParent !== null) { // visible
            emDashMatches.push({
              text: node.nodeValue.trim().slice(0, 100),
              tag: parent.tagName,
              cls: parent.className
            });
          }
        }
      }
      return emDashMatches;
    });

    if (pageEmDashes.length > 0) {
      pageEmDashes.forEach(m => {
        addFinding('EM_DASH_SLOP', route, `Visible em dash found in text: "${m.text}" (<${m.tag}>)`);
      });
    }

    // Check all buttons on this page
    const buttonAudit = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const deadOrBroken = [];
      btns.forEach(b => {
        const text = (b.textContent || '').trim();
        const ariaLabel = b.getAttribute('aria-label');

        // Check if button has zero identifiable actions
        if (!text && !b.querySelector('svg') && !ariaLabel) {
          deadOrBroken.push(`Empty button with no text, svg, or aria-label`);
        }

        // Check for pill styling violation (R-11)
        if (b.className && b.className.includes('rounded-full') && !b.className.includes('w-') && text.length > 5) {
          deadOrBroken.push(`Pill-shaped text button (rounded-full): "${text}"`);
        }
      });
      return deadOrBroken;
    });

    buttonAudit.forEach(b => addFinding('BUTTON_AUDIT', route, b));

    // Test any primary action modal if present (e.g. "Tambah...", "Rancang...", "Buat...")
    const modalTrigger = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const trigger = btns.find(b => {
        const txt = (b.textContent || '').toLowerCase();
        return (txt.includes('tambah') || txt.includes('rancang') || txt.includes('buat') || txt.includes('daftarkan')) && !b.disabled;
      });
      if (trigger) {
        trigger.click();
        return trigger.textContent.trim();
      }
      return null;
    });

    if (modalTrigger) {
      console.log(`  -> Clicked modal trigger: "${modalTrigger}"`);
      await new Promise(r => setTimeout(r, 400));

      // Check if dialog opened
      const dialogInfo = await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"]');
        if (!dialog) return null;

        // Check em dashes in modal
        const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
        const modalDashes = [];
        let node;
        while ((node = walker.nextNode())) {
          if (node.nodeValue && node.nodeValue.includes('—')) {
            modalDashes.push(node.nodeValue.trim().slice(0, 100));
          }
        }

        // Check Select components in modal
        const selects = Array.from(dialog.querySelectorAll('button[role="combobox"]'));

        return {
          hasDialog: true,
          modalDashes,
          selectCount: selects.length,
          title: dialog.querySelector('h2, h3, div[class*="font-semibold"], div[class*="font-bold"]')?.textContent?.trim()
        };
      });

      if (dialogInfo) {
        if (dialogInfo.modalDashes.length > 0) {
          dialogInfo.modalDashes.forEach(d => {
            addFinding('EM_DASH_SLOP_MODAL', route, `Modal em dash: "${d}"`);
          });
        }

        // Test closing modal with Escape key (R-32 accessibility)
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 300));
        const dialogStillOpen = await page.evaluate(() => !!document.querySelector('div[role="dialog"]'));
        if (dialogStillOpen) {
          addFinding('ACCESSIBILITY_KEYBOARD', route, `Modal "${dialogInfo.title}" does not close on Escape key`);
          // Close with Cancel button
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('div[role="dialog"] button'));
            const cancelBtn = btns.find(b => b.textContent && (b.textContent.includes('Batal') || b.textContent.includes('Tutup')));
            if (cancelBtn) cancelBtn.click();
            else {
              const xBtn = document.querySelector('div[role="dialog"] button:has(svg)');
              if (xBtn) xBtn.click();
            }
          });
          await new Promise(r => setTimeout(r, 300));
        } else {
          console.log(`  ✓ Modal closed with Escape key`);
        }
      }
    }
  }

  // 2. Specific Test on StructurePage Select Keyboard Navigation
  console.log('\n--- Deep Test: Select Component Keyboard Navigation & Search ---');
  await page.goto('http://localhost:5173/structures', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  // Open "Tambah Jabatan" modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('Tambah Jabatan'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const selectTests = await page.evaluate(async () => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return { error: 'No dialog' };
    const combobox = dialog.querySelector('button[role="combobox"]');
    if (!combobox) return { error: 'No combobox' };

    combobox.focus();
    return { comboboxFocused: document.activeElement === combobox };
  });
  console.log('  Combobox focusable:', selectTests);

  // Press Enter to open
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 300));

  const popupStatus = await page.evaluate(() => {
    const popup = document.querySelector('div[role="listbox"]');
    if (!popup) return { opened: false };
    const searchInput = popup.querySelector('input');
    return {
      opened: true,
      hasSearchInput: !!searchInput,
      searchInputFocused: searchInput ? document.activeElement === searchInput : false,
      optionCount: popup.querySelectorAll('div[role="option"]').length
    };
  });
  console.log('  Popup opened status:', popupStatus);

  if (popupStatus.opened) {
    // Test Escape when popup is open
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
    const isClosedOnEscape = await page.evaluate(() => !document.querySelector('div[role="listbox"]'));
    console.log('  Popup closed on Escape:', isClosedOnEscape);
    if (!isClosedOnEscape) {
      addFinding('SELECT_KEYBOARD', '/structures', 'Select popup does not close on Escape key when focused on search input or trigger');
    }
  }

  console.log('\n--- Test Table Filters & Actions ---');
  await page.goto('http://localhost:5173/programs', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  const tableFeatures = await page.evaluate(() => {
    const searchInput = document.querySelector('input[placeholder*="Cari"]');
    const filterBtn = document.querySelector('button[aria-label*="Filter"], button:has(svg.lucide-filter), button:has(svg)');
    const rows = document.querySelectorAll('tbody tr');
    return {
      hasSearch: !!searchInput,
      hasFilter: !!filterBtn,
      rowCount: rows.length
    };
  });
  console.log('  Programs Table features:', tableFeatures);

  console.log('\n===========================================================');
  console.log(' AUDIT COMPLETED. SUMMARY:');
  console.log(` Console Errors: ${consoleErrors.length}`);
  consoleErrors.forEach(err => console.log('  ', err));
  console.log(` Findings Count: ${findings.length}`);
  findings.forEach((f, idx) => console.log(`  ${idx + 1}. [${f.type}] ${f.route}: ${f.detail}`));
  console.log('===========================================================');

  await browser.close();
}

runTest().catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
