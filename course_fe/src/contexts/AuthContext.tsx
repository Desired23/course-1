import React, { useEffect } from 'react'
import { useAuthStore, User, UserRole, Permission, PERMISSIONS } from '../stores/auth.store'
import { onSessionExpired } from '../services/http'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

// Re-export types for backward compatibility
export type { User, UserRole, Permission }
export { PERMISSIONS }

// AuthProvider is now just a wrapper for effects, state is managed by Zustand
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, logout, updateProfile } = useAuthStore()
  const { t } = useTranslation()

  // Handle session expired: clear state, redirect to login, show toast
  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      logout()
      toast.error(t('auth_context.session_expired'), {
        description: t('auth_context.login_again'),
      })
      // Redirect to login page (use window.location because Router context may not be available)
      window.location.href = '/login'
    })
    return unsubscribe
  }, [logout])

  // Update online status periodically
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

// Hook adapter — keeps the same interface for all consumers
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
