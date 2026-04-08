import { http } from './http'

export interface SearchSuggestionsResponse {
  recent_searches: string[]
  popular_searches: string[]
}

export type SearchSource = 'global_search'

export async function getSearchSuggestions(): Promise<SearchSuggestionsResponse> {
  return http.get<SearchSuggestionsResponse>('/search/suggestions/')
}

export async function trackSearch(query: string, source: SearchSource): Promise<void> {
  await http.post('/search/track/', { query, source })
}

