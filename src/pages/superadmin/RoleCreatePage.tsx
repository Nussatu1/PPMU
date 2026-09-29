import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import type { PermissionAction, PermissionResource } from '@/types/database'
import {
  HeroShieldCheck,
  HeroChevronDown,
  HeroMagnifyingGlass,
  HeroPlus,
} from '@/components/icons/HeroIcons'

interface ShieldActionItem {
  key: PermissionAction
  label: string
}

const SHIELD_ACTIONS_GRID: ShieldActionItem[] = [
  // Row 1
  { key: 'view', label: 'Lihat' },
  { key: 'viewAny', label: 'Lihat Apa Saja' },
  { key: 'create', label: 'Buat' },
  { key: 'update', label: 'Perbarui' },
  // Row 2
  { key: 'restore', label: 'Pulihkan' },
  { key: 'restoreAny', label: 'Pulihkan Apa Saja' },
  { key: 'replicate', label: 'Replikasi' },
  { key: 'reorder', label: 'Susun Ulang' },
  // Row 3
  { key: 'delete', label: 'Hapus' },
  { key: 'deleteAny', label: 'Hapus Apa Saja' },
  { key: 'forceDelete', label: 'Paksa Hapus' },
  { key: 'forceDeleteAny', label: 'Paksa Hapus Apa Saja' },
]

interface ResourceConfigItem {
  key: PermissionResource
  title: string
  model: string
}

const RESOURCES_CONFIG: ResourceConfigItem[] = [
  { key: 'Organization', title: 'Organisasi & Tenant', model: 'App\\Models\\Organization' },
  { key: 'Admin', title: 'Admin Organisasi', model: 'App\\Models\\Admin' },
  { key: 'Role', title: 'Peran & Izin (RBAC)', model: 'App\\Models\\Role' },
  { key: 'Structure', title: 'Struktur & Seksi', model: 'App\\Models\\Structure' },
  { key: 'Program', title: 'Program Kerja', model: 'App\\Models\\Program' },
  { key: 'Agenda', title: 'Agenda & Kegiatan', model: 'App\\Models\\Agenda' },
  { key: 'Performance', title: 'Capaian Kinerja (KPI)', model: 'App\\Models\\Performance' },
  { key: 'Finance', title: 'Anggaran & Keuangan', model: 'App\\Models\\Finance' },
  { key: 'Report', title: 'Laporan & Evaluasi', model: 'App\\Models\\Report' },
  { key: 'Task', title: 'Tugas & Tindak Lanjut', model: 'App\\Models\\Task' },
  { key: 'Document', title: 'Dokumen & Lampiran', model: 'App\\Models\\Document' },
  { key: 'Audit', title: 'Audit Log & Jejak Sistem', model: 'App\\Models\\Audit' },
]

const PAGES_CONFIG = [
  { key: 'Dashboard', title: 'Dashboard Utama', model: 'App\\Filament\\Pages\\Dashboard' },
  { key: 'Shield', title: 'Matriks Hak Akses & Shield', model: 'App\\Filament\\Pages\\Shield' },
  { key: 'Profile', title: 'Profil & Keamanan Akun', model: 'App\\Filament\\Pages\\Profile' },
  { key: 'Settings', title: 'Pengaturan Organisasi', model: 'App\\Filament\\Pages\\Settings' },
  { key: 'ExportReport', title: 'Ekspor & Cetak Laporan', model: 'App\\Filament\\Pages\\ExportReport' },
]

const WIDGETS_CONFIG = [
  { key: 'StatsOverview', title: 'Ringkasan Statistik Organisasi', model: 'App\\Filament\\Widgets\\StatsOverviewWidget' },
  { key: 'BudgetChart', title: 'Grafik Realisasi Anggaran', model: 'App\\Filament\\Widgets\\BudgetChartWidget' },
  { key: 'UpcomingAgendas', title: 'Kalender Agenda Mendatang', model: 'App\\Filament\\Widgets\\UpcomingAgendasWidget' },
  { key: 'KpiProgress', title: 'Target Capaian KPI Seksi', model: 'App\\Filament\\Widgets\\KpiProgressWidget' },
  { key: 'LatestAuditLogs', title: 'Aktivitas Log Terbaru', model: 'App\\Filament\\Widgets\\LatestAuditLogsWidget' },
]

export const RoleCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cloneFromId = searchParams.get('cloneFrom')
  const { user } = useAuth()
  const { success, error } = useToast()

  // Form states (Minimal & Compact)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [scope, setScope] = useState('organization')
  const [isSaving, setIsSaving] = useState(false)


  // Active Tab: 'resources' | 'pages' | 'widgets'
  const [activeTab, setActiveTab] = useState<'resources' | 'pages' | 'widgets'>('resources')

  // Search filter
  const [searchQuery, setSearchQuery] = useState('')

  // Collapsed accordion map (false = open, true = collapsed)
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({})

  // Set of selected permissions
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())

  // Load existing roles and handle cloneFrom
  useEffect(() => {
    if (cloneFromId) {
      dataService.getRoles(undefined, user).then((rls) => {
        const found = rls.find((r) => r.id === cloneFromId)
        if (found) {
          setName(`Salinan ${found.name}`)
          setSlug(`salinan-${found.slug}`)
          setSelectedPermissions(new Set(found.permissions))
        }
      })
    }
  }, [cloneFromId, user])


  // Auto-slug generator
  const handleNameChange = (val: string) => {
    setName(val)
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    setSlug(generatedSlug)
  }

  // Toggle individual permission
  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Toggle all permissions for a specific resource
  const toggleResourceSelectAll = (resKey: PermissionResource) => {
    const resKeys = SHIELD_ACTIONS_GRID.map((a) => `${resKey}.${a.key}`)
    const isAllChecked = resKeys.every((k) => selectedPermissions.has(k))

    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      if (isAllChecked) {
        resKeys.forEach((k) => next.delete(k))
      } else {
        resKeys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  // Set read-only permissions for a specific resource
  const setResourceReadOnly = (resKey: PermissionResource) => {
    const readActionKeys = ['view_any', 'view']
    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      SHIELD_ACTIONS_GRID.forEach((a) => {
        const key = `${resKey}.${a.key}`
        if (readActionKeys.includes(a.key)) {
          next.add(key)
        } else {
          next.delete(key)
        }
      })
      return next
    })
  }

  // Bulk actions for current active tab
  const checkAllCurrentTab = () => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      if (activeTab === 'resources') {
        RESOURCES_CONFIG.forEach((r) => {
          SHIELD_ACTIONS_GRID.forEach((a) => next.add(`${r.key}.${a.key}`))
        })
      } else if (activeTab === 'pages') {
        PAGES_CONFIG.forEach((p) => next.add(`Page.${p.key}`))
      } else if (activeTab === 'widgets') {
        WIDGETS_CONFIG.forEach((w) => next.add(`Widget.${w.key}`))
      }
      return next
    })
  }

  const uncheckAllCurrentTab = () => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      if (activeTab === 'resources') {
        RESOURCES_CONFIG.forEach((r) => {
          SHIELD_ACTIONS_GRID.forEach((a) => next.delete(`${r.key}.${a.key}`))
        })
      } else if (activeTab === 'pages') {
        PAGES_CONFIG.forEach((p) => next.delete(`Page.${p.key}`))
      } else if (activeTab === 'widgets') {
        WIDGETS_CONFIG.forEach((w) => next.delete(`Widget.${w.key}`))
      }
      return next
    })
  }

  // Toggle accordion collapse
  const toggleAccordion = (key: string) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const toggleAllAccordions = (expand: boolean) => {
    const newMap: Record<string, boolean> = {}
    if (!expand) {
      RESOURCES_CONFIG.forEach((r) => {
        newMap[r.key] = true
      })
      PAGES_CONFIG.forEach((p) => {
        newMap[`page-${p.key}`] = true
      })
      WIDGETS_CONFIG.forEach((w) => {
        newMap[`widget-${w.key}`] = true
      })
    }
    setCollapsedMap(newMap)
  }

  // Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      error('Validasi Gagal', 'Nama Peran wajib diisi')
      return
    }

    setIsSaving(true)
    try {
      await dataService.createRole(
        {
          name: name.trim(),
          description: `Peran ${name.trim()} (${scope === 'system' ? 'Sistem Global' : 'Organisasi'})`,
          permissions: Array.from(selectedPermissions),
          status: 'active',
          is_system: scope === 'system',
        },
        user
      )

      success('Peran Dibuat', `Peran ${name} berhasil dibuat dengan ${selectedPermissions.size} hak akses.`)
      navigate('/roles')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat peran'
      error('Gagal', msg)
    } finally {
      setIsSaving(false)
    }
  }

  // Filtered lists
  const filteredResources = RESOURCES_CONFIG.filter((r) => {
    const q = searchQuery.toLowerCase().trim()
    return !q || r.title.toLowerCase().includes(q) || r.model.toLowerCase().includes(q) || r.key.toLowerCase().includes(q)
  })

  const filteredPages = PAGES_CONFIG.filter((p) => {
    const q = searchQuery.toLowerCase().trim()
    return !q || p.title.toLowerCase().includes(q) || p.model.toLowerCase().includes(q)
  })

  const filteredWidgets = WIDGETS_CONFIG.filter((w) => {
    const q = searchQuery.toLowerCase().trim()
    return !q || w.title.toLowerCase().includes(q) || w.model.toLowerCase().includes(q)
  })

  return (
    <PageContainer variant="full">
      <form noValidate onSubmit={handleSave} className="space-y-4">
        {/* Header (Minimal & Compact) */}
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[
              { label: 'Superadmin', href: '/organizations' },
              { label: 'Peran & Izin', href: '/roles' },
              { label: 'Buat Peran Baru' },
            ]}
          />
          <div className="flex items-center gap-2.5 mt-0.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <HeroShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg flex items-center gap-2">
                Buat Peran Baru & Atur Matriks Izin
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Shield RBAC
                </span>
              </h1>
              <p className="text-xs text-fg-muted mt-0.5">
                Atur izin per sumber daya, halaman, dan widget.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 1: METADATA PERAN (MINIMAL 1-ROW CARD) */}
        <div className="rounded-xl border border-line bg-surface p-3.5 sm:p-4 shadow-2xs">
          <div className="grid grid-cols-12 gap-3.5">
            {/* Nama Peran (5 Kolom) */}
            <div className="col-span-12 md:col-span-5">
              <Input
                label="Nama Peran"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Contoh: Auditor Internal"
              />
            </div>

            {/* Slug (3 Kolom) */}
            <div className="col-span-12 md:col-span-3">
              <Input
                label="Slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auditor-internal"
                className="font-mono text-xs"
              />
            </div>

            {/* Ruang Lingkup / Guard (4 Kolom) */}
            <div className="col-span-12 md:col-span-4">
              <Select
                label="Ruang Lingkup (Guard)"
                required
                value={scope}
                onValueChange={(val) => setScope(String(val))}
                options={[
                  { value: 'organization', label: 'Organisasi (Multi-Tenant)' },
                  { value: 'system', label: 'Sistem Global (Superadmin)' },
                ]}
              />
            </div>
          </div>
        </div>


        {/* SECTION 2: FILAMENT SHIELD NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-line pb-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-surface text-amber-600 dark:text-amber-400 border border-line shadow-2xs font-bold'
                : 'text-fg-muted hover:text-fg hover:bg-hover-bg'
            }`}
          >
            <span>Sumber Daya</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              144
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pages')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'pages'
                ? 'bg-surface text-amber-600 dark:text-amber-400 border border-line shadow-2xs font-bold'
                : 'text-fg-muted hover:text-fg hover:bg-hover-bg'
            }`}
          >
            <span>Halaman</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              5
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('widgets')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'widgets'
                ? 'bg-surface text-amber-600 dark:text-amber-400 border border-line shadow-2xs font-bold'
                : 'text-fg-muted hover:text-fg hover:bg-hover-bg'
            }`}
          >
            <span>Widget</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              5
            </span>
          </button>
        </div>

        {/* TOOLBAR SEARCH & BULK ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface-muted/50 p-2.5 rounded-xl border border-line">
          <div className="relative w-full sm:w-80">
            <HeroMagnifyingGlass className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari sumber daya / model..."
              className="w-full h-8.5 pl-9 pr-3 text-xs bg-surface border border-line rounded-lg text-fg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button type="button" size="xs" variant="secondary" onClick={() => toggleAllAccordions(true)}>
              Buka Semua
            </Button>
            <Button type="button" size="xs" variant="secondary" onClick={() => toggleAllAccordions(false)}>
              Tutup Semua
            </Button>
            <Button type="button" size="xs" variant="secondary" onClick={checkAllCurrentTab}>
              Pilih Semua
            </Button>
            <Button type="button" size="xs" variant="secondary" onClick={uncheckAllCurrentTab}>
              Kosongkan Semua
            </Button>
          </div>
        </div>

        {/* TAB 1: SUMBER DAYA CARDS (PERSIS SEPERTI DI GAMBAR CONTOH) */}
        {activeTab === 'resources' && (
          <div className="space-y-3.5">

            {filteredResources.map((res) => {
              const resKeys = SHIELD_ACTIONS_GRID.map((a) => `${res.key}.${a.key}`)
              const activeCount = resKeys.filter((k) => selectedPermissions.has(k)).length
              const isCollapsed = !!collapsedMap[res.key]

              return (
                <div key={res.key} className="rounded-xl border border-line bg-surface shadow-2xs overflow-hidden">
                  {/* Card Header: Judul + Model + Chevron */}
                  <div
                    onClick={() => toggleAccordion(res.key)}
                    className="flex items-center justify-between p-3.5 sm:px-5 cursor-pointer bg-surface hover:bg-hover-bg/50 transition-colors select-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base font-bold text-fg tracking-tight">{res.title}</span>
                      <span className="text-xs text-fg-muted font-mono mt-0.5">{res.model}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          activeCount > 0
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-surface-muted text-fg-muted border-line'
                        }`}
                      >
                        {activeCount}/12
                      </span>
                      <HeroChevronDown
                        className={`w-4 h-4 text-fg-muted transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Card Body: Pilih semua + Hanya Baca + Grid 4 Kolom x 3 Baris */}
                  {!isCollapsed && (
                    <div className="p-4 sm:px-5 pt-3 border-t border-line bg-surface-muted/20">
                      <div className="mb-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleResourceSelectAll(res.key)}
                          className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                        >
                          Pilih semua
                        </button>
                        <span className="text-xs text-fg-muted">·</span>
                        <button
                          type="button"
                          onClick={() => setResourceReadOnly(res.key)}
                          className="text-xs font-semibold text-fg-muted hover:text-amber-600 dark:hover:text-amber-400 hover:underline cursor-pointer"
                        >
                          Hanya Baca
                        </button>
                      </div>

                      {/* 4 COLUMNS X 3 ROWS GRID PERSIS SEPERTI DI GAMBAR */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-3 gap-x-6">
                        {SHIELD_ACTIONS_GRID.map((act) => {
                          const permKey = `${res.key}.${act.key}`
                          const isChecked = selectedPermissions.has(permKey)

                          return (
                            <div
                              key={act.key}
                              onClick={() => togglePermission(permKey)}
                              className="flex items-center gap-2.5 cursor-pointer select-none group"
                            >
                              <Checkbox checked={isChecked} onChange={() => {}} />
                              <span className="text-xs font-medium text-fg group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {act.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* TAB 2: HALAMAN (PAGES) */}
        {activeTab === 'pages' && (
          <div className="space-y-3.5">
            {filteredPages.map((page) => {
              const permKey = `Page.${page.key}`
              const isChecked = selectedPermissions.has(permKey)
              const isCollapsed = !!collapsedMap[`page-${page.key}`]

              return (
                <div key={page.key} className="rounded-xl border border-line bg-surface shadow-2xs overflow-hidden">
                  <div
                    onClick={() => toggleAccordion(`page-${page.key}`)}
                    className="flex items-center justify-between p-3.5 sm:px-5 cursor-pointer bg-surface hover:bg-hover-bg/50 transition-colors select-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base font-bold text-fg tracking-tight">{page.title}</span>
                      <span className="text-xs text-fg-muted font-mono mt-0.5">{page.model}</span>
                    </div>

                    <HeroChevronDown
                      className={`w-4 h-4 text-fg-muted transition-transform duration-200 ${
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}
                    />
                  </div>

                  {!isCollapsed && (
                    <div className="p-4 sm:px-5 pt-3 border-t border-line bg-surface-muted/20">
                      <div
                        onClick={() => togglePermission(permKey)}
                        className="flex items-center gap-2.5 cursor-pointer select-none group"
                      >
                        <Checkbox checked={isChecked} onChange={() => {}} />
                        <span className="text-xs font-medium text-fg group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          Akses Halaman
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* TAB 3: WIDGET */}
        {activeTab === 'widgets' && (
          <div className="space-y-3.5">
            {filteredWidgets.map((w) => {
              const permKey = `Widget.${w.key}`
              const isChecked = selectedPermissions.has(permKey)
              const isCollapsed = !!collapsedMap[`widget-${w.key}`]

              return (
                <div key={w.key} className="rounded-xl border border-line bg-surface shadow-2xs overflow-hidden">
                  <div
                    onClick={() => toggleAccordion(`widget-${w.key}`)}
                    className="flex items-center justify-between p-3.5 sm:px-5 cursor-pointer bg-surface hover:bg-hover-bg/50 transition-colors select-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base font-bold text-fg tracking-tight">{w.title}</span>
                      <span className="text-xs text-fg-muted font-mono mt-0.5">{w.model}</span>
                    </div>

                    <HeroChevronDown
                      className={`w-4 h-4 text-fg-muted transition-transform duration-200 ${
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}
                    />
                  </div>

                  {!isCollapsed && (
                    <div className="p-4 sm:px-5 pt-3 border-t border-line bg-surface-muted/20">
                      <div
                        onClick={() => togglePermission(permKey)}
                        className="flex items-center gap-2.5 cursor-pointer select-none group"
                      >
                        <Checkbox checked={isChecked} onChange={() => {}} />
                        <span className="text-xs font-medium text-fg group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          Tampilkan Widget
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* STICKY FOOTER ACTION BAR */}
        <div className="sticky bottom-0 z-30 flex items-center justify-between p-3.5 sm:px-6 bg-surface border border-line rounded-xl shadow-lg mt-6">
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <span>Total Izin Terpilih:</span>
            <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">{selectedPermissions.size} Izin</strong>
          </div>

          <div className="flex items-center gap-2.5">
            <Button type="button" variant="secondary" onClick={() => navigate('/roles')}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              icon={<HeroPlus className="w-4 h-4 mr-1.5" />}
            >
              {isSaving ? 'Memproses...' : 'Buat'}
            </Button>
          </div>
        </div>
      </form>
    </PageContainer>
  )
}
