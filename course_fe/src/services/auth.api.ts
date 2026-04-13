














import { http } from './http'



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






export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return http.post<LoginResponse>('/users/login', credentials)
}




export async function googleLogin(payload: GoogleLoginPayload): Promise<LoginResponse> {
  return http.post<LoginResponse>('/users/google-login', payload)
}




export async function register(data: RegisterData): Promise<UserProfile> {
  return http.post<UserProfile>('/users/register', data)
}




export async function refreshToken(refreshTkn: string): Promise<{ access_token: string; message: string }> {
  return http.post('/users/refresh-token', { refresh_token: refreshTkn })
}




export async function getUserById(userId: number): Promise<UserProfile> {
  return http.get<UserProfile>(`/users/${userId}`)
}




export async function updateProfile(userId: number, data: Partial<UserProfile>): Promise<UserProfile> {
  return http.patch<UserProfile>(`/users/${userId}/updateinfo`, data)
}




export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return http.post('/users/reset-password', { email })
}




export async function confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
  return http.post('/users/confirm-reset-password', { token, new_password: newPassword })
}




export async function confirmEmail(token: string): Promise<ActionMessageResponse> {
  return http.post('/users/confirm-email', { token })
}




export async function resendConfirmEmail(email: string): Promise<ActionMessageResponse> {
  return http.post('/users/resend-confirm-email', { email })
}




export async function deactivateMyAccount(password: string): Promise<ActionMessageResponse> {
  return http.post<ActionMessageResponse>('/users/me/deactivate', { password })
}




export async function deleteMyAccount(password: string): Promise<ActionMessageResponse> {
  return http.post<ActionMessageResponse>('/users/me/delete', { password })
}




export async function changeMyPassword(payload: ChangePasswordPayload): Promise<ActionMessageResponse> {
  return http.post<ActionMessageResponse>('/users/me/change-password', payload)
}
