import { useTheme } from '@/context/ThemeContext'
import React, { useState } from 'react'
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

const monthlyData = [
  { month: 'Jan', budget: 12500000, activities: 4 },
  { month: 'Feb', budget: 18000000, activities: 6 },
  { month: 'Mar', budget: 24500000, activities: 8 },
  { month: 'Apr', budget: 16000000, activities: 5 },
  { month: 'Mei', budget: 22000000, activities: 7 },
  { month: 'Jun', budget: 31000000, activities: 10 },
  { month: 'Jul', budget: 28000000, activities: 9 },
  { month: 'Agu', budget: 35000000, activities: 11 },
  { month: 'Sep', budget: 29500000, activities: 8 },
  { month: 'Okt', budget: 38000000, activities: 12 },
  { month: 'Nov', budget: 42000000, activities: 14 },
  { month: 'Des', budget: 48000000, activities: 15 },
]

export const ChartWidget: React.FC = () => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [metric, setMetric] = useState<'budget' | 'activities'>('budget')

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
          <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
