import React, { lazy, useEffect } from 'react'
import { RequireAuth } from '../components/auth/RequireAuth'
import { AdminLayout, type AdminLayoutProps } from '../components/layouts'
import { useRouter } from '../components/Router'
import type { RouteConfig } from './public.routes'

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })))
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })))
const CreateUserPage = lazy(() => import('../pages/admin/CreateUserPage').then((module) => ({ default: module.CreateUserPage })))
const EditUserPage = lazy(() => import('../pages/admin/EditUserPage').then((module) => ({ default: module.EditUserPage })))
const AdminCoursesPage = lazy(() => import('../pages/admin/AdminCoursesPage').then((module) => ({ default: module.AdminCoursesPage })))
const AdminCourseDetailPage = lazy(() => import('../pages/admin/AdminCourseDetailPage').then((module) => ({ default: module.AdminCourseDetailPage })))
const PaymentManagementPage = lazy(() => import('../pages/admin/PaymentManagementPage').then((module) => ({ default: module.PaymentManagementPage })))
const AdminDiscountsPage = lazy(() => import('../pages/admin/AdminDiscountsPage').then((module) => ({ default: module.AdminDiscountsPage })))
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage').then((module) => ({ default: module.AdminCategoriesPage })))
const StatisticsPage = lazy(() => import('../pages/admin/StatisticsPage').then((module) => ({ default: module.StatisticsPage })))
const PlatformSettingsPage = lazy(() => import('../pages/admin/PlatformSettingsPage').then((module) => ({ default: module.PlatformSettingsPage })))
const AdminBlogPostsPage = lazy(() => import('../pages/admin/AdminBlogPostsPage').then((module) => ({ default: module.AdminBlogPostsPage })))
const AdminQAPage = lazy(() => import('../pages/admin/AdminQAPage').then((module) => ({ default: module.AdminQAPage })))
const ReviewManagementPage = lazy(() => import('../pages/admin/ReviewManagementPage').then((module) => ({ default: module.ReviewManagementPage })))
const ReportManagementPage = lazy(() => import('../pages/admin/ReportManagementPage').then((module) => ({ default: module.ReportManagementPage })))
const ActivityLogPage = lazy(() => import('../pages/admin/ActivityLogPage').then((module) => ({ default: module.ActivityLogPage })))
const AdminInstructorApplicationsPage = lazy(() => import('../pages/admin/AdminInstructorApplicationsPage').then((module) => ({ default: module.AdminInstructorApplicationsPage })))
const PayoutManagementPage = lazy(() => import('../pages/admin/PayoutManagementPage').then((module) => ({ default: module.PayoutManagementPage })))
const AdminSubscriptionPage = lazy(() => import('../pages/admin/AdminSubscriptionPage').then((module) => ({ default: module.AdminSubscriptionPage })))
const CreateSubscriptionPlanPage = lazy(() => import('../pages/admin/CreateSubscriptionPlanPage').then((module) => ({ default: module.CreateSubscriptionPlanPage })))
const AdminPolicyPage = lazy(() => import('../pages/admin/AdminPolicyPage').then((module) => ({ default: module.AdminPolicyPage })))

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

function AdminAnalyticsRedirect() {
  const { navigate } = useRouter()
  useEffect(() => {
    navigate('/admin/statistics')
  }, [navigate])
  return null
}

function AdminPermissionsRedirect() {
  const { navigate } = useRouter()
  useEffect(() => {
    navigate('/admin/users')
  }, [navigate])
  return null
}

const adminRouteDefinitions: AdminRouteDefinition[] = [
  { path: '/admin', page: <AdminDashboard /> },
  { path: '/admin/users', page: <AdminUsersPage /> },
  { path: '/admin/users/new', page: <CreateUserPage /> },
  { path: '/admin/users/:userId/edit', page: <EditUserPage />, dynamic: true },
  { path: '/admin/courses', page: <AdminCoursesPage /> },
  { path: '/admin/courses/:courseId', page: <AdminCourseDetailPage />, dynamic: true },
  { path: '/admin/payments', page: <PaymentManagementPage /> },
  { path: '/admin/payouts', page: <PayoutManagementPage /> },
  { path: '/admin/discounts', page: <AdminDiscountsPage /> },
  { path: '/admin/analytics', page: <AdminAnalyticsRedirect /> },
  { path: '/admin/categories', page: <AdminCategoriesPage /> },
  { path: '/admin/statistics', page: <StatisticsPage /> },
  { path: '/admin/permissions', page: <AdminPermissionsRedirect /> },
  { path: '/admin/settings', page: <PlatformSettingsPage /> },
  { path: '/admin/blog', page: <AdminBlogPostsPage /> },
  { path: '/admin/qa', page: <AdminQAPage /> },
  { path: '/admin/reviews', page: <ReviewManagementPage /> },
  { path: '/admin/reports', page: <ReportManagementPage /> },
  { path: '/admin/refunds', page: <PaymentManagementPage /> },
  { path: '/admin/instructor-applications', page: <AdminInstructorApplicationsPage /> },
  { path: '/admin/subscriptions', page: <AdminSubscriptionPage /> },
  { path: '/admin/subscriptions/new', page: <CreateSubscriptionPlanPage /> },
  { path: '/admin/policies', page: <AdminPolicyPage /> },
  { path: '/admin/activity-log', page: <ActivityLogPage /> },
]

export const adminRoutes: RouteConfig[] = adminRouteDefinitions.map((route) => ({
  path: route.path,
  element: withAdminShell(route.page, route.layoutProps),
  dynamic: route.dynamic,
}))
