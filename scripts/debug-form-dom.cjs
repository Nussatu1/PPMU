const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BROWSER_PATHS = [
  'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
function findBrowserPath() {
  for (const p of BROWSER_PATHS) if (fs.existsSync(p)) return p;
  throw new Error('No browser found');
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: findBrowserPath(),
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/structures', { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 500));

  // Click Tambah Jabatan
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('Tambah Jabatan'));
    btn?.click();
  });
  await new Promise(r => setTimeout(r, 700));

  // Check DOM structure of the form
  const formInfo = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return { error: 'No modal found' };
    
    const selects = Array.from(modal.querySelectorAll('select'));
    const buttons = Array.from(modal.querySelectorAll('button[role="combobox"]'));
    const inputs = Array.from(modal.querySelectorAll('input'));
    const divs = Array.from(modal.querySelectorAll('[role="combobox"]'));
    
    return {
      nativeSelects: selects.map(s => ({ tag: s.tagName, class: s.className, name: s.name })),
      customSelectTriggers: buttons.map(b => ({ type: b.type, role: b.getAttribute('role'), text: b.textContent?.slice(0,50) })),
      comboboxDivs: divs.map(d => ({ tag: d.tagName, text: d.textContent?.slice(0,50) })),
      inputs: inputs.length,
      modalHTML: modal.innerHTML.slice(0, 3000)
    };
  });
  
  console.log('Form DOM Analysis:');
  console.log(JSON.stringify(formInfo, null, 2));
  
  await browser.close();
}

main().catch(console.error);
