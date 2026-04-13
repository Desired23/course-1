import React, { useEffect } from 'react'
import './utils/i18n'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { queryClient } from './lib/queryClient'



if (typeof window !== 'undefined') {

  ;(window as any).define = undefined
  ;(window as any).require = undefined
}

import { EnrollmentProvider } from './contexts/EnrollmentContext'
import { LearningProgressProvider } from './contexts/LearningProgressContext'
import { CartProvider } from './contexts/CartContext'
import { WishlistProvider } from './contexts/WishlistContext'
import { ReviewsProvider } from './contexts/ReviewsContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ChatProvider } from './contexts/ChatContext'
import { FollowProvider } from './contexts/FollowContext'





import { Router, useRouter } from './components/Router'
import { AppRoutes } from './routes'


import { useUIStore } from './stores/ui.store'


import { Toaster } from './components/ui/sonner'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { ChatWidget } from './components/ChatWidget'
import { AiLearningPathLauncher } from './components/AiLearningPathLauncher'
import { BottomNav } from './components/BottomNav'
import { FloatingNavigation } from './components/FloatingNavigation'

import { AuthModal } from './components/auth/AuthModal'

function AppContent() {
  const { currentRoute } = useRouter()
  const darkMode = useUIStore((state) => state.darkMode)
  const currentPath = currentRoute.split('?')[0]

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])


  const isPlayerPage = currentPath.startsWith('/course/') && currentPath.includes('/learn')
  const isAuthPage = currentPath === '/login' || currentPath === '/signup'
  const isCheckoutPage = currentPath.startsWith('/checkout') || currentPath.startsWith('/payment/result')


  const isInstructorPublicProfile =
    /^\/instructor\/[^/]+\/profile$/.test(currentPath) ||
    /^\/instructor\/view\/[^/]+$/.test(currentPath)
  const isInstructorPublicPage =
    isInstructorPublicProfile ||
    currentPath === '/instructor/onboarding' ||
    currentPath === '/instructor/signup'
  const isInstructorDashboardPage =
    currentPath.startsWith('/instructor') && !isInstructorPublicPage


  const isAdminPage = currentPath.startsWith('/admin')

  const hideHeaderFooter = isPlayerPage || isAuthPage || isInstructorDashboardPage || isAdminPage

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {!hideHeaderFooter && <Header />}


      <main className="flex-1">
        <AppRoutes />
      </main>


      {!hideHeaderFooter && !isCheckoutPage && <Footer />}


      <ChatWidget />


      <AiLearningPathLauncher />


      {!hideHeaderFooter && <BottomNav />}





      <Toaster
        position="top-center"
        richColors
        theme={darkMode ? 'dark' : 'light'}
        toastOptions={{
          style: {
            borderRadius: '8px',
            padding: '10px 16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontSize: '14px',
            fontWeight: 500,
          },
          className: 'ant-message-custom',
          duration: 3000,
        }}
      />


      <AuthModal />
    </div>
  )
}

export default function App() {
  const darkMode = useUIStore((state) => state.darkMode)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EnrollmentProvider>
          <LearningProgressProvider>
            <CartProvider>
              <WishlistProvider>
                <ReviewsProvider>
                  <NotificationProvider>
                    <ChatProvider>
                      <FollowProvider>
                        <Router>
                          <AppContent />
                        </Router>
                      </FollowProvider>
                    </ChatProvider>
                  </NotificationProvider>
                </ReviewsProvider>
              </WishlistProvider>
            </CartProvider>
          </LearningProgressProvider>
        </EnrollmentProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
