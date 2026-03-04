import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Filter, Grid3x3, List, Star, X, Loader2 } from 'lucide-react'
import { CourseCard } from '../../components/CourseCard'
import { CourseFilterSidebar, CategoryOption } from '../../components/CourseFilterSidebar'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { getCourses, type CourseListItem, type CourseListParams, parseDecimal, getEffectivePrice, formatPrice, getLevelLabel, formatDuration } from '../../services/course.api'
import type { PaginatedResponse } from '../../services/category.api'
import { getActiveCategories, buildCategoryTree, type CategoryTreeNode } from '../../services/category.api'
import { getQueryParams } from '../../utils/navigation'
import { useTranslation } from 'react-i18next'
import { useRouter } from '../../components/Router'
import { useOwnedCourses } from '../../hooks/useOwnedCourses'

// Price range constants
const PRICE_MIN = 0
const PRICE_MAX = 5000000

// Custom Tag Component
function Tag({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1">
      {children}
      {onClose && (
        <button onClick={onClose} className="hover:bg-muted rounded-full p-0.5">
          <X size={14} />
        </button>
      )}
    </Badge>
  )
}

// Custom Pagination
function Pagination({ 
  current, 
  total, 
  pageSize, 
  onChange 
}: { 
  current: number
  total: number
  pageSize: number
  onChange: (page: number) => void 
}) {
  const totalPages = Math.ceil(total / pageSize)
  const pages = []
  
  // Calculate page range to show
  let startPage = Math.max(1, current - 2)
  let endPage = Math.min(totalPages, current + 2)
  
  // Adjust if at start or end
  if (current <= 3) {
    endPage = Math.min(5, totalPages)
  }
  if (current >= totalPages - 2) {
    startPage = Math.max(1, totalPages - 4)
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }
  
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
      >
        Previous
      </Button>
      
      {startPage > 1 && (
        <>
          <Button
            variant={current === 1 ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(1)}
          >
            1
          </Button>
          {startPage > 2 && <span className="px-2">...</span>}
        </>
      )}
      
      {pages.map(page => (
        <Button
          key={page}
          variant={current === page ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(page)}
        >
          {page}
        </Button>
      ))}
      
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2">...</span>}
          <Button
            variant={current === totalPages ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(totalPages)}
          >
            {totalPages}
          </Button>
        </>
      )}
      
      <Button
        variant="outline"
        size="sm"
        disabled={current === totalPages}
        onClick={() => onChange(current + 1)}
      >
        Next
      </Button>
    </div>
  )
}

export function CoursesPage() {
  const { t } = useTranslation()
  const { currentRoute } = useRouter()
  const { isOwned, getProgress } = useOwnedCourses()
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [gridCols, setGridCols] = useState(3)
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([PRICE_MIN, PRICE_MAX])
  const [selectedRatings, setSelectedRatings] = useState<number[]>([])
  const [selectedDurations, setSelectedDurations] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  
  // Sort and pagination
  const [sortBy, setSortBy] = useState('popularity')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  
  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  // Ref for scroll target
  const resultsRef = useRef<HTMLDivElement>(null)

  // Data state (loaded from API)
  const [coursesPage, setCoursesPage] = useState<PaginatedResponse<CourseListItem> | null>(null)
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)

  // Load categories once (with retry on failure)
  useEffect(() => {
    let cancelled = false
    let retryCount = 0
    const maxRetries = 3

    function loadCategories() {
      getActiveCategories({ page: 1, page_size: 200 })
        .then(res => {
          if (!cancelled) {
            setCategoryTree(buildCategoryTree(res.results))
            setCategoriesLoaded(true)
          }
        })
        .catch(() => {
          if (!cancelled && retryCount < maxRetries) {
            retryCount++
            setTimeout(loadCategories, retryCount * 1500)
          } else if (!cancelled) {
            setCategoriesLoaded(true)
          }
        })
    }

    loadCategories()
    return () => { cancelled = true }
  }, [])

  // Map FE sortBy to BE ordering param
  const sortToOrdering = (sort: string): string | undefined => {
    switch (sort) {
      case 'popularity': return '-total_students'
      case 'rating': return '-rating'
      case 'newest': return '-created_at'
      case 'price_low': return 'price'
      case 'price_high': return '-price'
      default: return undefined
    }
  }

  // Map FE level label to BE level value
  const levelLabelToValue = (label: string): string => {
    const map: Record<string, string> = {
      'All Levels': 'all_levels',
      'Beginner': 'beginner',
      'Intermediate': 'intermediate',
      'Advanced': 'advanced',
    }
    return map[label] || label.toLowerCase()
  }

  // Stable key of params actually sent to the API.
  // The fetch useEffect only fires when this key changes, so client-only
  // filter changes (subcategory, level, duration, language, features) do NOT
  // trigger a new API call — they're handled by the filteredCourses useMemo.
  // Subcategory is always a subset of category data, so no API call needed.
  const apiParamsKey = useMemo(() => {
    const p: Record<string, unknown> = {
      page: currentPage,
      page_size: itemsPerPage,
      status: 'published',
    }
    if (selectedCategory) p.category_id = selectedCategory
    // subcategory & level are NOT sent to API — always filtered client-side
    // because they only narrow the category/all data already fetched
    if (searchTerm) p.search = searchTerm
    const ordering = sortToOrdering(sortBy)
    if (ordering) p.ordering = ordering
    if (selectedRatings.length > 0) p.rating_min = Math.min(...selectedRatings)
    if (priceRange[0] > PRICE_MIN) p.price_min = priceRange[0]
    if (priceRange[1] < PRICE_MAX) p.price_max = priceRange[1]
    return JSON.stringify(p)
  }, [
    currentPage, itemsPerPage, selectedCategory,
    searchTerm, sortBy,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    selectedRatings.length > 0 ? Math.min(...selectedRatings) : null,
    priceRange,
  ])

  // Fetch courses from API — only when apiParamsKey changes (with retry)
  useEffect(() => {
    let cancelled = false
    let retryCount = 0
    const maxRetries = 2

    async function fetchCourses() {
      try {
        setLoading(true)
        const params: CourseListParams = JSON.parse(apiParamsKey)
        const res = await getCourses(params)
        if (!cancelled) setCoursesPage(res)
      } catch {
        if (!cancelled && retryCount < maxRetries) {
          retryCount++
          setTimeout(fetchCourses, retryCount * 1500)
          return  // don't set loading=false yet
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCourses()
    return () => { cancelled = true }
  }, [apiParamsKey])

  // Client-side filter — applies ALL filter criteria to server results.
  // Covers both: (1) filters the BE doesn't support (duration, features), and
  // (2) refinement filters skipped from API for efficiency (subcategory, level, rating, price)
  const serverCourses = coursesPage?.results ?? []
  const filteredCourses = useMemo(() => {
    return serverCourses.filter(course => {
      // Subcategory
      if (selectedSubcategories.length > 0) {
        if (!course.subcategory || !selectedSubcategories.includes(course.subcategory)) return false
      }
      // Level
      if (selectedLevels.length > 0) {
        if (!selectedLevels.includes(getLevelLabel(course.level))) return false
      }
      // Rating
      if (selectedRatings.length > 0) {
        const courseRating = parseDecimal(course.rating)
        if (!selectedRatings.some(r => courseRating >= r)) return false
      }
      // Price
      const price = getEffectivePrice(course)
      if (price < priceRange[0] || price > priceRange[1]) return false
      // Duration
      if (selectedDurations.length > 0) {
        const hrs = (course.duration || 0) / 60
        if (!selectedDurations.some(dur => {
          if (dur === '0-2 hours') return hrs < 2
          if (dur === '2-6 hours') return hrs >= 2 && hrs <= 6
          if (dur === '6+ hours') return hrs > 6
          return true
        })) return false
      }
      // Language
      if (selectedLanguages.length > 0) {
        if (!selectedLanguages.includes(course.language)) return false
      }
      // Features
      if (selectedFeatures.length > 0) {
        if (!selectedFeatures.every(f => {
          if (f === 'Certificate of completion') return course.certificate
          return true
        })) return false
      }
      return true
    })
  }, [serverCourses, selectedSubcategories, selectedLevels, selectedRatings, priceRange, selectedDurations, selectedLanguages, selectedFeatures])

  // Total count — use server count as primary (client filter may reduce it slightly)
  const totalCount = coursesPage?.count ?? 0

  // Convert categories to CourseFilterSidebar format
  const categoryOptions: CategoryOption[] = categoryTree.map(cat => ({
    id: cat.id,
    name: cat.name,
    subcategories: cat.children?.map(sub => ({
      id: sub.id,
      name: sub.name
    }))
  }))

  // Check URL params — re-read whenever currentRoute changes (e.g. navigate from mega-menu)
  useEffect(() => {
    const params = getQueryParams()
    if (params.category) {
      const catId = Number(params.category)
      if (!isNaN(catId)) {
        setSelectedCategory(catId)
        setSelectedSubcategories([])
      }
    }
    if (params.subcategory) {
      const subId = Number(params.subcategory)
      if (!isNaN(subId)) {
        // Find parent category from tree
        for (const cat of categoryTree) {
          if (cat.children?.some(s => s.id === subId)) {
            setSelectedCategory(cat.id)
            setSelectedSubcategories([subId])
            break
          }
        }
      }
    }
    if (params.query) {
      setSearchTerm(params.query)
    }
    setCurrentPage(1)
  }, [currentRoute, categoryTree])

  // Scroll to results when page changes
  useEffect(() => {
    if (resultsRef.current && currentPage > 1) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [currentPage])

  // Map duration values to labels for CourseFilterSidebar
  const durationOptions = ['0-2 hours', '2-6 hours', '6+ hours']
  const levelOptions = ['All Levels', 'Beginner', 'Intermediate', 'Advanced']
  const languageOptions = ['Tiếng Việt', 'English', 'Español']
  const featureOptions = ['Certificate of completion', 'Subtitles', 'Quizzes']

  // Prepare filter state for CourseFilterSidebar
  const filterState = {
    category: selectedCategory,
    subcategories: selectedSubcategories,
    levels: selectedLevels,
    ratings: selectedRatings,
    durations: selectedDurations,
    languages: selectedLanguages,
    features: selectedFeatures,
    priceRange: priceRange
  }

  // Handle filter changes from CourseFilterSidebar
  const handleFilterChange = (filterType: string, value: any) => {
    switch(filterType) {
      case 'category':
        setSelectedCategory(value)
        setSelectedSubcategories([])   // always clear — old subcat IDs don't belong to new category
        setCurrentPage(1)
        break
      case 'subcategories':
        setSelectedSubcategories(value)
        setCurrentPage(1)
        break
      case 'levels':
        setSelectedLevels(value)
        setCurrentPage(1)
        break
      case 'ratings':
        setSelectedRatings(value)
        setCurrentPage(1)
        break
      case 'durations':
        setSelectedDurations(value)
        setCurrentPage(1)
        break
      case 'languages':
        setSelectedLanguages(value)
        setCurrentPage(1)
        break
      case 'features':
        setSelectedFeatures(value)
        setCurrentPage(1)
        break
      case 'priceRange':
        setPriceRange(value)
        setCurrentPage(1)
        break
    }
  }

  // Server-side pagination info
  const totalPages = coursesPage?.total_pages ?? 1
  const startIndex = (currentPage - 1) * itemsPerPage

  // Convert to CourseCard props
  const courseCardData = filteredCourses.map(course => {
    const effectivePrice = getEffectivePrice(course)
    const regularPrice = parseDecimal(course.price)
    const hasDiscount = effectivePrice < regularPrice

    return {
      id: `course-${course.id}`,
      courseId: `course-${course.id}`,
      title: course.title,
      instructor: course.instructor_name || 'Instructor',
      image: course.thumbnail || '',
      rating: parseDecimal(course.rating),
      reviews: course.total_reviews,
      price: formatPrice(effectivePrice),
      originalPrice: hasDiscount ? formatPrice(regularPrice) : undefined,
      duration: formatDuration(course.duration),
      students: course.total_students >= 1000 
        ? `${Math.floor(course.total_students / 1000)}K+` 
        : `${course.total_students}`,
      level: getLevelLabel(course.level),
      category: course.category_name || '',
      variant: viewMode === 'grid' ? 'vertical' as const : 'horizontal' as const,
      bestseller: course.total_students > 100000,
      currency: 'VND' as const,
      discountEndDate: hasDiscount ? course.discount_end_date : undefined,
      isOwned: isOwned(course.id),
      progress: getProgress(course.id),
    }
  })

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory(null)
    setSelectedSubcategories([])
    setSelectedLevels([])
    setPriceRange([PRICE_MIN, PRICE_MAX])
    setSelectedRatings([])
    setSelectedDurations([])
    setSelectedLanguages([])
    setSelectedFeatures([])
    setCurrentPage(1)
  }

  const activeFiltersCount = 
    (selectedCategory ? 1 : 0) +
    selectedSubcategories.length +
    selectedLevels.length +
    (priceRange[0] > PRICE_MIN || priceRange[1] < PRICE_MAX ? 1 : 0) +
    selectedRatings.length +
    selectedDurations.length +
    selectedLanguages.length +
    selectedFeatures.length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl mb-2">{t('courses_page.title')}</h1>
          <p className="text-muted-foreground">
            {loading ? t('courses_page.subtitle', { count: '...' }) : t('courses_page.subtitle', { count: totalCount })}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block">
            <CourseFilterSidebar
              filters={filterState}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              mode="multiple"
              categories={categoryOptions}
              durations={durationOptions}
              levels={levelOptions}
              languages={languageOptions}
              features={featureOptions}
              currency="VND"
              priceConfig={{
                min: PRICE_MIN,
                max: PRICE_MAX,
                placeholder: { min: '0', max: '5000000' }
              }}
              showCategories={true}
              className="sticky top-24"
            />
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search and Controls Bar */}
            <div className="bg-card p-4 rounded-lg shadow-sm mb-6">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input
                      type="text"
                      placeholder={t('courses_page.search_placeholder')}
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  
                  {/* Mobile Filter Button */}
                  <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="lg:hidden">
                        <Filter size={20} className="mr-2" />
                        {t('courses_page.filter_title')} {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {t('courses_page.filter_title')}
                            {activeFiltersCount > 0 && (
                              <Badge>{activeFiltersCount}</Badge>
                            )}
                          </div>
                        </SheetTitle>
                      </SheetHeader>
                      <div className="mt-6">
                        <CourseFilterSidebar
                          filters={filterState}
                          onFilterChange={handleFilterChange}
                          onClearFilters={clearFilters}
                          mode="multiple"
                          categories={categoryOptions}
                          durations={durationOptions}
                          levels={levelOptions}
                          languages={languageOptions}
                          features={featureOptions}
                          currency="VND"
                          priceConfig={{
                            min: PRICE_MIN,
                            max: PRICE_MAX,
                            placeholder: { min: '0', max: '5000000' }
                          }}
                          showCategories={true}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Controls Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Sort */}
                  <Select value={sortBy} onValueChange={(value) => {
                    setSortBy(value)
                    setCurrentPage(1)
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('courses_page.sort_by')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popularity">{t('courses_page.sort_popular')}</SelectItem>
                      <SelectItem value="rating">{t('courses_page.sort_highest_rated')}</SelectItem>
                      <SelectItem value="newest">{t('courses_page.sort_newest')}</SelectItem>
                      <SelectItem value="price_low">{t('courses_page.sort_price_low')}</SelectItem>
                      <SelectItem value="price_high">{t('courses_page.sort_price_high')}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Mode */}
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                    <TabsList>
                      <TabsTrigger value="grid">
                        <Grid3x3 className="h-4 w-4 mr-2" />
                        {t('courses_page.grid')}
                      </TabsTrigger>
                      <TabsTrigger value="list">
                        <List className="h-4 w-4 mr-2" />
                        {t('courses_page.list')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Grid Columns (only in grid mode) */}
                  {viewMode === 'grid' && (
                    <Select value={gridCols.toString()} onValueChange={(v) => setGridCols(Number(v))}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">{t('courses_page.col_2')}</SelectItem>
                        <SelectItem value="3">{t('courses_page.col_3')}</SelectItem>
                        <SelectItem value="4">{t('courses_page.col_4')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Active Filters Tags */}
                {activeFiltersCount > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCategory && (
                      <Tag onClose={() => {
                        setSelectedCategory(null)
                        setSelectedSubcategories([])
                      }}>
                        {categoryTree.find(c => c.id === selectedCategory)?.name}
                      </Tag>
                    )}
                    
                    {selectedSubcategories.map(subId => {
                      const subcategory = categoryTree
                        .flatMap(c => c.children || [])
                        .find(s => s.id === subId)
                      return subcategory ? (
                        <Tag key={subId} onClose={() => setSelectedSubcategories(prev => prev.filter(id => id !== subId))}>
                          {subcategory.name}
                        </Tag>
                      ) : null
                    })}
                    
                    {selectedLevels.map(level => (
                      <Tag key={level} onClose={() => setSelectedLevels(prev => prev.filter(l => l !== level))}>
                        {level}
                      </Tag>
                    ))}
                    
                    {(priceRange[0] > PRICE_MIN || priceRange[1] < PRICE_MAX) && (
                      <Tag onClose={() => setPriceRange([PRICE_MIN, PRICE_MAX])}>
                        ₫{priceRange[0].toLocaleString()} - ₫{priceRange[1].toLocaleString()}
                      </Tag>
                    )}
                    
                    {selectedRatings.map(rating => (
                      <Tag key={rating} onClose={() => setSelectedRatings(prev => prev.filter(r => r !== rating))}>
                        <Star size={12} className="inline fill-yellow-400 text-yellow-400 mr-1" /> {rating}+
                      </Tag>
                    ))}
                    
                    {selectedDurations.map(dur => (
                      <Tag key={dur} onClose={() => setSelectedDurations(prev => prev.filter(d => d !== dur))}>
                        {dur}
                      </Tag>
                    ))}
                    
                    {selectedLanguages.map(lang => (
                      <Tag key={lang} onClose={() => setSelectedLanguages(prev => prev.filter(l => l !== lang))}>
                        {lang}
                      </Tag>
                    ))}
                    
                    {selectedFeatures.map(feature => (
                      <Tag key={feature} onClose={() => setSelectedFeatures(prev => prev.filter(f => f !== feature))}>
                        {feature}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Results Info */}
            <div className="mb-4 flex items-center justify-between" ref={resultsRef}>
              <p className="text-sm text-muted-foreground">
                {t('courses_page.showing_results', {
                  from: totalCount > 0 ? startIndex + 1 : 0,
                  to: Math.min(startIndex + filteredCourses.length, totalCount),
                  total: totalCount
                })}
              </p>
            </div>

            {/* Courses Grid/List */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredCourses.length > 0 ? (
              <div className={
                viewMode === 'grid' 
                  ? `grid grid-cols-1 ${gridCols === 2 ? 'md:grid-cols-2' : gridCols === 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-6` 
                  : 'space-y-4'
              }>
                {courseCardData.map((course) => (
                  <CourseCard key={course.id} {...course} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-card rounded-lg">
                <div className="text-muted-foreground mb-4">
                  <Search size={48} className="mx-auto" />
                </div>
                <h3 className="text-xl mb-2">{t('courses_page.no_courses_found')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('courses_page.try_adjusting')}
                </p>
                <Button onClick={clearFilters}>
                  {t('courses_page.clear_all_filters')}
                </Button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('courses_page.show')}:</span>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(v) => {
                      setItemsPerPage(Number(v))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Pagination
                  current={currentPage}
                  total={totalCount}
                  pageSize={itemsPerPage}
                  onChange={(page) => setCurrentPage(page)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}