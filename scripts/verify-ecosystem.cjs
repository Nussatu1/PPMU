// scripts/verify-ecosystem.cjs
const puppeteer = require('puppeteer-core');
const path = require('path');

const BRAVE_PATH = 'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const ARTIFACT_DIR = 'C:\\Users\\MULTIMEDIA\\.gemini\\antigravity-ide\\brain\\c316c718-611b-4abc-a8f5-0c0a170789af';

(async () => {
  console.log('Launching Brave Browser...');
  const browser = await puppeteer.launch({
    executablePath: BRAVE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  const routes = [
    { url: 'http://localhost:5173/', name: 'dashboard_ecosystem' },
    { url: 'http://localhost:5173/organizations', name: 'superadmin_organizations' },
    { url: 'http://localhost:5173/roles', name: 'superadmin_roles' },
    { url: 'http://localhost:5173/structure', name: 'ecosystem_structure' },
    { url: 'http://localhost:5173/programs', name: 'ecosystem_programs' },
    { url: 'http://localhost:5173/finance', name: 'ecosystem_finance' },
  ];

  for (const route of routes) {
    console.log(`Testing route: ${route.url}`);
    await page.goto(route.url, { waitUntil: 'networkidle0', timeout: 15000 });
    const title = await page.title();
    console.log(`  Page title: ${title}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `${route.name}.png`) });
  }

  await browser.close();

  if (errors.length > 0) {
    console.log('\n[WARNING] Console errors detected:');
    errors.forEach(e => console.log('  -', e));
  } else {
    console.log('\n[SUCCESS] All routes rendered in Brave with 0 console errors!');
  }
})();
