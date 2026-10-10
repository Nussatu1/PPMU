import type {
  User,
  Category,
  Brand,
  Product,
  Customer,
  Order,
  Payment,
  Post,
  Comment,
  Address,
  Addressable,
  CategoryProduct,
  Organization,
  OrganizationPeriod,
  OrganizationMembership,
  RoleEntity,
  Structure,
  Section,
  Personnel,
  Program,
  Agenda,
  Performance,
  Budget,
  Transaction,
  Report,
  Task,
  Notification,
  AuditLog,
} from '@/types/database'
import { DEFAULT_ROLES } from '@/lib/authorization'

// ==============================================================================
// CLEAN SLATE — Semua mock data dihapus total.
// Hanya 1 akun Superadmin master yang tersisa untuk login awal.
// Semua data lain diinput manual oleh pengguna dan tersimpan di localStorage.
// ==============================================================================

export const initialUsers: User[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Pengurus 1 (Pimpinan Harian)',
    email: 'pengurus1@bakid.ponpes.id',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    role: 'superadmin',
    is_superadmin: true,
    status: 'active',
    created_at: new Date().toISOString(),
  },
]

// Semua data mock dihapus. Hanya Superadmin & default roles yang tersisa.
// Data diinput manual dan disimpan di localStorage.

export const initialCategories: Category[] = []
export const initialBrands: Brand[] = []
export const initialAddresses: Address[] = []
export const initialAddressables: Addressable[] = []
export const initialProducts: Product[] = []
export const initialCategoryProducts: CategoryProduct[] = []
export const initialCustomers: Customer[] = []
export const initialOrders: Order[] = []
export const initialPayments: Payment[] = []
export const initialPosts: Post[] = []
export const initialComments: Comment[] = []

// ==============================================================================
// MULTI-ORGANIZATION & RBAC — Clean Slate
// ==============================================================================

export const initialOrganizations: Organization[] = []
export const initialRoles: RoleEntity[] = [...DEFAULT_ROLES]
export const initialMemberships: OrganizationMembership[] = []
export const initialPeriods: OrganizationPeriod[] = []
export const initialStructures: Structure[] = []
export const initialSections: Section[] = []
export const initialPersonnels: Personnel[] = []
export const initialPrograms: Program[] = []
export const initialAgendas: Agenda[] = []
export const initialPerformances: Performance[] = []
export const initialBudgets: Budget[] = []
export const initialTransactions: Transaction[] = []
export const initialReports: Report[] = []
export const initialTasks: Task[] = []
export const initialNotifications: Notification[] = []
export const initialAuditLogs: AuditLog[] = []

