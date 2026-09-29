/**
 * Strict Native UI Enforcement Script
 * 
 * Verifies that zero native browser UI controls remain across the codebase.
 * Enforces custom components adhering strictly to design system semantic tokens.
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../src');

// Explicit allowlist for justified exceptions
const ALLOWLIST = [
  {
    file: 'src/components/ui/ImageUpload.tsx',
    pattern: /type=["']file["']/,
    reason: 'Underlying invisible file input (className="hidden") triggered programmatically by custom UI button/dropzone.'
  },
  {
    file: 'src/components/ui/FileUpload.tsx',
    pattern: /type=["']file["']/,
    reason: 'Underlying invisible file input (className="hidden") triggered programmatically by custom UI button/dropzone.'
  }
];

let totalViolations = 0;
const violationsList = [];

function scanFile(filePath) {
  const relPath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Strip multi-line block comments and single line comments for pure code analysis
  const sanitizedContent = content
    .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length)) // preserve offsets/line breaks
    .replace(/\/\/.*$/gm, (m) => ' '.repeat(m.length));

  const lines = sanitizedContent.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (!trimmed) return;

    // 1. Raw <select (lowercase, native tag)
    if (/<select\b/.test(line)) {
      addViolation(relPath, lineNum, line, 'Raw <select> element found. Use custom <Select> component.');
    }

    // 2. Raw <option (lowercase, native tag)
    if (/<option\b/.test(line)) {
      addViolation(relPath, lineNum, line, 'Raw <option> element found. Use custom <Select> options.');
    }

    // 3. Raw <datalist (lowercase, native tag)
    if (/<datalist\b/.test(line)) {
      addViolation(relPath, lineNum, line, 'Raw <datalist> element found. Use custom <Select> or Combobox.');
    }

    // 4. Raw <dialog (lowercase, native tag. Headless UI is <Dialog>)
    if (/<dialog\b/.test(line)) {
      addViolation(relPath, lineNum, line, 'Raw HTML <dialog> element found. Use custom <Modal> or Headless UI <Dialog>.');
    }

    // 5. Raw <progress, <meter, <details, <summary (lowercase, native tags)
    if (/<progress\b/.test(line)) {
      addViolation(relPath, lineNum, line, 'Raw <progress> element found. Use custom Progress component.');
    }
    if (/<meter\b/.test(line)) {
      addViolation(relPath, lineNum, line, 'Raw <meter> element found. Use custom Meter/Progress component.');
    }
    if (/<details\b/.test(line)) {
      addViolation(relPath, lineNum, line, 'Raw <details> element found. Use custom Disclosure/Accordion.');
    }
    if (/<summary\b/.test(line)) {
      addViolation(relPath, lineNum, line, 'Raw <summary> element found. Use custom Disclosure/Accordion.');
    }

    // 6. Prohibited input types on native <input>
    // Matches: <input ... type="date" or multiline input with type="..."
    const prohibitedTypes = ['date', 'time', 'datetime-local', 'month', 'week', 'number', 'color', 'range', 'file'];
    for (const t of prohibitedTypes) {
      const typeRegex = new RegExp(`\\btype=["']${t}["']`, 'i');
      if (typeRegex.test(line)) {
        // Verify it's within an input context
        const isAllowlisted = ALLOWLIST.some(item =>
          relPath.endsWith(item.file) && item.pattern.test(line)
        );
        if (!isAllowlisted) {
          addViolation(relPath, lineNum, line, `Prohibited input type="${t}". Use custom input components (DatePicker, TimePicker, NumberInput, etc.).`);
        }
      }
    }

    // 7. Native window.alert, window.confirm, window.prompt
    if (/window\.(alert|confirm|prompt)\s*\(/.test(line)) {
      addViolation(relPath, lineNum, line, 'Native window dialog function called. Use useConfirm() or useToast().');
    }

    // 8. Native title= attribute on HTML elements
    // We forbid title="..." or title={...} on lowercase HTML elements (button, div, a, span, p, input, svg, etc.)
    const htmlTitleMatch = /<(?:button|a|div|span|p|input|svg|section|header|footer|li|ul|ol|table|tr|td|th)\b[^>]*\btitle=(?:["'{])/i.test(line);
    if (htmlTitleMatch) {
      addViolation(relPath, lineNum, line, 'Native title= attribute found on HTML element. Use <Tooltip> and aria-label instead.');
    }
  });

  // 9. Forms without noValidate
  const formMatches = sanitizedContent.matchAll(/<form\b([\s\S]*?)>/gi);
  for (const match of formMatches) {
    const formTag = match[0];
    if (!/noValidate/i.test(formTag)) {
      const index = match.index || 0;
      const lineNum = content.slice(0, index).split('\n').length;
      addViolation(relPath, lineNum, formTag.split('\n')[0], '<form> missing noValidate attribute. Browser validation bubbles must be suppressed.');
    }
  }
}

function addViolation(file, line, code, message) {
  totalViolations++;
  violationsList.push({ file, line, code: code.trim(), message });
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      scanFile(fullPath);
    }
  }
}

console.log('🔍 Scanning src/ for native browser UI controls and violations...\n');
walkDir(SRC_DIR);

if (totalViolations === 0) {
  console.log('✅ ALL CHECKS PASSED: 0 native browser UI controls found!');
  console.log(`🛡️  Allowlist active: ${ALLOWLIST.length} permitted rule (hidden file input in ImageUpload).`);
  process.exit(0);
} else {
  console.error(`❌ VIOLATIONS DETECTED: ${totalViolations} native UI issues found:\n`);
  violationsList.forEach(v => {
    console.error(`  [${v.file}:${v.line}] ${v.message}`);
    console.error(`    Code: ${v.code}\n`);
  });
  process.exit(1);
}
