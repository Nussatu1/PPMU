// scripts/measure-tahap0.cjs
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BRAVE_PATH = 'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const ARTIFACT_DIR = 'C:\\Users\\MULTIMEDIA\\.gemini\\antigravity-ide\\brain\\c316c718-611b-4abc-a8f5-0c0a170789af';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: BRAVE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Visit Dashboard on dev server
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });

  async function inspect(label) {
    return await page.evaluate((label) => {
      const isDark = document.documentElement.classList.contains('dark');
      const htmlClass = document.documentElement.className;
      
      function getInfo(selector, name) {
        const el = document.querySelector(selector);
        if (!el) return { name, selector, found: false };
        const cs = window.getComputedStyle(el);
        return {
          name,
          selector,
          found: true,
          tagName: el.tagName,
          className: typeof el.className === 'string' ? el.className.slice(0, 100) : '',
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          borderColor: cs.borderColor
        };
      }

      return {
        label,
        isDark,
        htmlClass,
        elements: [
          getInfo('aside', 'Sidebar'),
          getInfo('div.grid.grid-cols-1 > div, [class*="rounded-xl"][class*="border"]', 'Card Pertama (Stat Card)'),
          getInfo('div.h-72', 'Chart Container'),
          getInfo('table', 'Table (Latest Orders)'),
          getInfo('th', 'Header Kolom Tabel'),
          getInfo('h3, h2', 'Judul Card Widget'),
          getInfo('a[href*="products"], button', 'Tombol Navigasi / Aksi')
        ]
      };
    }, label);
  }

  // Initial measurement
  console.log('--- 1. PENGUKURAN AWAL (INITIAL LOAD) ---');
  let data1 = await inspect('Initial');
  console.log(JSON.stringify(data1, null, 2));

  // Toggle Dark Mode via UI button
  console.log('--- 2. TOGGLE DARK MODE ---');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const themeBtn = buttons.find(b => b.title?.includes('Gelap') || b.title?.includes('Terang') || b.title?.includes('mode') || b.innerHTML.includes('lucide-sun') || b.innerHTML.includes('lucide-moon') || b.querySelector('svg'));
    // Specifically find the button in the topbar that toggles theme
    const topbarBtns = Array.from(document.querySelectorAll('header button, .fi-topbar button, button[aria-label*="mode"], button[title*="mode"]'));
    if (topbarBtns.length > 0) {
      topbarBtns[topbarBtns.length - 1].click();
    } else {
      localStorage.setItem('filament_theme', 'dark');
      document.documentElement.classList.add('dark');
    }
  });

  // Ensure dark class is present
  await page.evaluate(() => {
    localStorage.setItem('filament_theme', 'dark');
    document.documentElement.classList.add('dark');
  });

  await new Promise(r => setTimeout(r, 1000));
  let data2 = await inspect('After Toggle Dark');
  console.log(JSON.stringify(data2, null, 2));

  // Take Screenshot: Dashboard Dark
  const dashDarkPath = path.join(ARTIFACT_DIR, 'dashboard_dark.png');
  await page.screenshot({ path: dashDarkPath, fullPage: false });
  console.log('Saved screenshot:', dashDarkPath);

  // 3. Hard reload (Ctrl+Shift+R) and wait 3s
  console.log('--- 3. PENGUKURAN SETELAH REFRESH KERAS (3 DETIK) ---');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  let data3 = await inspect('After Hard Reload');
  console.log(JSON.stringify(data3, null, 2));

  // 4. CDP Matched Styles for Sidebar & Card
  const client = await page.target().createCDPSession();
  await client.send('DOM.enable');
  await client.send('CSS.enable');

  const rootDoc = await client.send('DOM.getDocument');
  const asideNode = await client.send('DOM.querySelector', { nodeId: rootDoc.root.nodeId, selector: 'aside' });
  if (asideNode && asideNode.nodeId) {
    const matched = await client.send('CSS.getMatchedStylesForNode', { nodeId: asideNode.nodeId });
    console.log('--- CDP MATCHED STYLES FOR ASIDE (SIDEBAR) ---');
    const bgRules = matched.matchedCSSRules.filter(r => 
      r.rule.style.cssProperties.some(p => p.name.includes('background') || p.name.includes('color'))
    ).map(r => ({
      selector: r.rule.selectorList.text,
      origin: r.rule.origin,
      properties: r.rule.style.cssProperties.map(p => ({
        name: p.name,
        value: p.value,
        important: !!p.important
      }))
    }));
    console.log(JSON.stringify(bgRules.slice(0, 5), null, 2));
  }

  // 5. Emulasi prefers-color-scheme
  console.log('--- 5. EMULASI PREFERS-COLOR-SCHEME ---');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  const lightOS = await inspect('OS Light + App Dark');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  const darkOS = await inspect('OS Dark + App Dark');
  console.log('OS Light match:', lightOS.elements.map(e => ({ name: e.name, bg: e.backgroundColor })));
  console.log('OS Dark match:', darkOS.elements.map(e => ({ name: e.name, bg: e.backgroundColor })));

  // 6. Navigate to Products page and measure
  console.log('--- 6. PRODUK PAGE (DARK MODE) ---');
  await page.goto('http://localhost:5173/products', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  const productsInspect = await page.evaluate(() => {
    function c(sel, name) {
      const el = document.querySelector(sel);
      if (!el) return { name, found: false };
      const s = window.getComputedStyle(el);
      return {
        name,
        found: true,
        tag: el.tagName,
        class: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
        bg: s.backgroundColor,
        color: s.color,
        border: s.borderColor
      };
    }
    return [
      c('aside', 'Sidebar'),
      c('a[href*="/products/create"], button:has(svg)', 'Tombol Tambah Produk'),
      c('th', 'Header Kolom Tabel'),
      c('table', 'Tabel Produk'),
      c('h1, h2, h3', 'Judul Halaman / Section')
    ];
  });
  console.log('Products Page Elements (Dark):', JSON.stringify(productsInspect, null, 2));

  // Take Screenshot: Products Dark
  const prodDarkPath = path.join(ARTIFACT_DIR, 'products_dark.png');
  await page.screenshot({ path: prodDarkPath, fullPage: false });
  console.log('Saved screenshot:', prodDarkPath);

  // 7. Toggle to Light Mode & Take Screenshots
  console.log('--- 7. LIGHT MODE SCREENSHOTS & MEASUREMENTS ---');
  await page.evaluate(() => {
    localStorage.setItem('filament_theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise(r => setTimeout(r, 500));
  const prodLightPath = path.join(ARTIFACT_DIR, 'products_light.png');
  await page.screenshot({ path: prodLightPath, fullPage: false });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const dashLightPath = path.join(ARTIFACT_DIR, 'dashboard_light.png');
  await page.screenshot({ path: dashLightPath, fullPage: false });
  console.log('Light mode screenshots saved.');

  // 8. Scanning Luminance & Contrast
  console.log('--- 8. SCANNING LUMINANCE & CONTRAST IN DARK MODE ---');
  await page.evaluate(() => {
    localStorage.setItem('filament_theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await new Promise(r => setTimeout(r, 500));

  const scanResult = await page.evaluate(() => {
    function parseRgb(colorStr) {
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return null;
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }

    function getRelativeLuminance(rgb) {
      const [r, g, b] = rgb.map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    const allElements = Array.from(document.querySelectorAll('*'));
    let scanned = 0;
    const luminanceViolations = [];

    for (const el of allElements) {
      // Check visible elements
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;

      scanned++;
      const rgb = parseRgb(cs.backgroundColor);
      if (rgb && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const lum = getRelativeLuminance(rgb);
        // Exclude amber badges / buttons / status badges
        const isAmber = el.closest('button, .bg-amber-500, a[href*="create"]') || cs.backgroundColor.includes('245, 158, 11');
        if (lum > 0.6 && !isAmber) {
          luminanceViolations.push({
            tag: el.tagName,
            class: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
            bg: cs.backgroundColor,
            lum: lum.toFixed(3)
          });
        }
      }
    }
    return { scanned, luminanceViolations: luminanceViolations.slice(0, 10) };
  });

  console.log('LUMINANCE SCAN RESULT:', JSON.stringify(scanResult, null, 2));

  await browser.close();
  console.log('All tests and measurements finished successfully.');
})();
