











































import { API_BASE_URL, getAccessToken, getApiTransportHeaders, http } from './http'

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
  user_name?: string
  course_title?: string
  instructor_name?: string
  payment_method?: string
}





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
  revenue?: number
  transactions?: number
  rating: number
}

export async function getAdminDashboardStats(dateFrom?: string, dateTo?: string): Promise<AdminDashboardStats> {
  return http.get<AdminDashboardStats>('/admin/dashboard/stats/', rangeParams(dateFrom, dateTo))
}

export async function getAdminRevenueAnalytics(months = 6, dateFrom?: string, dateTo?: string): Promise<RevenueTrend[]> {
  return http.get<RevenueTrend[]>('/admin/analytics/revenue/', { months, ...rangeParams(dateFrom, dateTo) })
}

export async function getAdminUserAnalytics(months = 6, dateFrom?: string, dateTo?: string): Promise<UserTrend[]> {
  return http.get<UserTrend[]>('/admin/analytics/users/', { months, ...rangeParams(dateFrom, dateTo) })
}

export async function getAdminCourseAnalytics(dateFrom?: string, dateTo?: string): Promise<TopCourse[]> {
  return http.get<TopCourse[]>('/admin/analytics/courses/', rangeParams(dateFrom, dateTo))
}

export interface RevenueBreakdown {
  retail_revenue: number
  subscription_revenue: number
  total_gross: number
  total_refunded: number
  net_revenue: number
  retail_count: number
  subscription_count: number
}

export interface RevenueMonthlyEntry {
  date: string
  retail: number
  subscription: number
  gross: number
  refunded: number
  net: number
  transactions?: number
}

export interface CommissionAnalytics {
  total_instructor_earnings: number
  total_platform_revenue: number
  total_gross: number
  platform_share_pct: number
  instructor_share_pct: number
  per_instructor: Array<{
    instructor_id: number
    instructor_name: string | null
    total_earnings: number
    gross: number
    retail_earnings: number
    sub_earnings: number
    pending: number
    available: number
    paid: number
  }>
}

export interface RefundBreakdown {
  count: number
  amount: number
}

export interface RefundAnalytics {
  total_requests: number
  total_refunded_amount: number
  breakdown: Record<string, RefundBreakdown>
}

export interface CourseRevenueRow {
  course_id: number
  title: string
  instructor_name: string | null
  revenue: number
  transactions: number
}

export interface CourseRevenueDetailRow {
  course_id: number
  title: string
  instructor_name: string | null
  category_name: string
  revenue: number
  refunded: number
  net_revenue: number
  transactions: number
  enrollments: number
}

export interface CategoryRevenueRow {
  category_id: number | null
  category_name: string
  revenue: number
  refunded: number
  net_revenue: number
  transactions: number
  course_count: number
}

export interface InstructorRevenueRow {
  instructor_id: number | null
  instructor_name: string | null
  gross: number
  instructor_earnings: number
  platform_revenue: number
  retail_revenue: number
  subscription_revenue: number
  pending: number
  available: number
  paid: number
  transactions: number
}

export interface SubscriptionPlanMetric {
  plan_id: number
  plan_name: string
  duration_type: string
  revenue: number
  payments: number
  new_subscribers: number
  cancelled_subscribers: number
  expired_subscribers: number
  active_subscribers: number
  churn_rate: number
}

export interface SubscriptionMetrics {
  total_revenue: number
  new_subscribers: number
  cancelled_subscribers: number
  expired_subscribers: number
  active_subscribers: number
  churn_rate: number
  per_plan: SubscriptionPlanMetric[]
}

export interface EarningPayoutInstructorRow {
  instructor_id: number | null
  instructor_name: string | null
  gross: number
  instructor_earnings: number
  retail_earnings: number
  subscription_earnings: number
  pending_earnings: number
  available_earnings: number
  paid_earnings: number
  payout_requested: number
  payout_processed: number
  payout_processed_net: number
  payout_pending: number
  payout_failed: number
  payout_cancelled: number
  payout_fee: number
  payout_processed_fee: number
  earning_count: number
  payout_count: number
  payout_processed_count: number
  payable_earnings: number
  unpaid_balance: number
  settlement_gap: number
}

export interface EarningPayoutMetrics {
  total_gross_earnings: number
  total_instructor_earnings: number
  retail_earnings: number
  subscription_earnings: number
  pending_earnings: number
  available_earnings: number
  payable_earnings: number
  paid_earnings: number
  cancelled_earnings: number
  earning_count: number
  payout_requested: number
  payout_processed: number
  payout_processed_net: number
  payout_pending: number
  payout_failed: number
  payout_cancelled: number
  payout_fee: number
  payout_processed_fee: number
  payout_count: number
  payout_processed_count: number
  payout_by_status: Record<string, { count: number; amount: number; fee: number; net_amount: number }>
  per_instructor: EarningPayoutInstructorRow[]
}

export interface ImportResult {
  success?: number
  created?: number
  updated?: number
  skipped?: number
  errors: Array<{ row: number; email: string; reason: string }>
}

function rangeParams(dateFrom?: string, dateTo?: string): Record<string, string> {
  const params: Record<string, string> = {}
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo
  return params
}

export async function getAdminRevenueBreakdown(dateFrom?: string, dateTo?: string): Promise<RevenueBreakdown> {
  return http.get<RevenueBreakdown>('/admin/analytics/revenue-breakdown/', rangeParams(dateFrom, dateTo))
}

export async function getAdminRevenueMonthlyBreakdown(months = 12, dateFrom?: string, dateTo?: string): Promise<RevenueMonthlyEntry[]> {
  return http.get<RevenueMonthlyEntry[]>('/admin/analytics/revenue-monthly-breakdown/', {
    months,
    ...rangeParams(dateFrom, dateTo),
  })
}

export async function getAdminCommissionAnalytics(dateFrom?: string, dateTo?: string): Promise<CommissionAnalytics> {
  return http.get<CommissionAnalytics>('/admin/analytics/commission/', rangeParams(dateFrom, dateTo))
}

export async function getAdminRefundAnalytics(dateFrom?: string, dateTo?: string): Promise<RefundAnalytics> {
  return http.get<RefundAnalytics>('/admin/analytics/refunds/', rangeParams(dateFrom, dateTo))
}

export async function getAdminTopCoursesByRevenue(limit = 10, dateFrom?: string, dateTo?: string): Promise<CourseRevenueRow[]> {
  return http.get<CourseRevenueRow[]>('/admin/analytics/top-courses-revenue/', {
    limit,
    ...rangeParams(dateFrom, dateTo),
  })
}

export async function getAdminRevenueByCourse(limit = 50, dateFrom?: string, dateTo?: string): Promise<CourseRevenueDetailRow[]> {
  return http.get<CourseRevenueDetailRow[]>('/admin/analytics/revenue-by-course/', {
    limit,
    ...rangeParams(dateFrom, dateTo),
  })
}

export async function getAdminRevenueByCategory(limit = 20, dateFrom?: string, dateTo?: string): Promise<CategoryRevenueRow[]> {
  return http.get<CategoryRevenueRow[]>('/admin/analytics/revenue-by-category/', {
    limit,
    ...rangeParams(dateFrom, dateTo),
  })
}

export async function getAdminRevenueByInstructor(limit = 20, dateFrom?: string, dateTo?: string): Promise<InstructorRevenueRow[]> {
  return http.get<InstructorRevenueRow[]>('/admin/analytics/revenue-by-instructor/', {
    limit,
    ...rangeParams(dateFrom, dateTo),
  })
}

export async function getAdminSubscriptionMetrics(dateFrom?: string, dateTo?: string): Promise<SubscriptionMetrics> {
  return http.get<SubscriptionMetrics>('/admin/analytics/subscription-metrics/', rangeParams(dateFrom, dateTo))
}

export async function getAdminEarningPayoutMetrics(limit = 100, dateFrom?: string, dateTo?: string): Promise<EarningPayoutMetrics> {
  return http.get<EarningPayoutMetrics>('/admin/analytics/earning-payout/', {
    limit,
    ...rangeParams(dateFrom, dateTo),
  })
}

export type BulkReportKey =
  | 'revenue_monthly'
  | 'revenue_quarterly'
  | 'revenue_yearly'
  | 'revenue_instructor'
  | 'revenue_course'
  | 'revenue_category'
  | 'subscription_plan'
  | 'subscription_metrics'
  | 'earning_payout'
  | 'refunds'

export async function exportAdminBulkReports(
  reports: BulkReportKey[],
  format: 'csv' | 'excel' = 'excel',
  dateFrom?: string,
  dateTo?: string,
): Promise<void> {
  const params = new URLSearchParams({ format, reports: reports.join(',') })
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  await downloadBlob(
    `/admin/analytics/bulk-export/?${params.toString()}`,
    `statistics_reports.${format === 'excel' ? 'xlsx' : 'zip'}`
  )
}

async function downloadBlob(endpoint: string, filename: string): Promise<void> {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      ...getApiTransportHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    let message = 'Download failed'
    try {
      const error = await response.json()
      message = error.error || error.message || message
    } catch {

    }
    throw new Error(message)
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function exportAdminRevenue(format: 'csv' | 'excel' = 'csv', dateFrom?: string, dateTo?: string): Promise<void> {
  const params = new URLSearchParams({ format })
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  await downloadBlob(
    `/admin/analytics/revenue-export/?${params.toString()}`,
    `revenue_report.${format === 'excel' ? 'xlsx' : 'csv'}`
  )
}

export async function exportCourseStudents(courseId: number, format: 'csv' | 'excel' = 'csv'): Promise<void> {
  const params = new URLSearchParams({ format })
  await downloadBlob(
    `/courses/${courseId}/students/export/?${params.toString()}`,
    `course_${courseId}_students.${format === 'excel' ? 'xlsx' : 'csv'}`
  )
}

export async function exportAdminPayments(format: 'csv' | 'excel' = 'csv'): Promise<void> {
  const params = new URLSearchParams({ format })
  await downloadBlob(
    `/payments/export/?${params.toString()}`,
    `payments_export.${format === 'excel' ? 'xlsx' : 'csv'}`
  )
}

export async function exportInstructorPayouts(
  format: 'csv' | 'excel' = 'csv',
  options?: { instructorId?: number; dateFrom?: string; dateTo?: string; status?: string }
): Promise<void> {
  const params = new URLSearchParams({ format })
  if (options?.instructorId) params.set('instructor_id', String(options.instructorId))
  if (options?.dateFrom) params.set('date_from', options.dateFrom)
  if (options?.dateTo) params.set('date_to', options.dateTo)
  if (options?.status) params.set('status', options.status)
  await downloadBlob(
    `/instructor-payouts/export/?${params.toString()}`,
    `instructor_payouts.${format === 'excel' ? 'xlsx' : 'csv'}`
  )
}

export async function exportAdminUsers(
  format: 'csv' | 'excel' = 'csv',
  options?: { dateFrom?: string; dateTo?: string; status?: string; role?: string }
): Promise<void> {
  const params = new URLSearchParams({ format })
  if (options?.dateFrom) params.set('date_from', options.dateFrom)
  if (options?.dateTo) params.set('date_to', options.dateTo)
  if (options?.status) params.set('status', options.status)
  if (options?.role) params.set('role', options.role)
  await downloadBlob(
    `/admin/export/users/?${params.toString()}`,
    `users_export.${format === 'excel' ? 'xlsx' : 'csv'}`
  )
}

export async function exportAdminInstructors(
  format: 'csv' | 'excel' = 'csv',
  options?: { dateFrom?: string; dateTo?: string }
): Promise<void> {
  const params = new URLSearchParams({ format })
  if (options?.dateFrom) params.set('date_from', options.dateFrom)
  if (options?.dateTo) params.set('date_to', options.dateTo)
  await downloadBlob(
    `/instructors/export/?${params.toString()}`,
    `instructors_export.${format === 'excel' ? 'xlsx' : 'csv'}`
  )
}

export async function importSubscriptionPlan(file: File, planId: number): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('plan_id', String(planId))
  return http.upload<ImportResult>('/admin/import/subscription-plan/', formData)
}

export async function downloadSubscriptionTemplate(): Promise<void> {
  await downloadBlob('/admin/import/subscription-plan/template/', 'subscription_import_template.xlsx')
}

export async function importUsersBulk(file: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  return http.upload<ImportResult>('/admin/import/users/', formData)
}

export async function downloadUsersTemplate(): Promise<void> {
  await downloadBlob('/admin/import/users/template/', 'users_import_template.xlsx')
}

export async function importCourseGrants(file: File, courseIds: number[]): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('course_ids', courseIds.join(','))
  return http.upload<ImportResult>('/admin/import/course-grants/', formData)
}

export async function downloadCourseGrantsTemplate(): Promise<void> {
  await downloadBlob('/admin/import/course-grants/template/', 'course_grants_template.xlsx')
}



export interface AdminUser {
  id: number
  user: number | {
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



export interface ActivityLog {
  id: number
  user?: number | null
  user_id?: number | null
  action: string
  description: string
  entity_type?: string | null
  entity_id?: number | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user_name?: string | null
  user_email?: string | null
  user_avatar?: string | null
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  return fetchAllPages<ActivityLog>('/activity-logs/')
}

export async function cleanupActivityLogs(): Promise<{ message: string }> {
  return http.delete<{ message: string }>('/activity-logs/cleanup/')
}



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

export async function adminExtendSubscription(subscriptionId: number, extend_days: number): Promise<any> {
  return http.post(`/subscriptions/admin/${subscriptionId}/extend/`, { extend_days })
}

export async function adminCancelSubscription(subscriptionId: number): Promise<any> {
  return http.post(`/subscriptions/admin/${subscriptionId}/cancel/`, {})
}

export async function managePlanCourses(planId: number, data?: Record<string, any>): Promise<any> {
  if (data) {
    return http.post(`/subscription-plans/admin/${planId}/courses/`, data)
  }
  return fetchAllPages<any>(`/subscription-plans/admin/${planId}/courses/`)
}



export interface SystemSetting {
  id: number
  key: string
  value: string
  description: string | null
  created_at: string
  updated_at: string
}

export async function getSystemSettings(): Promise<SystemSetting[]> {
  return fetchAllPages<SystemSetting>('/platform-settings/')
}

export async function getSystemSettingByKey(key: string): Promise<SystemSetting | null> {
  const settings = await getSystemSettings()
  return settings.find(s => s.key === key) ?? null
}

export async function createSystemSetting(data: Record<string, any>): Promise<SystemSetting> {
  return http.post<SystemSetting>('/platform-settings/create/', data)
}

export async function updateSystemSetting(settingId: number, data: Record<string, any>): Promise<SystemSetting> {
  return http.patch<SystemSetting>(`/platform-settings/${settingId}/update/`, data)
}

export async function deleteSystemSetting(settingId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/platform-settings/${settingId}/delete/`)
}



export interface UserItem {
  id: number
  username: string
  email: string
  full_name: string
  phone: string | null
  avatar: string | null
  status: 'active' | 'inactive' | 'banned'
  roles?: string[]
  created_at: string
  last_login: string | null
  enrollment_count: number
  courses_count: number | null
}

export interface AdminUserListParams {
  page?: number
  page_size?: number
  search?: string
  status?: 'active' | 'inactive' | 'banned'
  role?: 'student' | 'instructor' | 'admin'
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



export function formatAdminCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}
