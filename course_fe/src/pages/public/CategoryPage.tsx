import { useState, useEffect } from 'react'
import { Search, Filter, Grid, List, X } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { CourseCard } from '../../components/CourseCard'
import { CategoryBanner } from '../../components/CategoryBanner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '../../components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card } from '../../components/ui/card'
import { CourseFilterSidebar } from '../../components/CourseFilterSidebar'
import { useRouter } from '../../components/Router'
import { type BreadcrumbItem } from '../../utils/navigation'
import { getAllCourses, type CourseListItem, parseDecimal, getEffectivePrice, hasActiveDiscount, formatPrice, getLevelLabel, formatDuration } from '../../services/course.api'
import { getActiveCategories, type Category } from '../../services/category.api'
import { useOwnedCourses } from '../../hooks/useOwnedCourses'
import { useTranslation } from 'react-i18next'

const durations = [
  { labelKey: 'duration_0_2', value: '0-2' },
  { labelKey: 'duration_3_6', value: '3-6' },
  { labelKey: 'duration_7_16', value: '7-16' },
  { labelKey: 'duration_17_plus', value: '17+' }
]

export default function CategoryPage() {
  const { currentRoute, navigate } = useRouter()
  const { isOwned: isOwnedCourse, getProgress } = useOwnedCourses()
  const { t } = useTranslation()
  
  // Extract category ID from URL: /category/:categoryId or /category/:categoryId/:subcategoryId
  const pathParts = currentRoute.split('/').filter(Boolean)
  const categoryId = Number(pathParts[1]) || 0
  const subcategoryId = Number(pathParts[2]) || 0
  
  // Data from API
  const [allCourses, setAllCourses] = useState<CourseListItem[]>([])
  const [categoryInfo, setCategoryInfo] = useState<Category | null>(null)
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [subcategoryInfo, setSubcategoryInfo] = useState<Category | null>(null)
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
        const allCats = catsRes.results
        const catInfo = allCats.find(c => c.id === categoryId) || null
        setCategoryInfo(catInfo)
        const subs = allCats.filter(c => c.parent_category === categoryId)
        setSubcategories(subs)
        if (subcategoryId) {
          setSubcategoryInfo(allCats.find(c => c.id === subcategoryId) || null)
        }
        // Filter courses: show courses in this category OR subcategory
        const published = coursesArr.filter(c => c.status === 'published')
        if (subcategoryId) {
          setAllCourses(published.filter(c => c.category === subcategoryId || c.subcategory === subcategoryId))
        } else {
          // Show courses where category or subcategory matches this category or any of its children
          const childIds = new Set([categoryId, ...subs.map(s => s.id)])
          setAllCourses(published.filter(c => 
            childIds.has(c.category || 0) || childIds.has(c.subcategory || 0)
          ))
        }
      } catch {
        // fail silently
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [categoryId, subcategoryId])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedDuration, setSelectedDuration] = useState<string[]>([])
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [priceRange, setPriceRange] = useState([0, 5000000])
  const [sortBy, setSortBy] = useState('most-popular')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const levels = [
    t('category_page.levels.all'),
    t('category_page.levels.beginner'),
    t('category_page.levels.intermediate'),
    t('category_page.levels.advanced')
  ]
  
  // Filters state for CourseFilterSidebar
  const filters = {
    levels: selectedLevels,
    durations: selectedDuration,
    ratings: selectedRating !== null ? [selectedRating] : [],
    priceRange: [priceRange[0], priceRange[1]] as [number, number]
  }
  
  // Handle filter changes
  const handleFilterChange = (filterType: string, value: any) => {
    switch(filterType) {
      case 'levels':
        setSelectedLevels(value)
        break
      case 'durations':
        setSelectedDuration(value)
        break
      case 'ratings':
        setSelectedRating(value.length > 0 ? value[value.length - 1] : null)
        break
      case 'priceRange':
        setPriceRange(value)
        break
    }
  }
  
  // Generate breadcrumb
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t('category_page.breadcrumb.home'), href: '/' }
  ]
  
  if (categoryInfo) {
    breadcrumbItems.push({
      label: categoryInfo.name,
      href: `/category/${categoryId}`
    })
  }
  
  if (subcategoryInfo) {
    breadcrumbItems.push({
      label: subcategoryInfo.name,
      href: `/category/${categoryId}/${subcategoryId}`
    })
  }
  
  // Filter courses (client-side from the already-category-filtered list)
  const filteredCourses = allCourses.filter(course => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!course.title.toLowerCase().includes(q) &&
          !(course.instructor_name || '').toLowerCase().includes(q)) {
        return false
      }
    }
    
    // Level filter
    if (selectedLevels.length > 0 && !selectedLevels.includes(getLevelLabel(course.level))) {
      return false
    }
    
    // Rating filter
    if (selectedRating && parseDecimal(course.rating) < selectedRating) {
      return false
    }
    
    // Price range
    const price = getEffectivePrice(course)
    if (price < priceRange[0] || price > priceRange[1]) {
      return false
    }
    
    return true
  })
  
  // Sort courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'most-popular':
        return b.total_students - a.total_students
      case 'highest-rated':
        return parseDecimal(b.rating) - parseDecimal(a.rating)
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'price-low-high':
        return getEffectivePrice(a) - getEffectivePrice(b)
      case 'price-high-low':
        return getEffectivePrice(b) - getEffectivePrice(a)
      default:
        return 0
    }
  })
  
  const clearFilters = () => {
    setSearchQuery('')
    setSelectedLevels([])
    setSelectedDuration([])
    setSelectedRating(null)
    setPriceRange([0, 5000000])
  }
  
  const hasActiveFilters = searchQuery || selectedLevels.length > 0 || 
    selectedDuration.length > 0 || selectedRating !== null
  
  return (
    <div className="min-h-screen bg-background">
      {/* Category Banner */}
      <CategoryBanner
        title={subcategoryInfo?.name || categoryInfo?.name || t('category_page.banner.default_title')}
        description={
          subcategoryId
            ? t('category_page.banner.subcategory_description', { name: subcategoryInfo?.name || '' })
            : t('category_page.banner.category_description', { name: categoryInfo?.name || '' })
        }
        breadcrumbItems={breadcrumbItems}
        totalCourses={filteredCourses.length}
      />
      
      {/* Subcategory Navigation (if on category page) */}
      {!subcategoryId && subcategories.length > 0 && (
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-3 md:py-4">
            <h2 className="text-base md:text-lg font-semibold mb-2 md:mb-3">{t('category_page.popular_topics')}</h2>
            <div className="flex flex-wrap gap-2">
              {subcategories.map(subcat => (
                <Button
                  key={subcat.id}
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/category/${categoryId}/${subcat.id}`)}
                  className="hover:bg-purple-600 hover:text-white hover:border-purple-600"
                >
                  {subcat.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden lg:block">
            <CourseFilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              mode="multiple"
              durations={durations.map(d => t(`category_page.${d.labelKey}`))}
              levels={levels}
              currency="VND"
              priceConfig={{
                min: 0,
                max: 5000000,
                placeholder: { min: '0', max: '5000000' }
              }}
              showLanguages={false}
              showFeatures={false}
              className="sticky top-24"
            />
          </aside>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search and Controls Bar */}
            <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder={t('category_page.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    {t('category_page.courses_count', { count: sortedCourses.length })}
                  </p>
                  
                  {/* Mobile Filter Button */}
                  <Sheet open={showFilters} onOpenChange={setShowFilters}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="lg:hidden text-xs">
                        <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        {t('category_page.filters.title')}
                        {hasActiveFilters && (
                          <Badge className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            !
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>{t('category_page.filters.title')}</SheetTitle>
                        <SheetDescription>
                          {t('category_page.filters.description')}
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6">
                        <CourseFilterSidebar
                          filters={filters}
                          onFilterChange={handleFilterChange}
                          onClearFilters={clearFilters}
                          mode="multiple"
                          durations={durations.map(d => t(`category_page.${d.labelKey}`))}
                          levels={levels}
                          currency="VND"
                          priceConfig={{
                            min: 0,
                            max: 5000000,
                            placeholder: { min: '0', max: '5000000' }
                          }}
                          showLanguages={false}
                          showFeatures={false}
                          showFilters={true}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* View Mode Toggle */}
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                    <TabsList className="hidden sm:flex">
                      <TabsTrigger value="grid">
                        <Grid className="w-4 h-4" />
                      </TabsTrigger>
                      <TabsTrigger value="list">
                        <List className="w-4 h-4" />
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  {/* Sort By */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm">
                      <SelectValue placeholder={t('category_page.sort.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="most-popular">{t('category_page.sort.most_popular')}</SelectItem>
                      <SelectItem value="highest-rated">{t('category_page.sort.highest_rated')}</SelectItem>
                      <SelectItem value="newest">{t('category_page.sort.newest')}</SelectItem>
                      <SelectItem value="price-low-high">{t('category_page.sort.price_low_high')}</SelectItem>
                      <SelectItem value="price-high-low">{t('category_page.sort.price_high_low')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('category_page.active_filters')}</span>
                  {selectedLevels.map(level => (
                    <Badge key={level} variant="secondary" className="gap-1">
                      {level}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setSelectedLevels(prev => prev.filter(l => l !== level))}
                      />
                    </Badge>
                  ))}
                  {selectedRating && (
                    <Badge variant="secondary" className="gap-1">
                      {t('category_page.selected_rating', { count: selectedRating })}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setSelectedRating(null)}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Courses Grid/List */}
            {sortedCourses.length > 0 ? (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {sortedCourses.map((course) => {
                  const effectivePrice = getEffectivePrice(course);
                  const originalPrice = parseDecimal(course.original_price);
                  const hasDiscount = hasActiveDiscount(course);
                  return (
                    <CourseCard
                      key={course.id}
                      courseId={`course-${course.id}`}
                      title={course.title}
                      instructor={course.instructor_name || t('category_page.instructor_fallback')}
                      image={course.thumbnail || ''}
                      rating={parseDecimal(course.rating)}
                      reviews={course.enrollment_count || 0}
                      price={formatPrice(effectivePrice)}
                      originalPrice={hasDiscount ? formatPrice(originalPrice) : undefined}
                      duration={formatDuration(course.duration)}
                      students={course.enrollment_count || 0}
                      level={getLevelLabel(course.level)}
                      category={course.category_name || ''}
                      currency="VND"
                      variant={viewMode === 'list' ? 'horizontal' : 'vertical'}
                      discountEndDate={hasDiscount ? course.discount_end_date : undefined}
                      isOwned={isOwnedCourse(course.id)}
                      progress={getProgress(course.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('category_page.empty.title')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('category_page.empty.description')}
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters}>{t('category_page.empty.clear_filters')}</Button>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
