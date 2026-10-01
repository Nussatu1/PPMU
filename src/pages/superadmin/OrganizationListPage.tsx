import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { DataTable, type ColumnDef } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { MobileCard } from '@/components/ui/MobileCard'
import { Section } from '@/components/ui/Section'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type {
  Organization,
  OrganizationMembership,
  User,
  RoleEntity,
  OrganizationUnitType,
} from '@/types/database'
import {
  getOrganizationTree,
  getDescendantOrganizationIds,
  type OrganizationTreeNode,
} from '@/lib/hierarchyService'
import { OrganizationTreeView } from '@/components/organization'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { ImageUpload } from '@/components/ui/ImageUpload'
import {
  HeroPlus,
  HeroBuildingOffice,
  HeroCheck,
  HeroUsers,
  HeroTrash,
  HeroPencilSquare,
  HeroUserPlus,
  HeroArrowLeft,
  HeroMapPin,
  HeroSquares2X2,
} from '@/components/icons/HeroIcons'
import { cn } from '@/lib/utils'

export const OrganizationListPage: React.FC = () => {
  const { user, currentOrganization, switchOrganization, refreshOrganizations } = useAuth()
  const { success, error } = useToast()
  const { confirm } = useConfirm()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<RoleEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Screen View Mode: 'list' (Daftar Organisasi) vs 'form' (Layar Penuh Form Organisasi)
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list')
  const [displayMode, setDisplayMode] = useState<'tree' | 'table'>('tree')
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)

  // Form Data dengan Hierarki
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    code: '',
    slug: '',
    description: '',
    status: 'active' as Organization['status'],
    period_active: '2024 - 2026',
    email: '',
    phone: '',
    address: '',
    logo_url: '',
    parent_id: null as string | null,
    unit_type: 'unit' as OrganizationUnitType,
  })

  // Read-Only Preview Members Modal (dari badge kolom tabel luar)
  const [previewMembersOrg, setPreviewMembersOrg] = useState<Organization | null>(null)

  // Sub-Modal: Add Member ke Organisasi (di dalam Form)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('')
  const [selectedLevelToAdd, setSelectedLevelToAdd] = useState<'admin' | 'anggota'>('anggota')
  const [selectedRoleIdToAdd, setSelectedRoleIdToAdd] = useState('')

  // Sub-Modal: Edit Member Role (di dalam Form)
  const [editingMember, setEditingMember] = useState<OrganizationMembership | null>(null)
  const [editMemberForm, setEditMemberForm] = useState({
    level: 'anggota' as 'admin' | 'anggota',
    roleId: '',
  })

  // Sub-Modal: Remove Member Confirm (di dalam Form)
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMembership | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [orgs, mems, usrs, rls] = await Promise.all([
        dataService.getOrganizations(user),
        dataService.getMemberships(undefined, user),
        dataService.getUsers(),
        dataService.getRoles(undefined, user),
      ])
      setOrganizations(orgs)
      setMemberships(mems)
      setAllUsers(usrs)
      setRoles(rls)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data organisasi'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Cegat MobileAppHeader back saat form aktif agar menutup form dan tetap di /organizations
  useEffect(() => {
    if (viewMode !== 'form') return
    const handleMobileBack = (e: Event) => {
      e.preventDefault()
      setViewMode('list')
      setEditingOrg(null)
    }
    window.addEventListener('filament:mobile-back', handleMobileBack)
    return () => window.removeEventListener('filament:mobile-back', handleMobileBack)
  }, [viewMode])

  const autoGenerateSlug = (nameVal: string) => {
    const generated = nameVal
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      slug:
        prev.slug === '' ||
        prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
          ? generated
          : prev.slug,
    }))
  }

  const openCreateForm = (prefilledParentId?: string | null) => {
    setEditingOrg(null)
    const parentOrg = organizations.find((o) => o.id === prefilledParentId)
    const suggestedType: OrganizationUnitType = !prefilledParentId
      ? 'pimpinan'
      : parentOrg?.unit_type === 'pimpinan'
      ? 'lembaga'
      : parentOrg?.unit_type === 'lembaga'
      ? 'kelompok'
      : 'unit'

    setFormData({
      name: '',
      short_name: '',
      code: '',
      slug: '',
      description: '',
      status: 'active',
      period_active: '2024 - 2026',
      email: '',
      phone: '',
      address: '',
      logo_url: '',
      parent_id: prefilledParentId || null,
      unit_type: suggestedType,
    })
    setViewMode('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openEditForm = (org: Organization) => {
    setEditingOrg(org)
    setFormData({
      name: org.name || '',
      short_name: org.short_name || '',
      code: org.code || '',
      slug: org.slug || '',
      description: org.description || '',
      status: org.status || 'active',
      period_active: org.period_active || '2024 - 2026',
      email: org.email || '',
      phone: org.phone || '',
      address: org.address || '',
      logo_url: org.logo_url || '',
      parent_id: org.parent_id || null,
      unit_type: (org.unit_type as OrganizationUnitType) || 'unit',
    })
    setViewMode('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Opsi pemilihan parent dengan indentasi hirarkis & pencegahan cycle
  const parentOptions = useMemo(() => {
    const tree = getOrganizationTree(null, organizations)
    const flat: Array<{ id: string; name: string; level: number; code: string }> = []
    const traverse = (nodes: OrganizationTreeNode[]) => {
      for (const node of nodes) {
        flat.push({ id: node.id, name: node.name, level: node.level ?? 0, code: node.code })
        if (node.children?.length) traverse(node.children)
      }
    }
    traverse(tree)

    // Cegah memilih diri sendiri atau turunan diri sendiri sebagai parent
    const descendantIds = editingOrg
      ? getDescendantOrganizationIds(editingOrg.id, organizations, true)
      : []

    const validOrgs = flat.filter((o) => {
      if (!editingOrg) return true
      if (o.id === editingOrg.id) return false
      if (descendantIds.includes(o.id)) return false
      return true
    })

    return [
      { value: '', label: '— Tidak Ada / Tingkat Tertinggi (Root Node) —' },
      ...validOrgs.map((o) => ({
        value: o.id,
        label: `${'  '.repeat(Math.max(0, o.level))}${o.level > 0 ? '└─ ' : ''}${o.name} (${o.code})`,
      })),
    ]
  }, [organizations, editingOrg])

  // Hitung level secara otomatis (derived) dari parent terpilih
  const currentParentOrg = organizations.find((o) => o.id === formData.parent_id)
  const currentDerivedLevel = formData.parent_id && currentParentOrg ? (currentParentOrg.level ?? 0) + 1 : 0

  const handleSave = async (e: React.FormEvent, createAnother = false) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.code.trim()) {
      error('Validasi Gagal', 'Nama dan Kode Organisasi wajib diisi')
      return
    }

    try {
      const slug =
        formData.slug ||
        formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const email =
        formData.email ||
        `${formData.code.toLowerCase().replace(/[^a-z0-9]/g, '')}@ekosistem.id`

      const payload = {
        ...formData,
        slug,
        email,
        parent_id: formData.parent_id || null,
        level: currentDerivedLevel,
      }

      if (editingOrg) {
        await dataService.updateOrganization(
          editingOrg.id,
          { ...payload, email: editingOrg.email || email },
          user
        )
        success('Organisasi Diperbarui', `Organisasi "${formData.name}" berhasil diperbarui.`)
        await refreshOrganizations()
        setViewMode('list')
      } else {
        await dataService.createOrganization(payload, user)
        success('Organisasi Dibuat', `Organisasi "${formData.name}" berhasil ditambahkan ke ekosistem.`)
        await refreshOrganizations()
        if (createAnother) {
          openCreateForm(formData.parent_id)
        } else {
          setViewMode('list')
        }
      }
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses data organisasi'
      error('Gagal', msg)
    }
  }

  const handleDelete = async (org: Organization) => {
    const ok = await confirm({
      title: 'Hapus Organisasi',
      message: `Yakin ingin menghapus organisasi "${org.name}"? Seluruh data operasional akan terisolasi.`,
      tone: 'danger',
      confirmLabel: 'Hapus Organisasi',
    })
    if (!ok) return
    try {
      await dataService.deleteOrganization(org.id, user)
      success('Organisasi Dihapus', `Organisasi ${org.name} telah dihapus.`)
      await refreshOrganizations()
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus organisasi'
      error('Gagal', msg)
    }
  }

  // Members Management Methods
  const openAddMemberModal = () => {
    if (!editingOrg) return
    const existingUserIds = new Set(
      memberships.filter((m) => m.organization_id === editingOrg.id).map((m) => m.user_id)
    )
    const availableUsers = allUsers.filter((u) => !existingUserIds.has(u.id))

    setSelectedUserIdToAdd(availableUsers[0]?.id || '')
    setSelectedLevelToAdd('anggota')
    setSelectedRoleIdToAdd(roles[0]?.id || 'role-seksi')
    setIsAddMemberModalOpen(true)
  }

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrg || !selectedUserIdToAdd || !selectedRoleIdToAdd) {
      error('Validasi Gagal', 'Silakan pilih akun dan peran.')
      return
    }

    try {
      await dataService.addExistingUserToOrganization(
        selectedUserIdToAdd,
        editingOrg.id,
        selectedRoleIdToAdd,
        selectedLevelToAdd,
        user
      )
      const addedUser = allUsers.find((u) => u.id === selectedUserIdToAdd)
      success(
        'Anggota Ditambahkan',
        `Akun ${addedUser?.name || 'Pengguna'} berhasil ditambahkan ke ${editingOrg.name}.`
      )
      setIsAddMemberModalOpen(false)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan anggota'
      error('Gagal', msg)
    }
  }

  const openEditMemberModal = (mem: OrganizationMembership) => {
    setEditingMember(mem)
    setEditMemberForm({
      level: mem.level || 'anggota',
      roleId: mem.role_id,
    })
  }

  const handleEditMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return
    try {
      await dataService.updateMembership(
        editingMember.id,
        {
          level: editMemberForm.level,
          role_id: editMemberForm.roleId,
        },
        user
      )
      success('Peran Diperbarui', `Peran untuk ${editingMember.user?.name} berhasil diperbarui.`)
      setEditingMember(null)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui peran anggota'
      error('Gagal', msg)
    }
  }

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return
    try {
      await dataService.deleteMembership(memberToRemove.id, user)
      success(
        'Keanggotaan Dicabut',
        `Akun ${memberToRemove.user?.name} telah dicabut dari organisasi. Data akun master tetap aman.`
      )
      setMemberToRemove(null)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencabut keanggotaan'
      error('Gagal', msg)
    }
  }

  // Filter current editing org members (di dalam Form)
  const currentEditingOrgMembers = editingOrg
    ? memberships.filter((m) => m.organization_id === editingOrg.id)
    : []

  const existingEditingOrgUserIds = new Set(currentEditingOrgMembers.map((m) => m.user_id))
  const availableUsersToAddToEditingOrg = allUsers.filter(
    (u) => !existingEditingOrgUserIds.has(u.id)
  )

  // Filter preview org members (di modal read-only luar)
  const previewOrgMembers = previewMembersOrg
    ? memberships.filter((m) => m.organization_id === previewMembersOrg.id)
    : []

  const columns: ColumnDef<Organization>[] = [
    {
      key: 'name',
      label: 'Organisasi',
      sortable: true,
      render: (org) => (
        <div className="flex items-center gap-3">
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.name}
              className="w-10 h-10 rounded-lg object-cover ring-1 ring-line shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
              {org.code.slice(0, 3)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-fg truncate">{org.name}</p>
              {org.short_name && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                  {org.short_name}
                </span>
              )}
            </div>
            <p className="text-xs text-fg-muted truncate">{org.description || 'Tidak ada deskripsi'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      label: 'Kode Identifikasi',
      sortable: true,
      render: (org) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-muted text-fg">
          {org.code}
        </span>
      ),
    },
    {
      key: 'members',
      label: 'Pengurus & Anggota',
      render: (org) => {
        const orgMembers = memberships.filter((m) => m.organization_id === org.id)
        return (
          <button
            type="button"
            onClick={() => setPreviewMembersOrg(org)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
            title="Klik untuk melihat anggota terdaftar"
          >
            <HeroUsers className="w-3.5 h-3.5" />
            <span>{orgMembers.length} Akun Terdaftar</span>
          </button>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (org) => {
        const variantMap: Record<Organization['status'], 'success' | 'warning' | 'danger'> = {
          active: 'success',
          trial: 'warning',
          suspended: 'danger',
          inactive: 'danger',
          archived: 'warning',
        }
        const labelMap: Record<Organization['status'], string> = {
          active: 'Aktif',
          trial: 'Uji Coba',
          suspended: 'Ditangguhkan',
          inactive: 'Nonaktif',
          archived: 'Diarsipkan',
        }
        return <Badge variant={variantMap[org.status]}>{labelMap[org.status]}</Badge>
      },
    },
  ]

  return (
    <PageContainer variant="full">
      {viewMode === 'list' ? (
        /* SCREEN 1: DAFTAR ORGANISASI (LIST VIEW) */
        <div className="space-y-6">
          {/* Header List */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
              <HeroBuildingOffice className="w-7 h-7 text-amber-500" />
              Manajemen Organisasi
            </h1>

            <Button
              variant="primary"
              onClick={() => openCreateForm()}
              className="shrink-0 self-start sm:self-auto"
            >
              <HeroPlus className="w-4 h-4 mr-2" />
              Tambah Organisasi
            </Button>
          </div>

          {/* Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs">
              <p className="text-xs font-semibold text-fg-muted uppercase">Total Terdaftar</p>
              <p className="text-2xl font-bold text-fg mt-1">{organizations.length}</p>
            </div>
            <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs">
              <p className="text-xs font-semibold text-fg-muted uppercase">Status Aktif</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {organizations.filter((o) => o.status === 'active').length}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs">
              <p className="text-xs font-semibold text-fg-muted uppercase">Periode Uji Coba</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {organizations.filter((o) => o.status === 'trial').length}
              </p>
            </div>
          </div>

          {/* Mode Tampilan: Pohon Hierarki vs Tabel Datar */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <div className="inline-flex items-center p-1 rounded-xl bg-surface-muted border border-line text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDisplayMode('tree')}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                  displayMode === 'tree'
                    ? "bg-surface text-fg shadow-2xs font-bold"
                    : "text-fg-muted hover:text-fg"
                )}
              >
                <HeroSquares2X2 className="w-3.5 h-3.5" />
                <span>Struktur Pohon (Hierarki)</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('table')}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                  displayMode === 'table'
                    ? "bg-surface text-fg shadow-2xs font-bold"
                    : "text-fg-muted hover:text-fg"
                )}
              >
                <span>Tabel Flat</span>
              </button>
            </div>
            <p className="text-xs text-fg-muted">
              {displayMode === 'tree' ? 'Navigasi bertingkat Pimpinan → Lembaga → Kelompok/Unit' : 'Tampilan tabel datar seluruh data organisasi'}
            </p>
          </div>

          {/* Konten Utama Berdasarkan Mode Tampilan */}
          {displayMode === 'tree' ? (
            <OrganizationTreeView
              organizations={organizations}
              memberships={memberships}
              currentOrganization={currentOrganization}
              onSwitchOrganization={(orgId) => switchOrganization(orgId)}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onCreateChild={(parentId) => openCreateForm(parentId)}
              onPreviewMembers={(org) => setPreviewMembersOrg(org)}
            />
          ) : (
            <DataTable
              columns={columns}
              data={organizations}
              isLoading={isLoading}
              searchPlaceholder="Cari organisasi..."
              searchKey="name"
              onEdit={openEditForm}
              onDelete={handleDelete}
              renderCard={(org) => {
                const orgMembers = memberships.filter((m) => m.organization_id === org.id)
                const variantMap: Record<Organization['status'], 'success' | 'warning' | 'danger'> = {
                  active: 'success',
                  trial: 'warning',
                  suspended: 'danger',
                  inactive: 'danger',
                  archived: 'warning',
                }
                const labelMap: Record<Organization['status'], string> = {
                  active: 'Aktif',
                  trial: 'Uji Coba',
                  suspended: 'Ditangguhkan',
                  inactive: 'Nonaktif',
                  archived: 'Diarsipkan',
                }

                const menuActions = [
                  {
                    label: 'Ubah Data Organisasi',
                    icon: <HeroPencilSquare className="w-4 h-4" />,
                    onClick: () => openEditForm(org),
                  },
                  {
                    label: 'Hapus Organisasi',
                    icon: <HeroTrash className="w-4 h-4 text-red-500" />,
                    onClick: () => handleDelete(org),
                    danger: true,
                  },
                ]

                return (
                  <MobileCard
                    title={
                      <div className="flex items-center gap-2">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url}
                            alt={org.name}
                            className="w-8 h-8 rounded-lg object-cover ring-1 ring-line shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {org.code.slice(0, 3)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-fg text-sm truncate">{org.name}</span>
                            {org.short_name && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 shrink-0">
                                {org.short_name}
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[11px] text-fg-muted">{org.code}</p>
                        </div>
                      </div>
                    }
                    status={<Badge variant={variantMap[org.status]}>{labelMap[org.status]}</Badge>}
                    meta={
                      <p className="text-xs text-fg-muted line-clamp-2">
                        {org.description || 'Tidak ada deskripsi'}
                      </p>
                    }
                    primaryAction={
                      <button
                        type="button"
                        onClick={() => setPreviewMembersOrg(org)}
                        className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.99]"
                      >
                        <HeroUsers className="w-4 h-4" />
                        <span>{orgMembers.length} Akun Terdaftar</span>
                      </button>
                    }
                    menuActions={menuActions}
                  />
                )
              }}
            />
          )}
        </div>
      ) : (
        /* SCREEN 2: FORM ORGANISASI PENUH (PAGE VIEW - BUKAN MODAL) */
        <div className="w-full min-w-0 flex-1 space-y-5 animate-in fade-in duration-200">
          {/* Header Form Layar Penuh */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-line">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setViewMode('list')}
                className="hidden sm:inline-flex shrink-0 text-xs"
              >
                <HeroArrowLeft className="w-3.5 h-3.5 mr-1" />
                Kembali
              </Button>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
                {editingOrg ? 'Ubah Organisasi' : 'Tambah Organisasi'}
              </h1>
            </div>
          </div>

          {/* Form Utama dengan Grid 12 Kolom Adaptif (AGENTS.md) */}
          <form noValidate onSubmit={(e) => handleSave(e, false)} className="space-y-4">
            {/* SECTION 1: PROFIL & IDENTITAS RESMI */}
            <Section
              title="Profil Organisasi"
              icon={<HeroBuildingOffice className="w-4 h-4" />}
              collapsible
              defaultCollapsed={false}
              columns={12}
            >
              {/* Logo / Avatar Organisasi (12 kolom) */}
              <div className="col-span-12">
                <ImageUpload
                  label="Logo / Avatar Organisasi"
                  value={formData.logo_url}
                  onChange={(url) => setFormData({ ...formData, logo_url: url })}
                  helperText="Format gambar PNG, JPG, WebP. Disarankan gambar persegi (rasio 1:1) untuk tampilan avatar header."
                />
              </div>

              {/* Nama Resmi Organisasi (7 kolom) */}
              <div className="col-span-12 md:col-span-7">
                <Input
                  label="Nama Resmi Organisasi"
                  required
                  value={formData.name}
                  onChange={(e) => autoGenerateSlug(e.target.value)}
                  placeholder="Contoh: Jami'yyatul Muballighin (JAMUB)"
                  helperText="Nama lengkap instansi (ditampilkan di header bilah samping & laporan)"
                />
              </div>

              {/* Nama Khusus / Singkatan (5 kolom) */}
              <div className="col-span-12 md:col-span-5">
                <Input
                  label="Nama Khusus / Singkatan"
                  value={formData.short_name}
                  onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                  placeholder="Contoh: Jamub"
                  helperText="Singkatan atau nama panggilan resmi organisasi"
                />
              </div>

              {/* Organisasi Induk / Parent Unit (7 kolom) */}
              <div className="col-span-12 md:col-span-7">
                <Select
                  label="Organisasi Induk (Parent Unit)"
                  value={formData.parent_id || ''}
                  options={parentOptions}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                  helperText={`Level hierarki: Tingkat ${currentDerivedLevel} (${formData.parent_id ? 'Sub-unit bawahan' : 'Tingkat tertinggi / Root'}). Dihitung otomatis.`}
                />
              </div>

              {/* Tipe Unit Organisasi (5 kolom) */}
              <div className="col-span-12 md:col-span-5">
                <Select
                  label="Tipe Unit Organisasi"
                  value={formData.unit_type}
                  options={[
                    { value: 'pimpinan', label: 'Pimpinan (Pusat / Wilayah)' },
                    { value: 'lembaga', label: 'Lembaga / Biro / Divisi' },
                    { value: 'kelompok', label: 'Kelompok / Seksi / Bagian' },
                    { value: 'unit', label: 'Unit / Pokja Pelaksana' },
                  ]}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_type: e.target.value as OrganizationUnitType })
                  }
                  helperText="Klasifikasi struktural unit dalam tata kelola organisasi"
                />
              </div>

              {/* Kode Organisasi (4 kolom) */}
              <div className="col-span-12 md:col-span-4">
                <Input
                  label="Kode Organisasi"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="JAMUB"
                  className="font-mono uppercase"
                />
              </div>

              {/* Slug Subdomain (5 kolom) */}
              <div className="col-span-12 md:col-span-5">
                <Input
                  label="Slug Subdomain / URL"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    })
                  }
                  placeholder="jamub"
                  prefixIcon={<span className="text-xs font-mono text-fg-muted pl-1">org/</span>}
                  helperText="Tautan rute web langsung (misal: mytafrih.id/org/jamub)."
                />
              </div>

              {/* Status Organisasi (3 kolom) */}
              <div className="col-span-12 md:col-span-3">
                <Select
                  label="Status Operasional"
                  value={formData.status}
                  options={[
                    { value: 'active', label: 'Aktif' },
                    { value: 'trial', label: 'Uji Coba' },
                    { value: 'suspended', label: 'Ditangguhkan' },
                    { value: 'inactive', label: 'Nonaktif' },
                  ]}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as Organization['status'] })
                  }
                />
              </div>

              {/* Periode Kepengurusan (12 kolom) */}
              <div className="col-span-12">
                <Select
                  label="Periode Kepengurusan"
                  value={formData.period_active}
                  options={[
                    { value: '2024 - 2026', label: '2024 - 2026 (Berjalan)' },
                    { value: '2022 - 2024', label: '2022 - 2024 (Arsip)' },
                    { value: '2020 - 2022', label: '2020 - 2022 (Arsip)' },
                  ]}
                  onChange={(e) => setFormData({ ...formData, period_active: e.target.value })}
                />
              </div>
            </Section>

            {/* SECTION 2: KONTAK & DOMISILI */}
            <Section
              title="Kontak & Domisili"
              icon={<HeroMapPin className="w-4 h-4" />}
              collapsible
              defaultCollapsed={false}
              columns={12}
            >
              {/* Email Resmi (6 kolom) */}
              <div className="col-span-12 md:col-span-6">
                <Input
                  type="email"
                  label="Email Resmi Organisasi"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sekretariat@dpw-jabar.organisasi.id"
                />
              </div>

              {/* Telepon (6 kolom) */}
              <div className="col-span-12 md:col-span-6">
                <Input
                  type="tel"
                  label="Telepon / WhatsApp Kantor"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+62 812-3456-7890"
                />
              </div>

              {/* Alamat Kantor (12 kolom) */}
              <div className="col-span-12">
                <Input
                  label="Alamat Kantor Sekretariat"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Contoh: Jl. Diponegoro No. 22, Kota Bandung, Jawa Barat"
                />
              </div>

              {/* Deskripsi (12 kolom) */}
              <div className="col-span-12">
                <Textarea
                  label="Deskripsi Profil Lembaga"
                  rows={2}
                  autoGrow
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tuliskan catatan singkat..."
                />
              </div>
            </Section>

            {/* SECTION 3: PENGURUS & ANGGOTA ORGANISASI */}
            {editingOrg && (
              <div className="rounded-xl border border-line bg-surface shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-line bg-surface-muted/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-muted ring-1 ring-line flex items-center justify-center text-amber-500 shrink-0">
                      <HeroUsers className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-fg tracking-tight">
                      Pengurus & Anggota
                    </h3>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={openAddMemberModal}
                    disabled={availableUsersToAddToEditingOrg.length === 0}
                    className="shrink-0 text-xs self-start sm:self-auto"
                  >
                    <HeroUserPlus className="w-4 h-4 mr-1.5" />
                    Tambah Akun
                  </Button>
                </div>

                {/* Sub-Tabel Anggota di Form Ubah: Dual-view (Mobile Compact List & Desktop Table) */}
                {/* 1. Mobile Compact List (< sm) */}
                <div className="block sm:hidden space-y-2.5">
                  {currentEditingOrgMembers.length === 0 ? (
                    <div className="py-6 text-center text-xs text-fg-muted bg-surface-muted/50 rounded-xl border border-line">
                      Belum ada akun pengurus yang tergabung dalam organisasi ini.
                    </div>
                  ) : (
                    currentEditingOrgMembers.map((m) => {
                      const isAdm = (m.level || 'admin') === 'admin'
                      const initial = (m.user?.name || 'A').slice(0, 1).toUpperCase()
                      return (
                        <div
                          key={m.id}
                          className="p-3.5 rounded-xl border border-line bg-surface flex flex-col gap-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-fg truncate">{m.user?.name}</p>
                                <p className="text-xs text-fg-muted font-mono truncate">{m.user?.email}</p>
                              </div>
                            </div>
                            <Badge variant={isAdm ? 'primary' : 'gray'}>
                              {isAdm ? 'Admin' : 'Anggota'}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-line/60 text-xs">
                            <span className="text-fg-muted">
                              Peran: <strong className="text-fg">{m.role?.name || 'Pengurus'}</strong>
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditMemberModal(m)}
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-fg-muted hover:text-amber-600 bg-surface-muted hover:bg-surface border border-line transition cursor-pointer"
                                aria-label="Ubah Peran"
                                title="Ubah Peran"
                              >
                                <HeroPencilSquare className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberToRemove(m)}
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-red-600 hover:text-red-700 bg-red-500/10 hover:bg-red-500/20 transition cursor-pointer"
                                aria-label="Cabut dari Organisasi"
                                title="Cabut dari Organisasi"
                              >
                                <HeroTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* 2. Desktop Table (>= sm / final baseline) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-muted text-fg-muted font-semibold border-b border-line">
                      <tr>
                        <th className="py-3 px-4">Nama Akun</th>
                        <th className="py-3 px-4">Tingkat</th>
                        <th className="py-3 px-4">Peran</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {currentEditingOrgMembers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-fg-muted">
                            Belum ada akun pengurus yang tergabung dalam organisasi ini.
                          </td>
                        </tr>
                      ) : (
                        currentEditingOrgMembers.map((m) => {
                          const isAdm = (m.level || 'admin') === 'admin'
                          const initial = (m.user?.name || 'A').slice(0, 1).toUpperCase()
                          return (
                            <tr key={m.id} className="hover:bg-hover-bg transition">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
                                    {initial}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-fg">{m.user?.name}</p>
                                    <p className="text-xs text-fg-muted font-mono">
                                      {m.user?.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant={isAdm ? 'primary' : 'gray'}>
                                  {isAdm ? 'Admin Organisasi' : 'Anggota Organisasi'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-fg">
                                  {m.role?.name || 'Pengurus'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="success">Aktif</Badge>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditMemberModal(m)}
                                    className="p-1.5 rounded-lg text-fg-muted hover:text-amber-500 hover:bg-surface-muted transition cursor-pointer"
                                    title="Ubah Peran"
                                  >
                                    <HeroPencilSquare className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMemberToRemove(m)}
                                    className="p-1.5 rounded-lg text-fg-muted hover:text-red-500 hover:bg-surface-muted transition cursor-pointer"
                                    title="Cabut dari Organisasi"
                                  >
                                    <HeroTrash className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sticky Bottom Actions Bar (Strict Nomenclature AGENTS.md: Buat / Perbarui / Batal) */}
            <div className="sticky bottom-4 z-20 p-4 rounded-xl border border-line bg-surface/95 backdrop-blur-md shadow-lg flex items-center justify-between gap-3">
              <Button type="button" variant="secondary" onClick={() => setViewMode('list')}>
                Batal
              </Button>

              <div className="flex items-center gap-2">
                {!editingOrg && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(e) => handleSave(e, true)}
                  >
                    Buat & Buat Lainnya
                  </Button>
                )}
                <Button type="submit" variant="primary">
                  <HeroCheck className="w-4 h-4 mr-1.5" />
                  {editingOrg ? 'Perbarui' : 'Buat'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 1: Read-Only Preview Anggota (Dibuka dari klik badge kolom tabel luar) */}
      {previewMembersOrg && (
        <Modal
          isOpen={!!previewMembersOrg}
          onClose={() => setPreviewMembersOrg(null)}
          title={`Pengurus & Anggota: ${previewMembersOrg.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-fg-muted">
              Daftar pengurus dan akun yang terdaftar dalam naungan organisasi{' '}
              <strong className="text-fg">{previewMembersOrg.name}</strong>.
            </p>

            <div className="rounded-xl border border-line overflow-hidden bg-surface">
              {/* 1. Mobile Read-Only Contact Roster (< sm) */}
              <div className="block sm:hidden divide-y divide-line">
                {previewOrgMembers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-fg-muted">
                    Belum ada anggota yang terdaftar pada organisasi ini.
                  </div>
                ) : (
                  previewOrgMembers.map((m) => {
                    const isAdm = (m.level || 'admin') === 'admin'
                    const initial = (m.user?.name || 'A').slice(0, 1).toUpperCase()
                    return (
                      <div key={m.id} className="p-3 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-fg truncate">{m.user?.name}</p>
                            <p className="text-xs text-fg-muted font-mono truncate">{m.user?.email}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={isAdm ? 'primary' : 'gray'}>
                            {isAdm ? 'Admin' : 'Anggota'}
                          </Badge>
                          <span className="text-[11px] text-fg-muted font-medium">
                            {m.role?.name || 'Pengurus'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* 2. Desktop Table (>= sm / final baseline) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-fg-muted font-semibold border-b border-line">
                    <tr>
                      <th className="py-2.5 px-3">Nama Akun</th>
                      <th className="py-2.5 px-3">Tingkat</th>
                      <th className="py-2.5 px-3">Peran</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {previewOrgMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-fg-muted">
                          Belum ada anggota yang terdaftar pada organisasi ini.
                        </td>
                      </tr>
                    ) : (
                      previewOrgMembers.map((m) => {
                        const isAdm = (m.level || 'admin') === 'admin'
                        return (
                          <tr key={m.id} className="hover:bg-hover-bg transition">
                            <td className="py-2.5 px-3">
                              <p className="font-semibold text-fg">{m.user?.name}</p>
                              <p className="text-xs text-fg-muted font-mono">{m.user?.email}</p>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant={isAdm ? 'primary' : 'gray'}>
                                {isAdm ? 'Admin Organisasi' : 'Anggota Organisasi'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-fg">
                              {m.role?.name || 'Pengurus'}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant="success">Aktif</Badge>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setPreviewMembersOrg(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Tambah Akun ke Organisasi (Diakses dari Form Ubah Organisasi) */}
      {isAddMemberModalOpen && editingOrg && (
        <Modal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          title={`Tambah Akun ke ${editingOrg.name}`}
          size="md"
        >
          <form noValidate onSubmit={handleAddMemberSubmit} className="space-y-4">
            <p className="text-xs text-fg-muted">
              Pilih akun pengguna yang sudah terdaftar di sistem untuk ditugaskan ke organisasi ini.
            </p>

            <div>
              <label className="block text-xs font-medium text-fg mb-1">
                Pilih Akun Pengguna <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedUserIdToAdd}
                onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                options={availableUsersToAddToEditingOrg.map((u) => ({
                  value: u.id,
                  label: `${u.name} (${u.email})`,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg mb-1">
                Tingkat Akun di Organisasi Ini <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedLevelToAdd}
                onChange={(e) => setSelectedLevelToAdd(e.target.value as 'admin' | 'anggota')}
                options={[
                  { value: 'admin', label: 'Admin Organisasi' },
                  { value: 'anggota', label: 'Anggota Organisasi' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg mb-1">
                Peran (Role) di Organisasi Ini <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedRoleIdToAdd}
                onChange={(e) => setSelectedRoleIdToAdd(e.target.value)}
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsAddMemberModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary">
                <HeroCheck className="w-4 h-4 mr-1.5" />
                Tugaskan ke Organisasi
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Edit Member Role (Diakses dari Form Ubah Organisasi) */}
      {editingMember && (
        <Modal
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          title={`Ubah Peran: ${editingMember.user?.name}`}
          size="sm"
        >
          <form noValidate onSubmit={handleEditMemberSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-fg mb-1">Tingkat Akun</label>
              <Select
                value={editMemberForm.level}
                onChange={(e) =>
                  setEditMemberForm({
                    ...editMemberForm,
                    level: e.target.value as 'admin' | 'anggota',
                  })
                }
                options={[
                  { value: 'admin', label: 'Admin Organisasi' },
                  { value: 'anggota', label: 'Anggota Organisasi' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg mb-1">Peran (Role)</label>
              <Select
                value={editMemberForm.roleId}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, roleId: e.target.value })}
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button type="button" variant="secondary" onClick={() => setEditingMember(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary">
                <HeroCheck className="w-4 h-4 mr-1.5" />
                Perbarui Peran
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Cabut Keanggotaan Confirm */}
      {memberToRemove && (
        <Modal
          isOpen={!!memberToRemove}
          onClose={() => setMemberToRemove(null)}
          title="Cabut Keanggotaan dari Organisasi"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-fg leading-relaxed">
              Yakin ingin mencabut akun <strong>{memberToRemove.user?.name}</strong> dari organisasi{' '}
              <strong>{editingOrg?.name}</strong>?
            </p>
            <p className="text-[11px] text-fg-muted italic">
              *Tindakan ini hanya menghapus keanggotaan dalam organisasi ini. Akun pengguna tidak akan terhapus dari sistem master.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setMemberToRemove(null)}>
                Batal
              </Button>
              <Button type="button" variant="danger" onClick={handleConfirmRemoveMember}>
                <HeroTrash className="w-4 h-4 mr-1.5" />
                Cabut Keanggotaan
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  )
}
