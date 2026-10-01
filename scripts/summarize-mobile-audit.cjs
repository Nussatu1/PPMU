/**
 * Prints a compact summary of .mobile-audit/report.json
 * Usage: node scripts/summarize-mobile-audit.cjs
 */
const fs = require('fs');
const path = require('path');

const report = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.mobile-audit', 'report.json'), 'utf8'));

const lines = [];
const log = (...a) => { lines.push(a.join(' ')); process.stdout.write(a.join(' ') + '\n'); };

const pad = (s, n) => String(s).padEnd(n).slice(0, n);

log(pad('ROUTE', 20), pad('OVF', 5), pad('TAPS<44', 8), pad('SMALLTXT', 9), pad('HDR', 5), 'TABLES / SCROLL WRAPS');
log('-'.repeat(110));

for (const r of report.results) {
  const tables = (r.tables || [])
    .filter((t) => t.columns > 0 || t.tableWidth > 0)
    .map((t) => `${t.columns}col/${t.wrapperClient}px->${t.tableWidth}px${t.needsHorizontalScroll ? ' SCROLL' : ''}`)
    .join(', ');
  const wraps = (r.scrollWraps || [])
    .filter((w) => w.hiddenWidth > 2)
    .map((w) => `${w.client}->${w.scroll} (+${w.hiddenWidth})`)
    .join(', ');
  log(
    pad(r.id, 20),
    pad(r.docOverflow, 5),
    pad(r.smallTargetCount, 8),
    pad(r.smallTextCount, 9),
    pad(r.headerVisible ? 'yes' : 'NO', 5),
    (tables || '-') + (wraps ? ' | wraps: ' + wraps : '')
  );
}

log('\n=== Small tap targets (unique labels, <44px) ===');
const seen = new Map();
for (const r of report.results) {
  for (const t of r.smallTargets || []) {
    const key = t.label || t.tag;
    if (!seen.has(key)) seen.set(key, { count: 0, routes: [], size: `${t.w}x${t.h}`, tag: t.tag });
    const e = seen.get(key);
    e.count++;
    e.routes.push(r.id);
  }
}
for (const [label, e] of seen) {
  log(`- "${label}" (${e.tag}, ${e.size}) on ${e.routes.length} route(s): ${Array.from(new Set(e.routes)).slice(0, 4).join(', ')}`);
}

log('\n=== Smallest text sizes (fs < 12px) ===');
const fsz = new Map();
for (const r of report.results) {
  for (const t of r.smallTexts || []) {
    if (!fsz.has(t.text)) fsz.set(t.text, t.fs);
  }
}
for (const [text, fs] of fsz) log(`- ${fs}px : "${text}"`);

log('\n=== Chrome ===');
log('headerVisible on any route:', report.results.some((r) => r.headerVisible));
log('bottomNavVisible on any route:', report.results.some((r) => r.bottomNavVisible));
log('bottom nav tabs:', JSON.stringify(report.drawerInfo && report.drawerInfo.bottomNavLabels));
log('drawer rect:', JSON.stringify(report.drawerInfo && report.drawerInfo.drawerRect));
log('picker:', JSON.stringify(report.pickerInfo));


fs.writeFileSync(path.join(__dirname, '..', '.mobile-audit', 'summary.txt'), lines.join('\n'), 'utf8');
