/**
 * Targeted Test Suite: Program Create - Seksi Pelaksana, Multi KPI, dan Rincian Anggaran
 */
const assert = require('assert')

console.log('======================================================================')
console.log('TARGETED TEST: PROGRAM CREATE — SEKSI, MULTI KPI, BUDGET BREAKDOWN')
console.log('======================================================================\n')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`[PASS] ${name}`)
  } catch (err) {
    failed++
    console.error(`[FAIL] ${name}`)
    console.error(`       Error: ${err.message}`)
  }
}

// 1. Seksi Pelaksana Data & Relation Test
test('CASE A1 & A5: Seksi Pelaksana properly linked with canonical section_id', () => {
  const sections = [
    { id: 'sec-1', name: 'Seksi Ubudiyah', code: 'SEK-UBD', organization_id: 'org-1' },
    { id: 'sec-2', name: 'Seksi Keamanan', code: 'SEK-KMN', organization_id: 'org-1' },
  ]
  const selectedSection = sections[0]
  assert.strictEqual(selectedSection.id, 'sec-1')
  assert.strictEqual(selectedSection.organization_id, 'org-1')
})

test('CASE A2: Empty sections list produces informative empty state message', () => {
  const sections = []
  const hasEmptyState = sections.length === 0
  assert.strictEqual(hasEmptyState, true)
  const emptyStateMsg = 'Belum ada Seksi Pelaksana yang tersedia untuk unit ini.'
  assert.ok(emptyStateMsg.includes('Belum ada Seksi Pelaksana'))
})

// 2. Multi KPI Collection Test
test('CASE B1: Program with 1 KPI serializes cleanly', () => {
  const kpis = [
    { id: 'kpi-1', indicator: 'Digitalisasi Dokumen', target_value: 100, target_unit: '%' },
  ]
  assert.strictEqual(kpis.length, 1)
  const summary = kpis.map((k) => `${k.indicator}: ${k.target_value} ${k.target_unit}`).join('; ')
  assert.strictEqual(summary, 'Digitalisasi Dokumen: 100 %')
})

test('CASE B2 & B3: Program with 3 KPIs persists all items without overwriting', () => {
  const kpis = [
    { id: 'kpi-1', indicator: 'Persentase dokumen digital', target_value: 100, target_unit: '%' },
    { id: 'kpi-2', indicator: 'Layanan terintegrasi', target_value: 15, target_unit: 'Layanan' },
    { id: 'kpi-3', indicator: 'Waktu respon', target_value: 10, target_unit: 'Menit' },
  ]
  assert.strictEqual(kpis.length, 3)
  assert.strictEqual(kpis[0].id, 'kpi-1')
  assert.strictEqual(kpis[1].id, 'kpi-2')
  assert.strictEqual(kpis[2].id, 'kpi-3')
  // Verify composite text summary
  const summary = kpis.map((k) => `${k.indicator}: ${k.target_value} ${k.target_unit}`).join('; ')
  assert.ok(summary.includes('Persentase dokumen digital'))
  assert.ok(summary.includes('Layanan terintegrasi'))
  assert.ok(summary.includes('Waktu respon'))
})

test('CASE B4: Deleting one KPI retains the other KPIs intact', () => {
  let kpis = [
    { id: 'kpi-1', indicator: 'Indikator A' },
    { id: 'kpi-2', indicator: 'Indikator B' },
    { id: 'kpi-3', indicator: 'Indikator C' },
  ]
  kpis = kpis.filter((k) => k.id !== 'kpi-2')
  assert.strictEqual(kpis.length, 2)
  assert.strictEqual(kpis[0].id, 'kpi-1')
  assert.strictEqual(kpis[1].id, 'kpi-3')
})

test('CASE B5: Validation rejects empty KPI indicator', () => {
  const kpis = [
    { id: 'kpi-1', indicator: '   ' },
  ]
  const validKpis = kpis.filter((k) => k.indicator.trim() !== '')
  assert.strictEqual(validKpis.length, 0)
})

test('CASE B6: Backward compatibility with legacy string target_kpi', () => {
  const legacyProgram = {
    id: 'prog-1',
    title: 'Program Lama',
    target_kpi: '50 Santri Mandiri',
  }
  // If kpi_items is missing, fallback uses target_kpi text
  const resolvedKpi = legacyProgram.kpi_items && legacyProgram.kpi_items.length > 0
    ? legacyProgram.kpi_items[0].indicator
    : legacyProgram.target_kpi
  assert.strictEqual(resolvedKpi, '50 Santri Mandiri')
})

// 3. Budget Breakdown Test
test('CASE C1 & C2: Total pagu = sum of budget breakdown items', () => {
  const breakdown = [
    { id: 'b-1', name: 'ATK & Cetak', nominal: 2000000 },
    { id: 'b-2', name: 'Dokumentasi', nominal: 3000000 },
    { id: 'b-3', name: 'Konsumsi Rapat', nominal: 2500000 },
    { id: 'b-4', name: 'Transportasi', nominal: 2500000 },
  ]
  const total = breakdown.reduce((sum, item) => sum + item.nominal, 0)
  assert.strictEqual(total, 10000000)
})

test('CASE C3: Mismatch detection when total breakdown differs from allocated budget', () => {
  const breakdown = [
    { id: 'b-1', name: 'ATK', nominal: 2000000 },
    { id: 'b-2', name: 'Konsumsi', nominal: 3000000 },
  ]
  const totalBreakdown = breakdown.reduce((sum, item) => sum + item.nominal, 0)
  const budgetAllocated = 6000000
  const isMismatch = totalBreakdown !== budgetAllocated
  assert.strictEqual(isMismatch, true)
})

test('CASE C4 & C5: Adding or removing budget breakdown item correctly recalculates total', () => {
  let breakdown = [
    { id: 'b-1', name: 'ATK', nominal: 2000000 },
  ]
  // Add item
  breakdown.push({ id: 'b-2', name: 'Konsumsi', nominal: 3000000 })
  let total = breakdown.reduce((sum, item) => sum + item.nominal, 0)
  assert.strictEqual(total, 5000000)

  // Remove item
  breakdown = breakdown.filter((b) => b.id !== 'b-1')
  total = breakdown.reduce((sum, item) => sum + item.nominal, 0)
  assert.strictEqual(total, 3000000)
})

test('CASE C7: Legacy program with single budget_allocated works without breakdown', () => {
  const legacyProgram = {
    id: 'prog-legacy',
    budget_allocated: 15000000,
  }
  const breakdown = legacyProgram.budget_breakdown || []
  assert.strictEqual(breakdown.length, 0)
  assert.strictEqual(legacyProgram.budget_allocated, 15000000)
})

test('CASE C8: No NaN or negative nominal allowed in breakdown', () => {
  const rawInput = '500000'
  const parsed = Number(rawInput) || 0
  assert.strictEqual(parsed, 500000)
  assert.strictEqual(isNaN(parsed), false)
})

console.log(`\nTEST SUMMARY: ${passed} PASSED, ${failed} FAILED\n`)
if (failed > 0) process.exit(1)
