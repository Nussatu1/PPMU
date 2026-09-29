import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/context/ToastContext'
import { dataService } from '@/lib/dataService'
import { cn } from '@/lib/utils'
import {
  HeroCog6Tooth,
  HeroSun,
  HeroMoon,
  HeroComputerDesktop,
  HeroBuildingOffice,
  HeroShieldCheck,
  HeroCheck,
  HeroKey,
  HeroLockClosed,
  HeroExclamationTriangle,
  HeroClock,
  HeroArrowRight,
} from '@/components/icons/HeroIcons'

export const SettingsPage: React.FC = () => {
  const { currentOrganization, user } = useAuth()
  const { mode, setMode, accentColor, setAccentColor } = useTheme()
  const { success, error } = useToast()

  // Ubah Kata Sandi State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    success('Pengaturan Diperbarui', 'Preferensi sistem berhasil diperbarui.')
  }

  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setPasswordError('')

    if (!currentPassword.trim()) {
      setPasswordError('Kata sandi saat ini wajib diisi.')
      return
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi baru tidak sesuai.')
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError('Kata sandi baru tidak boleh sama dengan kata sandi saat ini.')
      return
    }

    if (!user?.id) {
      error('Gagal', 'Sesi pengguna tidak valid.')
      return
    }

    setIsUpdatingPassword(true)
    try {
      // Validasi kata sandi lama dari database/mock pengguna
      const existingUser = await dataService.getUserById(user.id)
      if (existingUser?.password_hash && existingUser.password_hash !== currentPassword) {
        setPasswordError('Kata sandi saat ini tidak sesuai.')
        setIsUpdatingPassword(false)
        return
      }

      await dataService.updateUserPassword(user.id, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
      success('Kata Sandi Diperbarui', 'Kata sandi akun Anda berhasil diperbarui.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui kata sandi'
      setPasswordError(msg)
      error('Gagal', msg)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const isSuperAdmin = !!(user?.is_superadmin || user?.role === 'superadmin')

  return (
    <PageContainer variant="full">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Breadcrumb
            items={[
              { label: 'Sistem', href: '/organizations' },
              { label: 'Pengaturan' },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-fg mt-1 flex items-center gap-2.5">
            <HeroCog6Tooth className="w-6 h-6 text-amber-500" />
            Pengaturan Sistem
          </h1>
          <p className="text-xs text-fg-muted mt-0.5">
            Pusat konfigurasi tema antarmuka, keamanan kredensial akun, dan preferensi aplikasi My Tafrih.
          </p>
        </div>

        <Button variant="primary" onClick={handleSaveSettings}>
          <HeroCheck className="w-4 h-4 mr-1.5" />
          Perbarui Pengaturan
        </Button>
      </div>

      <div className="w-full min-w-0 space-y-6 animate-fade-in">
        {/* 2. Top Hero Card: Profil & Status Sesi Aktif */}
        <div className="p-5 rounded-xl border border-line bg-surface shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
              alt={user?.name || 'User'}
              className="w-14 h-14 rounded-xl object-cover ring-2 ring-line shrink-0 shadow-xs"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-fg truncate">
                  {user?.name || 'Administrator'}
                </h2>
                <Badge variant={isSuperAdmin ? 'primary' : 'gray'}>
                  {isSuperAdmin ? 'Superadmin' : 'Pengurus Organisasi'}
                </Badge>
              </div>
              <p className="text-xs font-mono text-fg-muted mt-0.5 truncate">
                {user?.email || 'admin@mytafrih.id'}
              </p>
              {currentOrganization && (
                <div className="flex items-center gap-2 mt-1.5 text-xs text-fg-muted">
                  <HeroBuildingOffice className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">Organisasi: <strong className="text-fg font-medium">{currentOrganization.name}</strong></span>
                  {currentOrganization.short_name && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                      {currentOrganization.short_name}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-line/60">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Sistem Berjalan Normal
            </div>
            <span className="text-[11px] font-mono text-fg-muted">
              My Tafrih Enterprise v2.4.0
            </span>
          </div>
        </div>

        {/* 3. Hierarchical Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* KOLOM KIRI (7 Kolom): Pengaturan Operasional & Keamanan Akun */}
          <div className="lg:col-span-7 space-y-6 min-w-0">
            {/* CARD A: UBAH KATA SANDI LOGIN */}
            <div className="rounded-xl border border-line bg-surface shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                    <HeroLockClosed className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-fg">Keamanan & Ubah Kata Sandi</h3>
                    <p className="text-xs text-fg-muted mt-0.5">Perbarui kredensial kata sandi akun login Anda secara aman.</p>
                  </div>
                </div>
                <Badge variant="warning">Kredensial Sesi</Badge>
              </div>

              <form noValidate onSubmit={handleChangePassword} className="p-5 space-y-4">
                {passwordError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2.5 animate-shake">
                    <HeroExclamationTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Input
                      label="Kata Sandi Saat Ini"
                      type="password"
                      placeholder="Masukkan kata sandi saat ini"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value)
                        if (passwordError) setPasswordError('')
                      }}
                      required
                      helperText="Diperlukan untuk memverifikasi kepemilikan akun sebelum perubahan."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Kata Sandi Baru"
                        type="password"
                        placeholder="Minimal 6 karakter"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value)
                          if (passwordError) setPasswordError('')
                        }}
                        required
                        helperText="Minimal 6 karakter kombinasi."
                      />
                    </div>
                    <div>
                      <Input
                        label="Konfirmasi Kata Sandi Baru"
                        type="password"
                        placeholder="Ketik ulang kata sandi baru"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          if (passwordError) setPasswordError('')
                        }}
                        required
                        helperText="Harus sama dengan sandi baru."
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[11px] text-fg-muted">
                    Sandi baru langsung aktif saat disimpan.
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isUpdatingPassword}
                    disabled={!currentPassword || !newPassword || !confirmPassword || isUpdatingPassword}
                    icon={<HeroKey className="w-3.5 h-3.5 mr-1.5" />}
                  >
                    {isUpdatingPassword ? 'Memproses...' : 'Perbarui Kata Sandi'}
                  </Button>
                </div>
              </form>
            </div>

            {/* CARD B: PREFERENSI TAMPILAN & TEMA */}
            <div className="rounded-xl border border-line bg-surface shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                    <HeroSun className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-fg">Preferensi Tema & Tampilan</h3>
                    <p className="text-xs text-fg-muted mt-0.5">Pilih skema visual antarmuka yang paling nyaman untuk Anda.</p>
                  </div>
                </div>
                <Badge variant="primary">
                  Aktif: {mode === 'dark' ? 'Mode Gelap' : mode === 'light' ? 'Mode Terang' : 'Sistem OS'}
                </Badge>
              </div>

              <div className="p-5 space-y-5">
                {/* Pilihan Warna Aksen (Kuning / Hijau) */}
                <div className="pb-5 border-b border-line">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-bold text-fg block">
                        Warna Aksen Sistem
                      </span>
                      <p className="text-[11px] text-fg-muted mt-0.5">
                        Pilih warna aksen untuk tombol, ikon sorotan, dan status aktif.
                      </p>
                    </div>
                    <Badge variant="primary">
                      {accentColor === 'green' ? 'Aksen Hijau' : 'Aksen Kuning'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Aksen Kuning */}
                    <button
                      type="button"
                      onClick={() => setAccentColor('amber')}
                      className={cn(
                        'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer relative',
                        accentColor === 'amber'
                          ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50 shadow-xs'
                          : 'border-line bg-surface-muted/40 hover:bg-hover-bg'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-amber-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {accentColor === 'amber' ? <HeroCheck className="w-4 h-4" /> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-fg">Aksen Kuning (Amber)</p>
                        <p className="text-[11px] text-fg-muted mt-0.5 truncate">Warna kuning standar bawaan.</p>
                      </div>
                    </button>

                    {/* Aksen Hijau */}
                    <button
                      type="button"
                      onClick={() => setAccentColor('green')}
                      className={cn(
                        'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer relative',
                        accentColor === 'green'
                          ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50 shadow-xs'
                          : 'border-line bg-surface-muted/40 hover:bg-hover-bg'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {accentColor === 'green' ? <HeroCheck className="w-4 h-4" /> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-fg">Aksen Hijau (Green)</p>
                        <p className="text-[11px] text-fg-muted mt-0.5 truncate">Warna hijau segar cerah.</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Mode Tampilan (Terang / Gelap) */}
                <div>
                  <span className="text-xs font-bold text-fg block mb-3">
                    Mode Pencahayaan Tampilan
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Mode Gelap */}
                  <button
                    type="button"
                    onClick={() => setMode('dark')}
                    className={cn(
                      'flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer relative group',
                      mode === 'dark'
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50 shadow-xs'
                        : 'border-line bg-surface-muted/40 hover:bg-hover-bg hover:border-line-strong'
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400">
                        <HeroMoon className="w-4 h-4" />
                      </div>
                      {mode === 'dark' && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-amber-950 flex items-center justify-center text-xs">
                          <HeroCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-fg">Mode Gelap (Dark)</p>
                      <p className="text-[11px] text-fg-muted mt-1 leading-relaxed">
                        Latar gelap kontras tinggi, ideal untuk kenyamanan mata.
                      </p>
                    </div>
                  </button>

                  {/* Mode Terang */}
                  <button
                    type="button"
                    onClick={() => setMode('light')}
                    className={cn(
                      'flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer relative group',
                      mode === 'light'
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50 shadow-xs'
                        : 'border-line bg-surface-muted/40 hover:bg-hover-bg hover:border-line-strong'
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="p-2 rounded-lg bg-white border border-zinc-200 text-amber-500 shadow-2xs">
                        <HeroSun className="w-4 h-4" />
                      </div>
                      {mode === 'light' && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-amber-950 flex items-center justify-center text-xs">
                          <HeroCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-fg">Mode Terang (Light)</p>
                      <p className="text-[11px] text-fg-muted mt-1 leading-relaxed">
                        Latar cerah bersih dengan pencahayaan visual optimal.
                      </p>
                    </div>
                  </button>

                  {/* Mode Sistem */}
                  <button
                    type="button"
                    onClick={() => setMode('system')}
                    className={cn(
                      'flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer relative group',
                      mode === 'system'
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50 shadow-xs'
                        : 'border-line bg-surface-muted/40 hover:bg-hover-bg hover:border-line-strong'
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="p-2 rounded-lg bg-surface-muted border border-line text-amber-500">
                        <HeroComputerDesktop className="w-4 h-4" />
                      </div>
                      {mode === 'system' && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-amber-950 flex items-center justify-center text-xs">
                          <HeroCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-fg">Ikuti Sistem OS</p>
                      <p className="text-[11px] text-fg-muted mt-1 leading-relaxed">
                        Otomatis menyesuaikan mode terang/gelap perangkat Anda.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* KOLOM KANAN (5 Kolom): Identitas Organisasi & Status Tata Kelola */}
          <div className="lg:col-span-5 space-y-6 min-w-0">
            {/* CARD C: ENTITAS ORGANISASI TERHUBUNG */}
            <div className="rounded-xl border border-line bg-surface shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                    <HeroBuildingOffice className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-fg">Organisasi Aktif</h3>
                    <p className="text-xs text-fg-muted mt-0.5">Entitas kerja yang sedang dioperasikan.</p>
                  </div>
                </div>
                <Badge variant="success">Aktif</Badge>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-3.5 rounded-lg bg-surface-muted/50 border border-line/70 flex items-center gap-3.5">
                  <img
                    src={currentOrganization?.logo_url || 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=120'}
                    alt={currentOrganization?.name || 'Organisasi'}
                    className="w-12 h-12 rounded-lg object-contain bg-white/50 p-1 border border-line/60 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-fg-muted font-medium">Nama Resmi Lembaga</p>
                    <p className="text-sm font-bold text-fg truncate">
                      {currentOrganization?.name || 'Belum Terhubung'}
                    </p>
                    {currentOrganization?.short_name && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-fg-muted">Nama Khusus:</span>
                        <span className="px-1.5 py-0.2 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                          {currentOrganization.short_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg border border-line bg-surface-muted/30">
                    <span className="text-[11px] font-medium text-fg-muted block">Kode Identifikasi</span>
                    <span className="text-xs font-mono font-bold text-fg mt-0.5 block">
                      {currentOrganization?.code || 'ORG-01'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-line bg-surface-muted/30">
                    <span className="text-[11px] font-medium text-fg-muted block">Slug Subdomain / URL</span>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5 block truncate" aria-label={currentOrganization?.slug || 'jamub'}>
                      {currentOrganization?.slug ? `${currentOrganization.slug}.mytafrih.id` : 'jamub.mytafrih.id'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-fg-muted leading-relaxed">
                  *<strong>Slug Subdomain / URL</strong> merupakan identitas pengalamatan rute web (URL), berbeda dengan judul tab browser yang disinkronkan otomatis dari nama khusus lembaga.
                </p>
              </div>
            </div>

            {/* CARD D: KEAMANAN & INTEGRITAS DATA TENANT */}
            <div className="rounded-xl border border-line bg-surface shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                    <HeroShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-fg">Keamanan & Audit Sistem</h3>
                    <p className="text-xs text-fg-muted mt-0.5">Perlindungan data dan transparansi operasional.</p>
                  </div>
                </div>
                <Badge variant="primary">Terlindungi</Badge>
              </div>

              <div className="p-5 space-y-3.5">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-line bg-surface-muted/30">
                  <HeroKey className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-fg">Isolasi Data Mandiri (RLS)</p>
                    <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed">
                      Row Level Security membatasi hak akses query hanya pada data milik organisasi yang sedang aktif.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-line bg-surface-muted/30">
                  <HeroClock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-fg">Perekaman Jejak Mutasi</p>
                    <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed">
                      Aktivitas pembuatan, pengubahan, dan penghapusan data tercatat secara permanen pada log audit.
                    </p>
                    {isSuperAdmin && (
                      <Link
                        to="/audit-logs"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline mt-2"
                      >
                        Buka Riwayat Audit Trail
                        <HeroArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
