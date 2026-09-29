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

async function main() {
  const browser = await puppeteer.launch({
    executablePath: findBrowserPath(),
    headless: true,
    defaultViewport: { width: 1440, height: 1000 },
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  // Wait longer for CSS
  await page.goto('http://localhost:5173/structures', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 2000));

  // Force light mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise(r => setTimeout(r, 500));

  // Open form
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('Tambah Jabatan'));
    btn?.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Light mode full form
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'form_full_light.png'), fullPage: false });

  // Click dropdown to open
  await page.evaluate(() => {
    const combobox = document.querySelector('[role="combobox"]');
    combobox?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'form_dropdown_open_light.png'), fullPage: false });

  // Escape to close dropdown
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));

  // Dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'form_full_dark.png'), fullPage: false });

  // Open dropdown in dark
  await page.evaluate(() => {
    const combobox = document.querySelector('[role="combobox"]');
    combobox?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'form_dropdown_open_dark.png'), fullPage: false });

  await browser.close();
  console.log('Done capturing form screenshots');
}

main().catch(console.error);
