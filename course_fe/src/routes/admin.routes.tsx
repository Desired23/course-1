import React from 'react'
import { RouteConfig } from './public.routes'
import { RequireAuth } from '../components/auth/RequireAuth'
import { AdminLayout } from '../components/layouts'
import { AdminDashboard } from '../pages/admin/AdminDashboard'
import { AdminUsersPage } from '../pages/admin/AdminUsersPage'
import { CreateUserPage } from '../pages/admin/CreateUserPage'
import { EditUserPage } from '../pages/admin/EditUserPage'
import { AdminCoursesPage } from '../pages/admin/AdminCoursesPage'
import { AdminCourseDetailPage } from '../pages/admin/AdminCourseDetailPage'
import { PaymentManagementPage } from '../pages/admin/PaymentManagementPage'
import { AdminDiscountsPage } from '../pages/admin/AdminDiscountsPage'
import { AdminAnalyticsPage } from '../pages/admin/AdminAnalyticsPage'
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage'
import { StatisticsPage } from '../pages/admin/StatisticsPage'
import { PermissionsPage } from '../pages/admin/PermissionsPage'
import { PlatformSettingsPage } from '../pages/admin/PlatformSettingsPage'
import { AdminBlogPostsPage } from '../pages/admin/AdminBlogPostsPage'
import { AdminForumPage } from '../pages/admin/AdminForumPage'
import { ReviewManagementPage } from '../pages/admin/ReviewManagementPage'
import { ReportManagementPage } from '../pages/admin/ReportManagementPage'
import { ActivityLogPage } from '../pages/admin/ActivityLogPage'
import { AdminInstructorApplicationsPage } from '../pages/admin/AdminInstructorApplicationsPage'
import { PaymentMethodsPage } from '../pages/admin/PaymentMethodsPage'
import { AdminSubscriptionPage } from '../pages/admin/AdminSubscriptionPage'
import { WebsiteManagementPage } from '../pages/admin/WebsiteManagementPage'
import { AdminWebsiteSettingsPage } from '../pages/admin/AdminWebsiteSettingsPage'
import { AdminHomeLayoutPage } from '../pages/admin/AdminHomeLayoutPage'

export const adminRoutes: RouteConfig[] = [
  // Dashboard
  {
    path: '/admin',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Users
  {
    path: '/admin/users',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminUsersPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  {
    path: '/admin/users/new',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <CreateUserPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  {
    path: '/admin/users/:userId/edit',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <EditUserPage />
        </AdminLayout>
      </RequireAuth>
    ),
    dynamic: true
  },
  
  // Courses
  {
    path: '/admin/courses',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminCoursesPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  {
    path: '/admin/courses/:courseId',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminCourseDetailPage />
        </AdminLayout>
      </RequireAuth>
    ),
    dynamic: true
  },
  
  // Payments
  {
    path: '/admin/payments',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <PaymentManagementPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  {
    path: '/admin/payments/methods',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <PaymentMethodsPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Discounts
  {
    path: '/admin/discounts',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminDiscountsPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Analytics
  {
    path: '/admin/analytics',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminAnalyticsPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Categories
  {
    path: '/admin/categories',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminCategoriesPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Statistics
  {
    path: '/admin/statistics',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <StatisticsPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Permissions
  {
    path: '/admin/permissions',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <PermissionsPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Settings
  {
    path: '/admin/settings',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <PlatformSettingsPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Blog
  {
    path: '/admin/blog',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminBlogPostsPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Forum
  {
    path: '/admin/forum',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminForumPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Reviews
  {
    path: '/admin/reviews',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <ReviewManagementPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Reports
  {
    path: '/admin/reports',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <ReportManagementPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Refunds (placeholder)
  {
    path: '/admin/refunds',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Instructor Applications
  {
    path: '/admin/instructor-applications',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminInstructorApplicationsPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Subscriptions
  {
    path: '/admin/subscriptions',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminSubscriptionPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Website Management
  {
    path: '/admin/website-management',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <WebsiteManagementPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Activity Log
  {
    path: '/admin/activity-log',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <ActivityLogPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Website Settings
  {
    path: '/admin/website-settings',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminWebsiteSettingsPage />
        </AdminLayout>
      </RequireAuth>
    )
  },
  
  // Home Layout
  {
    path: '/admin/home-layout',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout>
          <AdminHomeLayoutPage />
        </AdminLayout>
      </RequireAuth>
    )
  }
]