import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Filter, Grid3x3, List, Star, X } from 'lucide-react'
import { motion } from 'motion/react'
import { CourseCard } from '../../components/CourseCard'
import { CourseFilterSidebar, CategoryOption } from '../../components/CourseFilterSidebar'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Skeleton } from '../../components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { getCourses, type CourseListItem, type CourseListParams, parseDecimal, getEffectivePrice, formatPrice, getLevelLabel, formatDuration } from '../../services/course.api'
import type { PaginatedResponse } from '../../services/common/pagination'
import { getActiveCategories, buildCategoryTree, type CategoryTreeNode } from '../../services/category.api'
import { getQueryParams } from '../../utils/navigation'
import { useTranslation } from 'react-i18next'
import { useRouter } from '../../components/Router'
import { useOwnedCourses } from '../../hooks/useOwnedCourses'
import { listItemTransition } from '../../lib/motion'

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}


const PRICE_MIN = 0
const PRICE_MAX = 5000000


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


function Pagination({
  current,
  total,
  pageSize,
  onChange,
  t,
}: {
  current: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  t: (key: string, options?: any) => string
}) {
  const totalPages = Math.ceil(total / pageSize)
  const pages = []


  let startPage = Math.max(1, current - 2)
  let endPage = Math.min(totalPages, current + 2)


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
        {t('common.previous')}
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
        {t('common.next')}
      </Button>
    </div>
  )
}

export function CoursesPage() {
  const { t } = useTranslation()
  const { currentRoute } = useRouter()
  const { isOwned, getProgress } = useOwnedCourses()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [gridCols, setGridCols] = useState(3)


  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([PRICE_MIN, PRICE_MAX])
  const [selectedRatings, setSelectedRatings] = useState<number[]>([])
  const [selectedDurations, setSelectedDurations] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])


  const [sortBy, setSortBy] = useState('popularity')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)


  const [drawerOpen, setDrawerOpen] = useState(false)


  const resultsRef = useRef<HTMLDivElement>(null)


  const [coursesPage, setCoursesPage] = useState<PaginatedResponse<CourseListItem> | null>(null)
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)


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


  const levelLabelToValue = (label: string): string => {
    const map: Record<string, string> = {
      [t('common.all_levels')]: 'all_levels',
      [t('common.beginner')]: 'beginner',
      [t('common.intermediate')]: 'intermediate',
      [t('common.advanced')]: 'advanced',
    }
    return map[label] || label.toLowerCase()
  }



  const apiParamsKey = useMemo(() => {
    const p: Record<string, unknown> = {
      page: currentPage,
      page_size: itemsPerPage,
      status: 'published',
    }
    if (selectedCategory) p.category_id = selectedCategory
    if (selectedSubcategories.length > 0) p.subcategory_ids = selectedSubcategories.join(',')
    if (selectedLevels.length > 0) p.levels = selectedLevels.map(levelLabelToValue).join(',')
    if (searchTerm) p.search = searchTerm
    const ordering = sortToOrdering(sortBy)
    if (ordering) p.ordering = ordering
    if (selectedRatings.length > 0) p.rating_min = Math.min(...selectedRatings)
    if (selectedLanguages.length > 0) p.languages = selectedLanguages.join(',')
    if (selectedDurations.length > 0) {
      p.duration_buckets = selectedDurations
        .map((dur) => {
          if (dur === t('courses_page.duration_short')) return 'short'
          if (dur === t('courses_page.duration_medium')) return 'medium'
          if (dur === t('courses_page.duration_long')) return 'long'
          return ''
        })
        .filter(Boolean)
        .join(',')
    }
    if (selectedFeatures.includes(t('courses_page.certificate_feature'))) p.certificate = true
    if (priceRange[0] > PRICE_MIN) p.price_min = priceRange[0]
    if (priceRange[1] < PRICE_MAX) p.price_max = priceRange[1]
    return JSON.stringify(p)
  }, [
    currentPage, itemsPerPage, selectedCategory, selectedSubcategories,
    selectedLevels, selectedLanguages, selectedDurations, selectedFeatures,
    searchTerm, sortBy,

    selectedRatings.length > 0 ? Math.min(...selectedRatings) : null,
    priceRange,
  ])


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
          return
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCourses()
    return () => { cancelled = true }
  }, [apiParamsKey])

  const serverCourses = coursesPage?.results ?? []
  const totalCount = coursesPage?.count ?? 0


  const categoryOptions: CategoryOption[] = categoryTree.map(cat => ({
    id: cat.id,
    name: cat.name,
    subcategories: cat.children?.map(sub => ({
      id: sub.id,
      name: sub.name
    }))
  }))


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


  useEffect(() => {
    if (resultsRef.current && currentPage > 1) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [currentPage])


  const durationOptions = [t('courses_page.duration_short'), t('courses_page.duration_medium'), t('courses_page.duration_long')]
  const levelOptions = [t('common.all_levels'), t('common.beginner'), t('common.intermediate'), t('common.advanced')]
  const languageOptions = [
    t('language_switcher.vietnamese'),
    t('language_switcher.english'),
    t('search_page.language_spanish'),
  ]
  const featureOptions = [t('courses_page.certificate_feature')]


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


  const handleFilterChange = (filterType: string, value: any) => {
    switch(filterType) {
      case 'category':
        setSelectedCategory(value)
        setSelectedSubcategories([])
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


  const totalPages = coursesPage?.total_pages ?? 1
  const startIndex = (currentPage - 1) * itemsPerPage


  const courseCardData = serverCourses.map(course => {
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

  const renderCourseSkeleton = () => {
    const skeletonItems = viewMode === 'grid' ? itemsPerPage : 6
    return (
      <div className={
        viewMode === 'grid'
          ? `grid grid-cols-1 ${gridCols === 2 ? 'md:grid-cols-2' : gridCols === 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-6`
          : 'space-y-4'
      }>
        {Array.from({ length: skeletonItems }).map((_, index) => (
          <div key={`course-skeleton-${index}`} className="overflow-hidden rounded-lg border bg-card p-4 space-y-4">
            <Skeleton className="h-40 w-full rounded-md" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >

      <motion.div className="bg-card border-b py-8" variants={fadeInUp} initial="hidden" animate="show">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl mb-2">{t('courses_page.title')}</h1>
          <p className="text-muted-foreground">
            {loading ? t('courses_page.subtitle', { count: '...' }) : t('courses_page.subtitle', { count: totalCount })}
          </p>
        </div>
      </motion.div>

      <motion.div className="container mx-auto px-4 py-8" variants={sectionStagger} initial="hidden" animate="show">
        <motion.div className="flex flex-col lg:flex-row gap-8" variants={fadeInUp}>

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
              className="lg:sticky lg:top-24"
            />
          </aside>


          <motion.div className="flex-1 min-w-0" variants={fadeInUp}>

            <motion.div className="app-surface-elevated p-4 rounded-lg shadow-sm mb-6" variants={fadeInUp}>
              <div className="space-y-4">

                <div className="flex flex-col gap-2 sm:flex-row">
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


                  <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full lg:hidden sm:w-auto">
                        <Filter size={20} className="mr-2" />
                        {t('courses_page.filter_title')} {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
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


                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">

                  <Select value={sortBy} onValueChange={(value) => {
                    setSortBy(value)
                    setCurrentPage(1)
                  }}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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


                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')} className="w-full sm:w-auto">
                    <TabsList className="relative w-full justify-start overflow-x-auto p-1 sm:w-auto">
                      <TabsTrigger value="grid" className="relative shrink-0 whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                        {viewMode === 'grid' && <motion.span layoutId="courses-page-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
                        <Grid3x3 className="relative z-10 h-4 w-4 mr-2" />
                        <span className="relative z-10">{t('courses_page.grid')}</span>
                      </TabsTrigger>
                      <TabsTrigger value="list" className="relative shrink-0 whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                        {viewMode === 'list' && <motion.span layoutId="courses-page-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
                        <List className="relative z-10 h-4 w-4 mr-2" />
                        <span className="relative z-10">{t('courses_page.list')}</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>


                  {viewMode === 'grid' && (
                    <Select value={gridCols.toString()} onValueChange={(v) => setGridCols(Number(v))}>
                      <SelectTrigger className="w-full sm:w-[130px]">
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
            </motion.div>


            <motion.div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" ref={resultsRef} variants={fadeInUp}>
              <p className="text-sm text-muted-foreground">
                {t('courses_page.showing_results', {
                  from: totalCount > 0 ? startIndex + 1 : 0,
                  to: Math.min(startIndex + serverCourses.length, totalCount),
                  total: totalCount
                })}
              </p>
            </motion.div>


            {loading ? (
              <motion.div variants={fadeInUp}>{renderCourseSkeleton()}</motion.div>
            ) : serverCourses.length > 0 ? (
              <motion.div variants={fadeInUp} className={
                viewMode === 'grid'
                  ? `grid grid-cols-1 ${gridCols === 2 ? 'md:grid-cols-2' : gridCols === 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-6`
                  : 'space-y-4'
              }>
                {courseCardData.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={listItemTransition(index)}
                  >
                    <CourseCard {...course} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div variants={fadeInUp} className="text-center py-16 bg-card rounded-lg">
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
              </motion.div>
            )}


            {totalPages > 1 && (
              <motion.div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" variants={fadeInUp}>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-sm text-muted-foreground">{t('courses_page.show')}:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(v) => {
                      setItemsPerPage(Number(v))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-20">
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
                  t={t}
                />
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}





