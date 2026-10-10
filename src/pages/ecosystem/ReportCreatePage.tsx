import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { NumberInput } from '@/components/ui/NumberInput'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { Program, Section as OrgSection } from '@/types/database'
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
  section_id?: string
  period: string
  content: string
  achievement_summary: string
  budget_spent: number
  evaluation_constraints: string
  evaluation_lessons: string
  evaluation_recommendations: string
}

const emptyForm = (progs: Program[], secs: OrgSection[]): FormData => ({
  title: '',
  program_id: progs[0]?.id || '',
  section_id: secs[0]?.id || '',
  period: 'Triwulan I 2026',
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
  const [sections, setSections] = useState<OrgSection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>(emptyForm([], []))

  const orgId = currentOrganization?.id || ''
  const set = (f: keyof FormData, v: string | number) =>
    setFormData((p) => ({ ...p, [f]: v }))

  const loadData = useCallback(async () => {
    if (!orgId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const [progs, secs] = await Promise.all([
        dataService.getPrograms(orgId, user),
        dataService.getSections(orgId, undefined, user),
      ])
      setPrograms(progs)
      setSections(secs)
      setFormData(emptyForm(progs, secs))
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
        setFormData(emptyForm(programs, sections))
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
              { label: 'Laporan', href: '/reports' },
              { label: 'Laporan Baru' },
            ]}
          />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Laporan Baru
          </h1>
          <p className="text-xs sm:text-sm text-fg-muted">
            Susun laporan pertanggungjawaban kegiatan, realisasi dana, dan evaluasi kendala.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<HeroArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/reports')}
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
        <form noValidate onSubmit={(e) => handleSave(e, false)} className="space-y-6 pb-20 sm:pb-24">
          <div className="space-y-6">
            {/* SECTION 1: INFORMASI LAPORAN (DENGAN 3 SELECTION BERDAMPINGAN) */}
            <Section
              title="Informasi & Ruang Lingkup Laporan"
              icon={<HeroClipboardDocumentList className="w-5 h-5 text-amber-500" />}
              columns={1}
            >
              <div className="space-y-5">
                <Input
                  label="Judul Laporan"
                  required
                  value={formData.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Contoh: Laporan Akuntabilitas Layanan Riset Terpadu Triwulan I"
                />

                {/* 3 SELECTION DALAM 1 BARIS BERDAMPINGAN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <Select
                    label="Program Kerja"
                    required
                    value={formData.program_id}
                    options={
                      programs.length === 0
                        ? [{ value: '', label: 'Belum ada program' }]
                        : programs.map((p) => ({
                            value: p.id,
                            label: `${p.title || p.name}${p.code ? ` (${p.code})` : ''}`,
                          }))
                    }
                    onChange={(e) => set('program_id', e.target.value)}
                    helperText="Program induk yang dilaporkan"
                  />

                  <Select
                    label="Unit / Seksi Pelaksana"
                    value={formData.section_id || ''}
                    options={
                      sections.length === 0
                        ? [{ value: '', label: 'Seksi Utama / Internal' }]
                        : [
                            { value: '', label: '— Seluruh Seksi / Terpadu —' },
                            ...sections.map((s) => ({
                              value: s.id,
                              label: `${s.name} (${s.code})`,
                            })),
                          ]
                    }
                    onChange={(e) => set('section_id', e.target.value)}
                    helperText="Unit penanggung jawab kegiatan"
                  />

                  <Select
                    label="Periode Pelaporan"
                    value={formData.period}
                    options={[
                      { value: 'Triwulan I 2026', label: 'Triwulan I (Jan - Mar 2026)' },
                      { value: 'Triwulan II 2026', label: 'Triwulan II (Apr - Jun 2026)' },
                      { value: 'Triwulan III 2026', label: 'Triwulan III (Jul - Sep 2026)' },
                      { value: 'Triwulan IV 2026', label: 'Triwulan IV (Okt - Des 2026)' },
                      { value: 'Bulan Maret 2026', label: 'Bulan Maret 2026' },
                      { value: 'Tahunan 2026', label: 'Tahunan Periode 2026' },
                    ]}
                    onChange={(e) => set('period', e.target.value)}
                    helperText="Rentang waktu siklus pelaporan"
                  />
                </div>
              </div>
            </Section>

            {/* SECTION 2: CAPAIAN & REALISASI DANA */}
            <Section
              title="Capaian & Realisasi Dana"
              icon={<HeroCurrencyDollar className="w-5 h-5 text-amber-500" />}
              columns={2}
            >
              <div>
                <Input
                  label="Ringkasan Capaian Output"
                  value={formData.achievement_summary}
                  onChange={(e) => set('achievement_summary', e.target.value)}
                  placeholder="Contoh: Terealisasi 94% — 47 modul riset dipublikasikan"
                  helperText="Keterangan ringkas persentase atau output fisik"
                />
              </div>

              <div>
                <NumberInput
                  label="Realisasi Dana (Diserap)"
                  prefix="Rp"
                  value={formData.budget_spent}
                  onChange={(val) => set('budget_spent', val || 0)}
                  helperText="Total dana kas yang telah terealisasi sesuai bukti"
                />
              </div>
            </Section>

            {/* SECTION 3: URAIAN PELAKSANAAN KEGIATAN */}
            <Section
              title="Uraian Pelaksanaan Kegiatan"
              icon={<HeroDocumentText className="w-5 h-5 text-amber-500" />}
              columns={1}
            >
              <Textarea
                label="Uraian Lengkap Kegiatan"
                rows={4}
                autoGrow
                required
                value={formData.content}
                onChange={(e) => set('content', e.target.value)}
                placeholder="Deskripsikan latar belakang, tahapan pelaksanaan, jumlah peserta, output konkret..."
              />
            </Section>

            {/* SECTION 4: EVALUASI & KENDALA (TETAP SEBAGAIMANA SEKARANG - 3 KOLOM) */}
            <Section
              title="Evaluasi & Kendala"
              icon={<HeroExclamationTriangle className="w-5 h-5 text-amber-500" />}
              columns={3}
            >
              <Textarea
                label="Kendala"
                rows={3}
                autoGrow
                value={formData.evaluation_constraints}
                onChange={(e) => set('evaluation_constraints', e.target.value)}
                placeholder="Faktor penghambat..."
                helperText="Hambatan yang terjadi saat kegiatan berlangsung"
              />
              <Textarea
                label="Pembelajaran"
                rows={3}
                autoGrow
                value={formData.evaluation_lessons}
                onChange={(e) => set('evaluation_lessons', e.target.value)}
                placeholder="Poin pembelajaran..."
                helperText="Pelajaran penting untuk program mendatang"
              />
              <Textarea
                label="Rekomendasi"
                rows={3}
                autoGrow
                value={formData.evaluation_recommendations}
                onChange={(e) => set('evaluation_recommendations', e.target.value)}
                placeholder="Rekomendasi tindak lanjut..."
                helperText="Langkah konkret bagi pimpinan / seksi pelaksana"
              />
            </Section>
          </div>

          {/* Sticky Footer Action Bar */}
          <div className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line py-3 px-4 sm:px-6 lg:px-8 shadow-lg">
            <div className="max-w-7xl mx-auto flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/reports')}
                className="w-full sm:w-auto justify-center"
              >
                Batal
              </Button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={(e) => handleSave(e as unknown as React.FormEvent, true)}
                  className="w-full sm:w-auto justify-center"
                >
                  <HeroPlus className="w-4 h-4 mr-1.5" />
                  Buat & Buat Lainnya
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="w-full sm:w-auto justify-center font-semibold"
                >
                  <HeroCheck className="w-4 h-4 mr-1.5" />
                  {isSaving ? 'Memproses...' : 'Simpan Laporan'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </PageContainer>
  )
}

