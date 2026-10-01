import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'
import { dataService } from '@/lib/dataService'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types/database'
import {
  HeroCurrencyDollar,
  HeroArrowLeft,
  HeroCalendar,
  HeroDocumentText,
  HeroTag,
  HeroUser,
  HeroEye,
  HeroTrash,
  HeroExclamationCircle,
} from '@/components/icons/HeroIcons'

export const FinanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()
  const { confirm } = useConfirm()

  const initialTx = (location.state as { transaction?: Transaction } | null)?.transaction
  const [transaction, setTransaction] = useState<Transaction | null>(
    initialTx && initialTx.id === id ? initialTx : null
  )
  const [isLoading, setIsLoading] = useState(!transaction)
  const [isDeleting, setIsDeleting] = useState(false)

  const orgId = currentOrganization?.id || ''

  const loadTransaction = useCallback(async () => {
    if (!orgId || !id) return
    setIsLoading(true)
    try {
      const txs = await dataService.getTransactions(orgId, undefined, user)
      const found = txs.find((t) => t.id === id)
      setTransaction(found || null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat detail transaksi'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, id, user, error])

  useEffect(() => {
    if (!transaction) {
      loadTransaction()
    }
  }, [transaction, loadTransaction])

  const handleDelete = async () => {
    if (!transaction) return
    const ok = await confirm({
      title: 'Batalkan Transaksi',
      message: `Yakin ingin membatalkan transaksi ${formatCurrency(transaction.amount)}? Tindakan ini akan mengembalikan saldo/realisasi pagu terkait.`,
      tone: 'danger',
      confirmLabel: 'Batalkan Transaksi',
    })
    if (!ok) return

    setIsDeleting(true)
    try {
      await dataService.deleteTransaction(transaction.id, user)
      success('Transaksi Dibatalkan', 'Catatan kas mutasi telah berhasil dihapus.')
      navigate('/finance')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membatalkan transaksi'
      error('Gagal', msg)
      setIsDeleting(false)
    }
  }

  // State: Loading skeleton
  if (isLoading) {
    return (
      <PageContainer variant="narrow">
        <div className="space-y-4 animate-pulse pb-24 lg:pb-12">
          <div className="h-5 w-40 rounded bg-line" />
          <div className="h-8 w-60 rounded-lg bg-line" />
          <div className="h-32 w-full rounded-2xl bg-surface border border-line" />
          <div className="h-44 w-full rounded-2xl bg-surface border border-line" />
          <div className="h-28 w-full rounded-2xl bg-surface border border-line" />
        </div>
      </PageContainer>
    )
  }

  // State: Not Found fallback
  if (!transaction) {
    return (
      <PageContainer variant="narrow">
        <div className="py-12 flex flex-col items-center text-center space-y-4 pb-24 lg:pb-12">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
            <HeroExclamationCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-fg">Catatan Transaksi Tidak Ditemukan</h2>
            <p className="text-sm text-fg-muted max-w-sm">
              Transaksi dengan ID tersebut tidak ditemukan atau mungkin telah dibatalkan sebelumnya.
            </p>
          </div>
          <Button
            variant="secondary"
            icon={<HeroArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/finance')}
          >
            Kembali ke Anggaran & Keuangan
          </Button>
        </div>
      </PageContainer>
    )
  }

  const isIncome = transaction.type === 'income'
  const proofUrl = transaction.proof_url || transaction.receipt_url
  const programTitle =
    transaction.budget?.program?.title ||
    transaction.budget?.program?.name ||
    'Pos Anggaran Umum'
  const categoryTitle =
    transaction.category || (isIncome ? 'Kas Masuk' : 'Operasional')
  const recorderName =
    transaction.recorder?.name ||
    transaction.recorder?.username ||
    transaction.recorded_by ||
    'Sistem / Pengurus'

  const formattedDate = new Date(
    transaction.transaction_date || transaction.date || transaction.created_at
  ).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const formattedCreatedAt = new Date(transaction.created_at).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <PageContainer variant="narrow">
      <div className="space-y-4 pb-24 lg:pb-12">
        {/* Desktop Breadcrumb (Hidden on Mobile) */}
        <div className="hidden lg:block">
          <Breadcrumb
            items={[
              { label: 'Keuangan', href: '/finance' },
              { label: 'Detail Catatan Kas' },
            ]}
          />
        </div>

        {/* Large Title Body (Semantic H1) */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            <HeroCurrencyDollar className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            Detail Catatan Kas
          </h1>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/finance')}
            className="hidden lg:inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
          >
            <HeroArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </Button>
        </div>

        {/* 1. Hero Nominal Card */}
        <div className="p-4 sm:p-5 rounded-2xl border border-line bg-surface shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant={isIncome ? 'emerald' : 'amber'} dot>
              {isIncome ? 'Pemasukan Kas' : 'Pengeluaran Kas'}
            </Badge>

            <span className="text-xs text-fg-muted font-mono truncate max-w-[120px] sm:max-w-none">
              #{transaction.id.slice(0, 8)}
            </span>
          </div>

          <div>
            <span
              className={`text-2xl sm:text-3xl font-bold tracking-tight block ${
                isIncome
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isIncome ? '+ ' : '- '}
              {formatCurrency(transaction.amount)}
            </span>

            <p className="text-xs sm:text-sm text-fg-muted font-normal mt-1 flex items-center gap-1.5">
              <HeroCalendar className="w-4 h-4 shrink-0" />
              <span>{formattedDate}</span>
            </p>
          </div>
        </div>

        {/* 2. Deskripsi Lengkap Card */}
        <div className="p-4 sm:p-5 rounded-2xl border border-line bg-surface shadow-2xs space-y-2">
          <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider flex items-center gap-1.5">
            <HeroDocumentText className="w-4 h-4 text-primary-500" />
            Uraian / Deskripsi Mutasi
          </h2>
          <p className="text-sm text-fg font-normal leading-relaxed whitespace-pre-wrap break-words pt-1">
            {transaction.description || 'Tidak ada uraian tertulis untuk catatan mutasi ini.'}
          </p>
        </div>

        {/* 3. Informasi & Metadata Card */}
        <div className="p-4 sm:p-5 rounded-2xl border border-line bg-surface shadow-2xs space-y-3">
          <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-line">
            <HeroTag className="w-4 h-4 text-primary-500" />
            Informasi Transaksi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="space-y-0.5">
              <span className="text-fg-muted block text-[11px] sm:text-xs font-normal">Pos Anggaran / Program</span>
              <span className="font-medium text-fg block">{programTitle}</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-fg-muted block text-[11px] sm:text-xs font-normal">Kategori Mutasi</span>
              <span className="font-medium text-fg block">{categoryTitle}</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-fg-muted block text-[11px] sm:text-xs font-normal">Dicatat Oleh</span>
              <span className="font-medium text-fg block flex items-center gap-1">
                <HeroUser className="w-3.5 h-3.5 text-fg-muted shrink-0" />
                <span>{recorderName}</span>
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-fg-muted block text-[11px] sm:text-xs font-normal">Waktu Pencatatan Sistem</span>
              <span className="font-medium text-fg block">{formattedCreatedAt}</span>
            </div>
          </div>
        </div>

        {/* 4. Bukti Pembayaran / Nota Card */}
        <div className="p-4 sm:p-5 rounded-2xl border border-line bg-surface shadow-2xs space-y-3">
          <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-line">
            <HeroEye className="w-4 h-4 text-primary-500" />
            Bukti Pembayaran / Nota
          </h2>

          {proofUrl ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <HeroDocumentText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-fg truncate">
                    Dokumen Bukti Mutasi Kas
                  </p>
                  <p className="text-[11px] text-fg-muted font-normal">Tersedia dokumen bukti transaksi fisik/digital</p>
                </div>
              </div>

              <a
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-[0.98] active:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-all shrink-0"
                aria-label="Buka Bukti Nota / Kwitansi"
              >
                <HeroEye className="w-4 h-4" />
                <span>Buka Bukti Nota</span>
              </a>
            </div>
          ) : (
            <p className="text-xs text-fg-muted italic pt-1 font-normal">
              Tidak ada lampiran dokumen bukti pembayaran / nota pada catatan mutasi ini.
            </p>
          )}
        </div>

        {/* 5. Aksi Destructive: Batalkan Transaksi */}
        <div className="pt-2">
          <Button
            type="button"
            variant="subtle-danger"
            onClick={handleDelete}
            disabled={isDeleting}
            isLoading={isDeleting}
            icon={<HeroTrash className="w-4 h-4" />}
            className="w-full text-xs font-semibold py-2.5"
            aria-label="Batalkan dan hapus transaksi ini"
          >
            <span>Batalkan Transaksi Ini</span>
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}
