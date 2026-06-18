import React, { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRouter } from '../components/Router'
import { publicRoutes } from './public.routes'
import { userRoutes } from './user.routes'
import { instructorRoutes } from './instructor.routes'
import { adminRoutes } from './admin.routes'
import { reducedRouteTransitionVariants, routeTransition, routeTransitionVariants } from '../lib/motion'
import { CommunityLayout } from '../components/community/CommunityLayout'

function RouteLoadingFallback() {
  return <div aria-busy="true" aria-live="polite" />
}

export function AppRoutes() {
  const { t } = useTranslation()
  const { currentRoute } = useRouter()
  const shouldReduceMotion = useReducedMotion()


  const currentPath = currentRoute.split('?')[0]


  const allRoutes = [
    ...publicRoutes,
    ...userRoutes,
    ...instructorRoutes,
    ...adminRoutes
  ]

  const matchedRoute = allRoutes.find(route => {

    if (route.path === currentPath) return true


    if (route.dynamic) {
      const pattern = route.path.replace(/:\w+/g, '[^/]+')
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(currentPath)
    }


    if (route.prefix && currentPath.startsWith(route.path)) {
      return true
    }

    return false
  })

  const isCommunityRoute = (path: string) => {
    if (path === '/blog/create' || path === '/qa/ask') return false
    return path === '/community' || path.startsWith('/blog') || path.startsWith('/qa')
  }

  const isSidebarShellRoute = (path: string) => {
    if (path.startsWith('/admin')) return true
    if (path.startsWith('/instructor')) {
      if (path === '/instructor/onboarding' || path === '/instructor/signup') return false
      if (path === '/instructor/lessons/create') return false
      if (/^\/instructor\/lessons\/[^/]+\/edit$/.test(path)) return false
      return true
    }
    if (path === '/my-learning' || path === '/profile' || path === '/notifications' || path === '/support') return true
    if (path === '/account-settings' || path === '/cart') return true
    if (path.startsWith('/user/')) return true
    return false
  }

  const skipRouteTransition = isSidebarShellRoute(currentPath)


  const renderWithTransition = (element: React.ReactNode, key: string) => {
    if (skipRouteTransition) {
      return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>
    }

    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            className="app-route-motion"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={shouldReduceMotion ? reducedRouteTransitionVariants : routeTransitionVariants}
            transition={routeTransition}
          >
            {element}
          </motion.div>
        </AnimatePresence>
      </Suspense>
    )
  }

  if (matchedRoute) {
    const element = renderWithTransition(matchedRoute.element, currentPath)
    if (isCommunityRoute(currentPath)) {
      return <CommunityLayout>{element}</CommunityLayout>
    }
    return element
  }


  const homeRoute = publicRoutes.find(r => r.path === '/')
  return homeRoute ? renderWithTransition(homeRoute.element, `fallback:${currentPath}`) : <div>{t('app_routes.not_found')}</div>
}
