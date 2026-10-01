import React, { useState } from 'react'
import { Link } from 'react-router-dom'
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
  HeroCheck,
  HeroKey,
  HeroLockClosed,
  HeroExclamationTriangle,
  HeroClock,
  HeroChevronRight,
  HeroChevronDown,
  HeroSquares2X2,
  HeroGlobeAlt,
  HeroTag,
} from '@/components/icons/HeroIcons'

interface SettingsSectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children, className }) => (
  <div className={cn('space-y-2', className)}>
    {title && (
      <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider px-3 select-none">
        {title}
      </h3>
    )}
    <div className="rounded-2xl bg-surface border border-line shadow-2xs overflow-hidden divide-y divide-line/60">
      {children}
    </div>
  </div>
)

interface SettingsRowProps {
  icon: React.ReactNode
  iconBgClass: string
  label: string
  trailing?: React.ReactNode
  onClick?: () => void
  isButton?: boolean
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconBgClass,
  label,
  trailing,
  onClick,
  isButton = false,
}) => {
  const content = (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[52px]">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs', iconBgClass)}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-fg truncate">{label}</span>
      </div>
      {trailing && <div className="shrink-0 flex items-center gap-2">{trailing}</div>}
    </div>
  )

  if (onClick || isButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left transition-colors hover:bg-hover-bg active:bg-surface-muted cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500/70"
      >
        {content}
      </button>
    )
  }

  return <div>{content}</div>
}

export const SettingsPage: React.FC = () => {
  const { currentOrganization, user } = useAuth()
  const { mode, setMode, accentColor, setAccentColor } = useTheme()
  const { success, error } = useToast()

  // Ubah Kata Sandi State
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

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
      setIsPasswordExpanded(false)
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
      {/* 1. Page Header (Ringkas & Bersih) */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
          <HeroCog6Tooth className="w-6 h-6 text-amber-500" />
          Pengaturan
        </h1>
      </div>

      <div className="w-full min-w-0 space-y-6 animate-fade-in">
        {/* 2. Profil Ringkas (Apple ID Banner Style) */}
        <div className="p-4 sm:p-5 rounded-2xl border border-line bg-surface shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || 'User'}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ring-line shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-lg sm:text-xl flex items-center justify-center ring-2 ring-line shrink-0 shadow-xs">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-fg truncate">
                {user?.name || 'Administrator'}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={isSuperAdmin ? 'primary' : 'gray'}>
                  {isSuperAdmin ? 'Superadmin' : 'Pengurus'}
                </Badge>
                {currentOrganization && (
                  <span className="text-xs text-fg-muted truncate">
                    {currentOrganization.short_name || currentOrganization.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Inset Grouped Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* KOLOM KIRI: Keamanan Akun */}
          <div className="space-y-6 min-w-0">
            <SettingsSection title="Keamanan">
              <div>
                <SettingsRow
                  icon={<HeroLockClosed className="w-4 h-4 text-white" />}
                  iconBgClass="bg-amber-600"
                  label="Kata Sandi"
                  isButton
                  onClick={() => setIsPasswordExpanded(!isPasswordExpanded)}
                  trailing={
                    isPasswordExpanded ? (
                      <HeroChevronDown className="w-4 h-4 text-fg-muted" />
                    ) : (
                      <HeroChevronRight className="w-4 h-4 text-fg-muted" />
                    )
                  }
                />

                {/* Collapsible Form Ubah Kata Sandi */}
                {isPasswordExpanded && (
                  <form
                    noValidate
                    onSubmit={handleChangePassword}
                    className="p-4 sm:p-5 bg-surface-muted/30 border-t border-line/60 space-y-4 animate-fade-in"
                  >
                    {passwordError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2.5">
                        <HeroExclamationTriangle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{passwordError}</span>
                      </div>
                    )}

                    <div className="space-y-3.5">
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
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        />
                        <Input
                          label="Konfirmasi Sandi Baru"
                          type="password"
                          placeholder="Ketik ulang sandi baru"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value)
                            if (passwordError) setPasswordError('')
                          }}
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-line/60 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setIsPasswordExpanded(false)
                          setPasswordError('')
                        }}
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={isUpdatingPassword}
                        disabled={!currentPassword || !newPassword || !confirmPassword || isUpdatingPassword}
                        icon={<HeroKey className="w-3.5 h-3.5 mr-1" />}
                      >
                        {isUpdatingPassword ? 'Memproses...' : 'Perbarui Kata Sandi'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Riwayat Audit untuk Superadmin */}
              {isSuperAdmin && (
                <Link to="/audit-logs" className="block focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500/70">
                  <SettingsRow
                    icon={<HeroClock className="w-4 h-4 text-white" />}
                    iconBgClass="bg-indigo-600"
                    label="Riwayat Aktivitas"
                    trailing={<HeroChevronRight className="w-4 h-4 text-fg-muted" />}
                  />
                </Link>
              )}
            </SettingsSection>
          </div>

          {/* KOLOM KANAN: Tampilan & Organisasi */}
          <div className="space-y-6 min-w-0">
            {/* GRUP: TAMPILAN */}
            <SettingsSection title="Tampilan">
              {/* Mode Pencahayaan */}
              <SettingsRow
                icon={<HeroSun className="w-4 h-4 text-white" />}
                iconBgClass="bg-amber-500"
                label="Tema"
                trailing={
                  <div
                    role="tablist"
                    aria-label="Pilihan tema"
                    className="inline-flex items-center p-0.5 rounded-lg bg-surface-muted border border-line/60 shrink-0"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'light'}
                      onClick={() => setMode('light')}
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer inline-flex items-center gap-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500/70',
                        mode === 'light'
                          ? 'bg-surface text-amber-600 dark:text-amber-400 font-semibold shadow-2xs border border-line/50'
                          : 'text-fg-muted hover:text-fg'
                      )}
                    >
                      <HeroSun className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Terang</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'dark'}
                      onClick={() => setMode('dark')}
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer inline-flex items-center gap-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500/70',
                        mode === 'dark'
                          ? 'bg-surface text-amber-600 dark:text-amber-400 font-semibold shadow-2xs border border-line/50'
                          : 'text-fg-muted hover:text-fg'
                      )}
                    >
                      <HeroMoon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Gelap</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'system'}
                      onClick={() => setMode('system')}
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer inline-flex items-center gap-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500/70',
                        mode === 'system'
                          ? 'bg-surface text-amber-600 dark:text-amber-400 font-semibold shadow-2xs border border-line/50'
                          : 'text-fg-muted hover:text-fg'
                      )}
                    >
                      <HeroComputerDesktop className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Sistem</span>
                    </button>
                  </div>
                }
              />

              {/* Warna Aksen */}
              <SettingsRow
                icon={<HeroSquares2X2 className="w-4 h-4 text-white" />}
                iconBgClass="bg-emerald-600"
                label="Warna Aksen"
                trailing={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAccentColor('amber')}
                      aria-label="Aksen Kuning"
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                        accentColor === 'amber'
                          ? 'bg-amber-500/15 border-amber-500/60 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30'
                          : 'border-line bg-surface-muted/40 text-fg-muted hover:text-fg'
                      )}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-2xs" />
                      <span>Kuning</span>
                      {accentColor === 'amber' && <HeroCheck className="w-3 h-3 text-amber-600 dark:text-amber-400 ml-0.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccentColor('green')}
                      aria-label="Aksen Hijau"
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                        accentColor === 'green'
                          ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                          : 'border-line bg-surface-muted/40 text-fg-muted hover:text-fg'
                      )}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs" />
                      <span>Hijau</span>
                      {accentColor === 'green' && <HeroCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 ml-0.5" />}
                    </button>
                  </div>
                }
              />
            </SettingsSection>

            {/* GRUP: IDENTITAS LEMBAGA */}
            <SettingsSection title="Lembaga">
              <SettingsRow
                icon={<HeroBuildingOffice className="w-4 h-4 text-white" />}
                iconBgClass="bg-zinc-700 dark:bg-zinc-800"
                label="Organisasi"
                trailing={
                  <span className="text-xs font-semibold text-fg truncate max-w-[200px]">
                    {currentOrganization?.name || 'Belum Terhubung'}
                  </span>
                }
              />

              <SettingsRow
                icon={<HeroTag className="w-4 h-4 text-white" />}
                iconBgClass="bg-zinc-700 dark:bg-zinc-800"
                label="Kode Organisasi"
                trailing={
                  <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-line font-mono text-xs font-semibold text-fg">
                    {currentOrganization?.code || 'ORG-01'}
                  </span>
                }
              />

              <SettingsRow
                icon={<HeroGlobeAlt className="w-4 h-4 text-white" />}
                iconBgClass="bg-sky-600"
                label="Subdomain Web"
                trailing={
                  <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-line font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {currentOrganization?.slug ? `${currentOrganization.slug}.mytafrih.id` : 'jamub.mytafrih.id'}
                  </span>
                }
              />
            </SettingsSection>
          </div>
        </div>

        {/* 4. Footer Metadata Ringkas */}
        <p className="text-center text-xs text-fg-muted pt-6 pb-2 select-none">
          My Tafrih Enterprise v2.4.0
        </p>
      </div>
    </PageContainer>
  )
}
