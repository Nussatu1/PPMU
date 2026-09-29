import ExcelJS from 'exceljs'
import type { Transaction } from '@/types/database'

export interface FinanceExportParams {
  organizationName: string
  organizationAddress: string
  city: string
  documentDate?: string
  roleTitle: string
  signeeName: string
  year: number
  mode: 'all_months' | 'single_month'
  selectedMonth?: number // 1 to 12
  includeEmptyMonths?: boolean
  transactions: Transaction[]
}

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/**
 * Mendapatkan hari terakhir dari suatu bulan (28/29/30/31)
 */
export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Membaca buffer dari template format excel keuangan di direktori public
 */
async function fetchTemplateBuffer(): Promise<ArrayBuffer> {
  const response = await fetch('/format-excel-keuangan.xlsx')
  if (!response.ok) {
    throw new Error('Gagal memuat template Excel keuangan')
  }
  return await response.arrayBuffer()
}

/**
 * Filter data transaksi per tahun dan bulan
 */
export function getMonthlyTransactions(transactions: Transaction[], year: number, month: number) {
  return transactions.filter((tx) => {
    const rawDate = tx.transaction_date || tx.date || tx.created_at
    if (!rawDate) return false
    const d = new Date(rawDate)
    return d.getFullYear() === year && d.getMonth() + 1 === month
  })
}

/**
 * Format tanggal Indonesia singkat DD/MM/YYYY
 */
function formatShortDate(rawDate?: string): string {
  if (!rawDate) return ''
  const d = new Date(rawDate)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const yr = d.getFullYear()
  return `${day}/${month}/${yr}`
}

/**
 * Mengisi satu worksheet buku kas berdasarkan data mutasi bulan tertentu
 */
function populateSheet(
  ws: ExcelJS.Worksheet,
  params: FinanceExportParams,
  monthIndex: number,
  transactions: Transaction[]
) {
  // Update Header Organisasi & Alamat (A2 & A3)
  const cellA2 = ws.getCell('A2')
  cellA2.value = params.organizationName.trim().toUpperCase()

  const cellA3 = ws.getCell('A3')
  cellA3.value = params.organizationAddress.trim()

  // Pisahkan mutasi penerimaan dan pengeluaran
  const incomes = transactions.filter((t) => t.type === 'income')
  const expenses = transactions.filter((t) => t.type !== 'income')

  // Baris data template asli adalah baris 7 s.d. 21 (15 baris slot bawaan)
  const templateStartRow = 7
  const defaultSlotCount = 15
  const neededRows = Math.max(defaultSlotCount, incomes.length, expenses.length)

  // Jika transaksi melebihi 15 baris, tambahkan baris data sebelum baris total (baris 22)
  if (neededRows > defaultSlotCount) {
    const rowsToAdd = neededRows - defaultSlotCount
    for (let r = 0; r < rowsToAdd; r++) {
      ws.insertRow(templateStartRow + defaultSlotCount + r, [], 'i')
    }
  }

  // Isi data Penerimaan (Kolom A: No, B: Tanggal, C: Uraian, D: Jumlah)
  for (let i = 0; i < neededRows; i++) {
    const rowNum = templateStartRow + i
    const tx = incomes[i]
    if (tx) {
      ws.getCell(`A${rowNum}`).value = i + 1
      ws.getCell(`B${rowNum}`).value = formatShortDate(tx.transaction_date || tx.date || tx.created_at)
      ws.getCell(`C${rowNum}`).value = tx.description || 'Penerimaan Kas'
      ws.getCell(`D${rowNum}`).value = Number(tx.amount) || 0
      ws.getCell(`D${rowNum}`).numFmt = '#,##0'
    } else {
      ws.getCell(`A${rowNum}`).value = i + 1
      ws.getCell(`B${rowNum}`).value = ''
      ws.getCell(`C${rowNum}`).value = ''
      ws.getCell(`D${rowNum}`).value = ''
    }
  }

  // Isi data Pengeluaran (Kolom E: No, F: Tanggal, G: Uraian, H: Jumlah)
  for (let j = 0; j < neededRows; j++) {
    const rowNum = templateStartRow + j
    const tx = expenses[j]
    if (tx) {
      ws.getCell(`E${rowNum}`).value = j + 1
      ws.getCell(`F${rowNum}`).value = formatShortDate(tx.transaction_date || tx.date || tx.created_at)
      ws.getCell(`G${rowNum}`).value = tx.description || 'Pengeluaran Kas'
      ws.getCell(`H${rowNum}`).value = Number(tx.amount) || 0
      ws.getCell(`H${rowNum}`).numFmt = '#,##0'
    } else {
      ws.getCell(`E${rowNum}`).value = j + 1
      ws.getCell(`F${rowNum}`).value = ''
      ws.getCell(`G${rowNum}`).value = ''
      ws.getCell(`H${rowNum}`).value = ''
    }
  }

  const endDataRow = templateStartRow + neededRows - 1
  const sumRow = endDataRow + 1
  const balanceRow = sumRow + 1

  // Update formula total penerimaan dan pengeluaran
  const cellDTotal = ws.getCell(`D${sumRow}`)
  cellDTotal.value = { formula: `SUM(D7:D${endDataRow})`, result: 0 }
  cellDTotal.numFmt = '#,##0'

  const cellHTotal = ws.getCell(`H${sumRow}`)
  cellHTotal.value = { formula: `SUM(H7:H${endDataRow})`, result: 0 }
  cellHTotal.numFmt = '#,##0'

  // Sisa Saldo: Penerimaan - Pengeluaran
  const cellHSaldo = ws.getCell(`H${balanceRow}`)
  cellHSaldo.value = { formula: `SUM(D${sumRow}-H${sumRow})`, result: 0 }
  cellHSaldo.numFmt = '#,##0'

  // Pengesahan / Tanda Tangan
  const sigDateRow = balanceRow + 2
  const sigRoleRow = sigDateRow + 1
  const sigNameRow = sigRoleRow + 3

  const monthName = MONTH_NAMES_ID[monthIndex - 1]
  const lastDay = getLastDayOfMonth(params.year, monthIndex)
  const defaultDateStr = `${params.city.trim()}, ${lastDay} ${monthName} ${params.year}`

  // G{sigDateRow}: Tempat, Tanggal (cth: "Jakarta, 31 Januari 2026")
  ws.getCell(`G${sigDateRow}`).value = params.documentDate?.trim() || defaultDateStr
  // G{sigRoleRow}: Jabatan (cth: "Staf Keuangan" / "Bendahara")
  ws.getCell(`G${sigRoleRow}`).value = params.roleTitle.trim() || 'Staf Keuangan'
  // G{sigNameRow}: NAMA PENANGGUNG JAWAB
  ws.getCell(`G${sigNameRow}`).value = params.signeeName.trim().toUpperCase() || 'PENANGGUNG JAWAB'
}

/**
 * Eksekusi export laporan keuangan ke berkas Excel .xlsx
 */
export async function exportFinanceToExcel(params: FinanceExportParams): Promise<void> {
  const templateBuffer = await fetchTemplateBuffer()

  const exportWb = new ExcelJS.Workbook()

  if (params.mode === 'single_month' && params.selectedMonth) {
    // Mode Single Month
    const m = params.selectedMonth
    const monthName = MONTH_NAMES_ID[m - 1]
    const sheetName = `${monthName} ${params.year}`

    await exportWb.xlsx.load(templateBuffer)
    const ws = exportWb.worksheets[0]
    if (ws) {
      ws.name = sheetName
      const monthTx = getMonthlyTransactions(params.transactions, params.year, m)
      populateSheet(ws, params, m, monthTx)
    }
  } else {
    // Mode All Months
    await exportWb.xlsx.load(templateBuffer)

    // Tentukan bulan yang akan diexport:
    // Jika includeEmptyMonths === false, hanya bulan yang memiliki transaksi
    let targetMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    if (params.includeEmptyMonths === false) {
      const activeMonths = targetMonths.filter((m) => {
        return getMonthlyTransactions(params.transactions, params.year, m).length > 0
      })
      if (activeMonths.length > 0) {
        targetMonths = activeMonths
      }
    }

    // Sheet 1 untuk bulan pertama dalam target
    const firstMonth = targetMonths[0]
    const firstWs = exportWb.worksheets[0]
    firstWs.name = `${MONTH_NAMES_ID[firstMonth - 1]} ${params.year}`
    const firstMonthTx = getMonthlyTransactions(params.transactions, params.year, firstMonth)
    populateSheet(firstWs, params, firstMonth, firstMonthTx)

    // Untuk bulan-bulan berikutnya, tambahkan sheet baru berbasis template
    for (let i = 1; i < targetMonths.length; i++) {
      const m = targetMonths[i]
      const monthName = MONTH_NAMES_ID[m - 1]
      const sheetName = `${monthName} ${params.year}`

      const tempWb = new ExcelJS.Workbook()
      await tempWb.xlsx.load(templateBuffer)
      const tempWs = tempWb.worksheets[0]

      const newWs = exportWb.addWorksheet(sheetName)
      newWs.model = Object.assign({}, tempWs.model, { name: sheetName })

      const monthTx = getMonthlyTransactions(params.transactions, params.year, m)
      populateSheet(newWs, params, m, monthTx)
    }
  }

  // Tulis berkas dan download di browser
  const outBuffer = await exportWb.xlsx.writeBuffer()
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const sanitizedOrg = (params.organizationName || 'Organisasi').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
  const fileName =
    params.mode === 'single_month' && params.selectedMonth
      ? `Laporan_Keuangan_${sanitizedOrg}_${MONTH_NAMES_ID[params.selectedMonth - 1]}_${params.year}.xlsx`
      : `Laporan_Keuangan_Tahunan_${sanitizedOrg}_${params.year}.xlsx`

  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(downloadUrl)
}
