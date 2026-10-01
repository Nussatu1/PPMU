import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { DataTable, type ColumnDef } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { MobileCard } from '@/components/ui/MobileCard'
import {
  OrganizationScopeBadge,
  OrganizationScopeSwitcher,
} from '@/components/organization'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { formatCurrency } from '@/lib/utils'
import type { Report, ReportStatus } from '@/types/database'
import {
  HeroClipboardDocumentList,
  HeroPlus,
  HeroCheck,
  HeroArrowRight,
  HeroPencilSquare,
  HeroXMark,
} from '@/components/icons/HeroIcons'

const getAuthorName = (author?: Report['author']): string => {
  if (!author) return 'Seksi Pelaksana'
  if (typeof author === 'string') return author
  return author.name || 'Seksi Pelaksana'
}

export const ReportListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization, currentScopeMode } = useAuth()
  const { success, error } = useToast()

  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Review Dialog State
  const [reviewingReport, setReviewingReport] = useState<Report | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const orgId = currentOrganization?.id || ''

  const loadData = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const reps = await dataService.getReports(
        { organizationId: orgId, mode: currentScopeMode },
        undefined,
        user
      )
      setReports(reps)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat laporan'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, currentScopeMode, user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSubmitReport = async (report: Report) => {
    try {
      await dataService.transitionReportStatus(report.id, 'submitted', undefined, user)
      success('Laporan Diajukan', `Laporan diajukan ke pimpinan untuk diverifikasi.`)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengajukan laporan'
      error('Gagal', msg)
    }
  }

  const handleReviewDecision = async (decision: 'approved' | 'revised') => {
    if (!reviewingReport) return
    try {
      await dataService.transitionReportStatus(
        reviewingReport.id,
        decision,
        reviewNotes,
        user
      )
      success(
        decision === 'approved' ? 'Laporan Disetujui' : 'Catatan Revisi Terkirim',
        decision === 'approved'
          ? 'Laporan telah diverifikasi dan disetujui secara resmi.'
          : 'Catatan perbaikan telah diteruskan ke penyusun laporan.'
      )
      setReviewingReport(null)
      setReviewNotes('')
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses evaluasi'
      error('Gagal', msg)
    }
  }

  const getStatusBadge = (status: ReportStatus) => {
    const config: Record<ReportStatus, { variant: 'gray' | 'primary' | 'success' | 'warning' | 'danger'; label: string }> = {
      draft: { variant: 'gray', label: 'Konsep' },
      submitted: { variant: 'warning', label: 'Menunggu Verifikasi' },
      in_review: { variant: 'primary', label: 'Sedang Ditinjau' },
      approved: { variant: 'success', label: 'Disetujui Ketua' },
      revised: { variant: 'danger', label: 'Perlu Revisi' },
      archived: { variant: 'gray', label: 'Diarsipkan' },
    }
    const c = config[status] || { variant: 'gray', label: status }
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  const columns: ColumnDef<Report>[] = [
    {
      key: 'title',
      label: 'Judul Laporan & Program',
      sortable: true,
      render: (r) => (
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <HeroClipboardDocumentList className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-fg text-sm">{r.title}</span>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              {r.program?.title || 'Program Umum'}
            </p>
            <p className="text-[11px] text-fg-muted mt-0.5">
              Penyusun: {getAuthorName(r.author)} • Periode: {r.period}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'budget_spent',
      label: 'Realisasi Dana',
      sortable: true,
      render: (r) => (
        <span className="font-semibold text-xs text-fg">
          {formatCurrency(r.budget_spent || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r) => (
        <div>
          {getStatusBadge(r.status)}
          {r.reviewer && (
            <p className="text-[10px] text-fg-muted mt-1">
              Oleh: {r.reviewer.name}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'id',
      label: 'Aksi',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.status === 'draft' && (
            <button
              type="button"
              onClick={() => handleSubmitReport(r)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              Ajukan <HeroArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {r.status === 'submitted' && (
            <button
              type="button"
              onClick={() => {
                setReviewingReport(r)
                setReviewNotes(r.review_notes || '')
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <HeroCheck className="w-3.5 h-3.5" /> Verifikasi
            </button>
          )}

          {r.status === 'revised' && (
            <button
              type="button"
              onClick={() => navigate('/reports/create')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-300 hover:bg-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <HeroPencilSquare className="w-3.5 h-3.5" /> Perbaiki
            </button>
          )}

          {r.status === 'approved' && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <HeroCheck className="w-4 h-4" /> Terverifikasi
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
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            <HeroClipboardDocumentList className="w-7 h-7 text-amber-500" />
            Laporan Kinerja
          </h1>
          <OrganizationScopeBadge />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <OrganizationScopeSwitcher size="sm" />
          <Button variant="primary" onClick={() => navigate('/reports/create')} className="shrink-0 self-start sm:self-auto">
            <HeroPlus className="w-4 h-4 mr-2" />
            Buat Laporan
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={reports}
        isLoading={isLoading}
        searchPlaceholder="Cari laporan..."
        searchKey="title"
        renderCard={(r) => {
          let primaryActionNode: React.ReactNode = null
          if (r.status === 'draft') {
            primaryActionNode = (
              <button
                type="button"
                onClick={() => handleSubmitReport(r)}
                className="w-full min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Ajukan <HeroArrowRight className="w-4 h-4" />
              </button>
            )
          } else if (r.status === 'submitted') {
            primaryActionNode = (
              <button
                type="button"
                onClick={() => {
                  setReviewingReport(r)
                  setReviewNotes(r.review_notes || '')
                }}
                className="w-full min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HeroCheck className="w-4 h-4" /> Verifikasi Laporan
              </button>
            )
          } else if (r.status === 'revised') {
            primaryActionNode = (
              <button
                type="button"
                onClick={() => navigate('/reports/create')}
                className="w-full min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-300 hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HeroPencilSquare className="w-4 h-4" /> Perbaiki Laporan
              </button>
            )
          } else if (r.status === 'approved') {
            primaryActionNode = (
              <div className="flex items-center justify-center min-h-[44px] text-xs font-semibold text-emerald-600 dark:text-emerald-400 gap-1.5">
                <HeroCheck className="w-4 h-4" /> Terverifikasi Resmi
              </div>
            )
          }

          return (
            <MobileCard
              title={<span className="truncate">{r.title}</span>}
              subtitle={
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {r.program?.title || 'Program Umum'}
                </span>
              }
              status={getStatusBadge(r.status)}
              meta={
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted">Realisasi Dana:</span>
                    <span className="font-semibold text-fg">
                      {formatCurrency(r.budget_spent || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-fg-muted">
                    <span>Penyusun: <strong className="text-fg font-medium">{getAuthorName(r.author)}</strong></span>
                    <span>Periode: <strong className="text-fg font-medium">{r.period}</strong></span>
                  </div>
                  {r.reviewer && (
                    <div className="text-[11px] text-fg-muted">
                      Reviewer: <span className="text-fg font-medium">{r.reviewer.name}</span>
                    </div>
                  )}
                  {r.review_notes && (
                    <div className="mt-1.5 p-2 rounded-lg bg-surface-muted border border-line text-xs text-fg-muted">
                      <span className="font-semibold text-fg">Catatan Evaluasi: </span>
                      <span className="italic">"{r.review_notes}"</span>
                    </div>
                  )}
                </div>
              }
              primaryAction={primaryActionNode}
            />
          )
        }}
      />

      {reviewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay">
          <div className="w-full max-w-xl rounded-xl bg-surface ring-1 ring-line shadow-xl p-6 animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-line-divider shrink-0">
              <div>
                <h3 className="text-lg font-bold text-fg">Verifikasi & Tinjau Laporan</h3>
                <p className="text-xs text-fg-muted mt-0.5">{reviewingReport.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingReport(null)}
                className="text-fg-muted hover:text-fg rounded-lg p-1"
              >
                <HeroXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-muted border border-line space-y-2">
                <p className="text-fg-muted">
                  <strong>Induk Program:</strong> {reviewingReport.program?.title}
                </p>
                <p className="text-fg-muted">
                  <strong>Penyusun:</strong> {getAuthorName(reviewingReport.author)} •{' '}
                  <strong>Dana Dilaporkan:</strong> {formatCurrency(reviewingReport.budget_spent || 0)}
                </p>
                <p className="text-fg-muted">
                  <strong>Ringkasan Capaian:</strong>{' '}
                  {reviewingReport.achievement_summary || 'Tercapai sesuai rencana.'}
                </p>
              </div>

              <div>
                <strong className="block text-fg font-semibold mb-1 text-xs">
                  Isi & Uraian Laporan:
                </strong>
                <div className="p-3.5 rounded-xl bg-surface border border-line text-fg leading-relaxed whitespace-pre-line text-xs">
                  {reviewingReport.content}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg mb-1">
                  Catatan Evaluasi / Rekomendasi Pimpinan:
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Catatan evaluasi"
                  className="w-full rounded-lg border border-line-strong bg-input-bg px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-line shrink-0">
              <Button type="button" variant="secondary" onClick={() => setReviewingReport(null)}>
                Batal
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => handleReviewDecision('revised')}
                >
                  Minta Revisi
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleReviewDecision('approved')}
                >
                  <HeroCheck className="w-4 h-4 mr-1.5" />
                  Setujui Laporan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </PageContainer>
  )
}
