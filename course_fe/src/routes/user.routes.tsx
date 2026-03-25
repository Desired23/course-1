import React, { lazy } from 'react'
import { RouteConfig } from './public.routes'
import { RequireAuth } from '../components/auth/RequireAuth'
import { UserDashboardLayout } from '../components/layouts'

const MyLearningPage = lazy(() => import('../pages/user/MyLearningPage').then((module) => ({ default: module.MyLearningPage })))
const CoursePlayerPage = lazy(() => import('../pages/user/CoursePlayerPage').then((module) => ({ default: module.CoursePlayerPage })))
const CartPage = lazy(() => import('../pages/user/CartPage').then((module) => ({ default: module.CartPage })))
const CheckoutPage = lazy(() => import('../pages/user/CheckoutPage').then((module) => ({ default: module.CheckoutPage })))
const SubscriptionCheckoutPage = lazy(() => import('../pages/user/SubscriptionCheckoutPage').then((module) => ({ default: module.SubscriptionCheckoutPage })))
const PaymentResultPage = lazy(() => import('../pages/user/PaymentResultPage').then((module) => ({ default: module.PaymentResultPage })))
const WishlistPage = lazy(() => import('../pages/user/WishlistPage').then((module) => ({ default: module.WishlistPage })))
const ProfilePage = lazy(() => import('../pages/user/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const NotificationsPage = lazy(() => import('../pages/user/NotificationsPage').then((module) => ({ default: module.NotificationsPage })))
const SupportPage = lazy(() => import('../pages/user/SupportPage').then((module) => ({ default: module.SupportPage })))
const UserPaymentMethodsPage = lazy(() => import('../pages/user/UserPaymentMethodsPage').then((module) => ({ default: module.UserPaymentMethodsPage })))
const UserSubscriptionsPage = lazy(() => import('../pages/user/UserSubscriptionsPage').then((module) => ({ default: module.UserSubscriptionsPage })))
const AccountSettingsPage = lazy(() => import('../pages/user/AccountSettingsPage').then((module) => ({ default: module.AccountSettingsPage })))
const MyReviewsPage = lazy(() => import('../pages/user/MyReviewsPage').then((module) => ({ default: module.MyReviewsPage })))
const TransactionHistoryPage = lazy(() => import('../pages/user/TransactionHistoryPage').then((module) => ({ default: module.TransactionHistoryPage })))

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
  {
    path: '/payment/result',
    element: <PaymentResultPage />
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
  },

  // Transaction History
  {
    path: '/user/transactions',
    element: (
      <RequireAuth roles={['user', 'instructor', 'admin']}>
        <UserDashboardLayout>
          <TransactionHistoryPage />
        </UserDashboardLayout>
      </RequireAuth>
    )
  }
]
