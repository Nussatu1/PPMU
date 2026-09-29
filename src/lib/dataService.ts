import { supabase, isSupabaseConfigured } from './supabase'
import {
  initialUsers,
  initialCategories,
  initialBrands,
  initialProducts,
  initialCategoryProducts,
  initialCustomers,
  initialOrders,
  initialPayments,
  initialComments,
  initialAddresses,
  initialAddressables,
  initialOrganizations,
  initialPeriods,
  initialRoles,
  initialMemberships,
  initialStructures,
  initialSections,
  initialPersonnels,
  initialPrograms,
  initialAgendas,
  initialPerformances,
  initialBudgets,
  initialTransactions,
  initialReports,
  initialTasks,
  initialNotifications,
  initialAuditLogs,
} from './mockData'
import type {
  User,
  Category,
  Brand,
  Product,
  Customer,
  Order,
  Payment,
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
  PermissionAction,
  PermissionResource,
  ProgramStatus,
  AgendaStatus,
  ReportStatus,
  TaskStatus,
} from '@/types/database'
import {
  authorize,
  canTransitionProgramStatus,
  canTransitionAgendaStatus,
  canTransitionReportStatus,
  canTransitionTaskStatus,
} from './authorization'

// Local storage helper for mock persistence
function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(`filament_bakid_v2_${key}`)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`filament_bakid_v2_${key}`, JSON.stringify(value))
  } catch (err) {
    console.error('Failed to save to localStorage:', err)
  }
}

let localUsers: User[] = getStorage('users', initialUsers).map((u) => {
  const init = initialUsers.find((iu) => iu.id === u.id || iu.email?.toLowerCase() === u.email?.toLowerCase())
  return {
    ...u,
    avatar_url: u.avatar_url || init?.avatar_url,
  }
})
let localCategories: Category[] = getStorage('categories', initialCategories)
let localBrands: Brand[] = getStorage('brands', initialBrands)
let localProducts: Product[] = getStorage('products', initialProducts)
let localCategoryProducts: CategoryProduct[] = getStorage('category_products', initialCategoryProducts)
let localCustomers: Customer[] = getStorage('customers', initialCustomers)
let localOrders: Order[] = getStorage('orders', initialOrders)
let localPayments: Payment[] = getStorage('payments', initialPayments)
let localComments: Comment[] = getStorage('comments', initialComments)
let localAddresses: Address[] = getStorage('addresses', initialAddresses)
let localAddressables: Addressable[] = getStorage('addressables', initialAddressables)

// Workflow Ecosystem Stores
let localOrganizations: Organization[] = getStorage('organizations', initialOrganizations)
let localPeriods: OrganizationPeriod[] = getStorage('periods', initialPeriods)
let localRoles: RoleEntity[] = getStorage('roles', initialRoles)
let localMemberships: OrganizationMembership[] = getStorage('memberships', initialMemberships)
let localStructures: Structure[] = getStorage('structures', initialStructures)
let localSections: Section[] = getStorage('sections', initialSections)
let localPersonnels: Personnel[] = getStorage('personnels', initialPersonnels)
let localPrograms: Program[] = getStorage('programs', initialPrograms)
let localAgendas: Agenda[] = getStorage('agendas', initialAgendas)
let localPerformances: Performance[] = getStorage('performances', initialPerformances)
let localBudgets: Budget[] = getStorage('budgets', initialBudgets)
let localTransactions: Transaction[] = getStorage('transactions', initialTransactions)
let localReports: Report[] = getStorage('reports', initialReports)
let localTasks: Task[] = getStorage('tasks', initialTasks)
let localNotifications: Notification[] = getStorage('notifications', initialNotifications)
let localAuditLogs: AuditLog[] = getStorage('audit_logs', initialAuditLogs)

function logAudit(
  user: User | null | undefined,
  action: PermissionAction,
  resource: PermissionResource,
  resourceId: string,
  organizationId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
): void {
  const newLog: AuditLog = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    user_id: user?.id || 'system',
    user_name: user?.name || 'Sistem',
    action,
    resource,
    resource_id: resourceId,
    ip_address: '127.0.0.1',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Client',
    old_values: oldValues,
    new_values: newValues,
    created_at: new Date().toISOString(),
  }
  localAuditLogs = [newLog, ...localAuditLogs]
  setStorage('audit_logs', localAuditLogs)
}

function verifyAccess(
  user: User | null | undefined,
  resource: PermissionResource,
  action: PermissionAction,
  targetOrgId?: string
): void {
  if (!user) return

  // Superadmin has absolute global access across all organizations
  if (user.is_superadmin || user.role === 'superadmin') return

  // Non-superadmin MUST have an active membership
  const userOrgId = user.active_membership?.organization_id
  if (!userOrgId) {
    throw new Error('Akses ditolak: Pengguna tidak memiliki keanggotaan organisasi yang aktif.')
  }

  // Cross-tenant protection: reject if targetOrgId belongs to another tenant
  if (targetOrgId && targetOrgId !== userOrgId) {
    throw new Error('Akses ditolak: Percobaan manipulasi scope organisasi lintas tenant (Cross-tenant violation).')
  }

  // Authorize against role & permission matrix
  if (!authorize(user, resource, action, userOrgId)) {
    throw new Error(`Akses ditolak: Anda tidak memiliki izin [${resource}.${action}] pada organisasi ini.`)
  }
}

function verifySuperadmin(user?: User | null): void {
  if (!user) {
    throw new Error('Akses ditolak: Pengguna tidak terotentikasi.')
  }
  if (!user.is_superadmin && user.role !== 'superadmin') {
    throw new Error('Akses ditolak: Hanya Superadmin yang berwenang melakukan tindakan ini.')
  }
}

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

export const dataService = {
  // --------------------------------------------------------------------------
  // USERS
  // --------------------------------------------------------------------------
  async getUsers(): Promise<User[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as User[]
    }
    await delay()
    return [...localUsers]
  },

  async getUserById(id: string): Promise<User | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
      if (!error && data) return data as User
    }
    await delay()
    return localUsers.find((u) => u.id === id) || null
  },

  async getUserByEmailOrUsername(identifier: string): Promise<User | null> {
    await delay(50)
    const key = identifier.trim().toLowerCase()
    return (
      localUsers.find(
        (u) =>
          u.email.toLowerCase() === key ||
          (u.username && u.username.toLowerCase() === key)
      ) || null
    )
  },

  async createUser(data: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const newUser: User = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('users').insert(newUser).select().single()
      if (!error && created) return created as User
    }
    await delay()
    localUsers = [newUser, ...localUsers]
    setStorage('users', localUsers)
    return newUser
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('users').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as User
    }
    await delay()
    const index = localUsers.findIndex((u) => u.id === id)
    if (index === -1) throw new Error('User not found')
    localUsers[index] = { ...localUsers[index], ...data }
    setStorage('users', localUsers)
    return localUsers[index]
  },

  async deleteUser(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('users').delete().eq('id', id)
      return
    }
    await delay()
    localUsers = localUsers.filter((u) => u.id !== id)
    setStorage('users', localUsers)
  },

  async deleteUsers(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('users').delete().in('id', ids)
      return
    }
    await delay()
    localUsers = localUsers.filter((u) => !ids.includes(u.id))
    setStorage('users', localUsers)
  },

  async resetUserPassword(userId: string, newPassword?: string, user?: User | null): Promise<string> {
    verifySuperadmin(user)
    await delay(100)
    const index = localUsers.findIndex((u) => u.id === userId)
    if (index === -1) throw new Error('Pengguna tidak ditemukan')

    const generated = newPassword || `Akses#${Math.floor(1000 + Math.random() * 9000)}`
    localUsers[index] = {
      ...localUsers[index],
      password_hash: generated,
      must_change_password: true,
      updated_at: new Date().toISOString(),
    }
    setStorage('users', localUsers)
    logAudit(user, 'update', 'Admin', userId, undefined, { action: 'reset_password' }, { must_change_password: true })
    return generated
  },

  async toggleAccountStatus(userId: string, user?: User | null): Promise<User> {
    verifySuperadmin(user)
    await delay(100)
    const index = localUsers.findIndex((u) => u.id === userId)
    if (index === -1) throw new Error('Pengguna tidak ditemukan')
    if (localUsers[index].is_superadmin || localUsers[index].role === 'superadmin') {
      throw new Error('Status akun Superadmin tidak dapat diubah')
    }

    const nextStatus: 'active' | 'inactive' = localUsers[index].status === 'active' ? 'inactive' : 'active'
    localUsers[index] = {
      ...localUsers[index],
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }
    setStorage('users', localUsers)

    // Sync membership status as well
    localMemberships = localMemberships.map((m) =>
      m.user_id === userId ? { ...m, status: nextStatus, updated_at: new Date().toISOString() } : m
    )
    setStorage('memberships', localMemberships)

    logAudit(user, 'update', 'Admin', userId, undefined, { status: localUsers[index].status }, { status: nextStatus })
    return localUsers[index]
  },

  async updateUserPassword(userId: string, newPassword: string): Promise<User> {
    await delay(100)
    const index = localUsers.findIndex((u) => u.id === userId)
    if (index === -1) throw new Error('Pengguna tidak ditemukan')
    localUsers[index] = {
      ...localUsers[index],
      password_hash: newPassword,
      must_change_password: false,
      updated_at: new Date().toISOString(),
    }
    setStorage('users', localUsers)
    return localUsers[index]
  },

  // --------------------------------------------------------------------------
  // CATEGORIES
  // --------------------------------------------------------------------------
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Category[]
    }
    await delay()
    return [...localCategories]
  },

  async getCategoryById(id: string): Promise<Category | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categories').select('*').eq('id', id).single()
      if (!error && data) return data as Category
    }
    await delay()
    return localCategories.find((c) => c.id === id) || null
  },

  async createCategory(data: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    const newCat: Category = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('categories').insert(newCat).select().single()
      if (!error && created) return created as Category
    }
    await delay()
    localCategories = [newCat, ...localCategories]
    setStorage('categories', localCategories)
    return newCat
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('categories').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as Category
    }
    await delay()
    const index = localCategories.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Category not found')
    localCategories[index] = { ...localCategories[index], ...data }
    setStorage('categories', localCategories)
    return localCategories[index]
  },

  async deleteCategory(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('categories').delete().eq('id', id)
      return
    }
    await delay()
    localCategories = localCategories.filter((c) => c.id !== id)
    setStorage('categories', localCategories)
  },

  async deleteCategories(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('categories').delete().in('id', ids)
      return
    }
    await delay()
    localCategories = localCategories.filter((c) => !ids.includes(c.id))
    setStorage('categories', localCategories)
  },

  // Category Relation Manager: BelongsToMany Products
  async getCategoryProducts(categoryId: string): Promise<Product[]> {
    await delay()
    const productIds = localCategoryProducts
      .filter((cp) => cp.category_id === categoryId)
      .map((cp) => cp.product_id)
    return localProducts.filter((p) => productIds.includes(p.id))
  },

  async attachProductToCategory(categoryId: string, productId: string): Promise<void> {
    await delay()
    const exists = localCategoryProducts.some(
      (cp) => cp.category_id === categoryId && cp.product_id === productId
    )
    if (!exists) {
      localCategoryProducts = [...localCategoryProducts, { category_id: categoryId, product_id: productId }]
      setStorage('category_products', localCategoryProducts)
    }
  },

  async detachProductFromCategory(categoryId: string, productId: string): Promise<void> {
    await delay()
    localCategoryProducts = localCategoryProducts.filter(
      (cp) => !(cp.category_id === categoryId && cp.product_id === productId)
    )
    setStorage('category_products', localCategoryProducts)
  },

  // --------------------------------------------------------------------------
  // BRANDS
  // --------------------------------------------------------------------------
  async getBrands(): Promise<Brand[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('brands').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Brand[]
    }
    await delay()
    return [...localBrands]
  },

  async getBrandById(id: string): Promise<Brand | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('brands').select('*').eq('id', id).single()
      if (!error && data) return data as Brand
    }
    await delay()
    return localBrands.find((b) => b.id === id) || null
  },

  async createBrand(data: Omit<Brand, 'id' | 'created_at'>): Promise<Brand> {
    const newBrand: Brand = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('brands').insert(newBrand).select().single()
      if (!error && created) return created as Brand
    }
    await delay()
    localBrands = [newBrand, ...localBrands]
    setStorage('brands', localBrands)
    return newBrand
  },

  async updateBrand(id: string, data: Partial<Brand>): Promise<Brand> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('brands').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as Brand
    }
    await delay()
    const index = localBrands.findIndex((b) => b.id === id)
    if (index === -1) throw new Error('Brand not found')
    localBrands[index] = { ...localBrands[index], ...data }
    setStorage('brands', localBrands)
    return localBrands[index]
  },

  async deleteBrand(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('brands').delete().eq('id', id)
      return
    }
    await delay()
    localBrands = localBrands.filter((b) => b.id !== id)
    setStorage('brands', localBrands)
  },

  async deleteBrands(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('brands').delete().in('id', ids)
      return
    }
    await delay()
    localBrands = localBrands.filter((b) => !ids.includes(b.id))
    setStorage('brands', localBrands)
  },

  // Brand Relation Manager: MorphToMany Addresses
  async getBrandAddresses(brandId: string): Promise<Address[]> {
    await delay()
    const addressIds = localAddressables
      .filter((a) => a.addressable_type === 'Brand' && a.addressable_id === brandId)
      .map((a) => a.address_id)
    return localAddresses.filter((addr) => addressIds.includes(addr.id))
  },

  async addBrandAddress(brandId: string, addressData: Omit<Address, 'id' | 'created_at'>): Promise<Address> {
    await delay()
    const newAddress: Address = {
      ...addressData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    localAddresses = [newAddress, ...localAddresses]
    setStorage('addresses', localAddresses)

    const newAddressable: Addressable = {
      id: crypto.randomUUID(),
      address_id: newAddress.id,
      addressable_id: brandId,
      addressable_type: 'Brand',
    }
    localAddressables = [newAddressable, ...localAddressables]
    setStorage('addressables', localAddressables)

    return newAddress
  },

  async removeBrandAddress(brandId: string, addressId: string): Promise<void> {
    await delay()
    localAddressables = localAddressables.filter(
      (a) => !(a.addressable_type === 'Brand' && a.addressable_id === brandId && a.address_id === addressId)
    )
    setStorage('addressables', localAddressables)
  },

  // --------------------------------------------------------------------------
  // PRODUCTS
  // --------------------------------------------------------------------------
  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Product[]
    }
    await delay()
    return localProducts.map((p) => ({
      ...p,
      category: localCategories.find((c) => c.id === p.category_id) || null,
      brand: localBrands.find((b) => b.id === p.brand_id) || null,
    }))
  },

  async getProductById(id: string): Promise<Product | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (!error && data) return data as Product
    }
    await delay()
    const product = localProducts.find((p) => p.id === id)
    if (!product) return null
    return {
      ...product,
      category: localCategories.find((c) => c.id === product.category_id) || null,
      brand: localBrands.find((b) => b.id === product.brand_id) || null,
    }
  },

  async createProduct(data: Omit<Product, 'id' | 'created_at' | 'category' | 'brand'>): Promise<Product> {
    const newProduct: Product = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('products').insert(newProduct).select().single()
      if (!error && created) return created as Product
    }
    await delay()
    localProducts = [newProduct, ...localProducts]
    setStorage('products', localProducts)
    // Auto-sync category_product pivot if category_id given
    if (newProduct.category_id) {
      localCategoryProducts = [...localCategoryProducts, { category_id: newProduct.category_id, product_id: newProduct.id }]
      setStorage('category_products', localCategoryProducts)
    }
    return newProduct
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('products').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as Product
    }
    await delay()
    const index = localProducts.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Product not found')
    localProducts[index] = { ...localProducts[index], ...data }
    setStorage('products', localProducts)
    return localProducts[index]
  },

  async deleteProduct(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('products').delete().eq('id', id)
      return
    }
    await delay()
    localProducts = localProducts.filter((p) => p.id !== id)
    setStorage('products', localProducts)
  },

  async deleteProducts(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('products').delete().in('id', ids)
      return
    }
    await delay()
    localProducts = localProducts.filter((p) => !ids.includes(p.id))
    setStorage('products', localProducts)
  },

  // Product Relation Manager: Comments (MorphMany)
  async getProductComments(productId: string): Promise<Comment[]> {
    await delay()
    return localComments.filter((c) => c.commentable_type === 'Product' && c.commentable_id === productId)
  },

  async addProductComment(productId: string, data: Omit<Comment, 'id' | 'created_at' | 'commentable_id' | 'commentable_type'>): Promise<Comment> {
    await delay()
    const newComment: Comment = {
      ...data,
      id: crypto.randomUUID(),
      commentable_id: productId,
      commentable_type: 'Product',
      created_at: new Date().toISOString(),
    }
    localComments = [newComment, ...localComments]
    setStorage('comments', localComments)
    return newComment
  },

  // --------------------------------------------------------------------------
  // CUSTOMERS
  // --------------------------------------------------------------------------
  async getCustomers(): Promise<Customer[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Customer[]
    }
    await delay()
    return localCustomers.map((cust) => {
      const custOrders = localOrders.filter((o) => o.customer_id === cust.id)
      const totalSpent = custOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_price : 0), 0)
      return {
        ...cust,
        orders_count: custOrders.length,
        total_spent: totalSpent,
      }
    })
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
      if (!error && data) return data as Customer
    }
    await delay()
    const cust = localCustomers.find((c) => c.id === id)
    if (!cust) return null
    const custOrders = localOrders.filter((o) => o.customer_id === cust.id)
    const totalSpent = custOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_price : 0), 0)
    return {
      ...cust,
      orders_count: custOrders.length,
      total_spent: totalSpent,
    }
  },

  async createCustomer(data: Omit<Customer, 'id' | 'created_at' | 'orders_count' | 'total_spent'>): Promise<Customer> {
    const newCust: Customer = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('customers').insert(newCust).select().single()
      if (!error && created) return created as Customer
    }
    await delay()
    localCustomers = [newCust, ...localCustomers]
    setStorage('customers', localCustomers)
    return newCust
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('customers').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as Customer
    }
    await delay()
    const index = localCustomers.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Customer not found')
    localCustomers[index] = { ...localCustomers[index], ...data }
    setStorage('customers', localCustomers)
    return localCustomers[index]
  },

  async deleteCustomer(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('customers').delete().eq('id', id)
      return
    }
    await delay()
    localCustomers = localCustomers.filter((c) => c.id !== id)
    setStorage('customers', localCustomers)
  },

  async deleteCustomers(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('customers').delete().in('id', ids)
      return
    }
    await delay()
    localCustomers = localCustomers.filter((c) => !ids.includes(c.id))
    setStorage('customers', localCustomers)
  },

  // Customer Relation Manager: HasManyThrough Payments (via Orders)
  async getCustomerPayments(customerId: string): Promise<Payment[]> {
    await delay()
    const customerOrderIds = localOrders.filter((o) => o.customer_id === customerId).map((o) => o.id)
    return localPayments.filter((p) => customerOrderIds.includes(p.order_id))
  },

  // Customer Relation Manager: MorphToMany Addresses
  async getCustomerAddresses(customerId: string): Promise<Address[]> {
    await delay()
    const addressIds = localAddressables
      .filter((a) => a.addressable_type === 'Customer' && a.addressable_id === customerId)
      .map((a) => a.address_id)
    return localAddresses.filter((addr) => addressIds.includes(addr.id))
  },

  async addCustomerAddress(customerId: string, addressData: Omit<Address, 'id' | 'created_at'>): Promise<Address> {
    await delay()
    const newAddress: Address = {
      ...addressData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    localAddresses = [newAddress, ...localAddresses]
    setStorage('addresses', localAddresses)

    const newAddressable: Addressable = {
      id: crypto.randomUUID(),
      address_id: newAddress.id,
      addressable_id: customerId,
      addressable_type: 'Customer',
    }
    localAddressables = [newAddressable, ...localAddressables]
    setStorage('addressables', localAddressables)

    return newAddress
  },

  async removeCustomerAddress(customerId: string, addressId: string): Promise<void> {
    await delay()
    localAddressables = localAddressables.filter(
      (a) => !(a.addressable_type === 'Customer' && a.addressable_id === customerId && a.address_id === addressId)
    )
    setStorage('addressables', localAddressables)
  },

  // --------------------------------------------------------------------------
  // ORDERS
  // --------------------------------------------------------------------------
  async getOrders(): Promise<Order[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      if (!error && data) return data as Order[]
    }
    await delay()
    return localOrders.map((o) => ({
      ...o,
      customer: localCustomers.find((c) => c.id === o.customer_id),
    }))
  },

  async getOrderById(id: string): Promise<Order | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('orders').select('*').eq('id', id).single()
      if (!error && data) return data as Order
    }
    await delay()
    const order = localOrders.find((o) => o.id === id)
    if (!order) return null
    const addressable = localAddressables.find((a) => a.addressable_type === 'Order' && a.addressable_id === id)
    const address = addressable ? localAddresses.find((addr) => addr.id === addressable.address_id) : undefined

    return {
      ...order,
      customer: localCustomers.find((c) => c.id === order.customer_id),
      address,
    }
  },

  async createOrder(data: Omit<Order, 'id' | 'created_at' | 'customer' | 'address' | 'payments'>): Promise<Order> {
    const newOrder: Order = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data: created, error } = await supabase.from('orders').insert(newOrder).select().single()
      if (!error && created) return created as Order
    }
    await delay()
    localOrders = [newOrder, ...localOrders]
    setStorage('orders', localOrders)
    return newOrder
  },

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase.from('orders').update(data).eq('id', id).select().single()
      if (!error && updated) return updated as Order
    }
    await delay()
    const index = localOrders.findIndex((o) => o.id === id)
    if (index === -1) throw new Error('Order not found')
    localOrders[index] = { ...localOrders[index], ...data }
    setStorage('orders', localOrders)
    return localOrders[index]
  },

  async deleteOrder(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('orders').delete().eq('id', id)
      return
    }
    await delay()
    localOrders = localOrders.filter((o) => o.id !== id)
    setStorage('orders', localOrders)
  },

  async deleteOrders(ids: string[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('orders').delete().in('id', ids)
      return
    }
    await delay()
    localOrders = localOrders.filter((o) => !ids.includes(o.id))
    setStorage('orders', localOrders)
  },

  // Order Relation Manager: MorphOne Address
  async getOrderAddress(orderId: string): Promise<Address | null> {
    await delay()
    const addressable = localAddressables.find((a) => a.addressable_type === 'Order' && a.addressable_id === orderId)
    if (!addressable) return null
    return localAddresses.find((addr) => addr.id === addressable.address_id) || null
  },

  async setOrderAddress(orderId: string, addressData: Omit<Address, 'id' | 'created_at'>): Promise<Address> {
    await delay()
    const newAddress: Address = {
      ...addressData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    localAddresses = [newAddress, ...localAddresses]
    setStorage('addresses', localAddresses)

    // Remove any previous MorphOne addressable for this order
    localAddressables = localAddressables.filter(
      (a) => !(a.addressable_type === 'Order' && a.addressable_id === orderId)
    )
    const newAddressable: Addressable = {
      id: crypto.randomUUID(),
      address_id: newAddress.id,
      addressable_id: orderId,
      addressable_type: 'Order',
    }
    localAddressables = [newAddressable, ...localAddressables]
    setStorage('addressables', localAddressables)

    return newAddress
  },

  // Order Relation Manager: Payments (HasMany)
  async getOrderPayments(orderId: string): Promise<Payment[]> {
    await delay()
    return localPayments.filter((p) => p.order_id === orderId)
  },

  async addOrderPayment(orderId: string, data: Omit<Payment, 'id' | 'created_at' | 'order_id'>): Promise<Payment> {
    await delay()
    const newPayment: Payment = {
      ...data,
      id: crypto.randomUUID(),
      order_id: orderId,
      created_at: new Date().toISOString(),
    }
    localPayments = [newPayment, ...localPayments]
    setStorage('payments', localPayments)
    return newPayment
  },

  async deletePayment(paymentId: string): Promise<void> {
    await delay()
    localPayments = localPayments.filter((p) => p.id !== paymentId)
    setStorage('payments', localPayments)
  },

  // --------------------------------------------------------------------------
  // COMMENTS (General)
  // --------------------------------------------------------------------------

  // General Comment actions
  async toggleCommentApproval(commentId: string): Promise<Comment> {
    await delay()
    const index = localComments.findIndex((c) => c.id === commentId)
    if (index === -1) throw new Error('Comment not found')
    localComments[index].is_approved = !localComments[index].is_approved
    setStorage('comments', localComments)
    return localComments[index]
  },

  async deleteComment(commentId: string): Promise<void> {
    await delay()
    localComments = localComments.filter((c) => c.id !== commentId)
    setStorage('comments', localComments)
  },

  // --------------------------------------------------------------------------
  // DASHBOARD AGGREGATES & METRICS
  // --------------------------------------------------------------------------
  async getDashboardStats() {
    await delay(100)
    const totalUsers = localUsers.length
    const totalOrders = localOrders.length
    const totalRevenue = localOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total_price, 0)
    const totalCustomers = localCustomers.length
    const pendingOrders = localOrders.filter((o) => o.status === 'pending').length
    const lowStockProducts = localProducts.filter((p) => p.stock_quantity <= p.security_stock).length

    return {
      totalUsers,
      totalOrders,
      totalRevenue,
      totalCustomers,
      pendingOrders,
      lowStockProducts,
    }
  },

  async getRecentOrders(limit = 5): Promise<Order[]> {
    await delay(80)
    return [...localOrders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
      .map((o) => ({
        ...o,
        customer: localCustomers.find((c) => c.id === o.customer_id),
      }))
  },

  // Global search across resources
  async globalSearch(query: string) {
    if (!query || query.trim().length < 2) return []
    const q = query.toLowerCase().trim()

    const results: Array<{
      type: string
      title: string
      subtitle: string
      url: string
      badge?: string
    }> = []

    // Search Programs
    localPrograms.forEach((p) => {
      const pTitle = p.title || p.name || 'Program'
      if (pTitle.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q))) {
        results.push({
          type: 'program',
          title: pTitle,
          subtitle: `Kode: ${p.code || '-'} | Status: ${p.status}`,
          url: '/programs',
          badge: p.status,
        })
      }
    })

    // Search Agendas
    localAgendas.forEach((a) => {
      if (a.title.toLowerCase().includes(q) || (a.location && a.location.toLowerCase().includes(q))) {
        results.push({
          type: 'agenda',
          title: a.title,
          subtitle: `Lokasi: ${a.location || '-'} | Status: ${a.status}`,
          url: '/agendas',
          badge: a.status,
        })
      }
    })

    // Search Reports
    localReports.forEach((r) => {
      if (r.title.toLowerCase().includes(q) || (r.period && r.period.toLowerCase().includes(q))) {
        results.push({
          type: 'report',
          title: r.title,
          subtitle: `Periode: ${r.period || '-'} | Status: ${r.status}`,
          url: '/reports',
          badge: r.status,
        })
      }
    })

    // Search Tasks
    localTasks.forEach((t) => {
      if (t.title.toLowerCase().includes(q)) {
        results.push({
          type: 'task',
          title: t.title,
          subtitle: `Prioritas: ${t.priority || '-'} | Status: ${t.status}`,
          url: '/tasks',
          badge: t.status,
        })
      }
    })

    // Search Organizations
    localOrganizations.forEach((o) => {
      if (o.name.toLowerCase().includes(q) || (o.code && o.code.toLowerCase().includes(q))) {
        results.push({
          type: 'organization',
          title: o.name,
          subtitle: `Kode: ${o.code} | Status: ${o.status}`,
          url: '/organizations',
          badge: o.status,
        })
      }
    })

    // Search Users
    localUsers.forEach((u) => {
      if (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) {
        results.push({
          type: 'user',
          title: u.name,
          subtitle: `${u.email} (${u.role})`,
          url: '/accounts',
          badge: u.role,
        })
      }
    })

    return results.slice(0, 10)
  },

  // ==========================================================================
  // MULTI-ORGANIZATION WORKFLOW ECOSYSTEM SERVICE METHODS
  // ==========================================================================

  // --------------------------------------------------------------------------
  // 1. ORGANIZATIONS (Superadmin & Multi-tenant)
  // --------------------------------------------------------------------------
  async getOrganizations(user?: User | null): Promise<Organization[]> {
    await delay(100)
    // Superadmin can view all organizations
    if (!user || user.is_superadmin || user.role === 'superadmin') {
      return [...localOrganizations]
    }
    // Tenant users only see organizations they belong to
    const userOrgIds = localMemberships
      .filter((m) => m.user_id === user.id && m.status === 'active')
      .map((m) => m.organization_id)
    return localOrganizations.filter((org) => userOrgIds.includes(org.id))
  },

  async getOrganizationById(id: string, user?: User | null): Promise<Organization | null> {
    await delay(80)
    verifyAccess(user, 'Organization', 'view', id)
    return localOrganizations.find((o) => o.id === id) || null
  },

  async createOrganization(
    data: Omit<Organization, 'id' | 'created_at' | 'updated_at'>,
    user?: User | null
  ): Promise<Organization> {
    verifyAccess(user, 'Organization', 'create')
    await delay(120)
    const newOrg: Organization = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localOrganizations = [newOrg, ...localOrganizations]
    setStorage('organizations', localOrganizations)
    logAudit(user, 'create', 'Organization', newOrg.id, newOrg.id, undefined, newOrg as unknown as Record<string, unknown>)
    return newOrg
  },

  async updateOrganization(
    id: string,
    data: Partial<Organization>,
    user?: User | null
  ): Promise<Organization> {
    verifyAccess(user, 'Organization', 'update', id)
    await delay(120)
    const index = localOrganizations.findIndex((o) => o.id === id)
    if (index === -1) throw new Error('Organisasi tidak ditemukan')
    const oldVal = { ...localOrganizations[index] }
    localOrganizations[index] = {
      ...localOrganizations[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    setStorage('organizations', localOrganizations)
    logAudit(user, 'update', 'Organization', id, id, oldVal as unknown as Record<string, unknown>, localOrganizations[index] as unknown as Record<string, unknown>)
    return localOrganizations[index]
  },

  async deleteOrganization(id: string, user?: User | null): Promise<void> {
    verifyAccess(user, 'Organization', 'delete', id)
    await delay(120)
    const oldVal = localOrganizations.find((o) => o.id === id)
    localOrganizations = localOrganizations.filter((o) => o.id !== id)
    setStorage('organizations', localOrganizations)
    logAudit(user, 'delete', 'Organization', id, id, oldVal as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 1B. ORGANIZATION PERIODS (Periode Kepengurusan)
  // --------------------------------------------------------------------------
  async getPeriods(organizationId: string, user?: User | null): Promise<OrganizationPeriod[]> {
    await delay(80)
    verifyAccess(user, 'Organization', 'view', organizationId)
    return localPeriods.filter((p) => p.organization_id === organizationId)
  },

  async getActivePeriod(organizationId: string, user?: User | null): Promise<OrganizationPeriod | null> {
    await delay(60)
    verifyAccess(user, 'Organization', 'view', organizationId)
    const active = localPeriods.find((p) => p.organization_id === organizationId && p.is_active)
    return active || localPeriods.find((p) => p.organization_id === organizationId) || null
  },

  async createPeriod(
    data: Omit<OrganizationPeriod, 'id' | 'created_at' | 'updated_at'>,
    user?: User | null
  ): Promise<OrganizationPeriod> {
    verifyAccess(user, 'Organization', 'update', data.organization_id)
    await delay(100)
    const newPeriod: OrganizationPeriod = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    // If set as active, deactivate other periods for this org
    if (newPeriod.is_active) {
      localPeriods = localPeriods.map((p) =>
        p.organization_id === data.organization_id ? { ...p, is_active: false } : p
      )
    }
    localPeriods = [newPeriod, ...localPeriods]
    setStorage('periods', localPeriods)
    logAudit(user, 'create', 'Organization', newPeriod.id, data.organization_id, undefined, newPeriod as unknown as Record<string, unknown>)
    return newPeriod
  },

  async updatePeriod(
    id: string,
    data: Partial<OrganizationPeriod>,
    user?: User | null
  ): Promise<OrganizationPeriod> {
    const period = localPeriods.find((p) => p.id === id)
    if (!period) throw new Error('Periode kepengurusan tidak ditemukan')
    verifyAccess(user, 'Organization', 'update', period.organization_id)
    await delay(100)
    const index = localPeriods.findIndex((p) => p.id === id)
    const oldVal = { ...localPeriods[index] }
    if (data.is_active) {
      localPeriods = localPeriods.map((p) =>
        p.organization_id === period.organization_id && p.id !== id ? { ...p, is_active: false } : p
      )
    }
    localPeriods[index] = {
      ...localPeriods[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    setStorage('periods', localPeriods)
    logAudit(user, 'update', 'Organization', id, period.organization_id, oldVal as unknown as Record<string, unknown>, localPeriods[index] as unknown as Record<string, unknown>)
    return localPeriods[index]
  },

  async setActivePeriod(id: string, organizationId: string, user?: User | null): Promise<OrganizationPeriod> {
    verifyAccess(user, 'Organization', 'update', organizationId)
    await delay(100)
    localPeriods = localPeriods.map((p) => {
      if (p.organization_id === organizationId) {
        return { ...p, is_active: p.id === id, status: p.id === id ? 'active' : p.status }
      }
      return p
    })
    setStorage('periods', localPeriods)
    const active = localPeriods.find((p) => p.id === id)!
    logAudit(user, 'update', 'Organization', id, organizationId, undefined, { is_active: true })
    return active
  },

  async deletePeriod(id: string, user?: User | null): Promise<void> {
    const period = localPeriods.find((p) => p.id === id)
    if (!period) throw new Error('Periode kepengurusan tidak ditemukan')
    verifyAccess(user, 'Organization', 'update', period.organization_id)
    await delay(100)
    localPeriods = localPeriods.filter((p) => p.id !== id)
    setStorage('periods', localPeriods)
    logAudit(user, 'delete', 'Organization', id, period.organization_id, period as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 2. ORGANIZATION MEMBERSHIPS & ADMINS
  // --------------------------------------------------------------------------
  async getMemberships(organizationId?: string, user?: User | null): Promise<OrganizationMembership[]> {
    await delay(100)
    if (user && !user.is_superadmin && user.role !== 'superadmin') {
      try {
        verifyAccess(user, 'Admin', 'viewAny', organizationId)
      } catch {
        const userMems = localMemberships.filter(
          (m) => m.user_id === user.id && (!organizationId || m.organization_id === organizationId)
        )
        return userMems.map((m) => ({
          ...m,
          user: localUsers.find((u) => u.id === m.user_id),
          role: localRoles.find((r) => r.id === m.role_id),
          organization: localOrganizations.find((o) => o.id === m.organization_id),
        }))
      }
    } else {
      verifyAccess(user, 'Admin', 'viewAny', organizationId)
    }
    let filtered = localMemberships
    if (organizationId) {
      filtered = filtered.filter((m) => m.organization_id === organizationId)
    }
    return filtered.map((m) => {
      const role = localRoles.find((r) => r.id === m.role_id)
      let resolvedLevel = m.level
      if (!resolvedLevel) {
        const roleId = m.role_id?.toLowerCase() || ''
        const roleSlug = role?.slug?.toLowerCase() || ''
        const roleName = role?.name?.toLowerCase() || ''
        if (
          roleId === 'role-admin-org' ||
          roleId === 'role-superadmin' ||
          roleSlug.includes('admin') ||
          roleName.includes('admin') ||
          roleName.includes('ketua')
        ) {
          resolvedLevel = 'admin'
        } else {
          resolvedLevel = 'anggota'
        }
      }
      return {
        ...m,
        level: resolvedLevel,
        user: localUsers.find((u) => u.id === m.user_id),
        role,
        organization: localOrganizations.find((o) => o.id === m.organization_id),
      }
    })
  },

  async createMembership(
    data: Omit<OrganizationMembership, 'id' | 'joined_at' | 'created_at' | 'updated_at' | 'user' | 'role' | 'organization'>,
    user?: User | null
  ): Promise<OrganizationMembership> {
    verifyAccess(user, 'Admin', 'create', data.organization_id)
    await delay(120)
    const newMem: OrganizationMembership = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    }
    localMemberships = [newMem, ...localMemberships]
    setStorage('memberships', localMemberships)
    logAudit(user, 'create', 'Admin', newMem.id, data.organization_id, undefined, newMem as unknown as Record<string, unknown>)
    return {
      ...newMem,
      user: localUsers.find((u) => u.id === newMem.user_id),
      role: localRoles.find((r) => r.id === newMem.role_id),
      organization: localOrganizations.find((o) => o.id === newMem.organization_id),
    }
  },

  async updateMembership(
    id: string,
    data: Partial<OrganizationMembership>,
    user?: User | null
  ): Promise<OrganizationMembership> {
    const mem = localMemberships.find((m) => m.id === id)
    if (!mem) throw new Error('Data keanggotaan tidak ditemukan')
    verifyAccess(user, 'Admin', 'update', mem.organization_id)
    await delay(120)
    const index = localMemberships.findIndex((m) => m.id === id)
    const oldVal = { ...localMemberships[index] }
    localMemberships[index] = { ...localMemberships[index], ...data }
    setStorage('memberships', localMemberships)
    logAudit(user, 'update', 'Admin', id, mem.organization_id, oldVal as unknown as Record<string, unknown>, localMemberships[index] as unknown as Record<string, unknown>)
    return {
      ...localMemberships[index],
      user: localUsers.find((u) => u.id === localMemberships[index].user_id),
      role: localRoles.find((r) => r.id === localMemberships[index].role_id),
      organization: localOrganizations.find((o) => o.id === localMemberships[index].organization_id),
    }
  },

  async deleteMembership(id: string, user?: User | null): Promise<void> {
    const mem = localMemberships.find((m) => m.id === id)
    if (!mem) throw new Error('Data keanggotaan tidak ditemukan')
    verifyAccess(user, 'Admin', 'delete', mem.organization_id)
    await delay(120)
    localMemberships = localMemberships.filter((m) => m.id !== id)
    setStorage('memberships', localMemberships)
    logAudit(user, 'delete', 'Admin', id, mem.organization_id, mem as unknown as Record<string, unknown>, undefined)
  },

  async moveUserOrganization(
    membershipId: string,
    targetOrgId: string,
    targetRoleId: string,
    level?: 'admin' | 'anggota',
    user?: User | null
  ): Promise<OrganizationMembership> {
    verifySuperadmin(user)
    await delay(120)
    const index = localMemberships.findIndex((m) => m.id === membershipId)
    if (index === -1) throw new Error('Keanggotaan tidak ditemukan')

    const oldVal = { ...localMemberships[index] }
    const resolvedLevel = level || localMemberships[index].level || 'anggota'
    localMemberships[index] = {
      ...localMemberships[index],
      organization_id: targetOrgId,
      role_id: targetRoleId,
      level: resolvedLevel,
      updated_at: new Date().toISOString(),
    }
    setStorage('memberships', localMemberships)
    logAudit(user, 'update', 'Admin', membershipId, targetOrgId, oldVal as unknown as Record<string, unknown>, localMemberships[index] as unknown as Record<string, unknown>)
    return {
      ...localMemberships[index],
      user: localUsers.find((u) => u.id === localMemberships[index].user_id),
      role: localRoles.find((r) => r.id === targetRoleId),
      organization: localOrganizations.find((o) => o.id === targetOrgId),
    }
  },

  async addExistingUserToOrganization(
    userId: string,
    orgId: string,
    roleId: string,
    level?: 'admin' | 'anggota',
    user?: User | null
  ): Promise<OrganizationMembership> {
    verifySuperadmin(user)
    await delay(120)
    const exists = localMemberships.find((m) => m.user_id === userId && m.organization_id === orgId)
    if (exists) {
      throw new Error('Pengguna ini sudah terdaftar sebagai anggota di organisasi ini.')
    }

    const resolvedLevel = level || 'anggota'
    const newMem: OrganizationMembership = {
      id: crypto.randomUUID(),
      user_id: userId,
      organization_id: orgId,
      role_id: roleId,
      level: resolvedLevel,
      status: 'active',
      created_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    }
    localMemberships = [newMem, ...localMemberships]
    setStorage('memberships', localMemberships)
    logAudit(user, 'create', 'Admin', newMem.id, orgId, undefined, newMem as unknown as Record<string, unknown>)
    return {
      ...newMem,
      user: localUsers.find((u) => u.id === userId),
      role: localRoles.find((r) => r.id === roleId),
      organization: localOrganizations.find((o) => o.id === orgId),
    }
  },

  // --------------------------------------------------------------------------
  // 3. ROLES & PERMISSIONS
  // --------------------------------------------------------------------------
  async getRoles(organizationId?: string, user?: User | null): Promise<RoleEntity[]> {
    await delay(100)
    verifyAccess(user, 'Role', 'viewAny', organizationId)
    // Return system roles + organization-specific roles if any
    return localRoles.filter(
      (r) => r.is_system || !r.organization_id || r.organization_id === organizationId
    )
  },

  async getRoleById(id: string, user?: User | null): Promise<RoleEntity | null> {
    await delay(80)
    const role = localRoles.find((r) => r.id === id)
    if (role) {
      verifyAccess(user, 'Role', 'view', role.organization_id)
    }
    return role || null
  },

  async createRole(
    data: Omit<RoleEntity, 'id' | 'created_at'>,
    user?: User | null
  ): Promise<RoleEntity> {
    verifyAccess(user, 'Role', 'create', data.organization_id)
    await delay(120)
    const newRole: RoleEntity = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    localRoles = [newRole, ...localRoles]
    setStorage('roles', localRoles)
    logAudit(user, 'create', 'Role', newRole.id, data.organization_id, undefined, newRole as unknown as Record<string, unknown>)
    return newRole
  },

  async updateRole(
    id: string,
    data: Partial<RoleEntity>,
    user?: User | null
  ): Promise<RoleEntity> {
    const role = localRoles.find((r) => r.id === id)
    if (!role) throw new Error('Peran tidak ditemukan')
    if (role.is_system && user?.role !== 'superadmin' && !user?.is_superadmin) {
      throw new Error('Peran sistem bawaan tidak dapat diubah kecuali oleh Superadmin')
    }
    verifyAccess(user, 'Role', 'update', role.organization_id)
    await delay(120)
    const index = localRoles.findIndex((r) => r.id === id)
    const oldVal = { ...localRoles[index] }
    localRoles[index] = { ...localRoles[index], ...data }
    setStorage('roles', localRoles)
    logAudit(user, 'update', 'Role', id, role.organization_id, oldVal as unknown as Record<string, unknown>, localRoles[index] as unknown as Record<string, unknown>)
    return localRoles[index]
  },

  async deleteRole(id: string, user?: User | null): Promise<void> {
    const role = localRoles.find((r) => r.id === id)
    if (!role) throw new Error('Peran tidak ditemukan')
    if (role.is_system) throw new Error('Peran sistem bawaan tidak dapat dihapus')
    verifyAccess(user, 'Role', 'delete', role.organization_id)
    await delay(120)
    localRoles = localRoles.filter((r) => r.id !== id)
    setStorage('roles', localRoles)
    logAudit(user, 'delete', 'Role', id, role.organization_id, role as unknown as Record<string, unknown>, undefined)
  },

  async cloneRole(sourceRoleId: string, newName: string, user?: User | null): Promise<RoleEntity> {
    verifyAccess(user, 'Role', 'create')
    await delay(120)
    const sourceRole = localRoles.find((r) => r.id === sourceRoleId)
    if (!sourceRole) throw new Error('Peran sumber tidak ditemukan')

    const newRole: RoleEntity = {
      id: `role-custom-${crypto.randomUUID().slice(0, 8)}`,
      name: newName,
      slug: newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: `Duplikasi dari ${sourceRole.name}`,
      status: 'active',
      is_system: false,
      permissions: [...sourceRole.permissions],
      created_at: new Date().toISOString(),
    }
    localRoles = [newRole, ...localRoles]
    setStorage('roles', localRoles)
    logAudit(user, 'create', 'Role', newRole.id, undefined, undefined, newRole as unknown as Record<string, unknown>)
    return newRole
  },

  // --------------------------------------------------------------------------
  // 4. STRUKTUR & SEKSI (Tupoksi)
  // --------------------------------------------------------------------------
  async getStructures(organizationId: string, user?: User | null): Promise<Structure[]> {
    await delay(100)
    verifyAccess(user, 'Structure', 'viewAny', organizationId)
    const structures = localStructures.filter((s) => s.organization_id === organizationId)
    return structures.map((s) => ({
      ...s,
      sections: localSections.filter((sec) => sec.structure_id === s.id),
    }))
  },

  async createStructure(
    data: Omit<Structure, 'id' | 'created_at' | 'updated_at' | 'sections'>,
    user?: User | null
  ): Promise<Structure> {
    verifyAccess(user, 'Structure', 'create', data.organization_id)
    await delay(120)
    const newStructure: Structure = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localStructures = [newStructure, ...localStructures]
    setStorage('structures', localStructures)
    logAudit(user, 'create', 'Structure', newStructure.id, data.organization_id, undefined, newStructure as unknown as Record<string, unknown>)
    return newStructure
  },

  async updateStructure(
    id: string,
    data: Partial<Structure>,
    user?: User | null
  ): Promise<Structure> {
    const struct = localStructures.find((s) => s.id === id)
    if (!struct) throw new Error('Struktur tidak ditemukan')
    verifyAccess(user, 'Structure', 'update', struct.organization_id)
    await delay(120)
    const index = localStructures.findIndex((s) => s.id === id)
    const oldVal = { ...localStructures[index] }
    localStructures[index] = {
      ...localStructures[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    setStorage('structures', localStructures)
    logAudit(user, 'update', 'Structure', id, struct.organization_id, oldVal as unknown as Record<string, unknown>, localStructures[index] as unknown as Record<string, unknown>)
    return localStructures[index]
  },

  async deleteStructure(id: string, user?: User | null): Promise<void> {
    const struct = localStructures.find((s) => s.id === id)
    if (!struct) throw new Error('Struktur tidak ditemukan')
    verifyAccess(user, 'Structure', 'delete', struct.organization_id)
    await delay(120)
    localStructures = localStructures.filter((s) => s.id !== id)
    setStorage('structures', localStructures)
    logAudit(user, 'delete', 'Structure', id, struct.organization_id, struct as unknown as Record<string, unknown>, undefined)
  },

  async getSections(organizationId: string, structureId?: string, user?: User | null): Promise<Section[]> {
    await delay(80)
    verifyAccess(user, 'Structure', 'viewAny', organizationId)
    let filtered = localSections.filter((s) => s.organization_id === organizationId)
    if (structureId) {
      filtered = filtered.filter((s) => s.structure_id === structureId)
    }
    return filtered.map((sec) => ({
      ...sec,
      personnels: localPersonnels.filter((p) => p.section_id === sec.id),
      programs: localPrograms.filter((p) => p.section_id === sec.id),
    }))
  },

  async createSection(
    data: Omit<Section, 'id' | 'created_at' | 'personnels' | 'programs'>,
    user?: User | null
  ): Promise<Section> {
    verifyAccess(user, 'Structure', 'create', data.organization_id)
    await delay(100)
    const newSection: Section = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    localSections = [...localSections, newSection]
    setStorage('sections', localSections)
    logAudit(user, 'create', 'Structure', newSection.id, data.organization_id, undefined, newSection as unknown as Record<string, unknown>)
    return newSection
  },

  async updateSection(
    id: string,
    data: Partial<Section>,
    user?: User | null
  ): Promise<Section> {
    const sec = localSections.find((s) => s.id === id)
    if (!sec) throw new Error('Seksi tidak ditemukan')
    verifyAccess(user, 'Structure', 'update', sec.organization_id)
    await delay(100)
    const index = localSections.findIndex((s) => s.id === id)
    const oldVal = { ...localSections[index] }
    localSections[index] = { ...localSections[index], ...data }
    setStorage('sections', localSections)
    logAudit(user, 'update', 'Structure', id, sec.organization_id, oldVal as unknown as Record<string, unknown>, localSections[index] as unknown as Record<string, unknown>)
    return localSections[index]
  },

  async deleteSection(id: string, user?: User | null): Promise<void> {
    const sec = localSections.find((s) => s.id === id)
    if (!sec) throw new Error('Seksi tidak ditemukan')
    verifyAccess(user, 'Structure', 'delete', sec.organization_id)
    await delay(100)
    localSections = localSections.filter((s) => s.id !== id)
    setStorage('sections', localSections)
    logAudit(user, 'delete', 'Structure', id, sec.organization_id, sec as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 5. PERSONEL (Tupoksi & Penugasan)
  // --------------------------------------------------------------------------
  async getPersonnels(organizationId: string, sectionId?: string, user?: User | null): Promise<Personnel[]> {
    await delay(80)
    verifyAccess(user, 'Structure', 'viewAny', organizationId)
    let filtered = localPersonnels.filter((p) => p.organization_id === organizationId)
    if (sectionId) {
      filtered = filtered.filter((p) => p.section_id === sectionId)
    }
    return filtered.map((prs) => ({
      ...prs,
      section: localSections.find((s) => s.id === prs.section_id),
      user: prs.user_id ? localUsers.find((u) => u.id === prs.user_id) : undefined,
    }))
  },

  async createPersonnel(
    data: Omit<Personnel, 'id' | 'created_at' | 'section' | 'user'>,
    user?: User | null
  ): Promise<Personnel> {
    verifyAccess(user, 'Structure', 'create', data.organization_id)
    await delay(100)
    const newPrs: Personnel = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    localPersonnels = [newPrs, ...localPersonnels]
    setStorage('personnels', localPersonnels)
    logAudit(user, 'create', 'Structure', newPrs.id, data.organization_id, undefined, newPrs as unknown as Record<string, unknown>)
    return newPrs
  },

  async updatePersonnel(
    id: string,
    data: Partial<Personnel>,
    user?: User | null
  ): Promise<Personnel> {
    const prs = localPersonnels.find((p) => p.id === id)
    if (!prs) throw new Error('Personel tidak ditemukan')
    verifyAccess(user, 'Structure', 'update', prs.organization_id)
    await delay(100)
    const index = localPersonnels.findIndex((p) => p.id === id)
    const oldVal = { ...localPersonnels[index] }
    localPersonnels[index] = { ...localPersonnels[index], ...data }
    setStorage('personnels', localPersonnels)
    logAudit(user, 'update', 'Structure', id, prs.organization_id, oldVal as unknown as Record<string, unknown>, localPersonnels[index] as unknown as Record<string, unknown>)
    return localPersonnels[index]
  },

  async deletePersonnel(
    id: string,
    options?: { reassignToParentId?: string | null; cascade?: boolean },
    user?: User | null
  ): Promise<void> {
    const prs = localPersonnels.find((p) => p.id === id)
    if (!prs) throw new Error('Personel tidak ditemukan')
    verifyAccess(user, 'Structure', 'delete', prs.organization_id)
    await delay(100)

    if (options?.cascade) {
      // Find all recursive descendants and delete them
      const toDelete = new Set<string>([id])
      let added = true
      while (added) {
        added = false
        for (const p of localPersonnels) {
          if (p.parent_id && toDelete.has(p.parent_id) && !toDelete.has(p.id)) {
            toDelete.add(p.id)
            added = true
          }
        }
      }
      localPersonnels = localPersonnels.filter((p) => !toDelete.has(p.id))
    } else {
      // Reassign children to specified parent or this node's parent
      const newParentId = options?.reassignToParentId !== undefined ? options.reassignToParentId : (prs.parent_id || null)
      localPersonnels = localPersonnels
        .map((p) => {
          if (p.parent_id === id) {
            return { ...p, parent_id: newParentId }
          }
          return p
        })
        .filter((p) => p.id !== id)
    }

    setStorage('personnels', localPersonnels)
    logAudit(user, 'delete', 'Structure', id, prs.organization_id, prs as unknown as Record<string, unknown>, undefined)
  },

  async movePersonnel(
    id: string,
    newParentId: string | null,
    newSortOrder?: number,
    user?: User | null
  ): Promise<Personnel> {
    const prs = localPersonnels.find((p) => p.id === id)
    if (!prs) throw new Error('Personel tidak ditemukan')
    verifyAccess(user, 'Structure', 'update', prs.organization_id)

    // Check circular relationship!
    if (newParentId === id) {
      throw new Error('Jabatan tidak dapat menjadi atasan dari dirinya sendiri.')
    }
    if (newParentId) {
      let currentCheck: string | null | undefined = newParentId
      while (currentCheck) {
        if (currentCheck === id) {
          throw new Error('Hubungan hierarki sirkular terdeteksi: Tidak dapat memindahkan atasan ke bawahannya.')
        }
        const parentNode = localPersonnels.find((p) => p.id === currentCheck)
        currentCheck = parentNode ? parentNode.parent_id : null
      }
    }

    await delay(100)
    const index = localPersonnels.findIndex((p) => p.id === id)
    const oldVal = { ...localPersonnels[index] }
    localPersonnels[index] = {
      ...localPersonnels[index],
      parent_id: newParentId,
      sort_order: newSortOrder !== undefined ? newSortOrder : localPersonnels[index].sort_order,
      updated_at: new Date().toISOString(),
    }
    setStorage('personnels', localPersonnels)
    logAudit(user, 'update', 'Structure', id, prs.organization_id, oldVal as unknown as Record<string, unknown>, localPersonnels[index] as unknown as Record<string, unknown>)
    return localPersonnels[index]
  },

  // --------------------------------------------------------------------------
  // 6. PROGRAM KERJA (Lifecycle Flow)
  // --------------------------------------------------------------------------
  async getPrograms(organizationId: string, user?: User | null): Promise<Program[]> {
    await delay(100)
    verifyAccess(user, 'Program', 'viewAny', organizationId)
    return localPrograms
      .filter((p) => p.organization_id === organizationId)
      .map((p) => ({
        ...p,
        section: localSections.find((s) => s.id === p.section_id),
        agendas: localAgendas.filter((a) => a.program_id === p.id),
        performances: localPerformances.filter((perf) => perf.program_id === p.id),
      }))
  },

  async getProgramById(id: string, user?: User | null): Promise<Program | null> {
    await delay(80)
    const program = localPrograms.find((p) => p.id === id)
    if (!program) return null
    verifyAccess(user, 'Program', 'view', program.organization_id)
    return {
      ...program,
      section: localSections.find((s) => s.id === program.section_id),
      agendas: localAgendas.filter((a) => a.program_id === program.id),
      performances: localPerformances.filter((perf) => perf.program_id === program.id),
    }
  },

  async createProgram(
    data: Omit<Program, 'id' | 'created_at' | 'updated_at' | 'section' | 'agendas' | 'performances'>,
    user?: User | null
  ): Promise<Program> {
    verifyAccess(user, 'Program', 'create', data.organization_id)
    await delay(120)
    const newProg: Program = {
      ...data,
      id: crypto.randomUUID(),
      created_by: user?.id || data.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localPrograms = [newProg, ...localPrograms]
    setStorage('programs', localPrograms)

    // Automatically create corresponding Budget allocation record
    const allocated = newProg.budget_allocated || newProg.budget_planned || 0
    if (allocated > 0) {
      const newBudget: Budget = {
        id: crypto.randomUUID(),
        organization_id: newProg.organization_id,
        program_id: newProg.id,
        status: 'approved',
        allocated_amount: allocated,
        realized_amount: 0,
        remaining_balance: allocated,
        fiscal_year: new Date().getFullYear(),
        notes: `Alokasi anggaran awal program ${newProg.title || newProg.name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      localBudgets = [newBudget, ...localBudgets]
      setStorage('budgets', localBudgets)
    }

    logAudit(user, 'create', 'Program', newProg.id, data.organization_id, undefined, newProg as unknown as Record<string, unknown>)
    return newProg
  },

  async updateProgram(
    id: string,
    data: Partial<Program>,
    user?: User | null
  ): Promise<Program> {
    const prog = localPrograms.find((p) => p.id === id)
    if (!prog) throw new Error('Program kerja tidak ditemukan')
    verifyAccess(user, 'Program', 'update', prog.organization_id)
    await delay(120)
    const index = localPrograms.findIndex((p) => p.id === id)
    const oldVal = { ...localPrograms[index] }
    localPrograms[index] = {
      ...localPrograms[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    setStorage('programs', localPrograms)
    logAudit(user, 'update', 'Program', id, prog.organization_id, oldVal as unknown as Record<string, unknown>, localPrograms[index] as unknown as Record<string, unknown>)
    return localPrograms[index]
  },

  async transitionProgramStatus(
    id: string,
    nextStatus: ProgramStatus,
    user?: User | null
  ): Promise<Program> {
    const prog = localPrograms.find((p) => p.id === id)
    if (!prog) throw new Error('Program kerja tidak ditemukan')
    verifyAccess(user, 'Program', 'update', prog.organization_id)

    if (!canTransitionProgramStatus(prog.status, nextStatus)) {
      throw new Error(`Transisi status program dari [${prog.status}] ke [${nextStatus}] tidak diizinkan dalam siklus kerja.`)
    }

    await delay(100)
    const index = localPrograms.findIndex((p) => p.id === id)
    const oldStatus = prog.status
    const updatePayload: Partial<Program> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }

    if (nextStatus === 'approved') {
      updatePayload.approved_by = user?.id
    }

    localPrograms[index] = { ...localPrograms[index], ...updatePayload }
    setStorage('programs', localPrograms)
    logAudit(user, 'update', 'Program', id, prog.organization_id, { status: oldStatus }, { status: nextStatus })
    return localPrograms[index]
  },

  async deleteProgram(id: string, user?: User | null): Promise<void> {
    const prog = localPrograms.find((p) => p.id === id)
    if (!prog) throw new Error('Program kerja tidak ditemukan')
    verifyAccess(user, 'Program', 'delete', prog.organization_id)
    await delay(120)
    localPrograms = localPrograms.filter((p) => p.id !== id)
    setStorage('programs', localPrograms)
    logAudit(user, 'delete', 'Program', id, prog.organization_id, prog as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 7. AGENDA & KEGIATAN
  // --------------------------------------------------------------------------
  async getAgendas(organizationId: string, programId?: string, user?: User | null): Promise<Agenda[]> {
    await delay(80)
    verifyAccess(user, 'Agenda', 'viewAny', organizationId)
    let filtered = localAgendas.filter((a) => a.organization_id === organizationId)
    if (programId) {
      filtered = filtered.filter((a) => a.program_id === programId)
    }
    return filtered.map((a) => ({
      ...a,
      program: localPrograms.find((p) => p.id === a.program_id),
      section: localSections.find((s) => s.id === a.section_id),
      pic_user: a.pic_user_id ? localUsers.find((u) => u.id === a.pic_user_id) : undefined,
    }))
  },

  async createAgenda(
    data: Omit<Agenda, 'id' | 'created_at' | 'program' | 'section' | 'pic_user'>,
    user?: User | null
  ): Promise<Agenda> {
    verifyAccess(user, 'Agenda', 'create', data.organization_id)
    await delay(100)
    const newAgenda: Agenda = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    localAgendas = [newAgenda, ...localAgendas]
    setStorage('agendas', localAgendas)
    logAudit(user, 'create', 'Agenda', newAgenda.id, data.organization_id, undefined, newAgenda as unknown as Record<string, unknown>)
    return newAgenda
  },

  async updateAgenda(
    id: string,
    data: Partial<Agenda>,
    user?: User | null
  ): Promise<Agenda> {
    const agenda = localAgendas.find((a) => a.id === id)
    if (!agenda) throw new Error('Agenda tidak ditemukan')
    verifyAccess(user, 'Agenda', 'update', agenda.organization_id)
    await delay(100)
    const index = localAgendas.findIndex((a) => a.id === id)
    const oldVal = { ...localAgendas[index] }
    localAgendas[index] = { ...localAgendas[index], ...data }
    setStorage('agendas', localAgendas)
    logAudit(user, 'update', 'Agenda', id, agenda.organization_id, oldVal as unknown as Record<string, unknown>, localAgendas[index] as unknown as Record<string, unknown>)
    return localAgendas[index]
  },

  async transitionAgendaStatus(
    id: string,
    nextStatus: AgendaStatus,
    user?: User | null
  ): Promise<Agenda> {
    const agenda = localAgendas.find((a) => a.id === id)
    if (!agenda) throw new Error('Agenda tidak ditemukan')
    verifyAccess(user, 'Agenda', 'update', agenda.organization_id)

    if (!canTransitionAgendaStatus(agenda.status, nextStatus)) {
      throw new Error(`Transisi status agenda dari [${agenda.status}] ke [${nextStatus}] tidak diizinkan.`)
    }

    await delay(80)
    const index = localAgendas.findIndex((a) => a.id === id)
    const oldStatus = agenda.status
    localAgendas[index] = { ...localAgendas[index], status: nextStatus }
    setStorage('agendas', localAgendas)
    logAudit(user, 'update', 'Agenda', id, agenda.organization_id, { status: oldStatus }, { status: nextStatus })
    return localAgendas[index]
  },

  async deleteAgenda(id: string, user?: User | null): Promise<void> {
    const agenda = localAgendas.find((a) => a.id === id)
    if (!agenda) throw new Error('Agenda tidak ditemukan')
    verifyAccess(user, 'Agenda', 'delete', agenda.organization_id)
    await delay(100)
    localAgendas = localAgendas.filter((a) => a.id !== id)
    setStorage('agendas', localAgendas)
    logAudit(user, 'delete', 'Agenda', id, agenda.organization_id, agenda as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 8. CAPAIAN KINERJA (KPI & Bukti)
  // --------------------------------------------------------------------------
  async getPerformances(organizationId: string, programId?: string, user?: User | null): Promise<Performance[]> {
    await delay(80)
    verifyAccess(user, 'Performance', 'viewAny', organizationId)
    let filtered = localPerformances.filter((p) => p.organization_id === organizationId)
    if (programId) {
      filtered = filtered.filter((p) => p.program_id === programId)
    }
    return filtered.map((perf) => ({
      ...perf,
      program: localPrograms.find((p) => p.id === perf.program_id),
    }))
  },

  async createPerformance(
    data: Omit<Performance, 'id' | 'created_at' | 'updated_at' | 'program'>,
    user?: User | null
  ): Promise<Performance> {
    verifyAccess(user, 'Performance', 'create', data.organization_id)
    const target = data.target ?? data.target_value ?? 100
    const realized = data.realized ?? data.realized_value ?? 0
    const percentage = target > 0 ? Math.min(100, Math.round((realized / target) * 100)) : 0
    const newPerf: Performance = {
      ...data,
      percentage,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localPerformances = [newPerf, ...localPerformances]
    setStorage('performances', localPerformances)
    logAudit(user, 'create', 'Performance', newPerf.id, data.organization_id, undefined, newPerf as unknown as Record<string, unknown>)
    return newPerf
  },

  async updatePerformance(
    id: string,
    data: Partial<Performance>,
    user?: User | null
  ): Promise<Performance> {
    const perf = localPerformances.find((p) => p.id === id)
    if (!perf) throw new Error('Data capaian kinerja tidak ditemukan')
    verifyAccess(user, 'Performance', 'update', perf.organization_id)
    await delay(100)
    const index = localPerformances.findIndex((p) => p.id === id)
    const oldVal = { ...localPerformances[index] }
    const updatedTarget = data.target ?? data.target_value ?? perf.target ?? perf.target_value ?? 100
    const updatedRealized = data.realized ?? data.realized_value ?? perf.realized ?? perf.realized_value ?? 0
    const percentage = updatedTarget > 0 ? Math.min(100, Math.round((updatedRealized / updatedTarget) * 100)) : 0

    localPerformances[index] = {
      ...localPerformances[index],
      ...data,
      percentage,
      updated_at: new Date().toISOString(),
    }
    setStorage('performances', localPerformances)
    logAudit(user, 'update', 'Performance', id, perf.organization_id, oldVal as unknown as Record<string, unknown>, localPerformances[index] as unknown as Record<string, unknown>)
    return localPerformances[index]
  },

  async deletePerformance(id: string, user?: User | null): Promise<void> {
    const perf = localPerformances.find((p) => p.id === id)
    if (!perf) throw new Error('Data capaian kinerja tidak ditemukan')
    verifyAccess(user, 'Performance', 'delete', perf.organization_id)
    await delay(100)
    localPerformances = localPerformances.filter((p) => p.id !== id)
    setStorage('performances', localPerformances)
    logAudit(user, 'delete', 'Performance', id, perf.organization_id, perf as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 9. KEUANGAN & TRANSAKSI (Anggaran & Realisasi)
  // --------------------------------------------------------------------------
  async getBudgets(organizationId: string, programId?: string, user?: User | null): Promise<Budget[]> {
    await delay(80)
    verifyAccess(user, 'Finance', 'viewAny', organizationId)
    let filtered = localBudgets.filter((b) => b.organization_id === organizationId)
    if (programId) {
      filtered = filtered.filter((b) => b.program_id === programId)
    }
    return filtered.map((b) => ({
      ...b,
      program: localPrograms.find((p) => p.id === b.program_id),
      transactions: localTransactions.filter((tx) => tx.budget_id === b.id),
    }))
  },

  async createBudget(
    data: Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'program' | 'transactions'>,
    user?: User | null
  ): Promise<Budget> {
    verifyAccess(user, 'Finance', 'create', data.organization_id)
    await delay(100)
    const newBudget: Budget = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localBudgets = [newBudget, ...localBudgets]
    setStorage('budgets', localBudgets)
    logAudit(user, 'create', 'Finance', newBudget.id, data.organization_id, undefined, newBudget as unknown as Record<string, unknown>)
    return newBudget
  },

  async updateBudget(
    id: string,
    data: Partial<Budget>,
    user?: User | null
  ): Promise<Budget> {
    const b = localBudgets.find((item) => item.id === id)
    if (!b) throw new Error('Data anggaran tidak ditemukan')
    verifyAccess(user, 'Finance', 'update', b.organization_id)
    await delay(100)
    const index = localBudgets.findIndex((item) => item.id === id)
    const oldVal = { ...localBudgets[index] }
    localBudgets[index] = {
      ...localBudgets[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    setStorage('budgets', localBudgets)
    logAudit(user, 'update', 'Finance', id, b.organization_id, oldVal as unknown as Record<string, unknown>, localBudgets[index] as unknown as Record<string, unknown>)
    return localBudgets[index]
  },

  async getTransactions(organizationId: string, budgetId?: string, user?: User | null): Promise<Transaction[]> {
    await delay(80)
    verifyAccess(user, 'Finance', 'viewAny', organizationId)
    let filtered = localTransactions.filter((t) => t.organization_id === organizationId)
    if (budgetId) {
      filtered = filtered.filter((t) => t.budget_id === budgetId)
    }
    return filtered.map((tx) => ({
      ...tx,
      budget: localBudgets.find((b) => b.id === tx.budget_id),
      recorder: tx.recorded_by ? localUsers.find((u) => u.id === tx.recorded_by) : undefined,
    }))
  },

  async createTransaction(
    data: Omit<Transaction, 'id' | 'created_at' | 'budget' | 'recorder'>,
    user?: User | null
  ): Promise<Transaction> {
    verifyAccess(user, 'Finance', 'create', data.organization_id)
    await delay(100)
    const newTx: Transaction = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    localTransactions = [newTx, ...localTransactions]
    setStorage('transactions', localTransactions)

    // Update parent Budget realized amount and remaining balance if expense
    if (newTx.type === 'expense') {
      const budgetIndex = localBudgets.findIndex((b) => b.id === newTx.budget_id)
      if (budgetIndex !== -1) {
        const budget = localBudgets[budgetIndex]
        const realizedBase = budget.realized_amount || budget.amount_spent || 0
        const allocatedBase = budget.allocated_amount || budget.amount_allocated || budget.planned_amount || 0
        const newRealized = Math.max(0, realizedBase + newTx.amount)
        const newBalance = Math.max(0, allocatedBase - newRealized)
        localBudgets[budgetIndex] = {
          ...budget,
          realized_amount: newRealized,
          remaining_balance: newBalance,
          updated_at: new Date().toISOString(),
        }
        setStorage('budgets', localBudgets)

        // Also sync to program's budget_realized
        const progIndex = localPrograms.findIndex((p) => p.id === budget.program_id)
        if (progIndex !== -1) {
          localPrograms[progIndex] = {
            ...localPrograms[progIndex],
            budget_realized: newRealized,
            updated_at: new Date().toISOString(),
          }
          setStorage('programs', localPrograms)
        }
      }
    }

    logAudit(user, 'create', 'Finance', newTx.id, data.organization_id, undefined, newTx as unknown as Record<string, unknown>)
    return newTx
  },

  async deleteTransaction(id: string, user?: User | null): Promise<void> {
    const tx = localTransactions.find((t) => t.id === id)
    if (!tx) throw new Error('Transaksi tidak ditemukan')
    verifyAccess(user, 'Finance', 'delete', tx.organization_id)
    await delay(100)
    localTransactions = localTransactions.filter((t) => t.id !== id)
    setStorage('transactions', localTransactions)

    // Revert budget realization if it was an expense
    if (tx.type === 'expense') {
      const budgetIndex = localBudgets.findIndex((b) => b.id === tx.budget_id)
      if (budgetIndex !== -1) {
        const budget = localBudgets[budgetIndex]
        const realizedBase = budget.realized_amount || budget.amount_spent || 0
        const allocatedBase = budget.allocated_amount || budget.amount_allocated || budget.planned_amount || 0
        const newRealized = Math.max(0, realizedBase - tx.amount)
        const newBalance = Math.max(0, allocatedBase - newRealized)
        localBudgets[budgetIndex] = {
          ...budget,
          realized_amount: newRealized,
          remaining_balance: newBalance,
          updated_at: new Date().toISOString(),
        }
        setStorage('budgets', localBudgets)

        const progIndex = localPrograms.findIndex((p) => p.id === budget.program_id)
        if (progIndex !== -1) {
          localPrograms[progIndex] = {
            ...localPrograms[progIndex],
            budget_realized: newRealized,
            updated_at: new Date().toISOString(),
          }
          setStorage('programs', localPrograms)
        }
      }
    }

    logAudit(user, 'delete', 'Finance', id, tx.organization_id, tx as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 10. LAPORAN & EVALUASI (Verifikasi Ketua)
  // --------------------------------------------------------------------------
  async getReports(organizationId: string, programId?: string, user?: User | null): Promise<Report[]> {
    await delay(80)
    verifyAccess(user, 'Report', 'viewAny', organizationId)
    let filtered = localReports.filter((r) => r.organization_id === organizationId)
    if (programId) {
      filtered = filtered.filter((r) => r.program_id === programId)
    }
    return filtered.map((rep) => ({
      ...rep,
      program: localPrograms.find((p) => p.id === rep.program_id),
      author: localUsers.find((u) => u.id === rep.author_id),
      reviewer: rep.reviewer_id ? localUsers.find((u) => u.id === rep.reviewer_id) : undefined,
    }))
  },

  async getReportById(id: string, user?: User | null): Promise<Report | null> {
    await delay(80)
    const report = localReports.find((r) => r.id === id)
    if (!report) return null
    verifyAccess(user, 'Report', 'view', report.organization_id)
    return {
      ...report,
      program: localPrograms.find((p) => p.id === report.program_id),
      author: localUsers.find((u) => u.id === report.author_id),
      reviewer: report.reviewer_id ? localUsers.find((u) => u.id === report.reviewer_id) : undefined,
    }
  },

  async createReport(
    data: Omit<Report, 'id' | 'created_at' | 'program' | 'author' | 'reviewer'>,
    user?: User | null
  ): Promise<Report> {
    verifyAccess(user, 'Report', 'create', data.organization_id)
    await delay(100)
    const newReport: Report = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      submitted_at: data.status === 'submitted' ? new Date().toISOString() : undefined,
    }
    localReports = [newReport, ...localReports]
    setStorage('reports', localReports)

    // Notify ketua if report is submitted
    if (newReport.status === 'submitted') {
      const ketuaMem = localMemberships.find(
        (m) => m.organization_id === newReport.organization_id && m.role_id === 'role-ketua'
      )
      if (ketuaMem) {
        const notif: Notification = {
          id: crypto.randomUUID(),
          user_id: ketuaMem.user_id,
          organization_id: newReport.organization_id,
          title: 'Laporan Baru Memerlukan Peninjauan',
          message: `Laporan "${newReport.title}" telah diserahkan dan menanti persetujuan Anda.`,
          type: 'action_required',
          link: `/reports/${newReport.id}`,
          is_read: false,
          created_at: new Date().toISOString(),
        }
        localNotifications = [notif, ...localNotifications]
        setStorage('notifications', localNotifications)
      }
    }

    logAudit(user, 'create', 'Report', newReport.id, data.organization_id, undefined, newReport as unknown as Record<string, unknown>)
    return newReport
  },

  async updateReport(
    id: string,
    data: Partial<Report>,
    user?: User | null
  ): Promise<Report> {
    const report = localReports.find((r) => r.id === id)
    if (!report) throw new Error('Laporan tidak ditemukan')
    verifyAccess(user, 'Report', 'update', report.organization_id)
    await delay(100)
    const index = localReports.findIndex((r) => r.id === id)
    const oldVal = { ...localReports[index] }
    localReports[index] = { ...localReports[index], ...data }
    setStorage('reports', localReports)
    logAudit(user, 'update', 'Report', id, report.organization_id, oldVal as unknown as Record<string, unknown>, localReports[index] as unknown as Record<string, unknown>)
    return localReports[index]
  },

  async transitionReportStatus(
    id: string,
    nextStatus: ReportStatus,
    reviewNotes?: string,
    user?: User | null
  ): Promise<Report> {
    const report = localReports.find((r) => r.id === id)
    if (!report) throw new Error('Laporan tidak ditemukan')
    verifyAccess(user, 'Report', 'update', report.organization_id)

    if (!canTransitionReportStatus(report.status, nextStatus)) {
      throw new Error(`Transisi status laporan dari [${report.status}] ke [${nextStatus}] tidak diizinkan.`)
    }

    await delay(100)
    const index = localReports.findIndex((r) => r.id === id)
    const oldStatus = report.status
    const updatePayload: Partial<Report> = {
      status: nextStatus,
      review_notes: reviewNotes !== undefined ? reviewNotes : report.review_notes,
    }

    if (nextStatus === 'approved' || nextStatus === 'revised') {
      updatePayload.reviewer_id = user?.id
      updatePayload.reviewed_at = new Date().toISOString()
    }
    if (nextStatus === 'submitted') {
      updatePayload.submitted_at = new Date().toISOString()
    }

    localReports[index] = { ...localReports[index], ...updatePayload }
    setStorage('reports', localReports)

    // Notify Author
    const authorUser = localUsers.find((u) => u.id === report.author_id)
    if (authorUser) {
      const notif: Notification = {
        id: crypto.randomUUID(),
        user_id: report.author_id,
        organization_id: report.organization_id,
        title: nextStatus === 'approved' ? 'Laporan Telah Disetujui' : 'Catatan Revisi Laporan',
        message: nextStatus === 'approved'
          ? `Laporan "${report.title}" telah disetujui pimpinan.`
          : `Laporan "${report.title}" memerlukan perbaikan: ${reviewNotes || 'Lihat catatan evaluasi.'}`,
        type: nextStatus === 'approved' ? 'success' : 'warning',
        link: `/reports/${report.id}`,
        is_read: false,
        created_at: new Date().toISOString(),
      }
      localNotifications = [notif, ...localNotifications]
      setStorage('notifications', localNotifications)
    }

    logAudit(user, 'update', 'Report', id, report.organization_id, { status: oldStatus }, { status: nextStatus, review_notes: reviewNotes })
    return localReports[index]
  },

  // --------------------------------------------------------------------------
  // 11. TINDAK LANJUT & TUGAS (Task Execution)
  // --------------------------------------------------------------------------
  async getTasks(organizationId: string, programId?: string, user?: User | null): Promise<Task[]> {
    await delay(80)
    verifyAccess(user, 'Task', 'viewAny', organizationId)
    let filtered = localTasks.filter((t) => t.organization_id === organizationId)
    if (programId) {
      filtered = filtered.filter((t) => t.program_id === programId)
    }
    return filtered.map((t) => ({
      ...t,
      program: localPrograms.find((p) => p.id === t.program_id),
      agenda: t.agenda_id ? localAgendas.find((a) => a.id === t.agenda_id) : undefined,
      assignee: t.assigned_to ? localUsers.find((u) => u.id === t.assigned_to) : undefined,
    }))
  },

  async createTask(
    data: Omit<Task, 'id' | 'created_at' | 'program' | 'agenda' | 'assignee'>,
    user?: User | null
  ): Promise<Task> {
    verifyAccess(user, 'Task', 'create', data.organization_id)
    await delay(100)
    const newTask: Task = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    localTasks = [newTask, ...localTasks]
    setStorage('tasks', localTasks)
    logAudit(user, 'create', 'Task', newTask.id, data.organization_id, undefined, newTask as unknown as Record<string, unknown>)
    return newTask
  },

  async updateTask(
    id: string,
    data: Partial<Task>,
    user?: User | null
  ): Promise<Task> {
    const task = localTasks.find((t) => t.id === id)
    if (!task) throw new Error('Tugas tidak ditemukan')
    verifyAccess(user, 'Task', 'update', task.organization_id)
    await delay(100)
    const index = localTasks.findIndex((t) => t.id === id)
    const oldVal = { ...localTasks[index] }
    localTasks[index] = { ...localTasks[index], ...data }
    setStorage('tasks', localTasks)
    logAudit(user, 'update', 'Task', id, task.organization_id, oldVal as unknown as Record<string, unknown>, localTasks[index] as unknown as Record<string, unknown>)
    return localTasks[index]
  },

  async transitionTaskStatus(
    id: string,
    nextStatus: TaskStatus,
    user?: User | null
  ): Promise<Task> {
    const task = localTasks.find((t) => t.id === id)
    if (!task) throw new Error('Tugas tidak ditemukan')
    verifyAccess(user, 'Task', 'update', task.organization_id)

    if (!canTransitionTaskStatus(task.status, nextStatus)) {
      throw new Error(`Transisi status tugas dari [${task.status}] ke [${nextStatus}] tidak diizinkan.`)
    }

    await delay(80)
    const index = localTasks.findIndex((t) => t.id === id)
    const oldStatus = task.status
    const updatePayload: Partial<Task> = {
      status: nextStatus,
    }
    if (nextStatus === 'completed') {
      updatePayload.completed_at = new Date().toISOString()
    }

    localTasks[index] = { ...localTasks[index], ...updatePayload }
    setStorage('tasks', localTasks)
    logAudit(user, 'update', 'Task', id, task.organization_id, { status: oldStatus }, { status: nextStatus })
    return localTasks[index]
  },

  async deleteTask(id: string, user?: User | null): Promise<void> {
    const task = localTasks.find((t) => t.id === id)
    if (!task) throw new Error('Tugas tidak ditemukan')
    verifyAccess(user, 'Task', 'delete', task.organization_id)
    await delay(100)
    localTasks = localTasks.filter((t) => t.id !== id)
    setStorage('tasks', localTasks)
    logAudit(user, 'delete', 'Task', id, task.organization_id, task as unknown as Record<string, unknown>, undefined)
  },

  // --------------------------------------------------------------------------
  // 12. NOTIFIKASI & AUDIT LOG
  // --------------------------------------------------------------------------
  async getNotifications(userId: string, organizationId?: string): Promise<Notification[]> {
    await delay(60)
    let filtered = localNotifications.filter((n) => n.user_id === userId)
    if (organizationId) {
      filtered = filtered.filter((n) => !n.organization_id || n.organization_id === organizationId)
    }
    return filtered
  },

  async markNotificationAsRead(id: string): Promise<void> {
    await delay(40)
    const index = localNotifications.findIndex((n) => n.id === id)
    if (index !== -1) {
      localNotifications[index].is_read = true
      setStorage('notifications', localNotifications)
    }
  },

  async getAuditLogs(organizationId?: string, user?: User | null): Promise<AuditLog[]> {
    await delay(80)
    verifyAccess(user, 'Audit', 'viewAny', organizationId)
    let logs = [...localAuditLogs]
    if (organizationId && (!user || (!user.is_superadmin && user.role !== 'superadmin'))) {
      logs = logs.filter((l) => l.organization_id === organizationId)
    }
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  async deleteAuditLog(id: string, organizationId?: string, user?: User | null): Promise<boolean> {
    await delay(60)
    verifyAccess(user, 'Audit', 'delete', organizationId)
    const target = localAuditLogs.find((l) => l.id === id)
    if (!target) return false
    localAuditLogs = localAuditLogs.filter((l) => l.id !== id)
    setStorage('audit_logs', localAuditLogs)
    return true
  },

  async deleteAuditLogs(ids: string[], organizationId?: string, user?: User | null): Promise<boolean> {
    await delay(80)
    verifyAccess(user, 'Audit', 'deleteAny', organizationId)
    const idSet = new Set(ids)
    localAuditLogs = localAuditLogs.filter((l) => !idSet.has(l.id))
    setStorage('audit_logs', localAuditLogs)
    return true
  },

  async clearAuditLogs(organizationId?: string, user?: User | null): Promise<boolean> {
    await delay(100)
    verifyAccess(user, 'Audit', 'forceDeleteAny', organizationId)
    if (organizationId && (!user || (!user.is_superadmin && user.role !== 'superadmin'))) {
      localAuditLogs = localAuditLogs.filter((l) => l.organization_id !== organizationId)
    } else {
      localAuditLogs = []
    }
    setStorage('audit_logs', localAuditLogs)
    return true
  },


  // --------------------------------------------------------------------------
  // 13. ECOSYSTEM STATS & METRICS (Dashboard Ringkasan Operasional)
  // --------------------------------------------------------------------------
  async getEcosystemStats(organizationId: string, user?: User | null) {
    await delay(80)
    verifyAccess(user, 'Program', 'viewAny', organizationId)
    const orgPrograms = localPrograms.filter((p) => p.organization_id === organizationId)
    const orgAgendas = localAgendas.filter((a) => a.organization_id === organizationId)
    const orgReports = localReports.filter((r) => r.organization_id === organizationId)
    const orgTasks = localTasks.filter((t) => t.organization_id === organizationId)
    const orgBudgets = localBudgets.filter((b) => b.organization_id === organizationId)

    const totalBudget = orgBudgets.reduce((sum, b) => sum + (b.allocated_amount || b.amount_allocated || b.planned_amount || 0), 0)
    const realizedBudget = orgBudgets.reduce((sum, b) => sum + (b.realized_amount || b.amount_spent || 0), 0)
    const absorptionRate = totalBudget > 0 ? Math.round((realizedBudget / totalBudget) * 100) : 0

    return {
      totalPrograms: orgPrograms.length,
      activePrograms: orgPrograms.filter((p) => p.status === 'active').length,
      completedPrograms: orgPrograms.filter((p) => p.status === 'completed').length,
      totalAgendas: orgAgendas.length,
      inProgressAgendas: orgAgendas.filter((a) => a.status === 'in_progress').length,
      upcomingAgendas: orgAgendas.filter((a) => a.status === 'upcoming').length,
      totalReports: orgReports.length,
      pendingReports: orgReports.filter((r) => r.status === 'submitted' || r.status === 'in_review').length,
      approvedReports: orgReports.filter((r) => r.status === 'approved').length,
      totalTasks: orgTasks.length,
      pendingTasks: orgTasks.filter((t) => t.status === 'new' || t.status === 'in_progress').length,
      totalBudget,
      realizedBudget,
      absorptionRate,
    }
  },
}
