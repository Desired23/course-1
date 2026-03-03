import { toast } from 'sonner@2.0.3'

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
    const baseMessage = "Access Denied"
    let description = "You don't have permission to perform this action."
    
    if (permission) {
      description += ` Required permission: ${permission}`
    }
    if (role) {
      description += ` Required role: ${role}`
    }
    
    toast.error(baseMessage, { description })
  },
  
  loginRequired: () => {
    toast.warning("Login Required", {
      description: "Please login to access this feature."
    })
  },
  
  featureComingSoon: (feature?: string) => {
    const message = feature ? `${feature} Coming Soon` : "Feature Coming Soon"
    toast.info(message, {
      description: "This feature is currently in development."
    })
  },
  
  operationSuccess: (operation: string) => {
    toast.success("Success", {
      description: `${operation} completed successfully.`
    })
  },
  
  operationError: (operation: string, error?: string) => {
    toast.error("Error", {
      description: `Failed to ${operation.toLowerCase()}. ${error || 'Please try again.'}`
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