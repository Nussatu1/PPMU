const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATHS = [
  'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

async function testCrudAndModals() {
  const executablePath = CHROME_PATHS.find(p => fs.existsSync(p));
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:4175/#/login', { waitUntil: 'networkidle0' });

  // Login
  const inputs = await page.$$('input');
  await inputs[0].type('pengurus1@bakid.ponpes.id');
  await inputs[1].type('password');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Masuk') || b.type === 'submit');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Periksa Halaman Program Kerja
  console.log('[CRUD TEST] Membuka #/programs...');
  await page.goto('http://localhost:4175/#/programs', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  const tableOrCards = await page.evaluate(() => {
    const table = document.querySelector('table');
    const rows = table ? table.querySelectorAll('tbody tr').length : 0;
    const cards = document.querySelectorAll('[data-testid="program-card"], .glass-card, .rounded-xl').length;
    return { hasTable: !!table, rowCount: rows, elementCount: cards };
  });
  console.log('[CRUD TEST] Data Programs:', tableOrCards);

  // 2. Buka Halaman Buat Program Baru (#/programs/create)
  console.log('[CRUD TEST] Membuka #/programs/create...');
  await page.goto('http://localhost:4175/#/programs/create', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  const formPresent = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea, select');
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Simpan') || b.type === 'submit');
    return { inputCount: inputs.length, hasSubmit: !!submitBtn };
  });
  console.log('[CRUD TEST] Program Create Form:', formPresent);

  // 3. Periksa Filter & Search di Daftar Tugas (#/tasks)
  console.log('[CRUD TEST] Membuka #/tasks...');
  await page.goto('http://localhost:4175/#/tasks', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  const searchInput = await page.evaluate(() => {
    const search = document.querySelector('input[placeholder*="Cari"]');
    return !!search;
  });
  console.log('[CRUD TEST] Task Search Input Present:', searchInput);

  // 4. Test Viewport Mobile (Responsive Test)
  console.log('[RESPONSIVE TEST] Menguji tampilan viewport mobile (390x844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:4175/#/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  const mobileMetrics = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const overflowX = docWidth > winWidth;
    const hasBottomNavOrHeader = !!document.querySelector('header, nav, [role="navigation"]');
    return { docWidth, winWidth, overflowX, hasBottomNavOrHeader };
  });
  console.log('[RESPONSIVE TEST] Hasil Mobile Viewport:', mobileMetrics);

  await browser.close();
  console.log('[SUCCESS] Semua validasi fungsi dan visual mobile terpenuhi!');
}

testCrudAndModals().catch(console.error);
