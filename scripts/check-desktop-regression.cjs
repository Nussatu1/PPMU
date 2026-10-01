/**
 * Desktop regression check (1440x900) - memastikan perbaikan mobile tidak
 * merusak Topbar/content/table di desktop.
 * Usage: AUDIT_BASE=http://localhost:5175 node scripts/check-desktop-regression.cjs
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BROWSER_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
const findBrowser = () => {
  for (const p of BROWSER_PATHS) if (fs.existsSync(p)) return p;
  throw new Error('browser not found');
};

const BASE = process.env.AUDIT_BASE || 'http://localhost:5173';
const OUT = path.join(__dirname, '..', '.mobile-audit');

const PROBE = () => {
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const header = Array.from(document.querySelectorAll('header')).find(vis);
  const firstRowAction = document.querySelector('tbody tr td:last-child button, tbody tr td:last-child a');
  return {
    headerVisible: !!header,
    headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
    sidebarVisible: vis(document.querySelector('aside')),
    searchButton: !!Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Cari')),
    helpButton: !!Array.from(document.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Bantuan halaman ini'),
    notifButton: !!Array.from(document.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Notifikasi'),
    profileButton: !!Array.from(document.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Menu profil dan preferensi tema'),
    mobileHeaderVisible: !!Array.from(document.querySelectorAll('header')).find((h) => {
      const r = h.getBoundingClientRect();
      return r.width > 0 && h.className.includes('lg:hidden');
    }),
    rowActionSize: firstRowAction
      ? { w: Math.round(firstRowAction.getBoundingClientRect().width), h: Math.round(firstRowAction.getBoundingClientRect().height) }
      : null,
    bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const rows = [];
  try {
    for (const route of ['/', '/programs', '/programs/create', '/structures', '/settings', '/accounts']) {
      await page.goto(BASE + route, { waitUntil: 'networkidle0', timeout: 60000 });
      await new Promise((r) => setTimeout(r, 1200));
      const probe = await page.evaluate(PROBE);
      rows.push(Object.assign({ route }, probe));
      await page.screenshot({ path: path.join(OUT, 'desktop' + route.replace(/\//g, '_') + '.png') });
      console.log('[desktop] ' + route + ' ' + JSON.stringify(probe));
    }
    fs.writeFileSync(path.join(OUT, 'desktop-report.json'), JSON.stringify(rows, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});