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

  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:5173/structures', { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');

    // 1. Dark Mode modal
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      const buttons = Array.from(document.querySelectorAll('button'));
      const exportBtn = buttons.find(b => b.textContent && b.textContent.includes('Ekspor'));
      if (exportBtn) exportBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const darkModalPath = path.join(ARTIFACT_DIR, 'export_modal_ergonomic_dark.png');
    await page.screenshot({ path: darkModalPath, fullPage: false });
    console.log('Saved dark modal screenshot to:', darkModalPath);

    // 2. Light Mode modal
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    await new Promise(r => setTimeout(r, 400));

    const lightModalPath = path.join(ARTIFACT_DIR, 'export_modal_ergonomic_light.png');
    await page.screenshot({ path: lightModalPath, fullPage: false });
    console.log('Saved light modal screenshot to:', lightModalPath);

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Screenshot capture error:', err);
  process.exit(1);
});
