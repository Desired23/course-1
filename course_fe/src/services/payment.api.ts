import { http } from './http'

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

export interface Payment {
  id: number
  user: number
  payment_type: 'course_purchase' | 'subscription'
  subscription_plan: number | null
  amount: string
  promotion: number | null
  discount_amount: string
  total_amount: string
  transaction_id: string | null
  payment_date: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  payment_method: 'vnpay' | 'momo'
  refund_amount: string
  payment_gateway: string
  gateway_response: string | null
  retryable_until?: string | null
  can_retry_payment?: boolean
  created_at: string
  updated_at: string
  courses: PaymentCourse[]
}

export interface PaymentCourse {
  course_id: number
  course_title: string
  course_thumbnail?: string | null
  course_slug?: string | null
  instructor_name?: string | null
  level?: string | null
  duration?: number | null
  total_lessons?: number | null
  price: string
  discount: string
  final_price: string
  enrollment_status?: string | null
  enrollment_id?: number | null
}

export interface PaymentDetail {
  id: number
  payment: number
  course: number
  price: string
  discount: string
  final_price: string
  promotion: number | null
  refund_status: 'pending' | 'processing' | 'approved' | 'success' | 'rejected' | 'failed' | 'cancelled'
  refund_amount: string | null
  refund_reason: string | null
  refund_date: string | null
  created_at: string
}

export interface VnpayCreateResponse {
  payment_url: string
  payment_id: number
}

export interface MomoCreateResponse {
  partnerCode: string
  requestId: string
  orderId: string
  amount: number
  responseTime: number
  message: string
  resultCode: number
  payUrl: string
  shortLink?: string
}

export interface VnpayReturnResponse {
  title: string
  result: string
  order_id?: string
  amount?: string
  vnp_TransactionNo?: string
  vnp_ResponseCode?: string
  msg?: string
}

export interface CreatePaymentResponse {
  payment: Payment
  payment_details: PaymentDetail[]
  gateway_payment?: {
    provider: 'momo' | 'vnpay'
    url: string
    payload?: MomoCreateResponse | VnpayCreateResponse
  }
}

export async function createPaymentRecord(data: {
  user_id: number
  payment_method: string
  payment_type?: string
  billing_cycle?: 'monthly' | 'yearly'
  subscription_plan_id?: number
  payment_details: Array<{
    course_id: number
    promotion_id?: number | null
  }>
  promotion_id?: number | null
}): Promise<CreatePaymentResponse> {
  return http.post<CreatePaymentResponse>('/payment/create/', data)
}

export async function getPaymentStatus(paymentId: number): Promise<Payment> {
  return http.get<Payment>(`/payments/status/${paymentId}/`)
}

export async function checkEnrollment(courseId: number): Promise<{ enrolled: boolean }> {
  return http.get<{ enrolled: boolean }>(`/payments/check-enrollment/${courseId}/`)
}

export async function createVnpayPayment(data: {
  amount: number
  order_id?: string
  order_desc?: string
  language?: string
  bank_code?: string
}): Promise<VnpayCreateResponse> {
  return http.post<VnpayCreateResponse>('/vnpay/create/', data)
}

export async function createMomoPayment(data: {
  payment_id?: number | string
  order_id?: number | string
}): Promise<MomoCreateResponse> {
  return http.post<MomoCreateResponse>('/momo/create/', data)
}

export interface MyPaymentItem {
  id: number
  course_id: number | null
  course_title: string
  course_thumbnail: string | null
  course_slug?: string | null
  instructor_name?: string | null
  level?: string | null
  duration?: number | null
  total_lessons?: number | null
  price: string
  discount: string
  final_price: string
  refund_status: 'pending' | 'processing' | 'approved' | 'success' | 'rejected' | 'failed' | 'cancelled'
  refund_request_time?: string | null
  refund_amount: string | null
  refund_reason: string | null
  gateway_attempt_count?: number
  last_gateway_attempt_at?: string | null
  next_retry_at?: string | null
  last_gateway_error?: string | null
  internal_note_summary?: string | null
  is_deleted?: boolean
  deleted_at?: string | null
  refund_eligible?: boolean
  refund_disabled_reason?: string | null
  enrollment_status?: string | null
  enrollment_progress?: string | null
  enrollment_expiry_date?: string | null
}

export interface MyPayment {
  id: number
  payment_type: 'course_purchase' | 'subscription'
  amount: string
  discount_amount: string
  total_amount: string
  transaction_id: string | null
  payment_date: string | null
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  payment_method: 'vnpay' | 'momo'
  refund_amount: string
  created_at: string | null
  retryable_until?: string | null
  can_retry_payment?: boolean
  items: MyPaymentItem[]
}

export async function getMyPayments(params?: {
  page?: number
  page_size?: number
  payment_status?: MyPayment['payment_status'] | 'all'
  payment_type?: MyPayment['payment_type'] | 'all'
  refund_eligibility?: 'all' | 'eligible' | 'ineligible'
  search?: string
}): Promise<PaginatedResponse<MyPayment>> {
  const query = {
    page: params?.page,
    page_size: params?.page_size,
    payment_status: params?.payment_status && params.payment_status !== 'all' ? params.payment_status : undefined,
    payment_type: params?.payment_type && params.payment_type !== 'all' ? params.payment_type : undefined,
    refund_eligibility: params?.refund_eligibility && params.refund_eligibility !== 'all' ? params.refund_eligibility : undefined,
    search: params?.search?.trim() || undefined,
  }
  return http.get<PaginatedResponse<MyPayment>>('/payments/my/', query)
}

export interface RefundRequest {
  payment_id: number
  payment_details_ids: number[]
  reason: string
}

export interface UserRefundItem {
  refund_id: number
  payment_id: number
  course_id: number
  course_title: string | null
  amount: number
  refund_amount: number | null
  reason: string | null
  status: 'pending' | 'processing' | 'approved' | 'success' | 'rejected' | 'failed' | 'cancelled' | 'deleted'
  request_date: string
  processed_date: string | null
  transaction_id: string | null
  gateway_attempt_count: number
  last_gateway_attempt_at: string | null
  next_retry_at: string | null
  last_gateway_error: string | null
  internal_note_summary: string | null
  is_deleted: boolean
  deleted_at: string | null
  timeline?: Array<{ event: string; actor?: string | null; note?: string | null; timestamp: string }>
}

export interface AdminRefundItem {
  refund_id: number
  payment_id: number
  payment_details_ids: number[]
  user_name: string | null
  user_email: string | null
  course_id: number | null
  course_title: string | null
  amount: number
  refund_amount: number | null
  reason: string | null
  status: 'pending' | 'processing' | 'approved' | 'success' | 'rejected' | 'failed' | 'cancelled' | 'deleted'
  requested_at: string
  processed_at: string | null
  processed_by: string | null
  learning_progress: number
  course_completion_days: number
  transaction_id: string | null
  gateway_attempt_count: number
  last_gateway_attempt_at: string | null
  next_retry_at: string | null
  last_gateway_error: string | null
  internal_note_summary: string | null
  is_deleted: boolean
  deleted_at: string | null
  retryable: boolean
  timeline?: Array<{ event: string; actor?: string | null; note?: string | null; timestamp: string }>
}

export type PaymentAdminConfigKey = 'policies' | 'instructor-rates' | 'discounts' | 'refund-settings'

export interface RefundSettings {
  refund_mode: 'admin_approval' | 'direct_system'
  refund_retry_cooldown_minutes: number
  refund_max_retry_count: number
  refund_timeout_seconds: number
  allow_admin_override_refund_status: boolean
  allow_admin_soft_delete_refund: boolean
}

export interface PaymentAdminConfigResponse<T = any[]> {
  config_key: PaymentAdminConfigKey
  setting_id: number
  value: T
  updated_at: string
}

export async function getUserRefunds(params?: {
  page?: number
  page_size?: number
  status?: UserRefundItem['status'] | 'all'
  search?: string
  date_from?: string
  date_to?: string
  include_deleted?: boolean
}): Promise<PaginatedResponse<UserRefundItem>> {
  const query = {
    page: params?.page,
    page_size: params?.page_size,
    status: params?.status && params.status !== 'all' ? params.status : undefined,
    search: params?.search?.trim() || undefined,
    date_from: params?.date_from || undefined,
    date_to: params?.date_to || undefined,
    include_deleted: params?.include_deleted ? 'true' : undefined,
  }
  return http.get<PaginatedResponse<UserRefundItem>>('/refunds/', query)
}

export async function requestRefund(data: RefundRequest): Promise<{
  message: string
  mode: RefundSettings['refund_mode']
  results: UserRefundItem[]
}> {
  return http.post('/refunds/request/', data)
}

export async function getAdminRefunds(params?: {
  page?: number
  page_size?: number
  status?: AdminRefundItem['status'] | 'all'
  search?: string
  date_from?: string
  date_to?: string
  include_deleted?: boolean
  retryable?: boolean
}): Promise<PaginatedResponse<AdminRefundItem>> {
  const query = {
    page: params?.page,
    page_size: params?.page_size,
    status: params?.status && params.status !== 'all' ? params.status : undefined,
    search: params?.search?.trim() || undefined,
    date_from: params?.date_from || undefined,
    date_to: params?.date_to || undefined,
    include_deleted: params?.include_deleted ? 'true' : undefined,
    retryable: params?.retryable ? 'true' : undefined,
  }
  return http.get<PaginatedResponse<AdminRefundItem>>('/payments/refund/admin/', query)
}

export async function updateAdminRefundStatus(data: {
  payment_id: number
  payment_details_ids: number[]
  status: 'approved' | 'success' | 'rejected' | 'failed'
  response_code?: string
  transaction_id?: string
}): Promise<{ message: string; updated_items?: AdminRefundItem[]; errors?: Array<{ refund_id: number; message: string }> }> {
  return http.patch('/payments/refund/admin/', data)
}

export async function adminRefundAction(data: {
  action: 'approve' | 'reject' | 'retry' | 'sync' | 'cancel' | 'soft_delete' | 'restore' | 'override_status' | 'add_note'
  refund_ids: number[]
  note?: string
  override_status?: 'success' | 'failed' | 'rejected' | 'cancelled'
}): Promise<{
  message: string
  updated_items: AdminRefundItem[]
  skipped_items: Array<{ refund_id: number; message: string }>
  errors: Array<{ refund_id: number; message: string }>
}> {
  return http.post('/payments/refund/admin/action/', data)
}

export async function cancelRefundRequest(data: {
  payment_id: number
  payment_details_ids: number[]
}): Promise<{ message: string }> {
  return http.put<{ message: string }>('/refunds/details/', data)
}

export async function getPaymentAdminConfig<T = any[]>(configKey: PaymentAdminConfigKey): Promise<PaymentAdminConfigResponse<T>> {
  return http.get<PaymentAdminConfigResponse<T>>(`/payments/admin/config/${configKey}/`)
}

export async function updatePaymentAdminConfig<T = any[]>(configKey: PaymentAdminConfigKey, value: T): Promise<PaymentAdminConfigResponse<T>> {
  return http.patch<PaymentAdminConfigResponse<T>>(`/payments/admin/config/${configKey}/`, { value })
}

export function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Đang xử lý'
    case 'completed': return 'Hoàn thành'
    case 'failed': return 'Thất bại'
    case 'refunded': return 'Đã hoàn tiền'
    case 'cancelled': return 'Đã hủy'
    default: return status
  }
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}
