import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Personnel, Section } from '@/types/database'
import {
  HeroPencilSquare,
  HeroTrash,
  HeroPlus,
  HeroUser,
  HeroFolder,
  HeroChevronRight,
  HeroCheckCircle,
  HeroEnvelope,
  HeroPhone,
} from '@/components/icons/HeroIcons'

export interface StructureDetailModalProps {
  isOpen: boolean
  onClose: () => void
  personnel: Personnel | null
  allPersonnels: Personnel[]
  sections: Section[]
  onEdit: (prs: Personnel) => void
  onDelete: (prs: Personnel) => void
  onAddSubordinate: (parentPrs: Personnel) => void
  onSelectNode: (prs: Personnel) => void
}

/**
 * Parses tupoksi string into distinct Tugas Pokok and Fungsi lists.
 */
function parseTupoksiStructure(tupoksiText?: string, mainTasks?: string, functions?: string) {
  let tasks: string[] = []
  let funcs: string[] = []

  const cleanPrefix = (str: string) => str.replace(/^[-•*\d.)\s]+\s*/, '').trim()

  if (mainTasks) {
    tasks = mainTasks.split('\n').map(cleanPrefix).filter(Boolean)
  }
  if (functions) {
    funcs = functions.split('\n').map(cleanPrefix).filter(Boolean)
  }

  if (tasks.length === 0 && funcs.length === 0 && tupoksiText) {
    const text = tupoksiText.trim()
    const lower = text.toLowerCase()

    if (lower.includes('fungsi:') || lower.includes('tugas pokok:')) {
      const parts = text.split(/(?:Fungsi|Tugas Pokok)\s*:/i).map(s => s.trim()).filter(Boolean)
      if (lower.startsWith('tugas pokok:')) {
        if (parts[0]) tasks = parts[0].split(/[;\n]/).map(cleanPrefix).filter(Boolean)
        if (parts[1]) funcs = parts[1].split(/[;\n]/).map(cleanPrefix).filter(Boolean)
      } else {
        if (parts[0]) funcs = parts[0].split(/[;\n]/).map(cleanPrefix).filter(Boolean)
        if (parts[1]) tasks = parts[1].split(/[;\n]/).map(cleanPrefix).filter(Boolean)
      }
    } else {
      tasks = text.split(/[;\n]/).map(cleanPrefix).filter(Boolean)
    }
  }

  return { tasks, funcs }
}

export const StructureDetailModal: React.FC<StructureDetailModalProps> = ({
  isOpen,
  onClose,
  personnel,
  allPersonnels,
  sections,
  onEdit,
  onDelete,
  onAddSubordinate,
  onSelectNode,
}) => {
  if (!personnel) return null

  const section = sections.find(s => s.id === personnel.section_id)
  const parent = personnel.parent_id
    ? allPersonnels.find(p => p.id === personnel.parent_id)
    : null
  const subordinates = allPersonnels.filter(p => p.parent_id === personnel.id)

  const { tasks, funcs } = parseTupoksiStructure(
    personnel.tupoksi,
    personnel.main_tasks,
    personnel.functions
  )

  const hasName = personnel.name && personnel.name.trim().length > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Jabatan & Tupoksi"
      size="2xl"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <Button
            type="button"
            variant="danger"
            onClick={() => onDelete(personnel)}
            icon={<HeroTrash className="w-4 h-4" />}
          >
            Hapus Jabatan
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAddSubordinate(personnel)}
              icon={<HeroPlus className="w-4 h-4" />}
            >
              Tambah Bawahan
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => onEdit(personnel)}
              icon={<HeroPencilSquare className="w-4 h-4" />}
            >
              Edit Jabatan & Tupoksi
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
        {/* Top Header Card */}
        <div className="p-4 rounded-xl border border-line-strong bg-surface-muted flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <HeroUser className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-fg leading-tight">
                  {personnel.position || 'Jabatan Tanpa Nama'}
                </h3>
                <Badge variant={personnel.status === 'active' || !personnel.status ? 'success' : 'gray'} dot>
                  {personnel.status === 'active' || !personnel.status ? 'Aktif' : 'Non-Aktif'}
                </Badge>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-fg-muted font-medium">Nama Personel:</span>
                {hasName ? (
                  <span className="text-xs font-semibold text-fg">{personnel.name}</span>
                ) : (
                  <span className="text-xs font-medium italic text-fg-muted bg-surface px-2 py-0.5 rounded border border-line-divider">
                    Belum ditentukan
                  </span>
                )}
              </div>
            </div>
          </div>

          {section && (
            <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs px-2.5 py-1 rounded-lg bg-surface border border-line-strong text-fg">
              <HeroFolder className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold">{section.name}</span>
              <span className="text-[10px] font-mono text-fg-muted">({section.code})</span>
            </div>
          )}
        </div>

        {/* Tupoksi Section: Clear Separation of Tugas Pokok & Fungsi */}
        <div className="space-y-4">
          <div className="border-b border-line-divider pb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
              <HeroCheckCircle className="w-4 h-4 text-amber-500" />
              Tupoksi (Tugas Pokok & Fungsi)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tugas Pokok */}
            <div className="p-4 rounded-xl border border-line-strong bg-surface flex flex-col h-full space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-line-divider">
                <span className="text-xs font-bold text-fg">
                  Tugas Pokok
                </span>
                <span className="text-[10px] text-fg-muted font-medium">
                  Tanggung Jawab Pokok
                </span>
              </div>
              {tasks.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-fg leading-relaxed flex-1">
                  {tasks.map((task, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5 shrink-0 font-bold">•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-fg-muted italic">Uraian tugas pokok belum dikonfigurasi.</p>
              )}
            </div>

            {/* Fungsi */}
            <div className="p-4 rounded-xl border border-line-strong bg-surface flex flex-col h-full space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-line-divider">
                <span className="text-xs font-bold text-fg">
                  Fungsi Operasional
                </span>
                <span className="text-[10px] text-fg-muted font-medium">
                  Pelaksanaan Bidang
                </span>
              </div>
              {funcs.length > 0 ? (
                <ol className="space-y-1.5 text-xs text-fg leading-relaxed flex-1 list-decimal list-inside">
                  {funcs.map((fn, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <span className="ml-1">{fn}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-fg-muted italic">Rincian fungsi operasional belum ditentukan.</p>
              )}
            </div>
          </div>

          {/* Kewenangan & Tanggung Jawab */}
          {(personnel.authority || personnel.responsibility) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {personnel.authority && (
                <div className="p-4 rounded-xl border border-line-strong bg-surface flex flex-col space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-line-divider">
                    <span className="text-xs font-bold text-fg">
                      Kewenangan Resmi
                    </span>
                    <span className="text-[10px] text-fg-muted font-medium">
                      Hak Keputusan
                    </span>
                  </div>
                  <p className="text-xs text-fg whitespace-pre-line leading-relaxed">{personnel.authority}</p>
                </div>
              )}
              {personnel.responsibility && (
                <div className="p-4 rounded-xl border border-line-strong bg-surface flex flex-col space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-line-divider">
                    <span className="text-xs font-bold text-fg">
                      Tanggung Jawab Kelembagaan
                    </span>
                    <span className="text-[10px] text-fg-muted font-medium">
                      Akuntabilitas
                    </span>
                  </div>
                  <p className="text-xs text-fg whitespace-pre-line leading-relaxed">{personnel.responsibility}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hierarchy Context: Atasan & Bawahan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Atasan Langsung */}
          <div className="p-4 rounded-xl border border-line-strong bg-surface space-y-2.5 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted block">
              Struktur Atasan Langsung
            </span>
            {parent ? (
              <button
                type="button"
                onClick={() => onSelectNode(parent)}
                className="w-full text-left p-2.5 rounded-lg bg-surface-muted border border-line-divider hover:border-amber-500/50 hover:bg-hover-bg transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-fg group-hover:text-amber-500 transition-colors">
                    {parent.position}
                  </p>
                  <p className="text-[11px] text-fg-muted">
                    {parent.name || 'Belum ditentukan'}
                  </p>
                </div>
                <HeroChevronRight className="w-4 h-4 text-fg-muted group-hover:text-amber-500 transition-colors" />
              </button>
            ) : (
              <div className="p-2.5 rounded-lg bg-surface-muted border border-dashed border-line-divider text-xs text-fg-muted">
                Pucuk Pimpinan Tertinggi (Root Struktur)
              </div>
            )}
          </div>

          {/* Bawahan Langsung */}
          <div className="p-4 rounded-xl border border-line-strong bg-surface space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
                Bawahan Langsung ({subordinates.length})
              </span>
              <button
                type="button"
                onClick={() => onAddSubordinate(personnel)}
                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <HeroPlus className="w-3.5 h-3.5" />
                Tambah Bawahan
              </button>
            </div>

            {subordinates.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {subordinates.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onSelectNode(sub)}
                    className="w-full text-left p-2 rounded-md bg-surface-muted hover:bg-hover-bg border border-line-divider text-xs flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="truncate">
                      <span className="font-semibold text-fg group-hover:text-amber-500 transition-colors">{sub.position}</span>
                      <span className="text-fg-muted text-[10px] ml-1.5">
                        ({sub.name || 'Belum ditentukan'})
                      </span>
                    </div>
                    <HeroChevronRight className="w-3.5 h-3.5 text-fg-muted group-hover:text-amber-500 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-surface-muted border border-dashed border-line-divider text-xs text-fg-muted">
                Belum ada bawahan langsung yang terdaftar.
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        {(personnel.email || personnel.phone) && (
          <div className="p-3.5 rounded-xl border border-line-strong bg-surface text-xs text-fg-muted flex flex-wrap items-center gap-4 shadow-2xs">
            {personnel.email && (
              <span className="flex items-center gap-2">
                <HeroEnvelope className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-fg font-medium">{personnel.email}</span>
              </span>
            )}
            {personnel.phone && (
              <span className="flex items-center gap-2">
                <HeroPhone className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-fg font-medium">{personnel.phone}</span>
              </span>
            )}
          </div>
        )}

      </div>
    </Modal>
  )
}
