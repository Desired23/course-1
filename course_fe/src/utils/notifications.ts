import { toast } from 'sonner'
import i18n from './i18n'

export const showNotification = {
  success: (message: string, description?: string) => {
    toast.success(message, { description })
  },
  
  error: (message: string, description?: string) => {
    toast.error(message, { description })
  },
  
  warning: (message: string, description?: string) => {
    toast.warning(message, { description })
  },
  
  info: (message: string, description?: string) => {
    toast.info(message, { description })
  },
  
  accessDenied: (permission?: string, role?: string) => {
    const baseMessage = i18n.t('system_notifications.access_denied_title')
    let description = i18n.t('system_notifications.access_denied_description')
    
    if (permission) {
      description += ` ${i18n.t('system_notifications.required_permission', { permission })}`
    }
    if (role) {
      description += ` ${i18n.t('system_notifications.required_role', { role })}`
    }
    
    toast.error(baseMessage, { description })
  },
  
  loginRequired: () => {
    toast.warning(i18n.t('system_notifications.login_required_title'), {
      description: i18n.t('system_notifications.login_required_description')
    })
  },
  
  featureComingSoon: (feature?: string) => {
    const message = feature
      ? i18n.t('system_notifications.feature_coming_soon_with_name', { feature })
      : i18n.t('system_notifications.feature_coming_soon_title')
    toast.info(message, {
      description: i18n.t('system_notifications.feature_coming_soon_description')
    })
  },
  
  operationSuccess: (operation: string) => {
    toast.success(i18n.t('common.success'), {
      description: i18n.t('system_notifications.operation_success', { operation })
    })
  },
  
  operationError: (operation: string, error?: string) => {
    toast.error(i18n.t('common.error'), {
      description: i18n.t('system_notifications.operation_error', {
        operation,
        error: error || i18n.t('system_notifications.try_again'),
      })
    })
  }
}

// Permission-based notification helper
export const withPermissionCheck = (
  hasPermission: (permission: string) => boolean,
  requiredPermission: string,
  action: () => void,
  permissionName?: string
) => {
  if (hasPermission(requiredPermission)) {
    action()
  } else {
    showNotification.accessDenied(
      requiredPermission, 
      permissionName
    )
  }
}

// Role-based notification helper
export const withRoleCheck = (
  hasRole: (role: string) => boolean,
  requiredRole: string,
  action: () => void
) => {
  if (hasRole(requiredRole)) {
    action()
  } else {
    showNotification.accessDenied(
      undefined,
      requiredRole
    )
  }
}

// Authentication check helper
export const withAuthCheck = (
  isAuthenticated: boolean,
  action: () => void
) => {
  if (isAuthenticated) {
    action()
  } else {
    showNotification.loginRequired()
  }
}
