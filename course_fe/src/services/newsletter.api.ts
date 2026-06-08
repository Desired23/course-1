import { http } from './http'

export interface Subscriber {
  subscriber_id: number
  email: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NewsletterCampaign {
  campaign_id: number
  subject: string
  content: string
  audience: 'subscribers' | 'all_users'
  recipient_count: number
  sent_by_name: string | null
  created_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

export async function subscribeNewsletter(email: string): Promise<{ message: string }> {
  return http.post<{ message: string }>('/newsletter/subscribe/', { email })
}

export async function getSubscribers(params?: {
  page?: number
  page_size?: number
  search?: string
}): Promise<PaginatedResponse<Subscriber>> {
  const searchParams = new URLSearchParams()
  if (params?.page !== undefined) searchParams.set('page', String(params.page))
  if (params?.page_size !== undefined) searchParams.set('page_size', String(params.page_size))
  if (params?.search) searchParams.set('search', params.search)
  const qs = searchParams.toString()
  return http.get<PaginatedResponse<Subscriber>>(`/newsletter/subscribers/${qs ? `?${qs}` : ''}`)
}

export async function sendNewsletter(data: {
  subject: string
  content: string
  audience: 'subscribers' | 'all_users'
}): Promise<{ message: string; recipient_count: number }> {
  return http.post<{ message: string; recipient_count: number }>('/newsletter/send/', data)
}

export async function getCampaigns(params?: {
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<NewsletterCampaign>> {
  const searchParams = new URLSearchParams()
  if (params?.page !== undefined) searchParams.set('page', String(params.page))
  if (params?.page_size !== undefined) searchParams.set('page_size', String(params.page_size))
  const qs = searchParams.toString()
  return http.get<PaginatedResponse<NewsletterCampaign>>(`/newsletter/campaigns/${qs ? `?${qs}` : ''}`)
}
