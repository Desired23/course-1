import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog'
import { Star, Edit2, Trash2, Search, MessageSquare, ThumbsUp, Calendar, Loader2 } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { useRouter } from '../../components/Router'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { useAuth } from '../../contexts/AuthContext'
import {
  type Review,
  getAllReviewsByUser,
  updateReview as updateReviewApi,
  deleteReview as deleteReviewApi,
  formatReviewDate,
  calcAverageRating,
  isEdited,
} from '../../services/review.api'

export function MyReviewsPage() {
  const { navigate } = useRouter()
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    rating: 5,
    comment: ''
  })

  // ── Fetch reviews from API ───────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    getAllReviewsByUser(user.id)
      .then((data) => {
        if (!cancelled) setReviews(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Không thể tải đánh giá')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id])

  // ── Handlers ─────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({ rating: 5, comment: '' })
  }

  const handleEditReview = async () => {
    if (!editingReview) return
    if (!formData.comment.trim()) {
      toast.error('Vui lòng nhập nội dung đánh giá')
      return
    }
    try {
      const updated = await updateReviewApi(editingReview.review_id, {
        rating: formData.rating,
        comment: formData.comment,
      })
      setReviews((prev) =>
        prev.map((r) => (r.review_id === editingReview.review_id ? updated : r))
      )
      toast.success('Đã cập nhật đánh giá')
      setEditingReview(null)
      resetForm()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật đánh giá')
    }
  }

  const openEditDialog = (review: Review) => {
    setEditingReview(review)
    setFormData({
      rating: review.rating,
      comment: review.comment || '',
    })
  }

  const handleDeleteReview = async () => {
    if (!deletingReviewId) return
    try {
      await deleteReviewApi(deletingReviewId)
      setReviews((prev) => prev.filter((r) => r.review_id !== deletingReviewId))
      toast.success('Đã xóa đánh giá')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa đánh giá')
    } finally {
      setDeletingReviewId(null)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────
  const filteredReviews = reviews.filter((review) => {
    const term = searchTerm.toLowerCase()
    return (
      (review.course_detail?.title || '').toLowerCase().includes(term) ||
      (review.comment || '').toLowerCase().includes(term)
    )
  })

  const avgRating = calcAverageRating(reviews).toFixed(1)
  const totalLikes = reviews.reduce((sum, r) => sum + (r.likes || 0), 0)

  // ── Loading / error states ───────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Thử lại</Button>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Đánh giá của tôi</h1>
          <p className="text-muted-foreground">
            Quản lý đánh giá và xếp hạng khóa học
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng đánh giá</p>
                  <p className="text-2xl">{reviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Điểm trung bình</p>
                  <p className="text-2xl">{avgRating}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <ThumbsUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lượt thích</p>
                  <p className="text-2xl">{totalLikes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm đánh giá..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl mb-2">Chưa có đánh giá</h3>
                <p className="text-muted-foreground mb-6">
                  Bắt đầu đánh giá các khóa học bạn đã hoàn thành
                </p>
                <Button onClick={() => navigate('/my-learning')}>
                  Đi đến khóa học của tôi
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredReviews.map((review) => (
              <Card key={review.review_id}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Course Image */}
                    <div className="flex-shrink-0">
                      <ImageWithFallback
                        src={review.course_detail?.thumbnail || ''}
                        alt={review.course_detail?.title || ''}
                        className="w-32 h-20 object-cover rounded"
                      />
                    </div>

                    {/* Review Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium mb-1">{review.course_detail?.title}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {review.rating}.0
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(review)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingReviewId(review.review_id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Xóa
                          </Button>
                        </div>
                      </div>

                      <p className="text-muted-foreground mb-3">{review.comment}</p>

                      {review.instructor_response && (
                        <div className="bg-muted/50 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium mb-1">Phản hồi từ giảng viên:</p>
                          <p className="text-sm text-muted-foreground">{review.instructor_response}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          {review.likes} lượt thích
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatReviewDate(review.review_date)}
                        </div>
                        {isEdited(review) && (
                          <Badge variant="outline" className="text-xs">
                            Đã chỉnh sửa
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingReviewId} onOpenChange={() => setDeletingReviewId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa đánh giá</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa đánh giá này? Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteReview} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Dialog */}
        {editingReview && (
          <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Chỉnh sửa đánh giá</DialogTitle>
                <DialogDescription>
                  Cập nhật đánh giá cho {editingReview.course_detail?.title}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Xếp hạng *</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating })}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-8 w-8 cursor-pointer transition-colors ${
                            rating <= formData.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 hover:text-yellow-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {formData.rating}.0
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-comment">Đánh giá của bạn *</Label>
                  <Textarea
                    id="edit-comment"
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    placeholder="Chia sẻ trải nghiệm của bạn về khóa học..."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.comment.length} / 500 ký tự
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingReview(null)}>
                  Hủy
                </Button>
                <Button onClick={handleEditReview}>
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
