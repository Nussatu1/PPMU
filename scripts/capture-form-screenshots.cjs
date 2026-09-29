const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

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
  throw new Error('No supported browser executable found.');
}

const ARTIFACT_DIR = 'C:\\Users\\MULTIMEDIA\\.gemini\\antigravity-ide\\brain\\c316c718-611b-4abc-a8f5-0c0a170789af';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: findBrowserPath(),
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/structures', { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 500));

  // Light mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise(r => setTimeout(r, 500));

  // Click "Tambah Jabatan" button
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('Tambah Jabatan'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log('Clicked Tambah Jabatan:', clicked);
  await new Promise(r => setTimeout(r, 700));

  // Screenshot form light mode
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'structure_form_light.png'), fullPage: false });
  console.log('Captured structure_form_light.png');

  // Scroll down inside modal to see Select dropdowns
  await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]') || document.querySelector('.overflow-y-auto');
    if (modal) modal.scrollTop = 300;
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'structure_form_light_scroll.png'), fullPage: false });
  console.log('Captured structure_form_light_scroll.png');

  // Dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'structure_form_dark.png'), fullPage: false });
  console.log('Captured structure_form_dark.png');

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
