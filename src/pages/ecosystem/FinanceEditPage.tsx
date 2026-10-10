import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
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
import type { Transaction, Budget } from '@/types/database'
import {
  HeroCurrencyDollar,
  HeroArrowLeft,
  HeroCheck,
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

export const FinanceEditPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [txType, setTxType] = useState<'income' | 'expense'>('expense')
  const [formData, setFormData] = useState<FormData>({
    budget_id: '',
    amount: 0,
    transaction_date: '',
    category: '',
    description: '',
    proof_url: '',
  })

  const orgId = currentOrganization?.id || ''
  const set = (f: keyof FormData, v: string | number) =>
    setFormData((p) => ({ ...p, [f]: v }))

  const loadData = useCallback(async () => {
    if (!id || !orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      // Try to get transaction from location state first (faster), then fallback to fetch
      const stateTransaction: Transaction | undefined = (location.state as any)?.transaction
      const buds = await dataService.getBudgets(orgId, undefined, user)
      setBudgets(buds)

      let tx: Transaction | null = stateTransaction || null
      if (!tx) {
        const allTx = await dataService.getTransactions({ organizationId: orgId, mode: 'own' }, undefined, user)
        tx = allTx.find((t) => t.id === id) || null
      }
      if (!tx) {
        error('Tidak Ditemukan', 'Transaksi tidak ditemukan')
        navigate('/finance')
        return
      }
      setTransaction(tx)
      setTxType(tx.type as 'income' | 'expense')
      setFormData({
        budget_id: tx.budget_id || '',
        amount: tx.amount || 0,
        transaction_date: tx.transaction_date
          ? tx.transaction_date.split('T')[0]
          : (tx.created_at ? tx.created_at.split('T')[0] : ''),
        category: tx.category || '',
        description: tx.description || '',
        proof_url: tx.proof_url || '',
      })
    } catch (err: unknown) {
      error('Kesalahan', err instanceof Error ? err.message : 'Gagal memuat transaksi')
    } finally {
      setIsLoading(false)
    }
  }, [id, orgId, user, error, navigate, location.state])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.budget_id || !formData.amount || !formData.description.trim() || !formData.transaction_date) {
      error('Validasi Gagal', 'Pos Anggaran, Nominal, Tanggal, dan Uraian wajib diisi')
      return
    }
    if (!id) return
    setIsSaving(true)
    try {
      await dataService.updateTransaction(id, { ...formData, type: txType }, user)
      success('Transaksi Diperbarui', `${txType === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${formatCurrency(formData.amount)} berhasil diperbarui.`)
      navigate('/finance')
    } catch (err: unknown) {
      error('Gagal', err instanceof Error ? err.message : 'Gagal memperbarui transaksi')
    } finally {
      setIsSaving(false)
    }
  }

  const isIncome = txType === 'income'

  return (
    <PageContainer variant="form">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumb items={[
            { label: 'Keuangan', href: '/finance' },
            { label: transaction ? (isIncome ? 'Edit Pemasukan' : 'Edit Pengeluaran') : 'Edit Transaksi' },
          ]} />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            {isIncome ? 'Edit Pemasukan' : 'Edit Pengeluaran'}
          </h1>
        </div>
        <Button variant="secondary" icon={<HeroArrowLeft className="w-4 h-4" />} onClick={() => navigate('/finance')} className="hidden sm:inline-flex">
          Kembali
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form noValidate onSubmit={handleSave} className="space-y-6">
          {/* Jenis Transaksi (read-only indicator) */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-line bg-surface shadow-2xs">
            <label className="text-xs font-bold text-fg uppercase tracking-wider block mb-2.5">Jenis Transaksi</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${isIncome ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/20' : 'bg-surface-muted/30 border-line opacity-40'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-500 text-white' : 'bg-surface border border-line text-fg-muted'}`}>
                  <HeroArrowTrendingUp className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-fg">Pemasukan</span>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${!isIncome ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20' : 'bg-surface-muted/30 border-line opacity-40'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!isIncome ? 'bg-amber-500 text-white' : 'bg-surface border border-line text-fg-muted'}`}>
                  <HeroArrowTrendingDown className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-fg">Pengeluaran</span>
              </div>
            </div>
            <p className="text-[11px] text-fg-muted mt-2">Jenis transaksi tidak dapat diubah. Jika salah, hapus dan buat baru.</p>
          </div>

          <SectionGrid columns={12}>
            <Section title="Pos & Kategori" icon={<HeroCurrencyDollar className="w-5 h-5" />} columns={12} className="lg:col-span-6">
              <div className="col-span-full md:col-span-7">
                <Select label="Pos Anggaran" required value={formData.budget_id}
                  onValueChange={(val) => set('budget_id', String(val))}
                  options={budgets.map((b) => {
                    const rem = b.remaining_balance ?? ((b.allocated_amount || b.amount_allocated || 0) - (b.realized_amount || 0))
                    return { value: b.id, label: `${b.program?.title || b.program?.name || 'Program'} (Sisa: ${formatCurrency(rem)})` }
                  })}
                />
              </div>
              <div className="col-span-full md:col-span-5">
                <Input label="Kategori" value={formData.category} onChange={(e) => set('category', e.target.value)} placeholder={isIncome ? 'Dropping / Infaq' : 'Konsumsi / Operasional'} />
              </div>
            </Section>

            <Section title="Nominal & Waktu" icon={<HeroCalendar className="w-5 h-5" />} columns={12} className="lg:col-span-6">
              <div className="col-span-full md:col-span-6">
                <NumberInput label="Nominal" prefix="Rp" required value={formData.amount} onChange={(val) => set('amount', val || 0)} />
              </div>
              <div className="col-span-full md:col-span-6">
                <DatePicker label="Tanggal" required value={formData.transaction_date} onChange={(val) => set('transaction_date', val)} />
              </div>
            </Section>

            <Section title="Uraian & Bukti" icon={<HeroDocumentText className="w-5 h-5" />} columns={1} className="col-span-full">
              <Textarea label="Uraian Transaksi" rows={3} autoGrow required value={formData.description} onChange={(e) => set('description', e.target.value)} placeholder="Uraian singkat transaksi..." />
              <FileUpload label="Bukti Transaksi" value={formData.proof_url} onChange={(val) => set('proof_url', val)} accept=".pdf,.jpg,.jpeg,.png" helperText="Format: PDF, JPG, PNG (Maks. 10 MB)" />
            </Section>
          </SectionGrid>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => navigate('/finance')}>Batal</Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              <HeroCheck className="w-4 h-4 mr-1.5" />
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      )}
    </PageContainer>
  )
}
