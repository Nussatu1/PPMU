const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATHS = [
  'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

async function testFullApp() {
  const executablePath = CHROME_PATHS.find(p => fs.existsSync(p));
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.toString()));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE_ERROR: ' + msg.text());
  });

  await page.goto('http://localhost:4175/#/login', { waitUntil: 'networkidle0' });

  console.log('[TEST 1] Logging in with pengurus1@bakid.ponpes.id / password ...');
  const inputs = await page.$$('input');
  await inputs[0].type('pengurus1@bakid.ponpes.id');
  await inputs[1].type('password');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Masuk') || b.type === 'submit');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 1200));

  console.log('[TEST 2] Current URL after login:', page.url());
  const bodySnippet = await page.evaluate(() => document.body.innerText.substring(0, 150).replace(/\n+/g, ' '));
  console.log('[TEST 2] Dashboard Snippet:', bodySnippet);

  // Navigasi ke #/organizations
  console.log('[TEST 3] Navigasi ke #/organizations ...');
  await page.goto('http://localhost:4175/#/organizations', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  const orgSnippet = await page.evaluate(() => document.body.innerText.substring(0, 150).replace(/\n+/g, ' '));
  console.log('[TEST 3] Organizations Snippet:', orgSnippet);

  // Navigasi ke #/programs
  console.log('[TEST 4] Navigasi ke #/programs ...');
  await page.goto('http://localhost:4175/#/programs', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  const progSnippet = await page.evaluate(() => document.body.innerText.substring(0, 150).replace(/\n+/g, ' '));
  console.log('[TEST 4] Programs Snippet:', progSnippet);

  // Navigasi ke #/finance
  console.log('[TEST 5] Navigasi ke #/finance ...');
  await page.goto('http://localhost:4175/#/finance', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  const finSnippet = await page.evaluate(() => document.body.innerText.substring(0, 150).replace(/\n+/g, ' '));
  console.log('[TEST 5] Finance Snippet:', finSnippet);

  // Navigasi ke #/tasks
  console.log('[TEST 6] Navigasi ke #/tasks ...');
  await page.goto('http://localhost:4175/#/tasks', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  const taskSnippet = await page.evaluate(() => document.body.innerText.substring(0, 150).replace(/\n+/g, ' '));
  console.log('[TEST 6] Tasks Snippet:', taskSnippet);

  // Navigasi ke #/structures
  console.log('[TEST 7] Navigasi ke #/structures ...');
  await page.goto('http://localhost:4175/#/structures', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  const structSnippet = await page.evaluate(() => document.body.innerText.substring(0, 150).replace(/\n+/g, ' '));
  console.log('[TEST 7] Structures Snippet:', structSnippet);

  console.log('[SUMMARY] Errors count:', errors.length);
  errors.forEach(e => console.log('  ', e));

  await browser.close();
}

testFullApp().catch(console.error);
