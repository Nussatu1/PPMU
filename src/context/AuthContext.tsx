import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import type {
  User,
  Organization,
  OrganizationMembership,
  OrganizationScopeMode,
  PermissionAction,
  PermissionResource,
} from '@/types/database'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { dataService } from '@/lib/dataService'
import { initialUsers } from '@/lib/mockData'
import { hasPermission, enforceScope } from '@/lib/authorization'
import {
  getAncestorOrganizationIds,
  getChildrenOrganizations,
  getDescendantOrganizationIds,
} from '@/lib/hierarchyService'

interface AuthContextType {
  user: User | null
  currentOrganization: Organization | null
  userOrganizations: Organization[]
  userMemberships: OrganizationMembership[]
  organizationAncestors: Organization[]
  organizationChildren: Organization[]
  organizationDescendants: Organization[]
  currentScopeMode: OrganizationScopeMode
  canAccessDescendants: boolean
  setScopeMode: (mode: OrganizationScopeMode) => void
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  switchOrganization: (organizationId: string) => void
  refreshOrganizations: () => Promise<void>
  switchPersona: (userId: string) => Promise<void>
  can: (
    resource: PermissionResource,
    action: PermissionAction,
    targetOrgId?: string,
    mode?: OrganizationScopeMode
  ) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      // 1. Prioritize isolated sessionStorage for the active browser tab/window
      let stored: string | null = null
      if (typeof sessionStorage !== 'undefined') {
        stored = sessionStorage.getItem('filament_bakid_auth_user')
      }

      // 2. Non-destructive migration: if sessionStorage is empty, check legacy localStorage once
      if (!stored && typeof localStorage !== 'undefined') {
        const legacyStored = localStorage.getItem('filament_bakid_auth_user')
        if (legacyStored) {
          stored = legacyStored
          try {
            sessionStorage.setItem('filament_bakid_auth_user', legacyStored)
          } catch {}
          localStorage.removeItem('filament_bakid_auth_user')
        }
      }

      // Clean up legacy global logout marker from localStorage if present
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('filament_bakid_logged_out')
      }

      if (stored) {
        const parsed: User = JSON.parse(stored)
        if (parsed && parsed.id) {
          const matched = initialUsers.find(
            (iu) => iu.id === parsed.id || iu.email?.toLowerCase() === parsed.email?.toLowerCase()
          )
          const resolved: User = {
            ...parsed,
            avatar_url: parsed.avatar_url || matched?.avatar_url || '',
            name: parsed.name || matched?.name || parsed.email || 'Pengguna',
          }
          dataService.setActiveAccount(resolved)
          return resolved
        }
      }

      // NO auto-login, NO superadmin fallback. Missing/invalid session renders login page.
      dataService.setActiveAccount(null)
      return null
    } catch {
      dataService.setActiveAccount(null)
      return null
    }
  })

  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([])
  const [userMemberships, setUserMemberships] = useState<OrganizationMembership[]>([])
  const [currentScopeMode, setCurrentScopeMode] = useState<OrganizationScopeMode>('own')
  const [isLoading, setIsLoading] = useState(false)

  // Hitung relasi pohon hierarki untuk organisasi aktif
  const organizationAncestors = useMemo(() => {
    if (!currentOrganization) return []
    const ids = getAncestorOrganizationIds(currentOrganization.id, userOrganizations)
    return userOrganizations.filter((o) => ids.includes(o.id))
  }, [currentOrganization, userOrganizations])

  const organizationChildren = useMemo(() => {
    if (!currentOrganization) return []
    return getChildrenOrganizations(currentOrganization.id, userOrganizations)
  }, [currentOrganization, userOrganizations])

  const organizationDescendants = useMemo(() => {
    if (!currentOrganization) return []
    const ids = getDescendantOrganizationIds(currentOrganization.id, userOrganizations)
    return userOrganizations.filter((o) => ids.includes(o.id))
  }, [currentOrganization, userOrganizations])

  const canAccessDescendants = useMemo(() => {
    if (!user || user.status !== 'active') return false
    if (user.is_superadmin || user.role === 'superadmin') return true
    if (organizationDescendants.length === 0) return false

    const role = user.active_membership?.role
    const roleId = role?.id?.toLowerCase() || ''
    if (['superadmin', 'admin', 'pimpinan', 'ketua', 'direktur'].some((r) => roleId.includes(r))) {
      return true
    }

    const permissions = role?.permissions || []
    return (
      permissions.includes('view:descendants') ||
      permissions.includes('Organization.viewAny') ||
      permissions.includes('all')
    )
  }, [user, organizationDescendants])

  const setScopeMode = useCallback((mode: OrganizationScopeMode) => {
    setCurrentScopeMode(mode)
  }, [])

  // Load organizations for the current user and set active membership
  const loadUserOrganizations = useCallback(async (activeUser: User | null) => {
    if (!activeUser) {
      setUserOrganizations([])
      setUserMemberships([])
      setCurrentOrganization(null)
      return
    }

    try {
      // Ensure shared structural store is up-to-date before reading
      dataService.reloadSharedStructural()
      const allOrgs = await dataService.getOrganizations(activeUser)
      setUserOrganizations(allOrgs)

      // Get user memberships to enrich activeUser with active_membership
      const memberships = await dataService.getMemberships(undefined, activeUser)
      const userMems = memberships.filter((m) => m.user_id === activeUser.id && m.status === 'active')
      setUserMemberships(userMems)

      const savedOrgId = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('filament_bakid_active_org_id')
        : null
      let activeOrg = allOrgs.find((o) => o.id === savedOrgId)

      if (!activeOrg && allOrgs.length > 0) {
        // Prioritize organization where user has an active membership
        const memberOrg = allOrgs.find((o) => userMems.some((m) => m.organization_id === o.id))
        activeOrg = memberOrg || allOrgs[0]
      }

      setCurrentOrganization(activeOrg || null)
      if (activeOrg) {
        try {
          sessionStorage.setItem('filament_bakid_active_org_id', activeOrg.id)
        } catch {}
      } else {
        try {
          sessionStorage.removeItem('filament_bakid_active_org_id')
        } catch {}
      }

      // Attach active membership to user object for the selected organization
      const activeMem = userMems.find((m) => m.organization_id === activeOrg?.id) || userMems[0]
      if (activeMem) {
        setUser((prev) => (prev ? { ...prev, active_membership: activeMem } : null))
      } else {
        setUser((prev) => (prev ? { ...prev, active_membership: undefined } : null))
      }
    } catch {
      // Handled silently
    }
  }, [])

  useEffect(() => {
    if (user) {
      try {
        sessionStorage.removeItem('filament_bakid_logged_out')
        sessionStorage.setItem('filament_bakid_auth_user', JSON.stringify(user))
      } catch {}
      dataService.setActiveAccount(user)
    } else {
      try {
        sessionStorage.removeItem('filament_bakid_auth_user')
      } catch {}
      dataService.setActiveAccount(null)
    }
    loadUserOrganizations(user)
  }, [user?.id, loadUserOrganizations])

  // Sinkronisasi teks judul tab browser dengan organisasi aktif dan nama aplikasi
  useEffect(() => {
    if (currentOrganization) {
      const orgLabel = currentOrganization.short_name || currentOrganization.name
      document.title = `${orgLabel} - My Tafrih`
    } else {
      document.title = 'My Tafrih'
    }
  }, [currentOrganization?.name, currentOrganization?.short_name])

  // Realtime cross-tab & storage synchronization for structural changes (Organization, etc.)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStructuralUpdate = (collection?: string) => {
      if (!collection || collection === 'organizations' || collection === 'organization_memberships') {
        loadUserOrganizations(user)
      }
    }

    let channel: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('filament_structural_sync')
        channel.onmessage = (event) => {
          if (event.data?.type === 'structural_change') {
            handleStructuralUpdate(event.data?.collection)
          }
        }
      }
    } catch {}

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key && (event.key.includes('organizations') || event.key.includes('memberships'))) {
        handleStructuralUpdate()
      }
    }

    const handleCustomWindowSync = (event: CustomEvent) => {
      handleStructuralUpdate(event.detail?.collection)
    }

    window.addEventListener('storage', handleStorageEvent)
    window.addEventListener('filament_structural_change' as any, handleCustomWindowSync)

    return () => {
      if (channel) {
        channel.close()
      }
      window.removeEventListener('storage', handleStorageEvent)
      window.removeEventListener('filament_structural_change' as any, handleCustomWindowSync)
    }
  }, [user, loadUserOrganizations])

  // Keep active user synchronized with registered database & initialUsers (especially avatar_url)
  useEffect(() => {
    if (user?.id) {
      dataService.getUserById(user.id).then((registeredUser) => {
        if (registeredUser) {
          setUser((prev) => {
            if (!prev) return registeredUser
            const matchingInitial = initialUsers.find((iu) => iu.id === registeredUser.id || iu.email?.toLowerCase() === registeredUser.email?.toLowerCase())
            const targetAvatar = registeredUser.avatar_url || matchingInitial?.avatar_url || prev.avatar_url
            if (prev.avatar_url !== targetAvatar || prev.name !== registeredUser.name) {
              return {
                ...prev,
                ...registeredUser,
                avatar_url: targetAvatar,
                active_membership: prev.active_membership,
              }
            }
            return prev
          })
        }
      })
    }
  }, [user?.id])

  const switchOrganization = (organizationId: string) => {
    const org = userOrganizations.find((o) => o.id === organizationId)
    if (org) {
      setCurrentOrganization(org)
      try {
        sessionStorage.setItem('filament_bakid_active_org_id', org.id)
      } catch {}
      // Update active membership on user
      dataService.getMemberships(org.id, user).then((mems) => {
        const activeMem = mems.find((m) => m.user_id === user?.id)
        if (activeMem && user) {
          setUser({ ...user, active_membership: activeMem })
        }
      })
    }
  }

  const refreshOrganizations = useCallback(async () => {
    await loadUserOrganizations(user)
  }, [loadUserOrganizations, user])

  const switchPersona = async (userId: string) => {
    setIsLoading(true)
    try {
      const targetUser = await dataService.getUserById(userId)
      if (targetUser) {
        try {
          sessionStorage.removeItem('filament_bakid_logged_out')
          sessionStorage.removeItem('filament_bakid_active_org_id')
          sessionStorage.setItem('filament_bakid_auth_user', JSON.stringify(targetUser))
        } catch {}
        dataService.setActiveAccount(targetUser)
        setUser(targetUser)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const can = useCallback(
    (
      resource: PermissionResource,
      action: PermissionAction,
      targetOrgId?: string,
      mode: OrganizationScopeMode = currentScopeMode
    ): boolean => {
      if (!user) return false
      if (user.is_superadmin || user.role === 'superadmin') return true

      const orgId = targetOrgId || currentOrganization?.id
      if (!enforceScope(user, orgId, mode, userOrganizations)) return false
      return hasPermission(user, resource, action)
    },
    [user, currentOrganization, currentScopeMode, userOrganizations]
  )

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setIsLoading(false)
          return { success: false, error: error.message }
        }
        if (data.user) {
          const profile = await dataService.getUserById(data.user.id)
          const loggedUser: User = profile || {
            id: data.user.id,
            name: data.user.user_metadata?.name || email.split('@')[0],
            email: data.user.email || email,
            role: 'admin',
            is_superadmin: false,
            status: 'active',
            created_at: new Date().toISOString(),
          }
          try {
            sessionStorage.removeItem('filament_bakid_logged_out')
            sessionStorage.setItem('filament_bakid_auth_user', JSON.stringify(loggedUser))
          } catch {}
          dataService.setActiveAccount(loggedUser)
          setUser(loggedUser)
          setIsLoading(false)
          return { success: true }
        }
      }

      // Check known users with password or default 'password'
      const users = await dataService.getUsers()
      const searchKey = email.trim().toLowerCase()
      const matched = users.find(
        (u) =>
          u.email.toLowerCase() === searchKey ||
          (u.username && u.username.toLowerCase() === searchKey)
      )
      const validPassword = matched?.password_hash || (matched?.is_superadmin ? 'superadmin123' : 'password')
      if (
        matched &&
        (password === validPassword ||
          password === 'password' ||
          (matched.is_superadmin && password === 'superadmin123'))
      ) {
        if (matched.status === 'inactive' || matched.status === 'suspended') {
          setIsLoading(false)
          return {
            success: false,
            error: 'Akun Anda telah dinonaktifkan. Silakan hubungi Superadmin.',
          }
        }
        try {
          sessionStorage.removeItem('filament_bakid_logged_out')
          sessionStorage.setItem('filament_bakid_auth_user', JSON.stringify(matched))
        } catch {}
        dataService.setActiveAccount(matched)
        setUser(matched)
        setIsLoading(false)
        return { success: true }
      }

      setIsLoading(false)
      return {
        success: false,
        error: 'Email/Username atau kata sandi tidak sesuai.',
      }
    } catch (err: unknown) {
      setIsLoading(false)
      const errorMsg = err instanceof Error ? err.message : 'Login gagal'
      return { success: false, error: errorMsg }
    }
  }

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    try {
      sessionStorage.setItem('filament_bakid_logged_out', 'true')
      sessionStorage.removeItem('filament_bakid_auth_user')
      sessionStorage.removeItem('filament_bakid_active_org_id')
    } catch {}
    dataService.setActiveAccount(null)
    setUser(null)
    setCurrentOrganization(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrganization,
        userOrganizations,
        userMemberships,
        organizationAncestors,
        organizationChildren,
        organizationDescendants,
        currentScopeMode,
        canAccessDescendants,
        setScopeMode,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchOrganization,
        refreshOrganizations,
        switchPersona,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
