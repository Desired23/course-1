/**
 * Payment Method API Service
 *
 * BE endpoints (all under /api/):
 *   User Payment Methods (for checkout):
 *     GET/POST  /payment-methods/user/                        — list / create
 *     PATCH/DEL /payment-methods/user/<method_id>/            — update / delete
 *     POST      /payment-methods/user/<method_id>/default/    — set default
 *
 *   Instructor Payout Methods (for receiving payouts):
 *     GET/POST  /payment-methods/instructor/                        — list / create
 *     PATCH/DEL /payment-methods/instructor/<method_id>/            — update / delete
 *     POST      /payment-methods/instructor/<method_id>/default/    — set default
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserPaymentMethod {
  id: number
  method_type: 'vnpay' | 'momo' | 'bank_transfer' | 'credit_card'
  is_default: boolean
  nickname: string | null
  masked_account: string | null
  bank_name: string | null
  bank_branch: string | null
  account_number: string | null
  account_name: string | null
  created_at: string
}

export interface InstructorPayoutMethod {
  id: number
  method_type: string
  is_default: boolean
  nickname: string | null
  bank_name: string | null
  bank_branch: string | null
  account_number: string | null
  account_name: string | null
  wallet_phone: string | null
  masked_account: string | null
  created_at: string
}

// ─── User Payment Methods ─────────────────────────────────────────────────────

export async function getUserPaymentMethods(): Promise<UserPaymentMethod[]> {
  return http.get<UserPaymentMethod[]>('/payment-methods/user/')
}

export async function createUserPaymentMethod(data: {
  method_type: string
  is_default?: boolean
  nickname?: string
  gateway_token?: string
  masked_account?: string
  bank_name?: string
  bank_branch?: string
  account_number?: string
  account_name?: string
}): Promise<UserPaymentMethod> {
  return http.post<UserPaymentMethod>('/payment-methods/user/', data)
}

export async function updateUserPaymentMethod(
  methodId: number,
  data: Partial<{
    nickname: string
    is_default: boolean
    bank_name: string
    bank_branch: string
    account_number: string
    account_name: string
  }>
): Promise<UserPaymentMethod> {
  return http.patch<UserPaymentMethod>(`/payment-methods/user/${methodId}/`, data)
}

export async function deleteUserPaymentMethod(methodId: number): Promise<void> {
  return http.delete<void>(`/payment-methods/user/${methodId}/`)
}

export async function setDefaultUserPaymentMethod(methodId: number): Promise<UserPaymentMethod> {
  return http.post<UserPaymentMethod>(`/payment-methods/user/${methodId}/default/`, {})
}

// ─── Instructor Payout Methods ────────────────────────────────────────────────

export async function getInstructorPayoutMethods(): Promise<InstructorPayoutMethod[]> {
  return http.get<InstructorPayoutMethod[]>('/payment-methods/instructor/')
}

export async function createInstructorPayoutMethod(data: {
  method_type: string
  is_default?: boolean
  nickname?: string
  bank_name?: string
  bank_branch?: string
  account_number?: string
  account_name?: string
  wallet_phone?: string
  masked_account?: string
}): Promise<InstructorPayoutMethod> {
  return http.post<InstructorPayoutMethod>('/payment-methods/instructor/', data)
}

export async function updateInstructorPayoutMethod(
  methodId: number,
  data: Partial<InstructorPayoutMethod>
): Promise<InstructorPayoutMethod> {
  return http.patch<InstructorPayoutMethod>(`/payment-methods/instructor/${methodId}/`, data)
}

export async function deleteInstructorPayoutMethod(methodId: number): Promise<void> {
  return http.delete<void>(`/payment-methods/instructor/${methodId}/`)
}

export async function setDefaultInstructorPayoutMethod(methodId: number): Promise<InstructorPayoutMethod> {
  return http.post<InstructorPayoutMethod>(`/payment-methods/instructor/${methodId}/default/`, {})
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getMethodTypeLabel(type: string): string {
  switch (type) {
    case 'vnpay': return 'VNPay'
    case 'momo': return 'MoMo'
    case 'bank_transfer': return 'Chuyển khoản ngân hàng'
    case 'credit_card': return 'Thẻ tín dụng'
    default: return type
  }
}
