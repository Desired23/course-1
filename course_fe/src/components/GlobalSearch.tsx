import { useState, useEffect, useRef } from "react"
import { Search, X, Clock, TrendingUp, BookOpen } from "lucide-react"
import { useRouter } from "./Router"
import { getCoursesWithInstructors } from "../data/db-extended"
import { Input } from "./ui/input"
import { useTranslation } from "react-i18next"
import { useAuth } from "../contexts/AuthContext"
import { getSearchSuggestions, trackSearch } from "../services/search.api"

const RECENT_SEARCHES_STORAGE_KEY = "global-search-recent-searches"
const MAX_RECENT_SEARCHES = 5

function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase()
}

function cleanSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ")
}

function loadGuestRecentSearches(): string[] {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) || "[]")
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []
  } catch {
    return []
  }
}

function saveGuestRecentSearches(searches: string[]): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(searches))
}

function pushGuestRecentSearch(query: string): string[] {
  const cleaned = cleanSearchQuery(query)
  const normalized = normalizeSearchQuery(cleaned)
  if (normalized.length < 2) return loadGuestRecentSearches()

  const next = [cleaned, ...loadGuestRecentSearches().filter((item) => normalizeSearchQuery(item) !== normalized)]
    .slice(0, MAX_RECENT_SEARCHES)
  saveGuestRecentSearches(next)
  return next
}

export function GlobalSearch() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  const { navigate } = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const localizedPopularSearches = (t('hero.popular_searches', { returnObjects: true }) as string[]) || []

  // Handle search
  useEffect(() => {
    if (query.length > 2) {
      const courses = getCoursesWithInstructors()
      const filtered = courses.filter(course =>
        course.title.toLowerCase().includes(query.toLowerCase()) ||
        course.description?.toLowerCase().includes(query.toLowerCase()) ||
        course.instructor_name.toLowerCase().includes(query.toLowerCase()) ||
        course.category_name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
      setResults(filtered)
    } else {
      setResults([])
    }
  }, [query])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  const loadSuggestions = async () => {
    try {
      const data = await getSearchSuggestions()
      setPopularSearches(data.popular_searches.length > 0 ? data.popular_searches : localizedPopularSearches)
      setRecentSearches(isAuthenticated ? data.recent_searches : loadGuestRecentSearches())
    } catch {
      setPopularSearches(localizedPopularSearches)
      setRecentSearches(isAuthenticated ? [] : loadGuestRecentSearches())
    }
  }

  useEffect(() => {
    if (!isOpen || query.length > 2) return
    loadSuggestions()
  }, [isOpen, query, isAuthenticated, t])

  const handleSearch = async (searchQuery: string) => {
    const cleanedQuery = cleanSearchQuery(searchQuery)
    if (!cleanedQuery) return

    try {
      await trackSearch(cleanedQuery, 'global_search')
    } catch {
      // Best effort only: search navigation should still work if tracking fails.
    }

    if (isAuthenticated) {
      await loadSuggestions()
    } else {
      setRecentSearches(pushGuestRecentSearch(cleanedQuery))
    }

    navigate('/search', { query: cleanedQuery }, { query: cleanedQuery })
    setIsOpen(false)
    setQuery("")
  }

  const handleCourseClick = async (courseId: number) => {
    const cleanedQuery = cleanSearchQuery(query)
    if (cleanedQuery) {
      try {
        await trackSearch(cleanedQuery, 'global_search')
      } catch {
        // Best effort only: navigation should still work.
      }
      if (isAuthenticated) {
        await loadSuggestions()
      } else {
        setRecentSearches(pushGuestRecentSearch(cleanedQuery))
      }
    }

    navigate(`/course/${courseId}`)
    setIsOpen(false)
    setQuery("")
  }

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder={t("global_search.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch(query)
            }
          }}
          className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-full focus:ring-2 focus:ring-primary"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-[600px] overflow-y-auto z-50">
          {/* Search Results */}
          {query.length > 2 && results.length > 0 && (
            <div className="p-4">
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {t("global_search.courses")}
              </div>
              <div className="space-y-2">
                {results.map((course) => (
                  <button
                    key={course.course_id}
                    onClick={() => handleCourseClick(course.course_id)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                  >
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-16 h-10 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{course.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                        <span>{course.instructor_name}</span>
                        <span>•</span>
                        <span>{course.category_name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          ⭐ {course.rating}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-primary flex-shrink-0">
                      ₫{(course.discount_price || course.price).toLocaleString('vi-VN')}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleSearch(query)}
                className="w-full mt-3 py-2 text-sm text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t("global_search.see_all_results", { query })}
              </button>
            </div>
          )}

          {/* No Results */}
          {query.length > 2 && results.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("global_search.no_results", { query })}</p>
              <button
                onClick={() => handleSearch(query)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                {t("global_search.search_anyway")}
              </button>
            </div>
          )}

          {/* Popular & Recent Searches */}
          {query.length <= 2 && (
            <div className="p-4 space-y-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t("global_search.recent_searches")}
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(search)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left text-sm"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div>
                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {t("global_search.popular_searches")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(search)}
                      className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
