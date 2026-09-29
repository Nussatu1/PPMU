import React from 'react'
import { Link } from 'react-router-dom'
import {
  HeroArrowUpRight,
  HeroCalendar,
  HeroClock,
  HeroMapPin,
} from '@/components/icons/HeroIcons'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { t } from '@/i18n'
import type { Agenda } from '@/types/database'

interface RecentAgendasWidgetProps {
  agendas: Agenda[]
}

export const RecentAgendasWidget: React.FC<RecentAgendasWidgetProps> = ({ agendas }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="green" dot>Selesai</Badge>
      case 'in_progress':
        return <Badge variant="amber" dot>Berlangsung</Badge>
      case 'upcoming':
        return <Badge variant="blue" dot>Mendatang</Badge>
      case 'cancelled':
        return <Badge variant="red" dot>Dibatalkan</Badge>
      default:
        return <Badge variant="gray">{status}</Badge>
    }
  }

  return (
    <div className="rounded-xl shadow-xs overflow-hidden transition-colors bg-surface ring-1 ring-line">
      {/* Card Header */}
      <div className="px-5 py-4 sm:px-6 flex items-center justify-between border-b border-line-divider bg-surface-elevated/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 shrink-0">
            <HeroCalendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold tracking-tight text-fg">
                {t.dashboard.recentAgendas.title}
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-fg-muted border border-line">
                {agendas.length} Agenda
              </span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">
              {t.dashboard.recentAgendas.subtitle}
            </p>
          </div>
        </div>
        <Link
          to="/agendas"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:bg-hover-bg transition-colors"
        >
          <span>{t.dashboard.recentAgendas.viewAll}</span>
          <HeroArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-line-divider bg-table-header text-xs font-medium text-fg-muted">
              <th className="py-3 pl-5 sm:pl-6 pr-4 min-w-[220px]">{t.dashboard.recentAgendas.colTitle}</th>
              <th className="py-3 px-4 min-w-[130px]">{t.dashboard.recentAgendas.colSection}</th>
              <th className="py-3 px-4 min-w-[150px]">{t.dashboard.recentAgendas.colDate}</th>
              <th className="py-3 px-4 min-w-[150px]">{t.dashboard.recentAgendas.colLocation}</th>
              <th className="py-3 px-4 min-w-[110px]">{t.dashboard.recentAgendas.colStatus}</th>
              <th className="py-3 pl-4 pr-5 sm:pr-6 text-right min-w-[70px]">{t.dashboard.recentAgendas.colAction}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-row">
            {agendas.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-fg-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <HeroCalendar className="w-8 h-8 text-fg-subtle" />
                    <p className="font-medium text-fg">Belum ada agenda operasional</p>
                    <p className="text-xs text-fg-muted">Agenda kerja mendatang akan ditampilkan di sini.</p>
                  </div>
                </td>
              </tr>
            ) : (
              agendas.map((agenda) => (
                <tr
                  key={agenda.id}
                  className="hover:bg-hover-bg/60 transition-colors group"
                >
                  {/* Judul & Program */}
                  <td className="py-4 pl-5 sm:pl-6 pr-4">
                    <p className="font-medium text-fg text-xs sm:text-sm group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                      {agenda.title}
                    </p>
                    <p className="text-xs text-fg-muted mt-0.5 line-clamp-1">
                      {agenda.program?.title || 'Program Umum'}
                    </p>
                  </td>

                  {/* Seksi Pelaksana */}
                  <td className="py-4 px-4 text-xs">
                    <Badge variant="gray" size="sm">
                      {agenda.section?.name || 'Seksi Pelaksana'}
                    </Badge>
                  </td>

                  {/* Tanggal & Waktu */}
                  <td className="py-4 px-4 text-xs whitespace-nowrap">
                    <div className="font-medium text-fg">
                      {agenda.date ? formatDate(agenda.date) : 'Jadwal fleksibel'}
                    </div>
                    {agenda.time_start && (
                      <div className="flex items-center gap-1 text-xs text-fg-muted mt-0.5">
                        <HeroClock className="w-3 h-3 text-fg-subtle shrink-0" />
                        <span>{agenda.time_start} - {agenda.time_end || 'selesai'}</span>
                      </div>
                    )}
                  </td>

                  {/* Lokasi */}
                  <td className="py-4 px-4 text-xs text-fg-muted">
                    <div className="flex items-center gap-1.5 max-w-[200px]">
                      <HeroMapPin className="w-3.5 h-3.5 text-fg-subtle shrink-0" />
                      <span className="truncate">
                        {agenda.location || 'Daring / Lapangan'}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {getStatusBadge(agenda.status)}
                  </td>

                  {/* Aksi */}
                  <td className="py-4 pl-4 pr-5 sm:pr-6 text-right whitespace-nowrap">
                    <Link
                      to="/agendas"
                      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:bg-hover-bg transition-colors"
                    >
                      <span>Buka</span>
                      <HeroArrowUpRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
