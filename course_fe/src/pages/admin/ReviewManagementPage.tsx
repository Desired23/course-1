import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Textarea } from '../../components/ui/textarea'
import { TableFilter, FilterConfig } from '../../components/FilterComponents'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { 
  Star, 
  ThumbsUp,
  MessageSquare, 
  Flag,
  MoreVertical,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter as FilterIcon
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { toast } from 'sonner'
import { getAllReviews, updateReview, deleteReview as deleteReviewApi } from '../../services/review.api'

interface Review {
  id: string
  user_id: string
  user_name: string
  user_avatar?: string
  course_id: string
  course_title: string
  course_thumbnail?: string
  instructor_name: string
  rating: number
  title: string
  comment: string
  helpful_count: number
  reply_count: number
  status: 'published' | 'pending' | 'flagged' | 'hidden'
  is_verified_purchase: boolean
  created_at: Date
  updated_at: Date
  flagged_reason?: string
  instructor_reply?: string
  instructor_reply_at?: Date
}



export function ReviewManagementPage() {
  const { user, hasPermission } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([])
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllReviews()
        const mapped: Review[] = data.map(r => {
          const statusMap: Record<string, Review['status']> = {
            approved: 'published',
            pending: 'pending',
            rejected: 'hidden'
          }
          return {
            id: String(r.review_id),
            user_id: String(r.user),
            user_name: r.user_info?.full_name || 'Unknown',
            user_avatar: r.user_info?.avatar || undefined,
            course_id: String(r.course),
            course_title: r.course_detail?.title || 'Unknown',
            course_thumbnail: r.course_detail?.thumbnail || undefined,
            instructor_name: '',
            rating: r.rating,
            title: (r.comment || '').slice(0, 50),
            comment: r.comment || '',
            helpful_count: r.likes || 0,
            reply_count: r.instructor_response ? 1 : 0,
            status: statusMap[r.status] || 'pending',
            is_verified_purchase: true,
            created_at: new Date(r.review_date),
            updated_at: new Date(r.updated_date),
            flagged_reason: r.report_count > 0 ? `${r.report_count} báo cáo` : undefined,
            instructor_reply: r.instructor_response || undefined,
            instructor_reply_at: r.response_date ? new Date(r.response_date) : undefined
          }
        })
        setReviews(mapped)
        setFilteredReviews(mapped)
      } catch (e) {
        console.error('Failed to load reviews', e)
      }
    }
    load()
  }, [])

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: 'Tìm kiếm',
      type: 'search',
      placeholder: 'Tìm theo tên, khóa học, nội dung...'
    },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { label: 'Đã xuất bản', value: 'published', count: reviews.filter(r => r.status === 'published').length },
        { label: 'Chờ duyệt', value: 'pending', count: reviews.filter(r => r.status === 'pending').length },
        { label: 'Bị báo cáo', value: 'flagged', count: reviews.filter(r => r.status === 'flagged').length },
        { label: 'Đã ẩn', value: 'hidden', count: reviews.filter(r => r.status === 'hidden').length }
      ]
    },
    {
      key: 'rating',
      label: 'Đánh giá',
      type: 'select',
      options: [
        { label: '5 sao', value: '5', count: reviews.filter(r => r.rating === 5).length },
        { label: '4 sao', value: '4', count: reviews.filter(r => r.rating === 4).length },
        { label: '3 sao', value: '3', count: reviews.filter(r => r.rating === 3).length },
        { label: '2 sao', value: '2', count: reviews.filter(r => r.rating === 2).length },
        { label: '1 sao', value: '1', count: reviews.filter(r => r.rating === 1).length }
      ]
    },
    {
      key: 'verified',
      label: 'Đã xác thực',
      type: 'checkbox',
      placeholder: 'Chỉ hiển thị đánh giá đã mua khóa học'
    },
    {
      key: 'date',
      label: 'Ngày tạo',
      type: 'daterange'
    }
  ]

  const handleFilter = (filters: any) => {
    let filtered = reviews

    if (filters.search) {
      filtered = filtered.filter(review => 
        review.user_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        review.course_title.toLowerCase().includes(filters.search.toLowerCase()) ||
        review.comment.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters.status) {
      filtered = filtered.filter(review => review.status === filters.status)
    }

    if (filters.rating) {
      filtered = filtered.filter(review => review.rating === parseInt(filters.rating))
    }

    if (filters.verified) {
      filtered = filtered.filter(review => review.is_verified_purchase)
    }

    if (filters.date?.from || filters.date?.to) {
      filtered = filtered.filter(review => {
        const date = review.created_at
        const from = filters.date?.from ? new Date(filters.date.from) : new Date(0)
        const to = filters.date?.to ? new Date(filters.date.to) : new Date()
        return date >= from && date <= to
      })
    }

    setFilteredReviews(filtered)
  }

  const handleStatusChange = async (reviewId: string, newStatus: 'published' | 'hidden') => {
    try {
      const apiStatus = newStatus === 'published' ? 'approved' : 'rejected'
      await updateReview(Number(reviewId), { status: apiStatus })
      setReviews(prev => prev.map(review => 
        review.id === reviewId ? { ...review, status: newStatus } : review
      ))
      setFilteredReviews(prev => prev.map(review => 
        review.id === reviewId ? { ...review, status: newStatus } : review
      ))
      toast.success('Cập nhật trạng thái thành công')
    } catch (e) {
      toast.error('Cập nhật trạng thái thất bại')
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReviewApi(Number(reviewId))
      setReviews(prev => prev.filter(review => review.id !== reviewId))
      setFilteredReviews(prev => prev.filter(review => review.id !== reviewId))
      toast.success('Xóa đánh giá thành công')
    } catch (e) {
      toast.error('Xóa đánh giá thất bại')
    }
  }

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return
    try {
      await updateReview(Number(reviewId), { instructor_response: replyText })
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { 
              ...review, 
              instructor_reply: replyText,
              instructor_reply_at: new Date(),
              reply_count: review.reply_count + 1
            }
          : review
      ))
      setFilteredReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { 
              ...review, 
              instructor_reply: replyText,
              instructor_reply_at: new Date(),
              reply_count: review.reply_count + 1
            }
          : review
      ))
      setReplyText('')
      setSelectedReview(null)
      toast.success('Phản hồi thành công')
    } catch (e) {
      toast.error('Phản hồi thất bại')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      published: { variant: 'default' as const, label: 'Đã xuất bản' },
      pending: { variant: 'secondary' as const, label: 'Chờ duyệt' },
      flagged: { variant: 'destructive' as const, label: 'Bị báo cáo' },
      hidden: { variant: 'outline' as const, label: 'Đã ẩn' }
    }
    const config = variants[status as keyof typeof variants] || variants.published
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    )
  }

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === rating).length / reviews.length * 100).toFixed(0)
      : '0'
  }))

  if (!hasPermission('admin.reviews.manage')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Không có quyền truy cập</h2>
          <p className="text-muted-foreground">Bạn không có quyền quản lý đánh giá.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">Quản lý đánh giá</h1>
          <p className="text-muted-foreground">Quản lý và kiểm duyệt các đánh giá từ học viên</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đánh giá</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reviews.length}</div>
            <p className="text-xs text-muted-foreground">
              {reviews.filter(r => r.is_verified_purchase).length} đã xác thực
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đánh giá trung bình</CardTitle>
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{avgRating}</div>
            <div className="flex items-center gap-1 mt-1">
              {renderStars(Math.round(parseFloat(avgRating)))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reviews.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">
              Cần xem xét
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bị báo cáo</CardTitle>
            <Flag className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reviews.filter(r => r.status === 'flagged').length}</div>
            <p className="text-xs text-muted-foreground">
              Cần kiểm tra
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">Tất cả ({reviews.length})</TabsTrigger>
          <TabsTrigger value="pending">Chờ duyệt ({reviews.filter(r => r.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="flagged">Bị báo cáo ({reviews.filter(r => r.status === 'flagged').length})</TabsTrigger>
          <TabsTrigger value="stats">Thống kê</TabsTrigger>
        </TabsList>

        {/* All Reviews Tab */}
        <TabsContent value="all" className="space-y-6">
          <TableFilter
            title="Bộ lọc đánh giá"
            configs={filterConfigs}
            onFilterChange={handleFilter}
          />

          <Card>
            <CardHeader>
              <CardTitle>Danh sách đánh giá ({filteredReviews.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Học viên</TableHead>
                    <TableHead>Khóa học</TableHead>
                    <TableHead>Đánh giá</TableHead>
                    <TableHead>Nội dung</TableHead>
                    <TableHead>Hữu ích</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={review.user_avatar} />
                            <AvatarFallback>{review.user_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{review.user_name}</p>
                            {review.is_verified_purchase && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Đã mua
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{review.course_title}</p>
                          <p className="text-xs text-muted-foreground">{review.instructor_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {renderStars(review.rating)}
                          <p className="text-sm font-medium mt-1">{review.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm line-clamp-2 max-w-xs">{review.comment}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{review.helpful_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(review.status)}</TableCell>
                      <TableCell className="text-sm">{review.created_at.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedReview(review)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {review.status !== 'published' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(review.id, 'published')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Xuất bản
                              </DropdownMenuItem>
                            )}
                            {review.status !== 'hidden' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(review.id, 'hidden')}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Ẩn đánh giá
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteReview(review.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa vĩnh viễn
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Đánh giá chờ duyệt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviews.filter(r => r.status === 'pending').map((review) => (
                  <div key={review.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={review.user_avatar} />
                            <AvatarFallback>{review.user_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{review.user_name}</p>
                            <p className="text-xs text-muted-foreground">{review.created_at.toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{review.course_title}</p>
                        <div className="mb-2">{renderStars(review.rating)}</div>
                        <p className="font-medium mb-1">{review.title}</p>
                        <p className="text-sm">{review.comment}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleStatusChange(review.id, 'published')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Duyệt
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusChange(review.id, 'hidden')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flagged Tab */}
        <TabsContent value="flagged" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Đánh giá bị báo cáo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviews.filter(r => r.status === 'flagged').map((review) => (
                  <div key={review.id} className="p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Flag className="h-4 w-4 text-red-600" />
                          <Badge variant="destructive">Bị báo cáo</Badge>
                          {review.flagged_reason && (
                            <span className="text-xs text-muted-foreground">- {review.flagged_reason}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={review.user_avatar} />
                            <AvatarFallback>{review.user_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{review.user_name}</p>
                            <p className="text-xs text-muted-foreground">{review.created_at.toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{review.course_title}</p>
                        <div className="mb-2">{renderStars(review.rating)}</div>
                        <p className="font-medium mb-1">{review.title}</p>
                        <p className="text-sm">{review.comment}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleStatusChange(review.id, 'published')}
                        >
                          Giữ lại
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusChange(review.id, 'hidden')}
                        >
                          Ẩn đi
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteReview(review.id)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Phân bố đánh giá</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ratingDistribution.map(({ rating, count, percentage }) => (
                    <div key={rating} className="flex items-center gap-4">
                      <div className="flex items-center gap-1 w-16">
                        <span className="text-sm">{rating}</span>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-400 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{count}</span>
                      <span className="text-sm text-muted-foreground w-12 text-right">{percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top khóa học được đánh giá</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Complete Web Development Bootcamp 2024', 'Machine Learning A-Z', 'React - The Complete Guide'].map((course, idx) => {
                    const courseReviews = reviews.filter(r => r.course_title === course)
                    const avgRating = courseReviews.length > 0
                      ? (courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length).toFixed(1)
                      : '0.0'
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm line-clamp-1">{course}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(Math.round(parseFloat(avgRating)))}
                            <span className="text-sm text-muted-foreground">{avgRating}</span>
                          </div>
                        </div>
                        <Badge variant="secondary">{courseReviews.length} reviews</Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Detail Modal */}
      {selectedReview && (
        <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chi tiết đánh giá</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedReview.user_avatar} />
                  <AvatarFallback>{selectedReview.user_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{selectedReview.user_name}</p>
                    {selectedReview.is_verified_purchase && (
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Đã mua khóa học
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedReview.created_at.toLocaleString()}</p>
                </div>
                {getStatusBadge(selectedReview.status)}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Khóa học</p>
                <p className="font-medium">{selectedReview.course_title}</p>
                <p className="text-sm text-muted-foreground">Giảng viên: {selectedReview.instructor_name}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Đánh giá</p>
                {renderStars(selectedReview.rating)}
                <p className="font-medium mt-2">{selectedReview.title}</p>
                <p className="text-sm mt-1">{selectedReview.comment}</p>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedReview.helpful_count} người thấy hữu ích</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedReview.reply_count} phản hồi</span>
                </div>
              </div>

              {selectedReview.instructor_reply && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Phản hồi từ giảng viên</p>
                  <p className="text-sm">{selectedReview.instructor_reply}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedReview.instructor_reply_at?.toLocaleString()}
                  </p>
                </div>
              )}

              {!selectedReview.instructor_reply && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Phản hồi với đánh giá</p>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập phản hồi của bạn..."
                    rows={3}
                  />
                  <Button 
                    onClick={() => handleReply(selectedReview.id)}
                    disabled={!replyText.trim()}
                  >
                    Gửi phản hồi
                  </Button>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {selectedReview.status !== 'published' && (
                  <Button onClick={() => {
                    handleStatusChange(selectedReview.id, 'published')
                    setSelectedReview(null)
                  }}>
                    Xuất bản
                  </Button>
                )}
                {selectedReview.status !== 'hidden' && (
                  <Button variant="outline" onClick={() => {
                    handleStatusChange(selectedReview.id, 'hidden')
                    setSelectedReview(null)
                  }}>
                    Ẩn đánh giá
                  </Button>
                )}
                <Button 
                  variant="destructive"
                  onClick={() => {
                    handleDeleteReview(selectedReview.id)
                    setSelectedReview(null)
                  }}
                >
                  Xóa vĩnh viễn
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
