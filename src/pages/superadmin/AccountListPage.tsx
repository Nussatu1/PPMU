import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { DataTable, type ColumnDef } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { OrganizationMembership, Organization, RoleEntity, User } from '@/types/database'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import {
  HeroPlus,
  HeroUsers,
  HeroCheck,
  HeroEllipsisVertical,
  HeroKey,
  HeroArrowRightOnRectangle,
  HeroNoSymbol,
  HeroPencilSquare,
  HeroEye,
  HeroEyeSlash,
  HeroClipboardDocument,
  HeroArrowPath,
} from '@/components/icons/HeroIcons'

interface ActionMenuProps {
  membership: OrganizationMembership
  onEdit: (mem: OrganizationMembership) => void
  onResetPassword: (mem: OrganizationMembership) => void
  onToggleStatus: (mem: OrganizationMembership) => void
  onMoveOrg: (mem: OrganizationMembership) => void
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  membership,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onMoveOrg,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const menuWidth = 190
    const menuHeight = 170

    let left = rect.right - menuWidth
    if (left < 10) left = 10

    let top = rect.bottom + 4
    if (top + menuHeight > window.innerHeight - 10) {
      top = rect.top - menuHeight - 4
    }

    setCoords({ top, left })
  }, [])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen) {
      updatePosition()
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    const handleScrollOrResize = () => {
      setIsOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen])

  const isUserActive = membership.user?.status !== 'inactive' && membership.status !== 'inactive'

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-11 h-11 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-hover-bg transition cursor-pointer"
        title="Opsi Akun"
      >
        <HeroEllipsisVertical className="w-5 h-5" />
      </button>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}
            className="w-48 rounded-xl bg-surface border border-line shadow-xl py-1 text-xs text-fg animate-scale-in"
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onEdit(membership)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-hover-bg transition text-fg"
            >
              <HeroPencilSquare className="w-4 h-4 text-amber-500" />
              <span>Ubah Data Akun</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onResetPassword(membership)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-hover-bg transition text-fg"
            >
              <HeroKey className="w-4 h-4 text-blue-500" />
              <span>Reset Kata Sandi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onMoveOrg(membership)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-hover-bg transition text-fg"
            >
              <HeroArrowRightOnRectangle className="w-4 h-4 text-purple-500" />
              <span>Pindah Organisasi</span>
            </button>

            <div className="my-1 border-t border-line" />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onToggleStatus(membership)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-hover-bg transition ${
                isUserActive ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <HeroNoSymbol className="w-4 h-4" />
              <span>{isUserActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}

export const AccountListPage: React.FC = () => {
  const { user } = useAuth()
  const { success, error } = useToast()

  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [roles, setRoles] = useState<RoleEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('all')
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('all')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')

  // Create / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingMem, setEditingMem] = useState<OrganizationMembership | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    organization_id: '',
    level: 'admin' as 'admin' | 'anggota',
    role_id: 'role-admin-org',
    status: 'active' as OrganizationMembership['status'],
  })

  // Credential Handover Card Modal State
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false)
  const [credentialCardData, setCredentialCardData] = useState<{
    name: string
    username: string
    email: string
    password: string
    organizationName: string
    level: string
    roleName: string
  } | null>(null)

  // Confirmation Modals State
  const [resetMem, setResetMem] = useState<OrganizationMembership | null>(null)
  const [statusToggleMem, setStatusToggleMem] = useState<OrganizationMembership | null>(null)
  const [moveOrgMem, setMoveOrgMem] = useState<OrganizationMembership | null>(null)
  const [moveOrgForm, setMoveOrgForm] = useState({
    targetOrgId: '',
    targetRoleId: '',
    level: 'anggota' as 'admin' | 'anggota',
  })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [mems, orgs, rls] = await Promise.all([
        dataService.getMemberships(undefined, user),
        dataService.getOrganizations(user),
        dataService.getRoles(undefined, user),
      ])
      setMemberships(mems)
      setOrganizations(orgs)
      setRoles(rls)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data akun'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let rand = ''
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `Akses${rand}#`
  }

  const openCreateModal = () => {
    setEditingMem(null)
    const initialOrgId = organizations[0]?.id || ''
    const initialRoleId = roles[0]?.id || 'role-admin-org'
    setFormData({
      name: '',
      username: '',
      email: '',
      password: generateRandomPassword(),
      organization_id: initialOrgId,
      level: 'admin',
      role_id: initialRoleId,
      status: 'active',
    })
    setShowPassword(false)
    setIsFormModalOpen(true)
  }

  const openEditModal = (mem: OrganizationMembership) => {
    setEditingMem(mem)
    setFormData({
      name: mem.user?.name || '',
      username: mem.user?.username || '',
      email: mem.user?.email || '',
      password: '',
      organization_id: mem.organization_id,
      level: mem.level || 'admin',
      role_id: mem.role_id,
      status: mem.status,
    })
    setShowPassword(false)
    setIsFormModalOpen(true)
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.organization_id) {
      error('Validasi Gagal', 'Nama, Email, dan Organisasi wajib diisi.')
      return
    }

    try {
      if (editingMem) {
        // Update user & membership
        if (editingMem.user_id) {
          const userUpdate: Partial<User> = {
            name: formData.name,
            username: formData.username || undefined,
            email: formData.email,
          }
          if (formData.password.trim()) {
            userUpdate.password_hash = formData.password.trim()
          }
          await dataService.updateUser(editingMem.user_id, userUpdate)
        }
        await dataService.updateMembership(
          editingMem.id,
          {
            organization_id: formData.organization_id,
            role_id: formData.role_id,
            level: formData.level,
            status: formData.status,
          },
          user
        )
        success('Data Diperbarui', `Akun ${formData.name} berhasil diperbarui.`)
        setIsFormModalOpen(false)
        loadData()
      } else {
        // Create new user & membership
        const chosenPassword = formData.password.trim() || generateRandomPassword()
        const rawUsername = formData.username.trim() || formData.email.split('@')[0]
        const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_.]/g, '')

        const newUser = await dataService.createUser({
          name: formData.name,
          username: cleanUsername,
          email: formData.email.trim(),
          password_hash: chosenPassword,
          must_change_password: true,
          role: formData.level === 'admin' ? 'admin' : 'member',
          status: formData.status,
        })

        await dataService.createMembership(
          {
            user_id: newUser.id,
            organization_id: formData.organization_id,
            role_id: formData.role_id,
            level: formData.level,
            status: formData.status,
          },
          user
        )

        const selectedOrg = organizations.find((o) => o.id === formData.organization_id)
        const selectedRole = roles.find((r) => r.id === formData.role_id)

        // Close form & open credential handover card
        setIsFormModalOpen(false)
        setCredentialCardData({
          name: formData.name,
          username: cleanUsername,
          email: formData.email.trim(),
          password: chosenPassword,
          organizationName: selectedOrg?.name || 'Organisasi Terkait',
          level: formData.level === 'admin' ? 'Admin Organisasi' : 'Anggota Organisasi',
          roleName: selectedRole?.name || 'Pengurus',
        })
        setIsCredentialModalOpen(true)
        loadData()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan akun'
      error('Gagal', msg)
    }
  }

  // Copy WhatsApp Template Handover
  const handleCopyWhatsApp = (card: NonNullable<typeof credentialCardData>) => {
    const text = `*AKUN AKSES SISTEM ORGANISASI*
Halo *${card.name}*, berikut akun akses Anda:

🔗 Tautan Login : ${window.location.origin}/login
🏢 Organisasi   : ${card.organizationName}
🔰 Tingkat / Peran : ${card.level} - ${card.roleName}
👤 Username     : ${card.username || card.email}
🔑 Kata Sandi   : ${card.password}

*Catatan:* Demi keamanan, Anda akan diminta memperbarui kata sandi saat pertama kali masuk.`

    navigator.clipboard.writeText(text)
    success('Kredensial Disalin', 'Pesan siap dikirimkan melalui WhatsApp.')
  }

  // Reset Password Execution
  const handleConfirmResetPassword = async () => {
    if (!resetMem || !resetMem.user_id) return
    try {
      const newPass = await dataService.resetUserPassword(resetMem.user_id, undefined, user)
      const memOrg = organizations.find((o) => o.id === resetMem.organization_id)
      const memRole = roles.find((r) => r.id === resetMem.role_id)

      setResetMem(null)
      setCredentialCardData({
        name: resetMem.user?.name || 'Pengguna',
        username: resetMem.user?.username || resetMem.user?.email || '',
        email: resetMem.user?.email || '',
        password: newPass,
        organizationName: memOrg?.name || 'Organisasi Terkait',
        level: (resetMem.level || 'admin') === 'admin' ? 'Admin Organisasi' : 'Anggota Organisasi',
        roleName: memRole?.name || 'Pengurus',
      })
      setIsCredentialModalOpen(true)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mereset kata sandi'
      error('Gagal', msg)
    }
  }

  // Toggle Active/Inactive Execution
  const handleConfirmToggleStatus = async () => {
    if (!statusToggleMem || !statusToggleMem.user_id) return
    try {
      const updatedUser = await dataService.toggleAccountStatus(statusToggleMem.user_id, user)
      success(
        'Status Akun Diperbarui',
        `Akun ${updatedUser.name} sekarang ${updatedUser.status === 'active' ? 'Aktif' : 'Nonaktif'}.`
      )
      setStatusToggleMem(null)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status akun'
      error('Gagal', msg)
    }
  }

  // Move Organization Execution
  const handleConfirmMoveOrg = async () => {
    if (!moveOrgMem) return
    try {
      await dataService.moveUserOrganization(
        moveOrgMem.id,
        moveOrgForm.targetOrgId,
        moveOrgForm.targetRoleId,
        moveOrgForm.level,
        user
      )
      success('Organisasi Dipindahkan', `Akun ${moveOrgMem.user?.name} berhasil dipindahkan ke organisasi baru.`)
      setMoveOrgMem(null)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memindahkan organisasi'
      error('Gagal', msg)
    }
  }

  // Filtered dataset
  const filteredMemberships = memberships.filter((m) => {
    const uName = m.user?.name?.toLowerCase() || ''
    const uEmail = m.user?.email?.toLowerCase() || ''
    const uUsername = m.user?.username?.toLowerCase() || ''
    const q = searchQuery.toLowerCase()

    if (q && !uName.includes(q) && !uEmail.includes(q) && !uUsername.includes(q)) {
      return false
    }
    if (selectedOrgFilter !== 'all' && m.organization_id !== selectedOrgFilter) {
      return false
    }
    const memLevel = m.level || 'admin'
    if (selectedLevelFilter !== 'all' && memLevel !== selectedLevelFilter) {
      return false
    }
    if (selectedRoleFilter !== 'all' && m.role_id !== selectedRoleFilter) {
      return false
    }
    const isActive = m.user?.status === 'active' && m.status === 'active'
    if (selectedStatusFilter === 'active' && !isActive) return false
    if (selectedStatusFilter === 'inactive' && isActive) return false

    return true
  })

  const columns: ColumnDef<OrganizationMembership>[] = [
    {
      key: 'user.name',
      label: 'Nama Akun',
      sortable: true,
      render: (mem) => {
        const initial = (mem.user?.name || 'U').slice(0, 2).toUpperCase()
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-amber-500/20">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-fg text-sm truncate">{mem.user?.name}</span>
                {mem.user?.is_superadmin && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                    Superadmin
                  </span>
                )}
              </div>
              <p className="text-xs text-fg-muted truncate">
                @{mem.user?.username || mem.user?.email?.split('@')[0]}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'user.email',
      label: 'Email Pengguna',
      render: (mem) => (
        <span className="text-xs font-mono text-fg-muted">{mem.user?.email || '-'}</span>
      ),
    },
    {
      key: 'organization',
      label: 'Organisasi',
      sortable: true,
      render: (mem) => (
        <span className="text-xs font-medium text-fg">{mem.organization?.name || 'Lintas Organisasi'}</span>
      ),
    },
    {
      key: 'level',
      label: 'Tingkat',
      sortable: true,
      render: (mem) => {
        const isAdm = (mem.level || 'admin') === 'admin'
        return (
          <Badge variant={isAdm ? 'primary' : 'gray'}>
            {isAdm ? 'Admin' : 'Anggota'}
          </Badge>
        )
      },
    },
    {
      key: 'role',
      label: 'Peran (Role)',
      render: (mem) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-muted border border-line text-fg">
          {mem.role?.name || 'Pengurus'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (mem) => {
        const isActive = mem.user?.status === 'active' && mem.status === 'active'
        return (
          <Badge variant={isActive ? 'success' : 'danger'}>
            {isActive ? 'Aktif' : 'Nonaktif'}
          </Badge>
        )
      },
    },
    {
      key: 'id',
      label: 'Aksi',
      render: (mem) => (
        <ActionMenu
          membership={mem}
          onEdit={openEditModal}
          onResetPassword={(m) => setResetMem(m)}
          onToggleStatus={(m) => setStatusToggleMem(m)}
          onMoveOrg={(m) => {
            setMoveOrgMem(m)
            setMoveOrgForm({
              targetOrgId: m.organization_id,
              targetRoleId: m.role_id,
              level: m.level || 'anggota',
            })
          }}
        />
      ),
    },
  ]

  return (
    <PageContainer variant="full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
          <HeroUsers className="w-7 h-7 text-amber-500" />
          Akun Pengguna
        </h1>

        <Button
          variant="primary"
          onClick={openCreateModal}
          className="shrink-0 self-start sm:self-auto"
        >
          <HeroPlus className="w-4 h-4 mr-2" />
          Tambah Akun
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 sm:p-4 rounded-xl bg-surface ring-1 ring-line shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Search */}
          <div className="lg:col-span-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari akun..."
              className="text-xs h-9"
            />
          </div>

          {/* Org Filter */}
          <div>
            <Select
              value={selectedOrgFilter}
              onChange={(e) => setSelectedOrgFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Organisasi' },
                ...organizations.map((o) => ({ value: o.id, label: o.name })),
              ]}
              className="text-xs h-9"
            />
          </div>

          {/* Level Filter */}
          <div>
            <Select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Tingkat' },
                { value: 'admin', label: 'Admin Organisasi' },
                { value: 'anggota', label: 'Anggota Organisasi' },
              ]}
              className="text-xs h-9"
            />
          </div>

          {/* Role Filter */}
          <div>
            <Select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Peran' },
                ...roles.map((r) => ({ value: r.id, label: r.name })),
              ]}
              className="text-xs h-9"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Status' },
                { value: 'active', label: 'Hanya Aktif' },
                { value: 'inactive', label: 'Hanya Nonaktif' },
              ]}
              className="text-xs h-9"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredMemberships}
        isLoading={isLoading}
        searchPlaceholder="Filter akun..."
        searchKey="user.name"
        renderCard={(mem) => {
          const initial = (mem.user?.name || 'U').slice(0, 2).toUpperCase()
          const isActive = mem.user?.status === 'active' && mem.status === 'active'
          const isAdm = (mem.level || 'admin') === 'admin'

          return (
            <div className="p-4 rounded-xl bg-surface border border-line shadow-xs space-y-3">
              {/* Top: Avatar, Name, Username, and Action Menu */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-amber-500/20">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-fg text-sm truncate">{mem.user?.name}</span>
                      {mem.user?.is_superadmin && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0">
                          Superadmin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-fg-muted truncate">
                      @{mem.user?.username || mem.user?.email?.split('@')[0]}
                    </p>
                  </div>
                </div>

                {/* ⋯ Action Menu */}
                <div className="shrink-0 -mr-1 -mt-1">
                  <ActionMenu
                    membership={mem}
                    onEdit={openEditModal}
                    onResetPassword={(m) => setResetMem(m)}
                    onToggleStatus={(m) => setStatusToggleMem(m)}
                    onMoveOrg={(m) => {
                      setMoveOrgMem(m)
                      setMoveOrgForm({
                        targetOrgId: m.organization_id,
                        targetRoleId: m.role_id,
                        level: m.level || 'anggota',
                      })
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="text-xs font-mono text-fg-muted truncate">
                {mem.user?.email || '-'}
              </div>

              {/* Divider */}
              <div className="border-t border-line-divider" />

              {/* Bottom Info: Organization, Role/Level, Status */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-fg truncate">
                    {mem.organization?.name || 'Lintas Organisasi'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-fg-muted">
                    <span>{isAdm ? 'Admin' : 'Anggota'}</span>
                    <span>•</span>
                    <span className="font-medium text-fg">{mem.role?.name || 'Pengurus'}</span>
                  </div>
                </div>

                <Badge variant={isActive ? 'success' : 'danger'}>
                  {isActive ? '● Aktif' : '● Nonaktif'}
                </Badge>
              </div>
            </div>
          )
        }}
      />

      {/* Form Modal (Create / Edit) */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingMem ? 'Ubah Data Akun' : 'Terbitkan Akun Pengguna Baru'}
        size="lg"
      >
        <form noValidate onSubmit={handleSaveForm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value
                  setFormData((prev) => ({
                    ...prev,
                    name: val,
                    username: prev.username || val.toLowerCase().replace(/[^a-z0-9]/g, ''),
                  }))
                }}
                placeholder="Contoh: Budi Santoso"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg mb-1">
                Alamat Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="budi@organisasi.id"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg mb-1">
                Username Akses <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })}
                placeholder="budisantoso"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg mb-1">
                Organisasi Penugasan <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.organization_id}
                onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                options={organizations.map((o) => ({ value: o.id, label: o.name }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg mb-1">
                Tingkat Akun <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as 'admin' | 'anggota' })}
                options={[
                  { value: 'admin', label: 'Admin Organisasi' },
                  { value: 'anggota', label: 'Anggota Organisasi' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg mb-1">
                Peran & Hak Akses (Role) <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
              />
            </div>
          </div>

          {/* Password field with Generator */}
          <div className="p-3.5 rounded-xl bg-surface-muted border border-line space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-fg">
                {editingMem ? 'Ganti Kata Sandi (Opsional)' : 'Kata Sandi Awal Sementara'}
              </label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HeroArrowPath className="w-3.5 h-3.5" /> Acak Password Baru
              </button>
            </div>

            <div className="relative flex items-center">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingMem ? 'Biarkan kosong jika tidak ingin diubah' : 'Password...'}
                className="pr-10 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-fg-muted hover:text-fg cursor-pointer"
                title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPassword ? <HeroEyeSlash className="w-4 h-4" /> : <HeroEye className="w-4 h-4" />}
              </button>
            </div>
            {!editingMem && (
              <p className="text-[11px] text-fg-muted">
                Pengguna akan diwajibkan memperbarui kata sandi ini saat pertama kali berhasil login.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => setIsFormModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              <HeroCheck className="w-4 h-4 mr-1.5" />
              {editingMem ? 'Perbarui Akun' : 'Terbitkan Akun'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Credential Handover Card Modal */}
      {credentialCardData && (
        <Modal
          isOpen={isCredentialModalOpen}
          onClose={() => setIsCredentialModalOpen(false)}
          title="Kredensial Akun Siap Diserahkan"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300">
              Akun berhasil diterbitkan/direset. Salin informasi di bawah untuk dikirimkan langsung ke pengguna melalui WhatsApp.
            </div>

            <div className="p-4 rounded-xl bg-surface-muted border border-line font-mono text-xs text-fg space-y-1.5 select-all">
              <p className="font-bold text-amber-600 dark:text-amber-400 mb-2">
                *AKUN AKSES SISTEM ORGANISASI*
              </p>
              <p>Halo *{credentialCardData.name}*, berikut akun akses Anda:</p>
              <p className="pt-2">🔗 Tautan Login : {window.location.origin}/login</p>
              <p>🏢 Organisasi   : {credentialCardData.organizationName}</p>
              <p>🔰 Tingkat / Peran : {credentialCardData.level} - {credentialCardData.roleName}</p>
              <p>👤 Username     : {credentialCardData.username || credentialCardData.email}</p>
              <p>🔑 Kata Sandi   : {credentialCardData.password}</p>
              <p className="pt-2 text-[11px] text-fg-muted italic">
                *Catatan:* Demi keamanan, Anda akan diminta memperbarui kata sandi saat pertama kali masuk.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsCredentialModalOpen(false)}>
                Selesai
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleCopyWhatsApp(credentialCardData)}
              >
                <HeroClipboardDocument className="w-4 h-4 mr-1.5" />
                Salin untuk WhatsApp
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password Confirmation Modal */}
      {resetMem && (
        <Modal
          isOpen={!!resetMem}
          onClose={() => setResetMem(null)}
          title="Konfirmasi Reset Kata Sandi"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-fg leading-relaxed">
              Yakin ingin mereset kata sandi untuk akun <strong>{resetMem.user?.name}</strong>?
              Sistem akan membuat kata sandi acak baru dan mewajibkan pengguna memperbaruinya saat login berikutnya.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setResetMem(null)}>
                Batal
              </Button>
              <Button type="button" variant="danger" onClick={handleConfirmResetPassword}>
                <HeroKey className="w-4 h-4 mr-1.5" />
                Reset & Tampilkan Sandi
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toggle Status Confirmation Modal */}
      {statusToggleMem && (
        <Modal
          isOpen={!!statusToggleMem}
          onClose={() => setStatusToggleMem(null)}
          title={statusToggleMem.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Kembali Akun'}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-fg leading-relaxed">
              {statusToggleMem.status === 'active' ? (
                <>
                  Yakin ingin menonaktifkan akun <strong>{statusToggleMem.user?.name}</strong>?
                  Pengguna tidak akan dapat login ke sistem, namun seluruh data historis tetap aman tersimpan.
                </>
              ) : (
                <>
                  Aktifkan kembali akses login untuk akun <strong>{statusToggleMem.user?.name}</strong>?
                </>
              )}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setStatusToggleMem(null)}>
                Batal
              </Button>
              <Button
                type="button"
                variant={statusToggleMem.status === 'active' ? 'danger' : 'primary'}
                onClick={handleConfirmToggleStatus}
              >
                {statusToggleMem.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Move Organization Modal */}
      {moveOrgMem && (
        <Modal
          isOpen={!!moveOrgMem}
          onClose={() => setMoveOrgMem(null)}
          title={`Pindah Organisasi: ${moveOrgMem.user?.name}`}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-fg-muted">
              Pindahkan akun ini ke organisasi lain dan sesuaikan peran barunya.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-fg mb-1">Organisasi Tujuan</label>
                <Select
                  value={moveOrgForm.targetOrgId}
                  onChange={(e) => setMoveOrgForm({ ...moveOrgForm, targetOrgId: e.target.value })}
                  options={organizations.map((o) => ({ value: o.id, label: o.name }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-fg mb-1">Tingkat Baru</label>
                <Select
                  value={moveOrgForm.level}
                  onChange={(e) => setMoveOrgForm({ ...moveOrgForm, level: e.target.value as 'admin' | 'anggota' })}
                  options={[
                    { value: 'admin', label: 'Admin Organisasi' },
                    { value: 'anggota', label: 'Anggota Organisasi' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-fg mb-1">Peran Baru di Organisasi</label>
                <Select
                  value={moveOrgForm.targetRoleId}
                  onChange={(e) => setMoveOrgForm({ ...moveOrgForm, targetRoleId: e.target.value })}
                  options={roles.map((r) => ({ value: r.id, label: r.name }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button type="button" variant="secondary" onClick={() => setMoveOrgMem(null)}>
                Batal
              </Button>
              <Button type="button" variant="primary" onClick={handleConfirmMoveOrg}>
                <HeroCheck className="w-4 h-4 mr-1.5" />
                Pindahkan
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  )
}
