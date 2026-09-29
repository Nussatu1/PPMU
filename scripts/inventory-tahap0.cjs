// scripts/inventory-tahap0.cjs
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BRAVE_PATH = 'C:\\Users\\MULTIMEDIA\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';

const srcDir = path.join(__dirname, '..', 'src');

function getAllFiles(dir, exts = ['.ts', '.tsx', '.css', '.html']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, exts));
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

const files = getAllFiles(srcDir);

// 1. Static Scan
const inventory = {
  selectOption: [],
  specialInputs: [],
  nativeCheckboxesRadios: [],
  alertsConfirmsDialogs: [],
  titleAttributes: [],
  formsWithoutNoValidate: [],
  detailsSummaryProgressMeter: [],
  overflowTextareaResize: [],
  cssTargetPatterns: [],
};

const regexPatterns = {
  select: /<select\b/i,
  option: /<option\b/i,
  datalist: /<datalist\b/i,
  multiple: /\bmultiple\b/i,
  dateInput: /<input[^>]+type=["'](?:date|time|datetime-local|month|week|number|file|color|range|search|password)["']/i,
  nativeCheckbox: /<input[^>]+type=["'](?:checkbox|radio)["'](?![^>]*class(?:Name)?=["'][^"']*appearance-none)/i,
  alertConfirm: /\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/,
  dialogTag: /<dialog\b/i,
  titleAttr: /\btitle=["'{][^"'}]+["'}]/,
  formTag: /<form\b(?![^>]*noValidate)/i,
  detailsProgress: /<(?:details|summary|progress|meter)\b/i,
  textareaResize: /<textarea\b(?![^>]*resize-none)/i,
};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const relPath = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // 1. Select, Option, Datalist, multiple
    if (regexPatterns.select.test(line) || regexPatterns.option.test(line) || regexPatterns.datalist.test(line)) {
      inventory.selectOption.push({ file: relPath, line: lineNum, text: line.trim() });
    }

    // 2. Restricted Input Types
    const inputMatch = line.match(/<input[^>]+type=["'](date|time|datetime-local|month|week|number|file|color|range|search|password)["']/i);
    if (inputMatch) {
      inventory.specialInputs.push({ file: relPath, line: lineNum, type: inputMatch[1], text: line.trim() });
    }

    // 3. Native checkbox / radio
    if (regexPatterns.nativeCheckbox.test(line)) {
      inventory.nativeCheckboxesRadios.push({ file: relPath, line: lineNum, text: line.trim() });
    }

    // 4. Alert, Confirm, Prompt, <dialog
    if (regexPatterns.alertConfirm.test(line) || regexPatterns.dialogTag.test(line)) {
      inventory.alertsConfirmsDialogs.push({ file: relPath, line: lineNum, text: line.trim() });
    }

    // 5. title= attribute
    if (regexPatterns.titleAttr.test(line)) {
      // Exclude tests or comments or document.title
      if (!line.includes('document.title') && !line.includes('title:') && !line.includes('title=')) {
        // match JSX title="..."
      }
      const titleMatch = line.match(/\btitle=(["'{][^"'}]+["'}])/);
      if (titleMatch) {
        inventory.titleAttributes.push({ file: relPath, line: lineNum, title: titleMatch[1], text: line.trim() });
      }
    }

    // 6. Form without noValidate
    if (regexPatterns.formTag.test(line)) {
      inventory.formsWithoutNoValidate.push({ file: relPath, line: lineNum, text: line.trim() });
    }

    // 7. details, summary, progress, meter
    if (regexPatterns.detailsProgress.test(line)) {
      inventory.detailsSummaryProgressMeter.push({ file: relPath, line: lineNum, text: line.trim() });
    }

    // 8. Textarea without resize-none
    if (line.includes('<textarea') && !line.includes('resize-none')) {
      inventory.overflowTextareaResize.push({ file: relPath, line: lineNum, text: line.trim() });
    }
  });

  // 9. CSS checks
  if (file.endsWith('.css')) {
    ['accent-color', '::-webkit-calendar-picker-indicator', ':-webkit-autofill', 'color-scheme', '::selection', 'scrollbar-'].forEach(k => {
      if (content.includes(k)) {
        inventory.cssTargetPatterns.push({ file: relPath, key: k });
      }
    });
  }
});

// Run Puppeteer runtime scan
(async () => {
  let runtimeDomResults = {};
  try {
    const browser = await puppeteer.launch({
      executablePath: BRAVE_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const routes = [
      '/',
      '/login',
      '/organizations',
      '/admins',
      '/roles',
      '/audit-logs',
      '/structures',
      '/programs',
      '/agendas',
      '/performance',
      '/finance',
      '/reports',
      '/tasks',
      '/users',
      '/posts',
    ];

    for (const route of routes) {
      try {
        await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle2', timeout: 8000 });
        const domInfo = await page.evaluate(() => {
          const selects = Array.from(document.querySelectorAll('select')).map(s => ({
            name: s.name,
            id: s.id,
            optionsCount: s.options.length,
            className: s.className,
          }));
          const nativeInputs = Array.from(document.querySelectorAll('input')).map(i => ({
            type: i.type,
            id: i.id,
            name: i.name,
            className: i.className,
          })).filter(i => ['date', 'time', 'datetime-local', 'month', 'week', 'number', 'file', 'color', 'range', 'search', 'password'].includes(i.type));
          const titles = Array.from(document.querySelectorAll('[title]')).map(el => ({
            tag: el.tagName.toLowerCase(),
            title: el.getAttribute('title'),
            id: el.id,
            className: el.className,
          }));
          const forms = Array.from(document.querySelectorAll('form')).map(f => ({
            noValidate: f.noValidate,
            id: f.id,
          }));
          const dialogs = document.querySelectorAll('dialog').length;
          const details = document.querySelectorAll('details').length;
          return { selects, nativeInputs, titles, forms, dialogs, details };
        });
        runtimeDomResults[route] = domInfo;
      } catch (e) {
        runtimeDomResults[route] = { error: e.message };
      }
    }
    await browser.close();
  } catch (err) {
    console.error('Puppeteer scan error:', err);
  }

  const output = {
    staticInventory: inventory,
    runtimeDomResults,
  };

  fs.writeFileSync(path.join(__dirname, 'inventory-results.json'), JSON.stringify(output, null, 2));
  console.log('Inventory saved to scripts/inventory-results.json');
})();
