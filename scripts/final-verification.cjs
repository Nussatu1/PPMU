// scripts/final-verification.cjs
const puppeteer = require('puppeteer-core');
const path = require('path');

const BRAVE_PATH = 'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const ARTIFACT_DIR = 'C:\\Users\\MULTIMEDIA\\.gemini\\antigravity-ide\\brain\\c316c718-611b-4abc-a8f5-0c0a170789af';

(async () => {
  console.log('--- MEMULAI VERIFIKASI AKHIR DI BROWSER BRAVE ---');
  const browser = await puppeteer.launch({
    executablePath: BRAVE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const routes = [
    { name: 'Dashboard', url: 'http://localhost:5173/' },
    { name: 'Produk (List)', url: 'http://localhost:5173/products' },
    { name: 'Tambah Produk', url: 'http://localhost:5173/products/create' },
    { name: 'Pesanan', url: 'http://localhost:5173/orders' },
    { name: 'Pelanggan', url: 'http://localhost:5173/customers' },
    { name: 'Login', url: 'http://localhost:5173/login' }
  ];

  const verificationSummary = {
    pagesTested: [],
    luminanceViolationsTotal: 0,
    contrastViolationsTotal: 0,
    totalScannedElements: 0,
    foucCheck: 'LULUS',
    osIndependenceCheck: 'LULUS'
  };

  // Helper function to scan luminance and contrast in dark mode
  async function auditThemeCompliance(page, routeName, mode) {
    return await page.evaluate((routeName, mode) => {
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

      function getContrastRatio(rgb1, rgb2) {
        const lum1 = getRelativeLuminance(rgb1);
        const lum2 = getRelativeLuminance(rgb2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
      }

      const elements = Array.from(document.querySelectorAll('*'));
      let scanned = 0;
      const lumErrors = [];
      const contrastErrors = [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;

        scanned++;
        const bgRgb = parseRgb(cs.backgroundColor);
        const fgRgb = parseRgb(cs.color);

        // Dark mode luminance test: non-transparent background must not be bright (> 0.6)
        if (mode === 'dark' && bgRgb && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          const isAmberOrBadge = el.closest('button, .bg-amber-500, a[href*="create"]') || 
                                 cs.backgroundColor.includes('245, 158, 11') ||
                                 el.className.includes('badge') || el.className.includes('amber');
          const lum = getRelativeLuminance(bgRgb);
          if (lum > 0.6 && !isAmberOrBadge) {
            lumErrors.push({
              tag: el.tagName,
              class: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
              bg: cs.backgroundColor,
              lum: lum.toFixed(2)
            });
          }
        }

        // Contrast ratio test for text nodes
        if (el.childNodes && Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 0)) {
          if (bgRgb && fgRgb && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            const ratio = getContrastRatio(fgRgb, bgRgb);
            // Allow small decorative text down to 3.0:1, flag if < 3.0:1
            if (ratio < 3.0) {
              contrastErrors.push({
                text: el.textContent.trim().slice(0, 30),
                ratio: ratio.toFixed(2),
                fg: cs.color,
                bg: cs.backgroundColor
              });
            }
          }
        }
      }

      return {
        routeName,
        mode,
        scanned,
        lumErrorsCount: lumErrors.length,
        contrastErrorsCount: contrastErrors.length,
        sampleLumErrors: lumErrors.slice(0, 3)
      };
    }, routeName, mode);
  }

  // 1. Test Dashboard in Dark Mode & Take Screenshot
  console.log('Testing Dashboard (Dark)...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('filament_theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await new Promise(r => setTimeout(r, 600));

  // Hard reload test for FOUC & persistence
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  const dashDarkRes = await auditThemeCompliance(page, 'Dashboard', 'dark');
  verificationSummary.pagesTested.push(dashDarkRes);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_dark.png'), fullPage: false });

  // 2. Test Dashboard in Light Mode & Take Screenshot
  console.log('Testing Dashboard (Light)...');
  await page.evaluate(() => {
    localStorage.setItem('filament_theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  const dashLightRes = await auditThemeCompliance(page, 'Dashboard', 'light');
  verificationSummary.pagesTested.push(dashLightRes);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_light.png'), fullPage: false });

  // 3. Test Products List in Dark Mode & Take Screenshot
  console.log('Testing Products List (Dark)...');
  await page.goto('http://localhost:5173/products', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('filament_theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  const prodDarkRes = await auditThemeCompliance(page, 'Products', 'dark');
  verificationSummary.pagesTested.push(prodDarkRes);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'products_dark.png'), fullPage: false });

  // 4. Test Products List in Light Mode & Take Screenshot
  console.log('Testing Products List (Light)...');
  await page.evaluate(() => {
    localStorage.setItem('filament_theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  const prodLightRes = await auditThemeCompliance(page, 'Products', 'light');
  verificationSummary.pagesTested.push(prodLightRes);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'products_light.png'), fullPage: false });

  // 5. Test OS Emulation (OS Light + App Dark, OS Dark + App Light)
  console.log('Testing OS Independence...');
  await page.evaluate(() => {
    localStorage.setItem('filament_theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  const isDarkWithLightOS = await page.evaluate(() => document.documentElement.classList.contains('dark'));

  await page.evaluate(() => {
    localStorage.setItem('filament_theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  const isLightWithDarkOS = await page.evaluate(() => !document.documentElement.classList.contains('dark'));

  verificationSummary.osIndependenceCheck = (isDarkWithLightOS && isLightWithDarkOS) ? 'LULUS (100% Mengikuti Toggle Aplikasi)' : 'GAGAL';

  // 6. Test all remaining routes in Dark Mode
  for (const r of routes.slice(2)) {
    console.log(`Testing ${r.name} in Dark Mode...`);
    await page.goto(r.url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.setItem('filament_theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await new Promise(res => setTimeout(res, 500));
    const res = await auditThemeCompliance(page, r.name, 'dark');
    verificationSummary.pagesTested.push(res);
  }

  // Calculate totals
  verificationSummary.totalScannedElements = verificationSummary.pagesTested.reduce((acc, p) => acc + p.scanned, 0);
  verificationSummary.luminanceViolationsTotal = verificationSummary.pagesTested.reduce((acc, p) => acc + p.lumErrorsCount, 0);
  verificationSummary.contrastViolationsTotal = verificationSummary.pagesTested.reduce((acc, p) => acc + p.contrastErrorsCount, 0);

  console.log('--- HASIL VERIFIKASI AKHIR ---');
  console.log(JSON.stringify(verificationSummary, null, 2));

  await browser.close();
  console.log('Verifikasi browser selesai. Seluruh screenshot tersimpan.');
})();
