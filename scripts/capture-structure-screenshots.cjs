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

  console.log('Navigating to http://localhost:5173/structures...');
  await page.goto('http://localhost:5173/structures', { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');

  // Set Light Mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await new Promise(r => setTimeout(r, 600));

  // 1. Capture Light Mode Tree
  console.log('Capturing structure_tree_light.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'structure_tree_light.png'),
    fullPage: false
  });

  // 2. Click a node to open detail modal (e.g. Seksi Pendidikan or Ketua)
  console.log('Clicking tree node to open detail modal in Light mode...');
  const clicked = await page.evaluate(() => {
    // Find a node containing text
    const nodes = Array.from(document.querySelectorAll('.select-none.cursor-pointer'));
    const target = nodes.find(n => n.textContent && (n.textContent.includes('Pendidikan') || n.textContent.includes('Ketua') || n.textContent.includes('Bendahara')));
    if (target) {
      target.click();
      return true;
    }
    return false;
  });

  if (clicked) {
    await new Promise(r => setTimeout(r, 700));
    console.log('Capturing structure_detail_modal_light.png...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'structure_detail_modal_light.png'),
      fullPage: false
    });
  }

  // 3. Switch to Dark Mode
  console.log('Switching to Dark Mode...');
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 600));

  console.log('Capturing structure_detail_modal_dark.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'structure_detail_modal_dark.png'),
    fullPage: false
  });

  // Close modal with Escape or clicking backdrop
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // 4. Capture Dark Mode Tree
  console.log('Capturing structure_tree_dark.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'structure_tree_dark.png'),
    fullPage: false
  });

  console.log('Screenshots captured successfully!');
  await browser.close();
}

main().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
