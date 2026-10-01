import React from 'react'
import { Link } from 'react-router-dom'
import {
  HeroArrowUpRight,
  HeroCalendar,
  HeroChevronRight,
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
        return <Badge variant="success" dot>Selesai</Badge>
      case 'in_progress':
        return <Badge variant="warning" dot>Berlangsung</Badge>
      case 'upcoming':
        return <Badge variant="primary" dot>Mendatang</Badge>
      case 'cancelled':
        return <Badge variant="danger" dot>Dibatalkan</Badge>
      default:
        return <Badge variant="gray">{status}</Badge>
    }
  }

  return (
    <div className="rounded-xl shadow-xs overflow-hidden transition-colors bg-surface ring-1 ring-line">
      {/* Card Header (Slim & calm on mobile, full on desktop) */}
      <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 flex items-center justify-between border-b border-line-divider max-sm:bg-transparent sm:bg-surface-elevated/40">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="hidden sm:flex p-2 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 shrink-0">
            <HeroCalendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="text-sm sm:text-base font-semibold tracking-tight text-fg truncate">
                {t.dashboard.recentAgendas.title}
              </h3>
              <span className="text-[10px] sm:text-[11px] font-normal sm:font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-surface-muted text-fg-muted border border-line shrink-0">
                {agendas.length}
              </span>
            </div>
            <p className="hidden sm:block text-xs text-fg-muted mt-0.5">
              {t.dashboard.recentAgendas.subtitle}
            </p>
          </div>
        </div>
        <Link
          to="/agendas"
          className="inline-flex items-center gap-1 min-h-[44px] sm:min-h-0 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium sm:font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:bg-hover-bg max-sm:active:scale-[0.98] transition-all shrink-0"
          aria-label={t.dashboard.recentAgendas.viewAll}
        >
          <span className="sm:hidden">Semua</span>
          <span className="hidden sm:inline">{t.dashboard.recentAgendas.viewAll}</span>
          <HeroArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Mobile Card List (sm:hidden) - Content-First Mobile-Native Layout */}
      <div className="block sm:hidden divide-y divide-line-row">
        {agendas.length === 0 ? (
          <div className="py-6 text-center text-xs text-fg-muted">
            <p className="font-medium text-fg">Belum ada agenda operasional</p>
          </div>
        ) : (
          agendas.map((agenda) => (
            <Link
              key={agenda.id}
              to="/agendas"
              className="min-h-[48px] flex items-center justify-between gap-2.5 py-3 px-3.5 hover:bg-hover-bg/60 active:bg-hover-bg max-sm:active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex-1 min-w-0 space-y-1">
                {/* Row 1: Judul Agenda + Status Badge */}
                <div className="flex items-center justify-between gap-2 w-full min-w-0">
                  <p className="font-semibold text-sm text-fg group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                    {agenda.title}
                  </p>
                  <div className="shrink-0">
                    {getStatusBadge(agenda.status)}
                  </div>
                </div>

                {/* Row 2: Waktu / Tanggal sebagai anchor visual utama sekunder */}
                <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <HeroClock className="w-3.5 h-3.5 text-fg-subtle shrink-0" />
                  <span className="font-medium text-fg-muted">
                    {agenda.date ? formatDate(agenda.date) : 'Jadwal fleksibel'}
                  </span>
                  {agenda.time_start && (
                    <span className="text-[11px] text-fg-subtle">
                      ({agenda.time_start}{agenda.time_end ? ` - ${agenda.time_end}` : ''})
                    </span>
                  )}
                </div>

                {/* Row 3: Seksi Pelaksana & Lokasi */}
                {(agenda.section?.name || agenda.location) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-fg-subtle truncate">
                    {agenda.section?.name && (
                      <span className="truncate">
                        {agenda.section.name}
                      </span>
                    )}
                    {agenda.section?.name && agenda.location && (
                      <span className="text-fg-subtle shrink-0">·</span>
                    )}
                    {agenda.location && (
                      <span className="min-w-0 flex items-center gap-1">
                        <HeroMapPin className="w-3 h-3 text-fg-subtle shrink-0" />
                        <span className="truncate">{agenda.location}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation Affordance Chevron */}
              <div className="shrink-0 text-fg-subtle/50 group-hover:text-fg-muted group-hover:translate-x-0.5 transition-all">
                <HeroChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop Table (hidden sm:block) */}
      <div className="hidden sm:block overflow-x-auto">
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
