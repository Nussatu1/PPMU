import React, { useState, useEffect, useCallback } from 'react'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { DataTable, type ColumnDef } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { AuditLog } from '@/types/database'
import {
  HeroClock,
  HeroEye,
  HeroTrash,
  HeroExclamationTriangle,
} from '@/components/icons/HeroIcons'

export const AuditLogListPage: React.FC = () => {
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await dataService.getAuditLogs(currentOrganization?.id, user)
      setLogs(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat log audit'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [user, currentOrganization?.id, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteSingle = async (log: AuditLog) => {
    try {
      await dataService.deleteAuditLog(log.id, currentOrganization?.id, user)
      setLogs((prev) => prev.filter((l) => l.id !== log.id))
      if (selectedLog?.id === log.id) {
        setSelectedLog(null)
      }
      success('Berhasil Dihapus', `Entri log audit untuk modul "${log.resource}" berhasil dihapus.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus log audit'
      error('Gagal', msg)
    }
  }

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await dataService.deleteAuditLogs(ids, currentOrganization?.id, user)
      setLogs((prev) => prev.filter((l) => !ids.includes(l.id)))
      if (selectedLog && ids.includes(selectedLog.id)) {
        setSelectedLog(null)
      }
      success('Berhasil Dihapus', `${ids.length} entri jejak audit berhasil dihapus.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus log audit'
      error('Gagal', msg)
    }
  }

  const handleClearAll = async () => {
    setIsClearing(true)
    try {
      await dataService.clearAuditLogs(currentOrganization?.id, user)
      setLogs([])
      setSelectedLog(null)
      setShowClearModal(false)
      success('Berhasil Dibersihkan', 'Seluruh riwayat log jejak audit telah dibersihkan.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membersihkan log audit'
      error('Gagal', msg)
    } finally {
      setIsClearing(false)
    }
  }

  const actionVariant = (action: string): 'success' | 'warning' | 'danger' | 'info' => {
    const act = (action || '').toLowerCase()
    if (act === 'create') return 'success'
    if (act === 'update') return 'warning'
    if (act.includes('delete')) return 'danger'
    return 'info'
  }

  const columns: ColumnDef<AuditLog>[] = [
    {
      key: 'created_at',
      label: 'Waktu Kejadian',
      sortable: true,
      render: (log) => (
        <span className="text-xs text-fg font-mono">
          {new Date(log.created_at).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'user_name',
      label: 'Pelaku Aktivitas',
      sortable: true,
      render: (log) => (
        <div>
          <p className="font-semibold text-xs text-fg">{log.user_name}</p>
          <p className="text-[10px] text-fg-muted font-mono">{log.ip_address || '127.0.0.1'}</p>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Aksi Otorisasi',
      sortable: true,
      render: (log) => (
        <Badge variant={actionVariant(log.action)} dot>
          {log.action.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'resource',
      label: 'Target Modul',
      sortable: true,
      render: (log) => (
        <div>
          <span className="font-semibold text-xs text-fg">{log.resource}</span>
          <p className="text-[10px] text-fg-muted font-mono truncate max-w-[120px]">
            ID: {log.resource_id.slice(0, 8)}...
          </p>
        </div>
      ),
    },
    {
      key: 'id',
      label: 'Detail Payload',
      render: (log) => (
        <Button
          size="xs"
          variant="secondary"
          onClick={() => setSelectedLog(log)}
          icon={<HeroEye className="w-3.5 h-3.5 text-amber-500" />}
        >
          Lihat Diff
        </Button>
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
              { label: 'Superadmin', href: '/organizations' },
              { label: 'Audit Trail' },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-fg mt-1 flex items-center gap-2.5">
            <HeroClock className="w-6 h-6 text-amber-500" />
            Jejak Audit & Keamanan Sistem
          </h1>
          <p className="text-xs text-fg-muted mt-0.5">
            Rekam jejak mutasi data, otorisasi akses, dan aktivitas keamanan sistem.
          </p>
        </div>

        {logs.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowClearModal(true)}
            icon={<HeroTrash className="w-4 h-4" />}
          >
            Bersihkan Semua Log
          </Button>
        )}
      </div>

      {/* Audit Log Table */}
      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        searchPlaceholder="Cari log audit (nama pelaku, modul, aksi)..."
        searchKey="user_name"
        onDelete={handleDeleteSingle}
        onBulkDelete={handleBulkDelete}
      />

      {/* JSON Payload Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Detail Mutasi: ${selectedLog.resource}`}
          description={`Oleh ${selectedLog.user_name} (${selectedLog.ip_address || '127.0.0.1'}) pada ${new Date(selectedLog.created_at).toLocaleString('id-ID')}`}
          maxWidth="2xl"
          footer={
            <div className="w-full flex items-center justify-between">
              <Button
                variant="danger"
                size="sm"
                icon={<HeroTrash className="w-3.5 h-3.5" />}
                onClick={() => handleDeleteSingle(selectedLog)}
              >
                Hapus Log Ini
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedLog(null)}
              >
                Tutup
              </Button>
            </div>
          }
        >
          <div className="space-y-4 font-mono text-xs max-h-[60vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-sans text-fg-muted">Aksi Otorisasi:</span>
              <Badge variant={actionVariant(selectedLog.action)}>
                {selectedLog.action.toUpperCase()}
              </Badge>
            </div>

            {selectedLog.old_values && (
              <div>
                <p className="font-sans font-semibold text-fg mb-1 text-xs">
                  Nilai Sebelumnya (Old Values):
                </p>
                <pre className="p-3 rounded-lg bg-surface-muted border border-line text-red-600 dark:text-red-400 overflow-x-auto">
                  {JSON.stringify(selectedLog.old_values, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_values && (
              <div>
                <p className="font-sans font-semibold text-fg mb-1 text-xs">
                  Nilai Baru (New Values):
                </p>
                <pre className="p-3 rounded-lg bg-surface-muted border border-line text-emerald-600 dark:text-emerald-400 overflow-x-auto">
                  {JSON.stringify(selectedLog.new_values, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <p className="font-sans font-semibold text-fg mb-1 text-xs">
                User Agent Klien:
              </p>
              <p className="p-2.5 rounded-lg bg-surface-muted border border-line text-fg-muted text-[11px]">
                {selectedLog.user_agent || '-'}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Clear All Confirmation Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Bersihkan Semua Jejak Audit?"
        description="Tindakan ini akan menghapus permanen seluruh riwayat mutasi audit untuk scope saat ini. Tindakan ini tidak dapat dibatalkan."
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowClearModal(false)}
              disabled={isClearing}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              isLoading={isClearing}
              onClick={handleClearAll}
            >
              Ya, Bersihkan Semua
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <HeroExclamationTriangle className="w-8 h-8 shrink-0" />
          <p className="text-xs text-fg-muted">
            Sebanyak <strong className="text-fg">{logs.length} entri riwayat</strong> log audit akan dihapus permanen. Pastikan Anda telah mengarsipkan data ini jika diperlukan untuk kepatuhan regulasi.
          </p>
        </div>
      </Modal>
    </PageContainer>
  )
}

