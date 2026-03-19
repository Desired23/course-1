export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

export interface ListQueryParams {
  page?: number
  page_size?: number
  search?: string
  sort_by?: string
}

export function buildListQuery(
  params?: ListQueryParams & Record<string, string | number | undefined>
): Record<string, string | number> {
  if (!params) return {}
  const query: Record<string, string | number> = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (typeof value === 'string' && value.trim() === '') return
    query[key] = typeof value === 'string' ? value.trim() : value
  })
  return query
}
