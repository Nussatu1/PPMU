#!/usr/bin/env node
// scripts/check-theme.cjs
// Memvalidasi kepatuhan tema di src/components, src/pages, dan src/layouts:
// - Gagal jika ditemukan kelas palet mentah tanpa token semantic
// - Gagal jika ditemukan hardcoded hex/rgb/hsl di luar variabel --fi-* / token
// - Gagal jika ada !important pada aturan warna
//
// Pengecualian didaftarkan secara eksplisit beserta alasannya:

const EXCEPTIONS = [
  // 1. Aksen amber brand Filament (tetap di kedua tema)
  { pattern: /\bamber-/, reason: 'Aksen amber adalah warna primer brand Filament — konsisten di light & dark mode' },
  { pattern: /stopColor=["']#(?:f59e0b|b45309|d97706|ffffff)["']/, reason: 'Gradient stop SVG Logo Filament (Amber Diamond) — brand visual asset' },
  { pattern: /stroke=["']#(?:b45309|d97706)["']/, reason: 'Stroke SVG Logo Filament (Amber Diamond) — brand visual asset' },
  { pattern: /stroke=["']rgba\(255,\s*255,\s*255,\s*0\.4\)["']/, reason: 'Stroke SVG Logo Filament highlight — brand visual asset' },
  { pattern: /fill=["']white["']/, reason: 'Inner facet SVG Logo Filament — brand visual asset' },

  // 2. Status semantik (Success / Danger / Info / Warning)
  { pattern: /\b(emerald|red|blue|rose|green|sky|violet|purple)-/, reason: 'Warna state semantik (sukses, bahaya, info) konsisten di kedua mode' },

  // 3. Modal / Drawer Overlay Backdrop
  { pattern: /bg-(?:zinc|gray)-950\/\d+/, reason: 'Modal and Drawer overlay backdrop semi-transparan (backdrop-blur)' },

  // 4. Token CSS Variables
  { pattern: /var\(--fi-/, reason: 'Pemanggilan token CSS variable resmi Filament' },
  { pattern: /var\(--color-/, reason: 'Pemanggilan token Tailwind CSS @theme inline' },

  // 5. SVG checkmarks & native icons
  { pattern: /inset 1em 1em white/, reason: 'Checkbox custom SVG mark shadow' },
  { pattern: /stop offset=/, reason: 'SVG gradient stop offset definition' },

  // 6. Recharts SVG axis tick labels
  { pattern: /fill: (?:isDark \? "#a1a1aa" : "#6b7280"|"#a1a1aa"|"#6b7280")/, reason: 'Recharts SVG axis tick labels text fill (SVG 1.1 compliant hex)' },
  // 7. SVG Sparkline chart data
  { pattern: /spark(?:Stroke|Fill):/, reason: 'Nilai warna vector stroke dan fill data sparkline SVG' },
  // 8. Toggle switch knob thumb
  { pattern: /toggle-thumb/, reason: 'Toggle switch knob is white in both themes for high contrast on track' },
  // 9. Radio button checked center dot
  { pattern: /\bradio-dot\b/, reason: 'Radio checked center dot is white in both themes per DESIGN_SYSTEM.md' }
];

const fs = require('fs');
const path = require('path');

// Aturan pelanggaran yang dicari
const VIOLATION_RULES = [
  {
    name: 'Raw palette class (bg-white/bg-black tanpa token)',
    regex: /(?<!dark:)\b(bg-white|bg-black)\b(?!\/)/,
    fix: 'Ganti dengan token semantik bg-surface, bg-sidebar, atau bg-surface-muted'
  },
  {
    name: 'Hardcoded Hex color',
    regex: /#[0-9a-fA-F]{3,6}\b/,
    fix: 'Gunakan token semantik atau token CSS variable --fi-*'
  },
  {
    name: 'Hardcoded rgb( tanpa var()',
    regex: /\brgb\((?!var\()/,
    fix: 'Gunakan token semantik atau CSS variable --fi-*'
  },
  {
    name: 'Hardcoded rgba( tanpa var()',
    regex: /\brgba\((?!var\()/,
    fix: 'Gunakan token semantik atau CSS variable --fi-*'
  },
  {
    name: 'Color !important',
    regex: /!(?:bg|text|border)-/,
    fix: 'Hapus !important pada warna agar hierarki layer CSS tidak rusak'
  }
];

function walkSync(dir) {
  if (!fs.existsSync(dir)) return [];
  let files = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      files = files.concat(walkSync(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      files.push(fullPath);
    }
  });
  return files;
}

function isException(line) {
  return EXCEPTIONS.some(e => e.pattern.test(line));
}

const targetDirs = ['src/components', 'src/pages', 'src/layouts', 'src/context'].filter(d => fs.existsSync(d));
const allFiles = targetDirs.flatMap(walkSync);

let totalViolations = 0;
const violationReport = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const fileViolations = [];

  lines.forEach((line, i) => {
    if (isException(line)) return;

    VIOLATION_RULES.forEach(rule => {
      if (rule.regex.test(line)) {
        fileViolations.push({
          lineNum: i + 1,
          rule: rule.name,
          fix: rule.fix,
          content: line.trim().slice(0, 100),
        });
        totalViolations++;
      }
    });
  });

  if (fileViolations.length > 0) {
    const relPath = path.relative(process.cwd(), file);
    violationReport.push({ file: relPath, violations: fileViolations });
  }
});

if (totalViolations === 0) {
  console.log('\n[PASS] check:theme — Tidak ada pelanggaran tema ditemukan.');
  console.log(`Diperiksa ${allFiles.length} file di ${targetDirs.join(', ')}.`);
  process.exit(0);
} else {
  console.error(`\n[FAIL] check:theme — ${totalViolations} pelanggaran ditemukan di ${violationReport.length} file:\n`);
  violationReport.forEach(({ file, violations }) => {
    console.error(`File: ${file} (${violations.length} pelanggaran)`);
    violations.forEach(v => {
      console.error(`  L${v.lineNum} [${v.rule}]: ${v.content}`);
      console.error(`         Saran: ${v.fix}`);
    });
    console.error('');
  });
  process.exit(1);
}
