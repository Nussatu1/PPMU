import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
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
} from '@/components/icons/HeroIcons'
import { FinanceExportModal } from '@/components/finance/FinanceExportModal'

export const FinanceListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentOrganization } = useAuth()
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
        dataService.getBudgets(orgId, undefined, user),
        dataService.getTransactions(orgId, undefined, user),
      ])
      setBudgets(bdgs)
      setTransactions(txs)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat keuangan'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, user, error])

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
      render: (tx) => (
        <div>
          <span className="font-semibold text-xs text-fg">
            {new Date(tx.transaction_date || tx.date || tx.created_at).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
            {tx.budget?.program?.title || tx.budget?.program?.name || 'Pos Anggaran'}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Kategori',
      render: (tx) => (
        <Badge variant="gray" dot>{tx.category || (tx.type === 'income' ? 'Kas Masuk' : 'Operasional')}</Badge>
      ),
    },
    {
      key: 'description',
      label: 'Uraian Mutasi',
      render: (tx) => (
        <p className="text-xs text-fg leading-relaxed max-w-sm">{tx.description}</p>
      ),
    },
    {
      key: 'amount',
      label: 'Nominal Mutasi',
      sortable: true,
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
            <span className="text-[11px] text-fg-muted italic">-</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <PageContainer variant="full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: 'Organisasi', href: '/programs' },
              { label: 'Anggaran & Keuangan' },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-fg mt-1 flex items-center gap-2.5">
            <HeroCurrencyDollar className="w-6 h-6 text-amber-500" />
            Tata Kelola Anggaran & Realisasi Keuangan
          </h1>
          <p className="text-xs text-fg-muted mt-0.5">
            Monitoring serapan pagu belanja, saldo kas berjalan, dan rekonsiliasi mutasi pembukuan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          <Button
            variant="secondary"
            icon={<HeroArrowDownTray className="w-4 h-4" />}
            onClick={() => setIsExportModalOpen(true)}
          >
            Export Laporan Excel
          </Button>

          <Button
            variant="primary"
            icon={<HeroPlus className="w-4 h-4" />}
            onClick={() => navigate('/finance/create')}
          >
            Catat Transaksi Baru
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs">
          <p className="text-xs font-semibold text-fg-muted uppercase">Total Pagu Alokasi</p>
          <p className="text-xl font-bold text-fg mt-1">{formatCurrency(totalAllocated)}</p>
        </div>
        <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs">
          <p className="text-xs font-semibold text-fg-muted uppercase">Total Penerimaan Kas</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs">
          <p className="text-xs font-semibold text-fg-muted uppercase">Total Pengeluaran Kas</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
            {formatCurrency(totalExpense)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs">
          <p className="text-xs font-semibold text-fg-muted uppercase">Sisa Saldo Pagu</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalRemaining)}
          </p>
        </div>
      </div>

      {/* Program Budgets Breakdown */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-fg">Rincian Pagu Anggaran Berjalan per Program</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const allocated = b.allocated_amount || b.amount_allocated || b.planned_amount || 0
            const realized = b.realized_amount || b.amount_spent || 0
            const remaining = b.remaining_balance ?? (allocated - realized)
            const percent = allocated > 0 ? Math.round((realized / allocated) * 100) : 0
            return (
              <div key={b.id} className="p-4 rounded-xl border border-line bg-surface-muted flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-fg">{b.program?.title || b.program?.name || 'Program'}</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface overflow-hidden my-2">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-fg-muted pt-2 border-t border-line">
                  <span>Realisasi: <strong>{formatCurrency(realized)}</strong></span>
                  <span>Sisa: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(remaining)}</strong></span>
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
