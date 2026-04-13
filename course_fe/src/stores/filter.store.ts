




import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type SortOption =
  | 'newest'
  | 'popular'
  | 'rating'
  | 'price-low'
  | 'price-high'
  | 'title-asc'
  | 'title-desc'

export type PriceRange = 'all' | 'free' | 'paid' | 'under-500k' | '500k-1m' | 'over-1m'

interface FilterState {

  searchQuery: string
  setSearchQuery: (query: string) => void
  clearSearch: () => void


  selectedCategories: string[]
  toggleCategory: (category: string) => void
  clearCategories: () => void


  selectedLevels: string[]
  toggleLevel: (level: string) => void
  clearLevels: () => void


  priceRange: PriceRange
  setPriceRange: (range: PriceRange) => void


  minRating: number
  setMinRating: (rating: number) => void


  minDuration: number
  maxDuration: number
  setDurationRange: (min: number, max: number) => void


  selectedLanguages: string[]
  toggleLanguage: (language: string) => void
  clearLanguages: () => void


  features: {
    subtitles: boolean
    quizzes: boolean
    assignments: boolean
    certificate: boolean
    downloadable: boolean
  }
  toggleFeature: (feature: keyof FilterState['features']) => void


  sortBy: SortOption
  setSortBy: (sort: SortOption) => void


  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void


  page: number
  pageSize: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void


  clearAllFilters: () => void
  hasActiveFilters: () => boolean
}

const DEFAULT_STATE = {
  searchQuery: '',
  selectedCategories: [],
  selectedLevels: [],
  priceRange: 'all' as PriceRange,
  minRating: 0,
  minDuration: 0,
  maxDuration: 999,
  selectedLanguages: [],
  features: {
    subtitles: false,
    quizzes: false,
    assignments: false,
    certificate: false,
    downloadable: false
  },
  sortBy: 'newest' as SortOption,
  viewMode: 'grid' as const,
  page: 1,
  pageSize: 12
}

export const useFilterStore = create<FilterState>()(
  devtools(
    (set, get) => ({
      ...DEFAULT_STATE,


      setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),

      clearSearch: () => set({ searchQuery: '' }),


      toggleCategory: (category) => {
        set((state) => {
          const categories = state.selectedCategories.includes(category)
            ? state.selectedCategories.filter((c) => c !== category)
            : [...state.selectedCategories, category]

          return { selectedCategories: categories, page: 1 }
        })
      },

      clearCategories: () => set({ selectedCategories: [] }),


      toggleLevel: (level) => {
        set((state) => {
          const levels = state.selectedLevels.includes(level)
            ? state.selectedLevels.filter((l) => l !== level)
            : [...state.selectedLevels, level]

          return { selectedLevels: levels, page: 1 }
        })
      },

      clearLevels: () => set({ selectedLevels: [] }),


      setPriceRange: (range) => set({ priceRange: range, page: 1 }),


      setMinRating: (rating) => set({ minRating: rating, page: 1 }),


      setDurationRange: (min, max) => set({
        minDuration: min,
        maxDuration: max,
        page: 1
      }),


      toggleLanguage: (language) => {
        set((state) => {
          const languages = state.selectedLanguages.includes(language)
            ? state.selectedLanguages.filter((l) => l !== language)
            : [...state.selectedLanguages, language]

          return { selectedLanguages: languages, page: 1 }
        })
      },

      clearLanguages: () => set({ selectedLanguages: [] }),


      toggleFeature: (feature) => {
        set((state) => ({
          features: {
            ...state.features,
            [feature]: !state.features[feature]
          },
          page: 1
        }))
      },


      setSortBy: (sort) => set({ sortBy: sort, page: 1 }),


      setViewMode: (mode) => set({ viewMode: mode }),


      setPage: (page) => set({ page }),

      setPageSize: (size) => set({ pageSize: size, page: 1 }),


      clearAllFilters: () => {
        set({
          ...DEFAULT_STATE,
          searchQuery: get().searchQuery
        })
      },


      hasActiveFilters: () => {
        const state = get()
        return (
          state.selectedCategories.length > 0 ||
          state.selectedLevels.length > 0 ||
          state.priceRange !== 'all' ||
          state.minRating > 0 ||
          state.minDuration > 0 ||
          state.maxDuration < 999 ||
          state.selectedLanguages.length > 0 ||
          Object.values(state.features).some((v) => v === true)
        )
      }
    }),
    { name: 'Filter Store' }
  )
)


export const selectSearchQuery = (state: FilterState) => state.searchQuery
export const selectFilters = (state: FilterState) => ({
  categories: state.selectedCategories,
  levels: state.selectedLevels,
  priceRange: state.priceRange,
  minRating: state.minRating,
  duration: { min: state.minDuration, max: state.maxDuration },
  languages: state.selectedLanguages,
  features: state.features
})
export const selectSortAndView = (state: FilterState) => ({
  sortBy: state.sortBy,
  viewMode: state.viewMode
})
export const selectPagination = (state: FilterState) => ({
  page: state.page,
  pageSize: state.pageSize
})
