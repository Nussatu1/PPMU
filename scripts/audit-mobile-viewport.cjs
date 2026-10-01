/**
 * Mobile Viewport Audit - measures the rendered app at 390x844 (iPhone 14 class).
 * Usage: node scripts/audit-mobile-viewport.cjs   (dev server must run on :5173)
 * Output: .mobile-audit/report.json + .mobile-audit/*.png
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BROWSER_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
];

function findBrowserPath() {
  for (const p of BROWSER_PATHS) if (fs.existsSync(p)) return p;
  throw new Error('No supported browser executable found.');
}

const OUT_DIR = path.join(__dirname, '..', '.mobile-audit');
const BASE = process.env.AUDIT_BASE || 'http://localhost:5173';

const ROUTES = [
  { id: '01-dashboard', url: '/' },
  { id: '02-programs-list', url: '/programs' },
  { id: '03-program-create', url: '/programs/create' },
  { id: '04-agendas-list', url: '/agendas' },
  { id: '05-agenda-create', url: '/agendas/create' },
  { id: '06-performance-list', url: '/performance' },
  { id: '07-finance-list', url: '/finance' },
  { id: '08-finance-create', url: '/finance/create' },
  { id: '09-reports-list', url: '/reports' },
  { id: '10-tasks-list', url: '/tasks' },
  { id: '11-structures', url: '/structures' },
  { id: '12-settings', url: '/settings' },
  { id: '13-accounts', url: '/accounts' },
  { id: '14-roles', url: '/roles' },
  { id: '15-audit-logs', url: '/audit-logs' },
  { id: '16-organizations', url: '/organizations' },
];

const PROBE = () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };

  const docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;

  const offenders = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (!isVisible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width > vw + 1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 110),
        width: Math.round(r.width),
        text: (el.textContent || '').trim().slice(0, 40),
      });
    }
  });

  const smallTargets = [];
  document.querySelectorAll('a, button, [role="button"], input, select, textarea').forEach((el) => {
    if (!isVisible(el)) return;
    if (el.closest('[hidden], [aria-hidden="true"]')) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh * 3) return;
    if (r.right <= 0 || r.left >= vw) return; // off-screen (e.g. closed mobile drawer)
    if (r.width < 44 || r.height < 44) {
      smallTargets.push({
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 32),
      });
    }
  });

  const smallTexts = [];
  document.querySelectorAll('p, span, td, th, li, label, h1, h2, h3').forEach((el) => {
    if (!isVisible(el)) return;
    const txt = (el.textContent || '').trim();
    if (!txt || txt.length < 3) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs > 0 && fs < 12) smallTexts.push({ fs: +fs.toFixed(1), text: txt.slice(0, 36) });
  });

  const headers = Array.from(document.querySelectorAll('header'));
  const visibleHeaders = headers.filter(isVisible);
  const headerVisible = visibleHeaders.length > 0;
  const headerHeights = visibleHeaders.map((h) => Math.round(h.getBoundingClientRect().height));
  const profileMenuBtn = Array.from(
    document.querySelectorAll('[aria-label="Menu profil dan preferensi tema"]')
  ).find(isVisible);
  const profileMenuVisible = !!profileMenuBtn;
  const notifBtn = Array.from(document.querySelectorAll('[aria-label="Notifikasi"]')).find(isVisible);
  const notifVisible = !!notifBtn;
  const searchGlobalBtn = Array.from(document.querySelectorAll('button')).filter(
    (b) => b.getAttribute('aria-label') === 'Cari di seluruh aplikasi' && isVisible(b)
  ).length;
  const backBtn = Array.from(document.querySelectorAll('button')).filter(
    (b) => b.getAttribute('aria-label') === 'Kembali ke halaman sebelumnya' && isVisible(b)
  ).length;
  const bottomNav = document.querySelector('nav[aria-label="Navigasi Bawah Ponsel"]');
  const bottomNavVisible = bottomNav ? isVisible(bottomNav) : false;
  const tables = Array.from(document.querySelectorAll('table')).map((t) => {
    const wrap = t.parentElement;
    return {
      tableWidth: Math.round(t.scrollWidth),
      wrapperClient: wrap ? Math.round(wrap.clientWidth) : null,
      needsHorizontalScroll: wrap ? t.scrollWidth > wrap.clientWidth + 2 : false,
      columns: t.querySelectorAll('thead th').length,
    };
  });

  const scrollWraps = Array.from(document.querySelectorAll('.overflow-x-auto')).map((w) => ({
    client: Math.round(w.clientWidth),
    scroll: Math.round(w.scrollWidth),
    hiddenWidth: Math.round(w.scrollWidth - w.clientWidth),
  }));

  return {
    viewport: { vw, vh },
    docOverflow,
    offenderCount: offenders.length,
    offenders: offenders.slice(0, 8),
    smallTargetCount: smallTargets.length,
    smallTargets: smallTargets.slice(0, 12),
    smallTextCount: smallTexts.length,
    smallTexts: smallTexts.slice(0, 10),
    headerVisible,
    headerHeights,
    profileMenuVisible,
    notifVisible,
    searchGlobalBtn,
    backBtn,
    bottomNavVisible,
    tables,
    scrollWraps,
    visibleH1: Array.from(document.querySelectorAll('h1')).filter(isVisible).map((h) => (h.textContent || '').trim().slice(0, 60)),
  };
};

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: findBrowserPath(),
    headless: true,
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  );

  const results = [];
  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));

    for (const route of ROUTES) {
      await page.goto(BASE + route.url, { waitUntil: 'networkidle0', timeout: 60000 });
      await new Promise((r) => setTimeout(r, 1200));
      const probe = await page.evaluate(PROBE);
      await page.screenshot({ path: path.join(OUT_DIR, route.id + '.png') });
      results.push(Object.assign({}, route, probe));
      console.log('[ok] ' + route.id + ' overflow=' + probe.docOverflow + ' smallTargets=' + probe.smallTargetCount + ' header=' + probe.headerVisible + ' profile=' + probe.profileMenuVisible + ' back=' + probe.backBtn);
    }

    await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    const drawerInfo = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Navigasi Bawah Ponsel"]');
      const labels = nav ? Array.from(nav.querySelectorAll('button')).map((b) => b.getAttribute('aria-label')) : [];
      return { bottomNavLabels: labels };
    });
    await page.screenshot({ path: path.join(OUT_DIR, '17-bottom-nav.png') });

    // Mobile drawer geometry
    const drawerOpen = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Navigasi Bawah Ponsel"]');
      const menuBtn = nav ? Array.from(nav.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Buka Semua Menu') : null;
      if (menuBtn) menuBtn.click();
      return { bottomNavLabels: nav ? Array.from(nav.querySelectorAll('button')).map((b) => b.getAttribute('aria-label')) : [] };
    });
    await new Promise((r) => setTimeout(r, 700));
    const drawerRect = await page.evaluate(() => {
      const aside = document.querySelector('aside');
      if (!aside) return null;
      const r = aside.getBoundingClientRect();
      return { left: Math.round(r.left), width: Math.round(r.width), right: Math.round(r.right), viewport: window.innerWidth };
    });
    await page.screenshot({ path: path.join(OUT_DIR, '18-drawer-open.png') });

    // DateTimePicker inside the mobile viewport
    await page.goto(BASE + '/programs/create', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));
    const pickerInfo = await page.evaluate(() => {
      const trigger = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"]'))[0];
      if (!trigger) return null;
      trigger.click();
      return true;
    });
    await new Promise((r) => setTimeout(r, 700));
    const pickerRect = await page.evaluate(() => {
      const popups = Array.from(document.querySelectorAll('div')).filter((d) => {
        if (!d.style || d.style.position !== 'fixed') return false;
        return parseInt(d.style.zIndex || '0', 10) >= 1000 && d.getBoundingClientRect().width > 150;
      });
      if (!popups.length) return null;
      const r = popups[popups.length - 1].getBoundingClientRect();
      return {
        left: Math.round(r.left),
        top: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height),
        bottom: Math.round(r.bottom),
        viewport: { w: window.innerWidth, h: window.innerHeight },
        clippedX: r.left < 0 || r.right > window.innerWidth + 1,
        clippedY: r.top < 0 || r.bottom > window.innerHeight + 1,
      };
    });
    await page.screenshot({ path: path.join(OUT_DIR, '19-datepicker-open.png') });

    // Verifikasi jalur logout di mobile (menu profil pada MobileAppHeader)
    await page.goto(BASE + '/programs', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));
    const logoutCheck = await page.evaluate(() => {
      const btn = Array.from(
        document.querySelectorAll('[aria-label="Menu profil dan preferensi tema"]')
      ).find((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (!btn) return { opened: false, reason: 'visible profile button not found' };
      btn.click();
      return { opened: true };
    });
    await new Promise((r) => setTimeout(r, 500));
    const logoutInfo = await page.evaluate(() => {
      const logoutBtn = Array.from(document.querySelectorAll('button')).find((b) => {
        if (!(b.textContent || '').trim().toLowerCase().includes('logout')) return false;
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (!logoutBtn) return { logoutFound: false };
      const r = logoutBtn.getBoundingClientRect();
      const cs = getComputedStyle(logoutBtn);
      return {
        logoutFound: true,
        width: Math.round(r.width),
        height: Math.round(r.height),
        visible: r.width > 0 && r.height > 0 && cs.display !== 'none',
        onClickAttached: typeof logoutBtn.onclick !== 'undefined',
        insideViewport: r.top >= 0 && r.bottom <= window.innerHeight + 1,
      };
    });
    await page.screenshot({ path: path.join(OUT_DIR, '20-profile-menu-open.png') });

    // Verifikasi modal pencarian global dari header mobile
    const searchCheck = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Cari di seluruh aplikasi'
      );
      if (!btn) return { clicked: false };
      btn.click();
      return { clicked: true };
    });
    await new Promise((r) => setTimeout(r, 600));
    const searchModal = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]')).filter((i) => {
        const r = i.getBoundingClientRect();
        const cs = getComputedStyle(i);
        return r.width > 50 && r.height > 0 && cs.visibility !== 'hidden';
      });
      return {
        modalOpen: inputs.length > 0,
        placeholder: inputs[0] ? inputs[0].placeholder : null,
      };
    });
    await page.screenshot({ path: path.join(OUT_DIR, '21-global-search-open.png') });

    fs.writeFileSync(
      path.join(OUT_DIR, 'report.json'),
      JSON.stringify(
        {
          results,
          drawerInfo: Object.assign({}, drawerInfo, drawerOpen, { drawerRect }),
          pickerInfo: { opened: pickerInfo, rect: pickerRect },
          logoutInfo: Object.assign({}, logoutCheck, logoutInfo),
          searchInfo: Object.assign({}, searchCheck, searchModal),
        },
        null,
        2
      )
    );
    console.log('Bottom nav labels: ' + JSON.stringify(drawerInfo));
    console.log('Drawer open state: ' + JSON.stringify({ drawerOpen, drawerRect }));
    console.log('Picker rect: ' + JSON.stringify(pickerRect));
    console.log('Logout di mobile: ' + JSON.stringify(Object.assign({}, logoutCheck, logoutInfo)));
    console.log('Pencarian global: ' + JSON.stringify(Object.assign({}, searchCheck, searchModal)));
    console.log('Report: ' + path.join(OUT_DIR, 'report.json'));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
