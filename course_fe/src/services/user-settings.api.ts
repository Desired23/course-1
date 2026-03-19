import { http } from './http'

export interface UserSettings {
  account_preferences: Record<string, any>
  notification_preferences: Record<string, any>
  privacy_preferences: Record<string, any>
  created_at: string
  updated_at: string
}

export async function getMyUserSettings(): Promise<UserSettings> {
  return http.get<UserSettings>('/users/me/settings')
}

export async function updateMyUserSettings(data: Partial<Pick<UserSettings, 'account_preferences' | 'notification_preferences' | 'privacy_preferences'>>): Promise<UserSettings> {
  return http.patch<UserSettings>('/users/me/settings', data)
}
