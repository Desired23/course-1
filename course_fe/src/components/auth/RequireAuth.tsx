import React, { useEffect } from 'react'
import { useAuth, UserRole } from '../../contexts/AuthContext'
import { useRouter } from '../Router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()

  useEffect(() => {

    if (!isAuthenticated) {
      if (showToast) {
        toast.error(t('system_notifications.login_required_description'))
      }
      navigate(redirectTo)
      return
    }


    if (!canAccess(roles, permissions)) {
      if (showToast) {
        toast.error(t('system_notifications.access_denied_description'))
      }

      if (user?.roles.includes('admin')) {
        navigate('/admin')
      } else if (user?.roles.includes('instructor')) {
        navigate('/instructor')
      } else {
        navigate('/my-learning')
      }
    }
  }, [isAuthenticated, user, roles, permissions, navigate, redirectTo, showToast, canAccess])


  if (!isAuthenticated) {
    return null
  }


  if (!canAccess(roles, permissions)) {
    return null
  }


  return <>{children}</>
}
