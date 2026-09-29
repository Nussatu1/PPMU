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
  const browser = await puppeteer.launch({
    executablePath: findBrowserPath(),
    headless: true,
    defaultViewport: { width: 1440, height: 950 },
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  console.log('Navigating to http://localhost:5173/audit-logs...');
  await page.goto('http://localhost:5173/audit-logs', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 1200));

  // 1. Light Mode View
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_logs_light.png'), fullPage: false });
  console.log('Captured audit_logs_light.png');

  // 2. Open Detail Payload Modal in Light Mode
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const diffBtn = buttons.find(b => b.textContent && b.textContent.includes('Lihat Diff'));
    if (diffBtn) diffBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_logs_detail_modal_light.png'), fullPage: false });
  console.log('Captured audit_logs_detail_modal_light.png');

  // Close detail modal with Tutup button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const tutupBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Tutup');
    if (tutupBtn) tutupBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 3. Dark Mode View
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_logs_dark.png'), fullPage: false });
  console.log('Captured audit_logs_dark.png');

  // 4. Trigger Delete Confirmation Modal on a row
  await page.evaluate(() => {
    const deleteBtn = document.querySelector('table tbody td:last-child button:last-child');
    if (deleteBtn) deleteBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_logs_delete_modal_dark.png'), fullPage: false });
  console.log('Captured audit_logs_delete_modal_dark.png');

  // Close single delete modal with Batal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const batalBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Batal');
    if (batalBtn) batalBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // 5. Open Clear All Modal
  const clickedClear = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const clearBtn = buttons.find(b => b.textContent && b.textContent.includes('Bersihkan Semua Log'));
    if (clearBtn) {
      clearBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked clearBtn:', clickedClear);
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_logs_clear_modal_dark.png'), fullPage: false });
  console.log('Captured audit_logs_clear_modal_dark.png');

  await browser.close();
  console.log('Done capturing all audit logs screenshots.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
