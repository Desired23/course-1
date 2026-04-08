import React, { lazy } from 'react'
import { RequireAuth } from '../components/auth/RequireAuth'
import { AdminLayout, type AdminLayoutProps } from '../components/layouts'
import type { RouteConfig } from './public.routes'

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })))
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })))
const CreateUserPage = lazy(() => import('../pages/admin/CreateUserPage').then((module) => ({ default: module.CreateUserPage })))
const EditUserPage = lazy(() => import('../pages/admin/EditUserPage').then((module) => ({ default: module.EditUserPage })))
const AdminCoursesPage = lazy(() => import('../pages/admin/AdminCoursesPage').then((module) => ({ default: module.AdminCoursesPage })))
const AdminCourseDetailPage = lazy(() => import('../pages/admin/AdminCourseDetailPage').then((module) => ({ default: module.AdminCourseDetailPage })))
const PaymentManagementPage = lazy(() => import('../pages/admin/PaymentManagementPage').then((module) => ({ default: module.PaymentManagementPage })))
const AdminDiscountsPage = lazy(() => import('../pages/admin/AdminDiscountsPage').then((module) => ({ default: module.AdminDiscountsPage })))
const AdminAnalyticsPage = lazy(() => import('../pages/admin/AdminAnalyticsPage').then((module) => ({ default: module.AdminAnalyticsPage })))
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage').then((module) => ({ default: module.AdminCategoriesPage })))
const StatisticsPage = lazy(() => import('../pages/admin/StatisticsPage').then((module) => ({ default: module.StatisticsPage })))
const PermissionsPage = lazy(() => import('../pages/admin/PermissionsPage').then((module) => ({ default: module.PermissionsPage })))
const PlatformSettingsPage = lazy(() => import('../pages/admin/PlatformSettingsPage').then((module) => ({ default: module.PlatformSettingsPage })))
const AdminBlogPostsPage = lazy(() => import('../pages/admin/AdminBlogPostsPage').then((module) => ({ default: module.AdminBlogPostsPage })))
const AdminForumPage = lazy(() => import('../pages/admin/AdminForumPage').then((module) => ({ default: module.AdminForumPage })))
const ReviewManagementPage = lazy(() => import('../pages/admin/ReviewManagementPage').then((module) => ({ default: module.ReviewManagementPage })))
const ReportManagementPage = lazy(() => import('../pages/admin/ReportManagementPage').then((module) => ({ default: module.ReportManagementPage })))
const ActivityLogPage = lazy(() => import('../pages/admin/ActivityLogPage').then((module) => ({ default: module.ActivityLogPage })))
const AdminInstructorApplicationsPage = lazy(() => import('../pages/admin/AdminInstructorApplicationsPage').then((module) => ({ default: module.AdminInstructorApplicationsPage })))
const PaymentMethodsPage = lazy(() => import('../pages/admin/PaymentMethodsPage').then((module) => ({ default: module.PaymentMethodsPage })))
const AdminSubscriptionPage = lazy(() => import('../pages/admin/AdminSubscriptionPage').then((module) => ({ default: module.AdminSubscriptionPage })))
const WebsiteManagementPage = lazy(() => import('../pages/admin/WebsiteManagementPage').then((module) => ({ default: module.WebsiteManagementPage })))
const AdminWebsiteSettingsPage = lazy(() => import('../pages/admin/AdminWebsiteSettingsPage').then((module) => ({ default: module.AdminWebsiteSettingsPage })))
const AdminHomeLayoutPage = lazy(() => import('../pages/admin/AdminHomeLayoutPage').then((module) => ({ default: module.AdminHomeLayoutPage })))
const AdminDataBackupPage = lazy(() => import('../pages/admin/AdminDataBackupPage').then((module) => ({ default: module.AdminDataBackupPage })))
const AdminCourseMetadataPage = lazy(() => import('../pages/admin/AdminCourseMetadataPage').then((module) => ({ default: module.AdminCourseMetadataPage })))
const AdminLearningPathAdvisorPage = lazy(() => import('../pages/admin/AdminLearningPathAdvisorPage').then((module) => ({ default: module.AdminLearningPathAdvisorPage })))

interface AdminRouteDefinition {
  path: string
  page: React.ReactNode
  dynamic?: boolean
  layoutProps?: Omit<AdminLayoutProps, 'children'>
}

function withAdminShell(page: React.ReactNode, layoutProps?: Omit<AdminLayoutProps, 'children'>) {
  return (
    <RequireAuth roles={['admin']}>
      <AdminLayout {...layoutProps}>
        {page}
      </AdminLayout>
    </RequireAuth>
  )
}

const adminRouteDefinitions: AdminRouteDefinition[] = [
  { path: '/admin', page: <AdminDashboard /> },
  { path: '/admin/users', page: <AdminUsersPage /> },
  { path: '/admin/users/new', page: <CreateUserPage /> },
  { path: '/admin/users/:userId/edit', page: <EditUserPage />, dynamic: true },
  { path: '/admin/courses', page: <AdminCoursesPage /> },
  { path: '/admin/courses/:courseId', page: <AdminCourseDetailPage />, dynamic: true },
  { path: '/admin/payments', page: <PaymentManagementPage /> },
  { path: '/admin/payments/methods', page: <PaymentMethodsPage /> },
  { path: '/admin/discounts', page: <AdminDiscountsPage /> },
  { path: '/admin/analytics', page: <AdminAnalyticsPage /> },
  { path: '/admin/categories', page: <AdminCategoriesPage /> },
  { path: '/admin/statistics', page: <StatisticsPage /> },
  { path: '/admin/permissions', page: <PermissionsPage /> },
  { path: '/admin/settings', page: <PlatformSettingsPage /> },
  { path: '/admin/blog', page: <AdminBlogPostsPage /> },
  { path: '/admin/forum', page: <AdminForumPage /> },
  { path: '/admin/reviews', page: <ReviewManagementPage /> },
  { path: '/admin/reports', page: <ReportManagementPage /> },
  { path: '/admin/refunds', page: <PaymentManagementPage /> },
  { path: '/admin/instructor-applications', page: <AdminInstructorApplicationsPage /> },
  { path: '/admin/subscriptions', page: <AdminSubscriptionPage /> },
  { path: '/admin/website-management', page: <WebsiteManagementPage /> },
  { path: '/admin/activity-log', page: <ActivityLogPage /> },
  { path: '/admin/website-settings', page: <AdminWebsiteSettingsPage /> },
  { path: '/admin/home-layout', page: <AdminHomeLayoutPage /> },
  { path: '/admin/data-backup', page: <AdminDataBackupPage /> },
  { path: '/admin/catalog-metadata', page: <AdminCourseMetadataPage /> },
  { path: '/admin/ai-learning-paths', page: <AdminLearningPathAdvisorPage /> },
]

export const adminRoutes: RouteConfig[] = adminRouteDefinitions.map((route) => ({
  path: route.path,
  element: withAdminShell(route.page, route.layoutProps),
  dynamic: route.dynamic,
}))
