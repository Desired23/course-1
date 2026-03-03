/**
 * Filter Store - Search & Filter State
 * Handles: Course filters, search, sorting
 */

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
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  clearSearch: () => void
  
  // Categories
  selectedCategories: string[]
  toggleCategory: (category: string) => void
  clearCategories: () => void
  
  // Levels
  selectedLevels: string[]
  toggleLevel: (level: string) => void
  clearLevels: () => void
  
  // Price
  priceRange: PriceRange
  setPriceRange: (range: PriceRange) => void
  
  // Rating
  minRating: number
  setMinRating: (rating: number) => void
  
  // Duration
  minDuration: number // in hours
  maxDuration: number
  setDurationRange: (min: number, max: number) => void
  
  // Language
  selectedLanguages: string[]
  toggleLanguage: (language: string) => void
  clearLanguages: () => void
  
  // Features
  features: {
    subtitles: boolean
    quizzes: boolean
    assignments: boolean
    certificate: boolean
    downloadable: boolean
  }
  toggleFeature: (feature: keyof FilterState['features']) => void
  
  // Sort
  sortBy: SortOption
  setSortBy: (sort: SortOption) => void
  
  // View
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  
  // Pagination
  page: number
  pageSize: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  
  // Actions
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
      
      // Search
      setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),
      
      clearSearch: () => set({ searchQuery: '' }),
      
      // Categories
      toggleCategory: (category) => {
        set((state) => {
          const categories = state.selectedCategories.includes(category)
            ? state.selectedCategories.filter((c) => c !== category)
            : [...state.selectedCategories, category]
          
          return { selectedCategories: categories, page: 1 }
        })
      },
      
      clearCategories: () => set({ selectedCategories: [] }),
      
      // Levels
      toggleLevel: (level) => {
        set((state) => {
          const levels = state.selectedLevels.includes(level)
            ? state.selectedLevels.filter((l) => l !== level)
            : [...state.selectedLevels, level]
          
          return { selectedLevels: levels, page: 1 }
        })
      },
      
      clearLevels: () => set({ selectedLevels: [] }),
      
      // Price
      setPriceRange: (range) => set({ priceRange: range, page: 1 }),
      
      // Rating
      setMinRating: (rating) => set({ minRating: rating, page: 1 }),
      
      // Duration
      setDurationRange: (min, max) => set({ 
        minDuration: min, 
        maxDuration: max,
        page: 1 
      }),
      
      // Language
      toggleLanguage: (language) => {
        set((state) => {
          const languages = state.selectedLanguages.includes(language)
            ? state.selectedLanguages.filter((l) => l !== language)
            : [...state.selectedLanguages, language]
          
          return { selectedLanguages: languages, page: 1 }
        })
      },
      
      clearLanguages: () => set({ selectedLanguages: [] }),
      
      // Features
      toggleFeature: (feature) => {
        set((state) => ({
          features: {
            ...state.features,
            [feature]: !state.features[feature]
          },
          page: 1
        }))
      },
      
      // Sort
      setSortBy: (sort) => set({ sortBy: sort, page: 1 }),
      
      // View
      setViewMode: (mode) => set({ viewMode: mode }),
      
      // Pagination
      setPage: (page) => set({ page }),
      
      setPageSize: (size) => set({ pageSize: size, page: 1 }),
      
      // Clear all filters
      clearAllFilters: () => {
        set({
          ...DEFAULT_STATE,
          searchQuery: get().searchQuery // Keep search query
        })
      },
      
      // Check if any filters are active
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

// Selectors
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
