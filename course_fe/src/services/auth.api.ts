/**
 * Auth API Service
 * All authentication-related API calls → Django Backend
 * 
 * Endpoints:
 *   POST /api/users/login          — Login with username + password
 *   POST /api/users/register       — Register new user
 *   POST /api/users/refresh-token  — Refresh access token
 *   POST /api/users/reset-password — Request password reset email
 *   POST /api/users/confirm-reset-password — Confirm password reset
 *   POST /api/users/confirm-email  — Verify email address
 *   GET  /api/users/:id            — Get user details
 *   PATCH /api/users/:id/updateinfo — Update own profile
 */

import { http } from './http'

// ─── Types matching Django Backend ────────────────────────────

export type UserType = 'student' | 'instructor' | 'admin'

export interface LoginCredentials {
  username: string
  password: string
  remember_me?: boolean
}

export interface RegisterData {
  username: string
  email: string
  full_name: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: {
    id: number
    username: string
    email: string
    user_type: UserType[]
  }
}

export interface UserProfile {
  id: number
  username: string
  email: string
  full_name: string
  phone: string | null
  avatar: string | null
  address: string | null
  created_at: string
  last_login: string | null
  status: 'active' | 'inactive' | 'banned'
  user_type: string
}

export interface ActionMessageResponse {
  message: string
  status?: string
  code?: string
  action?: string
  expires_in_minutes?: number
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

export interface GoogleLoginPayload {
  credential: string
  remember_me?: boolean
}

// ─── Auth API functions ───────────────────────────────────────

/**
 * Login user with username + password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return http.post<LoginResponse>('/users/login', credentials)
}

/**
 * Login/register user with Google credential (Google Identity Services ID token)
 */
export async function googleLogin(payload: GoogleLoginPayload): Promise<LoginResponse> {
  return http.post<LoginResponse>('/users/google-login', payload)
}

/**
 * Register new user
 */
export async function register(data: RegisterData): Promise<UserProfile> {
  return http.post<UserProfile>('/users/register', data)
}

/**
 * Refresh access token
 */
export async function refreshToken(refreshTkn: string): Promise<{ access_token: string; message: string }> {
  return http.post('/users/refresh-token', { refresh_token: refreshTkn })
}

/**
 * Get user profile by ID
 */
export async function getUserById(userId: number): Promise<UserProfile> {
  return http.get<UserProfile>(`/users/${userId}`)
}

/**
 * Update own profile
 */
export async function updateProfile(userId: number, data: Partial<UserProfile>): Promise<UserProfile> {
  return http.patch<UserProfile>(`/users/${userId}/updateinfo`, data)
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return http.post('/users/reset-password', { email })
}

/**
 * Confirm password reset with token
 */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
  return http.post('/users/confirm-reset-password', { token, new_password: newPassword })
}

/**
 * Verify email with token
 */
export async function confirmEmail(token: string): Promise<ActionMessageResponse> {
  return http.post('/users/confirm-email', { token })
}

/**
 * Resend verification email when the old link has expired
 */
export async function resendConfirmEmail(email: string): Promise<ActionMessageResponse> {
  return http.post('/users/resend-confirm-email', { email })
}

/**
 * Deactivate current account (self-service)
 */
export async function deactivateMyAccount(password: string): Promise<ActionMessageResponse> {
  return http.post<ActionMessageResponse>('/users/me/deactivate', { password })
}

/**
 * Soft-delete current account (self-service)
 */
export async function deleteMyAccount(password: string): Promise<ActionMessageResponse> {
  return http.post<ActionMessageResponse>('/users/me/delete', { password })
}

/**
 * Change password for current account (requires current password)
 */
export async function changeMyPassword(payload: ChangePasswordPayload): Promise<ActionMessageResponse> {
  return http.post<ActionMessageResponse>('/users/me/change-password', payload)
}
