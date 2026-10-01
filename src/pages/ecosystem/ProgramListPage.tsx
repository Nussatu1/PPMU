import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { DataTable, type ColumnDef } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { formatCurrency } from '@/lib/utils'
import type { Program, Personnel, ProgramStatus } from '@/types/database'
import {
  HeroBriefcase,
  HeroPlus,
  HeroArrowRight,
  HeroCheck,
  HeroUser,
  HeroPencilSquare,
  HeroTrash,
} from '@/components/icons/HeroIcons'
import { MobileCard } from '@/components/ui/MobileCard'
import {
  OrganizationScopeBadge,
  OrganizationScopeSwitcher,
} from '@/components/organization'

export const ProgramListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization, currentScopeMode } = useAuth()
  const { success, error } = useToast()
  const { confirm } = useConfirm()

  const [programs, setPrograms] = useState<Program[]>([])
  const [personnels, setPersonnels] = useState<Personnel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Status Filter State
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const orgId = currentOrganization?.id || ''

  const loadData = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const [progs, prss] = await Promise.all([
        dataService.getPrograms({ organizationId: orgId, mode: currentScopeMode }, user),
        dataService.getPersonnels(orgId, undefined, user),
      ])
      setPrograms(progs)
      setPersonnels(prss)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat program'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, currentScopeMode, user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTransitionStatus = async (prog: Program, nextStatus: ProgramStatus) => {
    try {
      await dataService.transitionProgramStatus(prog.id, nextStatus, user)
      success('Siklus Program Berlanjut', `Status program berhasil dialihkan menjadi [${nextStatus.toUpperCase()}].`)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal transisi status'
      error('Gagal', msg)
    }
  }

  const handleDelete = async (prog: Program) => {
    const ok = await confirm({
      title: 'Hapus Program Kerja',
      message: `Yakin ingin menghapus program "${prog.title}"?`,
      tone: 'danger',
      confirmLabel: 'Hapus',
    })
    if (!ok) return
    try {
      await dataService.deleteProgram(prog.id, user)
      success('Program Dihapus', `Program telah dihapus.`)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus program'
      error('Gagal', msg)
    }
  }

  const getStatusBadge = (status: ProgramStatus) => {
    const config: Record<ProgramStatus, { variant: 'gray' | 'primary' | 'success' | 'warning' | 'danger'; label: string }> = {
      draft: { variant: 'gray', label: 'Konsep (Draft)' },
      submitted: { variant: 'warning', label: 'Diajukan' },
      approved: { variant: 'primary', label: 'Disetujui Ketua' },
      active: { variant: 'success', label: 'Sedang Berjalan' },
      completed: { variant: 'success', label: 'Selesai' },
      closed: { variant: 'gray', label: 'Ditutup' },
      revised: { variant: 'danger', label: 'Perlu Revisi' },
    }
    const c = config[status] || { variant: 'gray', label: status }
    return <Badge variant={c.variant} dot>{c.label}</Badge>
  }

  const statusTabs: TabItem[] = [
    { id: 'all', label: 'Semua Status' },
    { id: 'draft', label: 'Konsep' },
    { id: 'submitted', label: 'Diajukan' },
    { id: 'approved', label: 'Disetujui' },
    { id: 'active', label: 'Sedang Berjalan' },
    { id: 'completed', label: 'Selesai' },
  ]

  const filteredPrograms = filterStatus === 'all'
    ? programs
    : programs.filter((p) => p.status === filterStatus)

  const columns: ColumnDef<Program>[] = [
    {
      key: 'title',
      label: 'Program Kerja & Divisi',
      sortable: true,
      mobilePriority: 'primary',
      render: (prog) => (
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <HeroBriefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-fg text-sm">{prog.title}</span>
              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-surface-muted text-fg-muted font-bold">
                {prog.code}
              </span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              {prog.section?.name || 'Seksi Terkait'}
            </p>
            {prog.target_kpi && (
              <p className="text-xs text-fg-muted mt-1 line-clamp-1">
                <strong>KPI:</strong> {prog.target_kpi}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'budget_allocated',
      label: 'Alokasi & Realisasi Anggaran',
      sortable: true,
      mobilePriority: 'primary',
      render: (prog) => {
        const allocated = prog.budget_allocated || prog.budget_planned || 0
        const realized = prog.budget_realized || 0
        const percent = allocated > 0
          ? Math.round((realized / allocated) * 100)
          : 0
        return (
          <div className="w-48">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-fg">{formatCurrency(realized)}</span>
              <span className="text-fg-muted font-medium text-xs">{percent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
            <span className="text-xs text-fg-muted mt-0.5 block">
              Pagu: {formatCurrency(allocated)}
            </span>
          </div>
        )
      },
    },
    {
      key: 'pic_personnel_id',
      label: 'PIC Struktur',
      mobilePriority: 'secondary',
      render: (prog) => {
        const prs = personnels.find((p) => p.id === prog.pic_personnel_id) || prog.pic_personnel
        return (
          <div className="space-y-1">
            {(prs || prog.pic_name) ? (
              <div className="flex items-center gap-1.5 text-xs text-fg">
                <HeroUser className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-semibold text-fg">{prs?.position || prog.pic_name}</p>
                  {prs?.name && <p className="text-xs text-fg-muted">{prs.name}</p>}
                </div>
              </div>
            ) : (
              <span className="text-xs text-fg-muted italic">Belum ditentukan</span>
            )}
            {prog.assigned_to_organization_id && (
              <div className="flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                <span className="shrink-0">↳</span>
                <span className="truncate">
                  {prog.assigned_to_organization?.name || prog.assigned_to_organization_id}
                </span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'status',
      label: 'Status Siklus',
      sortable: true,
      mobilePriority: 'status',
      render: (prog) => getStatusBadge(prog.status),
    },
    {
      key: 'id',
      label: 'Aksi',
      mobilePriority: 'detail',
      render: (prog) => (
        <div className="flex items-center gap-1.5">
          {prog.status === 'draft' && (
            <Button
              size="xs"
              variant="primary"
              onClick={() => handleTransitionStatus(prog, 'submitted')}
              icon={<HeroArrowRight className="w-3 h-3" />}
            >
              Ajukan
            </Button>
          )}

          {prog.status === 'submitted' && (
            <Button
              size="xs"
              variant="secondary"
              onClick={() => handleTransitionStatus(prog, 'approved')}
              icon={<HeroCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
            >
              Setujui
            </Button>
          )}

          {prog.status === 'approved' && (
            <Button
              size="xs"
              variant="secondary"
              onClick={() => handleTransitionStatus(prog, 'active')}
            >
              Aktifkan
            </Button>
          )}

          {prog.status === 'active' && (
            <Button
              size="xs"
              variant="secondary"
              onClick={() => handleTransitionStatus(prog, 'completed')}
            >
              Selesaikan
            </Button>
          )}

          {prog.status === 'completed' && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Tercapai
            </span>
          )}
        </div>
      ),
    },
  ]

  // Render Kartu Mobile: Metric & Budget Card
  const renderProgramCard = (prog: Program) => {
    const allocated = prog.budget_allocated || prog.budget_planned || 0
    const realized = prog.budget_realized || 0
    const percent = allocated > 0 ? Math.round((realized / allocated) * 100) : 0
    const prs = personnels.find((p) => p.id === prog.pic_personnel_id) || prog.pic_personnel

    let primaryActionNode: React.ReactNode = null
    if (prog.status === 'draft') {
      primaryActionNode = (
        <button
          type="button"
          onClick={() => handleTransitionStatus(prog, 'submitted')}
          className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
        >
          Ajukan Proposal <HeroArrowRight className="w-4 h-4" />
        </button>
      )
    } else if (prog.status === 'submitted') {
      primaryActionNode = (
        <button
          type="button"
          onClick={() => handleTransitionStatus(prog, 'approved')}
          className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
        >
          <HeroCheck className="w-4 h-4" /> Setujui Program
        </button>
      )
    } else if (prog.status === 'approved') {
      primaryActionNode = (
        <button
          type="button"
          onClick={() => handleTransitionStatus(prog, 'active')}
          className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white transition-colors cursor-pointer flex items-center justify-center shadow-xs"
        >
          Aktifkan Program
        </button>
      )
    } else if (prog.status === 'active') {
      primaryActionNode = (
        <button
          type="button"
          onClick={() => handleTransitionStatus(prog, 'completed')}
          className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white transition-colors cursor-pointer flex items-center justify-center shadow-xs"
        >
          Tandai Selesai
        </button>
      )
    } else if (prog.status === 'completed') {
      primaryActionNode = (
        <div className="flex items-center justify-center min-h-[44px] text-xs font-semibold text-emerald-600 dark:text-emerald-400 gap-1.5">
          <HeroCheck className="w-4 h-4" /> Tercapai
        </div>
      )
    }

    const menuActions = [
      {
        label: 'Edit Program',
        icon: <HeroPencilSquare className="w-4 h-4" />,
        onClick: () => navigate(`/programs/${prog.id}/edit`),
      },
      {
        label: 'Hapus Program',
        icon: <HeroTrash className="w-4 h-4 text-red-500" />,
        onClick: () => handleDelete(prog),
        danger: true,
      },
    ]

    return (
      <MobileCard
        title={
          <div className="flex items-center gap-2">
            <span className="truncate">{prog.title}</span>
            {prog.code && (
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-surface-muted text-fg-muted font-bold shrink-0">
                {prog.code}
              </span>
            )}
          </div>
        }
        subtitle={prog.section?.name || 'Seksi Terkait'}
        status={getStatusBadge(prog.status)}
        meta={
          <>
            {/* Baris Meta 1: Serapan Anggaran & 100% Responsive Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-fg">
                  Realisasi: <strong>{formatCurrency(realized)}</strong>
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
              <div className="text-[11px] text-fg-muted text-right">
                Pagu Alokasi: {formatCurrency(allocated)}
              </div>
            </div>

            {/* Baris Meta 2: PIC & Target KPI */}
            <div className="flex items-center justify-between text-xs text-fg-muted pt-1 gap-2">
              <span className="truncate">
                PIC: <strong className="text-fg font-medium">{prs?.position || prog.pic_name || 'Umum'}</strong>
              </span>
              {prog.target_kpi && (
                <span className="truncate max-w-[150px] text-right font-medium text-fg">
                  KPI: {prog.target_kpi}
                </span>
              )}
            </div>

            {/* Baris Meta 3: Unit Penugasan (Stage 6) */}
            {prog.assigned_to_organization_id && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 pt-0.5">
                <span className="shrink-0">↳ Ditugaskan ke:</span>
                <span className="truncate font-semibold">
                  {prog.assigned_to_organization?.name || prog.assigned_to_organization_id}
                </span>
              </div>
            )}
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
            <HeroBriefcase className="w-6 h-6 text-amber-500" />
            Program Kerja
          </h1>
          <OrganizationScopeBadge />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <OrganizationScopeSwitcher size="sm" />
          <Button
            variant="primary"
            icon={<HeroPlus className="w-4 h-4" />}
            onClick={() => navigate('/programs/create')}
            className="shrink-0 self-start sm:self-auto"
          >
            Tambah Program
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs
        tabs={statusTabs}
        activeTab={filterStatus}
        onChange={(id) => setFilterStatus(id as any)}
      />

      {/* Table & Mobile Cards */}
      <DataTable
        columns={columns}
        data={filteredPrograms}
        isLoading={isLoading}
        searchPlaceholder="Cari program..."
        searchKey="title"
        onEdit={(prog) => navigate(`/programs/${prog.id}/edit`)}
        onDelete={handleDelete}
        renderCard={renderProgramCard}
      />
    </PageContainer>
  )
}
