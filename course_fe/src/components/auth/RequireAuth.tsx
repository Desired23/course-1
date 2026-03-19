import React, { useEffect } from 'react'
import { useAuth, UserRole } from '../../contexts/AuthContext'
import { useRouter } from '../Router'
import { toast } from 'sonner'

interface RequireAuthProps {
  children: React.ReactNode
  roles?: UserRole[]
  permissions?: string[]
  redirectTo?: string
  showToast?: boolean
}

export function RequireAuth({ 
  children, 
  roles, 
  permissions,
  redirectTo = '/login',
  showToast = true
}: RequireAuthProps) {
  const { user, isAuthenticated, canAccess } = useAuth()
  const { navigate } = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      if (showToast) {
        toast.error('Please login to access this page')
      }
      navigate(redirectTo)
      return
    }

    // Check role and permission access
    if (!canAccess(roles, permissions)) {
      if (showToast) {
        toast.error('You do not have permission to access this page')
      }
      // Redirect based on user's role
      if (user?.roles.includes('admin')) {
        navigate('/admin')
      } else if (user?.roles.includes('instructor')) {
        navigate('/instructor')
      } else {
        navigate('/my-learning')
      }
    }
  }, [isAuthenticated, user, roles, permissions, navigate, redirectTo, showToast, canAccess])

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null
  }

  // Show nothing if user doesn't have access
  if (!canAccess(roles, permissions)) {
    return null
  }

  // Render children if authenticated and authorized
  return <>{children}</>
}
