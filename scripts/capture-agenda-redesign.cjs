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

  console.log('Navigating to http://localhost:5173/agendas/create...');
  await page.goto('http://localhost:5173/agendas/create', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 1200));

  // 1. Force light mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'agenda_redesign_light.png'), fullPage: false });
  console.log('Captured agenda_redesign_light.png');

  // 2. Open unified DateTimePicker in Light mode
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"]'));
    if (buttons.length > 0) {
      buttons[0].click(); // Click "Waktu Mulai"
    }
  });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'agenda_datetime_picker_open_light.png'), fullPage: false });
  console.log('Captured agenda_datetime_picker_open_light.png');

  // Close with Escape
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));

  // 3. Force dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'agenda_redesign_dark.png'), fullPage: false });
  console.log('Captured agenda_redesign_dark.png');

  // 4. Open unified DateTimePicker in Dark mode
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"]'));
    if (buttons.length > 1) {
      buttons[1].click(); // Click "Waktu Selesai"
    } else if (buttons.length > 0) {
      buttons[0].click();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'agenda_datetime_picker_open_dark.png'), fullPage: false });
  console.log('Captured agenda_datetime_picker_open_dark.png');

  // Close with Escape
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));

  // 5. Mobile viewport (390 x 844) in dark mode
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'agenda_redesign_mobile_dark.png'), fullPage: false });
  console.log('Captured agenda_redesign_mobile_dark.png');

  // 6. Mobile viewport in light mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'agenda_redesign_mobile_light.png'), fullPage: false });
  console.log('Captured agenda_redesign_mobile_light.png');

  await browser.close();
  console.log('Done capturing all agenda redesign screenshots.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
