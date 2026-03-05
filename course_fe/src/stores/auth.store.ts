import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { login as apiLogin, register as apiRegister, getUserById, updateProfile as apiUpdateProfile } from '../services/auth.api'
import { setTokens, clearTokens, getAccessToken, getRefreshToken, API_BASE_URL } from '../services/http'
import type { UserType } from '../services/auth.api'

// ─── Types ────────────────────────────────────────────────────

/** FE role naming: BE 'student' → FE 'user' */
export type UserRole = 'unknown' | 'user' | 'instructor' | 'admin'

export interface Permission {
  id: string
  name: string
  category: string
  description: string
}

export interface User {
  id: string            // string for FE compat (BE returns number)
  name: string          // mapped from BE full_name or username
  username: string
  email: string
  avatar?: string
  roles: UserRole[]
  permissions: string[]
  bio?: string
  phone?: string
  address?: string
  website?: string
  twitter?: string
  facebook?: string
  linkedin?: string
  youtube?: string
  createdAt: Date
  totalCourses?: number
  totalStudents?: number
  adminLevel?: 'super' | 'sub'
  isOnline?: boolean
  lastSeen?: Date
  status?: 'active' | 'inactive' | 'banned'
  profileSettings?: {
    showCourses: boolean
    showStats: boolean
    showBio: boolean
    showSocialLinks: boolean
    customSections: Array<{
      id: string
      title: string
      content: string
      visible: boolean
    }>
  }
}

// ─── Constants ────────────────────────────────────────────────

export const PERMISSIONS: Permission[] = [
  // Basic User permissions
  { id: 'user.profile.view', name: 'View Profile', category: 'User', description: 'View user profiles' },
  { id: 'user.profile.edit', name: 'Edit Profile', category: 'User', description: 'Edit own profile' },
  { id: 'user.courses.enroll', name: 'Enroll Courses', category: 'User', description: 'Enroll in courses' },
  { id: 'user.reviews.create', name: 'Create Reviews', category: 'User', description: 'Create course reviews' },
  { id: 'user.comments.create', name: 'Create Comments', category: 'User', description: 'Create comments on posts' },
  { id: 'user.comments.vote', name: 'Vote Comments', category: 'User', description: 'Vote on comments and replies' },
  { id: 'user.blog.read', name: 'Read Blog Posts', category: 'User', description: 'Read blog posts' },
  { id: 'user.qna.ask', name: 'Ask Questions', category: 'User', description: 'Ask questions in Q&A' },
  { id: 'user.qna.answer', name: 'Answer Questions', category: 'User', description: 'Answer questions in Q&A' },
  { id: 'user.social.follow', name: 'Follow Users', category: 'User', description: 'Follow other users' },
  // Instructor permissions
  { id: 'instructor.courses.create', name: 'Create Courses', category: 'Instructor', description: 'Create new courses' },
  { id: 'instructor.courses.edit', name: 'Edit Courses', category: 'Instructor', description: 'Edit own courses' },
  { id: 'instructor.courses.delete', name: 'Delete Courses', category: 'Instructor', description: 'Delete own courses' },
  { id: 'instructor.lessons.manage', name: 'Manage Lessons', category: 'Instructor', description: 'Manage course lessons' },
  { id: 'instructor.earnings.view', name: 'View Earnings', category: 'Instructor', description: 'View earnings data' },
  { id: 'instructor.students.manage', name: 'Manage Students', category: 'Instructor', description: 'Manage course students' },
  { id: 'instructor.blog.create', name: 'Create Blog Posts', category: 'Instructor', description: 'Create blog posts' },
  { id: 'instructor.blog.edit', name: 'Edit Blog Posts', category: 'Instructor', description: 'Edit own blog posts' },
  { id: 'instructor.qna.moderate', name: 'Moderate Q&A', category: 'Instructor', description: 'Moderate Q&A in own courses' },
  { id: 'instructor.comments.moderate', name: 'Moderate Comments', category: 'Instructor', description: 'Moderate comments on own content' },
  { id: 'instructor.analytics.view', name: 'View Analytics', category: 'Instructor', description: 'View course analytics' },
  // Admin permissions
  { id: 'admin.users.manage', name: 'Manage Users', category: 'Admin', description: 'Manage all users' },
  { id: 'admin.users.ban', name: 'Ban Users', category: 'Admin', description: 'Ban/unban users' },
  { id: 'admin.courses.manage', name: 'Manage All Courses', category: 'Admin', description: 'Manage all courses' },
  { id: 'admin.courses.approve', name: 'Approve Courses', category: 'Admin', description: 'Approve course submissions' },
  { id: 'admin.payments.manage', name: 'Manage Payments', category: 'Admin', description: 'Manage payment system' },
  { id: 'admin.blog.approve', name: 'Approve Blog Posts', category: 'Admin', description: 'Approve blog posts' },
  { id: 'admin.blog.manage', name: 'Manage All Blogs', category: 'Admin', description: 'Manage all blog content' },
  { id: 'admin.comments.moderate', name: 'Moderate All Comments', category: 'Admin', description: 'Moderate all comments' },
  { id: 'admin.qna.moderate', name: 'Moderate All Q&A', category: 'Admin', description: 'Moderate all Q&A content' },
  { id: 'admin.platform.settings', name: 'Platform Settings', category: 'Admin', description: 'Manage platform settings' },
  { id: 'admin.website.manage', name: 'Manage Website', category: 'Admin', description: 'Manage website content (banners, logos, etc.)' },
  { id: 'admin.statistics.view', name: 'View Statistics', category: 'Admin', description: 'View platform statistics' },
  { id: 'admin.permissions.manage', name: 'Manage Permissions', category: 'Admin', description: 'Manage user permissions' },
  { id: 'admin.reports.view', name: 'View Reports', category: 'Admin', description: 'View all reports and analytics' },
  { id: 'admin.system.maintain', name: 'System Maintenance', category: 'Admin', description: 'Perform system maintenance' },
]

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  unknown: ['user.blog.read'],
  user: [
    'user.profile.view', 'user.profile.edit', 'user.courses.enroll',
    'user.reviews.create', 'user.comments.create', 'user.comments.vote',
    'user.blog.read', 'user.qna.ask', 'user.qna.answer', 'user.social.follow',
  ],
  instructor: [
    'user.profile.view', 'user.profile.edit', 'user.courses.enroll',
    'user.reviews.create', 'user.comments.create', 'user.comments.vote',
    'user.blog.read', 'user.qna.ask', 'user.qna.answer', 'user.social.follow',
    'instructor.courses.create', 'instructor.courses.edit', 'instructor.courses.delete',
    'instructor.lessons.manage', 'instructor.earnings.view', 'instructor.students.manage',
    'instructor.blog.create', 'instructor.blog.edit', 'instructor.qna.moderate',
    'instructor.comments.moderate', 'instructor.analytics.view',
  ],
  admin: PERMISSIONS.map(p => p.id),
}

// ─── Helpers ──────────────────────────────────────────────────

/** Map BE user_type array to FE roles array */
function mapUserTypes(userTypes: UserType[]): UserRole[] {
  return userTypes.map(t => (t === 'student' ? 'user' : t)) as UserRole[]
}

/** Derive permissions from roles */
function derivePermissions(roles: UserRole[]): string[] {
  const perms = new Set<string>()
  roles.forEach(role => {
    ROLE_PERMISSIONS[role]?.forEach(p => perms.add(p))
  })
  return Array.from(perms)
}

// ─── Store Interface ──────────────────────────────────────────

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null

  // Actions
  login: (username: string, password: string) => Promise<boolean>
  signup: (username: string, email: string, fullName: string, password: string) => Promise<boolean>
  logout: () => void
  fetchProfile: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  updateProfileSettings: (settings: Partial<User['profileSettings']>) => void
  clearError: () => void

  // Helpers
  hasRole: (role: UserRole) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  canAccess: (requiredRoles?: UserRole[], requiredPermissions?: string[]) => boolean
}

// ─── Store Implementation ─────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await apiLogin({ username, password })

          // Store tokens
          setTokens(res.access_token, res.refresh_token)

          // Map BE user to FE User
          const roles = mapUserTypes(res.user.user_type)
          const permissions = derivePermissions(roles)

          const user: User = {
            id: String(res.user.id),
            name: res.user.username,     // will be updated by fetchProfile
            username: res.user.username,
            email: res.user.email,
            roles,
            permissions,
            createdAt: new Date(),
            isOnline: true,
            lastSeen: new Date(),
            profileSettings: {
              showCourses: true,
              showStats: false,
              showBio: true,
              showSocialLinks: true,
              customSections: [],
            },
          }

          set({ user, isLoading: false })

          // Fetch full profile in background (has avatar, full_name, etc.)
          get().fetchProfile()

          return true
        } catch (err: any) {
          const msg = err?.errors?.error || err?.message || 'Login failed'
          set({ isLoading: false, error: msg })
          return false
        }
      },

      signup: async (username, email, fullName, password) => {
        set({ isLoading: true, error: null })
        try {
          await apiRegister({
            username,
            email,
            full_name: fullName,
            password,
          })

          set({ isLoading: false })
          // After register, user needs to verify email before login (status = inactive)
          // So we don't auto-login here
          return true
        } catch (err: any) {
          const msg = err?.errors?.error || err?.errors?.email?.[0] || err?.errors?.username?.[0] || err?.message || 'Registration failed'
          set({ isLoading: false, error: msg })
          return false
        }
      },

      logout: () => {
        // call server to revoke current refresh token (best effort)
        const refresh = getRefreshToken()
        if (refresh) {
          fetch(`${API_BASE_URL}/users/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refresh }),
          }).catch(() => {})
        }
        clearTokens()
        set({ user: null, error: null })
      },

      fetchProfile: async () => {
        const user = get().user
        if (!user) return
        try {
          const profile = await getUserById(Number(user.id))
          set({
            user: {
              ...user,
              name: profile.full_name || profile.username,
              username: profile.username,
              email: profile.email,
              avatar: profile.avatar || undefined,
              phone: profile.phone || undefined,
              address: profile.address || undefined,
              createdAt: new Date(profile.created_at),
              status: profile.status,
            },
          })
        } catch {
          // Profile fetch failed — keep basic user data from login
        }
      },

      updateProfile: async (data) => {
        const userId = get().user?.id
        if (!userId) return
        try {
          // Map FE field names → BE field names for API call
          const apiData: Record<string, unknown> = {}
          const feData = data as Record<string, unknown>
          for (const [key, value] of Object.entries(feData)) {
            if (key === 'name') apiData['full_name'] = value
            else if (['username', 'email', 'phone', 'avatar', 'address', 'full_name', 'password_hash'].includes(key))
              apiData[key] = value
            // Skip FE-only fields (bio, website, social links, etc.) for API
          }
          if (Object.keys(apiData).length > 0) {
            await apiUpdateProfile(Number(userId), apiData as any)
          }
          // Merge FE input data into local state (keeps FE-only fields)
          set((state) => ({
            user: state.user ? { ...state.user, ...data } : null,
          }))
        } catch {
          // Fallback: update local state only
          set((state) => ({
            user: state.user ? { ...state.user, ...data } : null,
          }))
        }
      },

      updateProfileSettings: (settings) => {
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                profileSettings: { ...state.user.profileSettings, ...settings } as any,
              }
            : null,
        }))
      },

      clearError: () => set({ error: null }),

      hasRole: (role) => {
        const user = get().user
        return user?.roles.includes(role) ?? false
      },

      hasPermission: (permission) => {
        const user = get().user
        return user?.permissions.includes(permission) ?? false
      },

      hasAnyRole: (roles) => {
        const user = get().user
        if (!user) return false
        return roles.some(role => user.roles.includes(role))
      },

      canAccess: (requiredRoles, requiredPermissions) => {
        const state = get()
        if (!state.user) return false

        if (requiredRoles && requiredRoles.length > 0) {
          if (!state.hasAnyRole(requiredRoles)) return false
        }

        if (requiredPermissions && requiredPermissions.length > 0) {
          if (!requiredPermissions.every(p => state.hasPermission(p))) return false
        }

        return true
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user, not tokens (they're in their own localStorage keys)
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          // Restore Date objects from strings
          if (typeof state.user.createdAt === 'string') state.user.createdAt = new Date(state.user.createdAt)
          if (typeof state.user.lastSeen === 'string') state.user.lastSeen = new Date(state.user.lastSeen as any)

          // If we have a stored user but no access token, clear user
          if (!getAccessToken()) {
            state.user = null
          }
        }
      },
    }
  )
)
