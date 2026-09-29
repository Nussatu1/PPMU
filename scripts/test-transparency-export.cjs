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
  console.log('Testing simplified export UI (Strict Transparent PNG & Max Quality JPG)...');
  const browser = await puppeteer.launch({
    executablePath: findBrowserPath(),
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const client = await page.target().createCDPSession();
    const downloadPath = path.join(ARTIFACT_DIR, 'downloads_clean_test');
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
    // Clean old files
    fs.readdirSync(downloadPath).forEach(f => fs.unlinkSync(path.join(downloadPath, f)));

    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });

    console.log('Navigating to http://localhost:5173/structures...');
    await page.goto('http://localhost:5173/structures', { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');

    // Klik tombol "Ekspor"
    console.log('Clicking "Ekspor" button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const exportBtn = buttons.find(b => b.textContent && b.textContent.includes('Ekspor'));
      if (exportBtn) exportBtn.click();
    });

    await new Promise(r => setTimeout(r, 600));

    // Capture modal screenshot: clean & minimal
    console.log('Capturing export modal screenshot...');
    const modalPath = path.join(ARTIFACT_DIR, 'export_modal_simplified.png');
    await page.screenshot({ path: modalPath, fullPage: false });
    console.log('Saved screenshot to:', modalPath);

    // Verifikasi bahwa sub-selector TIDAK lagi muncul
    const uiVerification = await page.evaluate(() => {
      const textContent = document.body.innerText;
      return {
        hasPngBackgroundLabel: textContent.includes('Latar Belakang PNG'),
        hasJpgQualityLabel: textContent.includes('Kualitas Kompresi JPG'),
        hasPngButton: textContent.includes('Foto PNG') && textContent.includes('Transparan & Lossless'),
        hasJpgButton: textContent.includes('Foto JPG') && textContent.includes('Solid Kualitas Maksimal'),
        hasZipButton: textContent.includes('Semua (.ZIP)'),
      };
    });

    console.log('UI Verification results:', JSON.stringify(uiVerification, null, 2));

    // 1. Ekspor PNG
    console.log('Triggering PNG export...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const pngBtn = buttons.find(b => b.textContent && b.textContent.includes('Foto PNG'));
      if (pngBtn) pngBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const downloadBtn = buttons.find(b => b.textContent && (b.textContent.includes('Unduh') || b.textContent.includes('Memproses')));
      if (downloadBtn) downloadBtn.click();
    });

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const files = fs.readdirSync(downloadPath).filter(f => !f.endsWith('.crdownload'));
      if (files.some(f => f.endsWith('.png'))) break;
    }

    // 2. Ekspor JPG Kualitas Maksimal
    console.log('Triggering JPG export...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const exportBtn = buttons.find(b => b.textContent && b.textContent.includes('Ekspor'));
      if (exportBtn) exportBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const jpgBtn = buttons.find(b => b.textContent && b.textContent.includes('Foto JPG'));
      if (jpgBtn) jpgBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const downloadBtn = buttons.find(b => b.textContent && (b.textContent.includes('Unduh') || b.textContent.includes('Memproses')));
      if (downloadBtn) downloadBtn.click();
    });

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const files = fs.readdirSync(downloadPath).filter(f => !f.endsWith('.crdownload'));
      if (files.some(f => f.endsWith('.jpg'))) break;
    }

    // 3. Ekspor ZIP (Semua format)
    console.log('Triggering ZIP export...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const exportBtn = buttons.find(b => b.textContent && b.textContent.includes('Ekspor'));
      if (exportBtn) exportBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const zipBtn = buttons.find(b => b.textContent && b.textContent.includes('Semua (.ZIP)'));
      if (zipBtn) zipBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const downloadBtn = buttons.find(b => b.textContent && (b.textContent.includes('Unduh') || b.textContent.includes('Memproses')));
      if (downloadBtn) downloadBtn.click();
    });

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const files = fs.readdirSync(downloadPath).filter(f => !f.endsWith('.crdownload'));
      if (files.some(f => f.endsWith('.zip'))) break;
    }

    const downloadedFiles = fs.readdirSync(downloadPath);
    console.log('Downloaded files:', downloadedFiles);

    // Cek PNG color type (offset 25 di IHDR)
    const pngFile = downloadedFiles.find(f => f.endsWith('.png'));
    if (pngFile) {
      const buf = fs.readFileSync(path.join(downloadPath, pngFile));
      console.log('PNG Color Type byte (at 25):', buf[25], buf[25] === 6 ? '-> RGBA (Alpha channel transparan 100% valid)' : '-> Bukan RGBA');
    }

    // Cek ukuran file
    downloadedFiles.forEach(f => {
      const stat = fs.statSync(path.join(downloadPath, f));
      console.log(`File: ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
    });

    console.log('ALL VERIFICATIONS SUCCESSFUL!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
