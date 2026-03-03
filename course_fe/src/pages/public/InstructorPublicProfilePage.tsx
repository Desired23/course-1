import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
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
} from 'lucide-react'
import { useRouter } from '../../components/Router'
import { useFollow } from '../../contexts/FollowContext'
import { useAuth } from '../../contexts/AuthContext'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
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

  const instructorId = params?.instructorId || '1'
  const following = isFollowing(instructorId)
  const followersCount = getFollowersCount(instructorId)

  const [instructor, setInstructor] = useState<Instructor | null>(null)
  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <Tabs defaultValue="about" className="space-y-6">
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
          <TabsContent value="courses">
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="mb-2">Chua co khoa hoc</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => {
                  const price = getEffectivePrice(course)
                  return (
                    <Card 
                      key={course.id} 
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/course/${course.id}`)}
                    >
                      <div className="relative">
                        <ImageWithFallback
                          src={course.thumbnail || ''}
                          alt={course.title}
                          className="w-full h-48 object-cover"
                        />
                        {course.is_featured && (
                          <Badge className="absolute top-2 left-2">Bestseller</Badge>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-medium line-clamp-2">{course.title}</h3>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{course.rating || '0'}</span>
                          </div>
                          <span className="text-muted-foreground">
                            ({(course.total_reviews || 0).toLocaleString()})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{(course.enrollment_count || 0).toLocaleString()} hoc vien</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{getLevelLabel(course.level)}</span>
                        </div>
                        <div className="pt-2">
                          <span className="text-2xl font-bold">{formatPrice(price)}</span>
                          {course.discount_price && price !== parseFloat(String(course.original_price)) && (
                            <span className="text-sm text-muted-foreground line-through ml-2">
                              {formatPrice(parseFloat(String(course.original_price)))}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="mb-2">Chua co danh gia</h3>
                <p className="text-muted-foreground">Giang vien nay chua co danh gia nao.</p>
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
                  {reviews.map((review) => (
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
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
