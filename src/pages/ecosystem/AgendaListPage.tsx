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
import { formatCurrency } from '@/lib/utils'
import type { Agenda, AgendaStatus } from '@/types/database'
import {
  HeroCalendar,
  HeroPlus,
  HeroMapPin,
  HeroClock,
} from '@/components/icons/HeroIcons'

export const AgendaListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()
  const { confirm } = useConfirm()

  const [agendas, setAgendas] = useState<Agenda[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const orgId = currentOrganization?.id || ''

  const loadData = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const agds = await dataService.getAgendas(orgId, undefined, user)
      setAgendas(agds)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat agenda'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTransition = async (agenda: Agenda, nextStatus: AgendaStatus) => {
    try {
      await dataService.transitionAgendaStatus(agenda.id, nextStatus, user)
      success('Siklus Agenda', `Status agenda kini: [${nextStatus.toUpperCase()}].`)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal transisi status'
      error('Gagal', msg)
    }
  }

  const handleDelete = async (agenda: Agenda) => {
    const ok = await confirm({
      title: 'Hapus Agenda Kegiatan',
      message: `Yakin ingin menghapus agenda "${agenda.title}"?`,
      tone: 'danger',
      confirmLabel: 'Hapus Agenda',
    })
    if (!ok) return
    try {
      await dataService.deleteAgenda(agenda.id, user)
      success('Agenda Dihapus', `Agenda telah dihapus.`)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus agenda'
      error('Gagal', msg)
    }
  }

  const getStatusBadge = (status: AgendaStatus) => {
    const config: Record<AgendaStatus, { variant: 'gray' | 'primary' | 'success' | 'warning' | 'danger'; label: string }> = {
      planned: { variant: 'gray', label: 'Direncanakan' },
      approved: { variant: 'primary', label: 'Disetujui' },
      upcoming: { variant: 'warning', label: 'Mendatang' },
      in_progress: { variant: 'primary', label: 'Berlangsung' },
      completed: { variant: 'success', label: 'Selesai' },
      evaluated: { variant: 'success', label: 'Dievaluasi' },
    }
    const c = config[status] || { variant: 'gray', label: status }
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  const columns: ColumnDef<Agenda>[] = [
    {
      key: 'title',
      label: 'Nama Agenda & Waktu',
      sortable: true,
      render: (a) => (
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <HeroCalendar className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-fg text-sm">{a.title}</span>
            <div className="flex items-center gap-3 text-xs text-fg-muted mt-1">
              <span className="flex items-center gap-1">
                <HeroClock className="w-3.5 h-3.5" />
                {a.start_time ? new Date(a.start_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
              </span>
              {a.location && (
                <span className="flex items-center gap-1 truncate max-w-[180px]">
                  <HeroMapPin className="w-3.5 h-3.5" />
                  {a.location}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'program_id',
      label: 'Induk Program & Seksi',
      render: (a) => (
        <div>
          <span className="font-semibold text-xs text-fg">{a.program?.title || 'Program Umum'}</span>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
            {a.section?.name || '-'}
          </p>
        </div>
      ),
    },
    {
      key: 'budget_estimated',
      label: 'Estimasi Biaya',
      sortable: true,
      render: (a) => (
        <span className="text-xs font-semibold text-fg">
          {formatCurrency(a.budget_estimated || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status Pelaksanaan',
      sortable: true,
      render: (a) => getStatusBadge(a.status),
    },
    {
      key: 'id',
      label: 'Langkah Operasional',
      render: (a) => (
        <div className="flex items-center gap-1.5">
          {a.status === 'planned' && (
            <button
              type="button"
              onClick={() => handleTransition(a, 'approved')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            >
              Setujui
            </button>
          )}
          {a.status === 'approved' && (
            <button
              type="button"
              onClick={() => handleTransition(a, 'upcoming')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer"
            >
              Jadwalkan
            </button>
          )}
          {a.status === 'upcoming' && (
            <button
              type="button"
              onClick={() => handleTransition(a, 'in_progress')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              Mulai Sesi
            </button>
          )}
          {a.status === 'in_progress' && (
            <button
              type="button"
              onClick={() => handleTransition(a, 'completed')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer"
            >
              Selesai
            </button>
          )}
          {a.status === 'completed' && (
            <button
              type="button"
              onClick={() => handleTransition(a, 'evaluated')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface-muted hover:bg-hover-bg text-fg border border-line transition-colors cursor-pointer"
            >
              Evaluasi
            </button>
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
              { label: 'Agenda & Kegiatan' },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-fg mt-1 flex items-center gap-2.5">
            <HeroCalendar className="w-7 h-7 text-amber-500" />
            Agenda & Kegiatan Lapangan
          </h1>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/agendas/create')}
          className="shrink-0 self-start sm:self-auto"
        >
          <HeroPlus className="w-4 h-4 mr-2" />
          Jadwalkan Kegiatan Baru
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={agendas}
        isLoading={isLoading}
        searchPlaceholder="Cari agenda..."
        searchKey="title"
        onEdit={(agenda) => navigate(`/agendas/${agenda.id}/edit`)}
        onDelete={handleDelete}
      />
    </PageContainer>
  )
}
