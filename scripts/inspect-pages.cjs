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

async function run() {
  const browser = await puppeteer.launch({
    executablePath: getBrowserPath(),
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  // Set auth directly in localStorage to bypass form quirks
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

  const routes = ['/programs', '/agendas', '/tasks', '/finance', '/reports', '/performance', '/organizations', '/structures'];
  for (const r of routes) {
    await page.goto('http://localhost:5173' + r, { waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise(res => setTimeout(res, 500));
    const info = await page.evaluate(() => {
      const container = document.querySelector('.min-h-screen') || document.body;
      const rows = document.querySelectorAll('tbody tr').length;
      return {
        url: window.location.pathname,
        rows,
        text: (container.innerText || '').slice(0, 300).replace(/\n+/g, ' | ')
      };
    });
    console.log(`\n=== ROUTE: ${r} (Actual: ${info.url}) ===`);
    console.log(`Table Rows: ${info.rows}`);
    console.log(`Content: ${info.text}`);
  }

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
