import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { Program, Section as OrgSection, Personnel } from '@/types/database'
import {
  HeroBriefcase,
  HeroArrowLeft,
  HeroCheck,
  HeroCurrencyDollar,
  HeroCalendar,
  HeroDocumentText,
} from '@/components/icons/HeroIcons'

export const ProgramEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [program, setProgram] = useState<Program | null>(null)
  const [sections, setSections] = useState<OrgSection[]>([])
  const [personnels, setPersonnels] = useState<Personnel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    section_id: '',
    pic_personnel_id: '',
    description: '',
    budget_allocated: 0,
    target_kpi: '',
    start_date: '',
    end_date: '',
  })

  const orgId = currentOrganization?.id || ''
  const set = (f: keyof typeof formData, v: string | number) =>
    setFormData((p) => ({ ...p, [f]: v }))

  const loadData = useCallback(async () => {
    if (!orgId || !id) return
    setIsLoading(true)
    try {
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
      setFormData({
        title: found.title || found.name || '',
        code: found.code,
        section_id: found.section_id,
        pic_personnel_id: found.pic_personnel_id || '',
        description: found.description || '',
        budget_allocated: found.budget_allocated || found.budget_planned || 0,
        target_kpi: found.target_kpi || '',
        start_date: found.start_date || '',
        end_date: found.end_date || '',
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.code.trim() || !formData.section_id) {
      error('Validasi Gagal', 'Judul, Kode, dan Seksi pelaksana wajib diisi')
      return
    }
    if (!program) return
    setIsSaving(true)
    try {
      const matchedPrs = personnels.find((p) => p.id === formData.pic_personnel_id)
      const picLabel = matchedPrs
        ? `${matchedPrs.position}${matchedPrs.name ? ` (${matchedPrs.name})` : ''}`
        : undefined
      await dataService.updateProgram(
        program.id,
        {
          ...formData,
          pic_name: picLabel,
          pic_structure_id: formData.pic_personnel_id || undefined,
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
        <div className="space-y-1">
          <Breadcrumb
            items={[
              { label: 'Organisasi', href: '/programs' },
              { label: 'Program Kerja', href: '/programs' },
              { label: program?.title || 'Edit Program' },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            {program?.title || 'Edit Program Kerja'}
          </h1>
          <p className="text-sm text-fg-muted">
            Perbarui rencana kegiatan, target capaian, alokasi anggaran, atau personel penanggung jawab.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<HeroArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/programs')}
          className="shrink-0 self-start sm:self-auto"
        >
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
            {/* Identitas Program */}
            <Section
              title="Identitas Program"
              description="Judul utama, kode unik referensi, seksi pelaksana, dan penanggung jawab teknis."
              icon={<HeroBriefcase className="w-5 h-5" />}
              columns={12}
              className="lg:col-span-7"
            >
              <div className="col-span-full">
                <Input
                  label="Nama / Judul Program Kerja"
                  required
                  value={formData.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Contoh: Digitalisasi Layanan Riset Terpadu"
                />
              </div>
              <div className="col-span-full sm:col-span-4">
                <Input
                  label="Kode Program"
                  required
                  value={formData.code}
                  onChange={(e) => set('code', e.target.value.toUpperCase())}
                  placeholder="PRG-RST-26"
                  className="font-mono uppercase"
                />
              </div>
              <div className="col-span-full sm:col-span-8">
                <Select
                  label="Seksi Pelaksana"
                  required
                  value={formData.section_id}
                  options={sections.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.code})`,
                  }))}
                  onChange={(e) => set('section_id', e.target.value)}
                />
              </div>
              <div className="col-span-full">
                <Select
                  label="Penanggung Jawab (PIC)"
                  value={formData.pic_personnel_id}
                  options={personnels.map((p) => ({
                    value: p.id,
                    label: `${p.position}${p.name ? ` • ${p.name}` : ''}`,
                  }))}
                  onChange={(e) => set('pic_personnel_id', e.target.value)}
                  helperText="Personel yang bertindak sebagai pemegang komitmen program."
                />
              </div>
            </Section>

            {/* Target & Anggaran */}
            <Section
              title="Target & Anggaran"
              description="Indikator kinerja yang dituju dan pagu dana yang dialokasikan organisasi."
              icon={<HeroCurrencyDollar className="w-5 h-5" />}
              columns={12}
              className="lg:col-span-5"
            >
              <div className="col-span-full">
                <Input
                  label="Target Indikator Kinerja Utama (KPI)"
                  value={formData.target_kpi}
                  onChange={(e) => set('target_kpi', e.target.value)}
                  placeholder="Contoh: 100 Publikasi Ilmiah Terindeks"
                />
              </div>
              <div className="col-span-full">
                <NumberInput
                  label="Pagu Anggaran Dialokasikan"
                  prefix="Rp"
                  value={formData.budget_allocated}
                  onChange={(val) => set('budget_allocated', val || 0)}
                  helperText="Estimasi pagu anggaran tahun berjalan."
                />
              </div>
            </Section>

            {/* Jadwal Pelaksanaan */}
            <Section
              title="Jadwal Pelaksanaan"
              description="Rentang waktu pelaksanaan operasional program."
              icon={<HeroCalendar className="w-5 h-5" />}
              columns={12}
              className="col-span-full"
            >
              <div className="col-span-full sm:col-span-6">
                <DatePicker
                  label="Tanggal Mulai Pelaksanaan"
                  value={formData.start_date}
                  onChange={(val) => set('start_date', val)}
                />
              </div>
              <div className="col-span-full sm:col-span-6">
                <DatePicker
                  label="Target Tanggal Selesai"
                  value={formData.end_date}
                  onChange={(val) => set('end_date', val)}
                />
              </div>
            </Section>

            {/* Uraian Program */}
            <Section
              title="Uraian Program"
              description="Latar belakang, sasaran strategis, serta ruang lingkup kegiatan."
              icon={<HeroDocumentText className="w-5 h-5" />}
              columns={1}
              className="col-span-full"
            >
              <Textarea
                label="Uraian & Sasaran Program"
                rows={3}
                autoGrow
                value={formData.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Jelaskan tujuan strategis, output yang diharapkan, dan mekanisme pelaksanaan..."
              />
            </Section>
          </SectionGrid>

          {/* Actions Bar */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/programs')}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
            >
              <HeroCheck className="w-4 h-4 mr-1.5" />
              {isSaving ? 'Memproses...' : 'Perbarui'}
            </Button>
          </div>
        </form>
      )}
    </PageContainer>
  )
}
