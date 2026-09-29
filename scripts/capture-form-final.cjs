const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BROWSER_PATHS = [
  'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
function findBrowserPath() {
  for (const p of BROWSER_PATHS) if (fs.existsSync(p)) return p;
  throw new Error('No browser found');
}

const ARTIFACT_DIR = 'C:\\Users\\MULTIMEDIA\\.gemini\\antigravity-ide\\brain\\c316c718-611b-4abc-a8f5-0c0a170789af';

async function captureForm(page, theme, suffix) {
  // Set theme
  if (theme === 'dark') {
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
  } else {
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
  }
  await new Promise(r => setTimeout(r, 700));

  // Open Tambah Jabatan form
  const opened = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('Tambah Jabatan'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  
  if (!opened) {
    console.log(`Could not open form in ${theme} mode`);
    return;
  }
  
  await new Promise(r => setTimeout(r, 800));
  
  // Screenshot form at full page with viewport 1000px
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `form_after_fix_${suffix}.png`), fullPage: false });
  console.log(`Captured form_after_fix_${suffix}.png`);

  // Close modal by clicking backdrop (escape would close modal)  
  await page.evaluate(() => {
    // click backdrop
    const backdrop = document.querySelector('[data-headlessui-state="open"][aria-hidden="true"]');
    if (backdrop) backdrop.click();
    else {
      // close button
      const closeBtn = document.querySelector('button[aria-label="Tutup modal"]');
      closeBtn?.click();
    }
  });
  await new Promise(r => setTimeout(r, 400));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: findBrowserPath(),
    headless: true,
    defaultViewport: { width: 1440, height: 1000 },
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/structures', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 2000)); // Wait for full CSS load
  
  await captureForm(page, 'light', 'light');
  await captureForm(page, 'dark', 'dark');
  
  await browser.close();
  console.log('All done!');
}

main().catch(err => { console.error(err); process.exit(1); });
