import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
import type { Program } from '@/types/database'
import {
  HeroChartBar,
  HeroArrowLeft,
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

const emptyForm = (progs: Program[]): FormData => ({
  kpi_name: '',
  program_id: progs[0]?.id || '',
  period: 'Q1 2026',
  target: 100,
  realized: 0,
  unit: 'Kegiatan',
  evidence_urls: [],
  notes: '',
})

export const PerformanceCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>(emptyForm([]))

  const orgId = currentOrganization?.id || ''
  const set = <K extends keyof FormData>(f: K, v: FormData[K]) =>
    setFormData((p) => ({ ...p, [f]: v }))

  const loadData = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const progs = await dataService.getPrograms(orgId, user)
      setPrograms(progs)
      setFormData(emptyForm(progs))
    } catch (err: unknown) {
      error('Kesalahan', err instanceof Error ? err.message : 'Gagal memuat data')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async (e: React.FormEvent, andCreateAnother = false) => {
    e.preventDefault()
    if (!formData.kpi_name.trim() || !formData.program_id) {
      error('Validasi Gagal', 'Nama Indikator dan Program wajib diisi')
      return
    }

    setIsSaving(true)
    try {
      await dataService.createPerformance(
        {
          ...formData,
          organization_id: orgId,
          evidence_urls: formData.evidence_urls || [],
        },
        user
      )

      success('KPI Ditambahkan', `"${formData.kpi_name}" berhasil ditambahkan.`)
      if (andCreateAnother) {
        setFormData(emptyForm(programs))
      } else {
        navigate('/performance')
      }
    } catch (err: unknown) {
      error('Gagal', err instanceof Error ? err.message : 'Gagal menambahkan KPI')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageContainer variant="form">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumb
            items={[
              { label: 'Organisasi', href: '/performance' },
              { label: 'Capaian Kinerja', href: '/performance' },
              { label: 'Tambah Indikator' },
            ]}
          />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Tambah Indikator KPI Baru
          </h1>
          <p className="text-sm text-fg-muted">
            Daftarkan metrik indikator kinerja utama, target sasaran numerik, dan berkas bukti fisik.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<HeroArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/performance')}
          className="hidden sm:inline-flex"
        >
          Kembali
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form noValidate onSubmit={(e) => handleSave(e, false)} className="space-y-5">
          {/* Identitas Indikator */}
          <Section
            title="Identitas Indikator Kinerja"
            description="Nama spesifik indikator, relasi program kerja induk, dan rentang periode evaluasi."
            icon={<HeroChartBar className="w-5 h-5" />}
            columns={12}
          >
            <div className="col-span-full">
              <Input
                label="Nama Indikator KPI"
                required
                value={formData.kpi_name}
                onChange={(e) => set('kpi_name', e.target.value)}
                placeholder="Contoh: Jumlah Publikasi Riset Terindeks Scopus"
              />
            </div>
            <div className="col-span-full md:col-span-7">
              <Select
                label="Induk Program Kerja"
                required
                value={formData.program_id}
                onValueChange={(val) => set('program_id', String(val))}
                options={programs.map((p) => ({ value: p.id, label: p.title }))}
              />
            </div>
            <div className="col-span-full md:col-span-5">
              <Input
                label="Periode Evaluasi"
                value={formData.period}
                onChange={(e) => set('period', e.target.value)}
                placeholder="Contoh: Q1 2026 / Semester Genap"
              />
            </div>
          </Section>

          {/* Target & Realisasi */}
          <Section
            title="Target & Capaian Berjalan"
            description="Angka kuantitatif target, capaian yang terealisasi saat ini, dan unit satuan ukur."
            icon={<HeroCheckCircle className="w-5 h-5" />}
            columns={12}
          >
            <div className="col-span-full md:col-span-4">
              <NumberInput
                label="Target Angka"
                required
                value={formData.target}
                onChange={(val) => set('target', val || 0)}
              />
            </div>
            <div className="col-span-full md:col-span-4">
              <NumberInput
                label="Realisasi Saat Ini"
                required
                value={formData.realized}
                onChange={(val) => set('realized', val || 0)}
              />
            </div>
            <div className="col-span-full md:col-span-4">
              <Input
                label="Satuan Ukur"
                value={formData.unit}
                onChange={(e) => set('unit', e.target.value)}
                placeholder="Contoh: Dokumen / Persen"
                helperText="Tentukan unit kuantitatif."
              />
            </div>
          </Section>

          {/* Bukti & Catatan */}
          <Section
            title="Bukti Fisik & Catatan Tambahan"
            description="Unggah berkas bukti laporan lapangan dan catatan progres ketercapaian KPI."
            icon={<HeroDocumentText className="w-5 h-5" />}
            columns={1}
          >
            <FileUpload
              label="Unggah Berkas Bukti Fisik / Dokumentasi Lapangan"
              value={formData.evidence_urls}
              onChange={(val) => set('evidence_urls', val)}
              accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
              multiple
              helperText="Unggah berkas laporan, foto kegiatan, atau dokumen pendukung KPI (Maks. 10 MB per berkas)."
            />
            <Textarea
              label="Catatan Progres / Kendala"
              rows={3}
              autoGrow
              value={formData.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Catatan mengenai perkembangan capaian, hambatan yang ditemui, atau keterangan pendukung..."
            />
          </Section>

          {/* Actions Bar */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/performance')}
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
