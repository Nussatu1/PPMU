import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { DataTable, type ColumnDef } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { formatCurrency } from '@/lib/utils'
import type { Budget, Transaction } from '@/types/database'
import {
  HeroCurrencyDollar,
  HeroPlus,
  HeroEye,
  HeroArrowDownTray,
  HeroChevronRight,
  HeroDocumentText,
} from '@/components/icons/HeroIcons'
import { FinanceExportModal } from '@/components/finance/FinanceExportModal'
import {
  OrganizationScopeBadge,
  OrganizationScopeSwitcher,
} from '@/components/organization'

export const FinanceListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization, currentScopeMode } = useAuth()
  const { success, error } = useToast()
  const { confirm } = useConfirm()

  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const orgId = currentOrganization?.id || ''

  const loadData = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const [bdgs, txs] = await Promise.all([
        dataService.getBudgets(
          { organizationId: orgId, mode: currentScopeMode },
          undefined,
          user
        ),
        dataService.getTransactions(
          { organizationId: orgId, mode: currentScopeMode },
          undefined,
          user
        ),
      ])
      setBudgets(bdgs)
      setTransactions(txs)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat keuangan'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, currentScopeMode, user, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteTransaction = async (tx: Transaction) => {
    const ok = await confirm({
      title: 'Batalkan Transaksi',
      message: `Yakin ingin membatalkan transaksi ${formatCurrency(tx.amount)}?`,
      tone: 'danger',
      confirmLabel: 'Batalkan Transaksi',
    })
    if (!ok) return
    try {
      await dataService.deleteTransaction(tx.id, user)
      success('Transaksi Dibatalkan', 'Transaksi telah dihapus.')
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus transaksi'
      error('Gagal', msg)
    }
  }

  const totalAllocated = budgets.reduce((sum, b) => sum + (b.allocated_amount || b.amount_allocated || b.planned_amount || 0), 0)
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type !== 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalRemaining = budgets.reduce((sum, b) => sum + (b.remaining_balance ?? ((b.allocated_amount || b.amount_allocated || 0) - (b.realized_amount || 0))), 0)

  const txColumns: ColumnDef<Transaction>[] = [
    {
      key: 'type',
      label: 'Jenis',
      mobilePriority: 'status',
      render: (tx) => (
        <Badge variant={tx.type === 'income' ? 'emerald' : 'amber'} dot>
          {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
        </Badge>
      ),
    },
    {
      key: 'transaction_date',
      label: 'Tanggal & Pos Anggaran',
      sortable: true,
      mobilePriority: 'secondary',
      render: (tx) => (
        <div>
          <span className="font-semibold text-xs text-fg">
            {new Date(tx.transaction_date || tx.date || tx.created_at).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
            {tx.budget?.program?.title || tx.budget?.program?.name || 'Pos Anggaran'}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Kategori',
      mobilePriority: 'secondary',
      render: (tx) => (
        <Badge variant="gray" dot>{tx.category || (tx.type === 'income' ? 'Kas Masuk' : 'Operasional')}</Badge>
      ),
    },
    {
      key: 'description',
      label: 'Uraian Mutasi',
      mobilePriority: 'primary',
      render: (tx) => (
        <p className="text-xs text-fg leading-relaxed max-w-sm">{tx.description}</p>
      ),
    },
    {
      key: 'amount',
      label: 'Nominal Mutasi',
      sortable: true,
      mobilePriority: 'primary',
      render: (tx) => (
        <span
          className={`font-bold text-xs ${
            tx.type === 'income'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {tx.type === 'income' ? '+ ' : '- '}
          {formatCurrency(tx.amount)}
        </span>
      ),
    },
    {
      key: 'proof_url',
      label: 'Bukti Kwitansi / Nota',
      mobilePriority: 'detail',
      render: (tx) => (
        <div>
          {tx.proof_url || tx.receipt_url ? (
            <Tooltip content="Buka Bukti Kwitansi / Nota">
              <a
                href={tx.proof_url || tx.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-amber-600 hover:text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                aria-label="Buka Bukti Nota"
              >
                <HeroEye className="w-4 h-4" />
              </a>
            </Tooltip>
          ) : (
            <span className="text-xs text-fg-muted italic">-</span>
          )}
        </div>
      ),
    },
  ]

  // Render Baris Mobile: Compact Transaction List Item (~75-85px)
  const renderTransactionCard = (tx: Transaction) => {
    const isIncome = tx.type === 'income'
    const proofUrl = tx.proof_url || tx.receipt_url
    const dateFormatted = new Date(tx.transaction_date || tx.date || tx.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    const programName = tx.budget?.program?.title || tx.budget?.program?.name || 'Pos Anggaran Umum'

    return (
      <div
        key={tx.id}
        className="p-3 sm:p-3.5 rounded-xl border border-line bg-surface shadow-2xs hover:border-line-strong transition-all duration-150 flex items-center justify-between gap-2.5"
      >
        {/* Kolom Kiri: Informasi Transaksi Utama (Dapat diklik menuju detail) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/finance/${tx.id}`, { state: { transaction: tx } })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              navigate(`/finance/${tx.id}`, { state: { transaction: tx } })
            }
          }}
          className="flex-1 min-w-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg py-0.5"
          aria-label={`Lihat detail mutasi ${tx.description || (isIncome ? 'Pemasukan Kas' : 'Pengeluaran Kas')}`}
        >
          {/* Baris 1: Indikator Jenis + Uraian / Judul Singkat */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`shrink-0 text-xs font-bold ${
                isIncome
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isIncome ? '↑' : '↓'}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-fg truncate">
              {tx.description || (isIncome ? 'Pemasukan Kas' : 'Pengeluaran Kas')}
            </span>
          </div>

          {/* Baris 2: Nominal Transaksi Lengkap */}
          <span
            className={`text-sm sm:text-base font-bold tracking-tight block mt-0.5 ${
              isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isIncome ? '+ ' : '- '}
            {formatCurrency(tx.amount)}
          </span>

          {/* Baris 3: Metadata Tanggal & Pos Anggaran */}
          <div className="flex items-center gap-1.5 text-[11px] text-fg-muted mt-0.5 truncate">
            <span className="shrink-0">{dateFormatted}</span>
            <span>•</span>
            <span className="truncate">{programName}</span>
          </div>
        </div>

        {/* Kolom Kanan: Aksi Nota (jika ada) + Trigger Detail Chevron */}
        <div className="flex items-center gap-0.5 shrink-0 self-center">
          {proofUrl && (
            <a
              href={proofUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/20 transition-colors shrink-0"
              aria-label="Buka Bukti Pembayaran / Nota"
              title="Buka Bukti Nota"
            >
              <HeroDocumentText className="w-5 h-5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => navigate(`/finance/${tx.id}`, { state: { transaction: tx } })}
            className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-fg-muted hover:text-fg hover:bg-hover-bg active:bg-hover-bg transition-colors cursor-pointer shrink-0"
            aria-label="Buka detail catatan kas"
            title="Detail Catatan Kas"
          >
            <HeroChevronRight className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <PageContainer variant="full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            <HeroCurrencyDollar className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Keuangan</span>
          </h1>
          <OrganizationScopeBadge />
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto flex-wrap">
          <OrganizationScopeSwitcher size="sm" />
          <Button
            variant="secondary"
            icon={<HeroArrowDownTray className="w-4 h-4" />}
            onClick={() => setIsExportModalOpen(true)}
            className="flex-1 sm:flex-initial"
          >
            Ekspor
          </Button>

          <Button
            variant="primary"
            icon={<HeroPlus className="w-4 h-4" />}
            onClick={() => navigate('/finance/create')}
            className="flex-1 sm:flex-initial"
          >
            Tambah Transaksi
          </Button>
        </div>
      </div>

      {/* Summary Cards: Compact 2x2 on Mobile, 4 Cols on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-xl border border-line bg-surface shadow-2xs">
          <p className="text-[11px] sm:text-xs font-medium text-fg-muted uppercase tracking-wider truncate">Total Pagu</p>
          <p className="text-base sm:text-xl font-bold text-fg mt-0.5 sm:mt-1 truncate">{formatCurrency(totalAllocated)}</p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl border border-line bg-surface shadow-2xs">
          <p className="text-[11px] sm:text-xs font-medium text-fg-muted uppercase tracking-wider truncate">Penerimaan Kas</p>
          <p className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 truncate">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl border border-line bg-surface shadow-2xs">
          <p className="text-[11px] sm:text-xs font-medium text-fg-muted uppercase tracking-wider truncate">Pengeluaran Kas</p>
          <p className="text-base sm:text-xl font-bold text-red-600 dark:text-red-400 mt-0.5 sm:mt-1 truncate">
            {formatCurrency(totalExpense)}
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl border border-line bg-surface shadow-2xs">
          <p className="text-[11px] sm:text-xs font-medium text-fg-muted uppercase tracking-wider truncate">Sisa Saldo</p>
          <p className="text-base sm:text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1 truncate">
            {formatCurrency(totalRemaining)}
          </p>
        </div>
      </div>

      {/* Program Budgets Breakdown (Content-First: Single Card, Divider-separated Rows, No Nested Cards) */}
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-1 border-b border-line/60">
          <h2 className="text-xs sm:text-sm font-semibold text-fg uppercase tracking-wider">
            Pagu per Program
          </h2>
          <span className="text-[11px] sm:text-xs text-fg-muted font-normal">
            {budgets.length} Program
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 divide-y md:divide-y-0 divide-line/60">
          {budgets.map((b) => {
            const allocated = b.allocated_amount || b.amount_allocated || b.planned_amount || 0
            const realized = b.realized_amount || b.amount_spent || 0
            const remaining = b.remaining_balance ?? (allocated - realized)
            const percent = allocated > 0 ? Math.round((realized / allocated) * 100) : 0
            return (
              <div key={b.id} className="pt-3 md:pt-0 first:pt-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-xs sm:text-sm text-fg">
                    {b.program?.title || b.program?.name || 'Program'}
                  </span>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                    {percent}%
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] sm:text-xs text-fg-muted font-normal pt-0.5">
                  <span>Realisasi: <strong className="font-medium text-fg">{formatCurrency(realized)}</strong></span>
                  <span>Sisa: <strong className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(remaining)}</strong></span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Transaction Stream Table */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-fg">
          Buku Catatan Kas Mutasi (Penerimaan & Pengeluaran) ({transactions.length})
        </h3>
        <DataTable
          columns={txColumns}
          data={transactions}
          isLoading={isLoading}
          searchPlaceholder="Cari transaksi..."
          searchKey="description"
          onDelete={handleDeleteTransaction}
          renderCard={renderTransactionCard}
        />
      </div>

      {/* Modal Export Laporan Keuangan ke Excel */}
      <FinanceExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        organization={currentOrganization}
        user={user}
      />
    </PageContainer>
  )
}
