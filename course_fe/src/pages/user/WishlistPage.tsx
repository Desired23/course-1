import { useState, useEffect } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Heart, Star, Clock, Users, ShoppingCart, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import {
  getWishlistByUser,
  removeFromWishlist as removeWishlistApi,
  type WishlistItem,
  getWishlistEffectivePrice,
  parseDecimal,
} from '../../services/wishlist.api'
import { addToCart as addToCartApi } from '../../services/cart.api'
import { formatPrice, formatDuration, getLevelLabel } from '../../services/course.api'
import { UserPagination } from '../../components/UserPagination'

export function WishlistPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { user } = useAuth()
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getWishlistByUser(parseInt(user.id, 10), {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm || undefined,
      level: levelFilter !== 'all' ? levelFilter : undefined,
      sort_by: 'newest',
    })
      .then((res) => {
        if (cancelled) return
        setWishlistItems(res.results)
        setTotalCount(res.count || 0)
        setTotalPages(res.total_pages || 1)
      })
      .catch(() => {
        if (!cancelled) {
          setWishlistItems([])
          setTotalCount(0)
          setTotalPages(1)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, currentPage, pageSize, searchTerm, levelFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, levelFilter, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const handleRemove = async (wishlistId: number) => {
    setRemovingId(wishlistId)
    try {
      await removeWishlistApi(wishlistId)
      setWishlistItems((items) => items.filter((item) => item.id !== wishlistId))
      toast.success(t('wishlist.removed'))
    } catch {
      toast.error('Cannot remove from wishlist')
    } finally {
      setRemovingId(null)
    }
  }

  const handleAddToCart = async (item: WishlistItem) => {
    if (!user?.id) return
    try {
      await addToCartApi({ user: parseInt(user.id, 10), course: item.course })
      toast.success(`${item.course_detail.title} ${t('wishlist.added_to_cart')}`)
      await removeWishlistApi(item.id)
      setWishlistItems((items) => items.filter((i) => i.id !== item.id))
    } catch {
      toast.error('Cannot add to cart')
    }
  }

  const handleMoveAllToCart = async () => {
    if (!user?.id) return
    for (const item of wishlistItems) {
      try {
        await addToCartApi({ user: parseInt(user.id, 10), course: item.course })
        await removeWishlistApi(item.id)
      } catch {
        // ignore duplicates or failed items
      }
    }
    setWishlistItems([])
    toast.success(t('wishlist.added_to_cart'))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <h1 className="mb-8">{t('wishlist.title')}</h1>

          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="mb-2">{t('wishlist.empty_title')}</h3>
            <p className="text-muted-foreground mb-4">{t('wishlist.empty_subtitle')}</p>
            <Button onClick={() => navigate('/courses')}>{t('wishlist.browse_courses')}</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="mb-2">{t('wishlist.title')}</h1>
            <p className="text-muted-foreground">{totalCount} courses in wishlist</p>
          </div>

          {wishlistItems.length > 0 && (
            <Button onClick={handleMoveAllToCart} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              {t('wishlist.move_all_to_cart')}
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              className="h-9 rounded-md border px-3 text-sm"
              placeholder="Search by course or instructor"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="h-9 rounded-md border px-3 text-sm"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as 'all' | 'beginner' | 'intermediate' | 'advanced')}
            >
              <option value="all">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <select
              className="h-9 rounded-md border px-3 text-sm"
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value="6">6 / page</option>
              <option value="9">9 / page</option>
              <option value="12">12 / page</option>
            </select>
            <Button
              variant="ghost"
              className="h-9"
              onClick={() => {
                setSearchTerm('')
                setLevelFilter('all')
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>

        {wishlistItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No courses match your filters.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistItems.map((item) => {
                const course = item.course_detail
                const effectivePrice = getWishlistEffectivePrice(course)
                const originalPrice = parseDecimal(course.original_price)
                const hasDiscount = effectivePrice < originalPrice && effectivePrice > 0

                return (
                  <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img
                        src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop'}
                        alt={course.title}
                        className="w-full h-40 object-cover rounded-t-lg"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                        onClick={() => handleRemove(item.id)}
                        disabled={removingId === item.id}
                      >
                        {removingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                      <Badge variant="secondary" className="absolute bottom-2 left-2">
                        {getLevelLabel(course.level)}
                      </Badge>
                    </div>

                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-2 cursor-pointer hover:text-primary" onClick={() => navigate(`/courses/${item.course}`)}>
                        {course.title}
                      </CardTitle>
                      <CardDescription>By {course.instructor_name || 'Instructor'}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{parseDecimal(course.rating).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{(course.enrollment_count || 0).toLocaleString()}</span>
                        </div>
                        {course.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(course.duration)}</span>
                          </div>
                        )}
                      </div>

                      {course.short_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{course.short_description}</p>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{formatPrice(effectivePrice)}</span>
                        {hasDiscount && (
                          <span className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice)}</span>
                        )}
                      </div>

                      <Button className="w-full gap-2" onClick={() => handleAddToCart(item)}>
                        <ShoppingCart className="h-4 w-4" />
                        {t('wishlist.move_to_cart')}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {currentPage}/{totalPages} - Total {totalCount} courses</p>
              <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
