import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { DataTable, type ColumnDef } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { OrganizationMembership, Organization, RoleEntity, Person, AccountHolderHistory } from '@/types/database'
import { canManageAccountHandover } from '@/lib/authorization'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { DatePicker } from '@/components/ui/DatePicker'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  HeroPlus,
  HeroUsers,
  HeroCheck,
  HeroEllipsisVertical,
  HeroKey,
  HeroArrowRightOnRectangle,
  HeroNoSymbol,
  HeroPencilSquare,
  HeroClipboardDocument,
  HeroArrowPath,
  HeroFunnel,
  HeroTrash,
  HeroArrowsRightLeft,
} from '@/components/icons/HeroIcons'

interface ActionMenuProps {
  membership: OrganizationMembership
  canHandover?: boolean
  onEdit: (mem: OrganizationMembership) => void
  onResetPassword: (mem: OrganizationMembership) => void
  onToggleStatus: (mem: OrganizationMembership) => void
  onMoveOrg: (mem: OrganizationMembership) => void
  onHandover?: (mem: OrganizationMembership) => void
  onDelete?: (mem: OrganizationMembership) => void
  onSwitchAccount?: (mem: OrganizationMembership) => void
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  membership,
  canHandover = false,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onMoveOrg,
  onHandover,
  onDelete,
  onSwitchAccount,
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
        createPortal(
          <>
            {/* MOBILE: iOS Action Sheet (< md) */}
            <div className="md:hidden fixed inset-0 z-[9999] flex flex-col justify-end">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-overlay/60 backdrop-blur-xs transition-opacity animate-fade-in"
                onClick={() => setIsOpen(false)}
              />

              {/* Sheet Container */}
              <div
                ref={menuRef}
                className="relative w-full rounded-t-2xl bg-surface border-t border-line shadow-2xl p-4 space-y-3 z-10 animate-slide-in-bottom pb-[max(1rem,env(safe-area-inset-bottom))]"
              >
                {/* Visual Drag Indicator / Pill Handle */}
                <div className="w-10 h-1 bg-line-strong rounded-full mx-auto mb-2" />

                {/* Account Header Info */}
                <div className="px-2 pb-2 border-b border-line-divider">
                  <p className="font-semibold text-fg text-sm truncate">{membership.user?.name}</p>
                  <p className="text-xs text-fg-muted truncate">
                    @{membership.user?.username || membership.user?.email?.split('@')[0]} • {membership.organization?.name || 'Lintas Organisasi'}
                  </p>
                </div>

                {/* Action Items List */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      onEdit(membership)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-hover-bg active:bg-hover-bg transition text-fg text-sm font-medium cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <HeroPencilSquare className="w-4 h-4" />
                    </div>
                    <span>Ubah Data Akun</span>
                  </button>

                  {canHandover && onHandover && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        onHandover(membership)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-hover-bg active:bg-hover-bg transition text-fg text-sm font-medium cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <HeroArrowPath className="w-4 h-4" />
                      </div>
                      <span>Serah Terima (Handover)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      onResetPassword(membership)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-hover-bg active:bg-hover-bg transition text-fg text-sm font-medium cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <HeroKey className="w-4 h-4" />
                    </div>
                    <span>Reset Kata Sandi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      onMoveOrg(membership)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-hover-bg active:bg-hover-bg transition text-fg text-sm font-medium cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                      <HeroArrowRightOnRectangle className="w-4 h-4" />
                    </div>
                    <span>{membership.organization_id ? 'Pindah Penugasan Jabatan' : 'Tugaskan ke Jabatan'}</span>
                  </button>

                  <div className="my-1 border-t border-line-divider" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      onToggleStatus(membership)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-hover-bg active:bg-hover-bg transition text-sm font-semibold cursor-pointer ${
                      isUserActive ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isUserActive ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'
                    }`}>
                      <HeroNoSymbol className="w-4 h-4" />
                    </div>
                    <span>{isUserActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}</span>
                  </button>

                  {onSwitchAccount && membership.user && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        onSwitchAccount(membership)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-hover-bg active:bg-hover-bg transition text-fg text-sm font-semibold cursor-pointer text-amber-600 dark:text-amber-400"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                        <HeroArrowsRightLeft className="w-4 h-4" />
                      </div>
                      <span>Beralih (Login Sebagai Akun Ini)</span>
                    </button>
                  )}

                  {onDelete && !membership.user?.is_superadmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        onDelete(membership)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-hover-bg active:bg-hover-bg transition text-sm font-semibold text-red-600 dark:text-red-400 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                        <HeroTrash className="w-4 h-4" />
                      </div>
                      <span>Hapus Akun</span>
                    </button>
                  )}
                </div>

                {/* iOS Dismiss Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full min-h-[44px] py-2.5 rounded-xl bg-surface-muted hover:bg-hover-bg border border-line text-sm font-semibold text-fg cursor-pointer transition text-center"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* DESKTOP: Popover Dropdown (>= md) */}
            {coords && (
              <div
                ref={menuRef}
                style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}
                className="hidden md:block w-56 rounded-xl bg-surface border border-line shadow-xl py-1 text-xs text-fg animate-scale-in"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    onEdit(membership)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-hover-bg transition text-fg"
                >
                  <HeroPencilSquare className="w-4 h-4 text-amber-500" />
                  <span>Ubah Data Akun</span>
                </button>

                {canHandover && onHandover && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      onHandover(membership)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-hover-bg transition text-fg"
                  >
                    <HeroArrowPath className="w-4 h-4 text-emerald-500" />
                    <span>Serah Terima (Handover)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    onResetPassword(membership)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-hover-bg transition text-fg"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-hover-bg transition text-fg"
                >
                  <HeroArrowRightOnRectangle className="w-4 h-4 text-purple-500" />
                  <span>{membership.organization_id ? 'Pindah Penugasan Jabatan' : 'Tugaskan ke Jabatan'}</span>
                </button>

                <div className="my-1 border-t border-line" />

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    onToggleStatus(membership)
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-hover-bg transition ${
                    isUserActive ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <HeroNoSymbol className="w-4 h-4" />
                  <span>{isUserActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}</span>
                </button>

                {onSwitchAccount && membership.user && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      onSwitchAccount(membership)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium transition"
                  >
                    <HeroArrowsRightLeft className="w-4 h-4 text-amber-500" />
                    <span>Beralih (Login Akun Ini)</span>
                  </button>
                )}

                {onDelete && !membership.user?.is_superadmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      onDelete(membership)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-red-500/10 text-red-600 dark:text-red-400 transition"
                  >
                    <HeroTrash className="w-4 h-4" />
                    <span>Hapus Akun</span>
                  </button>
                )}
              </div>
            )}
          </>,
          document.body
        )}
    </div>
  )
}

export const AccountListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, switchPersona } = useAuth()
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
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

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
  const [deleteMem, setDeleteMem] = useState<OrganizationMembership | null>(null)
  const [moveOrgForm, setMoveOrgForm] = useState({
    targetOrgId: '',
    targetRoleId: '',
    level: 'anggota' as 'admin' | 'anggota',
  })

  // Handover Modal State (Stage 5)
  const [handoverMem, setHandoverMem] = useState<OrganizationMembership | null>(null)
  const [handoverHistories, setHandoverHistories] = useState<AccountHolderHistory[]>([])
  const [availablePersons, setAvailablePersons] = useState<Person[]>([])
  const [handoverMode, setHandoverMode] = useState<'select' | 'new'>('select')
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [newPersonForm, setNewPersonForm] = useState({
    name: '',
    identifier: '',
    phone: '',
    email: '',
  })
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().split('T')[0])
  const [handoverNotes, setHandoverNotes] = useState('')
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false)
  const [isConfirmHandoverOpen, setIsConfirmHandoverOpen] = useState(false)

  const openHandoverModal = async (mem: OrganizationMembership) => {
    setHandoverMem(mem)
    setHandoverMode('select')
    setSelectedPersonId('')
    setNewPersonForm({ name: '', identifier: '', phone: '', email: '' })
    setPeriodStart(new Date().toISOString().split('T')[0])
    setHandoverNotes('')
    setIsConfirmHandoverOpen(false)

    try {
      const [pList, hList] = await Promise.all([
        dataService.getPersons(),
        dataService.getAccountHolderHistories(mem.user_id),
      ])
      const currentHolderId = mem.user?.holder_person_id
      setAvailablePersons(pList.filter((p) => p.status === 'active' && p.id !== currentHolderId))
      setHandoverHistories(hList)
    } catch {
      setAvailablePersons([])
      setHandoverHistories([])
    }
  }

  const handleTriggerConfirmHandover = (e: React.FormEvent) => {
    e.preventDefault()
    if (handoverMode === 'select' && !selectedPersonId) {
      error('Validasi Gagal', 'Silakan pilih person pemegang baru dari daftar.')
      return
    }
    if (handoverMode === 'new' && !newPersonForm.name.trim()) {
      error('Validasi Gagal', 'Nama lengkap person baru wajib diisi.')
      return
    }
    if (!periodStart) {
      error('Validasi Gagal', 'Tanggal mulai serah terima wajib diisi.')
      return
    }
    setIsConfirmHandoverOpen(true)
  }

  const handleExecuteHandover = async () => {
    if (!handoverMem) return
    setIsSubmittingHandover(true)
    try {
      await dataService.handoverAccountHolder(
        {
          accountId: handoverMem.user_id,
          newPersonId: handoverMode === 'select' ? selectedPersonId : undefined,
          newPersonData: handoverMode === 'new' ? newPersonForm : undefined,
          periodStart,
          notes: handoverNotes,
        },
        user
      )

      success('Serah Terima Berhasil', `Pemegang akun unit ${handoverMem.user?.name} berhasil dialihkan.`)
      setIsConfirmHandoverOpen(false)
      setHandoverMem(null)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses serah terima pemegang akun'
      error('Gagal Serah Terima', msg)
    } finally {
      setIsSubmittingHandover(false)
    }
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [mems, allUsers, orgs, rls] = await Promise.all([
        dataService.getMemberships(undefined, user),
        dataService.getUsers(),
        dataService.getOrganizations(user),
        dataService.getRoles(undefined, user),
      ])

      // Gabungkan akun yang sudah memiliki penugasan organisasi dan akun unassigned (pool akun)
      const userAssignedIds = new Set(mems.map((m) => m.user_id))
      const unassignedUsers = allUsers.filter((u) => !userAssignedIds.has(u.id))

      const unassignedMemberships: OrganizationMembership[] = unassignedUsers.map((u) => ({
        id: `unassigned-${u.id}`,
        user_id: u.id,
        organization_id: '',
        role_id: '',
        level: (u.role === 'admin' || u.role === 'superadmin') ? 'admin' : 'anggota',
        status: u.status || 'active',
        created_at: u.created_at || new Date().toISOString(),
        joined_at: u.created_at || new Date().toISOString(),
        user: u,
        organization: undefined,
        role: undefined,
      }))

      setMemberships([...mems, ...unassignedMemberships])
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


  const handleEditAccount = (mem: OrganizationMembership) => {
    const targetId = mem.id.startsWith('unassigned-') ? mem.user_id : mem.id
    navigate(`/accounts/${targetId}/edit`)
  }


  // Copy WhatsApp Template Handover
  const handleCopyWhatsApp = (card: NonNullable<typeof credentialCardData>) => {
    const text = `*AKUN AKSES JABATAN RESMI*
Halo *${card.name}*, berikut akun akses Anda:

🔗 Tautan Login : ${window.location.origin}/login
💼 Jabatan      : ${card.organizationName}
🔰 Hak Akses    : ${card.roleName} (${card.level})
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
        organizationName: memOrg?.name || '— Belum Ditugaskan (Pool Akun) —',
        level: resetMem.organization_id
          ? (resetMem.level || 'admin') === 'admin'
            ? 'Admin Organisasi'
            : 'Anggota Organisasi'
          : 'Akun Pengguna Bebas (Unassigned)',
        roleName: resetMem.organization_id ? memRole?.name || 'Pengurus' : 'Belum Ditugaskan',
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

  // Move or Assign Organization Execution
  const handleConfirmMoveOrg = async () => {
    if (!moveOrgMem) return
    if (!moveOrgForm.targetOrgId) {
      error('Validasi Gagal', 'Silakan pilih organisasi tujuan penugasan.')
      return
    }
    try {
      if (moveOrgMem.organization_id && !moveOrgMem.id.startsWith('unassigned-')) {
        await dataService.moveUserOrganization(
          moveOrgMem.id,
          moveOrgForm.targetOrgId,
          moveOrgForm.targetRoleId,
          moveOrgForm.level,
          user
        )
        success('Organisasi Dipindahkan', `Akun ${moveOrgMem.user?.name} berhasil dipindahkan ke organisasi baru.`)
      } else {
        // Akun belum ditugaskan (Unassigned) -> buatkan membership baru
        await dataService.createMembership(
          {
            user_id: moveOrgMem.user_id,
            organization_id: moveOrgForm.targetOrgId,
            role_id: moveOrgForm.targetRoleId || roles[0]?.id || 'role-admin-org',
            level: moveOrgForm.level,
            status: 'active',
          },
          user
        )
        success('Penugasan Berhasil', `Akun ${moveOrgMem.user?.name} berhasil ditugaskan ke organisasi.`)
      }
      setMoveOrgMem(null)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses penugasan organisasi'
      error('Gagal', msg)
    }
  }

  // Single Delete Account Execution
  const handleConfirmDeleteSingle = async () => {
    if (!deleteMem || !deleteMem.user_id) return
    try {
      await dataService.deleteAccount(deleteMem.user_id, user)
      success('Akun Dihapus', `Akun ${deleteMem.user?.name || 'Pengguna'} berhasil dihapus dari sistem.`)
      setDeleteMem(null)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus akun pengguna'
      error('Gagal Menghapus', msg)
    }
  }

  // Bulk Delete Accounts Execution
  const handleBulkDeleteAccounts = async (selectedMembershipIds: string[]) => {
    // Cari user_id dari list membership yang dipilih
    const targetUserIds = selectedMembershipIds
      .map((mId) => {
        const found = memberships.find((m) => m.id === mId)
        return found?.user_id
      })
      .filter((uId): uId is string => Boolean(uId))

    if (targetUserIds.length === 0) {
      error('Gagal', 'Tidak ada data akun yang valid untuk dihapus.')
      return
    }

    try {
      const result = await dataService.deleteAccounts(targetUserIds, user)
      let msg = `${result.deletedCount} akun pengguna berhasil dihapus.`
      if (result.skippedCount > 0) {
        msg += ` (${result.skippedCount} akun Superadmin / akun aktif dilindungi dan dilewati)`
      }
      success('Hapus Massal Berhasil', msg)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses penghapusan massal akun'
      error('Gagal Hapus Massal', msg)
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
    if (selectedOrgFilter === 'unassigned') {
      if (m.organization_id) return false
    } else if (selectedOrgFilter === 'assigned') {
      if (!m.organization_id) return false
    } else if (selectedOrgFilter !== 'all' && m.organization_id !== selectedOrgFilter) {
      return false
    }
    const memLevel = m.level || 'admin'
    if (selectedLevelFilter !== 'all' && memLevel !== selectedLevelFilter) {
      return false
    }
    if (selectedRoleFilter !== 'all') {
      if (selectedRoleFilter === 'none' && m.role_id) return false
      if (selectedRoleFilter !== 'none' && m.role_id !== selectedRoleFilter) return false
    }
    const isActive = m.user?.status === 'active' && m.status === 'active'
    if (selectedStatusFilter === 'active' && !isActive) return false
    if (selectedStatusFilter === 'inactive' && isActive) return false

    return true
  })

  const columns: ColumnDef<OrganizationMembership>[] = [
    {
      key: 'user.name',
      label: 'Pengguna',
      sortable: true,
      render: (mem) => {
        const initial = (mem.user?.name || 'U').slice(0, 2).toUpperCase()
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-amber-500/20">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-fg text-sm truncate">{mem.user?.name}</span>
                {mem.user?.is_superadmin && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20">
                    Superadmin
                  </span>
                )}
              </div>
              <p className="text-xs text-fg-muted truncate">
                @{mem.user?.username || mem.user?.email?.split('@')[0]}
              </p>
              {mem.user?.holder_name && (
                <div className="mt-1 flex items-center gap-1 text-xs text-fg-muted">
                  <span>Pemegang:</span>
                  <span className="font-medium text-fg">{mem.user.holder_name}</span>
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'user.email',
      label: 'Email',
      render: (mem) => (
        <span className="text-xs font-mono text-fg-muted">{mem.user?.email || '-'}</span>
      ),
    },
    {
      key: 'organization',
      label: 'Jabatan / Penugasan',
      sortable: true,
      render: (mem) => {
        if (mem.organization_id && mem.organization) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {mem.organization.name}
            </span>
          )
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Belum Ditugaskan
          </span>
        )
      },
    },
    {
      key: 'level',
      label: 'Tingkat',
      sortable: true,
      render: (mem) => {
        if (!mem.organization_id) {
          return <Badge variant="gray">Pool</Badge>
        }
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
      label: 'Peran',
      render: (mem) => {
        if (!mem.organization_id) {
          return <span className="text-xs text-fg-muted">—</span>
        }
        return (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-surface-muted text-fg">
            {mem.role?.name || 'Pengurus'}
          </span>
        )
      },
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
      render: (mem) => {
        const canHandover = canManageAccountHandover(user, mem.user_id, mem.organization_id, organizations)
        return (
          <ActionMenu
            membership={mem}
            canHandover={canHandover}
            onEdit={handleEditAccount}
            onResetPassword={(m) => setResetMem(m)}
            onToggleStatus={(m) => setStatusToggleMem(m)}
            onMoveOrg={(m) => {
              setMoveOrgMem(m)
              setMoveOrgForm({
                targetOrgId: m.organization_id || organizations[0]?.id || '',
                targetRoleId: m.role_id || roles[0]?.id || 'role-admin-org',
                level: m.level || 'anggota',
              })
            }}
            onHandover={openHandoverModal}
            onDelete={(m) => setDeleteMem(m)}
            onSwitchAccount={async (m) => {
              if (m.user_id) {
                await switchPersona(m.user_id)
                success('Beralih Akun', `Anda sekarang login sebagai ${m.user?.name || 'Pengguna'}.`)
                navigate('/')
              }
            }}
          />
        )
      },
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
          onClick={() => navigate('/accounts/create')}
          className="shrink-0 self-start sm:self-auto"
        >
          <HeroPlus className="w-4 h-4 mr-1.5" />
          Buat Akun
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 sm:p-4 rounded-xl bg-surface ring-1 ring-line shadow-xs">
        {/* Mobile View: Search Bar + Filter Trigger Button (< sm) */}
        <div className="flex sm:hidden items-center gap-2">
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari akun..."
              className="text-base sm:text-xs min-h-[44px]"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className={`min-h-[44px] px-3.5 flex items-center justify-center gap-1.5 rounded-lg border transition cursor-pointer text-xs font-semibold shrink-0 ${
              (selectedOrgFilter !== 'all' || selectedLevelFilter !== 'all' || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all')
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
                : 'bg-surface border-line text-fg hover:bg-hover-bg'
            }`}
          >
            <HeroFunnel className="w-4 h-4" />
            <span>Filter</span>
            {(selectedOrgFilter !== 'all' || selectedLevelFilter !== 'all' || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>

        {/* Desktop View: Grid 5 Kolom (>= sm) */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Search */}
          <div className="lg:col-span-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari akun..."
              className="text-base sm:text-xs min-h-[44px] sm:min-h-[2.25rem]"
            />
          </div>

          {/* Org / Jabatan Filter */}
          <div>
            <Select
              value={selectedOrgFilter}
              onChange={(e) => setSelectedOrgFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Status Penugasan' },
                { value: 'assigned', label: '✓ Sudah Ditugaskan' },
                { value: 'unassigned', label: '○ Belum Ditugaskan' },
                ...organizations.map((o) => ({ value: o.id, label: `Jabatan: ${o.name}` })),
              ]}
              className="text-base sm:text-xs"
            />
          </div>

          {/* Level Filter */}
          <div>
            <Select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Tingkat' },
                { value: 'admin', label: 'Admin Jabatan' },
                { value: 'anggota', label: 'Anggota / Staf' },
              ]}
              className="text-base sm:text-xs"
            />
          </div>

          {/* Role Filter */}
          <div>
            <Select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Peran' },
                { value: 'none', label: 'Tanpa Peran (Unassigned)' },
                ...roles.map((r) => ({ value: r.id, label: r.name })),
              ]}
              className="text-base sm:text-xs"
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
              className="text-base sm:text-xs"
            />
          </div>
        </div>

        {/* Active Filter Chips / Reset Indicator on Mobile */}
        {(selectedOrgFilter !== 'all' || selectedLevelFilter !== 'all' || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all') && (
          <div className="flex sm:hidden items-center justify-between pt-2.5 mt-2.5 border-t border-line text-xs">
            <span className="text-fg-muted">Filter aktif diterapkan</span>
            <button
              type="button"
              onClick={() => {
                setSelectedOrgFilter('all')
                setSelectedLevelFilter('all')
                setSelectedRoleFilter('all')
                setSelectedStatusFilter('all')
              }}
              className="text-primary-600 dark:text-primary-400 font-semibold hover:underline cursor-pointer"
            >
              Reset Semua
            </button>
          </div>
        )}
      </div>

      {/* iOS Mobile Filter Sheet Modal */}
      {isMobileFiltersOpen && (
        <Modal
          isOpen={isMobileFiltersOpen}
          onClose={() => setIsMobileFiltersOpen(false)}
          title="Filter Akun Pengguna"
          size="sm"
          footer={
            <div className="w-full flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedOrgFilter('all')
                  setSelectedLevelFilter('all')
                  setSelectedRoleFilter('all')
                  setSelectedStatusFilter('all')
                }}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsMobileFiltersOpen(false)}
              >
                Terapkan
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">Penugasan Jabatan</label>
              <Select
                value={selectedOrgFilter}
                onChange={(e) => setSelectedOrgFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua Status Penugasan' },
                  { value: 'assigned', label: '✓ Sudah Ditugaskan' },
                  { value: 'unassigned', label: '○ Belum Ditugaskan' },
                  ...organizations.map((o) => ({ value: o.id, label: `Jabatan: ${o.name}` })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">Tingkat Penugasan</label>
              <Select
                value={selectedLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua Tingkat' },
                  { value: 'admin', label: 'Admin Jabatan' },
                  { value: 'anggota', label: 'Anggota / Staf' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">Peran Akses</label>
              <Select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua Peran' },
                  { value: 'none', label: 'Tanpa Peran (Unassigned)' },
                  ...roles.map((r) => ({ value: r.id, label: r.name })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">Status Akun</label>
              <Select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua Status' },
                  { value: 'active', label: 'Hanya Aktif' },
                  { value: 'inactive', label: 'Hanya Nonaktif' },
                ]}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredMemberships}
        isLoading={isLoading}
        searchPlaceholder="Filter akun..."
        searchKey="user.name"
        onBulkDelete={handleBulkDeleteAccounts}
        renderCard={(mem, isSelected, onSelect, isSelectionMode) => {
          const initial = (mem.user?.name || 'U').slice(0, 2).toUpperCase()
          const isActive = mem.user?.status === 'active' && mem.status === 'active'
          const isAdm = (mem.level || 'admin') === 'admin'

          return (
            <div
              className={cn(
                'p-4 rounded-xl bg-surface border transition-colors space-y-3',
                isSelected ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500' : 'border-line shadow-xs'
              )}
            >
              {/* Top: Checkbox (saat mode seleksi), Avatar, Name, Username, and Action Menu */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {isSelectionMode && (
                    <div className="shrink-0 pt-0.5">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => onSelect(e.target.checked)}
                        aria-label={`Pilih akun ${mem.user?.name}`}
                      />
                    </div>
                  )}
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
                    canHandover={canManageAccountHandover(user, mem.user_id, mem.organization_id, organizations)}
                    onEdit={handleEditAccount}
                    onResetPassword={(m) => setResetMem(m)}
                    onToggleStatus={(m) => setStatusToggleMem(m)}
                    onMoveOrg={(m) => {
                      setMoveOrgMem(m)
                      setMoveOrgForm({
                        targetOrgId: m.organization_id || organizations[0]?.id || '',
                        targetRoleId: m.role_id || roles[0]?.id || 'role-admin-org',
                        level: m.level || 'anggota',
                      })
                    }}
                    onHandover={openHandoverModal}
                    onDelete={(m) => setDeleteMem(m)}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="text-xs font-mono text-fg-muted truncate">
                {mem.user?.email || '-'}
              </div>

              {/* Status Badge Penugasan */}
              <div className="pt-1">
                {mem.organization_id && mem.organization ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Ditugaskan: {mem.organization.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Belum Ditugaskan
                  </span>
                )}
              </div>

              {/* Pemegang Akun Mobile Display */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-line/50">
                <span className="text-fg-muted">Pemegang (Holder):</span>
                <span className="font-semibold text-fg">
                  {mem.user?.holder_name || <span className="italic text-fg-muted font-normal">Belum ditunjuk</span>}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-line-divider" />

              {/* Bottom Info: Organization, Role/Level, Status */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-fg-muted">
                    <span>{mem.organization_id ? (isAdm ? 'Admin' : 'Anggota') : 'Pool Akun'}</span>
                    {mem.organization_id && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-fg">{mem.role?.name || 'Pengurus'}</span>
                      </>
                    )}
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



      {/* Credential Handover Card Modal */}
      {credentialCardData && (
        <Modal
          isOpen={isCredentialModalOpen}
          onClose={() => setIsCredentialModalOpen(false)}
          title="Kredensial Akun"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300">
              Salin informasi di bawah untuk diserahkan langsung ke pengguna via pesan instan.
            </div>

            <div className="p-4 rounded-xl bg-surface-muted border border-line font-mono text-xs text-fg space-y-2 select-all">
              <p className="font-bold text-amber-600 dark:text-amber-400 mb-2">
                *AKUN AKSES SISTEM ORGANISASI*
              </p>
              <p>Halo *{credentialCardData.name}*, berikut akun akses Anda:</p>
              <p className="pt-1">🔗 Tautan Login : {window.location.origin}/login</p>
              <p>🏢 Organisasi   : {credentialCardData.organizationName}</p>
              <p>🔰 Tingkat / Peran : {credentialCardData.level} - {credentialCardData.roleName}</p>
              <p>👤 Username     : {credentialCardData.username || credentialCardData.email}</p>
              <p>🔑 Kata Sandi   : {credentialCardData.password}</p>
              <p className="pt-2 text-xs text-fg-muted italic">
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

      {/* Reset Password Confirmation Modal - Aligned with UI_CONSISTENCY.md */}
      {resetMem && (
        <Modal
          isOpen={!!resetMem}
          onClose={() => setResetMem(null)}
          title="Konfirmasi Reset Kata Sandi"
          description={`Reset kata sandi untuk akun pengguna ${resetMem.user?.name}.`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button type="button" variant="secondary" onClick={() => setResetMem(null)}>
                Batal
              </Button>
              <Button type="button" variant="danger" onClick={handleConfirmResetPassword}>
                <HeroKey className="w-4 h-4 mr-1.5" />
                Reset & Tampilkan Sandi
              </Button>
            </div>
          }
        >
          <p className="text-xs text-fg leading-relaxed">
            Sistem akan menerbitkan kata sandi acak baru dan mewajibkan pengguna memperbaruinya saat login berikutnya.
          </p>
        </Modal>
      )}

      {/* Toggle Status Confirmation Modal - Aligned with UI_CONSISTENCY.md */}
      {statusToggleMem && (
        <Modal
          isOpen={!!statusToggleMem}
          onClose={() => setStatusToggleMem(null)}
          title={statusToggleMem.status === 'active' ? 'Nonaktifkan Akun Pengguna' : 'Aktifkan Kembali Akun'}
          description={`Ubah status operasional akun untuk ${statusToggleMem.user?.name}.`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button type="button" variant="secondary" onClick={() => setStatusToggleMem(null)}>
                Batal
              </Button>
              <Button
                type="button"
                variant={statusToggleMem.status === 'active' ? 'danger' : 'primary'}
                onClick={handleConfirmToggleStatus}
              >
                {statusToggleMem.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
              </Button>
            </div>
          }
        >
          <p className="text-xs text-fg leading-relaxed">
            {statusToggleMem.status === 'active' ? (
              <>
                Pengguna tidak akan dapat login ke dalam sistem, namun seluruh data historis dan riwayat penugasan tetap aman tersimpan.
              </>
            ) : (
              <>
                Akses login akun pengguna akan segera dipulihkan sehingga dapat kembali mengakses sistem.
              </>
            )}
          </p>
        </Modal>
      )}

      {/* Move / Assign Organization Modal - Aligned with UI_CONSISTENCY.md */}
      {moveOrgMem && (
        <Modal
          isOpen={!!moveOrgMem}
          onClose={() => setMoveOrgMem(null)}
          title={
            moveOrgMem.organization_id
              ? `Pindah Penugasan Jabatan: ${moveOrgMem.user?.name}`
              : `Tugaskan ke Jabatan: ${moveOrgMem.user?.name}`
          }
          description={
            moveOrgMem.organization_id
              ? 'Pindahkan penugasan akun ini ke jabatan lain dan sesuaikan peran barunya.'
              : 'Tugaskan akun ini ke posisi jabatan dan tentukan peran serta hak aksesnya.'
          }
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button type="button" variant="secondary" onClick={() => setMoveOrgMem(null)}>
                Batal
              </Button>
              <Button type="button" variant="primary" onClick={handleConfirmMoveOrg}>
                <HeroCheck className="w-4 h-4 mr-1.5" />
                {moveOrgMem.organization_id ? 'Pindahkan Penugasan' : 'Tugaskan ke Jabatan'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Select
              label={moveOrgMem.organization_id ? 'Posisi Jabatan Tujuan' : 'Pilih Posisi Jabatan Penugasan'}
              required
              value={moveOrgForm.targetOrgId}
              onValueChange={(val) => setMoveOrgForm({ ...moveOrgForm, targetOrgId: val })}
              options={organizations.map((o) => ({ value: o.id, label: o.name }))}
              helperText="Posisi jabatan penempatan akun pengguna ini."
            />

            <Select
              label="Tingkat Penugasan Baru"
              required
              value={moveOrgForm.level}
              onValueChange={(val) => setMoveOrgForm({ ...moveOrgForm, level: val as 'admin' | 'anggota' })}
              options={[
                { value: 'admin', label: 'Admin Jabatan (Hak Penuh Pengelolaan)' },
                { value: 'anggota', label: 'Anggota / Staf Pelaksana' },
              ]}
              helperText="Tingkat wewenang operasional pada jabatan yang dipilih."
            />

            <Select
              label="Peran & Hak Akses Baru"
              required
              value={moveOrgForm.targetRoleId}
              onValueChange={(val) => setMoveOrgForm({ ...moveOrgForm, targetRoleId: val })}
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              helperText="Izin dan peran otorisasi dalam jabatan penugasan."
            />
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal - Aligned with UI_CONSISTENCY.md */}
      {deleteMem && (
        <Modal
          isOpen={!!deleteMem}
          onClose={() => setDeleteMem(null)}
          title="Hapus Akun Pengguna"
          description={`Konfirmasi penghapusan akun ${deleteMem.user?.name}.`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button type="button" variant="secondary" onClick={() => setDeleteMem(null)}>
                Batal
              </Button>
              <Button type="button" variant="danger" onClick={handleConfirmDeleteSingle}>
                <HeroTrash className="w-4 h-4 mr-1.5" />
                Hapus Akun
              </Button>
            </div>
          }
        >
          <p className="text-xs text-fg leading-relaxed">
            Akun pengguna ini beserta seluruh izin penugasannya akan dihapus secara permanen dari sistem.
          </p>
        </Modal>
      )}

      {/* Handover Modal (Stage 5) */}
      {handoverMem && (
        <Modal
          isOpen={!!handoverMem}
          onClose={() => setHandoverMem(null)}
          title="Serah Terima Pemegang Akun (Handover)"
          size="lg"
        >
          <div className="space-y-5">
            {/* Box Identitas Akun Unit Permanen */}
            <div className="p-3.5 rounded-xl bg-surface-muted border border-line space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-fg uppercase tracking-wider">Identitas Akun Unit</span>
                <span className="text-[10px] font-mono bg-surface px-2 py-0.5 rounded border border-line text-fg-muted">
                  Permanen Terhadap Unit
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-fg-muted block">Akun Jabatan:</span>
                  <span className="font-semibold text-fg">{handoverMem.user?.name}</span>
                </div>
                <div>
                  <span className="text-fg-muted block">Jabatan Terdaftar:</span>
                  <span className="font-semibold text-fg">{handoverMem.organization?.name}</span>
                </div>
                <div>
                  <span className="text-fg-muted block">Email Resmi:</span>
                  <span className="font-mono text-fg">{handoverMem.user?.email}</span>
                </div>
              </div>
            </div>

            {/* Pemegang Saat Ini */}
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between text-xs">
              <div>
                <span className="text-fg-muted block text-[11px]">Pemegang Saat Ini (Current Holder):</span>
                <span className="font-bold text-fg text-sm">
                  {handoverMem.user?.holder_name || <span className="italic text-fg-muted">Belum ada pemegang aktif</span>}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {handoverMem.user?.holder_name ? 'Aktif Menjabat' : 'Perlu Penunjukan'}
              </span>
            </div>

            {/* Formulir Pergantian Pemegang */}
            <form noValidate onSubmit={handleTriggerConfirmHandover} className="space-y-4 pt-2 border-t border-line">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-fg">Pilih / Daftarkan Pemegang Baru</label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setHandoverMode('select')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      handoverMode === 'select'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-surface-muted text-fg-muted hover:text-fg'
                    }`}
                  >
                    Person Terdaftar
                  </button>
                  <button
                    type="button"
                    onClick={() => setHandoverMode('new')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      handoverMode === 'new'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-surface-muted text-fg-muted hover:text-fg'
                    }`}
                  >
                    + Person Baru
                  </button>
                </div>
              </div>

              {handoverMode === 'select' ? (
                <div>
                  <label className="block text-xs font-medium text-fg mb-1">
                    Pilih Person dari Master Person Terdaftar
                  </label>
                  {availablePersons.length > 0 ? (
                    <Select
                      value={selectedPersonId}
                      onChange={(e) => setSelectedPersonId(e.target.value)}
                      options={[
                        { value: '', label: '-- Pilih Person Pemegang Baru --' },
                        ...availablePersons.map((p) => ({
                          value: p.id,
                          label: `${p.name}${p.identifier ? ` (${p.identifier})` : ''}${p.phone ? ` - ${p.phone}` : ''}`,
                        })),
                      ]}
                    />
                  ) : (
                    <div className="p-3 text-xs text-fg-muted bg-surface-muted rounded-lg border border-line">
                      Tidak ada person terdaftar lainnya. Silakan gunakan tombol <strong>+ Person Baru</strong> di atas untuk mendaftarkan manusia baru.
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-surface-muted/50 border border-line">
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Nama Lengkap Person *</label>
                    <Input
                      value={newPersonForm.name}
                      onChange={(e) => setNewPersonForm({ ...newPersonForm, name: e.target.value })}
                      placeholder="e.g. Ust. Ahmad Al-Farisi"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">NIK / NIAT / Identitas Santri</label>
                    <Input
                      value={newPersonForm.identifier}
                      onChange={(e) => setNewPersonForm({ ...newPersonForm, identifier: e.target.value })}
                      placeholder="e.g. 3501012345670001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Nomor Telepon / WhatsApp</label>
                    <Input
                      value={newPersonForm.phone}
                      onChange={(e) => setNewPersonForm({ ...newPersonForm, phone: e.target.value })}
                      placeholder="e.g. 081234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg mb-1">Email Pribadi Person</label>
                    <Input
                      type="email"
                      value={newPersonForm.email}
                      onChange={(e) => setNewPersonForm({ ...newPersonForm, email: e.target.value })}
                      placeholder="e.g. ahmad.farisi@gmail.com"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <DatePicker
                    label="Tanggal Mulai Menjabat"
                    required
                    value={periodStart}
                    onChange={(val) => setPeriodStart(val)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg mb-1">Nomor SK / Catatan Serah Terima</label>
                  <Input
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="e.g. SK Pengangkatan No. 12/SK/PP/2026"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button type="button" variant="secondary" onClick={() => setHandoverMem(null)}>
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  <HeroArrowPath className="w-4 h-4 mr-1.5" />
                  Lanjutkan Serah Terima
                </Button>
              </div>
            </form>

            {/* Riwayat Pemegang Akun (Account Holder History) */}
            <div className="space-y-2 pt-2 border-t border-line">
              <h3 className="text-xs font-bold text-fg uppercase tracking-wider">
                Riwayat Pemegang Akun (Holder History)
              </h3>
              {handoverHistories.length > 0 ? (
                <>
                  {/* Mobile View: iOS Grouped Inset Cards (< sm) */}
                  <div className="sm:hidden space-y-2 max-h-52 overflow-y-auto pr-0.5">
                    {handoverHistories.map((h) => {
                      const isCurrentActive = !h.period_end || h.period_end === ''
                      return (
                        <div
                          key={h.id}
                          className="p-3 rounded-xl bg-surface-muted border border-line space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-fg text-xs">{h.person_name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCurrentActive
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-surface text-fg-muted border border-line'
                              }`}
                            >
                              {isCurrentActive ? 'Aktif' : 'Purna Tugas'}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-fg-muted flex items-center justify-between">
                            <span>Masa Jabatan:</span>
                            <span className="font-medium text-fg">{h.period_start} → {h.period_end || 'Sekarang'}</span>
                          </div>
                          {h.handover_notes && (
                            <div className="text-[11px] text-fg-muted border-t border-line/60 pt-1 mt-1">
                              <span className="font-medium text-fg">SK/Catatan:</span> {h.handover_notes}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Desktop View: Tabular View (>= sm) */}
                  <div className="hidden sm:block max-h-48 overflow-y-auto rounded-lg border border-line">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-muted border-b border-line text-fg-muted font-medium">
                        <tr>
                          <th className="py-2 px-3">Nama Pemegang</th>
                          <th className="py-2 px-3">Periode Menjabat</th>
                          <th className="py-2 px-3">Catatan / SK</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {handoverHistories.map((h) => {
                          const isCurrentActive = !h.period_end || h.period_end === ''
                          return (
                            <tr key={h.id} className="hover:bg-hover-bg">
                              <td className="py-2 px-3 font-semibold text-fg">{h.person_name}</td>
                              <td className="py-2 px-3 font-mono text-[11px] text-fg-muted">
                                {h.period_start} → {h.period_end || 'Sekarang'}
                              </td>
                              <td className="py-2 px-3 text-fg-muted text-[11px]">{h.handover_notes || '-'}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isCurrentActive
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-surface-muted text-fg-muted'
                                  }`}
                                >
                                  {isCurrentActive ? 'Aktif' : 'Purna Tugas'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-xs text-fg-muted italic">Belum ada riwayat pergantian pemegang untuk akun ini.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal for Handover (Stage 5) */}
      {isConfirmHandoverOpen && handoverMem && (
        <Modal
          isOpen={isConfirmHandoverOpen}
          onClose={() => setIsConfirmHandoverOpen(false)}
          title="Konfirmasi Serah Terima Pemegang Akun"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs space-y-1">
              <p className="font-semibold">Perhatian Keamanan & Integritas Data:</p>
              <p className="leading-relaxed">
                Anda akan mengalihkan tanggung jawab pemegang akun <strong>{handoverMem.user?.name}</strong>.
                Seluruh data Program Kerja, Agenda, Keuangan, dan Riwayat Approval yang dibuat sebelumnya
                <strong> TETAP UTUH</strong> dan tidak akan berpindah kepemilikan.
              </p>
            </div>

            <div className="text-xs space-y-1 text-fg">
              <p>
                <strong>Akun Unit:</strong> {handoverMem.user?.name} ({handoverMem.organization?.name})
              </p>
              <p>
                <strong>Pemegang Baru:</strong>{' '}
                {handoverMode === 'select'
                  ? availablePersons.find((p) => p.id === selectedPersonId)?.name
                  : newPersonForm.name}
              </p>
              <p>
                <strong>Tanggal Efektif:</strong> {periodStart}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsConfirmHandoverOpen(false)}
                disabled={isSubmittingHandover}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleExecuteHandover}
                disabled={isSubmittingHandover}
              >
                {isSubmittingHandover ? 'Memproses...' : 'Ya, Konfirmasi Serah Terima'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  )
}
