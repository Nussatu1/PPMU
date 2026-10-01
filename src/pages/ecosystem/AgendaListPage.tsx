import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  HeroPencilSquare,
  HeroTrash,
  HeroCheck,
} from '@/components/icons/HeroIcons'
import { MobileCard } from '@/components/ui/MobileCard'
import {
  OrganizationScopeBadge,
  OrganizationScopeSwitcher,
} from '@/components/organization'

export const AgendaListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization, currentScopeMode } = useAuth()
  const { success, error } = useToast()
  const { confirm } = useConfirm()

  const [agendas, setAgendas] = useState<Agenda[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const orgId = currentOrganization?.id || ''

  const loadData = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const agds = await dataService.getAgendas(
        { organizationId: orgId, mode: currentScopeMode },
        undefined,
        user
      )
      setAgendas(agds)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat agenda'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, currentScopeMode, user, error])

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
      mobilePriority: 'primary',
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
      mobilePriority: 'secondary',
      render: (a) => (
        <div>
          <span className="font-semibold text-xs text-fg">{a.program?.title || 'Program Umum'}</span>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
            {a.section?.name || '-'}
          </p>
        </div>
      ),
    },
    {
      key: 'budget_estimated',
      label: 'Estimasi Biaya',
      sortable: true,
      mobilePriority: 'secondary',
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
      mobilePriority: 'status',
      render: (a) => getStatusBadge(a.status),
    },
    {
      key: 'id',
      label: 'Langkah Operasional',
      mobilePriority: 'detail',
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

  // Render Kartu Mobile: Action-Driven Schedule Card
  const renderAgendaCard = (agenda: Agenda) => {
    let primaryActionNode: React.ReactNode = null
    if (agenda.status === 'planned') {
      primaryActionNode = (
        <button
          type="button"
          onClick={() => handleTransition(agenda, 'approved')}
          className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors cursor-pointer flex items-center justify-center shadow-xs"
        >
          Setujui Agenda
        </button>
      )
    } else if (agenda.status === 'approved') {
      primaryActionNode = (
        <button
          type="button"
          onClick={() => handleTransition(agenda, 'upcoming')}
          className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white transition-colors cursor-pointer flex items-center justify-center shadow-xs"
        >
          Jadwalkan
        </button>
      )
    } else if (agenda.status === 'upcoming') {
      primaryActionNode = (
        <button
          type="button"
          onClick={() => handleTransition(agenda, 'in_progress')}
          className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors cursor-pointer flex items-center justify-center shadow-xs"
        >
          Mulai Sesi
        </button>
      )
    } else if (agenda.status === 'in_progress') {
      primaryActionNode = (
        <button
          type="button"
          onClick={() => handleTransition(agenda, 'completed')}
          className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white transition-colors cursor-pointer flex items-center justify-center shadow-xs"
        >
          Tandai Selesai
        </button>
      )
    } else if (agenda.status === 'completed') {
      primaryActionNode = (
        <button
          type="button"
          onClick={() => handleTransition(agenda, 'evaluated')}
          className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-surface-muted hover:bg-surface border border-line text-fg transition-colors cursor-pointer flex items-center justify-center"
        >
          Evaluasi
        </button>
      )
    } else if (agenda.status === 'evaluated') {
      primaryActionNode = (
        <div className="flex items-center justify-center min-h-[44px] text-xs font-semibold text-emerald-600 dark:text-emerald-400 gap-1.5">
          <HeroCheck className="w-4 h-4" /> Tuntas Dievaluasi
        </div>
      )
    }

    const menuActions = [
      {
        label: 'Edit Agenda',
        icon: <HeroPencilSquare className="w-4 h-4" />,
        onClick: () => navigate(`/agendas/${agenda.id}/edit`),
      },
      {
        label: 'Hapus Agenda',
        icon: <HeroTrash className="w-4 h-4 text-red-500" />,
        onClick: () => handleDelete(agenda),
        danger: true,
      },
    ]

    return (
      <MobileCard
        title={agenda.title}
        subtitle={agenda.program?.title || 'Program Umum'}
        status={getStatusBadge(agenda.status)}
        meta={
          <>
            {/* Baris Meta 1: Waktu & Lokasi */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-fg">
                <HeroClock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  {agenda.start_time
                    ? new Date(agenda.start_time).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Jadwal fleksibel'}
                </span>
              </div>
              {agenda.location && (
                <div className="flex items-center gap-1 text-fg-muted truncate max-w-[140px]">
                  <HeroMapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{agenda.location}</span>
                </div>
              )}
            </div>

            {/* Baris Meta 2: Seksi Pelaksana & Estimasi Anggaran */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-fg-muted truncate">
                Seksi: <strong className="text-fg font-medium">{agenda.section?.name || '-'}</strong>
              </span>
              <span className="text-fg font-semibold shrink-0">
                {formatCurrency(agenda.budget_estimated || 0)}
              </span>
            </div>
          </>
        }
        primaryAction={primaryActionNode}
        menuActions={menuActions}
      />
    )
  }

  return (
    <PageContainer variant="full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            <HeroCalendar className="w-7 h-7 text-amber-500" />
            Agenda Kegiatan
          </h1>
          <OrganizationScopeBadge />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <OrganizationScopeSwitcher size="sm" />
          <Button
            variant="primary"
            onClick={() => navigate('/agendas/create')}
            className="shrink-0 self-start sm:self-auto"
          >
            <HeroPlus className="w-4 h-4 mr-2" />
            Tambah Agenda
          </Button>
        </div>
      </div>

      {/* Data Table & Mobile Cards */}
      <DataTable
        columns={columns}
        data={agendas}
        isLoading={isLoading}
        searchPlaceholder="Cari agenda..."
        searchKey="title"
        onEdit={(agenda) => navigate(`/agendas/${agenda.id}/edit`)}
        onDelete={handleDelete}
        renderCard={renderAgendaCard}
      />
    </PageContainer>
  )
}
