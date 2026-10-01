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
import type { RoleEntity } from '@/types/database'
import {
  ALL_PERMISSION_ACTIONS,
  ALL_PERMISSION_RESOURCES,
} from '@/lib/authorization'
import {
  HeroPlus,
  HeroShieldCheck,
  HeroDocumentDuplicate,
  HeroPencilSquare,
  HeroTrash,
} from '@/components/icons/HeroIcons'

export const RoleListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success, error } = useToast()
  const { confirm } = useConfirm()
  const [roles, setRoles] = useState<RoleEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await dataService.getRoles(undefined, user)
      setRoles(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat peran'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDelete = async (role: RoleEntity) => {
    if (role.is_system) {
      error('Ditolak', 'Peran sistem bawaan dilindungi dan tidak dapat dihapus.')
      return
    }
    const ok = await confirm({
      title: 'Hapus Peran',
      message: `Yakin ingin menghapus peran "${role.name}"?`,
      tone: 'danger',
      confirmLabel: 'Hapus Peran',
    })
    if (!ok) return

    try {
      await dataService.deleteRole(role.id, user)
      success('Peran Dihapus', `Peran ${role.name} telah dihapus.`)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus peran'
      error('Gagal', msg)
    }
  }

  const columns: ColumnDef<RoleEntity>[] = [
    {
      key: 'name',
      label: 'Nama Peran / Role',
      sortable: true,
      render: (role) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <HeroShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-fg text-sm">{role.name}</span>
              {role.is_system && (
                <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                  Sistem
                </span>
              )}
            </div>
            <p className="text-xs text-fg-muted mt-0.5 line-clamp-1">{role.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'permissions',
      label: 'Cakupan Hak Akses',
      render: (role) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-fg border border-line">
          {role.permissions.length} dari {ALL_PERMISSION_RESOURCES.length * ALL_PERMISSION_ACTIONS.length} Izin
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (role) => (
        <Badge variant={role.status === 'active' ? 'success' : 'danger'} dot>
          {role.status === 'active' ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'id',
      label: 'Duplikasi Peran',
      render: (role) => (
        <button
          type="button"
          onClick={() => navigate(`/roles/create?cloneFrom=${role.id}`)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
          title="Duplikat matriks izin peran ini"
        >
          <HeroDocumentDuplicate className="w-4 h-4" />
          <span>Duplikat</span>
        </button>
      ),
    },
  ]

  return (
    <PageContainer variant="full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
          <HeroShieldCheck className="w-6 h-6 text-amber-500" />
          Peran & Wewenang
        </h1>

        <Button
          variant="primary"
          onClick={() => navigate('/roles/create')}
          icon={<HeroPlus className="w-4 h-4 mr-1.5" />}
          className="shrink-0 self-start sm:self-auto"
        >
          Tambah Peran
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={roles}
        isLoading={isLoading}
        searchPlaceholder="Cari peran..."
        searchKey="name"
        onEdit={(role) => navigate(`/roles/${role.id}/edit`)}
        onDelete={handleDelete}
        renderCard={(role) => (
          <div className="p-3.5 rounded-xl bg-surface border border-line shadow-xs space-y-2.5">
            {/* Baris 1: Nama Peran & Menu Aksi */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-fg text-sm truncate">{role.name}</span>
                  {role.is_system && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
                      Sistem
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-fg-muted flex-wrap">
                  <span className="font-medium text-fg">
                    {role.permissions.length} dari {ALL_PERMISSION_RESOURCES.length * ALL_PERMISSION_ACTIONS.length} Izin
                  </span>
                  <span>•</span>
                  <Badge variant={role.status === 'active' ? 'success' : 'danger'} dot>
                    {role.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
                <button
                  type="button"
                  onClick={() => navigate(`/roles/${role.id}/edit`)}
                  className="w-11 h-11 flex items-center justify-center text-fg-muted hover:text-fg rounded-lg hover:bg-hover-bg transition cursor-pointer"
                  title="Ubah Peran"
                >
                  <HeroPencilSquare className="w-4 h-4" />
                </button>
                {!role.is_system && (
                  <button
                    type="button"
                    onClick={() => handleDelete(role)}
                    className="w-11 h-11 flex items-center justify-center text-fg-muted hover:text-red-500 rounded-lg hover:bg-hover-bg transition cursor-pointer"
                    title="Hapus Peran"
                  >
                    <HeroTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Deskripsi */}
            {role.description && (
              <p className="text-xs text-fg-muted line-clamp-1">{role.description}</p>
            )}

            {/* Primary Action: Duplikat Peran (min 44px) */}
            <button
              type="button"
              onClick={() => navigate(`/roles/create?cloneFrom=${role.id}`)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.99]"
            >
              <HeroDocumentDuplicate className="w-4 h-4" />
              <span>Duplikasi Peran Ini</span>
            </button>
          </div>
        )}
      />
    </PageContainer>
  )
}
