import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { login as apiLogin, googleLogin as apiGoogleLogin, register as apiRegister, getUserById, updateProfile as apiUpdateProfile } from '../services/auth.api'
import { setTokens, getAccessToken, getRefreshToken, API_BASE_URL, getApiTransportHeaders } from '../services/http'
import { clearSessionData } from '../services/sessionCleanup'
import type { UserType } from '../services/auth.api'




export type UserRole = 'unknown' | 'user' | 'instructor' | 'admin'

export interface Permission {
  id: string
  name: string
  category: string
  description: string
}

export interface User {
  id: string
  name: string
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



export const PERMISSIONS: Permission[] = [

  { id: 'user.profile.view', name: 'View Profile', category: 'User', description: 'permissions_page.permission_descriptions.user_profile_view' },
  { id: 'user.profile.edit', name: 'Edit Profile', category: 'User', description: 'permissions_page.permission_descriptions.user_profile_edit' },
  { id: 'user.courses.enroll', name: 'Enroll Courses', category: 'User', description: 'permissions_page.permission_descriptions.user_courses_enroll' },
  { id: 'user.reviews.create', name: 'Create Reviews', category: 'User', description: 'permissions_page.permission_descriptions.user_reviews_create' },
  { id: 'user.comments.create', name: 'Create Comments', category: 'User', description: 'permissions_page.permission_descriptions.user_comments_create' },
  { id: 'user.comments.vote', name: 'Vote Comments', category: 'User', description: 'permissions_page.permission_descriptions.user_comments_vote' },
  { id: 'user.blog.read', name: 'Read Blog Posts', category: 'User', description: 'permissions_page.permission_descriptions.user_blog_read' },
  { id: 'user.qna.ask', name: 'Ask Questions', category: 'User', description: 'permissions_page.permission_descriptions.user_qna_ask' },
  { id: 'user.qna.answer', name: 'Answer Questions', category: 'User', description: 'permissions_page.permission_descriptions.user_qna_answer' },
  { id: 'user.social.follow', name: 'Follow Users', category: 'User', description: 'permissions_page.permission_descriptions.user_social_follow' },

  { id: 'instructor.courses.create', name: 'Create Courses', category: 'Instructor', description: 'permissions_page.permission_descriptions.instructor_courses_create' },
  { id: 'instructor.courses.edit', name: 'Edit Courses', category: 'Instructor', description: 'permissions_page.permission_descriptions.instructor_courses_edit' },
  { id: 'instructor.courses.delete', name: 'Delete Courses', category: 'Instructor', description: 'permissions_page.permission_descriptions.instructor_courses_delete' },
  { id: 'instructor.lessons.manage', name: 'Manage Lessons', category: 'Instructor', description: 'permissions_page.permission_descriptions.instructor_lessons_manage' },
  { id: 'instructor.earnings.view', name: 'View Earnings', category: 'Instructor', description: 'permissions_page.permission_descriptions.instructor_earnings_view' },
  { id: 'instructor.students.manage', name: 'Manage Students', category: 'Instructor', description: 'permissions_page.permission_descriptions.instructor_students_manage' },
  { id: 'instructor.blog.create', name: 'Create Blog Posts', category: 'Instructor', description: 'permissions_page.permission_descriptions.instructor_blog_create' },
  { id: 'instructor.blog.edit', name: 'Edit Blog Posts', category: 'Instructor', description: 'permissions_page.permission_descriptions.instructor_blog_edit' },
  { id: 'instructor.qna.moderate', name: 'Moderate Q&A', category: 'Instructor', description: 'permissions_page.permission_descriptions.instructor_qna_moderate' },
  { id: 'instructor.comments.moderate', name: 'Moderate Comments', category: 'Instructor', description: 'permissions_page.permission_descriptions.instructor_comments_moderate' },
  { id: 'instructor.analytics.view', name: 'View Analytics', category: 'Instructor', description: 'permissions_page.permission_descriptions.instructor_analytics_view' },

  { id: 'admin.users.manage', name: 'Manage Users', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_users_manage' },
  { id: 'admin.users.ban', name: 'Ban Users', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_users_ban' },
  { id: 'admin.courses.manage', name: 'Manage All Courses', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_courses_manage' },
  { id: 'admin.courses.approve', name: 'Approve Courses', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_courses_approve' },
  { id: 'admin.payments.manage', name: 'Manage Payments', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_payments_manage' },
  { id: 'admin.blog.approve', name: 'Approve Blog Posts', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_blog_approve' },
  { id: 'admin.blog.manage', name: 'Manage All Blogs', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_blog_manage' },
  { id: 'admin.comments.moderate', name: 'Moderate All Comments', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_comments_moderate' },
  { id: 'admin.qna.moderate', name: 'Moderate All Q&A', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_qna_moderate' },
  { id: 'admin.platform.settings', name: 'Platform Settings', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_platform_settings' },
  { id: 'admin.website.manage', name: 'Manage Website', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_website_manage' },
  { id: 'admin.statistics.view', name: 'View Statistics', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_statistics_view' },
  { id: 'admin.permissions.manage', name: 'Manage Permissions', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_permissions_manage' },
  { id: 'admin.reports.view', name: 'View Reports', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_reports_view' },
  { id: 'admin.reports.manage', name: 'Manage Reports', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_reports_manage' },
  { id: 'admin.reviews.manage', name: 'Manage Reviews', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_reviews_manage' },
  { id: 'admin.logs.view', name: 'View Activity Logs', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_logs_view' },
  { id: 'admin.system.maintain', name: 'System Maintenance', category: 'Admin', description: 'permissions_page.permission_descriptions.admin_system_maintain' },
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




function mapUserTypes(userTypes: UserType[]): UserRole[] {
  return userTypes.map(t => (t === 'student' ? 'user' : t)) as UserRole[]
}


function derivePermissions(roles: UserRole[]): string[] {
  const perms = new Set<string>()
  roles.forEach(role => {
    ROLE_PERMISSIONS[role]?.forEach(p => perms.add(p))
  })
  return Array.from(perms)
}



interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null


  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>
  loginWithGoogle: (credential: string, rememberMe?: boolean) => Promise<boolean>
  signup: (username: string, email: string, fullName: string, password: string) => Promise<boolean>
  logout: () => void
  fetchProfile: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  updateProfileSettings: (settings: Partial<User['profileSettings']>) => void
  clearError: () => void


  hasRole: (role: UserRole) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  canAccess: (requiredRoles?: UserRole[], requiredPermissions?: string[]) => boolean
}

function getAuthErrorMessage(err: any, fallback: string): string {
  if (err?.status === 0) {
    return 'Khong the ket noi toi may chu. Vui long thu lai.'
  }

  if (err?.status === 401) {
    return err?.errors?.error || err?.message || 'Ten dang nhap hoac mat khau khong dung.'
  }

  if (err?.status >= 500) {
    return 'May chu dang gap loi. Vui long thu lai sau.'
  }

  return err?.errors?.error || err?.message || fallback
}



export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (username, password, rememberMe = false) => {
        console.log('auth.store: login attempt', username)
        set({ isLoading: true, error: null })
        try {
          const res = await apiLogin({ username, password, remember_me: rememberMe })
          console.log('auth.store: login response', res)


          setTokens(res.access_token, res.refresh_token)


          const roles = mapUserTypes(res.user.user_type)
          const permissions = derivePermissions(roles)

          const user: User = {
            id: String(res.user.id),
            name: res.user.username,
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


          get().fetchProfile()

          return true
        } catch (err: any) {
          const msg = getAuthErrorMessage(err, 'Dang nhap that bai.')
          set({ isLoading: false, error: msg })
          return false
        }
      },

      loginWithGoogle: async (credential, rememberMe = false) => {
        set({ isLoading: true, error: null })
        try {
          const res = await apiGoogleLogin({ credential, remember_me: rememberMe })

          setTokens(res.access_token, res.refresh_token)

          const roles = mapUserTypes(res.user.user_type)
          const permissions = derivePermissions(roles)

          const user: User = {
            id: String(res.user.id),
            name: res.user.username,
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
          get().fetchProfile()
          return true
        } catch (err: any) {
          const msg = getAuthErrorMessage(err, 'Google login failed')
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


          return true
        } catch (err: any) {
          const msg = err?.errors?.error || err?.errors?.email?.[0] || err?.errors?.username?.[0] || err?.message || 'Registration failed'
          set({ isLoading: false, error: msg })
          return false
        }
      },

      logout: () => {

        const refresh = getRefreshToken()
        if (refresh) {
          fetch(`${API_BASE_URL}/users/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getApiTransportHeaders(),
            },
            body: JSON.stringify({ refresh_token: refresh }),
          }).catch(() => {})
        }
        clearSessionData()
        set({ user: null, error: null })
      },

      fetchProfile: async () => {
        const user = get().user
        if (!user) return
        try {
          console.log('auth.store: fetchProfile starting for', user.id)
          const profile = await getUserById(Number(user.id))
          console.log('auth.store: fetchProfile result', profile)
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
        } catch (err) {
          console.error('auth.store: fetchProfile failed', err)

        }
      },

      updateProfile: async (data) => {
        const userId = get().user?.id
        if (!userId) return

        const apiData: Record<string, unknown> = {}
        const feData = data as Record<string, unknown>
        for (const [key, value] of Object.entries(feData)) {
          if (key === 'name') apiData['full_name'] = value
          else if (['username', 'email', 'phone', 'avatar', 'address', 'full_name'].includes(key))
            apiData[key] = value

        }
        if (Object.keys(apiData).length > 0) {
          await apiUpdateProfile(Number(userId), apiData as any)
        }

        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }))
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
        if (user?.roles.includes('admin') && permission.startsWith('admin.')) {
          return true
        }
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

        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {

          if (typeof state.user.createdAt === 'string') state.user.createdAt = new Date(state.user.createdAt)
          if (typeof state.user.lastSeen === 'string') state.user.lastSeen = new Date(state.user.lastSeen as any)


          if (!getAccessToken()) {
            state.user = null
          }
        }
      },
    }
  )
)
