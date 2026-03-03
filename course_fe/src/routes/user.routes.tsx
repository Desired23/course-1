import React from 'react'
import { RouteConfig } from './public.routes'
import { RequireAuth } from '../components/auth/RequireAuth'
import { UserDashboardLayout } from '../components/layouts'
import { MyLearningPage } from '../pages/user/MyLearningPage'
import { CoursePlayerPage } from '../pages/user/CoursePlayerPage'
import { CartPage } from '../pages/user/CartPage'
import { CheckoutPage } from '../pages/user/CheckoutPage'
import { SubscriptionCheckoutPage } from '../pages/user/SubscriptionCheckoutPage'
import { WishlistPage } from '../pages/user/WishlistPage'
import { ProfilePage } from '../pages/user/ProfilePage'
import { NotificationsPage } from '../pages/user/NotificationsPage'
import { SupportPage } from '../pages/user/SupportPage'
import { UserPaymentMethodsPage } from '../pages/user/UserPaymentMethodsPage'
import { UserSubscriptionsPage } from '../pages/user/UserSubscriptionsPage'
import { AccountSettingsPage } from '../pages/user/AccountSettingsPage'
import { MyReviewsPage } from '../pages/user/MyReviewsPage'

export const userRoutes: RouteConfig[] = [
  // My Learning
  {
    path: '/my-learning',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <UserDashboardLayout>
          <MyLearningPage />
        </UserDashboardLayout>
      </RequireAuth>
    )
  },
  
  // Course Player
  {
    path: '/course-player/:courseId',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <CoursePlayerPage />
      </RequireAuth>
    ),
    dynamic: true
  },
  {
    path: '/course-player',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <CoursePlayerPage />
      </RequireAuth>
    )
  },
  
  // Cart & Checkout
  {
    path: '/cart',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <UserDashboardLayout>
          <CartPage />
        </UserDashboardLayout>
      </RequireAuth>
    )
  },
  {
    path: '/checkout/subscription',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <SubscriptionCheckoutPage />
      </RequireAuth>
    )
  },
  {
    path: '/checkout',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <CheckoutPage />
      </RequireAuth>
    )
  },
  
  // Wishlist
  {
    path: '/wishlist',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <UserDashboardLayout>
          <WishlistPage />
        </UserDashboardLayout>
      </RequireAuth>
    )
  },
  
  // Profile & Settings
  {
    path: '/profile',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <UserDashboardLayout>
          <ProfilePage />
        </UserDashboardLayout>
      </RequireAuth>
    )
  },
  {
    path: '/account-settings',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <UserDashboardLayout>
          <AccountSettingsPage />
        </UserDashboardLayout>
      </RequireAuth>
    )
  },
  
  // Notifications
  {
    path: '/notifications',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <UserDashboardLayout>
          <NotificationsPage />
        </UserDashboardLayout>
      </RequireAuth>
    )
  },
  
  // Support
  {
    path: '/support',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <UserDashboardLayout>
          <SupportPage />
        </UserDashboardLayout>
      </RequireAuth>
    )
  },
  
  // Payment Methods
  {
    path: '/user/payment-methods',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <UserDashboardLayout>
          <UserPaymentMethodsPage />
        </UserDashboardLayout>
      </RequireAuth>
    )
  },
  
  // Subscriptions
  {
    path: '/user/subscriptions',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <UserDashboardLayout>
          <UserSubscriptionsPage />
        </UserDashboardLayout>
      </RequireAuth>
    )
  },
  
  // My Reviews
  {
    path: '/user/my-reviews',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <UserDashboardLayout>
          <MyReviewsPage />
        </UserDashboardLayout>
      </RequireAuth>
    )
  }
]
