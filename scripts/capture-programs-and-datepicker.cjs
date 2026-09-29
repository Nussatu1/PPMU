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

  console.log('Navigating to http://localhost:5173/programs/create...');
  await page.goto('http://localhost:5173/programs/create', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 1500));

  // Force light mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise(r => setTimeout(r, 500));

  // Screenshot 1: Program Create Page Light Mode
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'program_create_light.png'), fullPage: false });
  console.log('Captured program_create_light.png');

  // Click on the second datepicker (Target Tanggal Selesai) to verify smart right-alignment and anchoring!
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"]'));
    if (buttons.length > 1) {
      buttons[1].click();
    } else if (buttons.length > 0) {
      buttons[0].click();
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // Screenshot 2: DatePicker Opened Light Mode
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'program_create_datepicker_light.png'), fullPage: false });
  console.log('Captured program_create_datepicker_light.png');

  // Close datepicker with Escape
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));

  // Force dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 500));

  // Open first datepicker in dark mode
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"]'));
    if (buttons.length > 0) {
      buttons[0].click();
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // Screenshot 3: DatePicker Opened Dark Mode
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'program_create_datepicker_dark.png'), fullPage: false });
  console.log('Captured program_create_datepicker_dark.png');

  // Close datepicker
  await page.keyboard.press('Escape');

  // Screenshot 4: Program Create Page Dark Mode
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'program_create_dark.png'), fullPage: false });
  console.log('Captured program_create_dark.png');

  // Test Agenda Create Page
  console.log('Navigating to http://localhost:5173/agendas/create...');
  await page.goto('http://localhost:5173/agendas/create', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 1200));

  // Screenshot 5: Agenda Create Page Dark Mode
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'agenda_create_dark.png'), fullPage: false });
  console.log('Captured agenda_create_dark.png');

  // Test Mobile Viewport (390 x 844)
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'agenda_create_mobile_dark.png'), fullPage: false });
  console.log('Captured agenda_create_mobile_dark.png');

  await browser.close();
  console.log('All screenshots captured successfully.');
}

main().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});
