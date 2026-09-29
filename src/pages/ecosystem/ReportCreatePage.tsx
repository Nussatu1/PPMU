import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Section } from '@/components/ui/Section'
import { SectionGrid } from '@/components/ui/SectionGrid'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { NumberInput } from '@/components/ui/NumberInput'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { Program } from '@/types/database'
import {
  HeroClipboardDocumentList,
  HeroArrowLeft,
  HeroCheck,
  HeroPlus,
  HeroCurrencyDollar,
  HeroDocumentText,
  HeroExclamationTriangle,
} from '@/components/icons/HeroIcons'

type FormData = {
  title: string
  program_id: string
  period: string
  content: string
  achievement_summary: string
  budget_spent: number
  evaluation_constraints: string
  evaluation_lessons: string
  evaluation_recommendations: string
}

const emptyForm = (progs: Program[]): FormData => ({
  title: '',
  program_id: progs[0]?.id || '',
  period: 'Bulan Maret 2026',
  content: '',
  achievement_summary: '',
  budget_spent: 0,
  evaluation_constraints: '',
  evaluation_lessons: '',
  evaluation_recommendations: '',
})

export const ReportCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>(emptyForm([]))

  const orgId = currentOrganization?.id || ''
  const set = (f: keyof FormData, v: string | number) =>
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
    if (!formData.title.trim() || !formData.program_id || !formData.content.trim()) {
      error('Validasi Gagal', 'Judul, Program, dan Uraian Laporan wajib diisi')
      return
    }
    setIsSaving(true)
    try {
      await dataService.createReport(
        { ...formData, organization_id: orgId, status: 'draft' },
        user
      )
      success('Laporan Disusun', `"${formData.title}" berhasil dibuat sebagai draft.`)
      if (andCreateAnother) {
        setFormData(emptyForm(programs))
      } else {
        navigate('/reports')
      }
    } catch (err: unknown) {
      error('Gagal', err instanceof Error ? err.message : 'Gagal membuat laporan')
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
              { label: 'Organisasi', href: '/reports' },
              { label: 'Laporan & Evaluasi', href: '/reports' },
              { label: 'Susun Baru' },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            Susun Laporan Kinerja Baru
          </h1>
          <p className="text-sm text-fg-muted">
            Dokumentasikan pelaksanaan program kerja, realisasi penyerapan dana, kendala, dan evaluasi hasil.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<HeroArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/reports')}
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
          <SectionGrid columns={12}>
            {/* Identitas Laporan */}
            <Section
              title="Identitas Laporan"
              description="Judul dokumen laporan, program induk yang dipertanggungjawabkan, dan periode."
              icon={<HeroClipboardDocumentList className="w-5 h-5" />}
              columns={12}
              className="lg:col-span-7"
            >
              <div className="col-span-full">
                <Input
                  label="Judul Laporan"
                  required
                  value={formData.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Contoh: Laporan Akuntabilitas Pelaksanaan Riset Semester 1"
                />
              </div>
              <div className="col-span-full sm:col-span-7">
                <Select
                  label="Induk Program"
                  required
                  value={formData.program_id}
                  options={programs.map((p) => ({
                    value: p.id,
                    label: p.title || p.name,
                  }))}
                  onChange={(e) => set('program_id', e.target.value)}
                />
              </div>
              <div className="col-span-full sm:col-span-5">
                <Input
                  label="Periode Laporan"
                  value={formData.period}
                  onChange={(e) => set('period', e.target.value)}
                  placeholder="Contoh: Triwulan I 2026"
                />
              </div>
            </Section>

            {/* Capaian & Realisasi Dana */}
            <Section
              title="Capaian & Realisasi Dana"
              description="Ringkasan persentase capaian dan jumlah dana yang telah terserap pada kegiatan ini."
              icon={<HeroCurrencyDollar className="w-5 h-5" />}
              columns={12}
              className="lg:col-span-5"
            >
              <div className="col-span-full">
                <Input
                  label="Ringkasan Capaian Utama"
                  value={formData.achievement_summary}
                  onChange={(e) => set('achievement_summary', e.target.value)}
                  placeholder="Contoh: Capaian 94% dari target rencana"
                />
              </div>
              <div className="col-span-full">
                <NumberInput
                  label="Realisasi Dana yang Dilaporkan"
                  prefix="Rp"
                  value={formData.budget_spent}
                  onChange={(val) => set('budget_spent', val || 0)}
                  helperText="Total serapan kas yang dilaporkan."
                />
              </div>
            </Section>

            {/* Uraian Pelaksanaan Kegiatan */}
            <Section
              title="Uraian Pelaksanaan Kegiatan"
              description="Narasi terperinci mengenai rangkaian kegiatan, luaran, dan keterlibatan personel."
              icon={<HeroDocumentText className="w-5 h-5" />}
              columns={1}
              className="col-span-full"
            >
              <Textarea
                label="Uraian Lengkap Laporan & Realisasi Kegiatan"
                rows={3}
                autoGrow
                required
                value={formData.content}
                onChange={(e) => set('content', e.target.value)}
                placeholder="Jelaskan secara komprehensif latar belakang, tahapan pelaksanaan, jumlah peserta, output konkret, dan status akhir kegiatan..."
              />
            </Section>

            {/* Evaluasi, Kendala & Rekomendasi */}
            <Section
              title="Evaluasi, Kendala & Rekomendasi"
              description="Analisis hambatan di lapangan, pembelajaran, dan rekomendasi tindak lanjut bagi pimpinan."
              icon={<HeroExclamationTriangle className="w-5 h-5" />}
              columns={3}
              className="col-span-full"
            >
              <Textarea
                label="Kendala yang Dihadapi"
                rows={3}
                autoGrow
                value={formData.evaluation_constraints}
                onChange={(e) => set('evaluation_constraints', e.target.value)}
                placeholder="Faktor penghambat pelaksanaan..."
              />
              <Textarea
                label="Pelajaran (Lessons Learned)"
                rows={3}
                autoGrow
                value={formData.evaluation_lessons}
                onChange={(e) => set('evaluation_lessons', e.target.value)}
                placeholder="Poin pembelajaran utama..."
              />
              <Textarea
                label="Rekomendasi Tindak Lanjut"
                rows={3}
                autoGrow
                value={formData.evaluation_recommendations}
                onChange={(e) => set('evaluation_recommendations', e.target.value)}
                placeholder="Saran perbaikan ke depan..."
              />
            </Section>
          </SectionGrid>

          {/* Actions Bar */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/reports')}
            >
              Batal
            </Button>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={(e) => handleSave(e as unknown as React.FormEvent, true)}
              >
                <HeroPlus className="w-4 h-4 mr-1.5" />
                Buat & Buat Lainnya
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
              >
                <HeroCheck className="w-4 h-4 mr-1.5" />
                {isSaving ? 'Memproses...' : 'Buat'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </PageContainer>
  )
}
