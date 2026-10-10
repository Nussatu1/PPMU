import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
import type {
  Organization,
  OrganizationStatus,
  OrganizationMembership,
  OrganizationUnitType,
  Section,
  Personnel,
  OrganizationPeriod,
} from '@/types/database'
import { OrganizationTreeView } from '@/components/organization/OrganizationTreeView'
import { OrganizationTree } from '@/components/structure/OrganizationTree'
import { StructureDetailModal } from '@/components/structure/StructureDetailModal'
import { StructureExportModal } from '@/components/structure/StructureExportModal'
import { getOrganizationTree, getDescendantOrganizationIds, type OrganizationTreeNode } from '@/lib/hierarchyService'
import {
  HeroSquares2X2,
  HeroUsers,
  HeroFolder,
  HeroCheck,
  HeroEye,
  HeroArrowsRightLeft,
  HeroArrowDownTray,
  HeroBuildingOffice,
  HeroPlus,
} from '@/components/icons/HeroIcons'
import { cn } from '@/lib/utils'


export const StructurePage: React.FC = () => {
  const { user, currentOrganization, switchOrganization, refreshOrganizations } = useAuth()
  const { success, error } = useToast()
  const { confirm } = useConfirm()

  // Canonical Macro Organization Hierarchy State
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false)

  // Internal Micro Structure State (per currentOrganization)
  const [periods, setPeriods] = useState<OrganizationPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [sections, setSections] = useState<Section[]>([])
  const [personnels, setPersonnels] = useState<Personnel[]>([])
  const [isLoadingInternal, setIsLoadingInternal] = useState(false)

  // View Mode:
  // - 'org_tree': Canonical Macro Organization Hierarchy (Single Source of Truth)
  // - 'tree': Internal Personnel Mind-Map / Chart for currentOrganization
  // - 'cards': Internal Section & Personnel Cards for currentOrganization
  const [viewMode, setViewMode] = useState<'org_tree' | 'tree' | 'cards'>('org_tree')

  // Organization Create / Edit Modal State
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [orgForm, setOrgForm] = useState<{
    name: string
    short_name: string
    code: string
    description: string
    status: OrganizationStatus
    period_active: string
    email: string
    phone: string
    address: string
    parent_id: string | null
    unit_type: OrganizationUnitType
  }>({
    name: '',
    short_name: '',
    code: '',
    description: '',
    status: 'active',
    period_active: '2024 - 2026',
    email: '',
    phone: '',
    address: '',
    parent_id: null,
    unit_type: 'organisasi',
  })

  // Preview Organization Members Modal State
  const [previewMembersOrg, setPreviewMembersOrg] = useState<Organization | null>(null)

  // Detail Modal State (Internal Personnel)
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Export Modal State (Internal Structure)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const orgId = currentOrganization?.id || ''

  // 1. Fetch Canonical Organizations and Memberships
  const loadOrganizations = useCallback(async () => {
    setIsLoadingOrgs(true)
    try {
      dataService.reloadSharedStructural()
      const [allOrgs, allMemberships] = await Promise.all([
        dataService.getOrganizations(user),
        dataService.getMemberships(undefined, user),
      ])
      setOrganizations(allOrgs)
      setMemberships(allMemberships)

      // Jika currentOrganization belum ada atau tidak ada di list, otomatis beralih ke organisasi pertama
      if (allOrgs.length > 0 && (!currentOrganization || !allOrgs.some((o) => o.id === currentOrganization.id))) {
        const savedOrgId = typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem('filament_bakid_active_org_id')
          : null
        const targetOrg = allOrgs.find((o) => o.id === savedOrgId) || allOrgs[0]
        if (targetOrg) {
          switchOrganization(targetOrg.id)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat struktur hierarki organisasi'
      error('Kesalahan', msg)
    } finally {
      setIsLoadingOrgs(false)
    }
  }, [user, error, currentOrganization, switchOrganization])

  // 2. Fetch Internal Structure (Structure, Section, Personnel) for Current Organization
  const loadInternalData = useCallback(async () => {
    if (!orgId) {
      setSections([])
      setPersonnels([])
      setPeriods([])
      setIsLoadingInternal(false)
      return
    }
    setIsLoadingInternal(true)
    try {
      const [, secs, prss, prds] = await Promise.all([
        dataService.getStructures(orgId, user),
        dataService.getSections(orgId, undefined, user),
        dataService.getPersonnels(orgId, undefined, user),
        dataService.getPeriods(orgId, user),
      ])
      setSections(secs)
      setPersonnels(prss)
      setPeriods(prds)

      if (prds.length > 0 && !selectedPeriodId) {
        const activePrd = prds.find((p) => p.is_active) || prds[0]
        setSelectedPeriodId(activePrd.id)
      }

      setSelectedPersonnel((prev) => (prev ? prss.find((p) => p.id === prev.id) || null : null))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat struktur internal'
      error('Kesalahan', msg)
    } finally {
      setIsLoadingInternal(false)
    }
  }, [orgId, user, error, selectedPeriodId])

  // Initial load
  useEffect(() => {
    loadOrganizations()
  }, [loadOrganizations])

  useEffect(() => {
    loadInternalData()
  }, [loadInternalData])

  // Realtime BroadcastChannel & Storage Sync for Canonical Organization Tree
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSync = (collection?: string) => {
      if (!collection || collection === 'organizations' || collection === 'organization_memberships') {
        loadOrganizations()
      }
      if (!collection || collection === 'structures' || collection === 'sections' || collection === 'personnels') {
        loadInternalData()
      }
    }

    let channel: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('filament_structural_sync')
        channel.onmessage = (event) => {
          if (event.data?.type === 'structural_change') {
            handleSync(event.data?.collection)
          }
        }
      }
    } catch {}

    const handleStorageEvent = (event: StorageEvent) => {
      if (
        event.key &&
        (event.key.includes('organizations') ||
          event.key.includes('memberships') ||
          event.key.includes('structures') ||
          event.key.includes('sections') ||
          event.key.includes('personnels'))
      ) {
        handleSync()
      }
    }

    const handleCustomWindowSync = (event: CustomEvent) => {
      handleSync(event.detail?.collection)
    }

    window.addEventListener('storage', handleStorageEvent)
    window.addEventListener('filament_structural_change' as any, handleCustomWindowSync)

    return () => {
      if (channel) channel.close()
      window.removeEventListener('storage', handleStorageEvent)
      window.removeEventListener('filament_structural_change' as any, handleCustomWindowSync)
    }
  }, [loadOrganizations, loadInternalData])

  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false)

  // -------------------------------------------------------------
  // Organization Modal Actions (Hierarchical CRUD without duplication)
  // -------------------------------------------------------------

  const openCreateOrg = () => {
    setEditingOrg(null)
    setIsCodeManuallyEdited(false)
    setOrgForm({
      name: '',
      short_name: '',
      code: '',
      description: '',
      status: 'active',
      period_active: '2024 - 2026',
      email: '',
      phone: '',
      address: '',
      parent_id: null,
      unit_type: 'organisasi',
    })
    setIsOrgModalOpen(true)
  }

  const openEditOrg = (org: Organization) => {
    setEditingOrg(org)
    setIsCodeManuallyEdited(true)
    setOrgForm({
      name: org.name || '',
      short_name: org.short_name || '',
      code: org.code || '',
      description: org.description || '',
      status: org.status || 'active',
      period_active: org.period_active || '2024 - 2026',
      email: org.email || '',
      phone: org.phone || '',
      address: org.address || '',
      parent_id: org.parent_id || null,
      unit_type: (org.unit_type as OrganizationUnitType) || 'organisasi',
    })
    setIsOrgModalOpen(true)
  }

  // Parent Options for Organization Create/Edit (Cycle-protected)
  const orgParentOptions = useMemo(() => {
    const tree = getOrganizationTree(null, organizations)
    const flat: Array<{ id: string; name: string; level: number; code: string }> = []
    const traverse = (nodes: OrganizationTreeNode[]) => {
      for (const node of nodes) {
        flat.push({ id: node.id, name: node.name, level: node.level ?? 0, code: node.code })
        if (node.children?.length) traverse(node.children)
      }
    }
    traverse(tree)

    const descendantIds = editingOrg
      ? getDescendantOrganizationIds(editingOrg.id, organizations, true)
      : []

    const validOrgs = flat.filter((o) => {
      if (!editingOrg) return true
      if (o.id === editingOrg.id) return false
      if (descendantIds.includes(o.id)) return false
      return true
    })

    return [
      { value: '', label: '— Tanpa Induk / Tingkat Tertinggi (Root Node) —' },
      ...validOrgs.map((o) => ({
        value: o.id,
        label: `${'  '.repeat(Math.max(0, o.level))}${o.level > 0 ? '└─ ' : ''}${o.name} (${o.code})`,
      })),
    ]
  }, [organizations, editingOrg])

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgForm.name.trim() || !orgForm.code.trim()) {
      error('Validasi Gagal', 'Nama dan Kode Organisasi wajib diisi')
      return
    }

    if (editingOrg && orgForm.parent_id === editingOrg.id) {
      error('Validasi Gagal', 'Posisi jabatan tidak dapat memilih dirinya sendiri sebagai atasan langsung.')
      return
    }

    try {
      const currentParent = organizations.find((o) => o.id === orgForm.parent_id)
      const currentDerivedLevel = orgForm.parent_id && currentParent ? (currentParent.level ?? 0) + 1 : 0
      const slug = orgForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const email =
        orgForm.email || `${orgForm.code.toLowerCase().replace(/[^a-z0-9]/g, '')}@ekosistem.id`

      const payload = {
        ...orgForm,
        slug,
        email,
        parent_id: orgForm.parent_id || null,
        level: currentDerivedLevel,
      }

      if (editingOrg) {
        await dataService.updateOrganization(editingOrg.id, payload, user)
        success('Jabatan Diperbarui', `Jabatan "${orgForm.name}" berhasil diperbarui.`)
      } else {
        // Enforces assertCanCreateOrganizationStructure
        await dataService.createOrganization(payload, user)
        success('Jabatan Dibuat', `Jabatan "${orgForm.name}" berhasil ditambahkan ke struktur hierarki.`)
      }

      setIsOrgModalOpen(false)
      await refreshOrganizations()
      await loadOrganizations()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan posisi jabatan'
      error('Gagal', msg)
    }
  }

  const handleDeleteOrg = async (org: Organization) => {
    const ok = await confirm({
      title: 'Hapus Organisasi',
      message: `Yakin ingin menghapus organisasi "${org.name}" dari hierarki? Data operasional akan terisolasi.`,
      tone: 'danger',
      confirmLabel: 'Hapus Organisasi',
    })
    if (!ok) return
    try {
      await dataService.deleteOrganization(org.id, user)
      success('Organisasi Dihapus', `Organisasi ${org.name} telah dihapus dari hierarki.`)
      await refreshOrganizations()
      await loadOrganizations()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus organisasi'
      error('Gagal', msg)
    }
  }



  const selectedPersonnelRef = useRef<Personnel | null>(selectedPersonnel)
  useEffect(() => {
    selectedPersonnelRef.current = selectedPersonnel
  }, [selectedPersonnel])

  const handleNodeClick = (prs: Personnel) => {
    if (selectedPersonnelRef.current?.id === prs.id) {
      setIsDetailModalOpen(true)
    } else {
      setSelectedPersonnel(prs)
      selectedPersonnelRef.current = prs
    }
  }

  const handleClearSelection = () => {
    setSelectedPersonnel(null)
    selectedPersonnelRef.current = null
  }



  // Preview Org Members
  const previewOrgMembers = useMemo(() => {
    if (!previewMembersOrg) return []
    return memberships.filter((m) => m.organization_id === previewMembersOrg.id)
  }, [previewMembersOrg, memberships])

  return (
    <PageContainer variant="full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            <HeroSquares2X2 className="w-7 h-7 text-amber-500" />
            Jabatan
          </h1>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Segmented View Switcher: 3 Tampilan Utama */}
          <div className="p-0.5 rounded-lg bg-surface-muted border border-line flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode('org_tree')}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                viewMode === 'org_tree'
                  ? 'bg-surface text-fg shadow-2xs border border-line/60 font-bold'
                  : 'text-fg-muted hover:text-fg'
              )}
            >
              <HeroBuildingOffice className="w-3.5 h-3.5 text-purple-500" />
              <span>Hierarki Jabatan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                viewMode === 'tree'
                  ? 'bg-surface text-fg shadow-2xs border border-line/60 font-bold'
                  : 'text-fg-muted hover:text-fg'
              )}
            >
              <HeroArrowsRightLeft className="w-3.5 h-3.5 text-amber-500" />
              <span>Bagan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                viewMode === 'cards'
                  ? 'bg-surface text-fg shadow-2xs border border-line/60 font-bold'
                  : 'text-fg-muted hover:text-fg'
              )}
            >
              <HeroUsers className="w-3.5 h-3.5 text-blue-500" />
              <span>Seksi</span>
            </button>
          </div>

          <Button
            variant="primary"
            onClick={openCreateOrg}
            className="shrink-0"
          >
            <HeroPlus className="w-4 h-4 mr-1.5" />
            + Tambah Jabatan
          </Button>

          {/* Contextual Action Buttons depending on ViewMode */}
          <Button
            variant="secondary"
            onClick={() => setIsExportModalOpen(true)}
            className="shrink-0"
          >
            <HeroArrowDownTray className="w-4 h-4 mr-1.5 text-amber-500" />
            Ekspor
          </Button>
        </div>
      </div>

      {/* Info Context Banner */}
      {viewMode === 'org_tree' ? (
        <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
              <HeroBuildingOffice className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-fg text-sm">Hierarki Struktur Jabatan</span>
                <Badge variant="success">Otomatis Terbentuk</Badge>
              </div>
              <p className="text-xs text-fg-muted mt-0.5">
                Pohon hierarki terbentuk otomatis dari pembagian <strong>Jabatan</strong>, <strong>Seksi</strong>, dan <strong>Bagan Personel</strong>. Halaman ini berfungsi sebagai visualisasi interaktif dan ekspor dokumen.
              </p>
            </div>
          </div>
          <div className="text-xs text-fg-muted shrink-0 flex items-center gap-2">
            <span>Total Terdaftar: <strong className="text-fg">{organizations.length}</strong> Posisi Jabatan</span>
            {currentOrganization && (
              <>
                <span>•</span>
                <span>Jabatan Aktif: <strong className="text-amber-600 dark:text-amber-400">{currentOrganization.name}</strong></span>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Internal Structure Banner for currentOrganization */
        <div className="p-4 rounded-xl border border-line bg-surface shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-fg text-sm">
                Struktur Internal: {currentOrganization?.name || 'Belum Memilih Jabatan'}
              </span>
              <Badge variant="success">
                {periods.find((p) => p.id === selectedPeriodId)?.name || 'Periode Aktif'}
              </Badge>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">
              Struktur pembagian seksi dan personel internal khusus untuk posisi jabatan yang sedang aktif.
            </p>
          </div>
          <div className="text-xs text-fg-muted flex items-center gap-3 shrink-0">
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
      {viewMode === 'org_tree' ? (
        /* ========================================================
           TAB 1: STRUKTUR ORGANISASI (MACRO CANONICAL HIERARCHY)
           ======================================================== */
        isLoadingOrgs ? (
          <div className="p-16 text-center text-fg-muted border border-line rounded-2xl bg-surface">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <HeroBuildingOffice className="w-8 h-8 text-purple-500 animate-spin" />
              <span className="text-sm font-medium">Memuat hierarki struktur jabatan...</span>
            </div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="p-16 text-center border-2 border-dashed border-line rounded-2xl bg-surface space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <HeroBuildingOffice className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-fg">Belum Ada Struktur Jabatan</h3>
              <p className="text-xs text-fg-muted leading-relaxed">
                Struktur jabatan belum diatur. Buat posisi jabatan baru untuk memulai susunan wewenang.
              </p>
            </div>
            <Button variant="primary" onClick={openCreateOrg} className="mt-2">
              <HeroPlus className="w-4 h-4 mr-2" />
              Tambah Posisi Jabatan
            </Button>
          </div>
        ) : (
          <OrganizationTreeView
            organizations={organizations}
            memberships={memberships}
            currentOrganization={currentOrganization}
            onSwitchOrganization={(orgId) => {
              switchOrganization(orgId)
              success('Organisasi Aktif Diganti', 'Konteks operasional telah beralih ke unit yang dipilih.')
            }}
            onEdit={openEditOrg}
            onDelete={handleDeleteOrg}
            onPreviewMembers={(org) => setPreviewMembersOrg(org)}
          />
        )
      ) : isLoadingInternal ? (
        /* Internal Structure Loading */
        <div className="p-16 text-center text-fg-muted border border-line rounded-2xl bg-surface">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <HeroSquares2X2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-sm font-medium">Memuat struktur personalia internal...</span>
          </div>
        </div>
      ) : personnels.length === 0 ? (
        /* Internal Empty State - Clearly isolated from Macro Org */
        <div className="p-16 text-center border-2 border-dashed border-line rounded-2xl bg-surface space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <HeroSquares2X2 className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-fg">
              Belum Ada Susunan Bagan untuk {currentOrganization?.name || 'Jabatan Ini'}
            </h3>
            <p className="text-xs text-fg-muted leading-relaxed">
              Bagan personel dan seksi dapat langsung ditambahkan untuk melengkapi hierarki kepengurusan.
            </p>
          </div>
          <Button variant="primary" onClick={openCreateOrg} className="mt-2">
            <HeroPlus className="w-4 h-4 mr-2" />
            Tambah Jabatan
          </Button>
        </div>
      ) : viewMode === 'tree' ? (
        /* ========================================================
           TAB 2: BAGAN PERSONEL INTERNAL (MIND-MAP CANVAS)
           ======================================================== */
        <OrganizationTree
          personnels={personnels}
          sections={sections}
          selectedNodeId={selectedPersonnel?.id}
          onNodeClick={handleNodeClick}
          onClearSelection={handleClearSelection}
          onExport={() => setIsExportModalOpen(true)}
        />
      ) : (
        /* ========================================================
           TAB 3: SEKSI & PERSONALIA (CARDS VIEW)
           ======================================================== */
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono text-fg-muted bg-surface px-2 py-0.5 rounded border border-line">
                      {secPersonnel.length} Posisi
                    </span>
                  </div>
                </div>

                {/* Section Personnel List */}
                <div className="p-5 flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-fg-muted uppercase tracking-wider">
                      Daftar Jabatan ({secPersonnel.length})
                    </span>
                  </div>

                  {secPersonnel.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-line rounded-xl text-xs text-fg-muted">
                      Belum ada jabatan pada seksi ini.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {secPersonnel.map((prs) => (
                        <div
                          key={prs.id}
                          className="p-3 rounded-xl border border-line bg-surface-muted/50 hover:bg-surface-muted transition flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-fg text-sm block truncate">
                              {prs.position || prs.role_title}
                            </span>
                            <span className="text-xs text-fg-muted truncate block">
                              {prs.name ? prs.name : 'Pejabat Belum Ditentukan'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPersonnel(prs)
                                setIsDetailModalOpen(true)
                              }}
                              className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-hover-bg transition cursor-pointer"
                              title="Lihat Detail & Tupoksi"
                            >
                              <HeroEye className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* ========================================================
          MODALS
          ======================================================== */}

      {/* Modal Tambah / Ubah Posisi Jabatan (Minimalist & Clean) */}
      <Modal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        title={editingOrg ? `Ubah Posisi: ${editingOrg.name}` : 'Tambah Posisi Jabatan'}
        size="md"
      >
        <form noValidate onSubmit={handleSaveOrg} className="space-y-3.5">
          <Input
            label="Nama Jabatan"
            required
            value={orgForm.name}
            onChange={(e) => {
              const val = e.target.value
              const autoCode = val
                .split(' ')
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 8)
              setOrgForm((prev) => ({
                ...prev,
                name: val,
                code: !editingOrg && !isCodeManuallyEdited ? autoCode : prev.code,
              }))
            }}
            placeholder="Contoh: Ketua, Waka 1, Seksi Pendidikan"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tingkat Hierarki"
              value={orgForm.unit_type}
              onChange={(e) =>
                setOrgForm({ ...orgForm, unit_type: e.target.value as OrganizationUnitType })
              }
              options={[
                { value: 'kepala_pengurus', label: 'Ketua Pengurus (Pucuk)' },
                { value: 'waka', label: 'Wakil Ketua (Waka)' },
                { value: 'seksi', label: 'Seksi Pengurus' },
                { value: 'organisasi', label: 'Jabatan Pelaksana' },
              ]}
            />

            <Input
              label="Kode Jabatan"
              required
              value={orgForm.code}
              onChange={(e) => {
                setIsCodeManuallyEdited(true)
                setOrgForm({ ...orgForm, code: e.target.value.toUpperCase() })
              }}
              placeholder="Misal: KP, WAKA-1, SEK-01"
            />
          </div>

          <Select
            label="Atasan Langsung"
            value={orgForm.parent_id || ''}
            onChange={(e) => setOrgForm({ ...orgForm, parent_id: e.target.value || null })}
            options={orgParentOptions}
          />

          <Textarea
            label="Tupoksi & Kewenangan (Opsional)"
            rows={2}
            value={orgForm.description}
            onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
            placeholder="Deskripsi singkat tugas pokok atau tanggung jawab..."
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => setIsOrgModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              <HeroCheck className="w-4 h-4 mr-1.5" />
              {editingOrg ? 'Perbarui' : 'Simpan Jabatan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview Members Modal (For Organization Node) */}
      {previewMembersOrg && (
        <Modal
          isOpen={!!previewMembersOrg}
          onClose={() => setPreviewMembersOrg(null)}
          title={`Daftar Akun: ${previewMembersOrg.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-surface-muted rounded-xl border border-line flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-fg">{previewMembersOrg.name}</span>
                <span className="font-mono text-fg-muted">({previewMembersOrg.code})</span>
              </div>
              <Badge variant="primary">{previewOrgMembers.length} Akun Terdaftar</Badge>
            </div>

            <div className="border border-line rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-muted text-fg-muted font-semibold border-b border-line">
                  <tr>
                    <th className="py-2.5 px-3">Nama Akun</th>
                    <th className="py-2.5 px-3">Tingkat</th>
                    <th className="py-2.5 px-3">Peran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {previewOrgMembers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-fg-muted">
                        Belum ada akun yang ditugaskan pada unit ini.
                      </td>
                    </tr>
                  ) : (
                    previewOrgMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-hover-bg transition">
                        <td className="py-2.5 px-3 font-semibold text-fg">
                          {m.user?.name || m.user_id}
                          <div className="text-[11px] font-mono text-fg-muted font-normal">
                            {m.user?.email}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={m.level === 'admin' ? 'primary' : 'gray'}>
                            {m.level === 'admin' ? 'Admin' : 'Anggota'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-fg font-medium">
                          {m.role?.name || 'Pengurus'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setPreviewMembersOrg(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Personnel Detail Modal (Tupoksi, Wewenang, Tanggung Jawab - Read Only) */}
      <StructureDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        personnel={selectedPersonnel}
        allPersonnels={personnels}
        sections={sections}
        onSelectNode={(prs) => {
          setSelectedPersonnel(prs)
        }}
      />

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
