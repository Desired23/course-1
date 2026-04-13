import { useState, useEffect, useRef } from "react"
import { Search, X, Clock, TrendingUp, BookOpen, User, FileText } from "lucide-react"
import { useRouter } from "./Router"
import { getCoursesWithInstructors } from "../data/db-extended"
import { Input } from "./ui/input"
import { useTranslation } from "react-i18next"
import { useAuth } from "../contexts/AuthContext"
import { getSearchSuggestions, trackSearch } from "../services/search.api"
import { getInstructors, type Instructor } from "../services/instructor.api"
import { getPublishedBlogPosts, type BlogPost } from "../services/blog-posts.api"

const RECENT_SEARCHES_STORAGE_KEY = "global-search-recent-searches"
const MAX_RECENT_SEARCHES = 5

type CourseSuggestion = ReturnType<typeof getCoursesWithInstructors>[number]

type InstructorSuggestion = {
  id: number | null
  name: string
  avatar: string | null
  courseCount: number
}

type ArticleSuggestion = {
  id: number
  title: string
  summary: string | null
  slug: string
}

function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase()
}

function normalizeSearchText(value: string | null | undefined): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
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
  const [courseResults, setCourseResults] = useState<CourseSuggestion[]>([])
  const [instructorResults, setInstructorResults] = useState<InstructorSuggestion[]>([])
  const [articleResults, setArticleResults] = useState<ArticleSuggestion[]>([])
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([])
  const [allArticles, setAllArticles] = useState<BlogPost[]>([])
  const [metaLoaded, setMetaLoaded] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  const { navigate } = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const localizedPopularSearches = (t('hero.popular_searches', { returnObjects: true }) as string[]) || []

  useEffect(() => {
    if (!isOpen || metaLoaded) return

    let cancelled = false
    const loadMeta = async () => {
      const [instructorsResult, articlesResult] = await Promise.allSettled([
        getInstructors(1, 100),
        getPublishedBlogPosts({ page: 1, page_size: 100 }),
      ])

      if (cancelled) return

      if (instructorsResult.status === 'fulfilled') {
        setAllInstructors(instructorsResult.value.results)
      } else {
        setAllInstructors([])
      }

      if (articlesResult.status === 'fulfilled') {
        setAllArticles(articlesResult.value.results)
      } else {
        setAllArticles([])
      }


      setMetaLoaded(true)
    }

    void loadMeta()
    return () => {
      cancelled = true
    }
  }, [isOpen, metaLoaded])


  useEffect(() => {
    if (query.length > 2) {
      const normalizedQuery = normalizeSearchText(query)
      const courses = getCoursesWithInstructors()
      const filteredCourses = courses.filter(course =>
        normalizeSearchText(course.title).includes(normalizedQuery) ||
        normalizeSearchText(course.description).includes(normalizedQuery) ||
        normalizeSearchText(course.instructor_name).includes(normalizedQuery) ||
        normalizeSearchText(course.category_name).includes(normalizedQuery)
      ).slice(0, 5)

      const filteredInstructors = allInstructors
        .filter((instructor) => {
          return (
            normalizeSearchText(instructor.user.full_name).includes(normalizedQuery) ||
            normalizeSearchText(instructor.specialization).includes(normalizedQuery) ||
            normalizeSearchText(instructor.bio).includes(normalizedQuery)
          )
        })
        .slice(0, 4)
        .map((instructor) => ({
          id: instructor.id,
          name: instructor.user.full_name,
          avatar: instructor.user.avatar,
          courseCount: instructor.total_courses,
        }))

      const filteredArticles = allArticles
        .filter((article) => {
          return (
            normalizeSearchText(article.title).includes(normalizedQuery) ||
            normalizeSearchText(article.summary).includes(normalizedQuery) ||
            normalizeSearchText(article.content).includes(normalizedQuery)
          )
        })
        .slice(0, 4)
        .map((article) => ({
          id: article.id,
          title: article.title,
          summary: article.summary,
          slug: article.slug,
        }))

      setCourseResults(filteredCourses)
      setInstructorResults(filteredInstructors)
      setArticleResults(filteredArticles)
    } else {
      setCourseResults([])
      setInstructorResults([])
      setArticleResults([])
    }
  }, [query, allInstructors, allArticles])


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])


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

  const handleInstructorClick = async (instructorId: number | null, instructorName: string) => {
    const cleanedQuery = cleanSearchQuery(query)
    if (cleanedQuery) {
      try {
        await trackSearch(cleanedQuery, 'global_search')
      } catch {

      }
      if (isAuthenticated) {
        await loadSuggestions()
      } else {
        setRecentSearches(pushGuestRecentSearch(cleanedQuery))
      }
    }

    if (typeof instructorId === 'number') {
      navigate(`/instructor/${instructorId}/profile`)
    } else {
      navigate('/search', { query: instructorName }, { query: instructorName })
    }

    setIsOpen(false)
    setQuery("")
  }

  const handleArticleClick = async (slug: string, title: string) => {
    const cleanedQuery = cleanSearchQuery(query)
    if (cleanedQuery) {
      try {
        await trackSearch(cleanedQuery, 'global_search')
      } catch {

      }
      if (isAuthenticated) {
        await loadSuggestions()
      } else {
        setRecentSearches(pushGuestRecentSearch(cleanedQuery))
      }
    }

    if (slug) {
      navigate(`/blog/${slug}`)
    } else {
      navigate('/search', { query: title }, { query: title })
    }

    setIsOpen(false)
    setQuery("")
  }

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl">

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


      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-[600px] overflow-y-auto z-50">

          {query.length > 2 && (courseResults.length > 0 || instructorResults.length > 0 || articleResults.length > 0) && (
            <div className="p-4">
              {courseResults.length > 0 && (
                <>
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {t("global_search.courses")}
              </div>
              <div className="space-y-2">
                {courseResults.map((course) => (
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
                </>
              )}

              {instructorResults.length > 0 && (
                <>
                  <div className={`text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2 ${courseResults.length > 0 ? 'mt-4' : ''}`}>
                    <User className="w-4 h-4" />
                    {t("global_search.instructors", "Giảng viên")}
                  </div>
                  <div className="space-y-2">
                    {instructorResults.map((instructor) => (
                      <button
                        key={`${instructor.id ?? 'name'}-${instructor.name}`}
                        onClick={() => handleInstructorClick(instructor.id, instructor.name)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                      >
                        {instructor.avatar ? (
                          <img src={instructor.avatar} alt={instructor.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{instructor.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {instructor.courseCount} {t("global_search.courses").toLowerCase()}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {articleResults.length > 0 && (
                <>
                  <div className={`text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2 ${(courseResults.length > 0 || instructorResults.length > 0) ? 'mt-4' : ''}`}>
                    <FileText className="w-4 h-4" />
                    {t("global_search.articles", "Bài viết")}
                  </div>
                  <div className="space-y-2">
                    {articleResults.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => handleArticleClick(article.slug, article.title)}
                        className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                      >
                        <div className="font-medium text-sm truncate">{article.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {article.summary || t("global_search.no_summary", "Chưa có mô tả")}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={() => handleSearch(query)}
                className="w-full mt-3 py-2 text-sm text-primary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t("global_search.see_all_results", { query })}
              </button>
            </div>
          )}


          {query.length > 2 && courseResults.length === 0 && instructorResults.length === 0 && articleResults.length === 0 && (
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


          {query.length <= 2 && (
            <div className="p-4 space-y-4">

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
