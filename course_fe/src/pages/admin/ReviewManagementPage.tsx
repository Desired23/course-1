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
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
    confirmLabel: '',
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
          user_name: review.user_info?.full_name || t('admin_reviews.unknown_user'),
          user_avatar: review.user_info?.avatar || undefined,
          course_title: review.course_detail?.title || t('admin_reviews.unknown_course'),
          rating: review.rating,
          comment: review.comment || '',
          helpful_count: review.likes || 0,
          reply_count: review.instructor_response ? 1 : 0,
          status: mapStatus(review.status, review.report_count),
          is_verified_purchase: true,
          created_at: new Date(review.review_date),
          updated_at: new Date(review.updated_date),
          flagged_reason: review.report_count > 0
            ? (review.last_report_reason || t('admin_reviews.flagged_reason_count', { count: review.report_count }))
            : undefined,
          instructor_reply: review.instructor_response || undefined,
          instructor_reply_at: review.response_date ? new Date(review.response_date) : undefined,
        }))
        setReviews(mapped)
        setFilteredReviews(mapped)
      } catch (error) {
        console.error('Failed to load reviews', error)
        toast.error(t('admin_reviews.toasts.load_failed'))
      }
    }

    void load()
  }, [])

  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'search',
      label: t('admin_reviews.filters.search'),
      type: 'search',
      placeholder: t('admin_reviews.filters.search_placeholder'),
    },
    {
      key: 'status',
      label: t('admin_reviews.filters.status'),
      type: 'select',
      options: [
        { label: t('admin_reviews.status.published'), value: 'published', count: reviews.filter(r => r.status === 'published').length },
        { label: t('admin_reviews.status.pending'), value: 'pending', count: reviews.filter(r => r.status === 'pending').length },
        { label: t('admin_reviews.status.flagged'), value: 'flagged', count: reviews.filter(r => r.status === 'flagged').length },
        { label: t('admin_reviews.status.hidden'), value: 'hidden', count: reviews.filter(r => r.status === 'hidden').length },
      ],
    },
    {
      key: 'rating',
      label: t('admin_reviews.filters.rating'),
      type: 'select',
      options: [5, 4, 3, 2, 1].map((rating) => ({
        label: t('admin_reviews.filters.rating_option', { rating }),
        value: String(rating),
        count: reviews.filter(r => r.rating === rating).length,
      })),
    },
    {
      key: 'verified',
      label: t('admin_reviews.filters.verified'),
      type: 'checkbox',
      placeholder: t('admin_reviews.filters.verified_only'),
    },
    {
      key: 'date',
      label: t('admin_reviews.filters.created_date'),
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
        confirmLabel: '',
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
      toast.success(t('admin_reviews.toasts.update_success'))
    } catch {
      toast.error(t('admin_reviews.toasts.update_failed'))
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReviewApi(Number(reviewId))
      syncReview(reviewId, () => null)
      toast.success(t('admin_reviews.toasts.delete_success'))
    } catch {
      toast.error(t('admin_reviews.toasts.delete_failed'))
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
      toast.success(t('admin_reviews.toasts.reply_success'))
    } catch {
      toast.error(t('admin_reviews.toasts.reply_failed'))
    }
  }

  const getStatusBadge = (status: ReviewStatus) => {
    const variants = {
      published: { variant: 'default' as const, label: t('admin_reviews.status.published') },
      pending: { variant: 'secondary' as const, label: t('admin_reviews.status.pending') },
      flagged: { variant: 'destructive' as const, label: t('admin_reviews.status.flagged') },
      hidden: { variant: 'outline' as const, label: t('admin_reviews.status.hidden') },
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
      toast.error(t('admin_reviews.toasts.bulk_failed'))
    }
  }

  if (!hasPermission('admin.reviews.manage')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">{t('admin_reviews.permission_denied_title')}</h2>
          <p className="text-muted-foreground">{t('admin_reviews.permission_denied_description')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">{t('admin_reviews.title')}</h1>
          <p className="text-muted-foreground">{t('admin_reviews.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin_reviews.cards.total_reviews')}</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reviews.length}</div>
            <p className="text-xs text-muted-foreground">{t('admin_reviews.cards.verified_count', { count: reviews.filter(r => r.is_verified_purchase).length })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin_reviews.cards.average_rating')}</CardTitle>
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{averageRating}</div>
            <div className="mt-1">{renderStars(Math.round(Number(averageRating)))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin_reviews.cards.pending')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reviews.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">{t('admin_reviews.cards.needs_review')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin_reviews.cards.flagged')}</CardTitle>
            <Flag className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reviews.filter(r => r.status === 'flagged').length}</div>
            <p className="text-xs text-muted-foreground">{t('admin_reviews.cards.needs_moderation')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">{t('admin_reviews.tabs.all', { count: reviews.length })}</TabsTrigger>
          <TabsTrigger value="pending">{t('admin_reviews.tabs.pending', { count: reviews.filter(r => r.status === 'pending').length })}</TabsTrigger>
          <TabsTrigger value="flagged">{t('admin_reviews.tabs.flagged', { count: reviews.filter(r => r.status === 'flagged').length })}</TabsTrigger>
          <TabsTrigger value="stats">{t('admin_reviews.tabs.stats')}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <TableFilter title={t('admin_reviews.filter_title')} configs={filterConfigs} onFilterChange={handleFilter} />

          <AdminBulkActionBar
            count={selectedReviewIds.length}
            label={t('admin_reviews.bulk.selected_label')}
            onClear={() => setSelectedReviewIds([])}
            actions={[
              {
                key: 'publish',
                label: t('admin_reviews.bulk.publish'),
                onClick: () => openConfirm(
                  t('admin_reviews.bulk.publish_title'),
                  t('admin_reviews.bulk.publish_description', { count: selectedReviewIds.length }),
                  t('admin_reviews.bulk.publish'),
                  () => bulkUpdateReviews(selectedReviewIds, (id) => handleStatusChange(id, 'published'), t('admin_reviews.toasts.bulk_publish_success')),
                ),
              },
              {
                key: 'hide',
                label: t('admin_reviews.bulk.hide'),
                destructive: true,
                onClick: () => openConfirm(
                  t('admin_reviews.bulk.hide_title'),
                  t('admin_reviews.bulk.hide_description', { count: selectedReviewIds.length }),
                  t('admin_reviews.bulk.hide'),
                  () => bulkUpdateReviews(selectedReviewIds, (id) => handleStatusChange(id, 'hidden'), t('admin_reviews.toasts.bulk_hide_success')),
                  true,
                ),
              },
              {
                key: 'delete',
                label: t('common.delete'),
                destructive: true,
                onClick: () => openConfirm(
                  t('admin_reviews.bulk.delete_title'),
                  t('admin_reviews.bulk.delete_description', { count: selectedReviewIds.length }),
                  t('common.delete'),
                  () => bulkUpdateReviews(selectedReviewIds, handleDeleteReview, t('admin_reviews.toasts.bulk_delete_success')),
                  true,
                ),
              },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('admin_reviews.list_title', { count: filteredReviews.length })}</CardTitle>
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
                    <TableHead>{t('admin_reviews.table.student')}</TableHead>
                    <TableHead>{t('admin_reviews.table.course')}</TableHead>
                    <TableHead>{t('admin_reviews.table.rating')}</TableHead>
                    <TableHead>{t('admin_reviews.table.content')}</TableHead>
                    <TableHead>{t('admin_reviews.table.helpful')}</TableHead>
                    <TableHead>{t('admin_reviews.table.status')}</TableHead>
                    <TableHead>{t('admin_reviews.table.created_at')}</TableHead>
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
                                {t('admin_reviews.verified_purchase')}
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
                        <p className="text-sm line-clamp-2 max-w-xs">{review.comment || t('admin_reviews.no_content')}</p>
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
                              {t('admin_reviews.actions.view_details')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {review.status !== 'published' && (
                              <DropdownMenuItem onClick={() => openConfirm(
                                t('admin_reviews.actions.publish_title'),
                                t('admin_reviews.actions.publish_description', { name: review.user_name }),
                                t('admin_reviews.bulk.publish'),
                                () => handleStatusChange(review.id, 'published'),
                              )}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {t('admin_reviews.actions.publish')}
                              </DropdownMenuItem>
                            )}
                            {review.status !== 'hidden' && (
                              <DropdownMenuItem onClick={() => openConfirm(
                                t('admin_reviews.actions.hide_title'),
                                t('admin_reviews.actions.hide_description', { name: review.user_name }),
                                t('admin_reviews.bulk.hide'),
                                () => handleStatusChange(review.id, 'hidden'),
                                true,
                              )}>
                                <XCircle className="h-4 w-4 mr-2" />
                                {t('admin_reviews.actions.hide')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-red-600" onClick={() => openConfirm(
                              t('admin_reviews.actions.delete_title'),
                              t('admin_reviews.actions.delete_description', { name: review.user_name }),
                              t('common.delete'),
                              () => handleDeleteReview(review.id),
                              true,
                            )}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('admin_reviews.actions.delete_forever')}
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
              <CardTitle>{t('admin_reviews.pending_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.filter(r => r.status === 'pending').map((review) => (
                <div key={review.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="font-medium">{review.user_name}</p>
                      <p className="text-sm text-muted-foreground">{review.course_title}</p>
                      <div>{renderStars(review.rating)}</div>
                      <p className="text-sm">{review.comment || t('admin_reviews.no_content')}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={() => openConfirm(
                        t('admin_reviews.actions.publish_title'),
                        t('admin_reviews.actions.publish_description', { name: review.user_name }),
                        t('admin_reviews.bulk.publish'),
                        () => handleStatusChange(review.id, 'published'),
                      )}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t('admin_reviews.actions.approve')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openConfirm(
                        t('admin_reviews.actions.hide_title'),
                        t('admin_reviews.actions.hide_description', { name: review.user_name }),
                        t('admin_reviews.bulk.hide'),
                        () => handleStatusChange(review.id, 'hidden'),
                        true,
                      )}>
                        <XCircle className="h-4 w-4 mr-2" />
                        {t('admin_reviews.actions.reject')}
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
              <CardTitle>{t('admin_reviews.flagged_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.filter(r => r.status === 'flagged').map((review) => (
                <div key={review.id} className="p-4 border border-red-200 rounded-lg bg-red-50/60 dark:border-red-900 dark:bg-red-950/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Flag className="h-4 w-4 text-red-600" />
                        <Badge variant="destructive">{t('admin_reviews.status.flagged')}</Badge>
                        {review.flagged_reason && (
                          <span className="text-xs text-muted-foreground">- {review.flagged_reason}</span>
                        )}
                      </div>
                      <p className="font-medium">{review.user_name}</p>
                      <p className="text-sm text-muted-foreground">{review.course_title}</p>
                      <div>{renderStars(review.rating)}</div>
                      <p className="text-sm">{review.comment || t('admin_reviews.no_content')}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={() => openConfirm(
                        t('admin_reviews.actions.keep_title'),
                        t('admin_reviews.actions.keep_description', { name: review.user_name }),
                        t('admin_reviews.actions.keep_visible'),
                        () => handleStatusChange(review.id, 'published'),
                      )}>
                        {t('admin_reviews.actions.keep')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openConfirm(
                        t('admin_reviews.actions.hide_flagged_title'),
                        t('admin_reviews.actions.hide_flagged_description', { name: review.user_name }),
                        t('admin_reviews.bulk.hide'),
                        () => handleStatusChange(review.id, 'hidden'),
                        true,
                      )}>
                        {t('admin_reviews.actions.hide')}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openConfirm(
                        t('admin_reviews.actions.delete_flagged_title'),
                        t('admin_reviews.actions.delete_description', { name: review.user_name }),
                        t('common.delete'),
                        () => handleDeleteReview(review.id),
                        true,
                      )}>
                        {t('common.delete')}
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
                <CardTitle>{t('admin_reviews.stats.rating_distribution')}</CardTitle>
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
                <CardTitle>{t('admin_reviews.stats.moderation_metrics')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">{t('admin_reviews.stats.published_reviews')}</span>
                  <Badge variant="secondary">{reviews.filter(r => r.status === 'published').length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">{t('admin_reviews.stats.pending_reviews')}</span>
                  <Badge variant="secondary">{reviews.filter(r => r.status === 'pending').length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">{t('admin_reviews.stats.flagged_reviews')}</span>
                  <Badge variant="secondary">{reviews.filter(r => r.status === 'flagged').length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">{t('admin_reviews.stats.hidden_reviews')}</span>
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
              <DialogTitle>{t('admin_reviews.detail.title')}</DialogTitle>
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
                        {t('admin_reviews.detail.purchased_course')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedReview.created_at.toLocaleString('vi-VN')}</p>
                </div>
                {getStatusBadge(selectedReview.status)}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('admin_reviews.detail.course')}</p>
                <p className="font-medium">{selectedReview.course_title}</p>
              </div>

              {selectedReview.flagged_reason && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('admin_reviews.detail.report_reason')}</p>
                  <Badge variant="destructive">{selectedReview.flagged_reason}</Badge>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('admin_reviews.detail.review')}</p>
                {renderStars(selectedReview.rating)}
                <p className="text-sm mt-2">{selectedReview.comment || t('admin_reviews.no_content')}</p>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('admin_reviews.detail.helpful_count', { count: selectedReview.helpful_count })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('admin_reviews.detail.reply_count', { count: selectedReview.reply_count })}</span>
                </div>
              </div>

              {selectedReview.instructor_reply ? (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">{t('admin_reviews.detail.instructor_reply')}</p>
                  <p className="text-sm">{selectedReview.instructor_reply}</p>
                  {selectedReview.instructor_reply_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedReview.instructor_reply_at.toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('admin_reviews.detail.reply_to_review')}</p>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t('admin_reviews.detail.reply_placeholder')}
                    rows={3}
                  />
                  <Button onClick={() => void handleReply(selectedReview.id)} disabled={!replyText.trim()}>
                    {t('admin_reviews.detail.send_reply')}
                  </Button>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {selectedReview.status !== 'published' && (
                  <Button onClick={() => {
                    void handleStatusChange(selectedReview.id, 'published')
                    setSelectedReview(null)
                  }}>
                    {t('admin_reviews.actions.publish')}
                  </Button>
                )}
                {selectedReview.status !== 'hidden' && (
                  <Button variant="outline" onClick={() => {
                    void handleStatusChange(selectedReview.id, 'hidden')
                    setSelectedReview(null)
                  }}>
                    {t('admin_reviews.actions.hide')}
                  </Button>
                )}
                <Button variant="destructive" onClick={() => {
                  void handleDeleteReview(selectedReview.id)
                  setSelectedReview(null)
                }}>
                  {t('admin_reviews.actions.delete_forever')}
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
