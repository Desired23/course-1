import React, { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '../components/Router'
import { publicRoutes } from './public.routes'
import { userRoutes } from './user.routes'
import { instructorRoutes } from './instructor.routes'
import { adminRoutes } from './admin.routes'

function RouteLoadingFallback() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="text-sm text-muted-foreground">{t('app_routes.loading')}</div>
    </div>
  )
}

export function AppRoutes() {
  const { t } = useTranslation()
  const { currentRoute } = useRouter()
  
  // Normalize current path by removing query strings for matching
  const currentPath = currentRoute.split('?')[0]

  // Find matching route
  const allRoutes = [
    ...publicRoutes,
    ...userRoutes,
    ...instructorRoutes,
    ...adminRoutes
  ]

  const matchedRoute = allRoutes.find(route => {
    // Handle exact match
    if (route.path === currentPath) return true
    
    // Handle dynamic routes
    if (route.dynamic) {
      const pattern = route.path.replace(/:\w+/g, '[^/]+')
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(currentPath)
    }
    
    // Handle prefix match (for routes starting with path)
    if (route.prefix && currentPath.startsWith(route.path)) {
      return true
    }
    
    return false
  })

  // Render matched route or 404
  if (matchedRoute) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <>{matchedRoute.element}</>
      </Suspense>
    )
  }

  // Default to home if no match
  const homeRoute = publicRoutes.find(r => r.path === '/')
  return homeRoute ? (
    <Suspense fallback={<RouteLoadingFallback />}>
      <>{homeRoute.element}</>
    </Suspense>
  ) : <div>{t('app_routes.not_found')}</div>
}
