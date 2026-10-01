// ==============================================================================
// FILAMENT ECOSYSTEM & PERFORMANCE DATABASE TYPES
// Multi-Organization + Superadmin + RBAC + Organization Performance Workflows
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. RBAC & PERMISSION TYPES
// ------------------------------------------------------------------------------

export type PermissionAction =
  | 'view'
  | 'viewAny'
  | 'create'
  | 'update'
  | 'restore'
  | 'restoreAny'
  | 'replicate'
  | 'reorder'
  | 'delete'
  | 'deleteAny'
  | 'forceDelete'
  | 'forceDeleteAny'

export type PermissionResource =
  | 'Organization'
  | 'Admin'
  | 'Role'
  | 'Structure'
  | 'Program'
  | 'Agenda'
  | 'Performance'
  | 'Finance'
  | 'Report'
  | 'Task'
  | 'Document'
  | 'Audit'

export interface PermissionItem {
  id: string
  resource: PermissionResource
  action: PermissionAction
  name: string
  description?: string
}

export interface RoleEntity {
  id: string
  organization_id?: string
  name: string
  slug?: string
  description?: string
  status: 'active' | 'inactive'
  is_system?: boolean
  permissions: string[] // e.g. ["Program.view", "Program.create", "Report.update"]
  created_at: string
  updated_at?: string
}

// ------------------------------------------------------------------------------
// 2. CORE USERS & MULTI-ORGANIZATION MEMBERSHIP
// ------------------------------------------------------------------------------

export type Role = 'superadmin' | 'admin' | 'editor' | 'member' | string
export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface User {
  id: string
  name: string
  username?: string
  email: string
  avatar_url?: string
  role: Role
  status: UserStatus
  is_superadmin?: boolean
  password_hash?: string
  phone?: string
  must_change_password?: boolean
  created_at: string
  updated_at?: string
  // Virtual joined properties
  active_membership?: OrganizationMembership
  memberships?: OrganizationMembership[]
}

export type OrganizationStatus = 'active' | 'inactive' | 'archived' | 'trial' | 'suspended'

export type OrganizationUnitType =
  | 'pimpinan'
  | 'lembaga'
  | 'kelompok'
  | 'unit'
  | string

export type OrganizationScopeMode = 'own' | 'descendants'

export interface OrganizationScopeOptions {
  organizationId: string
  mode?: OrganizationScopeMode
}

export type OrganizationScopeInput = string | OrganizationScopeOptions

export interface Organization {
  id: string
  parent_id?: string | null
  unit_type?: OrganizationUnitType
  level?: number // 0 = root / pimpinan, 1 = lembaga, 2 = kelompok, 3+ = level n (arbitrary depth)
  depth?: number // alias for level
  name: string
  short_name?: string // Nama khusus atau singkatan (e.g. "Jamub")
  code: string // e.g. "ORG-JKT-01"
  slug?: string
  description?: string
  email?: string
  phone?: string
  address?: string
  logo_url?: string
  period_active?: string // e.g. "2024 - 2029"
  subscription_plan?: 'basic' | 'pro' | 'enterprise'
  status: OrganizationStatus
  created_at: string
  updated_at?: string
  // Virtual relations
  parent?: Organization | null
  children?: Organization[]
}

export interface OrganizationPeriod {
  id: string
  organization_id: string
  name: string // e.g. "Periode Kepengurusan 2024 - 2026"
  period_start: string // e.g. "2024-01-01"
  period_end: string // e.g. "2026-12-31"
  is_active: boolean
  status: 'active' | 'archived'
  created_at: string
  updated_at?: string
}

export type MembershipStatus = 'active' | 'inactive' | 'suspended'
export type MembershipLevel = 'admin' | 'anggota'

export interface OrganizationMembership {
  id: string
  user_id: string
  organization_id: string
  role_id: string
  status: MembershipStatus
  level?: MembershipLevel
  permission_overrides?: string[] // optional direct permission adjustments
  joined_at?: string
  created_at?: string
  updated_at?: string
  // Relations
  user?: User
  organization?: Organization
  role?: RoleEntity
}

// ------------------------------------------------------------------------------
// 3. STRUKTUR ORGANISASI
// ------------------------------------------------------------------------------

export interface Structure {
  id: string
  organization_id: string
  period_id?: string
  period_name?: string // e.g. "Kepengurusan 2025 - 2027"
  name?: string // alias for period_name
  start_year?: number | string
  end_year?: number | string
  period_start?: number | string
  period_end?: number | string
  description?: string
  is_active?: boolean
  leader_name?: string
  leader_title?: string // e.g. "Ketua Umum"
  leader_avatar?: string
  status?: 'active' | 'archived'
  created_at: string
  updated_at?: string
}

export interface Section {
  id: string
  structure_id: string
  organization_id: string
  name: string // e.g. "Seksi Pengembangan Produk & Teknologi"
  code: string // e.g. "SEK-IT"
  description?: string
  duties?: string // Tupoksi
  leader_name?: string
  sort_order?: number
  created_at: string
}

export type StructureNodeType = 'ketua' | 'seksi' | 'jabatan' | 'personel'

export interface Personnel {
  id: string
  section_id: string
  organization_id: string
  period_id?: string
  user_id?: string | null
  name?: string
  role_title?: string // e.g. "Staff Ahli", "Sekretaris Seksi"
  position?: string // alias for role_title / jabatan (WAJIB)
  node_type?: StructureNodeType
  parent_id?: string | null // Id atasan / parent jabatan
  tupoksi?: string // Tugas Pokok & Fungsi
  main_tasks?: string // Tugas Pokok
  functions?: string // Fungsi
  authority?: string // Kewenangan
  responsibility?: string // Tanggung Jawab
  sort_order?: number
  status?: string
  nip?: string
  phone?: string
  email?: string
  created_at: string
  updated_at?: string
  section?: Section
  user?: User
  children?: Personnel[]
  parent?: Personnel | null
}

// ------------------------------------------------------------------------------
// 4. PROGRAM KERJA (PUSAT HUBUNGAN DATA OPERASIONAL)
// ------------------------------------------------------------------------------

export type ProgramStatus =
  | 'draft'
  | 'submitted'
  | 'revised'
  | 'approved'
  | 'active'
  | 'completed'
  | 'closed'

export interface Program {
  id: string
  organization_id: string
  period_id?: string
  section_id: string
  name?: string
  title?: string // alias for name
  code: string
  description?: string
  background?: string
  objectives?: string // Tujuan
  targets?: string // Sasaran
  target_kpi?: string
  indicator?: string // Indikator Kinerja Utama
  target_value?: number
  target_unit?: string // e.g. "Kegiatan", "Peserta", "Dokumen", "%"
  pic_personnel_id?: string // PIC linked to Structure / Personnel
  pic_structure_id?: string // Alias for pic_personnel_id
  pic_name?: string
  timeline_start?: string
  timeline_end?: string
  start_date?: string
  end_date?: string
  budget_planned?: number
  budget_allocated?: number
  budget_realized?: number
  created_by?: string
  approved_by?: string
  status: ProgramStatus
  revision_notes?: string
  // Stage 6: Downward Control — unit organisasi penerima / delegasi
  assigned_to_organization_id?: string | null
  created_at: string
  updated_at?: string
  // Virtual relations
  agendas?: Agenda[]
  performances?: Performance[]
  section?: Section
  organization?: Organization
  pic_personnel?: Personnel
  assigned_to_organization?: Organization | null
}

// ------------------------------------------------------------------------------
// 5. AGENDA & PELAKSANAAN
// ------------------------------------------------------------------------------

export type AgendaStatus =
  | 'planned'
  | 'approved'
  | 'upcoming'
  | 'in_progress'
  | 'completed'
  | 'evaluated'

export interface Agenda {
  id: string
  organization_id: string
  program_id: string
  section_id?: string
  title: string
  description?: string
  date?: string
  start_time?: string
  end_time?: string
  time_start?: string
  time_end?: string
  location: string
  budget_estimated?: number
  participants_target?: string
  actual_participants?: number
  pic_name?: string
  pic_user_id?: string
  status: AgendaStatus
  notes?: string
  documentation_urls?: string[]
  created_at: string
  // Relations
  program?: Program
  section?: Section
  pic_user?: User
}

// ------------------------------------------------------------------------------
// 6. KINERJA & TARGET REALISASI
// ------------------------------------------------------------------------------

export type PerformanceStatus =
  | 'not_started'
  | 'in_progress'
  | 'delayed'
  | 'needs_attention'
  | 'achieved'
  | 'evaluated'

export interface Performance {
  id: string
  organization_id: string
  program_id: string
  kpi_name?: string
  target?: number
  realized?: number
  unit?: string
  period?: string
  target_value?: number
  realized_value?: number
  percentage?: number
  status?: PerformanceStatus
  evidence_urls?: string[]
  notes?: string
  validated_by?: string
  validated_at?: string
  created_at: string
  updated_at?: string
  // Relations
  program?: Program
}

// ------------------------------------------------------------------------------
// 7. KEUANGAN & ANGGARAN
// ------------------------------------------------------------------------------

export type BudgetStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'disbursed'
  | 'transacted'
  | 'verified'

export interface Budget {
  id: string
  organization_id: string
  program_id: string
  planned_amount?: number
  approved_amount?: number
  disbursed_amount?: number
  allocated_amount?: number
  amount_allocated?: number
  amount_spent?: number
  realized_amount?: number
  remaining_balance?: number
  fiscal_year?: number
  status?: BudgetStatus
  notes?: string
  created_at: string
  updated_at?: string
  // Relations
  program?: Program
  transactions?: Transaction[]
}

export interface Transaction {
  id: string
  organization_id: string
  program_id?: string
  budget_id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  date?: string
  transaction_date?: string
  receipt_url?: string
  proof_url?: string
  category?: string
  recorded_by?: string
  verified_by?: string
  created_at: string
  // Relations
  budget?: Budget
  recorder?: User
}

// ------------------------------------------------------------------------------
// 8. PELAPORAN & VERIFIKASI KETUA
// ------------------------------------------------------------------------------

export type ReportStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'revised'
  | 'approved'
  | 'archived'

export interface Report {
  id: string
  organization_id: string
  program_id: string
  title: string
  period: string
  summary?: string
  content?: string // alias for summary
  achievement_summary?: string
  realization_summary?: string
  finance_summary?: string
  budget_spent?: number
  evaluation_constraints?: string // Kendala
  evaluation_lessons?: string // Pembelajaran
  evaluation_recommendations?: string // Rekomendasi
  documentation_urls?: string[]
  status: ReportStatus
  submitted_at?: string
  author_id?: string
  author?: User | { name: string; email?: string } | string
  reviewer_id?: string
  reviewer?: User | { name: string } | null
  verified_by?: string
  verified_at?: string
  reviewed_at?: string
  review_notes?: string
  revision_notes?: string
  created_at: string
  // Relations
  program?: Program
}

// ------------------------------------------------------------------------------
// 9. TINDAK LANJUT & TUGAS (FOLLOW-UP TASKS)
// ------------------------------------------------------------------------------

export type TaskStatus =
  | 'new'
  | 'in_progress'
  | 'pending_verification'
  | 'revised'
  | 'completed'

export interface Task {
  id: string
  organization_id: string
  program_id?: string
  agenda_id?: string
  report_id?: string
  source?: string // Temuan evaluasi / rekomendasi laporan
  source_type?: 'evaluasi' | 'monitoring' | 'laporan' | 'program' | string
  title: string
  description: string
  pic_name?: string
  pic_user_id?: string
  pic_personnel_id?: string
  assigned_to?: string // alias for pic_user_id
  deadline?: string
  due_date?: string // alias for deadline
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: TaskStatus
  result?: string // Hasil pengerjaan
  completion_notes?: string // alias for result
  verification_notes?: string
  verified_by?: string
  verified_at?: string
  completed_at?: string
  created_at: string
  updated_at?: string
  // Stage 6: Downward Control — unit organisasi penerima / delegasi
  assigned_to_organization_id?: string | null
  // Relations
  program?: Program
  agenda?: Agenda
  assignee?: User | { name: string }
  assigned_to_organization?: Organization | null
}

// ------------------------------------------------------------------------------
// 10. NOTIFIKASI
// ------------------------------------------------------------------------------

export interface Notification {
  id: string
  organization_id?: string
  user_id?: string
  recipient_user_id?: string
  type:
    | 'program_submitted'
    | 'program_approved'
    | 'program_revised'
    | 'agenda_upcoming'
    | 'deadline_approaching'
    | 'performance_delayed'
    | 'report_submitted'
    | 'report_approved'
    | 'report_revised'
    | 'task_assigned'
    | 'task_completed'
    | 'action_required'
    | 'success'
    | 'warning'
    | 'info'
    | string
  title: string
  message: string
  link?: string
  related_resource?: string
  related_id?: string
  is_read: boolean
  created_at: string
}

// ------------------------------------------------------------------------------
// 11. AUDIT LOG (PERMANEN, DILIHAT SUPERADMIN)
// ------------------------------------------------------------------------------

export interface AuditLog {
  id: string
  organization_id?: string
  organization_name?: string
  user_id: string
  user_name: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'FORCE_DELETE' | 'LOGIN' | 'LOGOUT' | 'PASSWORD_RESET' | 'STATUS_CHANGE' | 'APPROVAL' | 'REVISION' | 'create' | 'update' | 'delete' | string
  resource: string
  resource_type?: string
  resource_id: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// ------------------------------------------------------------------------------
// 12. EXISTING E-COMMERCE / DEMO MODELS (PRESERVED FOR BACKWARD COMPATIBILITY)
// ------------------------------------------------------------------------------

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parent_id?: string | null
  is_visible: boolean
  sort_order?: number
  created_at: string
  parent?: Category | null
  products_count?: number
}

export interface Brand {
  id: string
  name: string
  slug: string
  website?: string
  description?: string
  logo_url?: string
  is_visible: boolean
  created_at: string
  addresses?: Address[]
}

export interface Address {
  id: string
  street: string
  city: string
  state: string
  postal_code: string
  country: string
  created_at: string
}

export interface Addressable {
  id: string
  address_id: string
  addressable_id: string
  addressable_type: 'Brand' | 'Customer' | 'Order'
}

export type ProductStatus = 'draft' | 'published'

export interface Product {
  id: string
  name: string
  slug: string
  sku: string
  barcode?: string
  description?: string
  price: number
  old_price?: number | null
  cost?: number
  stock_quantity: number
  security_stock: number
  is_visible: boolean
  status: ProductStatus
  category_id?: string | null
  brand_id?: string | null
  image_url?: string
  created_at: string
  category?: Category | null
  brand?: Brand | null
}

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  gender?: 'male' | 'female' | 'other'
  date_of_birth?: string
  created_at: string
  addresses?: Address[]
  orders_count?: number
  total_spent?: number
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

export interface Order {
  id: string
  order_number: string
  customer_id: string
  status: OrderStatus
  currency: string
  subtotal: number
  shipping_price: number
  total_price: number
  notes?: string
  created_at: string
  customer?: Customer
  payments?: Payment[]
  address?: Address
}

export type PaymentMethod = 'credit_card' | 'bank_transfer' | 'paypal' | 'stripe'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface Payment {
  id: string
  order_id: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  transaction_id: string
  created_at: string
}

export type PostStatus = 'draft' | 'published' | 'scheduled'

export interface Post {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: string
  banner_url?: string
  status: PostStatus
  published_at?: string | null
  user_id: string
  created_at: string
  author?: User
  comments_count?: number
}

export interface Comment {
  id: string
  user_name: string
  user_email: string
  content: string
  is_approved: boolean
  commentable_id: string
  commentable_type: 'Product' | 'Post'
  created_at: string
}

export interface CategoryProduct {
  category_id: string
  product_id: string
  created_at?: string
}
