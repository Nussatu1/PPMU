import { useTheme } from '@/context/ThemeContext'
import React, { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/i18n'
import type { Transaction, Agenda } from '@/types/database'

export interface MonthlyDataPoint {
  month: string
  budget: number
  activities: number
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

interface ChartWidgetProps {
  data?: MonthlyDataPoint[]
  transactions?: Transaction[]
  agendas?: Agenda[]
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  data: customData,
  transactions = [],
  agendas = [],
}) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [metric, setMetric] = useState<'budget' | 'activities'>('budget')

  const chartData: MonthlyDataPoint[] = useMemo(() => {
    if (customData && customData.length > 0) return customData

    // Hitung data bulanan dari transaksi & agenda riil sistem
    return MONTH_LABELS.map((mLabel, idx) => {
      let budgetMonth = 0
      let activitiesMonth = 0

      // Filter transaksi pada bulan ini (indeks 0..11)
      transactions.forEach((tx) => {
        if (!tx.date) return
        const d = new Date(tx.date)
        if (!isNaN(d.getTime()) && d.getMonth() === idx) {
          budgetMonth += tx.amount || 0
        }
      })

      // Filter agenda tuntas pada bulan ini
      agendas.forEach((ag) => {
        if (!ag.date) return
        const d = new Date(ag.date)
        if (!isNaN(d.getTime()) && d.getMonth() === idx) {
          activitiesMonth += 1
        }
      })

      return {
        month: mLabel,
        budget: budgetMonth,
        activities: activitiesMonth,
      }
    })
  }, [customData, transactions, agendas])

  const gridStroke = 'var(--color-chart-grid)'
  const axisStroke = 'var(--color-chart-axis)'
  const tooltipBg = 'bg-surface border-line'
  const tooltipText = 'text-fg-muted'
  const tooltipValue = 'text-fg'

  return (
    <Card padding={false} className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-6">
        <div>
          <h3 className="text-sm sm:text-base font-bold tracking-tight text-fg">
            {t.dashboard.chart.title}
          </h3>
          <p className="hidden sm:block text-xs text-fg-muted mt-0.5">
            {t.dashboard.chart.subtitle}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Metrik Grafik"
          className="inline-flex items-center p-0.5 rounded-lg bg-surface-muted border border-line/60 shrink-0 self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={metric === 'budget'}
            onClick={() => setMetric('budget')}
            className={`px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-all cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500/70 ${
              metric === 'budget'
                ? 'bg-surface text-amber-600 dark:text-amber-400 font-semibold shadow-2xs border border-line/50'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <span className="sm:hidden">Anggaran</span>
            <span className="hidden sm:inline">{t.dashboard.chart.budget}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={metric === 'activities'}
            onClick={() => setMetric('activities')}
            className={`px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-all cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500/70 ${
              metric === 'activities'
                ? 'bg-surface text-amber-600 dark:text-amber-400 font-semibold shadow-2xs border border-line/50'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <span className="sm:hidden">Kegiatan</span>
            <span className="hidden sm:inline">{t.dashboard.chart.activities}</span>
          </button>
        </div>
      </div>

      <div className="h-36 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(var(--fi-primary-500))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="rgb(var(--fi-primary-500))" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} opacity={0.8} />
            <XAxis
              dataKey="month"
              stroke={axisStroke}
              tick={{ fill: isDark ? "#a1a1aa" : "#6b7280" }}
              fontSize={11}
              fontWeight={500}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={axisStroke}
              tick={{ fill: isDark ? "#a1a1aa" : "#6b7280" }}
              fontSize={11}
              fontWeight={500}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (metric === 'budget' ? `${Math.round(v / 1000000)}jt` : v)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className={`${tooltipBg} p-3 rounded-lg shadow-xl text-xs border`}>
                      <p className={`font-semibold ${tooltipText}`}>{label}</p>
                      <p className={`font-bold ${tooltipValue} mt-1 text-sm`}>
                        {metric === 'budget'
                          ? formatCurrency(payload[0].value as number)
                          : `${payload[0].value} Kegiatan Selesai`}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke="rgb(var(--fi-primary-600))"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorMetric)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
