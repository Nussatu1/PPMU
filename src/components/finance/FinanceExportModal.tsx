import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/context/ToastContext'
import {
  HeroArrowDownTray,
  HeroTableCells,
  HeroCalendar,
  HeroCheckCircle,
} from '@/components/icons/HeroIcons'
import type { Organization, Transaction, User } from '@/types/database'
import {
  exportFinanceToExcel,
  MONTH_NAMES_ID,
  getMonthlyTransactions,
} from '@/lib/financeExportService'

export interface FinanceExportModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  organization: Organization | null
  user: User | null
}

export const FinanceExportModal: React.FC<FinanceExportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  organization,
  user,
}) => {
  const { success, error } = useToast()

  // Export Mode: 'all_months' (Multi-tab) | 'single_month' (Per Bulan)
  const [mode, setMode] = useState<'all_months' | 'single_month'>('all_months')

  // Periode
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [includeEmptyMonths, setIncludeEmptyMonths] = useState<boolean>(true)

  // Identitas & Pengesahan Laporan
  const [orgName, setOrgName] = useState('')
  const [orgAddress, setOrgAddress] = useState('')
  const [city, setCity] = useState('Lumajang')
  const [documentDate, setDocumentDate] = useState('')
  const [roleTitle, setRoleTitle] = useState('Bendahara')
  const [signeeName, setSigneeName] = useState('')

  const [isExporting, setIsExporting] = useState(false)

  // Inisialisasi data profil saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      if (organization) {
        setOrgName(organization.name || '')
        setOrgAddress(organization.address || 'Gedung Pusat Administrasi & Kegiatan')
        // Coba ekstrak kota dari alamat jika tersedia
        if (organization.address) {
          const parts = organization.address.split(',')
          if (parts.length > 1) {
            setCity(parts[parts.length - 1].trim())
          }
        }
      }
      if (user) {
        setSigneeName(user.name || '')
      }
    }
  }, [isOpen, organization, user])

  // Hitung jumlah transaksi pada periode terpilih
  const activeTxCount = React.useMemo(() => {
    if (mode === 'single_month') {
      return getMonthlyTransactions(transactions, selectedYear, selectedMonth).length
    }
    return transactions.filter((tx) => {
      const rawDate = tx.transaction_date || tx.date || tx.created_at
      if (!rawDate) return false
      return new Date(rawDate).getFullYear() === selectedYear
    }).length
  }, [transactions, mode, selectedYear, selectedMonth])

  const handleExport = async () => {
    if (!orgName.trim()) {
      error('Validasi Gagal', 'Nama Organisasi tidak boleh kosong.')
      return
    }

    setIsExporting(true)
    try {
      await exportFinanceToExcel({
        organizationName: orgName.trim(),
        organizationAddress: orgAddress.trim() || '-',
        city: city.trim() || 'Jakarta',
        documentDate: documentDate.trim() || undefined,
        roleTitle: roleTitle.trim() || 'Staf Keuangan',
        signeeName: signeeName.trim() || user?.name || 'PENANGGUNG JAWAB',
        year: selectedYear,
        mode,
        selectedMonth: mode === 'single_month' ? selectedMonth : undefined,
        includeEmptyMonths,
        transactions,
      })

      success(
        'Export Berhasil',
        mode === 'all_months'
          ? `Laporan keuangan tahunan ${selectedYear} dengan multi-tab per bulan telah diunduh.`
          : `Laporan keuangan bulan ${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear} telah diunduh.`
      )
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor laporan ke Excel'
      error('Export Gagal', msg)
    } finally {
      setIsExporting(false)
    }
  }

  // Opsi Tahun
  const yearOptions = [
    { value: currentYear - 1, label: `Tahun ${currentYear - 1}` },
    { value: currentYear, label: `Tahun ${currentYear} (Berjalan)` },
    { value: currentYear + 1, label: `Tahun ${currentYear + 1}` },
  ]

  // Opsi Bulan
  const monthOptions = MONTH_NAMES_ID.map((name, idx) => ({
    value: idx + 1,
    label: name,
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Export Laporan Keuangan ke Excel"
      description="Format resmi Buku Catatan Mutasi Penerimaan & Pengeluaran (.xlsx)"
    >
      <div className="space-y-5">
        {/* Switcher Mode Export */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-fg">Pilih Cakupan Laporan</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('all_months')}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                mode === 'all_months'
                  ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-surface border-line hover:bg-hover-bg'
              }`}
            >
              <HeroTableCells
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  mode === 'all_months' ? 'text-amber-500' : 'text-fg-muted'
                }`}
              />
              <div>
                <p
                  className={`text-xs font-bold ${
                    mode === 'all_months'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-fg'
                  }`}
                >
                  Seluruh Bulan (Multi-Tab)
                </p>
                <p className="text-[11px] text-fg-muted mt-0.5 leading-snug">
                  1 berkas Excel dengan tab/sheet terpisah per bulan (Jan s.d. Des).
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('single_month')}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                mode === 'single_month'
                  ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-surface border-line hover:bg-hover-bg'
              }`}
            >
              <HeroCalendar
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  mode === 'single_month' ? 'text-amber-500' : 'text-fg-muted'
                }`}
              />
              <div>
                <p
                  className={`text-xs font-bold ${
                    mode === 'single_month'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-fg'
                  }`}
                >
                  Per Bulan Tertentu
                </p>
                <p className="text-[11px] text-fg-muted mt-0.5 leading-snug">
                  1 berkas Excel khusus untuk bulan yang dipilih.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Filter Periode */}
        <div className="p-3.5 rounded-xl border border-line bg-surface-muted/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-fg">Periode Pembukuan</span>
            <Badge variant="amber" dot>
              {activeTxCount} Transaksi Ditemukan
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tahun Anggaran"
              value={selectedYear}
              onValueChange={(val) => setSelectedYear(Number(val))}
              options={yearOptions}
            />

            {mode === 'single_month' && (
              <Select
                label="Bulan Laporan"
                value={selectedMonth}
                onValueChange={(val) => setSelectedMonth(Number(val))}
                options={monthOptions}
              />
            )}

            {mode === 'all_months' && (
              <div className="flex items-center sm:pt-6">
                <Checkbox
                  label="Sertakan seluruh 12 bulan (meskipun tanpa mutasi)"
                  checked={includeEmptyMonths}
                  onChange={(e) => setIncludeEmptyMonths(e.target.checked)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Form Identitas & Pengesahan Laporan */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-1.5">
            <span className="text-xs font-bold text-fg">
              Parameter Kop & Pengesahan Laporan
            </span>
            <span className="text-[11px] text-fg-muted">Disesuaikan otomatis dari profil</span>
          </div>

          <div className="space-y-3">
            <Input
              label="Nama Organisasi"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Contoh: BIRO UBUDIYAH PP. MIFTAHUL ULUM BAKID"
            />

            <Input
              label="Alamat Organisasi"
              value={orgAddress}
              onChange={(e) => setOrgAddress(e.target.value)}
              placeholder="Contoh: Kompleks PP. Miftahul Ulum Banyuputih Kidul, Jatiroto, Lumajang"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Tempat / Kota Dokumen"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Contoh: Lumajang"
                helperText="Digunakan untuk format [Kota], [Tanggal]"
              />

              <Input
                label="Tanggal Dokumen (Opsional)"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                placeholder="Kosongkan untuk otomatis akhir bulan"
                helperText="Default: tanggal hari terakhir tiap bulan"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Jabatan Penanggung Jawab"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Contoh: Bendahara / Kepala Biro"
              />

              <Input
                label="Nama Penanggung Jawab"
                required
                value={signeeName}
                onChange={(e) => setSigneeName(e.target.value)}
                placeholder="Nama lengkap pejabat penanggung jawab"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-line">
          <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            <HeroCheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Format baku template resmi (Dual-Column Mutasi & Formula SUM)</span>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <Button variant="secondary" onClick={onClose} disabled={isExporting}>
              Batal
            </Button>
            <Button
              variant="primary"
              icon={<HeroArrowDownTray className="w-4 h-4" />}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Memproses...' : 'Unduh Berkas Excel (.xlsx)'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
