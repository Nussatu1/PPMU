const puppeteer = require('puppeteer-core');

async function findMatch() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  const pages = ['/structures', '/admins', '/users', '/roles', '/reports', '/programs', '/tasks'];
  for (const p of pages) {
    await page.goto('http://localhost:5173' + p, { waitUntil: 'networkidle0' });
    const match = await page.evaluate(() => {
      const allCombos = Array.from(document.querySelectorAll('button[role="combobox"]'));
      const found = allCombos.find(b => b.innerText.includes('Ketua') || b.id.includes('7c'));
      return found ? { id: found.id, text: found.innerText } : null;
    });
    if (match) {
      console.log('MATCH ON ' + p + ':', match);
    }
  }
  await browser.close();
}

findMatch().catch(console.error);
