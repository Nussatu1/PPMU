import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
import type { RoleEntity, Personnel, Organization } from '@/types/database'
import {
  HeroUser,
  HeroShieldCheck,
  HeroArrowLeft,
  HeroArrowRight,
  HeroCheck,
  HeroPlus,
  HeroArrowPath,
  HeroEye,
  HeroEyeSlash,
  HeroClipboardDocument,
  HeroBriefcase,
  HeroSquares2X2,
} from '@/components/icons/HeroIcons'

interface FormState {
  // Step 1: Identitas Akun
  name: string
  username: string
  email: string
  password: string
  status: 'active' | 'inactive'

  // Step 2: Penugasan Jabatan (Opsional)
  position_mode: 'existing' | 'new' | 'none'
  personnel_id: string
  new_position_name: string
  tupoksi: string

  // Step 3: Peran & Hak Akses (RBAC)
  role_id: string
  level: 'admin' | 'anggota'
}

interface CredentialCardData {
  name: string
  username: string
  email: string
  password: string
  positionName: string
  level: string
  roleName: string
  permissionsCount: number
}

const generateRandomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let rand = ''
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `Akses${rand}#`
}

export const AccountCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success, error } = useToast()

  // Multi-step state: 1 -> 2 -> 3
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Data states
  const [personnels, setPersonnels] = useState<Personnel[]>([])
  const [roles, setRoles] = useState<RoleEntity[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [usernameTouched, setUsernameTouched] = useState(false)

  // Credential Handover Modal
  const [credentialCardData, setCredentialCardData] = useState<CredentialCardData | null>(null)
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false)

  const [formData, setFormData] = useState<FormState>({
    name: '',
    username: '',
    email: '',
    password: generateRandomPassword(),
    status: 'active',

    position_mode: 'existing',
    personnel_id: '',
    new_position_name: '',
    tupoksi: '',

    role_id: '',
    level: 'admin',
  })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Pastikan cache memory disinkronkan dengan data paling mutakhir dari menu Jabatan
      dataService.reloadSharedStructuralCollections()

      const [allPersonnels, rls, orgs] = await Promise.all([
        dataService.getPersonnels(undefined, undefined, user),
        dataService.getRoles(undefined, user),
        dataService.getOrganizations(user),
      ])
      setPersonnels(allPersonnels)
      setRoles(rls)
      setOrganizations(orgs)

      if (rls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          role_id: prev.role_id || rls[0].id,
        }))
      }
      if (allPersonnels.length > 0) {
        setFormData((prev) => ({
          ...prev,
          personnel_id: prev.personnel_id || allPersonnels[0].id,
        }))
      } else {
        setFormData((prev) => ({
          ...prev,
          position_mode: 'new',
        }))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data pendukung'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [user, error])

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

  const handleNameChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      name: val,
      username: usernameTouched ? prev.username : val.toLowerCase().replace(/[^a-z0-9]/g, ''),
    }))
  }

  const handleRandomizePassword = () => {
    const newPass = generateRandomPassword()
    setField('password', newPass)
    setShowPassword(true)
    success('Kata Sandi Dibuat', 'Kata sandi acak baru berhasil diterapkan.')
  }

  // Validasi Step 1
  const validateStep1 = (): boolean => {
    if (!formData.name.trim()) {
      error('Validasi Gagal', 'Nama lengkap akun wajib diisi.')
      return false
    }
    if (!formData.email.trim()) {
      error('Validasi Gagal', 'Alamat email akun wajib diisi.')
      return false
    }
    if (!formData.password.trim()) {
      error('Validasi Gagal', 'Kata sandi akun wajib diisi.')
      return false
    }
    return true
  }

  // Validasi Step 2 (Penempatan Opsional)
  const validateStep2 = (): boolean => {
    if (formData.position_mode === 'none') {
      return true
    }
    if (formData.position_mode === 'existing') {
      if (!formData.personnel_id) {
        error('Validasi Gagal', 'Silakan pilih jabatan penugasan untuk akun ini atau pilih "Belum Ditempatkan".')
        return false
      }
    } else {
      if (!formData.new_position_name.trim()) {
        error('Validasi Gagal', 'Nama posisi jabatan baru wajib diisi.')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2)
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3)
    }
  }

  const handlePrev = () => {
    if (currentStep === 3) setCurrentStep(2)
    else if (currentStep === 2) setCurrentStep(1)
  }

  // Save execution
  const handleSave = async (e?: React.FormEvent, andCreateAnother = false) => {
    if (e) e.preventDefault()

    if (!validateStep1() || !validateStep2()) return
    if (!formData.role_id) {
      error('Validasi Gagal', 'Silakan pilih peran dan hak akses.')
      return
    }

    setIsSaving(true)
    try {
      const chosenPassword = formData.password.trim() || generateRandomPassword()
      const rawUsername = formData.username.trim() || formData.email.split('@')[0]
      const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_.]/g, '')

      // 1. Tentukan nama jabatan & id personel terkait (Opsional)
      let targetPersonnelId = formData.position_mode === 'none' ? '' : formData.personnel_id
      let finalPositionName = 'Belum Ditempatkan (Standby)'
      let fallbackOrgId = organizations[0]?.id || 'org-00000000-0000-0000-0000-000000000000'

      if (formData.position_mode === 'new') {
        const createdPrs = await dataService.createPersonnel(
          {
            position: formData.new_position_name.trim(),
            role_title: formData.new_position_name.trim(),
            name: formData.name.trim(),
            tupoksi: formData.tupoksi.trim() || undefined,
            organization_id: fallbackOrgId,
            section_id: 'sec-pimpinan',
            node_type: 'jabatan',
          },
          user
        )
        targetPersonnelId = createdPrs.id
        finalPositionName = createdPrs.position || formData.new_position_name.trim()
      } else if (formData.position_mode === 'existing') {
        const selectedPrs = personnels.find((p) => p.id === formData.personnel_id)
        finalPositionName = selectedPrs?.position || selectedPrs?.role_title || 'Jabatan Terpilih'
        if (selectedPrs?.organization_id) {
          fallbackOrgId = selectedPrs.organization_id
        }
      }

      // 2. Buat Akun Pengguna Baru
      const newUser = await dataService.createUser({
        name: formData.name.trim(),
        username: cleanUsername,
        email: formData.email.trim(),
        password_hash: chosenPassword,
        must_change_password: true,
        role: formData.level === 'admin' ? 'admin' : 'member',
        status: formData.status,
        organization_id: fallbackOrgId,
        holder_name: formData.name.trim(),
      })

      // Hubungkan akun ke posisi personel bila ada
      if (targetPersonnelId) {
        try {
          await dataService.updatePersonnel(
            targetPersonnelId,
            {
              user_id: newUser.id,
              name: formData.name.trim(),
            },
            user
          )
        } catch {
          // Non-blocking update personel
        }
      }

      // 3. Tentukan Keanggotaan & Hak Akses RBAC Akun
      await dataService.createMembership(
        {
          user_id: newUser.id,
          organization_id: fallbackOrgId,
          role_id: formData.role_id || roles[0]?.id || 'role-admin-org',
          level: formData.level,
          status: formData.status,
        },
        user
      )

      const selectedRole = roles.find((r) => r.id === formData.role_id)
      const credData: CredentialCardData = {
        name: formData.name.trim(),
        username: cleanUsername,
        email: formData.email.trim(),
        password: chosenPassword,
        positionName: finalPositionName,
        level: formData.level === 'admin' ? 'Admin Jabatan (Hak Penuh)' : 'Staf Pelaksana',
        roleName: selectedRole?.name || 'Hak Akses Standar',
        permissionsCount: selectedRole?.permissions?.length || 0,
      }

      success('Akun Dibuat', `Akun untuk jabatan ${finalPositionName} berhasil dibuat.`)

      if (andCreateAnother) {
        setFormData({
          name: '',
          username: '',
          email: '',
          password: generateRandomPassword(),
          status: 'active',
          position_mode: 'existing',
          personnel_id: personnels[0]?.id || '',
          new_position_name: '',
          tupoksi: '',
          role_id: roles[0]?.id || '',
          level: 'admin',
        })
        setCurrentStep(1)
        setUsernameTouched(false)
        setShowPassword(false)
        setCredentialCardData(credData)
        setIsCredentialModalOpen(true)
        loadData()
      } else {
        setCredentialCardData(credData)
        setIsCredentialModalOpen(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat akun'
      error('Gagal', msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyWhatsApp = (card: CredentialCardData) => {
    const text = `*AKUN AKSES JABATAN RESMI*
Halo *${card.name}*, berikut akun akses Anda:

🔗 Tautan Login : ${window.location.origin}/login
💼 Jabatan      : ${card.positionName}
🔰 Hak Akses    : ${card.roleName} (${card.level})
👤 Username     : ${card.username || card.email}
🔑 Kata Sandi   : ${card.password}

*Catatan:* Demi keamanan, Anda akan diminta memperbarui kata sandi saat pertama kali masuk.`

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
              { label: 'Buat Akun Jabatan' },
            ]}
          />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Buat Akun Jabatan
          </h1>
          <p className="text-xs sm:text-sm text-fg-muted">
            Daftarkan akun pengguna untuk mengemban posisi jabatan dan konfigurasikan peran hak aksesnya.
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

      {/* Modern Stepper Indicator */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
              currentStep === 1
                ? 'bg-amber-500/10 ring-1 ring-amber-500/30'
                : 'hover:bg-hover-bg'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                currentStep === 1
                  ? 'bg-amber-500 text-white'
                  : currentStep > 1
                  ? 'bg-emerald-500 text-white'
                  : 'bg-surface-muted text-fg-muted ring-1 ring-line'
              }`}
            >
              {currentStep > 1 ? <HeroCheck className="w-4 h-4" /> : '1'}
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="text-xs font-semibold text-fg truncate">1. Identitas Akun</p>
              <p className="text-[11px] text-fg-muted truncate">Nama, email & sandi</p>
            </div>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => {
              if (validateStep1()) setCurrentStep(2)
            }}
            className={`flex items-center gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
              currentStep === 2
                ? 'bg-amber-500/10 ring-1 ring-amber-500/30'
                : 'hover:bg-hover-bg'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                currentStep === 2
                  ? 'bg-amber-500 text-white'
                  : currentStep > 2
                  ? 'bg-emerald-500 text-white'
                  : 'bg-surface-muted text-fg-muted ring-1 ring-line'
              }`}
            >
              {currentStep > 2 ? <HeroCheck className="w-4 h-4" /> : '2'}
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="text-xs font-semibold text-fg truncate">2. Posisi Jabatan</p>
              <p className="text-[11px] text-fg-muted truncate">Pilih amanah jabatan</p>
            </div>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => {
              if (validateStep1() && validateStep2()) setCurrentStep(3)
            }}
            className={`flex items-center gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
              currentStep === 3
                ? 'bg-amber-500/10 ring-1 ring-amber-500/30'
                : 'hover:bg-hover-bg'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                currentStep === 3
                  ? 'bg-amber-500 text-white'
                  : 'bg-surface-muted text-fg-muted ring-1 ring-line'
              }`}
            >
              3
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="text-xs font-semibold text-fg truncate">3. Peran & Hak Akses</p>
              <p className="text-[11px] text-fg-muted truncate">Izin otorisasi RBAC</p>
            </div>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form noValidate onSubmit={(e) => handleSave(e, false)} className="space-y-6 pb-24">
          {/* STEP 1: IDENTITAS AKUN */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <Section
                title="Identitas Akun Pengguna"
                description="Informasi kredensial pengguna yang akan mengemban posisi jabatan."
                icon={<HeroUser className="w-5 h-5 text-amber-500" />}
                columns={2}
              >
                <div>
                  <Input
                    label="Nama Lengkap Pemegang Akun"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Contoh: Muhammad Ihsan"
                    helperText="Nama asli personil yang mengoperasikan akun."
                  />
                </div>

                <div>
                  <Input
                    type="email"
                    label="Alamat Email Akun"
                    required
                    value={formData.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="nama@pesantren.id"
                    helperText="Digunakan sebagai login dan korespondensi resmi."
                  />
                </div>

                <div>
                  <Input
                    label="Username Login"
                    required
                    value={formData.username}
                    onChange={(e) => {
                      setUsernameTouched(true)
                      setField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                    }}
                    placeholder="username"
                    className="font-mono text-xs"
                    helperText="ID unik huruf kecil tanpa spasi."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-fg">
                      Kata Sandi Awal <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleRandomizePassword}
                        className="p-1 rounded text-fg-muted hover:text-amber-500 hover:bg-hover-bg transition cursor-pointer"
                        title="Acak Sandi Otomatis"
                        aria-label="Acak Sandi Otomatis"
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
                    required
                    value={formData.password}
                    onChange={(e) => setField('password', e.target.value)}
                    placeholder="Min. 8 karakter"
                    className="font-mono text-xs"
                    helperText="Dapat diubah mandiri saat pengguna login pertama kali."
                  />
                </div>

                <div className="col-span-full">
                  <Select
                    label="Status Akun"
                    value={formData.status}
                    onValueChange={(val) => setField('status', val as 'active' | 'inactive')}
                    options={[
                      { value: 'active', label: 'Aktif (Siap Digunakan)' },
                      { value: 'inactive', label: 'Nonaktif (Ditangguhkan)' },
                    ]}
                  />
                </div>
              </Section>
            </div>
          )}

          {/* STEP 2: POSISI JABATAN */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <Section
                title="Penetapan Posisi Jabatan"
                description="Tentukan jabatan apa yang diemban oleh akun pengguna ini."
                icon={<HeroBriefcase className="w-5 h-5 text-amber-500" />}
                columns={1}
              >
                {/* Switcher: Pilih Jabatan Terdaftar vs Buat Baru vs Belum Ditempatkan */}
                <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl bg-surface-muted ring-1 ring-line w-full sm:w-fit mb-4">
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
                  <button
                    type="button"
                    onClick={() => setField('position_mode', 'none')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      formData.position_mode === 'none'
                        ? 'bg-surface text-fg shadow-xs ring-1 ring-line'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    Belum Ditempatkan (Opsional)
                  </button>
                </div>

                {formData.position_mode === 'existing' ? (
                  <div className="space-y-4">
                    {personnels.length === 0 ? (
                      <div className="p-6 rounded-xl border border-dashed border-line text-center space-y-2">
                        <HeroBriefcase className="w-8 h-8 text-fg-muted mx-auto" />
                        <p className="text-xs font-semibold text-fg">Belum Ada Posisi Jabatan Terdaftar</p>
                        <p className="text-xs text-fg-muted">
                          Silakan klik opsi "+ Buat Posisi Jabatan Baru" di atas untuk menambahkan jabatan langsung.
                        </p>
                      </div>
                    ) : (
                      <>
                        <Select
                          label="Pilih Posisi Jabatan"
                          required
                          value={formData.personnel_id}
                          onValueChange={(val) => setField('personnel_id', val)}
                          options={personnels.map((p) => ({
                            value: p.id,
                            label: `${p.position || p.role_title || 'Jabatan'} ${
                              p.user?.name ? `(Saat ini: ${p.user.name})` : '(Posisi Kosong)'
                            }`,
                          }))}
                          helperText="Akun ini akan langsung ditetapkan sebagai pemegang amanah jabatan terpilih."
                        />

                        {/* Detail Preview Jabatan Terpilih */}
                        {(() => {
                          const selected = personnels.find((p) => p.id === formData.personnel_id)
                          if (!selected) return null
                          return (
                            <div className="p-4 rounded-xl bg-surface-muted border border-line space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-fg uppercase tracking-wider">
                                  Informasi Jabatan Terpilih
                                </span>
                                <Badge variant="primary">
                                  {selected.node_type ? selected.node_type.toUpperCase() : 'JABATAN'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-fg-muted block">Nama Jabatan:</span>
                                  <span className="font-semibold text-fg text-sm">
                                    {selected.position || selected.role_title || '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-fg-muted block">Status Pemegang Sekarang:</span>
                                  <span className="font-semibold text-fg">
                                    {selected.user?.name || selected.name || 'Belum Ada Pemegang'}
                                  </span>
                                </div>
                              </div>
                              {selected.tupoksi && (
                                <div className="text-xs border-t border-line/60 pt-2 text-fg-muted">
                                  <span className="font-semibold text-fg block mb-0.5">Tupoksi:</span>
                                  <p className="line-clamp-2">{selected.tupoksi}</p>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>
                ) : formData.position_mode === 'new' ? (
                  <div className="space-y-4">
                    <Input
                      label="Nama Posisi Jabatan Baru"
                      required
                      value={formData.new_position_name}
                      onChange={(e) => setField('new_position_name', e.target.value)}
                      placeholder="Contoh: Kepala Bidang Humas & Publikasi"
                      helperText="Posisi jabatan baru akan dibuat dan langsung dihubungkan ke akun ini."
                    />

                    <div>
                      <label className="block text-xs font-semibold text-fg mb-1.5">
                        Tugas Pokok & Fungsi (Tupoksi) Jabatan (Opsional)
                      </label>
                      <textarea
                        rows={3}
                        value={formData.tupoksi}
                        onChange={(e) => setField('tupoksi', e.target.value)}
                        placeholder="Uraikan tanggung jawab dan ruang lingkup kewenangan jabatan ini..."
                        className="w-full rounded-lg bg-input-bg ring-1 ring-line-strong p-3 text-xs text-fg focus:ring-2 focus:ring-primary-600 focus:outline-none transition"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-line bg-surface-muted/30 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <HeroBriefcase className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h4 className="text-sm font-bold text-fg">Akun Dibuat Tanpa Penempatan Langsung</h4>
                      <p className="text-xs text-fg-muted leading-relaxed">
                        Akun ini akan dibuat sebagai pengguna aktif sistem (standby). Anda dapat menempatkannya ke posisi jabatan tertentu sewaktu-waktu melalui menu <strong>Jabatan</strong> atau <strong>Akun Pengguna</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* STEP 3: PERAN & HAK AKSES RBAC */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <Section
                title="Peran & Hak Akses (RBAC)"
                description="Atur izin modul operasional dan tingkat wewenang bagi pemegang jabatan ini."
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
                    helperText="Tingkat hak eksekusi wewenang administratif."
                  />
                </div>

                <div>
                  <Select
                    label="Paket Peran & Otorisasi"
                    required
                    value={formData.role_id}
                    onValueChange={(val) => setField('role_id', val)}
                    options={roles.map((r) => ({
                      value: r.id,
                      label: `${r.name} (${r.permissions?.length || 0} izin)`,
                    }))}
                    helperText="Matriks izin modul (Program, Agenda, Kinerja, Keuangan, dsb)."
                  />
                </div>

                {/* Ringkasan Hak Akses yang Diberikan */}
                <div className="col-span-full p-4 rounded-xl bg-surface-muted border border-line space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-fg uppercase tracking-wider flex items-center gap-2">
                      <HeroSquares2X2 className="w-4 h-4 text-amber-500" />
                      Cakupan Hak Akses Terpilih: {activeRole?.name || 'Peran Standar'}
                    </span>
                    <Badge variant="emerald">
                      {activeRole?.permissions?.length || 0} Izin Modul Aktif
                    </Badge>
                  </div>

                  <p className="text-xs text-fg-muted">
                    {activeRole?.description || 'Pengguna memiliki wewenang sesuai paket peran yang dipilih.'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-line/60">
                    {activeRole?.permissions && activeRole.permissions.length > 0 ? (
                      activeRole.permissions.slice(0, 14).map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface border border-line text-fg"
                        >
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-fg-muted italic">Tidak ada rincian izin</span>
                    )}
                    {(activeRole?.permissions?.length || 0) > 14 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600">
                        + {(activeRole?.permissions?.length || 0) - 14} izin lainnya
                      </span>
                    )}
                  </div>
                </div>

                {/* Ringkasan Akun & Jabatan Sebelum Simpan */}
                <div className="col-span-full p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    <span>Pratinjau Akun Siap Dibuat</span>
                    <HeroCheck className="w-4 h-4" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-fg-muted block">Pemegang:</span>
                      <span className="font-semibold text-fg">{formData.name}</span>
                    </div>
                    <div>
                      <span className="text-fg-muted block">Jabatan:</span>
                      <span className="font-semibold text-fg">
                        {formData.position_mode === 'new'
                          ? formData.new_position_name
                          : personnels.find((p) => p.id === formData.personnel_id)?.position || 'Jabatan Terpilih'}
                      </span>
                    </div>
                    <div>
                      <span className="text-fg-muted block">Username / Email:</span>
                      <span className="font-mono text-fg">{formData.username || formData.email}</span>
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* Sticky Footer Wizard Control Bar */}
          <div className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line py-3 px-4 sm:px-6 lg:px-8 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <div>
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePrev}
                    icon={<HeroArrowLeft className="w-4 h-4" />}
                  >
                    Sebelumnya
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate('/accounts')}
                  >
                    Batal
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNext}
                    className="font-semibold"
                  >
                    Lanjut ke {currentStep === 1 ? 'Jabatan' : 'Hak Akses'}
                    <HeroArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isSaving}
                      onClick={() => handleSave(undefined, true)}
                    >
                      <HeroPlus className="w-4 h-4 mr-1.5" />
                      Simpan & Buat Lainnya
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      disabled={isSaving}
                      onClick={() => handleSave(undefined, false)}
                      className="font-semibold"
                    >
                      <HeroCheck className="w-4 h-4 mr-1.5" />
                      {isSaving ? 'Menyimpan...' : 'Selesai & Buat Akun'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Credential Handover Modal */}
      {credentialCardData && (
        <Modal
          isOpen={isCredentialModalOpen}
          onClose={() => {
            setIsCredentialModalOpen(false)
            navigate('/accounts')
          }}
          title="Kredensial Akun Berhasil Dibuat"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-muted border border-line font-mono text-xs text-fg space-y-2 select-all">
              <p className="font-bold text-amber-600 dark:text-amber-400 mb-2">
                *AKUN AKSES JABATAN RESMI*
              </p>
              <p>Halo *{credentialCardData.name}*, berikut akun akses Anda:</p>
              <p className="pt-1">🔗 Tautan Login : {window.location.origin}/login</p>
              <p>💼 Jabatan      : {credentialCardData.positionName}</p>
              <p>🔰 Hak Akses    : {credentialCardData.roleName} ({credentialCardData.level})</p>
              <p>👤 Username     : {credentialCardData.username || credentialCardData.email}</p>
              <p>🔑 Kata Sandi   : {credentialCardData.password}</p>
              <p className="pt-2 text-xs text-fg-muted italic">
                *Catatan:* Demi keamanan, Anda akan diminta memperbarui kata sandi saat pertama kali masuk.
              </p>
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
