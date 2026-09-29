import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { DataTable, type ColumnDef } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { Task, Personnel, TaskStatus } from '@/types/database'
import {
  HeroCheckCircle,
  HeroPlus,
  HeroCheck,
  HeroClock,
  HeroUser,
  HeroXMark,
} from '@/components/icons/HeroIcons'

export const TaskListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()
  const { confirm } = useConfirm()

  const [tasks, setTasks] = useState<Task[]>([])
  const [personnels, setPersonnels] = useState<Personnel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const orgId = currentOrganization?.id || ''

  const loadData = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const [tsks, prss] = await Promise.all([
        dataService.getTasks(orgId, undefined, user),
        dataService.getPersonnels(orgId, undefined, user),
      ])
      setTasks(tsks)
      setPersonnels(prss)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat tugas'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTransition = async (task: Task, nextStatus: TaskStatus) => {
    try {
      await dataService.transitionTaskStatus(task.id, nextStatus, user)
      success('Status Tugas Berubah', `Tugas kini berstatus [${nextStatus.toUpperCase()}].`)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal transisi status tugas'
      error('Gagal', msg)
    }
  }

  const handleDelete = async (task: Task) => {
    const ok = await confirm({
      title: 'Hapus Tugas',
      message: `Yakin ingin menghapus tugas "${task.title}"?`,
      tone: 'danger',
      confirmLabel: 'Hapus Tugas',
    })
    if (!ok) return
    try {
      await dataService.deleteTask(task.id, user)
      success('Tugas Dihapus', `Tugas telah dihapus.`)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus tugas'
      error('Gagal', msg)
    }
  }

  const getPriorityBadge = (priority: Task['priority']) => {
    const map: Record<Task['priority'], { variant: 'gray' | 'primary' | 'warning' | 'danger'; label: string }> = {
      low: { variant: 'gray', label: 'Rendah' },
      medium: { variant: 'primary', label: 'Sedang' },
      high: { variant: 'warning', label: 'Tinggi' },
      urgent: { variant: 'danger', label: 'Mendesak' },
    }
    const c = map[priority]
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  const getStatusBadge = (status: TaskStatus) => {
    const map: Record<TaskStatus, { variant: 'gray' | 'primary' | 'warning' | 'success' | 'danger'; label: string }> = {
      new: { variant: 'gray', label: 'Baru' },
      in_progress: { variant: 'primary', label: 'Sedang Dikerjakan' },
      pending_verification: { variant: 'warning', label: 'Menunggu Verifikasi' },
      completed: { variant: 'success', label: 'Tuntas' },
      revised: { variant: 'danger', label: 'Perlu Revisi' },
    }
    const c = map[status] || { variant: 'gray', label: status }
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  const columns: ColumnDef<Task>[] = [
    {
      key: 'title',
      label: 'Tugas & Uraian Tindak Lanjut',
      sortable: true,
      render: (t) => (
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <HeroCheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-fg text-sm">{t.title}</span>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              {t.program?.title || 'Tindak Lanjut Umum'}
            </p>
            {t.description && (
              <p className="text-xs text-fg-muted mt-1 leading-relaxed line-clamp-1">
                {t.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Tingkat Prioritas',
      sortable: true,
      render: (t) => getPriorityBadge(t.priority),
    },
    {
      key: 'pic_personnel_id',
      label: 'PIC Personel',
      render: (t) => {
        const prs = personnels.find((p) => p.id === t.pic_personnel_id)
        return (
          <div className="flex items-center gap-1.5 text-xs text-fg">
            <HeroUser className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold text-fg">{prs?.position || t.pic_name || 'Personel Seksi'}</p>
              {prs?.name && <p className="text-[11px] text-fg-muted">{prs.name}</p>}
            </div>
          </div>
        )
      },
    },
    {
      key: 'due_date',
      label: 'Tenggat Waktu',
      sortable: true,
      render: (t) => (
        <div className="flex items-center gap-1.5 text-xs text-fg">
          <HeroClock className="w-4 h-4 text-fg-muted" />
          <span>
            {t.due_date ? new Date(t.due_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status Pengerjaan',
      sortable: true,
      render: (t) => getStatusBadge(t.status),
    },
    {
      key: 'id',
      label: 'Tindakan Personel',
      render: (t) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {t.status === 'new' && (
            <button
              type="button"
              onClick={() => handleTransition(t, 'in_progress')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              Kerjakan
            </button>
          )}

          {t.status === 'in_progress' && (
            <button
              type="button"
              onClick={() => handleTransition(t, 'pending_verification')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer"
            >
              Serahkan Hasil
            </button>
          )}

          {t.status === 'pending_verification' && (
            <>
              <button
                type="button"
                onClick={() => handleTransition(t, 'completed')}
                className="px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <HeroCheck className="w-3.5 h-3.5" /> Konfirmasi
              </button>
              <button
                type="button"
                onClick={() => handleTransition(t, 'revised')}
                className="px-2 py-1 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <HeroXMark className="w-3.5 h-3.5" /> Revisi
              </button>
            </>
          )}

          {t.status === 'revised' && (
            <button
              type="button"
              onClick={() => handleTransition(t, 'in_progress')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer"
            >
              Perbaiki Ulang
            </button>
          )}

          {t.status === 'completed' && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <HeroCheck className="w-4 h-4" /> Selesai
            </span>
          )}
        </div>
      ),
    },
  ]

  return (
    <PageContainer variant="full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: 'Organisasi', href: '/programs' },
              { label: 'Tugas & Tindak Lanjut' },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-fg mt-1 flex items-center gap-2.5">
            <HeroCheckCircle className="w-7 h-7 text-amber-500" />
            Tugas Tindak Lanjut & Monitoring Evaluasi
          </h1>
        </div>

        <Button variant="primary" onClick={() => navigate('/tasks/create')} className="shrink-0 self-start sm:self-auto">
          <HeroPlus className="w-4 h-4 mr-2" />
          Terbitkan Tugas Baru
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={tasks}
        isLoading={isLoading}
        searchPlaceholder="Cari nama tugas..."
        searchKey="title"
        onDelete={handleDelete}
      />
    </PageContainer>
  )
}
