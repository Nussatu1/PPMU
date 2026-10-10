const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATHS = [
  'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

async function testSingleHtml() {
  const executablePath = CHROME_PATHS.find(p => fs.existsSync(p));
  if (!executablePath) {
    console.error('No browser executable found!');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('pageerror', err => {
    errors.push('PAGE_ERROR: ' + err.toString());
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push('CONSOLE_ERROR: ' + msg.text());
    }
  });

  console.log('Navigating to http://localhost:4174 ...');
  await page.goto('http://localhost:4174', { waitUntil: 'networkidle0', timeout: 15000 });

  const pageTitle = await page.title();
  console.log('Page Title:', pageTitle);

  // Check URL hash
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  // Check root element children
  const hasAppContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      childrenCount: root ? root.children.length : 0,
      innerTextSnippet: root ? root.innerText.substring(0, 150) : '',
    };
  });
  console.log('App Content State:', hasAppContent);

  // Test navigation via hash
  console.log('Testing Navigation to #/organizations...');
  await page.goto('http://localhost:4174/#/organizations', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const orgTitle = await page.evaluate(() => document.body.innerText.substring(0, 100));
  console.log('Organizations Page Snippet:', orgTitle.replace(/\n+/g, ' '));

  console.log('Testing Navigation to #/finance...');
  await page.goto('http://localhost:4174/#/finance', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const finSnippet = await page.evaluate(() => document.body.innerText.substring(0, 100));
  console.log('Finance Page Snippet:', finSnippet.replace(/\n+/g, ' '));

  console.log('Testing Navigation to #/tasks...');
  await page.goto('http://localhost:4174/#/tasks', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const taskSnippet = await page.evaluate(() => document.body.innerText.substring(0, 100));
  console.log('Tasks Page Snippet:', taskSnippet.replace(/\n+/g, ' '));

  console.log('Errors encountered:', errors.length);
  errors.forEach(e => console.log('  ', e));

  await browser.close();
  console.log('TEST COMPLETED SUCCESSFULLY');
}

testSingleHtml().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});
