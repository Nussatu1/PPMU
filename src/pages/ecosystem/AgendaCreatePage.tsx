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
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { Program, Section as OrgSection } from '@/types/database'
import {
  HeroCalendar,
  HeroArrowLeft,
  HeroCheck,
  HeroPlus,
  HeroClock,
  HeroDocumentText,
} from '@/components/icons/HeroIcons'

type FormData = {
  title: string
  program_id: string
  section_id: string
  description: string
  location: string
  start_time: string
  end_time: string
  budget_estimated: number
}

const emptyForm = (): FormData => ({
  title: '',
  program_id: '',
  section_id: '',
  description: '',
  location: '',
  start_time: new Date().toISOString().slice(0, 16),
  end_time: new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16),
  budget_estimated: 0,
})

export const AgendaCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [programs, setPrograms] = useState<Program[]>([])
  const [sections, setSections] = useState<OrgSection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>(emptyForm())

  const orgId = currentOrganization?.id || ''

  const loadData = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const [progs, secs] = await Promise.all([
        dataService.getPrograms(orgId, user),
        dataService.getSections(orgId, undefined, user),
      ])
      setPrograms(progs)
      setSections(secs)
      if (progs.length > 0) {
        setFormData((prev) => ({
          ...prev,
          program_id: progs[0].id,
          section_id: progs[0].section_id || secs[0]?.id || '',
        }))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async (e: React.FormEvent, andCreateAnother = false) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      error('Validasi Gagal', 'Nama Kegiatan / Agenda wajib diisi')
      return
    }
    setIsSaving(true)
    try {
      await dataService.createAgenda(
        { ...formData, organization_id: orgId, status: 'planned' },
        user
      )
      success('Agenda Dijadwalkan', `"${formData.title}" telah berhasil dijadwalkan.`)
      if (andCreateAnother) {
        setFormData(emptyForm())
        if (programs.length > 0) {
          setFormData({
            ...emptyForm(),
            program_id: programs[0].id,
            section_id: programs[0].section_id || sections[0]?.id || '',
          })
        }
      } else {
        navigate('/agendas')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menjadwalkan agenda'
      error('Gagal', msg)
    } finally {
      setIsSaving(false)
    }
  }

  const set = (field: keyof FormData, value: string | number) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  return (
    <PageContainer variant="form">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumb
            items={[
              { label: 'Organisasi', href: '/agendas' },
              { label: 'Agenda & Kegiatan', href: '/agendas' },
              { label: 'Jadwalkan Baru' },
            ]}
          />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Jadwalkan Agenda Baru
          </h1>
          <p className="hidden sm:block text-xs sm:text-sm text-fg-muted">
            Lengkapi rincian kegiatan, induk program kerja, jadwal waktu, serta estimasi kebutuhan anggaran.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<HeroArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/agendas')}
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
        <form noValidate onSubmit={(e) => handleSave(e, false)} className="space-y-6">
          <SectionGrid columns={12}>
            {/* IDENTITAS KEGIATAN (Desktop: 6 cols / 50%) */}
            <Section
              title="Identitas Kegiatan"
              description="Nama kegiatan, relasi induk program kerja, dan seksi penanggung jawab."
              icon={<HeroCalendar className="w-5 h-5" />}
              columns={1}
              className="lg:col-span-6"
            >
              <Input
                label="Nama Kegiatan / Agenda"
                required
                value={formData.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Contoh: Workshop Penulisan Jurnal Bereputasi Internasional"
              />
              <Select
                label="Induk Program Kerja"
                required
                value={formData.program_id}
                options={programs.map((p) => ({ value: p.id, label: p.title }))}
                onChange={(e) => {
                  const pId = e.target.value
                  const sel = programs.find((p) => p.id === pId)
                  setFormData((prev) => ({
                    ...prev,
                    program_id: pId,
                    section_id: sel?.section_id || prev.section_id,
                  }))
                }}
              />
              <Select
                label="Seksi Penanggung Jawab"
                value={formData.section_id}
                options={sections.map((s) => ({ value: s.id, label: s.name }))}
                onChange={(e) => set('section_id', e.target.value)}
              />
            </Section>

            {/* WAKTU & LOKASI (Desktop: 6 cols / 50%) */}
            <Section
              title="Waktu & Lokasi"
              description="Jadwal waktu mulai, target selesai, dan tempat pelaksanaan agenda."
              icon={<HeroClock className="w-5 h-5" />}
              columns={1}
              className="lg:col-span-6"
            >
              <DateTimePicker
                label="Waktu Mulai"
                value={formData.start_time}
                onChange={(val) => set('start_time', val)}
              />
              <DateTimePicker
                label="Waktu Selesai"
                value={formData.end_time}
                onChange={(val) => set('end_time', val)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Lokasi / Ruangan"
                  value={formData.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="Contoh: Ruang Seminar Utama Lt. 3"
                />
                <NumberInput
                  label="Estimasi Kebutuhan Anggaran"
                  prefix="Rp"
                  value={formData.budget_estimated}
                  onChange={(val) => set('budget_estimated', val || 0)}
                />
              </div>
            </Section>

            {/* DESKRIPSI & SUSUNAN ACARA (Desktop: 12 cols / 100%) */}
            <Section
              title="Deskripsi & Susunan Acara"
              description="Rundown, sasaran peserta, dan catatan teknis pelaksanaan agenda."
              icon={<HeroDocumentText className="w-5 h-5" />}
              columns={1}
              className="col-span-full"
            >
              <Textarea
                label="Deskripsi / Agenda Kegiatan"
                rows={3}
                autoGrow
                value={formData.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Tuliskan gambaran pelaksanaan kegiatan, pembicara yang diundang, atau target output..."
              />
            </Section>
          </SectionGrid>

          {/* Actions Bar */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/agendas')}
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
                className="w-full sm:w-auto justify-center"
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
