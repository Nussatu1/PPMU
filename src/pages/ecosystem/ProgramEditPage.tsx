import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { DatePicker } from '@/components/ui/DatePicker'
import { NumberInput } from '@/components/ui/NumberInput'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { UnitAssignmentSelector } from '@/components/organization/UnitAssignmentSelector'
import type {
  Program,
  Section as OrgSection,
  Personnel,
  ProgramDurationType,
  ProgramKPI,
  ProgramBudgetItem,
} from '@/types/database'

import {
  HeroBriefcase,
  HeroArrowLeft,
  HeroCheck,
  HeroPlus,
  HeroCurrencyDollar,
  HeroCalendar,
  HeroDocumentText,
  HeroTrash,
} from '@/components/icons/HeroIcons'

interface FormKPIItem {
  id: string
  indicator: string
  target_value: string
  target_unit: string
}

interface FormBudgetItem {
  id: string
  name: string
  nominal: number
  description: string
}

const createInitialKpi = (): FormKPIItem => ({
  id: `kpi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  indicator: '',
  target_value: '',
  target_unit: '',
})

const createInitialBudgetItem = (): FormBudgetItem => ({
  id: `bgt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  nominal: 0,
  description: '',
})

export const ProgramEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [program, setProgram] = useState<Program | null>(null)
  const [sections, setSections] = useState<OrgSection[]>([])
  const [personnels, setPersonnels] = useState<Personnel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    duration_type: 'terbatas' as ProgramDurationType,
    section_id: '',
    pic_personnel_id: '',
    description: '',
    budget_allocated: 0,
    target_kpi: '',
    kpi_items: [createInitialKpi()] as FormKPIItem[],
    budget_breakdown: [] as FormBudgetItem[],
    start_date: '',
    end_date: '',
    assigned_to_organization_id: null as string | null,
  })

  const orgId = currentOrganization?.id || ''
  const set = (f: keyof typeof formData, v: any) =>
    setFormData((p) => ({ ...p, [f]: v }))

  const loadData = useCallback(async () => {
    if (!orgId || !id) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      dataService.reloadSharedStructuralCollections()
      const [progs, secs, pers] = await Promise.all([
        dataService.getPrograms(orgId, user),
        dataService.getSections(orgId, undefined, user),
        dataService.getPersonnels(orgId, undefined, user),
      ])
      const found = progs.find((p) => p.id === id)
      if (!found) {
        error('Tidak Ditemukan', 'Program tidak ditemukan')
        navigate('/programs')
        return
      }
      setProgram(found)
      setSections(secs)
      setPersonnels(pers)

      // Initialize KPI items (support existing multi-kpi or fallback from target_kpi text)
      let initialKpis: FormKPIItem[] = []
      if (found.kpi_items && found.kpi_items.length > 0) {
        initialKpis = found.kpi_items.map((k) => ({
          id: k.id || `kpi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          indicator: k.indicator || '',
          target_value: k.target_value !== undefined ? String(k.target_value) : '',
          target_unit: k.target_unit || '',
        }))
      } else if (found.target_kpi || found.indicator) {
        initialKpis = [
          {
            id: `kpi-init-${found.id}`,
            indicator: found.indicator || found.target_kpi || '',
            target_value: found.target_value !== undefined ? String(found.target_value) : '',
            target_unit: found.target_unit || '',
          },
        ]
      } else {
        initialKpis = [createInitialKpi()]
      }

      // Initialize Budget breakdown items
      let initialBreakdown: FormBudgetItem[] = []
      if (found.budget_breakdown && found.budget_breakdown.length > 0) {
        initialBreakdown = found.budget_breakdown.map((b) => ({
          id: b.id || `bgt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: b.name || '',
          nominal: Number(b.nominal) || 0,
          description: b.description || '',
        }))
      }

      setFormData({
        title: found.title || found.name || '',
        code: found.code,
        duration_type: found.duration_type || 'terbatas',
        section_id: found.section_id,
        pic_personnel_id: found.pic_personnel_id || '',
        description: found.description || '',
        budget_allocated: found.budget_allocated || found.budget_planned || 0,
        target_kpi: found.target_kpi || '',
        kpi_items: initialKpis,
        budget_breakdown: initialBreakdown,
        start_date: found.start_date || '',
        end_date: found.end_date || '',
        assigned_to_organization_id: found.assigned_to_organization_id || null,
      })
    } catch (err: unknown) {
      error('Kesalahan', err instanceof Error ? err.message : 'Gagal memuat program')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, id, user, error, navigate])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Multi KPI Handlers
  const handleAddKpi = () => {
    setFormData((prev) => ({
      ...prev,
      kpi_items: [...prev.kpi_items, createInitialKpi()],
    }))
  }

  const handleRemoveKpi = (kpiId: string) => {
    if (formData.kpi_items.length <= 1) {
      error('Peringatan', 'Minimal harus ada 1 Target KPI')
      return
    }
    setFormData((prev) => ({
      ...prev,
      kpi_items: prev.kpi_items.filter((item) => item.id !== kpiId),
    }))
  }

  const handleKpiChange = (kpiId: string, field: keyof FormKPIItem, val: string) => {
    setFormData((prev) => ({
      ...prev,
      kpi_items: prev.kpi_items.map((item) =>
        item.id === kpiId ? { ...item, [field]: val } : item
      ),
    }))
  }

  // Budget Breakdown Handlers
  const handleAddBudgetItem = () => {
    setFormData((prev) => ({
      ...prev,
      budget_breakdown: [...prev.budget_breakdown, createInitialBudgetItem()],
    }))
  }

  const handleRemoveBudgetItem = (budgetId: string) => {
    setFormData((prev) => {
      const nextBreakdown = prev.budget_breakdown.filter((item) => item.id !== budgetId)
      const nextTotal = nextBreakdown.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0)
      return {
        ...prev,
        budget_breakdown: nextBreakdown,
        budget_allocated: nextTotal > 0 ? nextTotal : prev.budget_allocated,
      }
    })
  }

  const handleBudgetItemChange = (budgetId: string, field: keyof FormBudgetItem, val: any) => {
    setFormData((prev) => {
      const nextBreakdown = prev.budget_breakdown.map((item) =>
        item.id === budgetId ? { ...item, [field]: val } : item
      )
      const nextTotal = nextBreakdown.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0)
      return {
        ...prev,
        budget_breakdown: nextBreakdown,
        budget_allocated: nextTotal,
      }
    })
  }

  const totalBreakdown = useMemo(() => {
    return formData.budget_breakdown.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0)
  }, [formData.budget_breakdown])

  const hasBudgetMismatch = useMemo(() => {
    if (formData.budget_breakdown.length === 0) return false
    return totalBreakdown !== formData.budget_allocated
  }, [formData.budget_breakdown, totalBreakdown, formData.budget_allocated])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.code.trim()) {
      error('Validasi Gagal', 'Nama Program dan Kode Program wajib diisi')
      return
    }

    if (!formData.section_id) {
      error(
        'Validasi Gagal',
        sections.length === 0
          ? 'Belum ada Seksi Pelaksana. Tambahkan seksi di menu Struktur Organisasi terlebih dahulu.'
          : 'Seksi Pelaksana wajib dipilih'
      )
      return
    }

    if (!formData.start_date) {
      error('Validasi Gagal', 'Tanggal mulai pelaksanaan wajib diisi')
      return
    }

    if (formData.duration_type === 'terbatas' || formData.duration_type === 'jangka_panjang') {
      if (!formData.end_date) {
        error('Validasi Gagal', 'Target tanggal selesai wajib diisi untuk program berbatas waktu / jangka panjang')
        return
      }
      if (formData.end_date < formData.start_date) {
        error('Validasi Gagal', 'Tanggal selesai tidak boleh mendahului tanggal mulai pelaksanaan.')
        return
      }
    }

    // Validate KPI items
    const validKpis = formData.kpi_items.filter((k) => k.indicator.trim() !== '')
    if (validKpis.length === 0) {
      error('Validasi Gagal', 'Minimal cantumkan 1 Target Indikator Kinerja Utama (KPI) yang valid.')
      return
    }

    // Validate Budget Breakdown
    if (formData.budget_breakdown.length > 0) {
      for (const [idx, item] of formData.budget_breakdown.entries()) {
        if (!item.name.trim()) {
          error('Validasi Gagal', `Nama rincian anggaran ke-${idx + 1} tidak boleh kosong.`)
          return
        }
        if (item.nominal < 0) {
          error('Validasi Gagal', `Nominal rincian anggaran ke-${idx + 1} tidak boleh bernilai negatif.`)
          return
        }
      }

      if (hasBudgetMismatch) {
        error(
          'Validasi Gagal',
          `Total rincian anggaran (Rp ${totalBreakdown.toLocaleString('id-ID')}) belum sama dengan Pagu Anggaran Dialokasikan (Rp ${formData.budget_allocated.toLocaleString('id-ID')}).`
        )
        return
      }
    }

    if (!program) return
    setIsSaving(true)
    try {
      const matchedPrs = personnels.find((p) => p.id === formData.pic_personnel_id)
      const picLabel = matchedPrs
        ? `${matchedPrs.position}${matchedPrs.name ? ` (${matchedPrs.name})` : ''}`
        : undefined

      const primaryKpi = validKpis[0]
      const kpiSummary = validKpis
        .map((k) => `${k.indicator}${k.target_value ? `: ${k.target_value}` : ''}${k.target_unit ? ` ${k.target_unit}` : ''}`)
        .join('; ')

      const cleanKpis: ProgramKPI[] = validKpis.map((k) => ({
        id: k.id,
        indicator: k.indicator.trim(),
        target_value: k.target_value ? Number(k.target_value) || k.target_value : undefined,
        target_unit: k.target_unit?.trim() || undefined,
      }))

      const cleanBudgetBreakdown: ProgramBudgetItem[] = formData.budget_breakdown.map((b) => ({
        id: b.id,
        name: b.name.trim(),
        nominal: Number(b.nominal) || 0,
        description: b.description?.trim() || undefined,
      }))

      const finalBudgetAllocated =
        cleanBudgetBreakdown.length > 0 ? totalBreakdown : formData.budget_allocated

      await dataService.updateProgram(
        program.id,
        {
          title: formData.title.trim(),
          name: formData.title.trim(),
          code: formData.code.trim(),
          duration_type: formData.duration_type,
          section_id: formData.section_id,
          pic_personnel_id: formData.pic_personnel_id || undefined,
          pic_name: picLabel,
          pic_structure_id: formData.pic_personnel_id || undefined,
          description: formData.description.trim() || undefined,
          budget_allocated: finalBudgetAllocated,
          budget_planned: finalBudgetAllocated,
          target_kpi: kpiSummary,
          indicator: primaryKpi.indicator.trim(),
          target_value: primaryKpi.target_value ? Number(primaryKpi.target_value) || undefined : undefined,
          target_unit: primaryKpi.target_unit?.trim() || undefined,
          kpi_items: cleanKpis,
          budget_breakdown: cleanBudgetBreakdown,
          start_date: formData.start_date,
          end_date: formData.duration_type === 'rutin' ? '' : formData.end_date,
          assigned_to_organization_id: formData.assigned_to_organization_id || null,
        },
        user
      )
      success('Program Diperbarui', `"${formData.title}" berhasil diperbarui.`)
      navigate('/programs')
    } catch (err: unknown) {
      error('Gagal', err instanceof Error ? err.message : 'Gagal memperbarui program')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageContainer variant="form">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-0.5">
          <Breadcrumb
            items={[
              { label: 'Organisasi', href: '/programs' },
              { label: 'Program Kerja', href: '/programs' },
              { label: program?.title || 'Edit Program' },
            ]}
          />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Ubah Program
          </h1>
        </div>
        <Button
          variant="secondary"
          icon={<HeroArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/programs')}
          className="hidden sm:inline-flex shrink-0 self-start sm:self-auto"
        >
          Kembali
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form noValidate onSubmit={handleSave} className="space-y-6 pb-20 sm:pb-24">
          <div className="space-y-6">
            {/* SECTION 1: IDENTITAS PROGRAM */}
            <Section
              title="Identitas Program"
              icon={<HeroBriefcase className="w-5 h-5 text-amber-500" />}
              columns={2}
            >
              <div className="col-span-full">
                <Input
                  label="Nama Program"
                  required
                  value={formData.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Digitalisasi Layanan Riset Terpadu"
                />
              </div>

              <div>
                <Input
                  label="Kode Program"
                  required
                  value={formData.code}
                  onChange={(e) => set('code', e.target.value.toUpperCase())}
                  placeholder="PRG-RST-26"
                  className="font-mono uppercase"
                />
              </div>

              <div>
                <Select
                  label="Seksi Pelaksana"
                  required
                  value={formData.section_id}
                  options={
                    sections.length === 0
                      ? [{ value: '', label: 'Belum ada seksi (Atur di Struktur Organisasi)' }]
                      : sections.map((s) => ({
                          value: s.id,
                          label: `${s.name} (${s.code})`,
                        }))
                  }
                  onChange={(e) => set('section_id', e.target.value)}
                  helperText={sections.length === 0 ? 'Belum ada seksi. Tambahkan di menu Struktur Organisasi.' : undefined}
                />
              </div>

              <div>
                <Select
                  label="Penanggung Jawab"
                  value={formData.pic_personnel_id}
                  options={personnels.map((p) => ({
                    value: p.id,
                    label: `${p.position}${p.name ? ` • ${p.name}` : ''}`,
                  }))}
                  onChange={(e) => set('pic_personnel_id', e.target.value)}
                />
              </div>

              <div>
                <UnitAssignmentSelector
                  label="Penugasan Unit Pelaksana (opsional)"
                  value={formData.assigned_to_organization_id}
                  onChange={(orgId) => set('assigned_to_organization_id', orgId as unknown as string)}
                />
              </div>
            </Section>

            {/* SPLIT ROW: SECTION 2 & 3 BERDAMPINGAN DENGAN TINGGI SEJAJAR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* SECTION 2: JADWAL & PERIODE */}
              <Section
                title="Jadwal & Periode"
                icon={<HeroCalendar className="w-5 h-5 text-amber-500" />}
                columns={2}
                className="h-full flex flex-col justify-between"
              >
                <div className="col-span-full">
                  <Select
                    label="Jenis Program"
                    required
                    value={formData.duration_type}
                    options={[
                      { value: 'terbatas', label: 'Berbatas Waktu' },
                      { value: 'jangka_panjang', label: 'Jangka Panjang' },
                      { value: 'rutin', label: 'Berkelanjutan / Rutin' },
                    ]}
                    onChange={(e) => {
                      const dt = e.target.value as ProgramDurationType
                      setFormData((prev) => ({
                        ...prev,
                        duration_type: dt,
                        end_date: dt === 'rutin' ? '' : prev.end_date,
                      }))
                    }}
                  />
                </div>

                <div>
                  <DatePicker
                    label="Tanggal Mulai"
                    required
                    value={formData.start_date}
                    onChange={(val) => set('start_date', val)}
                  />
                </div>

                <div>
                  {formData.duration_type === 'rutin' ? (
                    <div className="space-y-1 opacity-60 pointer-events-none">
                      <label className="block text-xs sm:text-sm font-semibold text-fg">
                        Tanggal Selesai
                      </label>
                      <div className="flex items-center px-3 py-1.5 rounded-lg border border-line-subtle bg-surface-muted/60 text-xs text-fg-muted min-h-[44px] sm:min-h-[2.375rem] italic">
                        Tidak berlaku untuk rutin
                      </div>
                    </div>
                  ) : (
                    <DatePicker
                      label="Tanggal Selesai"
                      required
                      value={formData.end_date}
                      onChange={(val) => set('end_date', val)}
                    />
                  )}
                </div>
              </Section>

              {/* SECTION 3: RUANG LINGKUP */}
              <Section
                title="Ruang Lingkup"
                icon={<HeroDocumentText className="w-5 h-5 text-amber-500" />}
                columns={1}
                className="h-full flex flex-col"
              >
                <div className="h-full flex flex-col">
                  <Textarea
                    label="Deskripsi & Sasaran"
                    rows={4}
                    autoGrow
                    value={formData.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Latar belakang, sasaran, dan ruang lingkup program..."
                    containerClassName="h-full flex flex-col flex-1"
                    className="flex-1 min-h-[8.5rem] resize-y"
                  />
                </div>
              </Section>
            </div>

            {/* SECTION 4: TARGET OUTPUT (KPI) */}
            <Section
              title="Target Output (KPI)"
              icon={<HeroCheck className="w-5 h-5 text-amber-500" />}
              columns={1}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-fg-muted">
                    Indikator capaian keberhasilan kegiatan
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddKpi}
                    className="text-xs text-primary hover:text-primary-600 font-medium py-1 px-2.5 h-8"
                  >
                    <HeroPlus className="w-3.5 h-3.5 mr-1" />
                    Tambah Indikator
                  </Button>
                </div>

                {/* KPI Table / Repeater Pattern */}
                <div className="rounded-xl border border-line bg-surface overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-muted border-b border-line text-fg-muted font-semibold select-none">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">No</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Indikator</th>
                          <th className="py-2.5 px-3 w-32">Target</th>
                          <th className="py-2.5 px-3 w-32">Satuan</th>
                          <th className="py-2.5 px-3 w-12 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line-row">
                        {formData.kpi_items.map((kpi, idx) => (
                          <tr key={kpi.id} className="hover:bg-hover-bg/50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-fg-muted align-middle">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 align-middle">
                              <Input
                                value={kpi.indicator}
                                onChange={(e) => handleKpiChange(kpi.id, 'indicator', e.target.value)}
                                placeholder="Santri lulus sertifikasi"
                                required
                                className="text-xs min-h-[38px] sm:min-h-0"
                              />
                            </td>
                            <td className="py-2.5 px-3 align-middle">
                              <Input
                                value={kpi.target_value}
                                onChange={(e) => handleKpiChange(kpi.id, 'target_value', e.target.value)}
                                placeholder="100"
                                className="text-xs min-h-[38px] sm:min-h-0"
                              />
                            </td>
                            <td className="py-2.5 px-3 align-middle">
                              <Input
                                value={kpi.target_unit}
                                onChange={(e) => handleKpiChange(kpi.id, 'target_unit', e.target.value)}
                                placeholder="Orang / %"
                                className="text-xs min-h-[38px] sm:min-h-0"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center align-middle">
                              {formData.kpi_items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveKpi(kpi.id)}
                                  className="p-1.5 text-fg-muted hover:text-red-500 transition-colors rounded cursor-pointer inline-flex items-center justify-center"
                                  title="Hapus Indikator"
                                  aria-label="Hapus Indikator"
                                >
                                  <HeroTrash className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Section>

            {/* SECTION 5: RENCANA ANGGARAN BIAYA (RAB) */}
            <Section
              title="Rencana Anggaran Biaya (RAB)"
              icon={<HeroCurrencyDollar className="w-5 h-5 text-amber-500" />}
              columns={1}
            >
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div className="w-full sm:w-80">
                    <label className="block text-xs sm:text-sm font-semibold text-fg mb-1.5">
                      Pagu Anggaran Total
                    </label>
                    <NumberInput
                      prefix="Rp"
                      value={formData.budget_allocated}
                      onChange={(val) => set('budget_allocated', val || 0)}
                      disabled={formData.budget_breakdown.length > 0}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddBudgetItem}
                    className="text-xs text-primary hover:text-primary-600 font-medium py-1 px-2.5 h-8 shrink-0 self-start sm:self-auto"
                  >
                    <HeroPlus className="w-3.5 h-3.5 mr-1" />
                    + Rincian Biaya
                  </Button>
                </div>

                {/* RAB Repeater Table */}
                {formData.budget_breakdown.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-line">
                    <span className="block text-xs font-medium text-fg-muted">
                      Rincian Komponen Biaya
                    </span>

                    <div className="rounded-xl border border-line bg-surface overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface-muted border-b border-line text-fg-muted font-semibold select-none">
                            <tr>
                              <th className="py-2.5 px-3 w-12 text-center">No</th>
                              <th className="py-2.5 px-3 min-w-[240px]">Uraian Biaya</th>
                              <th className="py-2.5 px-3 w-48">Nominal (Rp)</th>
                              <th className="py-2.5 px-3 w-12 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line-row">
                            {formData.budget_breakdown.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-hover-bg/50 transition-colors">
                                <td className="py-2.5 px-3 text-center font-mono text-fg-muted align-middle">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-3 align-middle">
                                  <Input
                                    value={item.name}
                                    onChange={(e) => handleBudgetItemChange(item.id, 'name', e.target.value)}
                                    placeholder="ATK / Transport / Konsumsi"
                                    className="text-xs min-h-[38px] sm:min-h-0"
                                  />
                                </td>
                                <td className="py-2.5 px-3 align-middle">
                                  <NumberInput
                                    prefix="Rp"
                                    value={item.nominal}
                                    onChange={(val) => handleBudgetItemChange(item.id, 'nominal', val || 0)}
                                    placeholder="0"
                                    className="text-xs min-h-[38px] sm:min-h-0"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBudgetItem(item.id)}
                                    className="p-1.5 text-fg-muted hover:text-red-500 transition-colors rounded cursor-pointer inline-flex items-center justify-center"
                                    title="Hapus Rincian"
                                    aria-label="Hapus Rincian"
                                  >
                                    <HeroTrash className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface-muted border border-line text-xs">
                      <span className="text-fg-muted">Total Akumulasi Rincian:</span>
                      <span className="font-semibold text-fg text-sm">
                        Rp {totalBreakdown.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {hasBudgetMismatch && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
                        Total rincian anggaran (Rp {totalBreakdown.toLocaleString('id-ID')}) belum sesuai dengan Pagu Anggaran (Rp {formData.budget_allocated.toLocaleString('id-ID')}).
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Section>
          </div>

          {/* Sticky Footer Action Bar */}
          <div className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line py-3 px-4 sm:px-6 lg:px-8 shadow-lg">
            <div className="max-w-7xl mx-auto flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/programs')}
                className="w-full sm:w-auto justify-center"
              >
                Batal
              </Button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="w-full sm:w-auto justify-center font-semibold"
                >
                  <HeroCheck className="w-4 h-4 mr-1.5" />
                  {isSaving ? 'Memproses...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </PageContainer>
  )
}
