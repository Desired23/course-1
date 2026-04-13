import React, { useEffect } from 'react'
import { useAuthStore, User, UserRole, Permission, PERMISSIONS } from '../stores/auth.store'
import { onSessionExpired } from '../services/http'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'


export type { User, UserRole, Permission }
export { PERMISSIONS }


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, logout, updateProfile } = useAuthStore()
  const { t } = useTranslation()


  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      logout()
      toast.error(t('auth_context.session_expired'), {
        description: t('auth_context.login_again'),
      })

      window.location.href = '/login'
    })
    return unsubscribe
  }, [logout])


  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        updateProfile({ isOnline: true, lastSeen: new Date() })
      }, 60000)
      return () => clearInterval(interval)
    }
  }, [user, updateProfile])

  return <>{children}</>
}


export function useAuth() {
  const store = useAuthStore()

  return {
    user: store.user,
    isAuthenticated: !!store.user,
    isLoading: store.isLoading,
    error: store.error,
    login: store.login,
    loginWithGoogle: store.loginWithGoogle,
    signup: store.signup,
    logout: store.logout,
    fetchProfile: store.fetchProfile,
    updateProfile: store.updateProfile,
    updateProfileSettings: store.updateProfileSettings,
    clearError: store.clearError,
    hasRole: store.hasRole,
    hasPermission: store.hasPermission,
    hasAnyRole: store.hasAnyRole,
    canAccess: store.canAccess,
    permissions: PERMISSIONS,
  }
}
