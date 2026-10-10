import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Section } from '@/components/ui/Section'
import { SectionGrid } from '@/components/ui/SectionGrid'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { NumberInput } from '@/components/ui/NumberInput'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { formatCurrency } from '@/lib/utils'
import type { Budget, Program } from '@/types/database'
import {
  HeroCurrencyDollar,
  HeroArrowLeft,
  HeroCheck,
  HeroDocumentText,
  HeroChartBar,
} from '@/components/icons/HeroIcons'

type FormData = {
  program_id: string
  allocated_amount: number
  notes: string
}

export const BudgetEditPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [budget, setBudget] = useState<Budget | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    program_id: '',
    allocated_amount: 0,
    notes: '',
  })

  const orgId = currentOrganization?.id || ''
  const set = <K extends keyof FormData>(f: K, v: FormData[K]) =>
    setFormData((p) => ({ ...p, [f]: v }))

  const loadData = useCallback(async () => {
    if (!id || !orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const stateBudget: Budget | undefined = (location.state as any)?.budget
      const progs = await dataService.getPrograms(orgId, user)
      setPrograms(progs)

      let b: Budget | null = stateBudget || null
      if (!b) {
        const allBudgets = await dataService.getBudgets({ organizationId: orgId, mode: 'own' }, undefined, user)
        b = allBudgets.find((item) => item.id === id) || null
      }
      if (!b) {
        error('Tidak Ditemukan', 'Pos Anggaran tidak ditemukan')
        navigate('/finance')
        return
      }
      setBudget(b)
      setFormData({
        program_id: b.program_id || '',
        allocated_amount: b.allocated_amount || b.amount_allocated || b.planned_amount || 0,
        notes: b.notes || '',
      })
    } catch (err: unknown) {
      error('Kesalahan', err instanceof Error ? err.message : 'Gagal memuat pos anggaran')
    } finally {
      setIsLoading(false)
    }
  }, [id, orgId, user, error, navigate, location.state])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.program_id) {
      error('Validasi Gagal', 'Program wajib dipilih')
      return
    }
    if (formData.allocated_amount <= 0) {
      error('Validasi Gagal', 'Pagu anggaran harus lebih dari 0')
      return
    }
    if (!id) return
    setIsSaving(true)
    try {
      const realized = budget?.realized_amount || budget?.amount_spent || 0
      const newRemaining = Math.max(0, formData.allocated_amount - realized)
      await dataService.updateBudget(
        id,
        {
          program_id: formData.program_id,
          allocated_amount: formData.allocated_amount,
          amount_allocated: formData.allocated_amount,
          planned_amount: formData.allocated_amount,
          remaining_balance: newRemaining,
          notes: formData.notes,
        },
        user
      )
      const progName = programs.find((p) => p.id === formData.program_id)?.title || 'Program'
      success('Pos Anggaran Diperbarui', `Pagu ${progName} diperbarui menjadi ${formatCurrency(formData.allocated_amount)}.`)
      navigate('/finance')
    } catch (err: unknown) {
      error('Gagal', err instanceof Error ? err.message : 'Gagal memperbarui pos anggaran')
    } finally {
      setIsSaving(false)
    }
  }

  const realized = budget ? (budget.realized_amount || budget.amount_spent || 0) : 0
  const remaining = Math.max(0, formData.allocated_amount - realized)

  return (
    <PageContainer variant="form">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumb items={[
            { label: 'Keuangan', href: '/finance' },
            { label: 'Edit Pos Anggaran' },
          ]} />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">Edit Pos Anggaran</h1>
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
          <SectionGrid columns={12}>
            {/* Program & Pagu */}
            <Section title="Program & Alokasi Anggaran" icon={<HeroCurrencyDollar className="w-5 h-5" />} columns={12} className="lg:col-span-7">
              <div className="col-span-full">
                <Select
                  label="Program"
                  required
                  value={formData.program_id}
                  onValueChange={(val) => set('program_id', String(val))}
                  options={programs.map((p) => ({ value: p.id, label: p.title }))}
                />
              </div>
              <div className="col-span-full">
                <NumberInput
                  label="Pagu Anggaran (Rp)"
                  prefix="Rp"
                  required
                  value={formData.allocated_amount}
                  onChange={(val) => set('allocated_amount', val || 0)}
                  helperText="Total dana yang dialokasikan untuk program ini"
                />
              </div>
              <div className="col-span-full">
                <Textarea
                  label="Keterangan / Catatan"
                  rows={2}
                  autoGrow
                  value={formData.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Catatan tambahan mengenai pos anggaran ini..."
                />
              </div>
            </Section>

            {/* Ringkasan Saldo */}
            <Section title="Ringkasan Saldo" icon={<HeroChartBar className="w-5 h-5" />} columns={1} className="lg:col-span-5">
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-line space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted font-medium">Pagu Baru</span>
                    <span className="font-bold text-fg">{formatCurrency(formData.allocated_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted font-medium">Sudah Direalisasi</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">- {formatCurrency(realized)}</span>
                  </div>
                  <div className="border-t border-line pt-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-fg">Sisa Anggaran</span>
                    <span className={`font-bold text-sm ${remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>

                {formData.allocated_amount < realized && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
                    <strong>Peringatan:</strong> Pagu baru lebih kecil dari realisasi saat ini ({formatCurrency(realized)}). Sisa anggaran akan menjadi negatif.
                  </div>
                )}

                <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                  <p className="text-[11px] text-fg-muted leading-relaxed">
                    <HeroDocumentText className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                    Perubahan pagu tidak mempengaruhi transaksi yang sudah dicatat. Hanya nilai alokasi dan sisa yang diperbarui.
                  </p>
                </div>
              </div>
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
