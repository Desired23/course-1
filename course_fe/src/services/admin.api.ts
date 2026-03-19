/**
 * Admin API Service — Dashboard Stats & Analytics
 *
 * BE endpoints:
 *   GET /api/admin/dashboard/stats/           — overall platform stats
 *   GET /api/admin/analytics/revenue/?months=6 — monthly revenue trend
 *   GET /api/admin/analytics/users/?months=6   — monthly user registration trend
 *   GET /api/admin/analytics/courses/          — top courses by enrollment
 *
 *   Admin CRUD:
 *   GET    /api/admins/                        — list admins (paginated)
 *   POST   /api/admins/create                  — create admin
 *   GET    /api/admins/<id>                    — admin detail
 *   PATCH  /api/admins/<id>/update             — update admin
 *   DELETE /api/admins/<id>/delete             — delete admin
 *
 *   Applications (review):
 *   GET    /api/applications/admin/            — list all applications
 *   PATCH  /api/applications/<id>/review/      — approve/reject application
 *
 *   Activity Logs:
 *   GET    /api/activity-logs/                 — list activity logs
 *   DELETE /api/activity-logs/cleanup/         — cleanup old logs
 *
 *   Subscription Plans (admin):
 *   GET/POST /api/subscription-plans/admin/                   — list/create plans
 *   PATCH/DEL /api/subscription-plans/admin/<id>/             — update/delete plan
 *   GET/POST  /api/subscription-plans/admin/<id>/courses/     — manage plan courses
 *   GET       /api/subscription-plans/admin/<id>/subscribers/ — list subscribers
 *
 *   System Settings:
 *   GET    /api/systems_settings/              — list settings
 *   POST   /api/systems_settings/create/       — create setting
 *   PATCH  /api/systems_settings/<id>/update/  — update setting
 *   DELETE /api/systems_settings/<id>/delete/  — delete setting
 *
 *   Users (admin):
 *   GET    /api/users/                         — list all users
 *   POST   /api/users/create                   — create user
 *   GET    /api/users/<id>                     — user detail
 *   PATCH  /api/users/<id>/update              — admin update user
 *   DELETE /api/users/<id>/delete              — delete user
 */

import { http } from './http'

interface PaginatedListResponse<T> {
  next: string | null
  results: T[]
}

function isPaginatedListResponse<T>(value: any): value is PaginatedListResponse<T> {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.results))
}

async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  const all: T[] = []
  let page = 1
  while (true) {
    const res = await http.get<any>(endpoint, { page, page_size: 100 })
    if (Array.isArray(res)) return res as T[]
    if (isPaginatedListResponse<T>(res)) {
      all.push(...res.results)
      if (!res.next) break
      page++
      continue
    }
    break
  }
  return all
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

// ─── Payments (admin) ─────────────────────────────────────────────────────────

export interface AdminPaymentCourse {
  course_id: number
  course_title: string
  enrollment_status: string | null
}

export interface AdminPayment {
  payment_id: number
  user_id: number | null
  user_email: string | null
  payment_status: string
  total_amount: string
  created_at: string
  has_problem: boolean
  courses: AdminPaymentCourse[]
}

/**
 * List payments for the admin dashboard.
 * @param problematic only include payments with missing enrollment when true
 */
export async function getAdminPayments(problematic = false): Promise<AdminPayment[]> {
  const all: AdminPayment[] = []
  let page = 1
  while (true) {
    const params: any = { page, page_size: 100 }
    if (problematic) params.problematic = true
    const res = await http.get<any>('/payments/', params)
    if (Array.isArray(res)) return res
    if (isPaginatedListResponse<AdminPayment>(res)) {
      all.push(...res.results)
      if (!res.next) break
      page++
      continue
    }
    break
  }
  return all
}

export async function fixPayment(paymentId: number): Promise<any> {
  return http.post<any>('/payments/fix/', { payment_id: paymentId })
}


export interface AdminDashboardStats {
  total_users: number
  new_users_this_month: number
  total_instructors: number
  total_courses: number
  published_courses: number
  pending_courses: number
  total_revenue: number
  this_month_revenue: number
  total_enrollments: number
  this_month_enrollments: number
  active_students: number
  completion_rate: number
  pending_reviews: number
  pending_support_tickets: number
  platform_rating: number
}

export interface RevenueTrend {
  date: string
  revenue: number
}

export interface UserTrend {
  date: string
  new_users: number
}

export interface TopCourse {
  course_id: number
  title: string
  instructor_name: string | null
  enrollment_count: number
  rating: number
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return http.get<AdminDashboardStats>('/admin/dashboard/stats/')
}

export async function getAdminRevenueAnalytics(months = 6): Promise<RevenueTrend[]> {
  return http.get<RevenueTrend[]>('/admin/analytics/revenue/', { months })
}

export async function getAdminUserAnalytics(months = 6): Promise<UserTrend[]> {
  return http.get<UserTrend[]>('/admin/analytics/users/', { months })
}

export async function getAdminCourseAnalytics(): Promise<TopCourse[]> {
  return http.get<TopCourse[]>('/admin/analytics/courses/')
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number
  user: {
    id: number
    username: string
    email: string
    full_name: string
  }
  is_super_admin: boolean
  permissions: string[]
  created_at: string
}

export async function getAdmins(): Promise<AdminUser[]> {
  return fetchAllPages<AdminUser>('/admins/')
}

export async function getAdminById(adminId: number): Promise<AdminUser> {
  return http.get<AdminUser>(`/admins/${adminId}`)
}

export async function createAdmin(data: Record<string, any>): Promise<AdminUser> {
  return http.post<AdminUser>('/admins/create', data)
}

export async function updateAdmin(adminId: number, data: Record<string, any>): Promise<AdminUser> {
  return http.patch<AdminUser>(`/admins/${adminId}/update`, data)
}

export async function deleteAdmin(adminId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/admins/${adminId}/delete`)
}

// ─── Applications (admin review) ─────────────────────────────────────────────

export interface Application {
  id: number
  user: number
  form: number
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested'
  responses: Array<{ question: number; value: string }>
  admin_notes: string | null
  created_at: string
  updated_at: string
  user_name?: string
  user_email?: string
}

export async function getAdminApplications(): Promise<Application[]> {
  return fetchAllPages<Application>('/applications/admin/')
}

export async function reviewApplication(
  applicationId: number,
  data: { status: string; admin_notes?: string }
): Promise<Application> {
  return http.patch<Application>(`/applications/${applicationId}/review/`, data)
}

// ─── Activity Logs ────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: number
  user: number | null
  action: string
  description: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user_name?: string
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  return fetchAllPages<ActivityLog>('/activity-logs/')
}

export async function cleanupActivityLogs(): Promise<{ message: string }> {
  return http.delete<{ message: string }>('/activity-logs/cleanup/')
}

// ─── Subscription Plans (admin) ───────────────────────────────────────────────

export async function getAdminSubscriptionPlans(): Promise<any[]> {
  return fetchAllPages<any>('/subscription-plans/admin/')
}

export async function createSubscriptionPlan(data: Record<string, any>): Promise<any> {
  return http.post('/subscription-plans/admin/', data)
}

export async function updateSubscriptionPlan(planId: number, data: Record<string, any>): Promise<any> {
  return http.patch(`/subscription-plans/admin/${planId}/`, data)
}

export async function deleteSubscriptionPlan(planId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/subscription-plans/admin/${planId}/`)
}

export async function getPlanSubscribers(planId: number): Promise<any[]> {
  return fetchAllPages<any>(`/subscription-plans/admin/${planId}/subscribers/`)
}

export async function managePlanCourses(planId: number, data?: Record<string, any>): Promise<any> {
  if (data) {
    return http.post(`/subscription-plans/admin/${planId}/courses/`, data)
  }
  return fetchAllPages<any>(`/subscription-plans/admin/${planId}/courses/`)
}

// ─── System Settings ──────────────────────────────────────────────────────────

export interface SystemSetting {
  id: number
  key: string
  value: string
  description: string | null
  created_at: string
  updated_at: string
}

export async function getSystemSettings(): Promise<SystemSetting[]> {
  return fetchAllPages<SystemSetting>('/systems_settings/')
}

export async function createSystemSetting(data: Record<string, any>): Promise<SystemSetting> {
  return http.post<SystemSetting>('/systems_settings/create/', data)
}

export async function updateSystemSetting(settingId: number, data: Record<string, any>): Promise<SystemSetting> {
  return http.patch<SystemSetting>(`/systems_settings/${settingId}/update/`, data)
}

export async function deleteSystemSetting(settingId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/systems_settings/${settingId}/delete/`)
}

// ─── Users (admin management) ─────────────────────────────────────────────────

export interface UserItem {
  id: number
  username: string
  email: string
  full_name: string
  phone: string | null
  avatar: string | null
  status: 'active' | 'inactive' | 'banned'
  user_type: string
  created_at: string
  last_login: string | null
}

export interface AdminUserListParams {
  page?: number
  page_size?: number
  search?: string
  status?: 'active' | 'inactive' | 'banned'
  user_type?: 'student' | 'instructor' | 'admin'
}

export interface AdminPaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

export async function getUsers(params?: AdminUserListParams): Promise<AdminPaginatedResponse<UserItem>> {
  return http.get<AdminPaginatedResponse<UserItem>>('/users/', params)
}

export async function getAllUsers(): Promise<UserItem[]> {
  return fetchAllPages<UserItem>('/users/')
}

export async function getUserById(userId: number): Promise<UserItem> {
  return http.get<UserItem>(`/users/${userId}`)
}

export async function createUser(data: Record<string, any>): Promise<UserItem> {
  return http.post<UserItem>('/users/create', data)
}

export async function adminUpdateUser(userId: number, data: Record<string, any>): Promise<UserItem> {
  return http.patch<UserItem>(`/users/${userId}/update`, data)
}

export async function deleteUser(userId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/users/${userId}/delete`)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatAdminCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}
