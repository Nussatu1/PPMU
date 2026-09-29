import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Section } from '@/components/ui/Section'
import { SectionGrid } from '@/components/ui/SectionGrid'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { DatePicker } from '@/components/ui/DatePicker'
import { NumberInput } from '@/components/ui/NumberInput'
import { FileUpload } from '@/components/ui/FileUpload'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { formatCurrency } from '@/lib/utils'
import type { Budget } from '@/types/database'
import {
  HeroCurrencyDollar,
  HeroArrowLeft,
  HeroCalendar,
  HeroDocumentText,
  HeroArrowTrendingUp,
  HeroArrowTrendingDown,
} from '@/components/icons/HeroIcons'

type FormData = {
  budget_id: string
  amount: number
  transaction_date: string
  category: string
  description: string
  proof_url: string
}

const emptyForm = (type: 'income' | 'expense'): FormData => ({
  budget_id: '',
  amount: 0,
  transaction_date: new Date().toISOString().split('T')[0],
  category: type === 'income' ? 'Dropping Pagu Pengurus 1' : 'Honorarium / Operasional',
  description: '',
  proof_url: '',
})

export const FinanceCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialType = searchParams.get('type') === 'income' ? 'income' : 'expense'
  const [txType, setTxType] = useState<'income' | 'expense'>(initialType)

  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>(emptyForm(initialType))

  const orgId = currentOrganization?.id || ''
  const set = (f: keyof FormData, v: string | number) =>
    setFormData((p) => ({ ...p, [f]: v }))

  const handleTypeChange = (newType: 'income' | 'expense') => {
    if (newType === txType) return
    setTxType(newType)
    setSearchParams({ type: newType })
    setFormData((prev) => ({
      ...prev,
      category:
        newType === 'income'
          ? 'Dropping Pagu Pengurus 1'
          : 'Honorarium / Operasional',
    }))
  }

  const loadData = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const buds = await dataService.getBudgets(orgId, undefined, user)
      setBudgets(buds)
      if (buds.length > 0) {
        setFormData((p) => ({ ...p, budget_id: buds[0].id }))
      }
    } catch (err: unknown) {
      error('Kesalahan', err instanceof Error ? err.message : 'Gagal memuat data anggaran')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async (e: React.FormEvent, andCreateAnother = false) => {
    e.preventDefault()
    if (
      !formData.budget_id ||
      !formData.amount ||
      !formData.description.trim() ||
      !formData.transaction_date
    ) {
      error('Validasi Gagal', 'Pos Anggaran, Nominal, Tanggal, dan Uraian wajib diisi')
      return
    }

    setIsSaving(true)
    try {
      await dataService.createTransaction(
        {
          ...formData,
          type: txType,
          organization_id: orgId,
          recorded_by: user?.id,
        },
        user
      )

      success(
        'Transaksi Dibukukan',
        txType === 'income'
          ? `Penerimaan kas ${formatCurrency(formData.amount)} berhasil dicatat.`
          : `Pengeluaran kas ${formatCurrency(formData.amount)} berhasil dicatat.`
      )

      if (andCreateAnother) {
        setFormData({ ...emptyForm(txType), budget_id: formData.budget_id })
      } else {
        navigate('/finance')
      }
    } catch (err: unknown) {
      error('Gagal', err instanceof Error ? err.message : 'Gagal mencatat transaksi')
    } finally {
      setIsSaving(false)
    }
  }

  const isIncome = txType === 'income'

  return (
    <PageContainer variant="form">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumb
            items={[
              { label: 'Organisasi', href: '/finance' },
              { label: 'Anggaran & Keuangan', href: '/finance' },
              { label: isIncome ? 'Catat Pemasukan' : 'Catat Pengeluaran' },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            {isIncome ? 'Catat Pemasukan Kas Baru' : 'Catat Pengeluaran Baru'}
          </h1>
          <p className="text-sm text-fg-muted">
            {isIncome
              ? 'Bukukan penerimaan kas masuk, dropping pagu anggaran dari Pengurus 1, kas santri, donasi, atau infaq.'
              : 'Bukukan transaksi mutasi belanja program, alokasi pos anggaran, serta lampiran bukti nota digital.'}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<HeroArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/finance')}
        >
          Kembali
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form noValidate onSubmit={(e) => handleSave(e, false)} className="space-y-6">
          {/* Switcher Jenis Transaksi: Pemasukan vs Pengeluaran */}
          <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-fg uppercase tracking-wider">
                Pilih Jenis Transaksi Keuangan <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-fg-muted font-medium">
                {isIncome ? 'Penerimaan Kas (+)' : 'Pengeluaran Kas (-)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isIncome
                    ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/20'
                    : 'bg-surface-muted/50 border-line hover:bg-hover-bg'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isIncome
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-surface border border-line text-fg-muted'
                  }`}
                >
                  <HeroArrowTrendingUp className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-fg">Pemasukan (Kas Masuk)</span>
                    {isIncome && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-fg-muted mt-0.5 leading-snug">
                    Dropping dana dari Pengurus 1, kas santri, donasi, sumbangan, atau infaq.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  !isIncome
                    ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20'
                    : 'bg-surface-muted/50 border-line hover:bg-hover-bg'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    !isIncome
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-surface border border-line text-fg-muted'
                  }`}
                >
                  <HeroArrowTrendingDown className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-fg">Pengeluaran (Kas Keluar)</span>
                    {!isIncome && (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-fg-muted mt-0.5 leading-snug">
                    Belanja kegiatan program, operasional, bisyarah pembina, atau sarana ibadah.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <SectionGrid columns={12}>
            {/* Pos Anggaran & Kategori */}
            <Section
              title={isIncome ? 'Pos Anggaran & Kategori Pemasukan' : 'Pos Anggaran & Kategori Belanja'}
              description={
                isIncome
                  ? 'Tentukan pos anggaran tujuan dan jenis klasifikasi kas masuk.'
                  : 'Tentukan alokasi sumber pagu program dan jenis klasifikasi operasional.'
              }
              icon={<HeroCurrencyDollar className="w-5 h-5" />}
              columns={12}
              className="lg:col-span-6"
            >
              <div className="col-span-full md:col-span-7">
                <Select
                  label={isIncome ? 'Pos Anggaran Sasaran' : 'Pos Anggaran Program'}
                  required
                  value={formData.budget_id}
                  onValueChange={(val) => set('budget_id', String(val))}
                  options={budgets.map((b) => {
                    const rem =
                      b.remaining_balance ??
                      ((b.allocated_amount || b.amount_allocated || 0) -
                        (b.realized_amount || 0))
                    return {
                      value: b.id,
                      label: `${b.program?.title || b.program?.name || 'Program'} (Sisa Pagu: ${formatCurrency(rem)})`,
                    }
                  })}
                />
              </div>

              <div className="col-span-full md:col-span-5">
                <Input
                  label={isIncome ? 'Kategori Pemasukan' : 'Kategori Pengeluaran'}
                  value={formData.category}
                  onChange={(e) => set('category', e.target.value)}
                  placeholder={
                    isIncome
                      ? 'Contoh: Dropping Pagu Pengurus 1, Kas Iuran Santri, Infaq'
                      : 'Contoh: Honorarium Narasumber, Sewa Gedung, Konsumsi Peserta'
                  }
                />
              </div>
            </Section>

            {/* Nominal & Waktu Transaksi */}
            <Section
              title={isIncome ? 'Nominal & Waktu Penerimaan' : 'Nominal & Waktu Pembukuan'}
              description={
                isIncome
                  ? 'Nilai kas masuk yang diterima dan tanggal sah mutasi penerimaan.'
                  : 'Nilai kas yang dikeluarkan dan tanggal sah transaksi mutasi.'
              }
              icon={<HeroCalendar className="w-5 h-5" />}
              columns={12}
              className="lg:col-span-6"
            >
              <div className="col-span-full md:col-span-6">
                <NumberInput
                  label={isIncome ? 'Nominal Penerimaan Kas' : 'Nominal Biaya Belanja'}
                  prefix="Rp"
                  required
                  value={formData.amount}
                  onChange={(val) => set('amount', val || 0)}
                />
              </div>

              <div className="col-span-full md:col-span-6">
                <DatePicker
                  label={isIncome ? 'Tanggal Penerimaan Kas' : 'Tanggal Transaksi Kas'}
                  required
                  value={formData.transaction_date}
                  onChange={(val) => set('transaction_date', val)}
                />
              </div>
            </Section>

            {/* Uraian & Bukti */}
            <Section
              title={isIncome ? 'Uraian & Bukti Penerimaan' : 'Uraian & Bukti Kwitansi'}
              description={
                isIncome
                  ? 'Rincian asal dana/sumber kas masuk dan berkas digital kwitansi/slip transfer.'
                  : 'Rincian peruntukan pembelanjaan dan berkas digital kwitansi/faktur sah.'
              }
              icon={<HeroDocumentText className="w-5 h-5" />}
              columns={1}
              className="col-span-full"
            >
              <Textarea
                label={isIncome ? 'Uraian Detail Pemasukan' : 'Uraian Detail Pengeluaran'}
                rows={3}
                autoGrow
                required
                value={formData.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder={
                  isIncome
                    ? 'Contoh: Penerimaan dropping pagu kas operasional triwulan I dari Pengurus 1 untuk bimbingan fasholatan...'
                    : 'Contoh: Pembayaran honorarium 2 orang narasumber seminar riset batch 1 sesuai ketentuan...'
                }
              />

              <FileUpload
                label={
                  isIncome
                    ? 'Unggah Bukti Transfer / Kwitansi Masuk (Opsional)'
                    : 'Unggah Berkas Bukti Bayar / Nota Fisik (Opsional)'
                }
                value={formData.proof_url}
                onChange={(val) => set('proof_url', val)}
                accept=".pdf,.jpg,.jpeg,.png"
                helperText={
                  isIncome
                    ? 'Pindai bukti transfer bank, slip setoran, atau kuitansi tanda terima (Maks. 10 MB).'
                    : 'Pindai kuitansi, faktur belanja, atau nota kas digital (Maks. 10 MB).'
                }
              />
            </Section>
          </SectionGrid>

          {/* Actions Bar */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/finance')}
            >
              Batal
            </Button>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={(e) => handleSave(e, true)}
              >
                Buat & Buat Lainnya
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
              >
                {isSaving ? 'Memproses...' : 'Buat'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </PageContainer>
  )
}
