/**
 * Payment API Service — Payments, VNPay, Refunds
 *
 * BE endpoints (all under /api/):
 *   Payments:
 *     POST   /payment/create/                         — create payment record
 *     GET    /payments/status/<payment_id>/            — check payment status
 *     GET    /payments/check-enrollment/<course_id>/   — check if user enrolled
 *
 *   VNPay:
 *     POST   /vnpay/create/                           — create VNPay payment URL
 *     GET    /vnpay/return/                            — VNPay return callback
 *     GET    /vnpay/ipn/                               — VNPay IPN callback
 *
 *   Refunds:
 *     GET    /refunds/                                 — user refund list
 *     POST   /refunds/request/                         — request refund
 *     POST   /payments/refund/admin/                   — admin update refund
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function createPaymentRecord(data: {
  user_id: number
  payment_method: string
  payment_type?: string
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

// ─── VNPay ────────────────────────────────────────────────────────────────────

export async function createVnpayPayment(data: {
  amount: number
  order_id?: string
  order_desc?: string
  language?: string
  bank_code?: string
}): Promise<VnpayCreateResponse> {
  return http.post<VnpayCreateResponse>('/vnpay/create/', data)
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

// ─── User Payment History ─────────────────────────────────────────────────────

export interface MyPaymentItem {
  id: number
  course_id: number | null
  course_title: string
  course_thumbnail: string | null
  price: string
  discount: string
  final_price: string
  refund_status: string
  refund_amount: string | null
  refund_reason: string | null
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

export async function getMyPayments(): Promise<MyPayment[]> {
  return http.get<MyPayment[]>('/payments/my/')
}

// ─── Refund requests ──────────────────────────────────────────────────────────

export interface RefundRequest {
  payment_detail_id: number
  reason: string
}

export async function getUserRefunds(): Promise<PaymentDetail[]> {
  return http.get<PaymentDetail[]>('/refunds/')
}

export async function requestRefund(data: RefundRequest): Promise<{ message: string }> {
  return http.post<{ message: string }>('/refunds/request/', data)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
