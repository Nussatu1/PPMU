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

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('header');
  await new Promise(r => setTimeout(r, 1200));

  // 1. Force Light Mode
  await page.evaluate(() => {
    if (window.__filamentSetTheme) {
      window.__filamentSetTheme('light');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('filament_theme', 'light');
    }
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'avatar_light_closed.png'), fullPage: false });
  console.log('Captured avatar_light_closed.png');

  // 2. Open Avatar Dropdown in Light Mode
  await page.evaluate(() => {
    const avatarBtn = document.querySelector('header button[aria-label="Menu profil dan preferensi tema"]');
    if (avatarBtn) avatarBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'avatar_dropdown_light.png'), fullPage: false });
  console.log('Captured avatar_dropdown_light.png');

  // 3. Switch to Dark Mode via window.__filamentSetTheme
  await page.evaluate(() => {
    if (window.__filamentSetTheme) {
      window.__filamentSetTheme('dark');
    }
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'avatar_dropdown_dark.png'), fullPage: false });
  console.log('Captured avatar_dropdown_dark.png');

  // 4. Close dropdown to capture dark closed view
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'avatar_dark_closed.png'), fullPage: false });
  console.log('Captured avatar_dark_closed.png');

  await browser.close();
  console.log('Done capturing all avatar theme screenshots.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
