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
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold tracking-tight text-fg">
            {t.dashboard.chart.title}
          </h3>
          <p className="text-xs text-fg-muted mt-0.5">
            {t.dashboard.chart.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg border border-line">
          <button
            type="button"
            onClick={() => setMetric('budget')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              metric === 'budget'
                ? 'bg-surface text-amber-600 dark:text-amber-400 shadow-xs border border-line'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            {t.dashboard.chart.budget}
          </button>
          <button
            type="button"
            onClick={() => setMetric('activities')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              metric === 'activities'
                ? 'bg-surface text-amber-600 dark:text-amber-400 shadow-xs border border-line'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            {t.dashboard.chart.activities}
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
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
