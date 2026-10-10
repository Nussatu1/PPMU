import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { PageContainer } from '@/components/layout/PageContainer'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { dataService } from '@/lib/dataService'
import { getOrganizationTree, type OrganizationTreeNode } from '@/lib/hierarchyService'
import { canCreateOrganizationStructure } from '@/lib/authorization'
import type { Organization, OrganizationUnitType } from '@/types/database'

import {
  HeroBuildingOffice,
  HeroArrowLeft,
  HeroCheck,
  HeroDocumentText,
  HeroPlus,
} from '@/components/icons/HeroIcons'

interface FormState {
  name: string
  short_name: string
  code: string
  description: string
  status: 'active' | 'inactive'
  period_active: string
  email: string
  phone: string
  address: string
  parent_id: string | null
  unit_type: OrganizationUnitType
}

const emptyForm = (suggestedParentId?: string | null, suggestedType: OrganizationUnitType = 'organisasi'): FormState => ({
  name: '',
  short_name: '',
  code: '',
  description: '',
  status: 'active',
  period_active: '2024 - 2026',
  email: '',
  phone: '',
  address: '',
  parent_id: suggestedParentId || null,
  unit_type: suggestedType,
})

export const OrganizationCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const parentIdParam = searchParams.get('parentId')

  const { user, refreshOrganizations, switchOrganization } = useAuth()
  const { success, error } = useToast()

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormState>(() => emptyForm(parentIdParam))

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const orgs = await dataService.getOrganizations()
      setOrganizations(orgs)

      const prefilledParentId = parentIdParam || null
      const parentOrg = orgs.find((o) => o.id === prefilledParentId)
      const pType = parentOrg?.unit_type?.toLowerCase()
      const suggestedType: OrganizationUnitType = !prefilledParentId
        ? 'kepala_pengurus'
        : pType === 'kepala_pengurus' || pType === 'pimpinan'
        ? 'waka'
        : pType === 'waka'
        ? 'seksi'
        : pType === 'seksi'
        ? 'organisasi'
        : 'organisasi'

      setFormData((prev) => ({
        ...prev,
        parent_id: prefilledParentId,
        unit_type: prev.unit_type === 'organisasi' && !parentIdParam ? suggestedType : prev.unit_type,
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar organisasi'
      error('Kesalahan', msg)
    } finally {
      setIsLoading(false)
    }
  }, [parentIdParam, error])

  useEffect(() => {
    loadData()
  }, [loadData])

  // RBAC check
  const canCreate = useMemo(() => {
    return canCreateOrganizationStructure(user, undefined, undefined, organizations)
  }, [user, organizations])

  // Parent Options tree
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

    return [
      { value: '', label: '— Tanpa Induk / Tingkat Tertinggi (Root Node) —' },
      ...flat.map((o) => ({
        value: o.id,
        label: `${'  '.repeat(Math.max(0, o.level))}${o.level > 0 ? '└─ ' : ''}${o.name} (${o.code})`,
      })),
    ]
  }, [organizations])

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Auto adjust unit_type when parent changes if user hasn't explicitly customized
  const handleParentChange = (newParentId: string | null) => {
    const parentOrg = organizations.find((o) => o.id === newParentId)
    const pType = parentOrg?.unit_type?.toLowerCase()
    const suggestedType: OrganizationUnitType = !newParentId
      ? 'kepala_pengurus'
      : pType === 'kepala_pengurus' || pType === 'pimpinan'
      ? 'waka'
      : pType === 'waka'
      ? 'seksi'
      : pType === 'seksi'
      ? 'organisasi'
      : 'organisasi'

    setFormData((prev) => ({
      ...prev,
      parent_id: newParentId,
      unit_type: suggestedType,
    }))
  }

  const handleSave = async (e: React.FormEvent, andCreateAnother = false) => {
    e.preventDefault()

    if (!canCreate) {
      error('Akses Ditolak', 'Anda tidak memiliki hak akses untuk menambah unit organisasi.')
      return
    }

    if (!formData.name.trim() || !formData.code.trim()) {
      error('Validasi Gagal', 'Nama dan Kode Organisasi wajib diisi.')
      return
    }

    setIsSaving(true)
    try {
      const currentParent = organizations.find((o) => o.id === formData.parent_id)
      const currentDerivedLevel = formData.parent_id && currentParent ? (currentParent.level ?? 0) + 1 : 0
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const email =
        formData.email.trim() || `${formData.code.toLowerCase().replace(/[^a-z0-9]/g, '')}@ekosistem.id`

      const payload = {
        name: formData.name.trim(),
        short_name: formData.short_name.trim() || undefined,
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        period_active: formData.period_active,
        email,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        parent_id: formData.parent_id || null,
        unit_type: formData.unit_type,
        slug,
        level: currentDerivedLevel,
      }

      const created = await dataService.createOrganization(payload, user)
      try {
        sessionStorage.setItem('filament_bakid_active_org_id', created.id)
      } catch {}
      await refreshOrganizations()
      switchOrganization(created.id)
      success('Organisasi Dibuat', `Unit "${formData.name}" berhasil ditambahkan ke struktur organisasi.`)

      if (andCreateAnother) {
        setFormData(emptyForm(formData.parent_id, formData.unit_type))
        const refreshedOrgs = await dataService.getOrganizations()
        setOrganizations(refreshedOrgs)
      } else {
        navigate('/structures')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat unit organisasi'
      error('Gagal', msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageContainer variant="form">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-0.5">
          <Breadcrumb
            items={[
              { label: 'Organisasi', href: '/structures' },
              { label: 'Struktur Organisasi', href: '/structures' },
              { label: 'Tambah Unit Organisasi' },
            ]}
          />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Tambah Unit Organisasi Baru
          </h1>
          <p className="text-xs sm:text-sm text-fg-muted">
            Daftarkan unit atau hierarki organisasi baru dalam bagan struktur ekosistem.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<HeroArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/structures')}
          className="hidden sm:inline-flex shrink-0 self-start sm:self-auto"
        >
          Kembali ke Struktur
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form noValidate onSubmit={(e) => handleSave(e, false)} className="space-y-6 pb-20 sm:pb-24">
          <div className="space-y-6">
            {/* SECTION 1: IDENTITAS & KODE UNIT */}
            <Section
              title="Identitas & Hierarki Unit"
              icon={<HeroBuildingOffice className="w-5 h-5 text-amber-500" />}
              columns={2}
            >
              <div className="col-span-full">
                <Input
                  label="Nama Organisasi / Unit"
                  required
                  value={formData.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Contoh: KEPALA PENGURUS, WAKA 1, SEKSI KEBERSIHAN, OSIM"
                />
              </div>

              <div>
                <Input
                  label="Nama Pendek / Singkatan"
                  value={formData.short_name}
                  onChange={(e) => setField('short_name', e.target.value)}
                  placeholder="Contoh: KP, WAKA-1, SEK-BER, OSIM"
                />
              </div>

              <div>
                <Input
                  label="Kode Unik Organisasi"
                  required
                  value={formData.code}
                  onChange={(e) => setField('code', e.target.value.toUpperCase())}
                  placeholder="Contoh: KP-01, WAKA-1, SEK-01"
                  className="font-mono uppercase"
                  helperText="Kode alfanumerik unik untuk identifikasi teknis dan integrasi."
                />
              </div>

              <div>
                <Select
                  label="Tipe Unit (Eselon Hierarki)"
                  value={formData.unit_type}
                  onChange={(e) => setField('unit_type', e.target.value as OrganizationUnitType)}
                  options={[
                    { value: 'kepala_pengurus', label: 'Kepala Pengurus (Level 0 - Pucuk Tertinggi)' },
                    { value: 'pimpinan', label: 'Pimpinan Ekosistem (Level 0)' },
                    { value: 'waka', label: 'Wakil Kepala / WAKA (Level 1)' },
                    { value: 'seksi', label: 'Seksi Pengurus (Level 2)' },
                    { value: 'organisasi', label: 'Organisasi Santri / Pelaksana (Level 3)' },
                    { value: 'lembaga', label: 'Lembaga Otonom (Level 3)' },
                    { value: 'kelompok', label: 'Kelompok Kerja' },
                    { value: 'unit', label: 'Unit Teknis Lainnya' },
                  ]}
                  helperText="Eselon hierarki menentukan tingkat otoritas dan struktur pelaporan."
                />
              </div>

              <div>
                <Select
                  label="Induk Organisasi (Parent)"
                  value={formData.parent_id || ''}
                  onChange={(e) => handleParentChange(e.target.value || null)}
                  options={orgParentOptions}
                  helperText="Pilih unit induk untuk menempatkan organisasi ini dalam hierarki yang sesuai."
                />
              </div>
            </Section>

            {/* SECTION 2: URAIAN & KONTAK TAMBAHAN */}
            <Section
              title="Uraian & Profil Unit"
              icon={<HeroDocumentText className="w-5 h-5 text-amber-500" />}
              columns={2}
            >
              <div className="col-span-full">
                <Textarea
                  label="Deskripsi / Fungsi Organisasi"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Jelaskan peran pokok, fungsi, atau ruang lingkup unit organisasi ini..."
                />
              </div>

              <div>
                <Input
                  label="Email Resmi (Opsional)"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="unit@ekosistem.id"
                  helperText="Biarkan kosong jika ingin otomatis dibuatkan berdasarkan kode unit."
                />
              </div>

              <div>
                <Input
                  label="Kontak / Telepon (Opsional)"
                  value={formData.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                />
              </div>
            </Section>
          </div>

          {/* Sticky Footer Action Bar */}
          <div className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line py-3 px-4 sm:px-6 lg:px-8 shadow-lg">
            <div className="max-w-7xl mx-auto flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/structures')}
                className="w-full sm:w-auto justify-center"
              >
                Batal
              </Button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={(e) => handleSave(e as unknown as React.FormEvent, true)}
                  className="w-full sm:w-auto justify-center"
                >
                  <HeroPlus className="w-4 h-4 mr-1.5" />
                  Simpan & Buat Lainnya
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="w-full sm:w-auto justify-center font-semibold"
                >
                  <HeroCheck className="w-4 h-4 mr-1.5" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Organisasi'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </PageContainer>
  )
}
