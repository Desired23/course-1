import React, { useState, useEffect } from 'react'

export type Route = string

interface RouterContextType {
  currentRoute: Route
  navigate: (route: Route, params?: Record<string, string>, queryParams?: Record<string, string>) => void
  params: Record<string, string>
}

export const RouterContext = React.createContext<RouterContextType | null>(null)

/**
 * Extract params from a URL path given a pattern.
 * e.g. pattern="/instructor/:instructorId/profile", path="/instructor/42/profile"
 * returns { instructorId: "42" }
 */
function extractParamsFromUrl(
  patterns: string[],
  path: string
): Record<string, string> {
  for (const pattern of patterns) {
    const paramNames: string[] = []
    const regexStr = pattern.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name)
      return '([^/]+)'
    })
    const regex = new RegExp(`^${regexStr}$`)
    const match = path.match(regex)
    if (match) {
      const result: Record<string, string> = {}
      paramNames.forEach((name, i) => {
        result[name] = match[i + 1]
      })
      return result
    }
  }
  return {}
}

// Known dynamic route patterns for URL-based param extraction
const KNOWN_DYNAMIC_PATTERNS = [
  '/course/:id',
  '/category/:slug',
  '/topic/:slug',
  '/blog/:slug',
  '/forum/topic/:id',
  '/qna/:courseId',
  '/reviews/:courseId',
  '/instructor/:instructorId/profile',
  '/instructor/view/:instructorId',
  '/instructor/courses/:courseId',
  '/instructor/lessons/:courseId',
  '/instructor/lessons/:lessonId/edit',
  '/admin/users/:userId/edit',
  '/admin/courses/:courseId',
  '/course-player/:courseId',
]

export function Router({ children }: { children: React.ReactNode }) {
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/'

  const [currentRoute, setCurrentRoute] = useState<Route>(initialPath)
  const [params, setParams] = useState<Record<string, string>>(
    () => extractParamsFromUrl(KNOWN_DYNAMIC_PATTERNS, initialPath)
  )
  
  const navigate = (route: Route, routeParams?: Record<string, string>, queryParams?: Record<string, string>) => {
    // Build the full URL with query params if provided
    let fullUrl = route
    if (queryParams && Object.keys(queryParams).length > 0) {
      const searchParams = new URLSearchParams()
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, value)
        }
      })
      const qs = searchParams.toString()
      if (qs) fullUrl = `${route}?${qs}`
    }

    setCurrentRoute(fullUrl)
    if (routeParams) {
      setParams(routeParams)
    } else {
      // Try to auto-extract params from the URL
      setParams(extractParamsFromUrl(KNOWN_DYNAMIC_PATTERNS, route))
    }
    // Update browser URL
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', fullUrl)
    }
    // Scroll to top when navigating
    window.scrollTo(0, 0)
  }

  // Sync with browser navigation (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      const search = window.location.search
      const fullUrl = search ? `${path}${search}` : path
      setCurrentRoute(fullUrl)
      setParams(extractParamsFromUrl(KNOWN_DYNAMIC_PATTERNS, path))
      // Scroll to top when using browser back/forward
      window.scrollTo(0, 0)
    }

    window.addEventListener('popstate', handlePopState)
    
    // Set initial route from URL (include query string)
    const initialSearch = window.location.search
    const initialUrl = initialSearch ? `${window.location.pathname}${initialSearch}` : window.location.pathname
    setCurrentRoute(initialUrl)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  return (
    <RouterContext.Provider value={{ currentRoute, navigate, params }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useRouter() {
  const context = React.useContext(RouterContext)
  if (!context) {
    throw new Error('useRouter must be used within Router')
  }
  return context
}