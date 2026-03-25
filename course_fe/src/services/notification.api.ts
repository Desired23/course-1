import { http } from './http'

// ── Types ──────────────────────────────────────────────────────────

export type NotificationType = 'system' | 'course' | 'payment' | 'promotion' | 'other'

export interface Notification {
  id: number
  title: string
  sender: number | null
  receiver: number
  message: string
  is_read: boolean
  created_at: string   // ISO datetime
  type: NotificationType
  related_id: number | null
  notification_code: string | null
}

export interface InstructorAnnouncement {
  notification_code: string
  type: 'educational' | 'promotional'
  title: string
  content: string
  target_course: string
  recipient_count: number
  open_rate: number
  sent_at: string
  monthly_count?: number
  monthly_limit?: number
}

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

// ── API Functions ──────────────────────────────────────────────────

/**
 * Get notifications for a user (paginated).
 */
export async function getNotificationsByUser(
  userId: number,
  page = 1,
  pageSize = 20,
  params?: {
    type?: NotificationType | 'all'
    is_read?: boolean
    search?: string
    sort_by?: 'newest' | 'oldest'
  }
): Promise<PaginatedResponse<Notification>> {
  const searchParams = new URLSearchParams()
  searchParams.set('user_id', String(userId))
  searchParams.set('page', String(page))
  searchParams.set('page_size', String(pageSize))
  if (params?.type && params.type !== 'all') searchParams.set('type', params.type)
  if (params?.is_read !== undefined) searchParams.set('is_read', params.is_read ? 'true' : 'false')
  if (params?.search) searchParams.set('search', params.search)
  if (params?.sort_by) searchParams.set('sort_by', params.sort_by)
  return http.get<PaginatedResponse<Notification>>(`/notifications/?${searchParams.toString()}`)
}

/**
 * Get ALL notifications for a user (auto-paginate).
 */
export async function getAllNotificationsByUser(userId: number): Promise<Notification[]> {
  const all: Notification[] = []
  let page = 1
  while (true) {
    const res = await getNotificationsByUser(userId, page, 100)
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}

/**
 * Get a single notification by ID.
 */
export async function getNotificationById(notificationId: number): Promise<Notification> {
  return http.get<Notification>(`/notifications/${notificationId}/`)
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(notificationId: number): Promise<Notification> {
  return http.put<Notification>(
    `/notifications/mark_as_read/?notification_id=${notificationId}`
  )
}

/**
 * Mark ALL notifications as read for a user.
 */
export async function markAllNotificationsAsRead(
  userId: number
): Promise<{ message: string }> {
  return http.put<{ message: string }>(
    `/notifications/mark_as_read/?user_id=${userId}`
  )
}

export async function getInstructorAnnouncements(
  announcementType: 'educational' | 'promotional' | 'all' = 'all'
): Promise<{ results: InstructorAnnouncement[] }> {
  const params = new URLSearchParams()
  if (announcementType !== 'all') params.set('announcement_type', announcementType)
  const query = params.toString()
  return http.get<{ results: InstructorAnnouncement[] }>(
    query ? `/instructor/announcements/?${query}` : '/instructor/announcements/'
  )
}

export async function createInstructorAnnouncement(data: {
  type: 'educational' | 'promotional'
  title: string
  content: string
  target_course: string
}): Promise<InstructorAnnouncement> {
  return http.post<InstructorAnnouncement>('/instructor/announcements/', {
    announcement_type: data.type,
    title: data.title,
    message: data.content,
    target_course: data.target_course,
  })
}

export async function revokeInstructorAnnouncement(
  notificationCode: string
): Promise<{ message: string; notification_code: string; affected_users: number }> {
  return http.delete<{ message: string; notification_code: string; affected_users: number }>(
    `/instructor/announcements/?notification_code=${encodeURIComponent(notificationCode)}`
  )
}

export async function updateInstructorAnnouncement(
  notificationCode: string,
  data: {
    title: string
    content: string
  }
): Promise<Notification> {
  return http.patch<Notification>(
    `/instructor/announcements/?notification_code=${encodeURIComponent(notificationCode)}`,
    {
      title: data.title,
      message: data.content,
    }
  )
}

// ── Helpers ────────────────────────────────────────────────────────

/** Icon mapping for notification types (returns lucide icon name). */
export function getNotificationIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    system: 'Bell',
    course: 'BookOpen',
    payment: 'CreditCard',
    promotion: 'Gift',
    other: 'Info',
  }
  return map[type] || 'Bell'
}

/** Color class for notification type. */
export function getNotificationColor(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    system: 'text-blue-500',
    course: 'text-indigo-500',
    payment: 'text-green-500',
    promotion: 'text-orange-500',
    other: 'text-gray-500',
  }
  return map[type] || 'text-gray-500'
}

/** Format relative time (e.g. "2 hours ago"). */
export function formatRelativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ngày trước`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} tháng trước`

  return `${Math.floor(months / 12)} năm trước`
}
