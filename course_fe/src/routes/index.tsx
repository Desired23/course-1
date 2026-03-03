import React from 'react'
import { useRouter } from '../components/Router'
import { publicRoutes } from './public.routes'
import { userRoutes } from './user.routes'
import { instructorRoutes } from './instructor.routes'
import { adminRoutes } from './admin.routes'

export function AppRoutes() {
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
    return <>{matchedRoute.element}</>
  }

  // Default to home if no match
  const homeRoute = publicRoutes.find(r => r.path === '/')
  return homeRoute ? <>{homeRoute.element}</> : <div>404 - Page Not Found</div>
}
