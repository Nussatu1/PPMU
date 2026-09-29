import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { Structure, Section, Personnel, OrganizationPeriod } from '@/types/database'
import { OrganizationTree } from '@/components/structure/OrganizationTree'
import { StructureDetailModal } from '@/components/structure/StructureDetailModal'
import { HierarchyDeleteModal } from '@/components/structure/HierarchyDeleteModal'
import { StructureExportModal } from '@/components/structure/StructureExportModal'
import {
  HeroSquares2X2,
  HeroPlus,
  HeroUsers,
  HeroFolder,
  HeroCheck,
  HeroPencilSquare,
  HeroTrash,
  HeroEye,
  HeroArrowsRightLeft,
  HeroCalendar,
  HeroArrowDownTray,
} from '@/components/icons/HeroIcons'

/**
 * Returns all descendant IDs of a given personnel ID to prevent cyclic hierarchy loops.
 */
function getDescendantIds(targetId: string, allPersonnels: Personnel[]): Set<string> {
  const descendants = new Set<string>()
  const queue = [targetId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const children = allPersonnels.filter((p) => p.parent_id === current)
    for (const child of children) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id)
        queue.push(child.id)
      }
    }
  }

  return descendants
}

export const StructurePage: React.FC = () => {
  const { user, currentOrganization } = useAuth()
  const { success, error } = useToast()
  const { confirm } = useConfirm()

  const [periods, setPeriods] = useState<OrganizationPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [structures, setStructures] = useState<Structure[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [personnels, setPersonnels] = useState<Personnel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // View Mode: Interactive Tree / Mind-Map (default) vs Cards
  const [viewMode, setViewMode] = useState<'tree' | 'cards'>('tree')

  // Detail Modal State
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Hierarchy Delete Modal State
  const [deletingPersonnel, setDeletingPersonnel] = useState<Personnel | null>(null)
  const [isHierarchyDeleteOpen, setIsHierarchyDeleteOpen] = useState(false)

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Section Modal State
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [secForm, setSecForm] = useState({
    name: '',
    code: '',
    description: '',
  })

  // Personnel Modal State (Preserves existing form fields + adds Parent selection)
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false)
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null)
  const [prsForm, setPrsForm] = useState({
    name: '',
    position: '',
    section_id: '',
    parent_id: '',
    tupoksi: '',
    authority: '',
    responsibility: '',
    email: '',
    phone: '',
  })

  const orgId = currentOrganization?.id || ''

  const loadData = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    try {
      const [structs, secs, prss, prds] = await Promise.all([
        dataService.getStructures(orgId, user),
        dataService.getSections(orgId, undefined, user),
        dataService.getPersonnels(orgId, undefined, user),
        dataService.getPeriods(orgId, user),
      ])
      setStructures(structs)
      setSections(secs)
      setPersonnels(prss)
      setPeriods(prds)

      if (prds.length > 0 && !selectedPeriodId) {
        const activePrd = prds.find((p) => p.is_active) || prds[0]
        setSelectedPeriodId(activePrd.id)
      }

      // If a node was selected, update its reference
      setSelectedPersonnel((prev) => (prev ? prss.find((p) => p.id === prev.id) || null : null))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat struktur'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, user, error, selectedPeriodId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Section actions
  const openCreateSection = () => {
    setEditingSection(null)
    setSecForm({ name: '', code: '', description: '' })
    setIsSectionModalOpen(true)
  }

  const openEditSection = (sec: Section) => {
    setEditingSection(sec)
    setSecForm({ name: sec.name, code: sec.code, description: sec.description || '' })
    setIsSectionModalOpen(true)
  }

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!secForm.name.trim() || !secForm.code.trim()) {
      error('Validasi Gagal', 'Nama dan Kode Seksi wajib diisi')
      return
    }

    try {
      const activeStruct = structures[0]
      if (editingSection) {
        await dataService.updateSection(editingSection.id, secForm, user)
        success('Seksi Diperbarui', `Seksi ${secForm.name} berhasil diperbarui.`)
      } else {
        await dataService.createSection(
          {
            ...secForm,
            organization_id: orgId,
            structure_id: activeStruct?.id || 'str-1',
            sort_order: sections.length + 1,
          },
          user
        )
        success('Seksi Ditambahkan', `Seksi ${secForm.name} siap ditugaskan program & personel.`)
      }
      setIsSectionModalOpen(false)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan seksi'
      error('Gagal', msg)
    }
  }

  const handleDeleteSection = async (sec: Section) => {
    const ok = await confirm({
      title: 'Hapus Seksi',
      message: `Hapus seksi "${sec.name}"? Personel dan penugasan terkait akan terpengaruh.`,
      tone: 'danger',
      confirmLabel: 'Hapus Seksi',
    })
    if (!ok) return
    try {
      await dataService.deleteSection(sec.id, user)
      success('Seksi Dihapus', `Seksi ${sec.name} telah dihapus.`)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus seksi'
      error('Gagal', msg)
    }
  }

  // Personnel actions
  const openCreatePersonnel = (secId?: string, parentId?: string | null) => {
    setEditingPersonnel(null)
    setPrsForm({
      name: '',
      position: '',
      section_id: secId || sections[0]?.id || '',
      parent_id: parentId || '',
      tupoksi: '',
      authority: '',
      responsibility: '',
      email: '',
      phone: '',
    })
    setIsPersonModalOpen(true)
  }

  const openEditPersonnel = (prs: Personnel) => {
    setEditingPersonnel(prs)
    setPrsForm({
      name: prs.name || '',
      position: prs.position || prs.role_title || '',
      section_id: prs.section_id || sections[0]?.id || '',
      parent_id: prs.parent_id || '',
      tupoksi: prs.tupoksi || '',
      authority: prs.authority || '',
      responsibility: prs.responsibility || '',
      email: prs.email || '',
      phone: prs.phone || '',
    })
    setIsPersonModalOpen(true)
  }

  const handleSavePersonnel = async (e: React.FormEvent) => {
    e.preventDefault()

    // Jabatan is REQUIRED. Nama is explicitly OPTIONAL according to requirement.
    if (!prsForm.position.trim()) {
      error('Validasi Gagal', 'Nama Jabatan / Posisi Penugasan wajib diisi')
      return
    }

    try {
      const payload = {
        name: prsForm.name.trim() || undefined,
        position: prsForm.position.trim(),
        role_title: prsForm.position.trim(),
        section_id: prsForm.section_id,
        parent_id: prsForm.parent_id ? prsForm.parent_id : null,
        tupoksi: prsForm.tupoksi.trim() || undefined,
        authority: prsForm.authority.trim() || undefined,
        responsibility: prsForm.responsibility.trim() || undefined,
        period_id: selectedPeriodId || undefined,
        email: prsForm.email.trim() || undefined,
        phone: prsForm.phone.trim() || undefined,
      }

      if (editingPersonnel) {
        await dataService.updatePersonnel(editingPersonnel.id, payload, user)
        success('Jabatan Diperbarui', `Jabatan ${prsForm.position} berhasil diperbarui.`)
      } else {
        await dataService.createPersonnel(
          {
            ...payload,
            organization_id: orgId,
            status: 'active',
          },
          user
        )
        success('Jabatan Ditambahkan', `Jabatan ${prsForm.position} berhasil ditambahkan ke struktur.`)
      }
      setIsPersonModalOpen(false)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan jabatan'
      error('Gagal', msg)
    }
  }

  // Hierarchy-aware delete handlers
  const requestDeletePersonnel = (prs: Personnel) => {
    setDeletingPersonnel(prs)
    setIsHierarchyDeleteOpen(true)
  }

  const handleConfirmDeletePersonnel = async (
    prs: Personnel,
    options: { reassignToParentId?: string | null; cascade?: boolean }
  ) => {
    try {
      await dataService.deletePersonnel(prs.id, options, user)
      success('Jabatan Dihapus', `Jabatan ${prs.position} telah dihapus.`)
      setIsDetailModalOpen(false)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus jabatan'
      error('Gagal', msg)
    }
  }

  // Node selection & detail modal logic:
  // - Klik pertama: memilih (select) kartu jabatan
  // - Klik kedua (pada kartu yang sudah terpilih): memunculkan Detail Jabatan
  const selectedPersonnelRef = useRef<Personnel | null>(selectedPersonnel)
  useEffect(() => {
    selectedPersonnelRef.current = selectedPersonnel
  }, [selectedPersonnel])

  const handleNodeClick = (prs: Personnel) => {
    if (selectedPersonnelRef.current?.id === prs.id) {
      // Klik kedua pada node yang sama -> Buka modal Detail
      setIsDetailModalOpen(true)
    } else {
      // Klik pertama -> Pilih (select) node
      setSelectedPersonnel(prs)
      selectedPersonnelRef.current = prs
    }
  }

  // Klik selain Kartu Jabatan -> unselect / batalkan pilihan
  const handleClearSelection = () => {
    setSelectedPersonnel(null)
    selectedPersonnelRef.current = null
  }

  // Available Parent Options (Prevents self-selection and cyclic loops)
  const availableParentOptions = useMemo(() => {
    const disallowed = editingPersonnel
      ? new Set([editingPersonnel.id, ...getDescendantIds(editingPersonnel.id, personnels)])
      : new Set<string>()

    const options = [
      { value: '', label: 'Tanpa Atasan (Pucuk Pimpinan / Root)' },
    ]

    personnels
      .filter((p) => !disallowed.has(p.id))
      .forEach((p) => {
        const sec = sections.find((s) => s.id === p.section_id)
        const secLabel = sec ? ` [${sec.code}]` : ''
        options.push({
          value: p.id,
          label: `${p.position || 'Jabatan'}${secLabel} (${p.name || 'Belum ditentukan'})`,
        })
      })

    return options
  }, [editingPersonnel, personnels, sections])

  // Section options for personnel form
  const sectionOptions = useMemo(() => {
    return sections.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.code})`,
    }))
  }, [sections])

  return (
    <PageContainer variant="full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: 'Organisasi', href: '/structures' },
              { label: 'Struktur & Seksi' },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-fg mt-1 flex items-center gap-2.5">
            <HeroSquares2X2 className="w-7 h-7 text-amber-500" />
            Struktur Organisasi, Seksi & Tupoksi
          </h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20 flex items-center gap-1.5">
              <HeroCalendar className="w-3.5 h-3.5" />
              {periods.find((p) => p.id === selectedPeriodId)?.name || 'Periode Kepengurusan Aktif'}
            </span>
            {periods.length > 1 && (
              <span className="text-xs text-fg-muted">
                • {periods.length} Periode Kepengurusan Tersimpan
              </span>
            )}
          </div>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Segmented View Switcher */}
          <div className="p-1 rounded-xl bg-surface-muted border border-line flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'tree'
                  ? 'bg-surface text-fg shadow-2xs border border-line'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <HeroArrowsRightLeft className="w-3.5 h-3.5 text-amber-500" />
              Bagan Interaktif
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-surface text-fg shadow-2xs border border-line'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <HeroUsers className="w-3.5 h-3.5 text-blue-500" />
              Daftar Seksi
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => setIsExportModalOpen(true)}
            className="shrink-0"
            title="Ekspor Bagan ke PDF, PNG, JPG, atau ZIP"
          >
            <HeroArrowDownTray className="w-4 h-4 mr-1.5 text-amber-500" />
            Ekspor Bagan
          </Button>

          <Button variant="secondary" onClick={openCreateSection} className="shrink-0">
            <HeroPlus className="w-4 h-4 mr-1.5" />
            Tambah Seksi
          </Button>

          <Button
            variant="primary"
            onClick={() => openCreatePersonnel()}
            className="shrink-0"
          >
            <HeroPlus className="w-4 h-4 mr-1.5" />
            Tambah Jabatan
          </Button>
        </div>
      </div>

      {/* Structure Period Banner */}
      {structures.length > 0 && (
        <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-fg text-sm">{structures[0].name}</span>
              <Badge variant="success">Periode Aktif</Badge>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">
              Masa Bakti: {structures[0].period_start} s/d {structures[0].period_end}
            </p>
          </div>
          <div className="text-xs text-fg-muted flex items-center gap-3">
            <span>
              Total <strong className="text-fg">{sections.length}</strong> Seksi Pelaksana
            </span>
            <span>•</span>
            <span>
              <strong className="text-fg">{personnels.length}</strong> Posisi Jabatan
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-16 text-center text-fg-muted border border-line rounded-2xl bg-surface">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <HeroSquares2X2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-sm font-medium">Memuat bagan struktur organisasi...</span>
          </div>
        </div>
      ) : personnels.length === 0 ? (
        /* Empty State */
        <div className="p-16 text-center border-2 border-dashed border-line rounded-2xl bg-surface space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <HeroSquares2X2 className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-fg">Belum Ada Struktur Organisasi</h3>
            <p className="text-xs text-fg-muted leading-relaxed">
              Tambahkan jabatan pertama untuk membangun hierarki bagan organisasi secara interaktif.
            </p>
          </div>
          <Button variant="primary" onClick={() => openCreatePersonnel()} className="mt-2">
            <HeroPlus className="w-4 h-4 mr-2" />
            Tambah Jabatan Pertama
          </Button>
        </div>
      ) : viewMode === 'tree' ? (
        /* View Mode 1: Interactive Mind-Map / Tree Canvas */
        <OrganizationTree
          personnels={personnels}
          sections={sections}
          selectedNodeId={selectedPersonnel?.id}
          onNodeClick={handleNodeClick}
          onClearSelection={handleClearSelection}
          onAddSubordinate={(parent) => openCreatePersonnel(parent.section_id, parent.id)}
          onAddRoot={() => openCreatePersonnel(undefined, null)}
          onExport={() => setIsExportModalOpen(true)}
        />
      ) : (
        /* View Mode 2: Existing Section & Personnel Cards */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sections.map((sec) => {
            const secPersonnel = personnels.filter((p) => p.section_id === sec.id)

            return (
              <div
                key={sec.id}
                className="rounded-2xl border border-line bg-surface shadow-2xs flex flex-col overflow-hidden"
              >
                {/* Section Card Header */}
                <div className="p-5 border-b border-line bg-surface-muted flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <HeroFolder className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-fg text-base">{sec.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface text-fg border border-line">
                          {sec.code}
                        </span>
                      </div>
                      <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                        {sec.description || 'Tidak ada deskripsi spesifik.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditSection(sec)}
                      className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-hover-bg transition-colors"
                      aria-label="Edit Seksi"
                    >
                      <HeroPencilSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(sec)}
                      className="p-1.5 rounded-lg text-fg-muted hover:text-red-500 hover:bg-hover-bg transition-colors"
                      aria-label="Hapus Seksi"
                    >
                      <HeroTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Personnel Sub-list */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                      <HeroUsers className="w-4 h-4 text-amber-500" />
                      Personel & Tupoksi ({secPersonnel.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => openCreatePersonnel(sec.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 cursor-pointer"
                    >
                      <HeroPlus className="w-3.5 h-3.5" />
                      Tambah Personel
                    </button>
                  </div>

                  {secPersonnel.length === 0 ? (
                    <div className="p-6 text-center text-xs text-fg-muted border border-dashed border-line rounded-xl">
                      Belum ada personel yang ditugaskan pada seksi ini.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {secPersonnel.map((prs) => (
                        <div
                          key={prs.id}
                          className="p-3.5 rounded-xl border border-line-strong bg-surface-muted hover:border-amber-500/50 transition-all flex flex-col gap-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-fg">
                                {prs.position}
                              </p>
                              <p className="text-[11px] font-medium text-fg-muted">
                                {prs.name || (
                                  <span className="italic">Belum ditentukan</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleNodeClick(prs)}
                                className="p-1 text-fg-muted hover:text-amber-500"
                                title="Lihat Detail Tupoksi"
                              >
                                <HeroEye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditPersonnel(prs)}
                                className="p-1 text-fg-muted hover:text-fg"
                                title="Edit"
                              >
                                <HeroPencilSquare className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDeletePersonnel(prs)}
                                className="p-1 text-fg-muted hover:text-red-500"
                                title="Hapus"
                              >
                                <HeroTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {prs.tupoksi && (
                            <div className="p-2 rounded-lg bg-surface border border-line text-[11px] text-fg-muted leading-relaxed line-clamp-2">
                              <strong className="text-fg font-semibold">Tupoksi: </strong>
                              {prs.tupoksi}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Structure Detail Modal (Interactive Node Drawer / Dialog) */}
      <StructureDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        personnel={selectedPersonnel}
        allPersonnels={personnels}
        sections={sections}
        onEdit={(prs) => {
          setIsDetailModalOpen(false)
          openEditPersonnel(prs)
        }}
        onDelete={(prs) => {
          setIsDetailModalOpen(false)
          requestDeletePersonnel(prs)
        }}
        onAddSubordinate={(parentPrs) => {
          setIsDetailModalOpen(false)
          openCreatePersonnel(parentPrs.section_id, parentPrs.id)
        }}
        onSelectNode={(node) => setSelectedPersonnel(node)}
      />

      {/* Hierarchy-Aware Delete Confirmation Modal */}
      <HierarchyDeleteModal
        isOpen={isHierarchyDeleteOpen}
        onClose={() => setIsHierarchyDeleteOpen(false)}
        personnel={deletingPersonnel}
        subordinates={
          deletingPersonnel
            ? personnels.filter((p) => p.parent_id === deletingPersonnel.id)
            : []
        }
        parentPersonnel={
          deletingPersonnel && deletingPersonnel.parent_id
            ? personnels.find((p) => p.id === deletingPersonnel.parent_id) || null
            : null
        }
        onConfirm={handleConfirmDeletePersonnel}
      />

      {/* Section Create/Edit Modal (Existing Form) */}
      <Modal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        title={editingSection ? 'Edit Seksi / Divisi' : 'Tambah Seksi Baru'}
      >
        <form noValidate onSubmit={handleSaveSection} className="space-y-4">
          <Input
            label="Nama Seksi / Divisi"
            required
            value={secForm.name}
            onChange={(e) => setSecForm({ ...secForm, name: e.target.value })}
            placeholder="Contoh: Seksi Pendidikan"
          />

          <Input
            label="Kode Singkatan"
            required
            value={secForm.code}
            onChange={(e) => setSecForm({ ...secForm, code: e.target.value.toUpperCase() })}
            placeholder="SEK-DIK"
            className="font-mono uppercase"
          />

          <Textarea
            label="Uraian Bidang Tanggung Jawab"
            rows={3}
            autoGrow
            value={secForm.description}
            onChange={(e) => setSecForm({ ...secForm, description: e.target.value })}
            placeholder="Uraian bidang"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => setIsSectionModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              <HeroCheck className="w-4 h-4 mr-1.5" />
              {editingSection ? 'Perbarui Seksi' : 'Buat Seksi'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Personnel Create/Edit Modal (Refined 2-Column Responsive Layout) */}
      <Modal
        isOpen={isPersonModalOpen}
        onClose={() => setIsPersonModalOpen(false)}
        title={editingPersonnel ? 'Edit Jabatan & Tupoksi' : 'Daftarkan Jabatan & Personel Baru'}
        size="2xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button type="button" variant="secondary" onClick={() => setIsPersonModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="form-personnel" variant="primary">
              <HeroCheck className="w-4 h-4 mr-1.5" />
              {editingPersonnel ? 'Perbarui Jabatan' : 'Buat Jabatan'}
            </Button>
          </div>
        }
      >
        <form
          id="form-personnel"
          noValidate
          onSubmit={handleSavePersonnel}
          className="space-y-5 max-h-[62vh] overflow-y-auto pr-1"
        >
          {/* Section 1: Identitas Posisi & Personel */}
          <div className="space-y-3.5">
            <div className="pb-1.5 border-b border-line-divider flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
                Identitas Posisi & Personel
              </span>
              <span className="text-[11px] text-fg-muted font-medium">
                * Wajib diisi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Jabatan / Posisi Penugasan"
                required
                value={prsForm.position}
                onChange={(e) => setPrsForm({ ...prsForm, position: e.target.value })}
                placeholder="Contoh: Koordinator Publikasi"
                helperText="Nama posisi resmi dalam bagan struktur."
              />

              <Input
                label="Nama Personel / Pejabat (Opsional)"
                value={prsForm.name}
                onChange={(e) => setPrsForm({ ...prsForm, name: e.target.value })}
                placeholder="Contoh: Ahmad Fauzi"
                helperText="Kosongkan jika posisi belum terisi pejabat definitif."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Struktur Atasan Langsung (Parent)"
                placeholder="Pilih atasan langsung..."
                options={availableParentOptions}
                value={prsForm.parent_id}
                onValueChange={(val) => setPrsForm({ ...prsForm, parent_id: val })}
                helperText="Kosongkan jika posisi ini adalah pucuk pimpinan utama."
              />

              {sections.length > 0 ? (
                <Select
                  label="Seksi / Divisi Naungan"
                  options={sectionOptions}
                  value={prsForm.section_id}
                  onValueChange={(val) => setPrsForm({ ...prsForm, section_id: val })}
                  helperText="Penempatan divisi operasional."
                />
              ) : (
                <div className="flex flex-col justify-end pb-1 text-xs text-fg-muted">
                  <span className="font-medium text-fg">Seksi / Divisi Naungan</span>
                  <span className="text-[11px] text-fg-muted mt-1">Belum ada seksi yang terdaftar.</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Tugas Pokok, Fungsi & Akuntabilitas */}
          <div className="space-y-3.5 pt-1">
            <div className="pb-1.5 border-b border-line-divider">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
                Tugas Pokok, Fungsi & Akuntabilitas
              </span>
            </div>

            <Textarea
              label="Tupoksi (Tugas Pokok & Fungsi)"
              rows={3}
              autoGrow
              value={prsForm.tupoksi}
              onChange={(e) => setPrsForm({ ...prsForm, tupoksi: e.target.value })}
              placeholder="Uraikan tugas pokok dan rincian fungsi operasional jabatan..."
              helperText="Gunakan baris baru atau penomoran untuk memisahkan butir tugas dan fungsi."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label="Kewenangan Resmi (Wewenang Keputusan)"
                rows={2}
                autoGrow
                value={prsForm.authority}
                onChange={(e) => setPrsForm({ ...prsForm, authority: e.target.value })}
                placeholder="Contoh: Mengesahkan jadwal kerja dan persetujuan teknis..."
                helperText="Hak dan otorisasi pengambilan keputusan."
              />
              <Textarea
                label="Tanggung Jawab (Akuntabilitas Hasil)"
                rows={2}
                autoGrow
                value={prsForm.responsibility}
                onChange={(e) => setPrsForm({ ...prsForm, responsibility: e.target.value })}
                placeholder="Contoh: Kelancaran operasional siaran dan pemeliharaan alat..."
                helperText="Akuntabilitas kinerja kepada pimpinan."
              />
            </div>
          </div>

          {/* Section 3: Kontak Koordinasi */}
          <div className="space-y-3.5 pt-1">
            <div className="pb-1.5 border-b border-line-divider">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
                Kontak Koordinasi (Opsional)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="email"
                label="Email Resmi / Pribadi"
                value={prsForm.email}
                onChange={(e) => setPrsForm({ ...prsForm, email: e.target.value })}
                placeholder="pejabat@organisasi.or.id"
              />
              <Input
                label="No. Telepon / WhatsApp"
                value={prsForm.phone}
                onChange={(e) => setPrsForm({ ...prsForm, phone: e.target.value })}
                placeholder="081234567890"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Structure Export Modal (PDF / PNG / JPG / ZIP) */}
      <StructureExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        personnels={personnels}
        sections={sections}
        organization={currentOrganization}
        selectedPersonnel={selectedPersonnel}
        currentOrientation="horizontal"
      />
    </PageContainer>
  )
}
