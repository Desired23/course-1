import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Separator } from '../../components/ui/separator'
import { Progress } from '../../components/ui/progress'
import { Checkbox } from '../../components/ui/checkbox'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [moderationState, setModerationState] = useState<{
    open: boolean
    nextStatus: 'published' | 'rejected' | 'archived'
    title: string
    description: string
    confirmLabel: string
    loading: boolean
  }>({
    open: false,
    nextStatus: 'published',
    title: '',
    description: '',
    confirmLabel: '',
    loading: false,
  })
  const [moderationReason, setModerationReason] = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [notifyMessage, setNotifyMessage] = useState('')
  
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
            name: courseData.instructor?.full_name || t('admin_courses.unknown'),
            avatar: courseData.instructor?.avatar || '',
            email: '',
            bio: courseData.instructor?.bio || '',
            total_courses: courseData.instructor?.total_courses || 0,
            total_students: courseData.instructor?.total_students || 0,
            rating: Number(courseData.instructor?.rating || 0)
          },
          category: courseData.category?.name || '',
          subcategory: courseData.subcategory?.name || '',
          level: courseData.level || 'all_levels',
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
            student_name: r.user_info?.full_name || t('admin_course_detail.anonymous_user'),
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
        toast.error(t('admin_course_detail.toasts.load_failed'))
      }
    }
    fetchCourseData()
  }, [courseId, t])

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

  const getStatusLabel = (status: CourseDetail['status']) => {
    switch (status) {
      case 'draft':
        return t('admin_courses.status_draft')
      case 'pending':
        return t('admin_courses.status_pending')
      case 'published':
        return t('admin_courses.status_published')
      case 'rejected':
        return t('admin_courses.status_rejected')
      case 'archived':
        return t('admin_course_detail.status.archived')
      default:
        return status
    }
  }

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner':
        return t('common.beginner')
      case 'intermediate':
        return t('common.intermediate')
      case 'advanced':
        return t('common.advanced')
      case 'all_levels':
        return t('common.all_levels')
      default:
        return level
    }
  }

  const openModerationDialog = (nextStatus: 'published' | 'rejected' | 'archived') => {
    setModerationReason('')
    setSendNotification(true)
    setNotifyMessage('')
    setModerationState({
      open: true,
      nextStatus,
      title:
        nextStatus === 'published'
          ? t('admin_course_detail.moderation.approve_title')
          : nextStatus === 'rejected'
            ? t('admin_course_detail.moderation.reject_title')
            : t('admin_course_detail.moderation.archive_title'),
      description:
        nextStatus === 'published'
          ? t('admin_course_detail.moderation.approve_description')
          : nextStatus === 'rejected'
            ? t('admin_course_detail.moderation.reject_description')
            : t('admin_course_detail.moderation.archive_description'),
      confirmLabel:
        nextStatus === 'published'
          ? t('admin_course_detail.moderation.approve_title')
          : nextStatus === 'rejected'
            ? t('admin_course_detail.moderation.reject_title')
            : t('admin_course_detail.moderation.archive_title'),
      loading: false,
    })
  }

  const submitModeration = async () => {
    const numId = Number(courseId)
    if (!numId) return
    try {
      setModerationState(prev => ({ ...prev, loading: true }))
      await updateCourseApi(numId, {
        status: moderationState.nextStatus,
        status_reason: moderationReason.trim() || undefined,
        send_notification: sendNotification,
        notify_message: sendNotification ? notifyMessage.trim() || undefined : undefined,
      })
      const courseData = await getCourseByIdApi(numId)
      setCourse(prev => prev ? { ...prev, status: courseData.status as any } : prev)
      setModerationState(prev => ({ ...prev, open: false, loading: false }))
      toast.success(t('admin_course_detail.toasts.status_updated'))
    } catch {
      setModerationState(prev => ({ ...prev, loading: false }))
      toast.error(t('admin_course_detail.toasts.action_failed'))
    }
  }

  const handleDeleteCourse = async () => {
    const numId = Number(courseId)
    if (!numId) return
    try {
      setIsDeleting(true)
      await deleteCourseApi(numId)
      toast.success(t('admin_courses.toasts.delete_success'))
      navigate('/admin/courses')
    } catch {
      setIsDeleting(false)
      toast.error(t('admin_courses.toasts.delete_failed'))
    }
  }
  const handleCourseAction = async (action: string) => {
    if (action === 'edit') {
      navigate(`/admin/courses/${courseId}/edit`)
    }
  }

  if (!hasPermission('admin.courses.manage')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">{t('admin_course_detail.no_access_title')}</h2>
          <p className="text-muted-foreground">{t('admin_course_detail.no_access_description')}</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">{t('admin_course_detail.not_found_title')}</h2>
          <Button onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('admin_course_detail.back_to_admin')}
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
              <BreadcrumbLink onClick={() => navigate('/admin')}>{t('common.admin')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/admin/courses')}>{t('admin_course_detail.breadcrumb_courses')}</BreadcrumbLink>
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
                  {getStatusLabel(course.status)}
                </Badge>
                <Badge variant="outline">{course.category}</Badge>
                <Badge variant="secondary">{getLevelLabel(course.level)}</Badge>
              </div>
              <h1 className="text-3xl mb-2">{course.title}</h1>
              <p className="text-muted-foreground mb-4 line-clamp-2">{course.description}</p>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {course.stats.total_students.toLocaleString()} {t('admin_course_detail.stats.students_suffix')}
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
                  {course.stats.total_lessons} {t('admin_course_detail.stats.lessons_suffix')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/course/${course.id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              {t('admin_course_detail.header.view_course')}
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
                  {t('admin_course_detail.header.edit_course')}
                </DropdownMenuItem>
                {course.status === 'pending' && (
                  <>
                    <DropdownMenuItem onClick={() => openModerationDialog('published')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('admin_course_detail.header.approve_course')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openModerationDialog('rejected')}>
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('admin_course_detail.header.reject_course')}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openModerationDialog('archived')}>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t('admin_course_detail.header.archive_course')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('admin_course_detail.header.delete_course')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_course_detail.stats.total_revenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{formatCurrency(course.stats.total_revenue)}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin_course_detail.stats.last_30_days', { value: formatCurrency(course.stats.last_30_days.revenue) })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_course_detail.stats.total_students')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{course.stats.total_students.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin_course_detail.stats.last_30_days_with_plus', { value: course.stats.last_30_days.enrollments.toLocaleString() })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_course_detail.stats.completion_rate')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{course.stats.completion_rate}%</div>
              <Progress value={course.stats.completion_rate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_course_detail.stats.reviews')}</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{course.stats.average_rating}/5</div>
              <p className="text-xs text-muted-foreground">
                {t('admin_course_detail.stats.reviews_count', { count: course.stats.total_reviews.toLocaleString() })}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">{t('admin_course_detail.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="content">{t('admin_course_detail.tabs.content')}</TabsTrigger>
            <TabsTrigger value="students">{t('admin_course_detail.tabs.students')}</TabsTrigger>
            <TabsTrigger value="reviews">{t('admin_course_detail.tabs.reviews')}</TabsTrigger>
            <TabsTrigger value="instructor">{t('admin_course_detail.tabs.instructor')}</TabsTrigger>
            <TabsTrigger value="analytics">{t('admin_course_detail.tabs.analytics')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Course Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin_course_detail.overview.course_info')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('admin_course_detail.overview.category')}:</span>
                      <p>{course.category} / {course.subcategory}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('admin_course_detail.overview.level')}:</span>
                      <p>{getLevelLabel(course.level)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('admin_course_detail.overview.language')}:</span>
                      <p>{course.language}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('admin_course_detail.overview.price')}:</span>
                      <p>{formatCurrency(course.price)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('admin_course_detail.overview.created_at')}:</span>
                      <p>{course.created_at.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('admin_course_detail.overview.published_at')}:</span>
                      <p>{course.published_at?.toLocaleDateString() || t('admin_course_detail.overview.unpublished')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enrollment Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin_course_detail.overview.enrollments_last_7_days')}</CardTitle>
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
                <CardTitle>{t('admin_course_detail.overview.progress_distribution')}</CardTitle>
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
                <CardTitle>{t('admin_course_detail.content.course_structure')}</CardTitle>
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
                                <Badge variant="outline" className="text-xs">{t('admin_course_detail.content.preview_badge')}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatDuration(lesson.duration)}</span>
                              <span>{t('admin_course_detail.content.views', { count: lesson.views.toLocaleString() })}</span>
                              <span>{t('admin_course_detail.content.completion_rate', { value: lesson.completion_rate })}</span>
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
                  <CardTitle>{t('admin_course_detail.students.title')}</CardTitle>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    {t('admin_course_detail.students.export')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin_course_detail.students.table.student')}</TableHead>
                      <TableHead>{t('admin_course_detail.students.table.enrolled_at')}</TableHead>
                      <TableHead>{t('admin_course_detail.students.table.progress')}</TableHead>
                      <TableHead>{t('admin_course_detail.students.table.study_time')}</TableHead>
                      <TableHead>{t('admin_course_detail.students.table.rating')}</TableHead>
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
                            <p className="font-medium">{t('admin_course_detail.students.sample_name')}</p>
                            <p className="text-sm text-muted-foreground">{t('admin_course_detail.students.sample_email')}</p>
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
                <CardTitle>{t('admin_course_detail.reviews.title')}</CardTitle>
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
                                <Badge variant="outline" className="text-xs">{t('admin_course_detail.reviews.featured')}</Badge>
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
                <CardTitle>{t('admin_course_detail.instructor.title')}</CardTitle>
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
                        <span className="text-muted-foreground">{t('admin_course_detail.instructor.total_courses')}:</span>
                        <p className="font-medium">{course.instructor.total_courses}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('admin_course_detail.instructor.total_students')}:</span>
                        <p className="font-medium">{course.instructor.total_students.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('admin_course_detail.instructor.rating')}:</span>
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
                  <CardTitle>{t('admin_course_detail.analytics.revenue_last_7_days')}</CardTitle>
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
                  <CardTitle>{t('admin_course_detail.analytics.performance_metrics')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>{t('admin_course_detail.analytics.completion_rate')}:</span>
                    <span className="font-medium">{course.stats.completion_rate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('admin_course_detail.analytics.refund_rate')}:</span>
                    <span className="font-medium text-red-500">{course.stats.refund_rate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('admin_course_detail.analytics.average_rating')}:</span>
                    <span className="font-medium">{course.stats.average_rating}/5</span>
                  </div>
                  <Separator />
                  <div className="text-sm text-muted-foreground">
                    <p>{t('admin_course_detail.analytics.summary')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        <Dialog
          open={moderationState.open}
          onOpenChange={(open) => {
            if (!moderationState.loading) {
              setModerationState(prev => ({ ...prev, open }))
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{moderationState.title}</DialogTitle>
              <DialogDescription>{moderationState.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course-detail-reason">{t('admin_course_detail.moderation.reason')}</Label>
                <Textarea
                  id="course-detail-reason"
                  value={moderationReason}
                  onChange={(event) => setModerationReason(event.target.value)}
                  placeholder={t('admin_course_detail.moderation.reason_placeholder')}
                  rows={4}
                />
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={sendNotification}
                  onCheckedChange={(checked) => setSendNotification(Boolean(checked))}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label htmlFor="course-detail-message">{t('admin_course_detail.moderation.send_notification')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('admin_course_detail.moderation.send_notification_hint')}
                  </p>
                </div>
              </div>
              {sendNotification && (
                <div className="space-y-2">
                  <Label htmlFor="course-detail-message">{t('admin_course_detail.moderation.notification_message')}</Label>
                  <Textarea
                    id="course-detail-message"
                    value={notifyMessage}
                    onChange={(event) => setNotifyMessage(event.target.value)}
                    placeholder={t('admin_course_detail.moderation.notification_placeholder')}
                    rows={3}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setModerationState(prev => ({ ...prev, open: false }))}
                disabled={moderationState.loading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant={moderationState.nextStatus === 'rejected' ? 'destructive' : 'default'}
                onClick={submitModeration}
                disabled={moderationState.loading}
              >
                {moderationState.loading ? t('admin_course_detail.moderation.saving') : moderationState.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AdminConfirmDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title={t('admin_course_detail.dialog.delete_title')}
          description={t('admin_course_detail.dialog.delete_description', { title: course.title })}
          confirmLabel={t('admin_course_detail.dialog.delete_confirm')}
          destructive
          loading={isDeleting}
          onConfirm={handleDeleteCourse}
        />
      </div>
    </div>
  )
}


