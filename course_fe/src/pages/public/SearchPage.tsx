import { useState, useEffect, useCallback } from 'react'
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Badge } from "../../components/ui/badge"
import { Card, CardContent } from "../../components/ui/card"
import { Search, Filter, Star, Clock, Users, Grid, List, Loader2 } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { CourseFilterSidebar } from "../../components/CourseFilterSidebar"
import { CourseCard } from "../../components/CourseCard"
import { useTranslation } from 'react-i18next'
import { getAllCourses, type CourseListItem, parseDecimal, getEffectivePrice, formatPrice, getLevelLabel, formatDuration } from '../../services/course.api'
import { getActiveCategories, type Category } from '../../services/category.api'
import { useOwnedCourses } from '../../hooks/useOwnedCourses'

const levels = ["Beginner", "Intermediate", "Expert", "All Levels"]
const languages = ["English", "Spanish", "French", "German", "Portuguese", "Japanese"]
const durations = ["0-1 Hour", "1-3 Hours", "3-6 Hours", "6-17 Hours", "17+ Hours"]

export function SearchPage() {
  const { t } = useTranslation()
  const { params } = useRouter()
  const { isOwned, getProgress } = useOwnedCourses()
  const searchQuery = params?.query || ""
  
  // Data from API
  const [allCourses, setAllCourses] = useState<CourseListItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [coursesArr, catsRes] = await Promise.all([
          getAllCourses(),
          getActiveCategories({ page: 1, page_size: 200 }),
        ])
        if (cancelled) return
        setAllCourses(coursesArr.filter(c => c.status === 'published'))
        setCategories(catsRes.results)
      } catch {
        // fail silently
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const [filters, setFilters] = useState({
    query: searchQuery,
    category: "all",
    level: "all",
    language: "all",
    duration: "all",
    priceRange: [0, 200],
    rating: 0,
    features: [] as string[]
  })
  
  // Convert to CourseFilterSidebar format
  const filterState = {
    levels: filters.level !== 'all' ? [filters.level] : [],
    ratings: filters.rating > 0 ? [filters.rating] : [],
    durations: filters.duration !== 'all' ? [filters.duration] : [],
    languages: filters.language !== 'all' ? [filters.language] : [],
    features: filters.features,
    priceRange: [filters.priceRange[0], filters.priceRange[1]] as [number, number]
  }
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState("relevance")
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter and search courses from API data
  const courses = allCourses.filter(course => {
    const q = filters.query.toLowerCase()
    const matchesQuery = !q || 
      course.title.toLowerCase().includes(q) || 
      (course.instructor_name || '').toLowerCase().includes(q) ||
      (course.description || '').toLowerCase().includes(q)
    
    const matchesCategory = filters.category === 'all' || 
      (course.category_name || '').toLowerCase() === filters.category.toLowerCase()
    
    const matchesLevel = filters.level === 'all' || getLevelLabel(course.level) === filters.level
    
    const courseRating = parseDecimal(course.rating)
    const matchesRating = filters.rating === 0 || courseRating >= filters.rating
    
    return matchesQuery && matchesCategory && matchesLevel && matchesRating
  })

  const handleFilterChange = (key: string, value: any) => {
    switch(key) {
      case 'levels':
        setFilters(prev => ({ ...prev, level: value.length > 0 ? value[value.length - 1] : 'all' }))
        break
      case 'ratings':
        setFilters(prev => ({ ...prev, rating: value.length > 0 ? value[value.length - 1] : 0 }))
        break
      case 'durations':
        setFilters(prev => ({ ...prev, duration: value.length > 0 ? value[value.length - 1] : 'all' }))
        break
      case 'languages':
        setFilters(prev => ({ ...prev, language: value.length > 0 ? value[value.length - 1] : 'all' }))
        break
      case 'features':
        setFilters(prev => ({ ...prev, features: value }))
        break
      case 'priceRange':
        setFilters(prev => ({ ...prev, priceRange: value }))
        break
      default:
        setFilters(prev => ({ ...prev, [key]: value }))
    }
  }

  const handleFeatureToggle = (feature: string) => {
    setFilters(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }))
  }

  const clearFilters = () => {
    setFilters({
      query: "",
      category: "all",
      level: "all",
      language: "all",
      duration: "all",
      priceRange: [0, 200],
      rating: 0,
      features: []
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search_page.search_courses')}
                value={filters.query}
                onChange={(e) => handleFilterChange("query", e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Quick Filters */}
            <div className="flex gap-2">
              <Select value={filters.category} onValueChange={(value) => handleFilterChange("category", value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('search_page.all_categories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('search_page.all_categories')}</SelectItem>
                  {categories.filter(c => !c.parent_category).map(category => (
                    <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                {t('search_page.filters')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <div className={`w-80 space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <CourseFilterSidebar
              filters={filterState}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              durations={durations}
              levels={levels}
              languages={languages}
              currency="USD"
              priceConfig={{
                min: 0,
                max: 200,
                placeholder: { min: '0', max: '200' }
              }}
              showFilters={true}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {courses.length.toLocaleString()} {t('search_page.results_for')} "{filters.query || t('common.all')}"
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Sort By */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">{t('search_page.sort_relevant')}</SelectItem>
                    <SelectItem value="popular">{t('search_page.sort_popular')}</SelectItem>
                    <SelectItem value="rating">{t('search_page.sort_rating')}</SelectItem>
                    <SelectItem value="newest">{t('search_page.sort_newest')}</SelectItem>
                    <SelectItem value="price-low">{t('search_page.sort_price_low')}</SelectItem>
                    <SelectItem value="price-high">{t('search_page.sort_price_high')}</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex rounded-md border">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-r-none"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-l-none"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {(filters.category !== "all" || filters.level !== "all" || filters.rating > 0 || filters.features.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {filters.category !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {filters.category}
                    <button onClick={() => handleFilterChange("category", "all")}>×</button>
                  </Badge>
                )}
                {filters.level !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {filters.level}
                    <button onClick={() => handleFilterChange("level", "all")}>×</button>
                  </Badge>
                )}
                {filters.rating > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    {filters.rating}+ {t('search_page.stars')}
                    <button onClick={() => handleFilterChange("rating", 0)}>×</button>
                  </Badge>
                )}
                {filters.features.map(feature => (
                  <Badge key={feature} variant="secondary" className="gap-1">
                    {feature}
                    <button onClick={() => handleFeatureToggle(feature)}>×</button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Results */}
            <div className={viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
            }>
              {loading ? (
                <div className="col-span-full flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : courses.map((course) => {
                const ep = getEffectivePrice(course)
                const rp = parseDecimal(course.price)
                return (
                <CourseCard
                  key={course.id}
                  courseId={`course-${course.id}`}
                  title={course.title}
                  instructor={course.instructor_name || 'Instructor'}
                  image={course.thumbnail || ''}
                  rating={parseDecimal(course.rating)}
                  reviews={course.total_reviews}
                  price={formatPrice(ep)}
                  originalPrice={ep < rp ? formatPrice(rp) : undefined}
                  duration={formatDuration(course.duration)}
                  students={course.total_students >= 1000 ? `${Math.floor(course.total_students / 1000)}K+` : `${course.total_students}`}
                  level={getLevelLabel(course.level)}
                  variant={viewMode === "grid" ? "vertical" : "horizontal"}
                  bestseller={course.total_students > 100000}
                  currency="VND"
                  discountEndDate={ep < rp ? course.discount_end_date : undefined}
                  isOwned={isOwned(course.id)}
                  progress={getProgress(course.id)}
                />
              )})}
            </div>

            {/* Load More */}
            <div className="text-center">
              <Button variant="outline">
                {t('search_page.load_more')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}