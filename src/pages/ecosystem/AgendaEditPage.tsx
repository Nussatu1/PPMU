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
import { NumberInput } from '@/components/ui/NumberInput'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { Agenda, Program, Section as OrgSection } from '@/types/database'
import {
  HeroCalendar,
  HeroArrowLeft,
  HeroCheck,
  HeroClock,
  HeroDocumentText,
} from '@/components/icons/HeroIcons'

export const AgendaEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [agenda, setAgenda] = useState<Agenda | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [sections, setSections] = useState<OrgSection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    program_id: '',
    section_id: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    budget_estimated: 0,
  })

  const orgId = currentOrganization?.id || ''

  const loadData = useCallback(async () => {
    if (!orgId || !id) return
    setIsLoading(true)
    try {
      const [agds, progs, secs] = await Promise.all([
        dataService.getAgendas(orgId, undefined, user),
        dataService.getPrograms(orgId, user),
        dataService.getSections(orgId, undefined, user),
      ])
      const found = agds.find((a) => a.id === id)
      if (!found) {
        error('Tidak Ditemukan', 'Agenda tidak ditemukan')
        navigate('/agendas')
        return
      }
      setAgenda(found)
      setPrograms(progs)
      setSections(secs)
      setFormData({
        title: found.title,
        program_id: found.program_id || '',
        section_id: found.section_id || '',
        description: found.description || '',
        location: found.location || '',
        start_time: found.start_time?.slice(0, 16) || '',
        end_time: found.end_time?.slice(0, 16) || '',
        budget_estimated: found.budget_estimated || 0,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat agenda'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, id, user, error, navigate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      error('Validasi Gagal', 'Nama Kegiatan / Agenda wajib diisi')
      return
    }
    if (!agenda) return
    setIsSaving(true)
    try {
      await dataService.updateAgenda(agenda.id, formData, user)
      success('Agenda Diperbarui', `"${formData.title}" berhasil diperbarui.`)
      navigate('/agendas')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui agenda'
      error('Gagal', msg)
    } finally {
      setIsSaving(false)
    }
  }

  const set = (field: keyof typeof formData, value: string | number) =>
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
              { label: agenda?.title || 'Edit Agenda' },
            ]}
          />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            {agenda?.title || 'Edit Agenda Kegiatan'}
          </h1>
          <p className="text-sm text-fg-muted">
            Perbarui waktu, ruangan, alokasi anggaran, atau rincian teknis pelaksanaan kegiatan.
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
        <form noValidate onSubmit={handleSave} className="space-y-6">
          <SectionGrid columns={12}>
            {/* IDENTITAS KEGIATAN (Desktop: 6 cols / 50%) */}
            <Section
              title="Identitas Kegiatan"
              description="Nama agenda, induk program kerja, dan seksi penanggung jawab."
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
