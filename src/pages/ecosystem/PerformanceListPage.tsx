import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { DataTable, type ColumnDef } from '@/components/ui/Table'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { Performance } from '@/types/database'
import {
  HeroChartBar,
  HeroPlus,
  HeroEye,
} from '@/components/icons/HeroIcons'

export const PerformanceListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()
  const { confirm } = useConfirm()

  const [performances, setPerformances] = useState<Performance[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const orgId = currentOrganization?.id || ''

  const loadData = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const perfs = await dataService.getPerformances(orgId, undefined, user)
      setPerformances(perfs)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat kinerja'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDelete = async (perf: Performance) => {
    const ok = await confirm({
      title: 'Hapus Indikator KPI',
      message: `Yakin ingin menghapus indikator KPI "${perf.kpi_name}"?`,
      tone: 'danger',
      confirmLabel: 'Hapus KPI',
    })
    if (!ok) return
    try {
      await dataService.deletePerformance(perf.id, user)
      success('KPI Dihapus', `Data KPI telah dihapus.`)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus KPI'
      error('Gagal', msg)
    }
  }

  const columns: ColumnDef<Performance>[] = [
    {
      key: 'kpi_name',
      label: 'Indikator Kinerja & Program',
      sortable: true,
      render: (p) => (
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <HeroChartBar className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-fg text-sm">{p.kpi_name}</span>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              {p.program?.title || 'Program Umum'}
            </p>
            {p.notes && (
              <p className="text-xs text-fg-muted mt-0.5 line-clamp-1">{p.notes}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'target',
      label: 'Target vs Realisasi',
      sortable: true,
      render: (p) => (
        <div>
          <span className="font-semibold text-xs text-fg">
            {p.realized} / {p.target} {p.unit}
          </span>
          <p className="text-[10px] text-fg-muted mt-0.5">Periode: {p.period}</p>
        </div>
      ),
    },
    {
      key: 'percentage',
      label: 'Progres Capaian',
      sortable: true,
      render: (p) => {
        const pct = p.percentage ?? (p.target && p.target > 0 ? Math.round(((p.realized || 0) / p.target) * 100) : 0)
        let colorClass = 'bg-amber-500'
        if (pct >= 80) colorClass = 'bg-emerald-500'
        else if (pct < 50) colorClass = 'bg-red-500'

        return (
          <div className="w-40">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-fg">{pct}%</span>
              <span className="text-[10px] text-fg-muted">
                {pct >= 100 ? 'Tuntas' : pct >= 80 ? 'Optimal' : 'Perlu Dorongan'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      key: 'evidence_urls',
      label: 'Bukti Fisik',
      render: (p) => (
        <div>
          {p.evidence_urls && p.evidence_urls.length > 0 ? (
            <a
              href={p.evidence_urls[0]}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold"
            >
              <HeroEye className="w-3.5 h-3.5" />
              Lihat Bukti ({p.evidence_urls.length})
            </a>
          ) : (
            <span className="text-xs text-fg-muted italic">Belum diunggah</span>
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
              { label: 'Capaian Kinerja' },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-fg mt-1 flex items-center gap-2.5">
            <HeroChartBar className="w-7 h-7 text-amber-500" />
            Capaian Kinerja (KPI) & Bukti Fisik
          </h1>
        </div>

        <Button variant="primary" onClick={() => navigate('/performance/create')} className="shrink-0 self-start sm:self-auto">
          <HeroPlus className="w-4 h-4 mr-2" />
          Tambah Indikator KPI
        </Button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs">
          <p className="text-xs font-semibold text-fg-muted uppercase">Total Indikator</p>
          <p className="text-2xl font-bold text-fg mt-1">{performances.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs">
          <p className="text-xs font-semibold text-fg-muted uppercase">Capaian &gt;= 80%</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {performances.filter((p) => (p.percentage ?? 0) >= 80).length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs">
          <p className="text-xs font-semibold text-fg-muted uppercase">Rata-rata Capaian</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {performances.length > 0
              ? Math.round(performances.reduce((s, p) => s + (p.percentage ?? 0), 0) / performances.length)
              : 0}%
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={performances}
        isLoading={isLoading}
        searchPlaceholder="Cari indikator kinerja..."
        searchKey="kpi_name"
        onDelete={handleDelete}
      />
    </PageContainer>
  )
}
