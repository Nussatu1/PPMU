import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HeroLockClosed,
  HeroEnvelope,
  HeroEye,
  HeroEyeSlash,
  HeroExclamationCircle,
  HeroShieldCheck,
  HeroUser,
  HeroKey,
} from '@/components/icons/HeroIcons'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { dataService } from '@/lib/dataService'
import type { User } from '@/types/database'
import { t } from '@/i18n'

const FilamentMark: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
    <defs>
      <linearGradient id="fi-login-logo-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgb(var(--fi-primary-400))" />
        <stop offset="100%" stopColor="rgb(var(--fi-primary-700))" />
      </linearGradient>
      <linearGradient id="fi-login-inner-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
      </linearGradient>
    </defs>
    <path
      d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
      fill="url(#fi-login-logo-grad)"
      stroke="rgb(var(--fi-primary-700))"
      strokeOpacity="0.35"
      strokeWidth="0.75"
    />
    <path
      d="M12 6L7 9V15L12 18L17 15V9L12 6Z"
      fill="url(#fi-login-inner-grad)"
      stroke="rgba(255, 255, 255, 0.4)"
      strokeWidth="0.5"
    />
    <path
      d="M12 8.5L9 10.25V13.75L12 15.5L15 13.75V10.25L12 8.5Z"
      fill="white"
      fillOpacity="0.7"
    />
  </svg>
)

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('pengurus1@bakid.ponpes.id')
  const [password, setPassword] = useState('superadmin123')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Mandatory Change Password State
  const [mustChangeUser, setMustChangeUser] = useState<User | null>(null)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const { login } = useAuth()
  const { success } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setIsLoading(true)

    try {
      const res = await login(email, password)
      if (res.success) {
        const u = await dataService.getUserByEmailOrUsername(email)
        if (u?.must_change_password) {
          setMustChangeUser(u)
          setNewPassword('')
          setConfirmPassword('')
          setPasswordError('')
          setIsChangePasswordOpen(true)
          return
        }
        success(t.auth.signedInSuccess, '')
        navigate('/')
      } else {
        setErrorMsg(res.error || t.auth.invalidCredentials)
      }
    } catch {
      setErrorMsg(t.auth.unexpectedError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mustChangeUser) return
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak sesuai.')
      return
    }

    setIsUpdatingPassword(true)
    try {
      await dataService.updateUserPassword(mustChangeUser.id, newPassword)
      setIsChangePasswordOpen(false)
      success('Kata Sandi Diperbarui', 'Selamat datang! Kata sandi baru Anda telah aktif.')
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui kata sandi'
      setPasswordError(msg)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const fillQuickLogin = (targetEmail: string, targetPass: string) => {
    setEmail(targetEmail)
    setPassword(targetPass)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-muted antialiased">
      <div className="w-full sm:max-w-lg">
        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <FilamentMark />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            {t.auth.signInTitle}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {t.auth.signInSubtitle}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-surface px-6 py-10 shadow-sm ring-1 ring-line sm:px-10">
          {/* Error */}
          {errorMsg && (
            <div className="mb-5">
              <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-500/10 ring-1 ring-red-600/20 dark:ring-red-400/30 p-3.5 text-sm text-red-600 dark:text-red-400">
                <HeroExclamationCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <form noValidate onSubmit={handleSubmit} className="space-y-5">
            {/* Email / Username */}
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6 text-fg"
              >
                Email atau Username <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <div className="flex items-center rounded-lg bg-input-bg shadow-sm ring-1 ring-line-strong transition duration-75 focus-within:ring-2 focus-within:ring-primary-600 dark:focus-within:ring-primary-500 relative">
                <div className="pointer-events-none pl-3 flex items-center text-fg-subtle shrink-0">
                  <HeroEnvelope className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="text"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pengurus1@bakid.ponpes.id atau username"
                  className="w-full bg-transparent pl-2.5 pr-3 py-2 text-base text-fg outline-none placeholder:text-fg-subtle sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-6 text-fg"
                >
                  {t.auth.password} <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <button
                  type="button"
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium cursor-pointer"
                  tabIndex={-1}
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="flex items-center rounded-lg bg-input-bg shadow-sm ring-1 ring-line-strong transition duration-75 focus-within:ring-2 focus-within:ring-primary-600 dark:focus-within:ring-primary-500 relative">
                <div className="pointer-events-none pl-3 flex items-center text-fg-subtle shrink-0">
                  <HeroLockClosed className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  className="w-full bg-transparent pl-2.5 pr-10 py-2 text-base text-fg outline-none placeholder:text-fg-subtle sm:text-sm sm:leading-6"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-fg-subtle hover:text-fg-muted cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <HeroEyeSlash className="w-4 h-4" /> : <HeroEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center pt-1">
              <Checkbox
                id="remember"
                defaultChecked
                label={<span className="text-sm text-fg-muted">{t.auth.rememberMe}</span>}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-primary-500 hover:bg-primary-400 text-primary-950 shadow-sm transition duration-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{t.auth.signingIn}</span>
                </>
              ) : (
                <span>{t.auth.signInButton}</span>
              )}
            </button>
          </form>

          {/* QUICK LOGIN (DEMO - DEV ONLY) */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-line">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2.5 text-center">
                Demo Akses Cepat (PP. Miftahul Ulum BAKID)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => fillQuickLogin('pengurus1@bakid.ponpes.id', 'superadmin123')}
                  className="flex flex-col items-center p-2 rounded-lg border border-line bg-surface-muted hover:bg-hover-bg transition cursor-pointer text-center group"
                >
                  <HeroShieldCheck className="w-4 h-4 text-amber-500 mb-1" />
                  <span className="text-xs font-bold text-fg group-hover:text-amber-500">Pengurus 1</span>
                  <span className="text-[10px] text-fg-muted truncate w-full">Superadmin Harian</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillQuickLogin('ubudiyah@bakid.ponpes.id', 'password')}
                  className="flex flex-col items-center p-2 rounded-lg border border-line bg-surface-muted hover:bg-hover-bg transition cursor-pointer text-center group"
                >
                  <HeroUser className="w-4 h-4 text-emerald-500 mb-1" />
                  <span className="text-xs font-bold text-fg group-hover:text-emerald-500">Ubudiyah</span>
                  <span className="text-[10px] text-fg-muted truncate w-full">Ust. M. Ridwan</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillQuickLogin('multimedia@bakid.ponpes.id', 'password')}
                  className="flex flex-col items-center p-2 rounded-lg border border-line bg-surface-muted hover:bg-hover-bg transition cursor-pointer text-center group"
                >
                  <HeroUser className="w-4 h-4 text-blue-500 mb-1" />
                  <span className="text-xs font-bold text-fg group-hover:text-blue-500">Multimedia</span>
                  <span className="text-[10px] text-fg-muted truncate w-full">Ahmad Zainullah</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillQuickLogin('jamub@bakid.ponpes.id', 'password')}
                  className="flex flex-col items-center p-2 rounded-lg border border-line bg-surface-muted hover:bg-hover-bg transition cursor-pointer text-center group"
                >
                  <HeroUser className="w-4 h-4 text-purple-500 mb-1" />
                  <span className="text-xs font-bold text-fg group-hover:text-purple-500">JAMUB</span>
                  <span className="text-[10px] text-fg-muted truncate w-full">Ust. Fahrur Rozi</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL MANDATORY CHANGE PASSWORD */}
      <Modal
        isOpen={isChangePasswordOpen}
        onClose={() => {}}
        title="Pembaruan Kata Sandi Wajib"
        size="md"
      >
        <form noValidate onSubmit={handleChangePasswordSubmit} className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
            <HeroKey className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Demi Keamanan Akun Anda</p>
              <p className="mt-0.5">
                Ini adalah login pertama atau kata sandi Anda baru saja di-reset oleh Superadmin. Silakan tentukan kata sandi baru untuk melanjutkan.
              </p>
            </div>
          </div>

          {passwordError && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              {passwordError}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-fg">
              Kata Sandi Baru <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter..."
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg cursor-pointer"
              >
                {showNewPassword ? <HeroEyeSlash className="w-4 h-4" /> : <HeroEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-fg mb-1">
              Konfirmasi Kata Sandi Baru <span className="text-red-500">*</span>
            </label>
            <Input
              type={showNewPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi baru..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-line">
            <Button
              type="submit"
              variant="primary"
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? 'Menyimpan...' : 'Perbarui & Masuk'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
