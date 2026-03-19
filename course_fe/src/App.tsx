import React, { useEffect } from 'react'
import './utils/i18n' // Initialize i18n
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from './contexts/AuthContext'
import { queryClient } from './lib/queryClient'

// CRITICAL FIX: Suppress AMD module conflicts from esm.sh
// This prevents "Can only have one anonymous define call per script file" errors
if (typeof window !== 'undefined') {
  // Disable AMD module loader to prevent conflicts
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

// Ant Design CSS
// import 'antd/dist/reset.css' // removed: antd not in dependencies

// Router & Routes
import { Router, useRouter } from './components/Router'
import { AppRoutes } from './routes'

// Zustand Stores
import { useUIStore } from './stores/ui.store'

// UI Components
import { Toaster } from './components/ui/sonner'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { ChatWidget } from './components/ChatWidget'
import { BottomNav } from './components/BottomNav'
import { FloatingNavigation } from './components/FloatingNavigation'

import { AuthModal } from './components/auth/AuthModal'

function AppContent() {
  const { currentRoute } = useRouter()
  const darkMode = useUIStore((state) => state.darkMode)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Determine if current route needs special layout
  const isPlayerPage = currentRoute.startsWith('/course/') && currentRoute.includes('/learn')
  const isAuthPage = currentRoute === '/login' || currentRoute === '/signup'
  const isCheckoutPage = currentRoute.startsWith('/checkout') || currentRoute.startsWith('/payment/result')
  
  // Hide main Header/Footer for Instructor and Admin pages (they have their own layouts)
  const isInstructorPage = currentRoute.startsWith('/instructor')
  const isAdminPage = currentRoute.startsWith('/admin')
  
  const hideHeaderFooter = isPlayerPage || isAuthPage || isInstructorPage || isAdminPage

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      {!hideHeaderFooter && <Header />}
      
      {/* Main Content */}
      <main className="flex-1">
        <AppRoutes />
      </main>
      
      {/* Footer */}
      {!hideHeaderFooter && !isCheckoutPage && <Footer />}
      
      {/* Chat Widget */}
      <ChatWidget />
      
      {/* Bottom Navigation (Mobile) */}
      {!hideHeaderFooter && <BottomNav />}
      
      {/* Floating Navigation (Desktop) - disabled */}
      {/* {!hideHeaderFooter && <FloatingNavigation />} */}
      
      {/* Toast Notifications - Configured to look like Ant Design messages */}
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
      
      {/* Authentication Modal */}
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
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
