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
import { DatePicker } from '@/components/ui/DatePicker'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { UnitAssignmentSelector } from '@/components/organization/UnitAssignmentSelector'
import type { Task, Program, Personnel, Report } from '@/types/database'

import {
  HeroCheckCircle,
  HeroArrowLeft,
  HeroCheck,
  HeroPlus,
  HeroClock,
  HeroDocumentText,
  HeroUserGroup,
} from '@/components/icons/HeroIcons'


type FormData = {
  title: string
  program_id: string
  source: string
  pic_personnel_id: string
  description: string
  priority: Task['priority']
  due_date: string
  result: string
  assigned_to_organization_id: string | null
}


const emptyForm = (progs: Program[]): FormData => ({
  title: '',
  program_id: progs[0]?.id || '',
  source: 'Temuan Evaluasi Internal',
  pic_personnel_id: '',
  description: '',
  priority: 'medium',
  due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  result: '',
  assigned_to_organization_id: null,
})


export const TaskCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [programs, setPrograms] = useState<Program[]>([])
  const [personnels, setPersonnels] = useState<Personnel[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>(emptyForm([]))

  const orgId = currentOrganization?.id || ''
  const set = (f: keyof FormData, v: string) =>
    setFormData((p) => ({ ...p, [f]: v }))

  const loadData = useCallback(async () => {
    if (!orgId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const [progs, pers, reps] = await Promise.all([
        dataService.getPrograms(orgId, user),
        dataService.getPersonnels(orgId, undefined, user),
        dataService.getReports(orgId, undefined, user),
      ])
      setPrograms(progs)
      setPersonnels(pers)
      setReports(reps)
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
    if (!formData.title.trim() || !formData.due_date) {
      error('Validasi Gagal', 'Nama Tugas dan Tenggat Waktu wajib diisi')
      return
    }
    setIsSaving(true)
    try {
      await dataService.createTask(
        { ...formData, organization_id: orgId, status: 'new' },
        user
      )
      success('Tugas Diterbitkan', `"${formData.title}" berhasil diterbitkan.`)
      if (andCreateAnother) {
        setFormData(emptyForm(programs))
      } else {
        navigate('/tasks')
      }
    } catch (err: unknown) {
      error('Gagal', err instanceof Error ? err.message : 'Gagal menerbitkan tugas')
    } finally {
      setIsSaving(false)
    }
  }

  const sourceOptions = [
    { value: 'Temuan Evaluasi Internal', label: 'Temuan Evaluasi Internal' },
    { value: 'Audit Kinerja Periodik', label: 'Audit Kinerja Periodik' },
    ...reports.map((r) => ({
      value: `Laporan: ${r.title}`,
      label: `Laporan: ${r.title}`,
    })),
    { value: 'Arahan Pimpinan', label: 'Arahan Pimpinan' },
  ]

  return (
    <PageContainer variant="form">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumb
            items={[
              { label: 'Organisasi', href: '/tasks' },
              { label: 'Tugas', href: '/tasks' },
              { label: 'Tugas Baru' },
            ]}
          />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Tugas Baru
          </h1>
        </div>
        <Button
          variant="secondary"
          icon={<HeroArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/tasks')}
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
        <form noValidate onSubmit={(e) => handleSave(e, false)} className="space-y-6">
          <SectionGrid columns={12}>
            {/* Identitas Tugas */}
            <Section
              title="Informasi Tugas"
              icon={<HeroCheckCircle className="w-5 h-5" />}
              columns={12}
              className="lg:col-span-6"
            >
              <div className="col-span-full">
                <Input
                  label="Nama Tugas"
                  required
                  value={formData.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Perbaikan Kurikulum"
                />
              </div>
              <div className="col-span-full sm:col-span-7">
                <Select
                  label="Program"
                  value={formData.program_id}
                  options={programs.map((p) => ({ value: p.id, label: p.title }))}
                  onChange={(e) => set('program_id', e.target.value)}
                />
              </div>
              <div className="col-span-full sm:col-span-5">
                <Select
                  label="Prioritas"
                  value={formData.priority}
                  options={[
                    { value: 'low', label: 'Rendah' },
                    { value: 'medium', label: 'Sedang' },
                    { value: 'high', label: 'Tinggi' },
                    { value: 'urgent', label: 'Mendesak' },
                  ]}
                  onChange={(e) => set('priority', e.target.value)}
                />
              </div>
            </Section>

            {/* Penugasan & Tenggat Waktu */}
            <Section
              title="Penugasan & Tenggat"
              icon={<HeroClock className="w-5 h-5" />}
              columns={12}
              className="lg:col-span-6"
            >
              <div className="col-span-full">
                <Select
                  label="PIC"
                  value={formData.pic_personnel_id}
                  options={personnels.map((p) => ({
                    value: p.id,
                    label: `${p.position}${p.name ? ` • ${p.name}` : ''}`,
                  }))}
                  onChange={(e) => set('pic_personnel_id', e.target.value)}
                />
              </div>
              <div className="col-span-full sm:col-span-6">
                <Select
                  label="Sumber Rujukan"
                  value={formData.source}
                  options={sourceOptions}
                  onChange={(e) => set('source', e.target.value)}
                />
              </div>
              <div className="col-span-full sm:col-span-6">
                <DatePicker
                  label="Tenggat"
                  required
                  value={formData.due_date}
                  onChange={(val) => set('due_date', val)}
                />
              </div>
            </Section>

            {/* Penugasan Unit (Stage 6) */}
            <Section
              title="Penugasan Unit"
              icon={<HeroUserGroup className="w-5 h-5" />}
              columns={1}
              className="lg:col-span-6"
            >
              <UnitAssignmentSelector
                value={formData.assigned_to_organization_id}
                onChange={(orgId) => set('assigned_to_organization_id', orgId as unknown as string)}
              />
            </Section>

            {/* Instruksi & Kriteria Keberhasilan */}
            <Section
              title="Instruksi"
              icon={<HeroDocumentText className="w-5 h-5" />}
              columns={1}
              className="col-span-full"
            >
              <Textarea
                label="Petunjuk Pelaksanaan"
                rows={3}
                autoGrow
                value={formData.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Rincian instruksi kerja dan kriteria verifikasi..."
              />
            </Section>
          </SectionGrid>

          {/* Actions Bar */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/tasks')}
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
