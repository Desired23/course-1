import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Separator } from '../../components/ui/separator'
import { Progress } from '../../components/ui/progress'
import { 
  ArrowLeft, 
  Users, 
  Star, 
  Clock, 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  MessageCircle,
  Download,
  Edit,
  Trash2,
  MoreVertical,
  PlayCircle,
  BookOpen,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { getCourseById as getCourseByIdApi, updateCourse as updateCourseApi, deleteCourse as deleteCourseApi } from '../../services/course.api'
import { getAllReviewsByCourse } from '../../services/review.api'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../../components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface CourseDetail {
  id: string
  title: string
  description: string
  instructor: {
    id: string
    name: string
    avatar: string
    email: string
    bio: string
    total_courses: number
    total_students: number
    rating: number
  }
  category: string
  subcategory: string
  level: string
  language: string
  price: number
  discounted_price?: number
  thumbnail: string
  preview_video?: string
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived'
  created_at: Date
  updated_at: Date
  published_at?: Date
  last_activity: Date
  
  // Statistics
  stats: {
    total_students: number
    total_revenue: number
    total_lessons: number
    total_duration: number // in minutes
    completion_rate: number
    average_rating: number
    total_reviews: number
    refund_rate: number
    last_30_days: {
      enrollments: number
      revenue: number
      completion_rate: number
      avg_rating: number
    }
  }
  
  // Content structure
  sections: Array<{
    id: string
    title: string
    lessons: Array<{
      id: string
      title: string
      type: 'video' | 'text' | 'quiz'
      duration: number
      is_preview: boolean
      views: number
      completion_rate: number
    }>
  }>
  
  // Reviews and feedback
  reviews: Array<{
    id: string
    student_name: string
    student_avatar: string
    rating: number
    comment: string
    created_at: Date
    is_featured: boolean
  }>
  
  // Enrollment and revenue data
  enrollment_data: Array<{
    date: string
    enrollments: number
    revenue: number
  }>
  
  // Student progress data
  progress_data: Array<{
    completion_percentage: number
    student_count: number
  }>
}



export function AdminCourseDetailPage() {
  const { navigate, currentRoute } = useRouter()
  const { hasPermission } = useAuth()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  
  // Extract course ID from URL
  const courseId = currentRoute.split('/admin/courses/')[1]

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const numId = Number(courseId)
        if (!numId) return
        const [courseData, reviewsData] = await Promise.all([
          getCourseByIdApi(numId),
          getAllReviewsByCourse(numId).catch(() => [] as any[])
        ])
        const mapped: CourseDetail = {
          id: String(courseData.id),
          title: courseData.title,
          description: courseData.description || '',
          instructor: {
            id: String(courseData.instructor?.instructor_id || ''),
            name: courseData.instructor?.full_name || 'Unknown',
            avatar: courseData.instructor?.avatar || '',
            email: '',
            bio: courseData.instructor?.bio || '',
            total_courses: courseData.instructor?.total_courses || 0,
            total_students: courseData.instructor?.total_students || 0,
            rating: Number(courseData.instructor?.rating || 0)
          },
          category: courseData.category?.name || '',
          subcategory: courseData.subcategory?.name || '',
          level: courseData.level === 'all_levels' ? 'All Levels' : courseData.level,
          language: courseData.language,
          price: Number(courseData.price || 0),
          discounted_price: courseData.discount_price ? Number(courseData.discount_price) : undefined,
          thumbnail: courseData.thumbnail || '',
          preview_video: courseData.promotional_video || undefined,
          status: courseData.status as any,
          created_at: new Date(courseData.created_at),
          updated_at: new Date(courseData.updated_at),
          published_at: courseData.published_date ? new Date(courseData.published_date) : undefined,
          last_activity: new Date(courseData.updated_at),
          stats: {
            total_students: courseData.total_students,
            total_revenue: Number(courseData.price || 0) * courseData.total_students,
            total_lessons: courseData.total_lessons,
            total_duration: courseData.duration || 0,
            completion_rate: 0,
            average_rating: Number(courseData.rating || 0),
            total_reviews: courseData.total_reviews,
            refund_rate: 0,
            last_30_days: { enrollments: 0, revenue: 0, completion_rate: 0, avg_rating: Number(courseData.rating || 0) }
          },
          sections: (courseData.modules || []).map(m => ({
            id: String(m.module_id),
            title: m.title,
            lessons: (m.lessons || []).map(l => ({
              id: String(l.lesson_id),
              title: l.title,
              type: (l.content_type === 'quiz' ? 'quiz' : l.content_type === 'text' ? 'text' : 'video') as 'video' | 'text' | 'quiz',
              duration: l.duration || 0,
              is_preview: l.is_free,
              views: 0,
              completion_rate: 0
            }))
          })),
          reviews: reviewsData.map(r => ({
            id: String(r.review_id),
            student_name: r.user_info?.full_name || 'Ẩn danh',
            student_avatar: r.user_info?.avatar || '',
            rating: r.rating,
            comment: r.comment || '',
            created_at: new Date(r.review_date),
            is_featured: false
          })),
          enrollment_data: [],
          progress_data: []
        }
        setCourse(mapped)
      } catch (err) {
        console.error('Failed to fetch course:', err)
        toast.error('Không thể tải thông tin khóa học')
      }
    }
    fetchCourseData()
  }, [courseId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-500',
      pending: 'bg-yellow-500',
      published: 'bg-green-500',
      rejected: 'bg-red-500',
      archived: 'bg-gray-400'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-500'
  }
  const collectAdminStatusMeta = (targetStatusLabel: string) => {
    const reason = window.prompt(`Reason for changing status to "${targetStatusLabel}" (optional):`, '') || ''
    const sendNotification = window.confirm('Send notification to instructor?')
    let notifyMessage = ''
    if (sendNotification) {
      notifyMessage = window.prompt('Notification message (leave blank to use default):', '') || ''
    }
    return {
      status_reason: reason || undefined,
      send_notification: sendNotification,
      notify_message: notifyMessage || undefined,
    }
  }
  const handleCourseAction = async (action: string) => {
    const numId = Number(courseId)
    if (!numId) return
    try {
      if (action === 'approve') {
        const meta = collectAdminStatusMeta('published')
        await updateCourseApi(numId, { status: 'published', ...meta })
        toast.success('Đã phê duyệt khóa học')
      } else if (action === 'reject') {
        const meta = collectAdminStatusMeta('rejected')
        await updateCourseApi(numId, { status: 'rejected', ...meta })
        toast.success('Đã từ chối khóa học')
      } else if (action === 'archive') {
        const meta = collectAdminStatusMeta('archived')
        await updateCourseApi(numId, { status: 'archived', ...meta })
        toast.success('Đã lưu trữ khóa học')
      } else if (action === 'delete') {
        await deleteCourseApi(numId)
        toast.success('Đã xóa khóa học')
        navigate('/admin')
        return
      } else if (action === 'edit') {
        navigate(`/admin/courses/${courseId}/edit`)
        return
      }
      // Re-fetch after status change
      const courseData = await getCourseByIdApi(numId)
      setCourse(prev => prev ? { ...prev, status: courseData.status as any } : prev)
    } catch (err) {
      toast.error('Thao tác thất bại')
    }
  }

  if (!hasPermission('admin.courses.manage')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Không có quyền truy cập</h2>
          <p className="text-muted-foreground">Bạn không có quyền quản lý khóa học.</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Khóa học không tìm thấy</h2>
          <Button onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại Admin
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/admin')}>Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/admin')}>Khóa học</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{course.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-6">
            <img 
              src={course.thumbnail} 
              alt={course.title}
              className="w-32 h-24 object-cover rounded-lg"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge 
                  className={`${getStatusColor(course.status)} text-white`}
                >
                  {course.status}
                </Badge>
                <Badge variant="outline">{course.category}</Badge>
                <Badge variant="secondary">{course.level}</Badge>
              </div>
              <h1 className="text-3xl mb-2">{course.title}</h1>
              <p className="text-muted-foreground mb-4 line-clamp-2">{course.description}</p>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {course.stats.total_students.toLocaleString()} học viên
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {course.stats.average_rating} ({course.stats.total_reviews.toLocaleString()})
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(course.stats.total_duration)}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {course.stats.total_lessons} bài học
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/course/${course.id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              Xem khóa học
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleCourseAction('edit')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </DropdownMenuItem>
                {course.status === 'pending' && (
                  <>
                    <DropdownMenuItem onClick={() => handleCourseAction('approve')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Phê duyệt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCourseAction('reject')}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Từ chối
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleCourseAction('archive')}>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Lưu trữ
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => handleCourseAction('delete')}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa khóa học
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{formatCurrency(course.stats.total_revenue)}</div>
              <p className="text-xs text-muted-foreground">
                30 ngày qua: {formatCurrency(course.stats.last_30_days.revenue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Học viên</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{course.stats.total_students.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                30 ngày qua: +{course.stats.last_30_days.enrollments.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tỷ lệ hoàn thành</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{course.stats.completion_rate}%</div>
              <Progress value={course.stats.completion_rate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đánh giá</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{course.stats.average_rating}/5</div>
              <p className="text-xs text-muted-foreground">
                {course.stats.total_reviews.toLocaleString()} đánh giá
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="content">Nội dung</TabsTrigger>
            <TabsTrigger value="students">Học viên</TabsTrigger>
            <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
            <TabsTrigger value="instructor">Giảng viên</TabsTrigger>
            <TabsTrigger value="analytics">Phân tích</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Course Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin khóa học</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Danh mục:</span>
                      <p>{course.category} / {course.subcategory}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cấp độ:</span>
                      <p>{course.level}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ngôn ngữ:</span>
                      <p>{course.language}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Giá:</span>
                      <p>{formatCurrency(course.price)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ngày tạo:</span>
                      <p>{course.created_at.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ngày xuất bản:</span>
                      <p>{course.published_at?.toLocaleDateString() || 'Chưa xuất bản'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enrollment Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Lượt đăng ký 7 ngày qua</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={course.enrollment_data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="enrollments" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Progress Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Phân bố tiến độ học tập</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={course.progress_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="completion_percentage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="student_count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cấu trúc khóa học</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {course.sections.map((section, sectionIndex) => (
                    <div key={section.id} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-4">
                        {sectionIndex + 1}. {section.title}
                      </h4>
                      <div className="space-y-2">
                        {section.lessons.map((lesson, lessonIndex) => (
                          <div key={lesson.id} className="flex items-center justify-between p-2 rounded border">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">
                                {sectionIndex + 1}.{lessonIndex + 1}
                              </span>
                              <PlayCircle className="h-4 w-4 text-muted-foreground" />
                              <span>{lesson.title}</span>
                              {lesson.is_preview && (
                                <Badge variant="outline" className="text-xs">Preview</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatDuration(lesson.duration)}</span>
                              <span>{lesson.views.toLocaleString()} views</span>
                              <span>{lesson.completion_rate}% hoàn thành</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Danh sách học viên</CardTitle>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Xuất danh sách
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Học viên</TableHead>
                      <TableHead>Ngày đăng ký</TableHead>
                      <TableHead>Tiến độ</TableHead>
                      <TableHead>Thời gian học</TableHead>
                      <TableHead>Đánh giá</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>JD</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">John Doe</p>
                            <p className="text-sm text-muted-foreground">john@example.com</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>15/01/2024</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={75} className="w-20" />
                          <span className="text-xs text-muted-foreground">75%</span>
                        </div>
                      </TableCell>
                      <TableCell>23h 45m</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>4.5</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {/* More student rows would be here */}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Đánh giá từ học viên</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {course.reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={review.student_avatar} />
                            <AvatarFallback>{review.student_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{review.student_name}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {review.created_at.toLocaleDateString()}
                              </span>
                              {review.is_featured && (
                                <Badge variant="outline" className="text-xs">Featured</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Instructor Tab */}
          <TabsContent value="instructor" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin giảng viên</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={course.instructor.avatar} />
                    <AvatarFallback>{course.instructor.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-medium">{course.instructor.name}</h3>
                    <p className="text-muted-foreground mb-4">{course.instructor.email}</p>
                    <p className="text-sm mb-4">{course.instructor.bio}</p>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tổng khóa học:</span>
                        <p className="font-medium">{course.instructor.total_courses}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tổng học viên:</span>
                        <p className="font-medium">{course.instructor.total_students.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Đánh giá:</span>
                        <p className="font-medium">{course.instructor.rating}/5</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Doanh thu 7 ngày qua</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={course.enrollment_data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Line type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Chỉ số hiệu suất</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Tỷ lệ hoàn thành:</span>
                    <span className="font-medium">{course.stats.completion_rate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tỷ lệ hoàn tiền:</span>
                    <span className="font-medium text-red-500">{course.stats.refund_rate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Đánh giá trung bình:</span>
                    <span className="font-medium">{course.stats.average_rating}/5</span>
                  </div>
                  <Separator />
                  <div className="text-sm text-muted-foreground">
                    <p>Khóa học này có hiệu suất tốt với tỷ lệ hoàn thành cao và ít hoàn tiền.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
