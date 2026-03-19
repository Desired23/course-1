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
  refund_status: 'pending' | 'approved' | 'success' | 'rejected' | 'failed' | 'cancelled'
  refund_amount: string | null
  refund_reason: string | null
  refund_date: string | null
  created_at: string
}

export interface VnpayCreateResponse {
  payment_url: string
  payment_id: number
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
  refund_status: 'pending' | 'approved' | 'success' | 'rejected' | 'failed' | 'cancelled'
  refund_request_time?: string | null
  refund_amount: string | null
  refund_reason: string | null
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
  status: 'pending' | 'approved' | 'success' | 'rejected' | 'failed' | 'cancelled'
  request_date: string
  processed_date: string | null
  transaction_id: string | null
}

export async function getUserRefunds(params?: {
  page?: number
  page_size?: number
  status?: UserRefundItem['status'] | 'all'
  search?: string
  date_from?: string
  date_to?: string
}): Promise<PaginatedResponse<UserRefundItem>> {
  const query = {
    page: params?.page,
    page_size: params?.page_size,
    status: params?.status && params.status !== 'all' ? params.status : undefined,
    search: params?.search?.trim() || undefined,
    date_from: params?.date_from || undefined,
    date_to: params?.date_to || undefined,
  }
  return http.get<PaginatedResponse<UserRefundItem>>('/refunds/', query)
}

export async function requestRefund(data: RefundRequest): Promise<{ message: string }> {
  return http.post<{ message: string }>('/refunds/request/', data)
}

export async function cancelRefundRequest(data: {
  payment_id: number
  payment_details_ids: number[]
}): Promise<{ message: string }> {
  return http.put<{ message: string }>('/refunds/details/', data)
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
