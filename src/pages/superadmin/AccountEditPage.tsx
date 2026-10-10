import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { RoleEntity, User, OrganizationMembership, Personnel, Organization } from '@/types/database'
import {
  HeroUser,
  HeroShieldCheck,
  HeroArrowLeft,
  HeroCheck,
  HeroArrowPath,
  HeroEye,
  HeroEyeSlash,
  HeroClipboardDocument,
  HeroBriefcase,
  HeroSquares2X2,
} from '@/components/icons/HeroIcons'

interface FormState {
  name: string
  username: string
  email: string
  password: string
  status: 'active' | 'inactive'

  // Posisi Jabatan
  personnel_id: string
  new_position_name: string
  position_mode: 'existing' | 'new'

  // Peran & Hak Akses
  level: 'admin' | 'anggota'
  role_id: string
}

interface CredentialCardData {
  name: string
  username: string
  email: string
  password?: string
  positionName: string
  level: string
  roleName: string
}

const generateRandomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let rand = ''
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `Akses${rand}#`
}

export const AccountEditPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { success, error } = useToast()

  const [roles, setRoles] = useState<RoleEntity[]>([])
  const [personnels, setPersonnels] = useState<Personnel[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [membership, setMembership] = useState<OrganizationMembership | null>(null)
  const [targetUser, setTargetUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Credential Handover Modal
  const [credentialCardData, setCredentialCardData] = useState<CredentialCardData | null>(null)
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false)

  const [formData, setFormData] = useState<FormState>({
    name: '',
    username: '',
    email: '',
    password: '',
    status: 'active',
    personnel_id: '',
    new_position_name: '',
    position_mode: 'existing',
    level: 'admin',
    role_id: '',
  })

  const loadData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      // Pastikan cache memory disinkronkan dengan data paling mutakhir dari menu Jabatan
      dataService.reloadSharedStructuralCollections()

      const [allUsers, mems, rls, allPrs, orgs] = await Promise.all([
        dataService.getUsers(),
        dataService.getMemberships(undefined, user),
        dataService.getRoles(undefined, user),
        dataService.getPersonnels(undefined, undefined, user),
        dataService.getOrganizations(user),
      ])

      setRoles(rls)
      setPersonnels(allPrs)
      setOrganizations(orgs)

      // Cari apakah id adalah membership id atau user id
      let foundMem = mems.find((m) => m.id === id || m.user_id === id)
      let foundUser: User | undefined = undefined

      if (foundMem) {
        foundUser = allUsers.find((u) => u.id === foundMem?.user_id) || foundMem.user
      } else {
        foundUser = allUsers.find((u) => u.id === id)
      }

      if (!foundUser) {
        error('Tidak Ditemukan', 'Data akun pengguna tidak ditemukan.')
        navigate('/accounts')
        return
      }

      setMembership(foundMem || null)
      setTargetUser(foundUser)

      // Cari jabatan yang sedang diemban oleh user ini
      const userPrs = allPrs.find((p) => p.user_id === foundUser?.id)

      const userLevel = (foundMem?.level as 'admin' | 'anggota') || (foundUser.role === 'admin' ? 'admin' : 'anggota')
      const userRoleId = foundMem?.role_id || rls[0]?.id || ''

      setFormData({
        name: foundUser.name || '',
        username: foundUser.username || '',
        email: foundUser.email || '',
        password: '',
        status: (foundMem?.status as 'active' | 'inactive') || (foundUser.status as 'active' | 'inactive') || 'active',
        personnel_id: userPrs?.id || (allPrs.length > 0 ? allPrs[0].id : ''),
        new_position_name: '',
        position_mode: allPrs.length > 0 ? 'existing' : 'new',
        level: userLevel,
        role_id: userRoleId,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data akun pengguna'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [id, user, error, navigate])

  useEffect(() => {
    loadData()

    const handleSync = () => {
      loadData()
    }

    let channel: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('filament_structural_sync')
        channel.onmessage = (event) => {
          if (event.data?.type === 'structural_change') {
            handleSync()
          }
        }
      }
    } catch {}

    const handleStorageEvent = (event: StorageEvent) => {
      if (
        event.key &&
        (event.key.includes('organizations') ||
          event.key.includes('personnels') ||
          event.key.includes('roles'))
      ) {
        handleSync()
      }
    }

    const handleCustomWindowSync = () => {
      handleSync()
    }

    window.addEventListener('storage', handleStorageEvent)
    window.addEventListener('filament_structural_change' as any, handleCustomWindowSync)

    return () => {
      if (channel) channel.close()
      window.removeEventListener('storage', handleStorageEvent)
      window.removeEventListener('filament_structural_change' as any, handleCustomWindowSync)
    }
  }, [loadData])

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleRandomizePassword = () => {
    const newPass = generateRandomPassword()
    setField('password', newPass)
    setShowPassword(true)
    success('Kata Sandi Baru Dibuat', 'Kata sandi acak baru berhasil disiapkan.')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.email.trim()) {
      error('Validasi Gagal', 'Nama lengkap dan Email akun wajib diisi.')
      return
    }

    if (!targetUser) return

    setIsSaving(true)
    try {
      const userUpdate: Partial<User> = {
        name: formData.name.trim(),
        username: formData.username.trim() || undefined,
        email: formData.email.trim(),
        status: formData.status,
        holder_name: formData.name.trim(),
      }

      if (formData.password.trim()) {
        userUpdate.password_hash = formData.password.trim()
        userUpdate.must_change_password = true
      }

      await dataService.updateUser(targetUser.id, userUpdate)

      // Update / Hubungkan Posisi Jabatan
      let finalPositionName = ''
      let fallbackOrgId = organizations[0]?.id || 'org-00000000-0000-0000-0000-000000000000'

      if (formData.position_mode === 'new' && formData.new_position_name.trim()) {
        const createdPrs = await dataService.createPersonnel(
          {
            position: formData.new_position_name.trim(),
            role_title: formData.new_position_name.trim(),
            name: formData.name.trim(),
            organization_id: fallbackOrgId,
            section_id: 'sec-pimpinan',
            node_type: 'jabatan',
            user_id: targetUser.id,
          },
          user
        )
        finalPositionName = createdPrs.position || formData.new_position_name.trim()
      } else if (formData.personnel_id) {
        const selectedPrs = personnels.find((p) => p.id === formData.personnel_id)
        finalPositionName = selectedPrs?.position || selectedPrs?.role_title || 'Jabatan Terpilih'
        if (selectedPrs?.organization_id) {
          fallbackOrgId = selectedPrs.organization_id
        }
        await dataService.updatePersonnel(
          formData.personnel_id,
          {
            user_id: targetUser.id,
            name: formData.name.trim(),
          },
          user
        )
      }

      // Update Keanggotaan & Peran RBAC
      if (membership && !membership.id.startsWith('unassigned-')) {
        await dataService.updateMembership(
          membership.id,
          {
            organization_id: membership.organization_id || fallbackOrgId,
            role_id: formData.role_id,
            level: formData.level,
            status: formData.status,
          },
          user
        )
      } else {
        await dataService.createMembership(
          {
            user_id: targetUser.id,
            organization_id: fallbackOrgId,
            role_id: formData.role_id || roles[0]?.id || 'role-admin-org',
            level: formData.level,
            status: formData.status,
          },
          user
        )
      }

      success('Akun Diperbarui', `Perubahan data akun "${formData.name}" berhasil disimpan.`)

      const selectedRole = roles.find((r) => r.id === formData.role_id)

      if (formData.password.trim()) {
        const credData: CredentialCardData = {
          name: formData.name.trim(),
          username: formData.username.trim() || formData.email.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          positionName: finalPositionName || 'Jabatan Bertugas',
          level: formData.level === 'admin' ? 'Admin Jabatan' : 'Staf Pelaksana',
          roleName: selectedRole?.name || 'Hak Akses Standar',
        }
        setCredentialCardData(credData)
        setIsCredentialModalOpen(true)
      } else {
        navigate('/accounts')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui akun'
      error('Gagal', msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyWhatsApp = (card: CredentialCardData) => {
    const text = `*PEMBARUAN AKUN AKSES JABATAN*
Halo *${card.name}*, berikut informasi akun akses terbaru Anda:

🔗 Tautan Login : ${window.location.origin}/login
💼 Jabatan      : ${card.positionName}
🔰 Hak Akses    : ${card.roleName} (${card.level})
👤 Username     : ${card.username || card.email}
${card.password ? `🔑 Kata Sandi Baru : ${card.password}` : ''}

*Catatan:* Simpan informasi kredensial ini dengan baik.`

    navigator.clipboard.writeText(text)
    success('Kredensial Disalin', 'Pesan siap dikirimkan melalui WhatsApp.')
  }

  const activeRole = roles.find((r) => r.id === formData.role_id)

  return (
    <PageContainer variant="form">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-0.5">
          <Breadcrumb
            items={[
              { label: 'Sistem', href: '/accounts' },
              { label: 'Akun Pengguna', href: '/accounts' },
              { label: 'Ubah Akun Jabatan' },
            ]}
          />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Ubah Akun Jabatan
          </h1>
          <p className="text-xs sm:text-sm text-fg-muted">
            Perbarui data pemegang akun, penugasan jabatan, serta peran hak aksesnya.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<HeroArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/accounts')}
          className="hidden sm:inline-flex shrink-0 self-start sm:self-auto"
        >
          Kembali ke Akun
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form noValidate onSubmit={handleSave} className="space-y-6 pb-24">
          <div className="space-y-6">
            {/* SECTION 1: KREDENSIAL & IDENTITAS AKUN */}
            <Section
              title="Identitas Akun Pengguna"
              description="Informasi pemegang akun dan kredensial login."
              icon={<HeroUser className="w-5 h-5 text-amber-500" />}
              columns={2}
            >
              <div>
                <Input
                  label="Nama Lengkap Pemegang Akun"
                  required
                  value={formData.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Nama Lengkap"
                />
              </div>

              <div>
                <Input
                  type="email"
                  label="Alamat Email Akun"
                  required
                  value={formData.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="email@pesantren.id"
                />
              </div>

              <div>
                <Input
                  label="Username Login"
                  value={formData.username}
                  onChange={(e) =>
                    setField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                  }
                  placeholder="username"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Select
                  label="Status Akun"
                  value={formData.status}
                  onValueChange={(val) => setField('status', val as 'active' | 'inactive')}
                  options={[
                    { value: 'active', label: 'Aktif (Dapat Login)' },
                    { value: 'inactive', label: 'Nonaktif (Ditangguhkan)' },
                  ]}
                />
              </div>

              <div className="col-span-full">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-fg">
                    Ganti Kata Sandi (Opsional)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleRandomizePassword}
                      className="p-1 rounded text-fg-muted hover:text-amber-500 hover:bg-hover-bg transition cursor-pointer"
                      title="Acak Sandi Baru"
                      aria-label="Acak Sandi Baru"
                    >
                      <HeroArrowPath className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded text-fg-muted hover:text-fg hover:bg-hover-bg transition cursor-pointer"
                      title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                      aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showPassword ? (
                        <HeroEyeSlash className="w-3.5 h-3.5" />
                      ) : (
                        <HeroEye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setField('password', e.target.value)}
                  placeholder="Kosongkan jika kata sandi tidak ingin diubah"
                  className="font-mono text-xs"
                />
              </div>
            </Section>

            {/* SECTION 2: PENETAPAN POSISI JABATAN */}
            <Section
              title="Posisi Jabatan"
              description="Amanah jabatan yang diemban oleh akun pengguna ini."
              icon={<HeroBriefcase className="w-5 h-5 text-amber-500" />}
              columns={1}
            >
              <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-muted ring-1 ring-line w-full sm:w-fit mb-4">
                <button
                  type="button"
                  onClick={() => setField('position_mode', 'existing')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    formData.position_mode === 'existing'
                      ? 'bg-surface text-fg shadow-xs ring-1 ring-line'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  Pilih Jabatan dari Bagan
                </button>
                <button
                  type="button"
                  onClick={() => setField('position_mode', 'new')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    formData.position_mode === 'new'
                      ? 'bg-surface text-fg shadow-xs ring-1 ring-line'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  + Buat Posisi Jabatan Baru
                </button>
              </div>

              {formData.position_mode === 'existing' ? (
                <div className="space-y-4">
                  <Select
                    label="Pilih Posisi Jabatan"
                    value={formData.personnel_id}
                    onValueChange={(val) => setField('personnel_id', val)}
                    options={personnels.map((p) => ({
                      value: p.id,
                      label: `${p.position || p.role_title || 'Jabatan'} ${
                        p.user?.name ? `(Saat ini: ${p.user.name})` : '(Posisi Kosong)'
                      }`,
                    }))}
                    helperText="Pilih posisi amanah jabatan yang diemban."
                  />

                  {(() => {
                    const selected = personnels.find((p) => p.id === formData.personnel_id)
                    if (!selected) return null
                    return (
                      <div className="p-4 rounded-xl bg-surface-muted border border-line space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-fg uppercase tracking-wider">
                            Informasi Jabatan Terpilih
                          </span>
                          <Badge variant="primary">
                            {selected.node_type ? selected.node_type.toUpperCase() : 'JABATAN'}
                          </Badge>
                        </div>
                        <p className="text-xs text-fg">
                          <strong className="text-fg">Jabatan:</strong>{' '}
                          {selected.position || selected.role_title || '-'}
                        </p>
                        {selected.tupoksi && (
                          <p className="text-xs text-fg-muted line-clamp-2">
                            <strong className="text-fg">Tupoksi:</strong> {selected.tupoksi}
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    label="Nama Posisi Jabatan Baru"
                    required
                    value={formData.new_position_name}
                    onChange={(e) => setField('new_position_name', e.target.value)}
                    placeholder="Contoh: Kepala Bidang Sarana & Prasarana"
                    helperText="Jabatan baru akan langsung dibuat dan dihubungkan ke akun ini."
                  />
                </div>
              )}
            </Section>

            {/* SECTION 3: PERAN & HAK AKSES */}
            <Section
              title="Peran & Hak Akses (RBAC)"
              description="Atur izin operasional dan tingkat wewenang bagi akun ini."
              icon={<HeroShieldCheck className="w-5 h-5 text-amber-500" />}
              columns={2}
            >
              <div>
                <Select
                  label="Tingkat Wewenang"
                  required
                  value={formData.level}
                  onValueChange={(val) => setField('level', val as 'admin' | 'anggota')}
                  options={[
                    { value: 'admin', label: 'Admin Jabatan (Hak Penuh Pengelolaan)' },
                    { value: 'anggota', label: 'Anggota / Staf Pelaksana (Operasional Terbatas)' },
                  ]}
                />
              </div>

              <div>
                <Select
                  label="Peran & Hak Akses"
                  required
                  value={formData.role_id}
                  onValueChange={(val) => setField('role_id', val)}
                  options={roles.map((r) => ({
                    value: r.id,
                    label: `${r.name} (${r.permissions?.length || 0} izin)`,
                  }))}
                />
              </div>

              {/* Rincian Izin */}
              <div className="col-span-full p-4 rounded-xl bg-surface-muted border border-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg uppercase tracking-wider flex items-center gap-1.5">
                    <HeroSquares2X2 className="w-4 h-4 text-amber-500" />
                    Cakupan Izin: {activeRole?.name || 'Peran'}
                  </span>
                  <Badge variant="emerald">{activeRole?.permissions?.length || 0} Izin Aktif</Badge>
                </div>
                <p className="text-xs text-fg-muted">{activeRole?.description}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeRole?.permissions?.slice(0, 10).map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface border border-line text-fg"
                    >
                      {p}
                    </span>
                  ))}
                  {(activeRole?.permissions?.length || 0) > 10 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600">
                      + {(activeRole?.permissions?.length || 0) - 10} lainnya
                    </span>
                  )}
                </div>
              </div>
            </Section>
          </div>

          {/* Sticky Footer Action Bar */}
          <div className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line py-3 px-4 sm:px-6 lg:px-8 shadow-lg">
            <div className="max-w-7xl mx-auto flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/accounts')}
                className="w-full sm:w-auto justify-center"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                className="w-full sm:w-auto justify-center font-semibold"
              >
                <HeroCheck className="w-4 h-4 mr-1.5" />
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Akun'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Credential Handover Modal (Jika kata sandi diubah) */}
      {credentialCardData && (
        <Modal
          isOpen={isCredentialModalOpen}
          onClose={() => {
            setIsCredentialModalOpen(false)
            navigate('/accounts')
          }}
          title="Kredensial Baru Berhasil Disimpan"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-muted border border-line font-mono text-xs text-fg space-y-2 select-all">
              <p className="font-bold text-amber-600 dark:text-amber-400 mb-2">
                *PEMBARUAN AKUN AKSES JABATAN*
              </p>
              <p>Halo *{credentialCardData.name}*, berikut informasi akses terbaru Anda:</p>
              <p className="pt-1">🔗 Tautan Login : {window.location.origin}/login</p>
              <p>💼 Jabatan      : {credentialCardData.positionName}</p>
              <p>🔰 Hak Akses    : {credentialCardData.roleName} ({credentialCardData.level})</p>
              <p>👤 Username     : {credentialCardData.username || credentialCardData.email}</p>
              {credentialCardData.password && (
                <p>🔑 Kata Sandi Baru : {credentialCardData.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsCredentialModalOpen(false)
                  navigate('/accounts')
                }}
              >
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
    </PageContainer>
  )
}
