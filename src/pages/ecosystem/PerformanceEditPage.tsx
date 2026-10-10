import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FileUpload } from '@/components/ui/FileUpload'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { NumberInput } from '@/components/ui/NumberInput'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { Performance, Program } from '@/types/database'
import {
  HeroChartBar,
  HeroArrowLeft,
  HeroCheck,
  HeroCheckCircle,
  HeroDocumentText,
} from '@/components/icons/HeroIcons'

type FormData = {
  kpi_name: string
  program_id: string
  period: string
  target: number
  realized: number
  unit: string
  evidence_urls: string[]
  notes: string
}

export const PerformanceEditPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [performance, setPerformance] = useState<Performance | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    kpi_name: '',
    program_id: '',
    period: '',
    target: 0,
    realized: 0,
    unit: '',
    evidence_urls: [],
    notes: '',
  })

  const orgId = currentOrganization?.id || ''
  const set = <K extends keyof FormData>(f: K, v: FormData[K]) =>
    setFormData((p) => ({ ...p, [f]: v }))

  const loadData = useCallback(async () => {
    if (!id || !orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const [perfs, progs] = await Promise.all([
        dataService.getPerformances({ organizationId: orgId, mode: 'own' }, undefined, user),
        dataService.getPrograms(orgId, user),
      ])
      const perf = perfs.find((p) => p.id === id)
      if (!perf) {
        error('Tidak Ditemukan', 'Data kinerja tidak ditemukan')
        navigate('/performance')
        return
      }
      setPerformance(perf)
      setPrograms(progs)
      setFormData({
        kpi_name: perf.kpi_name || '',
        program_id: perf.program_id || '',
        period: perf.period || '',
        target: perf.target ?? 0,
        realized: perf.realized ?? 0,
        unit: perf.unit || '',
        evidence_urls: perf.evidence_urls || [],
        notes: perf.notes || '',
      })
    } catch (err: unknown) {
      error('Kesalahan', err instanceof Error ? err.message : 'Gagal memuat data kinerja')
    } finally {
      setIsLoading(false)
    }
  }, [id, orgId, user, error, navigate])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.kpi_name.trim()) {
      error('Validasi Gagal', 'Nama KPI wajib diisi')
      return
    }
    if (!id) return
    setIsSaving(true)
    try {
      await dataService.updatePerformance(id, formData, user)
      success('KPI Diperbarui', `"${formData.kpi_name}" berhasil diperbarui.`)
      navigate('/performance')
    } catch (err: unknown) {
      error('Gagal', err instanceof Error ? err.message : 'Gagal memperbarui KPI')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageContainer variant="form">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumb items={[
            { label: 'Kinerja', href: '/performance' },
            { label: performance?.kpi_name || 'Edit KPI' },
          ]} />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">Edit KPI</h1>
        </div>
        <Button variant="secondary" icon={<HeroArrowLeft className="w-4 h-4" />} onClick={() => navigate('/performance')} className="hidden sm:inline-flex">
          Kembali
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form noValidate onSubmit={handleSave} className="space-y-5">
          <Section title="Informasi KPI" icon={<HeroChartBar className="w-5 h-5" />} columns={12}>
            <div className="col-span-full">
              <Input label="Nama KPI" required value={formData.kpi_name} onChange={(e) => set('kpi_name', e.target.value)} placeholder="Publikasi Riset" />
            </div>
            <div className="col-span-full md:col-span-7">
              <Select label="Program" required value={formData.program_id}
                onValueChange={(val) => set('program_id', String(val))}
                options={programs.map((p) => ({ value: p.id, label: p.title }))}
              />
            </div>
            <div className="col-span-full md:col-span-5">
              <Input label="Periode" value={formData.period} onChange={(e) => set('period', e.target.value)} placeholder="Semester Genap" />
            </div>
          </Section>

          <Section title="Target & Capaian" icon={<HeroCheckCircle className="w-5 h-5" />} columns={12}>
            <div className="col-span-full md:col-span-4">
              <NumberInput label="Target" required value={formData.target} onChange={(val) => set('target', val || 0)} />
            </div>
            <div className="col-span-full md:col-span-4">
              <NumberInput label="Realisasi" required value={formData.realized} onChange={(val) => set('realized', val || 0)} />
            </div>
            <div className="col-span-full md:col-span-4">
              <Input label="Satuan" value={formData.unit} onChange={(e) => set('unit', e.target.value)} placeholder="Dokumen / %" />
            </div>
          </Section>

          <Section title="Bukti & Catatan" icon={<HeroDocumentText className="w-5 h-5" />} columns={1}>
            <FileUpload label="Bukti Fisik" value={formData.evidence_urls} onChange={(val) => set('evidence_urls', val)} accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" multiple />
            <Textarea label="Catatan" rows={3} autoGrow value={formData.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Catatan perkembangan atau kendala capaian..." />
          </Section>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => navigate('/performance')}>Batal</Button>
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
