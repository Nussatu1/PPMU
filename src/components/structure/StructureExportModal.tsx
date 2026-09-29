import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/context/ToastContext'
import {
  HeroArrowDownTray,
  HeroDocumentText,
  HeroPhoto,
  HeroFolder,
  HeroArrowsRightLeft,
  HeroArrowsUpDown,
} from '@/components/icons/HeroIcons'
import type { Organization, Personnel, Section } from '@/types/database'
import {
  exportOrganizationStructure,
  getSubtreePersonnel,
  getSectionPersonnel,
} from '@/lib/structureExportService'

export interface StructureExportModalProps {
  isOpen: boolean
  onClose: () => void
  personnels: Personnel[]
  sections: Section[]
  organization: Organization | null
  selectedPersonnel: Personnel | null
  currentOrientation: 'horizontal' | 'vertical'
}

type ExportScope = 'all' | 'branch' | 'section'
type ExportFormat = 'all' | 'pdf' | 'png' | 'jpg'

export const StructureExportModal: React.FC<StructureExportModalProps> = ({
  isOpen,
  onClose,
  personnels,
  sections,
  organization,
  selectedPersonnel,
  currentOrientation,
}) => {
  const { success, error } = useToast()

  // Scope: 'all' | 'branch' | 'section'
  const [scope, setScope] = useState<ExportScope>('all')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')

  // Format: 'all' (.zip) | 'pdf' | 'png' | 'jpg'
  const [format, setFormat] = useState<ExportFormat>('all')

  // Orientation
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>(currentOrientation)

  // Loading state
  const [isExporting, setIsExporting] = useState(false)

  // Inisialisasi awal saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setOrientation(currentOrientation)
      if (selectedPersonnel) {
        setScope('branch')
        setSelectedBranchId(selectedPersonnel.id)
      } else {
        setScope('all')
        if (personnels.length > 0) {
          setSelectedBranchId(personnels[0].id)
        }
      }

      if (sections.length > 0) {
        setSelectedSectionId(sections[0].id)
      }
    }
  }, [isOpen, selectedPersonnel, currentOrientation, personnels, sections])

  // Hitung jumlah node yang akan diekspor sesuai cakupan
  const exportPersonnelCount = useMemo(() => {
    if (scope === 'branch' && selectedBranchId) {
      return getSubtreePersonnel(selectedBranchId, personnels).length
    }
    if (scope === 'section' && selectedSectionId) {
      return getSectionPersonnel(selectedSectionId, personnels).length
    }
    return personnels.length
  }, [scope, selectedBranchId, selectedSectionId, personnels])

  // Pilihan Jabatan untuk Root Cabang
  const branchOptions = useMemo(() => {
    return personnels.map(p => ({
      value: p.id,
      label: `${p.position || 'Jabatan'} (${p.name || 'Kosong'})`,
    }))
  }, [personnels])

  // Pilihan Seksi
  const sectionOptions = useMemo(() => {
    return sections.map(s => ({
      value: s.id,
      label: `${s.code} - ${s.name}`,
    }))
  }, [sections])

  const handleExport = async () => {
    if (personnels.length === 0) {
      error('Bagan Kosong', 'Tidak ada data struktur organisasi untuk diekspor.')
      return
    }

    setIsExporting(true)
    try {
      let targetId: string | undefined
      if (scope === 'branch') {
        targetId = selectedBranchId
      } else if (scope === 'section') {
        targetId = selectedSectionId
      }

      await exportOrganizationStructure(personnels, sections, {
        scope,
        targetId,
        format,
        orientation,
        organization,
      })

      const formatLabel =
        format === 'all'
          ? 'Paket Arsip ZIP (PNG, JPG, PDF)'
          : format.toUpperCase()

      success('Ekspor Berhasil', `File bagan ${formatLabel} berhasil diunduh.`)
      onClose()
    } catch (err: any) {
      console.error('Export error:', err)
      error('Gagal Mengekspor', err.message || 'Terjadi kesalahan saat memproses ekspor bagan.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ekspor Bagan Struktur"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-fg-muted flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              <strong className="text-fg font-semibold">{exportPersonnelCount}</strong> posisi siap diekspor
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" onClick={onClose} disabled={isExporting}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              isLoading={isExporting}
              icon={<HeroArrowDownTray className="w-4 h-4" />}
            >
              {isExporting ? 'Memproses...' : 'Unduh Berkas'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 py-0.5">
        {/* 1. Cakupan Struktur */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-fg tracking-wide block">
            Cakupan Bagan
          </label>
          <div className="p-1 bg-surface-muted rounded-xl border border-line grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`py-2 px-2 text-xs rounded-lg transition-all cursor-pointer text-center ${
                scope === 'all'
                  ? 'bg-surface text-fg shadow-xs border border-line/60 font-semibold'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              Semua Posisi
            </button>
            <button
              type="button"
              onClick={() => setScope('branch')}
              className={`py-2 px-2 text-xs rounded-lg transition-all cursor-pointer text-center ${
                scope === 'branch'
                  ? 'bg-surface text-fg shadow-xs border border-line/60 font-semibold'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              Cabang Tertentu
            </button>
            <button
              type="button"
              onClick={() => setScope('section')}
              className={`py-2 px-2 text-xs rounded-lg transition-all cursor-pointer text-center ${
                scope === 'section'
                  ? 'bg-surface text-fg shadow-xs border border-line/60 font-semibold'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              Per Seksi
            </button>
          </div>

          <p className="text-[11px] text-fg-muted px-0.5 leading-relaxed">
            {scope === 'all' && `Mencakup seluruh pimpinan, seksi, dan staf pelaksana (${personnels.length} posisi).`}
            {scope === 'branch' && 'Bagan akan difilter dari satu jabatan pucuk dan seluruh rantai komando bawahannya.'}
            {scope === 'section' && 'Hanya mengekspor personel yang bertugas dalam naungan seksi kerja yang dipilih.'}
          </p>

          {/* Sub-selector jika memilih Cabang */}
          {scope === 'branch' && (
            <div className="pt-1.5 animate-fadeIn">
              <Select
                label="Pucuk Cabang Jabatan"
                options={branchOptions}
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
              />
            </div>
          )}

          {/* Sub-selector jika memilih Seksi */}
          {scope === 'section' && (
            <div className="pt-1.5 animate-fadeIn">
              <Select
                label="Pilih Seksi Pelaksana"
                options={sectionOptions}
                value={selectedSectionId}
                onChange={e => setSelectedSectionId(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* 2. Format Berkas */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-fg tracking-wide block">
            Format Unduhan
          </label>
          <div className="p-1 bg-surface-muted rounded-xl border border-line grid grid-cols-2 sm:grid-cols-4 gap-1">
            {[
              { id: 'all', label: 'Semua (ZIP)', icon: HeroFolder },
              { id: 'pdf', label: 'PDF', icon: HeroDocumentText },
              { id: 'png', label: 'PNG', icon: HeroPhoto },
              { id: 'jpg', label: 'JPG', icon: HeroPhoto },
            ].map(item => {
              const Icon = item.icon
              const isActive = format === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormat(item.id as any)}
                  className={`py-2 px-2 text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-surface text-amber-500 shadow-xs border border-line/60 font-semibold'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-fg-muted px-0.5 leading-relaxed">
            {format === 'all' && 'Paket zip lengkap: PNG transparan 2x Retina, JPG kualitas 100%, dan PDF siap cetak.'}
            {format === 'pdf' && 'Dokumen PDF terpusat resolusi tinggi berukuran A4 yang rapi dan siap dicetak.'}
            {format === 'png' && 'Format PNG lossless dengan saluran transparansi (alpha channel) beresolusi 2x Retina.'}
            {format === 'jpg' && 'Format foto JPG berlatar putih solid kualitas 100% tanpa kompresi berlebih.'}
          </p>
        </div>

        {/* 3. Arah Orientasi */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-fg tracking-wide block">
            Arah Tata Letak
          </label>
          <div className="p-1 bg-surface-muted rounded-xl border border-line grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setOrientation('horizontal')}
              className={`py-2 px-3 text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                orientation === 'horizontal'
                  ? 'bg-surface text-fg shadow-xs border border-line/60 font-semibold'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <HeroArrowsRightLeft className={`w-4 h-4 ${orientation === 'horizontal' ? 'text-amber-500' : 'text-fg-muted'}`} />
              <span>Horizontal (Mind-Map)</span>
            </button>
            <button
              type="button"
              onClick={() => setOrientation('vertical')}
              className={`py-2 px-3 text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                orientation === 'vertical'
                  ? 'bg-surface text-fg shadow-xs border border-line/60 font-semibold'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <HeroArrowsUpDown className={`w-4 h-4 ${orientation === 'vertical' ? 'text-amber-500' : 'text-fg-muted'}`} />
              <span>Vertikal (Piramida)</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
