import React, { useEffect } from 'react'
import { useAuth, UserRole } from '../../contexts/AuthContext'
import { useRouter } from '../Router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

const blockedRedirectPaths = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/email-verification',
  '/auth/google/callback',
  '/google-callback',
]

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
  const { currentRoute, navigate } = useRouter()
  const { t } = useTranslation()

  useEffect(() => {

    if (!isAuthenticated) {
      if (showToast) {
        toast.error(t('system_notifications.login_required_description'), { id: 'login-required' })
      }
      if (redirectTo === '/login') {
        const currentPath = currentRoute.split('?')[0]
        if (blockedRedirectPaths.includes(currentPath)) {
          // Already on an auth page — don't nest the redirect param into itself
          navigate('/login')
        } else {
          navigate('/login', undefined, { redirect: currentRoute })
        }
      } else {
        navigate(redirectTo)
      }
      return
    }


    if (!canAccess(roles, permissions)) {
      if (showToast) {
        toast.error(t('system_notifications.access_denied_description'), { id: 'access-denied' })
      }

      if (user?.roles.includes('admin')) {
        navigate('/admin')
      } else if (user?.roles.includes('instructor')) {
        navigate('/instructor')
      } else {
        navigate('/my-learning')
      }
    }
  }, [isAuthenticated, user, roles, permissions, currentRoute, navigate, redirectTo, showToast, canAccess])


  if (!isAuthenticated) {
    return null
  }


  if (!canAccess(roles, permissions)) {
    return null
  }


  return <>{children}</>
}
