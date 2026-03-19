import { useState, useEffect } from 'react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog'
import { Star, Edit2, Trash2, Search, MessageSquare, ThumbsUp, Calendar, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '../../components/Router'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { useAuth } from '../../contexts/AuthContext'
import { UserPagination } from '../../components/UserPagination'
import {
  type Review,
  getReviewsByUser,
  updateReview as updateReviewApi,
  deleteReview as deleteReviewApi,
  formatReviewDate,
  calcAverageRating,
  isEdited,
} from '../../services/review.api'

type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1'
type SortBy = 'newest' | 'oldest' | 'rating_desc' | 'rating_asc'

export function MyReviewsPage() {
  const { navigate } = useRouter()
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
  })

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    getReviewsByUser(user.id, currentPage, pageSize, {
      search: searchTerm || undefined,
      rating: ratingFilter !== 'all' ? ratingFilter : undefined,
      sort_by: sortBy,
    })
      .then((res) => {
        if (cancelled) return
        setReviews(res.results)
        setTotalCount(res.count || 0)
        setTotalPages(res.total_pages || 1)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Cannot load reviews')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, currentPage, pageSize, searchTerm, ratingFilter, sortBy])

  const resetForm = () => {
    setFormData({ rating: 5, comment: '' })
  }

  const handleEditReview = async () => {
    if (!editingReview) return
    if (!formData.comment.trim()) {
      toast.error('Please enter review content')
      return
    }
    try {
      const updated = await updateReviewApi(editingReview.review_id, {
        rating: formData.rating,
        comment: formData.comment,
      })
      setReviews((prev) => prev.map((r) => (r.review_id === editingReview.review_id ? updated : r)))
      toast.success('Review updated')
      setEditingReview(null)
      resetForm()
    } catch (err: any) {
      toast.error(err?.message || 'Cannot update review')
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
      toast.success('Review deleted')
    } catch (err: any) {
      toast.error(err?.message || 'Cannot delete review')
    } finally {
      setDeletingReviewId(null)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, ratingFilter, sortBy, pageSize])

  const avgRating = calcAverageRating(reviews).toFixed(1)
  const totalLikes = reviews.reduce((sum, r) => sum + (r.likes || 0), 0)

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
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl mb-2">My Reviews</h1>
          <p className="text-muted-foreground">Manage your course ratings and feedback</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total reviews</p>
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
                  <p className="text-sm text-muted-foreground">Average rating</p>
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
                  <p className="text-sm text-muted-foreground">Total likes</p>
                  <p className="text-2xl">{totalLikes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="h-9 rounded-md border px-3 text-sm"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
            >
              <option value="all">All ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
            <select
              className="h-9 rounded-md border px-3 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="rating_desc">Rating high to low</option>
              <option value="rating_asc">Rating low to high</option>
            </select>
            <select
              className="h-9 rounded-md border px-3 text-sm"
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value="5">5 / page</option>
              <option value="10">10 / page</option>
              <option value="15">15 / page</option>
            </select>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl mb-2">No reviews found</h3>
                <p className="text-muted-foreground mb-6">Try changing filters or review your courses first.</p>
                <Button onClick={() => navigate('/my-learning')}>Go to My Learning</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {reviews.map((review) => (
                <Card key={review.review_id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <ImageWithFallback
                          src={review.course_detail?.thumbnail || ''}
                          alt={review.course_detail?.title || ''}
                          className="w-32 h-20 object-cover rounded"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium mb-1">{review.course_detail?.title}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">{review.rating}.0</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(review)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingReviewId(review.review_id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        <p className="text-muted-foreground mb-3">{review.comment}</p>

                        {review.instructor_response && (
                          <div className="bg-muted/50 rounded-lg p-3 mb-3">
                            <p className="text-sm font-medium mb-1">Instructor response:</p>
                            <p className="text-sm text-muted-foreground">{review.instructor_response}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4" />
                            {review.likes} likes
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatReviewDate(review.review_date)}
                          </div>
                          {isEdited(review) && (
                            <Badge variant="outline" className="text-xs">
                              Edited
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage}/{totalPages} - Total {totalCount} reviews
                </p>
                <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            </>
          )}
        </div>

        <AlertDialog open={!!deletingReviewId} onOpenChange={() => setDeletingReviewId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete review</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteReview} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {editingReview && (
          <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit review</DialogTitle>
                <DialogDescription>
                  Update your feedback for {editingReview.course_detail?.title}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rating *</Label>
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
                            rating <= formData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">{formData.rating}.0</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-comment">Your review *</Label>
                  <Textarea
                    id="edit-comment"
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    placeholder="Share your learning experience..."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">{formData.comment.length} / 500 characters</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingReview(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEditReview}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
