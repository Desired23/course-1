import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Skeleton } from "../../components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog"
import { Star, Edit2, Trash2, Search, MessageSquare, ThumbsUp, Calendar } from "lucide-react"
import { motion } from 'motion/react'
import { toast } from "sonner"
import { useRouter } from "../../components/Router"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { useAuth } from "../../contexts/AuthContext"
import { UserPagination } from "../../components/UserPagination"
import {
  type Review,
  getReviewsByUser,
  updateReview as updateReviewApi,
  deleteReview as deleteReviewApi,
  formatReviewDate,
  calcAverageRating,
  isEdited,
} from "../../services/review.api"
import { listItemTransition } from '../../lib/motion'

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1"
type SortBy = "newest" | "oldest" | "rating_desc" | "rating_asc"

export function MyReviewsPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all")
  const [sortBy, setSortBy] = useState<SortBy>("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ rating: 5, comment: "" })

  const renderReviewsSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: pageSize }).map((_, index) => (
        <div key={`review-skeleton-${index}`} className="rounded-lg border bg-card p-6 space-y-3">
          <div className="flex items-start gap-4">
            <Skeleton className="h-20 w-32 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    getReviewsByUser(user.id, currentPage, pageSize, {
      search: searchTerm || undefined,
      rating: ratingFilter !== "all" ? ratingFilter : undefined,
      sort_by: sortBy,
    })
      .then((res) => {
        if (cancelled) return
        setReviews(res.results)
        setTotalCount(res.count || 0)
        setTotalPages(res.total_pages || 1)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || t("my_reviews_page.load_failed"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, currentPage, pageSize, searchTerm, ratingFilter, sortBy, t])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, ratingFilter, sortBy, pageSize])

  const resetForm = () => setFormData({ rating: 5, comment: "" })

  const openEditDialog = (review: Review) => {
    setEditingReview(review)
    setFormData({ rating: review.rating, comment: review.comment || "" })
  }

  const handleEditReview = async () => {
    if (!editingReview) return
    if (!formData.comment.trim()) {
      toast.error(t("my_reviews_page.toasts.comment_required"))
      return
    }
    try {
      const updated = await updateReviewApi(editingReview.review_id, {
        rating: formData.rating,
        comment: formData.comment,
      })
      setReviews((prev) => prev.map((r) => (r.review_id === editingReview.review_id ? updated : r)))
      toast.success(t("my_reviews_page.toasts.update_success"))
      setEditingReview(null)
      resetForm()
    } catch (err: any) {
      toast.error(err?.message || t("my_reviews_page.toasts.update_failed"))
    }
  }

  const handleDeleteReview = async () => {
    if (!deletingReviewId) return
    try {
      await deleteReviewApi(deletingReviewId)
      setReviews((prev) => prev.filter((r) => r.review_id !== deletingReviewId))
      toast.success(t("my_reviews_page.toasts.delete_success"))
    } catch (err: any) {
      toast.error(err?.message || t("my_reviews_page.toasts.delete_failed"))
    } finally {
      setDeletingReviewId(null)
    }
  }

  const avgRating = calcAverageRating(reviews).toFixed(1)
  const totalLikes = reviews.reduce((sum, r) => sum + (r.likes || 0), 0)

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-5 w-72" />
          </div>
          {renderReviewsSkeleton()}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>{t("my_reviews_page.retry")}</Button>
      </div>
    )
  }

  return (
    <motion.div
      className="p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="max-w-5xl mx-auto" variants={sectionStagger} initial="hidden" animate="show">
        <motion.div className="mb-8" variants={fadeInUp}>
          <h1 className="text-3xl mb-2">{t("my_reviews_page.title")}</h1>
          <p className="text-muted-foreground">{t("my_reviews_page.subtitle")}</p>
        </motion.div>

        <motion.div className="grid grid-cols-3 gap-4 mb-6" variants={fadeInUp}>
          <Card className="app-interactive">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("my_reviews_page.stats.total_reviews")}</p>
                  <p className="text-2xl">{reviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="app-interactive">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("my_reviews_page.stats.average_rating")}</p>
                  <p className="text-2xl">{avgRating}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="app-interactive">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <ThumbsUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("my_reviews_page.stats.total_likes")}</p>
                  <p className="text-2xl">{totalLikes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
        <Card className="app-surface-elevated mb-6">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("my_reviews_page.search_placeholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <select className="h-9 rounded-md border px-3 text-sm" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}>
              <option value="all">{t("my_reviews_page.filters.all_ratings")}</option>
              <option value="5">{t("my_reviews_page.filters.five_stars")}</option>
              <option value="4">{t("my_reviews_page.filters.four_stars")}</option>
              <option value="3">{t("my_reviews_page.filters.three_stars")}</option>
              <option value="2">{t("my_reviews_page.filters.two_stars")}</option>
              <option value="1">{t("my_reviews_page.filters.one_star")}</option>
            </select>
            <select className="h-9 rounded-md border px-3 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="newest">{t("my_reviews_page.sort.newest")}</option>
              <option value="oldest">{t("my_reviews_page.sort.oldest")}</option>
              <option value="rating_desc">{t("my_reviews_page.sort.rating_desc")}</option>
              <option value="rating_asc">{t("my_reviews_page.sort.rating_asc")}</option>
            </select>
            <select className="h-9 rounded-md border px-3 text-sm" value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value="5">{t("my_reviews_page.page_size.five")}</option>
              <option value="10">{t("my_reviews_page.page_size.ten")}</option>
              <option value="15">{t("my_reviews_page.page_size.fifteen")}</option>
            </select>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div className="space-y-4" variants={fadeInUp}>
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl mb-2">{t("my_reviews_page.empty_title")}</h3>
                <p className="text-muted-foreground mb-6">{t("my_reviews_page.empty_description")}</p>
                <Button onClick={() => navigate("/my-learning")}>{t("my_reviews_page.go_to_learning")}</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {reviews.map((review, index) => (
                <motion.div
                  key={review.review_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={listItemTransition(index)}
                >
                <Card className="app-interactive">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <ImageWithFallback src={review.course_detail?.thumbnail || ""} alt={review.course_detail?.title || ""} className="w-32 h-20 object-cover rounded" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium mb-1">{review.course_detail?.title}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">{review.rating}.0</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(review)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              {t("my_reviews_page.actions.edit")}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingReviewId(review.review_id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("my_reviews_page.actions.delete")}
                            </Button>
                          </div>
                        </div>

                        <p className="text-muted-foreground mb-3">{review.comment}</p>

                        {review.instructor_response && (
                          <div className="bg-muted/50 rounded-lg p-3 mb-3">
                            <p className="text-sm font-medium mb-1">{t("my_reviews_page.instructor_response")}</p>
                            <p className="text-sm text-muted-foreground">{review.instructor_response}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4" />
                            {t("my_reviews_page.likes_count", { count: review.likes || 0 })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatReviewDate(review.review_date)}
                          </div>
                          {isEdited(review) && <Badge variant="outline" className="text-xs">{t("my_reviews_page.edited_badge")}</Badge>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              ))}

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{t("my_reviews_page.pagination", { current: currentPage, totalPages, totalCount })}</p>
                <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            </>
          )}
        </motion.div>

        <AlertDialog open={!!deletingReviewId} onOpenChange={() => setDeletingReviewId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("my_reviews_page.delete_dialog.title")}</AlertDialogTitle>
              <AlertDialogDescription>{t("my_reviews_page.delete_dialog.description")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleDeleteReview()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("my_reviews_page.actions.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {editingReview && (
          <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("my_reviews_page.edit_dialog.title")}</DialogTitle>
                <DialogDescription>{t("my_reviews_page.edit_dialog.description", { course: editingReview.course_detail?.title || "" })}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("my_reviews_page.edit_dialog.rating_label")}</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button key={rating} type="button" onClick={() => setFormData({ ...formData, rating })} className="focus:outline-none">
                        <Star className={`h-8 w-8 cursor-pointer transition-colors ${rating <= formData.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-200"}`} />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">{formData.rating}.0</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-comment">{t("my_reviews_page.edit_dialog.review_label")}</Label>
                  <Textarea id="edit-comment" value={formData.comment} onChange={(e) => setFormData({ ...formData, comment: e.target.value })} placeholder={t("my_reviews_page.edit_dialog.review_placeholder")} rows={6} />
                  <p className="text-xs text-muted-foreground">{t("my_reviews_page.edit_dialog.characters", { count: formData.comment.length })}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingReview(null)}>{t("common.cancel")}</Button>
                <Button onClick={() => void handleEditReview()}>{t("common.save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>
    </motion.div>
  )
}
