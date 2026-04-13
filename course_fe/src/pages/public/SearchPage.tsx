import { useState, useEffect, useCallback } from 'react'
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Badge } from "../../components/ui/badge"
import { Card, CardContent } from "../../components/ui/card"
import { Search, Star, Clock, Users, Grid, List, Loader2, User, FileText, MessageCircle, BookOpen } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { CourseCard } from "../../components/CourseCard"
import { useTranslation } from 'react-i18next'
import { getAllCourses, type CourseListItem, parseDecimal, getEffectivePrice, formatPrice, getLevelLabel, formatDuration } from '../../services/course.api'
import { getActiveCategories, type Category } from '../../services/category.api'
import { getInstructors, type Instructor } from '../../services/instructor.api'
import { getPublishedBlogPosts, type BlogPost } from '../../services/blog-posts.api'
import { getQnAs, type QnA, getQnAStatusLabel } from '../../services/qna.api'
import { useOwnedCourses } from '../../hooks/useOwnedCourses'
import { motion } from 'motion/react'

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
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
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

export function SearchPage() {
  const { t } = useTranslation()
  const { params } = useRouter()
  const { isOwned, getProgress } = useOwnedCourses()
  const searchQuery = params?.query || ""


  const [allCourses, setAllCourses] = useState<CourseListItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [articles, setArticles] = useState<BlogPost[]>([])
  const [qnaItems, setQnaItems] = useState<QnA[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMeta, setLoadingMeta] = useState(true)

  type SearchScope = 'all' | 'courses' | 'instructors' | 'articles' | 'qna'
  const [searchScope, setSearchScope] = useState<SearchScope>('all')

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

      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadMetaResults() {
      try {
        setLoadingMeta(true)
        const [instructorsRes, postsRes, qnaRes] = await Promise.all([
          getInstructors(1, 50),
          getPublishedBlogPosts({ page: 1, page_size: 50 }),
          getQnAs({ page: 1, page_size: 50 }),
        ])
        if (cancelled) return
        setInstructors(instructorsRes.results)
        setArticles(postsRes.results)
        setQnaItems(qnaRes.results)
      } catch {
        if (cancelled) return
        setInstructors([])
        setArticles([])
        setQnaItems([])
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    }
    loadMetaResults()
    return () => {
      cancelled = true
    }
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

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState("relevance")


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

  const normalizedQuery = filters.query.trim().toLowerCase()

  const instructorResults = instructors.filter((item) => {
    if (!normalizedQuery) return true
    return (
      item.user.full_name.toLowerCase().includes(normalizedQuery) ||
      (item.specialization || '').toLowerCase().includes(normalizedQuery) ||
      (item.bio || '').toLowerCase().includes(normalizedQuery)
    )
  })

  const articleResults = articles.filter((item) => {
    if (!normalizedQuery) return true
    return (
      item.title.toLowerCase().includes(normalizedQuery) ||
      (item.summary || '').toLowerCase().includes(normalizedQuery) ||
      (item.content || '').toLowerCase().includes(normalizedQuery)
    )
  })

  const qnaResults = qnaItems.filter((item) => {
    if (!normalizedQuery) return true
    return (
      item.question.toLowerCase().includes(normalizedQuery) ||
      (item.description || '').toLowerCase().includes(normalizedQuery) ||
      (item.course_title || '').toLowerCase().includes(normalizedQuery)
    )
  })

  const totalByScope: Record<SearchScope, number> = {
    all: courses.length + instructorResults.length + articleResults.length + qnaResults.length,
    courses: courses.length,
    instructors: instructorResults.length,
    articles: articleResults.length,
    qna: qnaResults.length,
  }

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
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="border-b bg-muted/30">
        <motion.div
          className="container mx-auto px-4 py-6"
          variants={fadeInUp}
          initial="hidden"
          animate="show"
        >
          <div className="flex flex-col md:flex-row gap-4">

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search_page.search_courses')}
                value={filters.query}
                onChange={(e) => handleFilterChange("query", e.target.value)}
                className="pl-10"
              />
            </div>


            <div className="w-full sm:w-auto">
              <Select value={filters.category} onValueChange={(value) => handleFilterChange("category", value)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('search_page.all_categories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('search_page.all_categories')}</SelectItem>
                  {categories.filter(c => !c.parent_category).map(category => (
                    <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">

          <motion.div className="min-w-0 space-y-6" variants={fadeInUp}>
            <motion.div className="flex flex-wrap gap-2" variants={fadeInUp}>
              <Button size="sm" variant={searchScope === 'all' ? 'default' : 'outline'} onClick={() => setSearchScope('all')}>
                {t('search_page.scope_all', 'Tất cả')} ({totalByScope.all})
              </Button>
              <Button size="sm" variant={searchScope === 'courses' ? 'default' : 'outline'} onClick={() => setSearchScope('courses')}>
                {t('search_page.scope_courses', 'Khóa học')} ({totalByScope.courses})
              </Button>
              <Button size="sm" variant={searchScope === 'instructors' ? 'default' : 'outline'} onClick={() => setSearchScope('instructors')}>
                {t('search_page.scope_instructors', 'Giảng viên')} ({totalByScope.instructors})
              </Button>
              <Button size="sm" variant={searchScope === 'articles' ? 'default' : 'outline'} onClick={() => setSearchScope('articles')}>
                {t('search_page.scope_articles', 'Bài viết')} ({totalByScope.articles})
              </Button>
              <Button size="sm" variant={searchScope === 'qna' ? 'default' : 'outline'} onClick={() => setSearchScope('qna')}>
                {t('search_page.scope_qna', 'Q&A')} ({totalByScope.qna})
              </Button>
            </motion.div>


            <motion.div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" variants={fadeInUp}>
              <div>
                <p className="text-sm text-muted-foreground">
                  {totalByScope[searchScope].toLocaleString()} {t('search_page.results_for')} "{filters.query || t('common.all')}"
                </p>
              </div>

              {searchScope === 'courses' && (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-48">
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


                <div className="flex w-full rounded-md border sm:w-auto">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 rounded-r-none sm:flex-none"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 rounded-l-none sm:flex-none"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              )}
            </motion.div>


            {(filters.category !== "all" || filters.level !== "all" || filters.rating > 0) && (
              <motion.div className="flex flex-wrap gap-2" variants={fadeInUp}>
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
              </motion.div>
            )}


            {(loading || loadingMeta) ? (
              <div className="col-span-full flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {searchScope === 'all' && (
                  <div className="space-y-8">
                    <section className="space-y-4">
                      <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /><h3 className="font-semibold">{t('search_page.scope_courses', 'Khóa học')}</h3></div>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {courses.slice(0, 3).map((course) => {
                          const ep = getEffectivePrice(course)
                          const rp = parseDecimal(course.price)
                          return (
                            <CourseCard
                              key={course.id}
                              courseId={`course-${course.id}`}
                              title={course.title}
                              instructor={course.instructor_name || t('course_detail.by_instructor')}
                              image={course.thumbnail || ''}
                              rating={parseDecimal(course.rating)}
                              reviews={course.total_reviews}
                              price={formatPrice(ep)}
                              originalPrice={ep < rp ? formatPrice(rp) : undefined}
                              duration={formatDuration(course.duration)}
                              students={course.total_students >= 1000 ? `${Math.floor(course.total_students / 1000)}K+` : `${course.total_students}`}
                              level={getLevelLabel(course.level)}
                              variant="vertical"
                              bestseller={course.total_students > 100000}
                              currency="VND"
                              discountEndDate={ep < rp ? course.discount_end_date : undefined}
                              isOwned={isOwned(course.id)}
                              progress={getProgress(course.id)}
                            />
                          )
                        })}
                      </div>
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center gap-2"><User className="h-4 w-4" /><h3 className="font-semibold">{t('search_page.scope_instructors', 'Giảng viên')}</h3></div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {instructorResults.slice(0, 4).map((item) => (
                          <Card key={item.id} className="p-4">
                            <CardContent className="p-0">
                              <div className="font-medium">{item.user.full_name}</div>
                              <div className="text-sm text-muted-foreground">{item.specialization || t('search_page.no_data', 'Chưa cập nhật')}</div>
                              <div className="mt-2 text-xs text-muted-foreground">{item.total_courses} {t('search_page.scope_courses', 'Khóa học')} · {item.total_students.toLocaleString()} {t('course_card.students')}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><h3 className="font-semibold">{t('search_page.scope_articles', 'Bài viết')}</h3></div>
                      <div className="space-y-3">
                        {articleResults.slice(0, 3).map((item) => (
                          <Card key={item.id} className="p-4">
                            <CardContent className="p-0">
                              <div className="font-medium">{item.title}</div>
                              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.summary || item.content}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /><h3 className="font-semibold">{t('search_page.scope_qna', 'Q&A')}</h3></div>
                      <div className="space-y-3">
                        {qnaResults.slice(0, 3).map((item) => (
                          <Card key={item.id} className="p-4">
                            <CardContent className="p-0">
                              <div className="font-medium">{item.question}</div>
                              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description || item.course_title}</div>
                              <div className="mt-2 text-xs text-muted-foreground">{getQnAStatusLabel(item.status)} · {item.answers_count} {t('search_page.answers', 'trả lời')}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {searchScope === 'courses' && (
                  <div className={viewMode === "grid" ? "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
                    {courses.map((course) => {
                      const ep = getEffectivePrice(course)
                      const rp = parseDecimal(course.price)
                      return (
                        <motion.div
                          key={course.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          whileHover={{ y: -2 }}
                        >
                          <CourseCard
                            courseId={`course-${course.id}`}
                            title={course.title}
                            instructor={course.instructor_name || t('course_detail.by_instructor')}
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
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                {searchScope === 'instructors' && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {instructorResults.map((item) => (
                      <Card key={item.id} className="p-4">
                        <CardContent className="p-0">
                          <div className="font-medium">{item.user.full_name}</div>
                          <div className="text-sm text-muted-foreground">{item.specialization || t('search_page.no_data', 'Chưa cập nhật')}</div>
                          <div className="mt-2 text-xs text-muted-foreground">{item.total_courses} {t('search_page.scope_courses', 'Khóa học')} · {item.total_students.toLocaleString()} {t('course_card.students')}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {searchScope === 'articles' && (
                  <div className="space-y-3">
                    {articleResults.map((item) => (
                      <Card key={item.id} className="p-4">
                        <CardContent className="p-0">
                          <div className="font-medium">{item.title}</div>
                          <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.summary || item.content}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {searchScope === 'qna' && (
                  <div className="space-y-3">
                    {qnaResults.map((item) => (
                      <Card key={item.id} className="p-4">
                        <CardContent className="p-0">
                          <div className="font-medium">{item.question}</div>
                          <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description || item.course_title}</div>
                          <div className="mt-2 text-xs text-muted-foreground">{getQnAStatusLabel(item.status)} · {item.answers_count} {t('search_page.answers', 'trả lời')}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {searchScope === 'courses' && (
              <motion.div className="text-center" variants={fadeInUp}>
                <Button variant="outline" className="w-full sm:w-auto">
                  {t('search_page.load_more')}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
