import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Flag,
  MessageSquare,
  MoreVertical,
  Star,
  ThumbsUp,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { TableFilter, type FilterConfig } from '../../components/FilterComponents'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Checkbox } from '../../components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Textarea } from '../../components/ui/textarea'
import { AdminBulkActionBar } from '../../components/admin/AdminBulkActionBar'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { useAuth } from '../../contexts/AuthContext'
import {
  deleteReview as deleteReviewApi,
  getAllReviews,
  moderateReview,
  updateReview,
} from '../../services/review.api'

type ReviewStatus = 'published' | 'pending' | 'flagged' | 'hidden'

interface ReviewRow {
  id: string
  user_id: string
  user_name: string
  user_avatar?: string
  course_title: string
  rating: number
  comment: string
  helpful_count: number
  reply_count: number
  status: ReviewStatus
  is_verified_purchase: boolean
  created_at: Date
  updated_at: Date
  flagged_reason?: string
  instructor_reply?: string
  instructor_reply_at?: Date
}

const mapStatus = (status: string, reportCount: number): ReviewStatus => {
  if (reportCount > 0) return 'flagged'
  if (status === 'approved') return 'published'
  if (status === 'rejected') return 'hidden'
  return 'pending'
}

export function ReviewManagementPage() {
  const { hasPermission } = useAuth()
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [filteredReviews, setFilteredReviews] = useState<ReviewRow[]>([])
  const [selectedReview, setSelectedReview] = useState<ReviewRow | null>(null)
  const [replyText, setReplyText] = useState('')
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([])
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
    loading: boolean
    action: null | (() => Promise<void>)
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    destructive: false,
    loading: false,
    action: null,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllReviews()
        const mapped = data.map<ReviewRow>((review) => ({
          id: String(review.review_id),
          user_id: String(review.user),
          user_name: review.user_info?.full_name || 'Unknown',
          user_avatar: review.user_info?.avatar || undefined,
          course_title: review.course_detail?.title || 'Unknown',
          rating: review.rating,
          comment: review.comment || '',
          helpful_count: review.likes || 0,
          reply_count: review.instructor_response ? 1 : 0,
          status: mapStatus(review.status, review.report_count),
          is_verified_purchase: true,
          created_at: new Date(review.review_date),
          updated_at: new Date(review.updated_date),
          flagged_reason: review.report_count > 0
            ? (review.last_report_reason || `${review.report_count} bao cao`)
            : undefined,
          instructor_reply: review.instructor_response || undefined,
          instructor_reply_at: review.response_date ? new Date(review.response_date) : undefined,
        }))
        setReviews(mapped)
        setFilteredReviews(mapped)
      } catch (error) {
        console.error('Failed to load reviews', error)
        toast.error('Khong tai duoc danh sach danh gia')
      }
    }

    void load()
  }, [])

  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'search',
      label: 'Tim kiem',
      type: 'search',
      placeholder: 'Tim theo hoc vien, khoa hoc, noi dung...',
    },
    {
      key: 'status',
      label: 'Trang thai',
      type: 'select',
      options: [
        { label: 'Da xuat ban', value: 'published', count: reviews.filter(r => r.status === 'published').length },
        { label: 'Cho duyet', value: 'pending', count: reviews.filter(r => r.status === 'pending').length },
        { label: 'Bi bao cao', value: 'flagged', count: reviews.filter(r => r.status === 'flagged').length },
        { label: 'Da an', value: 'hidden', count: reviews.filter(r => r.status === 'hidden').length },
      ],
    },
    {
      key: 'rating',
      label: 'Danh gia',
      type: 'select',
      options: [5, 4, 3, 2, 1].map((rating) => ({
        label: `${rating} sao`,
        value: String(rating),
        count: reviews.filter(r => r.rating === rating).length,
      })),
    },
    {
      key: 'verified',
      label: 'Da xac thuc',
      type: 'checkbox',
      placeholder: 'Chi hien thi review da mua khoa hoc',
    },
    {
      key: 'date',
      label: 'Ngay tao',
      type: 'daterange',
    },
  ], [reviews])

  const handleFilter = (filters: any) => {
    let next = reviews

    if (filters.search) {
      const query = filters.search.toLowerCase()
      next = next.filter(review =>
        review.user_name.toLowerCase().includes(query) ||
        review.course_title.toLowerCase().includes(query) ||
        review.comment.toLowerCase().includes(query)
      )
    }

    if (filters.status) {
      next = next.filter(review => review.status === filters.status)
    }

    if (filters.rating) {
      next = next.filter(review => review.rating === Number(filters.rating))
    }

    if (filters.verified) {
      next = next.filter(review => review.is_verified_purchase)
    }

    if (filters.date?.from || filters.date?.to) {
      const from = filters.date?.from ? new Date(filters.date.from) : new Date(0)
      const to = filters.date?.to ? new Date(filters.date.to) : new Date()
      next = next.filter(review => review.created_at >= from && review.created_at <= to)
    }

    setFilteredReviews(next)
  }

  const syncReview = (reviewId: string, updater: (review: ReviewRow) => ReviewRow | null) => {
    setReviews(prev => prev.map(item => item.id === reviewId ? updater(item) : item).filter(Boolean) as ReviewRow[])
    setFilteredReviews(prev => prev.map(item => item.id === reviewId ? updater(item) : item).filter(Boolean) as ReviewRow[])
  }

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void>,
    destructive = false
  ) => {
    setConfirmState({
      open: true,
      title,
      description,
      confirmLabel,
      destructive,
      loading: false,
      action,
    })
  }

  const runConfirmedAction = async () => {
    if (!confirmState.action) return
    try {
      setConfirmState(prev => ({ ...prev, loading: true }))
      await confirmState.action()
      setConfirmState({
        open: false,
        title: '',
        description: '',
        confirmLabel: 'Confirm',
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleStatusChange = async (reviewId: string, newStatus: 'published' | 'hidden') => {
    const targetReview = reviews.find(review => review.id === reviewId)
    if (!targetReview) return

    try {
      if (targetReview.status === 'flagged') {
        await moderateReview(Number(reviewId), {
          action: newStatus === 'published' ? 'approve' : 'hide',
        })
      } else {
        await updateReview(Number(reviewId), {
          status: newStatus === 'published' ? 'approved' : 'rejected',
        })
      }

      syncReview(reviewId, (review) => ({
        ...review,
        status: newStatus,
        flagged_reason: undefined,
        updated_at: new Date(),
      }))
      toast.success('Cap nhat trang thai thanh cong')
    } catch {
      toast.error('Cap nhat trang thai that bai')
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReviewApi(Number(reviewId))
      syncReview(reviewId, () => null)
      toast.success('Xoa danh gia thanh cong')
    } catch {
      toast.error('Xoa danh gia that bai')
    }
  }

  const handleReply = async (reviewId: string) => {
    const content = replyText.trim()
    if (!content) return

    try {
      await updateReview(Number(reviewId), { instructor_response: content })
      syncReview(reviewId, (review) => ({
        ...review,
        instructor_reply: content,
        instructor_reply_at: new Date(),
        reply_count: 1,
        updated_at: new Date(),
      }))
      setReplyText('')
      setSelectedReview(null)
      toast.success('Gui phan hoi thanh cong')
    } catch {
      toast.error('Gui phan hoi that bai')
    }
  }

  const getStatusBadge = (status: ReviewStatus) => {
    const variants = {
      published: { variant: 'default' as const, label: 'Da xuat ban' },
      pending: { variant: 'secondary' as const, label: 'Cho duyet' },
      flagged: { variant: 'destructive' as const, label: 'Bi bao cao' },
      hidden: { variant: 'outline' as const, label: 'Da an' },
    }
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </div>
  )

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter(review => review.rating === rating).length
    return {
      rating,
      count,
      percentage: reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0,
    }
  })

  const toggleReviewSelection = (reviewId: string, checked: boolean) => {
    setSelectedReviewIds(prev => checked ? [...prev, reviewId] : prev.filter(id => id !== reviewId))
  }

  const toggleAllFilteredReviews = (checked: boolean) => {
    setSelectedReviewIds(checked ? filteredReviews.map(review => review.id) : [])
  }

  const bulkUpdateReviews = async (
    ids: string[],
    updater: (reviewId: string) => Promise<void>,
    successMessage: string
  ) => {
    try {
      for (const id of ids) {
        await updater(id)
      }
      setSelectedReviewIds([])
      toast.success(successMessage)
    } catch {
      toast.error('Bulk moderation that bai')
    }
  }

  if (!hasPermission('admin.reviews.manage')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Khong co quyen truy cap</h2>
          <p className="text-muted-foreground">Ban khong co quyen quan ly danh gia.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">Quan ly danh gia</h1>
          <p className="text-muted-foreground">Moderation review cua hoc vien tren du lieu that.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tong danh gia</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reviews.length}</div>
            <p className="text-xs text-muted-foreground">{reviews.filter(r => r.is_verified_purchase).length} da xac thuc</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Danh gia trung binh</CardTitle>
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{averageRating}</div>
            <div className="mt-1">{renderStars(Math.round(Number(averageRating)))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cho duyet</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reviews.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Can review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bi bao cao</CardTitle>
            <Flag className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reviews.filter(r => r.status === 'flagged').length}</div>
            <p className="text-xs text-muted-foreground">Dang can moderation</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">Tat ca ({reviews.length})</TabsTrigger>
          <TabsTrigger value="pending">Cho duyet ({reviews.filter(r => r.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="flagged">Bi bao cao ({reviews.filter(r => r.status === 'flagged').length})</TabsTrigger>
          <TabsTrigger value="stats">Thong ke</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <TableFilter title="Bo loc danh gia" configs={filterConfigs} onFilterChange={handleFilter} />

          <AdminBulkActionBar
            count={selectedReviewIds.length}
            label="reviews selected"
            onClear={() => setSelectedReviewIds([])}
            actions={[
              {
                key: 'publish',
                label: 'Publish',
                onClick: () => openConfirm(
                  'Publish selected reviews',
                  `Publish ${selectedReviewIds.length} selected reviews?`,
                  'Publish',
                  () => bulkUpdateReviews(selectedReviewIds, (id) => handleStatusChange(id, 'published'), 'Da xuat ban review da chon'),
                ),
              },
              {
                key: 'hide',
                label: 'Hide',
                destructive: true,
                onClick: () => openConfirm(
                  'Hide selected reviews',
                  `Hide ${selectedReviewIds.length} selected reviews?`,
                  'Hide',
                  () => bulkUpdateReviews(selectedReviewIds, (id) => handleStatusChange(id, 'hidden'), 'Da an review da chon'),
                  true,
                ),
              },
              {
                key: 'delete',
                label: 'Delete',
                destructive: true,
                onClick: () => openConfirm(
                  'Delete selected reviews',
                  `Delete ${selectedReviewIds.length} selected reviews? This action cannot be undone.`,
                  'Delete',
                  () => bulkUpdateReviews(selectedReviewIds, handleDeleteReview, 'Da xoa review da chon'),
                  true,
                ),
              },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle>Danh sach danh gia ({filteredReviews.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[48px]">
                      <Checkbox
                        checked={filteredReviews.length > 0 && selectedReviewIds.length === filteredReviews.length}
                        onCheckedChange={(checked) => toggleAllFilteredReviews(Boolean(checked))}
                      />
                    </TableHead>
                    <TableHead>Hoc vien</TableHead>
                    <TableHead>Khoa hoc</TableHead>
                    <TableHead>Danh gia</TableHead>
                    <TableHead>Noi dung</TableHead>
                    <TableHead>Huu ich</TableHead>
                    <TableHead>Trang thai</TableHead>
                    <TableHead>Ngay tao</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedReviewIds.includes(review.id)}
                          onCheckedChange={(checked) => toggleReviewSelection(review.id, Boolean(checked))}
                        />
                      </TableCell>
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
                                Da mua
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{review.course_title}</TableCell>
                      <TableCell>
                        <div>
                          {renderStars(review.rating)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm line-clamp-2 max-w-xs">{review.comment || 'Khong co noi dung'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{review.helpful_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(review.status)}</TableCell>
                      <TableCell className="text-sm">{review.created_at.toLocaleDateString('vi-VN')}</TableCell>
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
                              Xem chi tiet
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {review.status !== 'published' && (
                              <DropdownMenuItem onClick={() => openConfirm(
                                'Publish review',
                                `Publish review from ${review.user_name}?`,
                                'Publish',
                                () => handleStatusChange(review.id, 'published'),
                              )}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Xuat ban
                              </DropdownMenuItem>
                            )}
                            {review.status !== 'hidden' && (
                              <DropdownMenuItem onClick={() => openConfirm(
                                'Hide review',
                                `Hide review from ${review.user_name}?`,
                                'Hide',
                                () => handleStatusChange(review.id, 'hidden'),
                                true,
                              )}>
                                <XCircle className="h-4 w-4 mr-2" />
                                An danh gia
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-red-600" onClick={() => openConfirm(
                              'Delete review',
                              `Delete review from ${review.user_name}? This action cannot be undone.`,
                              'Delete',
                              () => handleDeleteReview(review.id),
                              true,
                            )}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xoa vinh vien
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

        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Danh gia cho duyet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.filter(r => r.status === 'pending').map((review) => (
                <div key={review.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="font-medium">{review.user_name}</p>
                      <p className="text-sm text-muted-foreground">{review.course_title}</p>
                      <div>{renderStars(review.rating)}</div>
                      <p className="text-sm">{review.comment || 'Khong co noi dung'}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={() => openConfirm(
                        'Publish review',
                        `Publish review from ${review.user_name}?`,
                        'Publish',
                        () => handleStatusChange(review.id, 'published'),
                      )}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Duyet
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openConfirm(
                        'Hide review',
                        `Hide review from ${review.user_name}?`,
                        'Hide',
                        () => handleStatusChange(review.id, 'hidden'),
                        true,
                      )}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Tu choi
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flagged" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Danh gia bi bao cao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.filter(r => r.status === 'flagged').map((review) => (
                <div key={review.id} className="p-4 border border-red-200 rounded-lg bg-red-50/60 dark:border-red-900 dark:bg-red-950/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Flag className="h-4 w-4 text-red-600" />
                        <Badge variant="destructive">Bi bao cao</Badge>
                        {review.flagged_reason && (
                          <span className="text-xs text-muted-foreground">- {review.flagged_reason}</span>
                        )}
                      </div>
                      <p className="font-medium">{review.user_name}</p>
                      <p className="text-sm text-muted-foreground">{review.course_title}</p>
                      <div>{renderStars(review.rating)}</div>
                      <p className="text-sm">{review.comment || 'Khong co noi dung'}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={() => openConfirm(
                        'Keep review published',
                        `Keep review from ${review.user_name} visible?`,
                        'Keep visible',
                        () => handleStatusChange(review.id, 'published'),
                      )}>
                        Giu lai
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openConfirm(
                        'Hide flagged review',
                        `Hide flagged review from ${review.user_name}?`,
                        'Hide',
                        () => handleStatusChange(review.id, 'hidden'),
                        true,
                      )}>
                        An di
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openConfirm(
                        'Delete flagged review',
                        `Delete review from ${review.user_name}? This action cannot be undone.`,
                        'Delete',
                        () => handleDeleteReview(review.id),
                        true,
                      )}>
                        Xoa
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Phan bo danh gia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ratingDistribution.map(({ rating, count, percentage }) => (
                  <div key={rating} className="flex items-center gap-4">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm">{rating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="w-12 text-right text-sm">{count}</span>
                    <span className="w-12 text-right text-sm text-muted-foreground">{percentage}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chi so moderation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Review da xuat ban</span>
                  <Badge variant="secondary">{reviews.filter(r => r.status === 'published').length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Review cho duyet</span>
                  <Badge variant="secondary">{reviews.filter(r => r.status === 'pending').length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Review bi bao cao</span>
                  <Badge variant="secondary">{reviews.filter(r => r.status === 'flagged').length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Review da an</span>
                  <Badge variant="secondary">{reviews.filter(r => r.status === 'hidden').length}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {selectedReview && (
        <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chi tiet danh gia</DialogTitle>
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
                        Da mua khoa hoc
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedReview.created_at.toLocaleString('vi-VN')}</p>
                </div>
                {getStatusBadge(selectedReview.status)}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Khoa hoc</p>
                <p className="font-medium">{selectedReview.course_title}</p>
              </div>

              {selectedReview.flagged_reason && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Ly do bao cao</p>
                  <Badge variant="destructive">{selectedReview.flagged_reason}</Badge>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Danh gia</p>
                {renderStars(selectedReview.rating)}
                <p className="text-sm mt-2">{selectedReview.comment || 'Khong co noi dung'}</p>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedReview.helpful_count} huu ich</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedReview.reply_count} phan hoi</span>
                </div>
              </div>

              {selectedReview.instructor_reply ? (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Phan hoi tu giang vien</p>
                  <p className="text-sm">{selectedReview.instructor_reply}</p>
                  {selectedReview.instructor_reply_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedReview.instructor_reply_at.toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Phan hoi voi danh gia</p>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhap phan hoi cua ban..."
                    rows={3}
                  />
                  <Button onClick={() => void handleReply(selectedReview.id)} disabled={!replyText.trim()}>
                    Gui phan hoi
                  </Button>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {selectedReview.status !== 'published' && (
                  <Button onClick={() => {
                    void handleStatusChange(selectedReview.id, 'published')
                    setSelectedReview(null)
                  }}>
                    Xuat ban
                  </Button>
                )}
                {selectedReview.status !== 'hidden' && (
                  <Button variant="outline" onClick={() => {
                    void handleStatusChange(selectedReview.id, 'hidden')
                    setSelectedReview(null)
                  }}>
                    An danh gia
                  </Button>
                )}
                <Button variant="destructive" onClick={() => {
                  void handleDeleteReview(selectedReview.id)
                  setSelectedReview(null)
                }}>
                  Xoa vinh vien
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AdminConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        loading={confirmState.loading}
        onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}
        onConfirm={runConfirmedAction}
      />
    </div>
  )
}
