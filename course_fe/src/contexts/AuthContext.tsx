import React, { useEffect } from 'react'
import { useAuthStore, User, UserRole, Permission, PERMISSIONS } from '../stores/auth.store'

// Re-export types for backward compatibility
export type { User, UserRole, Permission }
export { PERMISSIONS }

// AuthProvider is now just a wrapper for effects, state is managed by Zustand
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, updateProfile } = useAuthStore()

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
