const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BROWSER_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
function findBrowserPath() {
  for (const p of BROWSER_PATHS) if (fs.existsSync(p)) return p;
  throw new Error('No browser found');
}

const ARTIFACT_DIR = 'C:\\Users\\MULTIMEDIA\\.gemini\\antigravity-ide\\brain\\c316c718-611b-4abc-a8f5-0c0a170789af';

async function main() {
  console.log('🚀 Starting Help Drawer verification across multiple pages...');
  const browser = await puppeteer.launch({
    executablePath: findBrowserPath(),
    headless: true,
    defaultViewport: { width: 1440, height: 950 },
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  // Test 1: Catatan Pengeluaran (/finance/create)
  console.log('\n--- Test 1: Catatan Pengeluaran (/finance/create) ---');
  await page.goto('http://localhost:5173/finance/create', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 1200));

  // Set Dark Mode first
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 400));

  // Click Help Icon Button
  console.log('Clicking Help button on /finance/create...');
  await page.click('button[aria-label="Bantuan halaman ini"]');
  await new Promise(r => setTimeout(r, 800));

  // Verify Title and Content
  const helpData1 = await page.evaluate(() => {
    const titleEl = document.querySelector('[role="dialog"] h2, [role="dialog"] [class*="text-base"], [role="dialog"] [class*="text-lg"]');
    const bodyText = document.querySelector('[role="dialog"]')?.textContent || '';
    return {
      title: titleEl ? titleEl.textContent?.trim() : '',
      hasBudgetField: bodyText.includes('budget_id') || bodyText.includes('Pos Sumber Pagu Anggaran'),
      hasAmountField: bodyText.includes('amount') || bodyText.includes('Nominal Realisasi Belanja'),
      hasCategoryField: bodyText.includes('category') || bodyText.includes('Kategori Belanja'),
      hasTransactionDateField: bodyText.includes('transaction_date') || bodyText.includes('Tanggal Pembukuan'),
    };
  });
  console.log('Help Dialog Info (Finance Create):', helpData1);

  if (!helpData1.title.includes('Pengeluaran')) {
    throw new Error('Title does not match Finance Create! Got: ' + helpData1.title);
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'help_finance_create_dark.png') });
  console.log('📸 Captured help_finance_create_dark.png');

  // Switch to Light Mode to test contrast
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'help_finance_create_light.png') });
  console.log('📸 Captured help_finance_create_light.png');

  // Test 2: Agenda Create (/agendas/create)
  console.log('\n--- Test 2: Agenda & Kegiatan (/agendas/create) ---');
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await page.goto('http://localhost:5173/agendas/create', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 1200));

  // Open Help
  await page.click('button[aria-label="Bantuan halaman ini"]');
  await new Promise(r => setTimeout(r, 800));

  const helpData2 = await page.evaluate(() => {
    const titleEl = document.querySelector('[role="dialog"] h2, [role="dialog"] [class*="text-base"], [role="dialog"] [class*="text-lg"]');
    const bodyText = document.querySelector('[role="dialog"]')?.textContent || '';
    return {
      title: titleEl ? titleEl.textContent?.trim() : '',
      hasDateTimePicker: bodyText.includes('DateTimePicker') || bodyText.includes('start_time'),
      hasLocation: bodyText.includes('location') || bodyText.includes('Lokasi'),
    };
  });
  console.log('Help Dialog Info (Agenda Create):', helpData2);
  if (!helpData2.title.includes('Agenda')) {
    throw new Error('Title does not match Agenda Create! Got: ' + helpData2.title);
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'help_agenda_create_dark.png') });
  console.log('📸 Captured help_agenda_create_dark.png');

  // Test 3: Struktur Organisasi (/structures)
  console.log('\n--- Test 3: Struktur Organisasi (/structures) ---');
  await page.goto('http://localhost:5173/structures', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 1200));

  await page.click('button[aria-label="Bantuan halaman ini"]');
  await new Promise(r => setTimeout(r, 800));

  const helpData3 = await page.evaluate(() => {
    const titleEl = document.querySelector('[role="dialog"] h2, [role="dialog"] [class*="text-base"], [role="dialog"] [class*="text-lg"]');
    const bodyText = document.querySelector('[role="dialog"]')?.textContent || '';
    return {
      title: titleEl ? titleEl.textContent?.trim() : '',
      hasTupoksi: bodyText.includes('Tupoksi') || bodyText.includes('struktur'),
    };
  });
  console.log('Help Dialog Info (Structures):', helpData3);
  if (!helpData3.title.includes('Struktur')) {
    throw new Error('Title does not match Structures! Got: ' + helpData3.title);
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'help_structures_dark.png') });
  console.log('📸 Captured help_structures_dark.png');

  // Test 4: Mobile Viewport (375px)
  console.log('\n--- Test 4: Mobile Viewport (375x812) ---');
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('http://localhost:5173/finance/create', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));

  await page.click('button[aria-label="Bantuan halaman ini"]');
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'help_mobile_375px.png') });
  console.log('📸 Captured help_mobile_375px.png');

  // Close with Esc
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // Test 5: Keyboard shortcut '?'
  console.log('\n--- Test 5: Keyboard shortcut "?" ---');
  await page.setViewport({ width: 1440, height: 950 });
  await page.keyboard.press('?');
  await new Promise(r => setTimeout(r, 800));
  const isOpenedByShortcut = await page.evaluate(() => {
    return !!document.querySelector('[role="dialog"]');
  });
  console.log('Opened by shortcut "?" :', isOpenedByShortcut);
  if (!isOpenedByShortcut) {
    throw new Error('Shortcut "?" failed to open help drawer!');
  }

  await browser.close();
  console.log('\n✨ All Help Drawer tests passed with 100% success!');
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
