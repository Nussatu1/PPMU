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
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { UnitAssignmentSelector } from '@/components/organization/UnitAssignmentSelector'
import type { Task, Program, Personnel, Report } from '@/types/database'
import {
  HeroCheckCircle,
  HeroArrowLeft,
  HeroCheck,
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
  status: Task['status']
  due_date: string
  result: string
  assigned_to_organization_id: string | null
}

export const TaskEditPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()

  const [task, setTask] = useState<Task | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [personnels, setPersonnels] = useState<Personnel[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    program_id: '',
    source: '',
    pic_personnel_id: '',
    description: '',
    priority: 'medium',
    status: 'new',
    due_date: '',
    result: '',
    assigned_to_organization_id: null,
  })

  const orgId = currentOrganization?.id || ''
  const set = <K extends keyof FormData>(f: K, v: FormData[K]) =>
    setFormData((p) => ({ ...p, [f]: v }))

  const loadData = useCallback(async () => {
    if (!id || !orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const [taskData, progs, pers, reps] = await Promise.all([
        dataService.getTaskById(id, user),
        dataService.getPrograms(orgId, user),
        dataService.getPersonnels(orgId, undefined, user),
        dataService.getReports(orgId, undefined, user),
      ])
      if (!taskData) {
        error('Tidak Ditemukan', 'Tugas tidak ditemukan')
        navigate('/tasks')
        return
      }
      setTask(taskData)
      setPrograms(progs)
      setPersonnels(pers)
      setReports(reps)
      setFormData({
        title: taskData.title || '',
        program_id: taskData.program_id || '',
        source: taskData.source || '',
        pic_personnel_id: taskData.pic_personnel_id || '',
        description: taskData.description || '',
        priority: taskData.priority || 'medium',
        status: taskData.status || 'new',
        due_date: taskData.due_date ? taskData.due_date.split('T')[0] : '',
        result: taskData.result || '',
        assigned_to_organization_id: taskData.assigned_to_organization_id || null,
      })
    } catch (err: unknown) {
      error('Kesalahan', err instanceof Error ? err.message : 'Gagal memuat tugas')
    } finally {
      setIsLoading(false)
    }
  }, [id, orgId, user, error, navigate])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.due_date) {
      error('Validasi Gagal', 'Nama Tugas dan Tenggat Waktu wajib diisi')
      return
    }
    if (!id) return
    setIsSaving(true)
    try {
      await dataService.updateTask(id, formData, user)
      success('Tugas Diperbarui', `"${formData.title}" berhasil diperbarui.`)
      navigate('/tasks')
    } catch (err: unknown) {
      error('Gagal', err instanceof Error ? err.message : 'Gagal memperbarui tugas')
    } finally {
      setIsSaving(false)
    }
  }

  const sourceOptions = [
    { value: 'Temuan Evaluasi Internal', label: 'Temuan Evaluasi Internal' },
    { value: 'Audit Kinerja Periodik', label: 'Audit Kinerja Periodik' },
    ...reports.map((r) => ({ value: `Laporan: ${r.title}`, label: `Laporan: ${r.title}` })),
    { value: 'Arahan Pimpinan', label: 'Arahan Pimpinan' },
  ]

  return (
    <PageContainer variant="form">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumb items={[
            { label: 'Tugas', href: '/tasks' },
            { label: task?.title || 'Edit Tugas' },
          ]} />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">Edit Tugas</h1>
        </div>
        <Button variant="secondary" icon={<HeroArrowLeft className="w-4 h-4" />} onClick={() => navigate('/tasks')} className="hidden sm:inline-flex">
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
            <Section title="Informasi Tugas" icon={<HeroCheckCircle className="w-5 h-5" />} columns={12} className="lg:col-span-6">
              <div className="col-span-full">
                <Input label="Nama Tugas" required value={formData.title} onChange={(e) => set('title', e.target.value)} placeholder="Nama tugas..." />
              </div>
              <div className="col-span-full sm:col-span-7">
                <Select label="Program" value={formData.program_id} options={programs.map((p) => ({ value: p.id, label: p.title }))} onChange={(e) => set('program_id', e.target.value)} />
              </div>
              <div className="col-span-full sm:col-span-5">
                <Select label="Prioritas" value={formData.priority}
                  options={[{ value: 'low', label: 'Rendah' }, { value: 'medium', label: 'Sedang' }, { value: 'high', label: 'Tinggi' }, { value: 'urgent', label: 'Mendesak' }]}
                  onChange={(e) => set('priority', e.target.value as Task['priority'])}
                />
              </div>
            </Section>

            <Section title="Penugasan & Tenggat" icon={<HeroClock className="w-5 h-5" />} columns={12} className="lg:col-span-6">
              <div className="col-span-full">
                <Select label="PIC" value={formData.pic_personnel_id}
                  options={personnels.map((p) => ({ value: p.id, label: p.position + (p.name ? ` \u2022 ${p.name}` : '') }))}
                  onChange={(e) => set('pic_personnel_id', e.target.value)}
                />
              </div>
              <div className="col-span-full sm:col-span-6">
                <Select label="Sumber Rujukan" value={formData.source} options={sourceOptions} onChange={(e) => set('source', e.target.value)} />
              </div>
              <div className="col-span-full sm:col-span-6">
                <DatePicker label="Tenggat" required value={formData.due_date} onChange={(val) => set('due_date', val)} />
              </div>
            </Section>

            <Section title="Status Pengerjaan" icon={<HeroCheckCircle className="w-5 h-5" />} columns={12} className="lg:col-span-6">
              <div className="col-span-full">
                <Select label="Status" value={formData.status}
                  options={[{ value: 'new', label: 'Baru' }, { value: 'in_progress', label: 'Sedang Berjalan' }, { value: 'done', label: 'Selesai' }, { value: 'cancelled', label: 'Dibatalkan' }]}
                  onChange={(e) => set('status', e.target.value as Task['status'])}
                />
              </div>
              <div className="col-span-full">
                <Textarea label="Hasil / Catatan Penyelesaian" rows={2} autoGrow value={formData.result} onChange={(e) => set('result', e.target.value)} placeholder="Deskripsi singkat hasil pelaksanaan..." />
              </div>
            </Section>

            <Section title="Penugasan Unit" icon={<HeroUserGroup className="w-5 h-5" />} columns={1} className="lg:col-span-6">
              <UnitAssignmentSelector value={formData.assigned_to_organization_id} onChange={(v) => set('assigned_to_organization_id', v as unknown as string)} />
            </Section>

            <Section title="Instruksi" icon={<HeroDocumentText className="w-5 h-5" />} columns={1} className="col-span-full">
              <Textarea label="Petunjuk Pelaksanaan" rows={3} autoGrow value={formData.description} onChange={(e) => set('description', e.target.value)} placeholder="Rincian instruksi kerja..." />
            </Section>
          </SectionGrid>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => navigate('/tasks')}>Batal</Button>
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
