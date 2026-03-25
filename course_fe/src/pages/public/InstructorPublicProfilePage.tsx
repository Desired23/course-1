import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
import { UserPagination } from '../../components/UserPagination'
import { 
  Star, 
  Users, 
  BookOpen, 
  Globe, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Youtube,
  UserPlus,
  UserCheck,
  Loader2,
  MessageCircle,
  ArrowUpDown,
  LayoutGrid,
  List,
} from 'lucide-react'
import { useRouter } from '../../components/Router'
import { useFollow } from '../../contexts/FollowContext'
import { useAuth } from '../../contexts/AuthContext'
import { useChat } from '../../contexts/ChatContext'
import { CourseCard } from '../../components/CourseCard'
import {
  type Instructor,
  getInstructorById,
  parseRating,
  getInitials,
  formatStudentCount,
} from '../../services/instructor.api'
import {
  type CourseListItem,
  getCourses,
  getEffectivePrice,
  formatPrice,
  getLevelLabel,
} from '../../services/course.api'
import {
  type Review,
  getAllReviewsByInstructor,
  formatReviewDate,
  calcAverageRating,
} from '../../services/review.api'

export function InstructorPublicProfilePage() {
  const { navigate, params } = useRouter()
  const { isFollowing, toggleFollow, getFollowersCount } = useFollow()
  const { user } = useAuth()
  const { openChatWithUser } = useChat()

  const instructorId = params?.instructorId || '1'
  const following = isFollowing(instructorId)
  const followersCount = getFollowersCount(instructorId)

  const [instructor, setInstructor] = useState<Instructor | null>(null)
  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'about' | 'courses' | 'reviews'>('about')
  const [courseSort, setCourseSort] = useState<'featured' | 'rating' | 'students' | 'newest'>('featured')
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [courseQuery, setCourseQuery] = useState('')
  const [courseLevel, setCourseLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'all_levels'>('all')
  const [coursePriceFilter, setCoursePriceFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [courseViewMode, setCourseViewMode] = useState<'grid' | 'list'>('grid')
  const [reviewQuery, setReviewQuery] = useState('')
  const [reviewRatingFilter, setReviewRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all')
  const [coursesPage, setCoursesPage] = useState(1)
  const [reviewsPage, setReviewsPage] = useState(1)

  const COURSES_PER_PAGE = 6
  const REVIEWS_PER_PAGE = 5

  // ---- Fetch instructor + courses ----
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const numId = Number(instructorId)
    if (isNaN(numId)) {
      setError('ID giang vien khong hop le')
      setLoading(false)
      return
    }

    Promise.all([
      getInstructorById(numId),
      getCourses({ page: 1, page_size: 100, instructor_id: numId }),
      getAllReviewsByInstructor(numId),
    ])
      .then(([inst, courseRes, reviewData]) => {
        if (cancelled) return
        setInstructor(inst)
        setCourses(courseRes.results)
        setReviews(reviewData)
        setActiveTab(courseRes.results.length > 0 ? 'courses' : reviewData.length > 0 ? 'reviews' : 'about')
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Khong the tai thong tin giang vien')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [instructorId])

  const handleFollowClick = () => {
    toggleFollow(instructorId)
  }

  useEffect(() => {
    setCoursesPage(1)
  }, [courseQuery, courseLevel, coursePriceFilter, courseSort])

  useEffect(() => {
    setReviewsPage(1)
  }, [reviewQuery, reviewRatingFilter, reviewSort])

  const handleMessageInstructor = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    await openChatWithUser(instructor.user.id, instructor.user.full_name)
  }

  // ---- Loading / Error ----
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !instructor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Khong tim thay giang vien'}</p>
          <Button onClick={() => navigate('/')}>Ve trang chu</Button>
        </div>
      </div>
    )
  }

  const rating = parseRating(instructor.rating)
  const socialLinks = instructor.social_links || {}
  const filteredCourses = courses.filter((course) => {
    const matchesQuery = !courseQuery || course.title.toLowerCase().includes(courseQuery.toLowerCase())
    const matchesLevel = courseLevel === 'all' || course.level === courseLevel
    const effectivePrice = getEffectivePrice(course)
    const matchesPrice =
      coursePriceFilter === 'all' ||
      (coursePriceFilter === 'free' && effectivePrice === 0) ||
      (coursePriceFilter === 'paid' && effectivePrice > 0)
    return matchesQuery && matchesLevel && matchesPrice
  })
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (courseSort === 'rating') return Number(b.rating || 0) - Number(a.rating || 0)
    if (courseSort === 'students') return (b.total_students || 0) - (a.total_students || 0)
    if (courseSort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (Boolean(b.is_featured) !== Boolean(a.is_featured)) return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured))
    return Number(b.rating || 0) - Number(a.rating || 0)
  })
  const filteredReviews = reviews.filter((review) => {
    const text = `${review.user_info?.full_name || ''} ${review.comment || ''} ${review.course_detail?.title || ''}`.toLowerCase()
    const matchesQuery = !reviewQuery || text.includes(reviewQuery.toLowerCase())
    const matchesRating = reviewRatingFilter === 'all' || String(review.rating) === reviewRatingFilter
    return matchesQuery && matchesRating
  })
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (reviewSort === 'highest') return b.rating - a.rating
    if (reviewSort === 'lowest') return a.rating - b.rating
    return new Date(b.review_date).getTime() - new Date(a.review_date).getTime()
  })
  const courseTotalPages = Math.max(1, Math.ceil(sortedCourses.length / COURSES_PER_PAGE))
  const reviewTotalPages = Math.max(1, Math.ceil(sortedReviews.length / REVIEWS_PER_PAGE))
  const paginatedCourses = sortedCourses.slice((coursesPage - 1) * COURSES_PER_PAGE, coursesPage * COURSES_PER_PAGE)
  const paginatedReviews = sortedReviews.slice((reviewsPage - 1) * REVIEWS_PER_PAGE, reviewsPage * REVIEWS_PER_PAGE)
  const courseCardData = paginatedCourses.map((course) => {
    const effectivePrice = getEffectivePrice(course)
    const regularPrice = parseFloat(course.price || '0')
    const hasDiscount = effectivePrice < regularPrice

    return {
      id: `course-${course.id}`,
      courseId: `course-${course.id}`,
      title: course.title,
      instructor: course.instructor_name || instructor.user.full_name,
      image: course.thumbnail || '',
      rating: parseFloat(course.rating || '0') || 0,
      reviews: course.total_reviews,
      price: formatPrice(effectivePrice),
      originalPrice: hasDiscount ? formatPrice(regularPrice) : undefined,
      duration: course.duration ? `${course.duration} phut` : '0 phut',
      students: course.total_students >= 1000 ? `${Math.floor(course.total_students / 1000)}K+` : `${course.total_students}`,
      level: getLevelLabel(course.level),
      category: course.category_name || '',
      variant: courseViewMode === 'grid' ? 'vertical' as const : 'horizontal' as const,
      bestseller: Boolean(course.is_featured),
      currency: 'VND' as const,
      showWishlist: true,
      showAddToCart: true,
      discountEndDate: hasDiscount ? course.discount_end_date : undefined,
    }
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar */}
            <Avatar className="w-32 h-32">
              <AvatarImage src={instructor.user.avatar || undefined} />
              <AvatarFallback className="text-3xl">
                {getInitials(instructor.user.full_name)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl mb-2">{instructor.user.full_name}</h1>
                <p className="text-muted-foreground text-lg">{instructor.specialization || ''}</p>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{rating}</span>
                  <span className="text-muted-foreground">Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">{formatStudentCount(instructor.total_students)}</span>
                  <span className="text-muted-foreground">Hoc vien</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span className="font-medium">{instructor.total_courses}</span>
                  <span className="text-muted-foreground">Khoa hoc</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  <span className="font-medium">{followersCount}</span>
                  <span className="text-muted-foreground">Nguoi theo doi</span>
                </div>
              </div>

              {/* Follow Button */}
              <div className="flex gap-3">
                <Button 
                  onClick={handleFollowClick}
                  variant={following ? 'outline' : 'default'}
                >
                  {following ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Dang theo doi
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Theo doi
                    </>
                  )}
                </Button>
                {user?.id !== instructor.user.id && (
                  <Button variant="outline" onClick={() => void handleMessageInstructor()}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Nhan tin
                  </Button>
                )}
              </div>

              {/* Social Links */}
              {Object.keys(socialLinks).length > 0 && (
                <div className="flex gap-3">
                  {socialLinks.website && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={socialLinks.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-5 h-5" />
                      </a>
                    </Button>
                  )}
                  {socialLinks.twitter && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                        <Twitter className="w-5 h-5" />
                      </a>
                    </Button>
                  )}
                  {socialLinks.linkedin && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-5 h-5" />
                      </a>
                    </Button>
                  )}
                  {socialLinks.youtube && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer">
                        <Youtube className="w-5 h-5" />
                      </a>
                    </Button>
                  )}
                  {socialLinks.facebook && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="w-5 h-5" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Tong quan khoa hoc</p>
              <p className="text-3xl font-bold">{courses.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Khoa hoc dang hien thi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Danh gia trung binh</p>
              <p className="text-3xl font-bold">{reviews.length ? calcAverageRating(reviews).toFixed(1) : rating.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground mt-1">{reviews.length} danh gia cong khai</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Nguoi hoc</p>
              <p className="text-3xl font-bold">{formatStudentCount(instructor.total_students)}</p>
              <p className="text-sm text-muted-foreground mt-1">Tong hoc vien da hoc voi giang vien</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'about' | 'courses' | 'reviews')} className="space-y-6">
          <TabsList>
            <TabsTrigger value="about">Gioi thieu</TabsTrigger>
            <TabsTrigger value="courses">Khoa hoc ({courses.length})</TabsTrigger>
            <TabsTrigger value="reviews">Danh gia ({reviews.length})</TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ve toi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {instructor.bio || 'Chua co thong tin gioi thieu.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {instructor.experience != null && (
                    <div>
                      <p className="text-sm text-muted-foreground">Kinh nghiem</p>
                      <p className="font-medium">{instructor.experience} nam</p>
                    </div>
                  )}
                  {instructor.qualification && (
                    <div>
                      <p className="text-sm text-muted-foreground">Trinh do</p>
                      <p className="font-medium">{instructor.qualification}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Danh sach khoa hoc</h2>
                <p className="text-sm text-muted-foreground">Tat ca khoa hoc cong khai cua giang vien</p>
              </div>
              <ToggleGroup
                type="single"
                value={courseViewMode}
                onValueChange={(value) => {
                  if (value === 'grid' || value === 'list') setCourseViewMode(value)
                }}
                variant="outline"
              >
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Card>
              <CardContent className="p-4 grid gap-3 md:grid-cols-4">
                <input
                  value={courseQuery}
                  onChange={(e) => setCourseQuery(e.target.value)}
                  placeholder="Tim khoa hoc..."
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                />
                <select
                  value={courseLevel}
                  onChange={(e) => setCourseLevel(e.target.value as 'all' | 'beginner' | 'intermediate' | 'advanced' | 'all_levels')}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Tat ca cap do</option>
                  <option value="beginner">Nguoi moi</option>
                  <option value="intermediate">Trung cap</option>
                  <option value="advanced">Nang cao</option>
                  <option value="all_levels">Tat ca trinh do</option>
                </select>
                <select
                  value={coursePriceFilter}
                  onChange={(e) => setCoursePriceFilter(e.target.value as 'all' | 'free' | 'paid')}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Tat ca muc gia</option>
                  <option value="free">Mien phi</option>
                  <option value="paid">Tra phi</option>
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowUpDown className="h-4 w-4" />
                  <select
                    value={courseSort}
                    onChange={(e) => setCourseSort(e.target.value as 'featured' | 'rating' | 'students' | 'newest')}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="featured">Noi bat</option>
                    <option value="rating">Danh gia cao</option>
                    <option value="students">Dong hoc vien</option>
                    <option value="newest">Moi nhat</option>
                  </select>
                </label>
              </CardContent>
            </Card>
            <div className="text-sm text-muted-foreground">
              Hien {paginatedCourses.length} / {sortedCourses.length} khoa hoc
            </div>
            {sortedCourses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="mb-2">Khong co khoa hoc phu hop</h3>
              </div>
            ) : (
              <div className={courseViewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {courseCardData.map((course) => (
                  <CourseCard key={course.id} {...course} />
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <UserPagination currentPage={coursesPage} totalPages={courseTotalPages} onPageChange={setCoursesPage} />
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Danh gia tu hoc vien</h2>
                <p className="text-sm text-muted-foreground">Nhan xet cong khai ve cac khoa hoc cua giang vien</p>
              </div>
              <div className="text-sm text-muted-foreground">
                Hien {paginatedReviews.length} / {sortedReviews.length} danh gia
              </div>
            </div>
            <Card>
              <CardContent className="p-4 grid gap-3 md:grid-cols-3">
                <input
                  value={reviewQuery}
                  onChange={(e) => setReviewQuery(e.target.value)}
                  placeholder="Tim theo hoc vien, noi dung, khoa hoc..."
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                />
                <select
                  value={reviewRatingFilter}
                  onChange={(e) => setReviewRatingFilter(e.target.value as 'all' | '5' | '4' | '3' | '2' | '1')}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Tat ca so sao</option>
                  <option value="5">5 sao</option>
                  <option value="4">4 sao</option>
                  <option value="3">3 sao</option>
                  <option value="2">2 sao</option>
                  <option value="1">1 sao</option>
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowUpDown className="h-4 w-4" />
                  <select
                    value={reviewSort}
                    onChange={(e) => setReviewSort(e.target.value as 'newest' | 'highest' | 'lowest')}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="newest">Moi nhat</option>
                    <option value="highest">Diem cao truoc</option>
                    <option value="lowest">Diem thap truoc</option>
                  </select>
                </label>
              </CardContent>
            </Card>
            {sortedReviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="mb-2">Khong co danh gia phu hop</h3>
                <p className="text-muted-foreground">Thu doi bo loc hoac tu khoa tim kiem.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-4xl font-bold">{calcAverageRating(reviews).toFixed(1)}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.round(calcAverageRating(reviews))
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{reviews.length} danh gia</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Review list */}
                <div className="space-y-4">
                  {paginatedReviews.map((review) => (
                    <Card key={review.review_id}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={review.user_info?.avatar || undefined} />
                            <AvatarFallback className="text-sm">
                              {(review.user_info?.full_name || 'U').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{review.user_info?.full_name || 'Hoc vien'}</p>
                              <span className="text-xs text-muted-foreground">
                                {formatReviewDate(review.review_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            {review.course_detail && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Khoa hoc: {review.course_detail.title}
                              </p>
                            )}
                            <p className="text-sm mt-2 text-muted-foreground">{review.comment}</p>
                            {review.instructor_response && (
                              <div className="bg-muted/50 rounded-lg p-3 mt-3">
                                <p className="text-xs font-medium mb-1">Phan hoi tu giang vien:</p>
                                <p className="text-sm text-muted-foreground">{review.instructor_response}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-end">
                  <UserPagination currentPage={reviewsPage} totalPages={reviewTotalPages} onPageChange={setReviewsPage} />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
