import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type {
  User,
  Organization,
  PermissionAction,
  PermissionResource,
} from '@/types/database'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { dataService } from '@/lib/dataService'
import { initialUsers } from '@/lib/mockData'
import { hasPermission, enforceScope } from '@/lib/authorization'

interface AuthContextType {
  user: User | null
  currentOrganization: Organization | null
  userOrganizations: Organization[]
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  switchOrganization: (organizationId: string) => void
  refreshOrganizations: () => Promise<void>
  switchPersona: (userId: string) => Promise<void>
  can: (resource: PermissionResource, action: PermissionAction, targetOrgId?: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEFAULT_SUPERADMIN: User = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Pengurus 1 (Pimpinan Harian)',
  email: 'pengurus1@bakid.ponpes.id',
  avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  role: 'superadmin',
  is_superadmin: true,
  status: 'active',
  created_at: new Date().toISOString(),
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('filament_bakid_auth_user')
      if (stored) {
        const parsed: User = JSON.parse(stored)
        const matched = initialUsers.find((iu) => iu.id === parsed.id || iu.email?.toLowerCase() === parsed.email?.toLowerCase())
        return {
          ...parsed,
          avatar_url: parsed.avatar_url || matched?.avatar_url || DEFAULT_SUPERADMIN.avatar_url,
          name: parsed.name || matched?.name || DEFAULT_SUPERADMIN.name,
        }
      }
      return DEFAULT_SUPERADMIN
    } catch {
      return DEFAULT_SUPERADMIN
    }
  })

  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load organizations for the current user and set active membership
  const loadUserOrganizations = useCallback(async (activeUser: User | null) => {
    if (!activeUser) {
      setUserOrganizations([])
      setCurrentOrganization(null)
      return
    }

    try {
      const allOrgs = await dataService.getOrganizations(activeUser)
      setUserOrganizations(allOrgs)

      // Get user memberships to enrich activeUser with active_membership
      const memberships = await dataService.getMemberships(undefined, activeUser)
      const userMems = memberships.filter((m) => m.user_id === activeUser.id && m.status === 'active')

      const savedOrgId = localStorage.getItem('filament_bakid_active_org_id')
      let activeOrg = allOrgs.find((o) => o.id === savedOrgId)

      if (!activeOrg && allOrgs.length > 0) {
        activeOrg = allOrgs[0]
      }

      setCurrentOrganization(activeOrg || null)
      if (activeOrg) {
        localStorage.setItem('filament_bakid_active_org_id', activeOrg.id)
      }

      // Attach active membership to user object for the selected organization
      const activeMem = userMems.find((m) => m.organization_id === activeOrg?.id) || userMems[0]
      if (activeMem) {
        setUser((prev) => (prev ? { ...prev, active_membership: activeMem } : null))
      }
    } catch {
      // Handled silently
    }
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('filament_bakid_auth_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('filament_bakid_auth_user')
    }
    loadUserOrganizations(user)
  }, [user?.id, loadUserOrganizations])

  // Sinkronisasi teks judul tab browser dengan organisasi aktif dan nama aplikasi
  useEffect(() => {
    if (currentOrganization) {
      const orgLabel = currentOrganization.short_name || currentOrganization.name
      document.title = `${orgLabel} — My Tafrih`
    } else {
      document.title = 'My Tafrih'
    }
  }, [currentOrganization?.name, currentOrganization?.short_name])

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
      localStorage.setItem('filament_bakid_active_org_id', org.id)
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
        setUser(targetUser)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const can = useCallback(
    (resource: PermissionResource, action: PermissionAction, targetOrgId?: string): boolean => {
      if (!user) return false
      if (user.is_superadmin || user.role === 'superadmin') return true

      const orgId = targetOrgId || currentOrganization?.id
      if (!enforceScope(user, orgId)) return false
      return hasPermission(user, resource, action)
    },
    [user, currentOrganization]
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
    setUser(null)
    setCurrentOrganization(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrganization,
        userOrganizations,
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
