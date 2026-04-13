import { useState, useEffect, useMemo, useRef } from 'react'
import { Trash2, Tag, Clock, Star, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import { Input } from '../../components/ui/input'
import { Checkbox } from '../../components/ui/checkbox'
import { toast } from "sonner"
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { useRouter } from '../../components/Router'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { formatCartPrice } from '../../services/cart.api'
import { DiscountCountdown } from '../../components/DiscountCountdown'
import { motion } from 'motion/react'

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
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

function calculateCartTotals(
  items: Array<{ currentPrice: number; originalPrice: number; couponDiscount?: number }>,
  orderCoupon: { discount: number; discountType: 'percentage' | 'fixed' } | null
) {
  const originalPrice = items.reduce((total, item) => total + item.currentPrice, 0)
  const discountedSubtotal = items.reduce((total, item) => {
    const effectivePrice = item.couponDiscount ? item.currentPrice - item.couponDiscount : item.currentPrice
    return total + effectivePrice
  }, 0)

  const orderDiscount = orderCoupon
    ? orderCoupon.discountType === 'percentage'
      ? (discountedSubtotal * orderCoupon.discount) / 100
      : orderCoupon.discount
    : 0

  const totalPrice = Math.max(0, discountedSubtotal - orderDiscount)
  const savings = items.reduce((total, item) => total + item.originalPrice, 0) - totalPrice

  return {
    originalPrice,
    totalPrice,
    savings,
  }
}

export function CartPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { user } = useAuth()
  const {
    cartItems,
    removeFromCart,
    getTotalPrice,
    getOriginalPrice,
    getSavings,
    applyCoupon,
    removeCoupon,
    orderCoupon,
    appliedPromotion,
    loadCart,
  } = useCart()

  const [couponInput, setCouponInput] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [isCheckoutExpanded, setIsCheckoutExpanded] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const initializedSelectionRef = useRef(false)
  const previousCartItemIdsRef = useRef<Set<string>>(new Set())


  useEffect(() => {
    if (user?.id) {
      loadCart(parseInt(user.id))
    }
  }, [loadCart, user?.id])

  useEffect(() => {
    const currentIds = new Set(cartItems.map((item) => item.id))

    if (!initializedSelectionRef.current) {
      setSelectedItemIds(currentIds)
      initializedSelectionRef.current = true
      previousCartItemIdsRef.current = currentIds
      return
    }

    setSelectedItemIds((prev) => {
      const next = new Set<string>()
      const previousIds = previousCartItemIdsRef.current

      currentIds.forEach((id) => {
        if (prev.has(id) || !previousIds.has(id)) {
          next.add(id)
        }
      })

      return next
    })

    previousCartItemIdsRef.current = currentIds
  }, [cartItems])

  const selectedItems = useMemo(
    () => cartItems.filter((item) => selectedItemIds.has(item.id)),
    [cartItems, selectedItemIds]
  )

  const selectedTotals = useMemo(
    () => calculateCartTotals(selectedItems, orderCoupon),
    [selectedItems, orderCoupon]
  )

  const allSelected = cartItems.length > 0 && selectedItems.length === cartItems.length

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedItemIds(new Set())
      return
    }
    setSelectedItemIds(new Set(cartItems.map((item) => item.id)))
  }

  const toggleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(itemId)
      } else {
        next.delete(itemId)
      }
      return next
    })
  }

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error(t('cart.enter_coupon', 'Vui lòng nhập mã giảm giá'))
      return
    }

    setIsApplying(true)
    try {
      const success = await applyCoupon(couponInput)
      if (success) {
        toast.success(t('cart.coupon_applied', 'Đã áp dụng mã giảm giá!'))
        setCouponInput('')
      }
    } finally {
      setIsApplying(false)
    }
  }

  const handleRemoveCoupon = (courseId?: string) => {
    removeCoupon(courseId)
    toast.success(t('cart.coupon_removed', 'Đã xóa mã giảm giá'))
  }

  const handleCheckoutSelected = () => {
    if (selectedItems.length === 0) {
      toast.error(t('cart.select_at_least_one', 'Vui lòng chọn ít nhất một khóa học để thanh toán'))
      return
    }
    navigate('/checkout', undefined, {
      selected: selectedItems.map((item) => item.id).join(','),
    })
  }

  const listBottomSpacingClass = isCheckoutExpanded ? 'pb-[32rem] sm:pb-[28rem]' : 'pb-40 sm:pb-44'

  if (cartItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 1.5M7 13l1.5 1.5M9 19.5h12"/>
            </svg>
          </motion.div>
          <h2 className="text-2xl mb-2">{t('cart.empty_title')}</h2>
          <p className="text-muted-foreground mb-6">{t('cart.empty_subtitle')}</p>
          <Button onClick={() => navigate('/courses')}>
            {t('cart.keep_shopping')}
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      className="px-4 py-6 sm:p-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-7xl mx-auto">
        <motion.h1 className="mb-6 text-2xl sm:mb-8 sm:text-3xl" variants={fadeInUp} initial="hidden" animate="show">
          {t('cart.title')}
        </motion.h1>

        <motion.div className={listBottomSpacingClass} variants={sectionStagger} initial="hidden" animate="show">

          <motion.div className="min-w-0 space-y-6" variants={fadeInUp}>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>{cartItems.length} {t('cart.courses_in_cart')}</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="cart-select-all"
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                />
                <label htmlFor="cart-select-all" className="cursor-pointer text-sm">
                  {t('cart.select_all', 'Chọn tất cả')} ({selectedItems.length})
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {cartItems.map((item) => (
                <motion.div
                  key={item.id}
                  className="bg-card rounded-lg border p-4 sm:p-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedItemIds.has(item.id)}
                        onCheckedChange={(checked) => toggleSelectItem(item.id, Boolean(checked))}
                        aria-label={t('cart.select_course_for_checkout', 'Chọn khóa học để thanh toán')}
                      />
                    </div>
                    <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 line-clamp-2 break-words font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('cart.by_instructor', { name: item.instructor })}
                      </p>

                      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {item.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>{item.rating}</span>
                            {item.studentsCount && (
                              <span>({item.studentsCount.toLocaleString()})</span>
                            )}
                          </div>
                        )}
                        {item.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{item.duration}</span>
                          </div>
                        )}
                      </div>

                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {item.couponDiscount ? (
                            <>
                              <span className="text-lg font-medium text-primary">
                                {formatCartPrice(item.currentPrice - item.couponDiscount)}
                              </span>
                              <span className="text-sm text-muted-foreground line-through">
                                {formatCartPrice(item.currentPrice)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-lg font-medium text-primary">
                                {formatCartPrice(item.currentPrice)}
                              </span>
                              {item.originalPrice > item.currentPrice && (
                                <span className="text-sm text-muted-foreground line-through">
                                  {formatCartPrice(item.originalPrice)}
                                </span>
                              )}
                              {item.discountEndDate && item.originalPrice > item.currentPrice && (
                                <DiscountCountdown endDate={item.discountEndDate} variant="badge" />
                              )}
                            </>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            removeFromCart(item.id)
                            toast.success(t('cart.coupon_removed'))
                          }}
                          className="w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {t('cart.remove')}
                        </Button>
                      </div>


                      {item.couponCode && (
                        <div className="flex flex-col gap-2 rounded border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700 dark:text-green-300">
                              Mã giảm giá: {item.couponCode} (-{formatCartPrice(item.couponDiscount || 0)})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCoupon(item.id)}
                            className="w-full text-green-700 hover:text-green-800 sm:w-auto"
                          >
                            {t('cart.remove_coupon', 'Xóa')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </motion.div>

        <motion.div
          className="fixed bottom-4 left-1/2 z-40 w-[min(94vw,38rem)] -translate-x-1/2"
          variants={fadeInUp}
          initial="hidden"
          animate="show"
        >
          <div className="rounded-xl border bg-white p-3 shadow-xl sm:p-4 dark:bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground sm:text-sm">
                  {t('cart.selected_courses_count', 'Đã chọn {{count}} khóa học để thanh toán', { count: selectedItems.length })}
                </div>
                <div className="text-lg font-semibold sm:text-xl">{formatCartPrice(selectedTotals.totalPrice)}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCheckoutExpanded((prev) => !prev)}
                className="shrink-0"
              >
                {isCheckoutExpanded ? t('cart.collapse_summary', 'Thu gọn') : t('cart.expand_summary', 'Xem thêm')}
                {isCheckoutExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
              </Button>
            </div>

            <Button
              className="mt-3 w-full"
              size="lg"
              disabled={selectedItems.length === 0}
              onClick={handleCheckoutSelected}
            >
              {t('cart.checkout_selected', 'Thanh toán khóa học đã chọn')}
            </Button>

            {isCheckoutExpanded && (
              <div className="mt-3 space-y-3 border-t pt-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>{t('cart.original_price')}:</span>
                    <span className="line-through text-muted-foreground">{formatCartPrice(selectedTotals.originalPrice)}</span>
                  </div>
                  {selectedTotals.savings > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <span>{t('cart.discounts')}:</span>
                      <span className="text-green-600">-{formatCartPrice(selectedTotals.savings)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between gap-2 text-base font-medium">
                    <span>{t('cart.total')}:</span>
                    <span>{formatCartPrice(selectedTotals.totalPrice)}</span>
                  </div>
                </div>

                {appliedPromotion || orderCoupon ? (
                  <div className="flex flex-col gap-2 rounded border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <div>
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          {appliedPromotion?.promotion.code || orderCoupon?.code}
                        </span>
                        {appliedPromotion && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {appliedPromotion.promotion.description ||
                              `Giảm ${appliedPromotion.promotion.discount_type === 'percentage'
                                ? `${appliedPromotion.promotion.discount_value}%`
                                : formatCartPrice(parseFloat(appliedPromotion.promotion.discount_value))}`}
                            {' · '}Tiết kiệm {formatCartPrice(appliedPromotion.totalDiscount)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCoupon()}
                      className="w-full text-green-700 hover:text-green-800 sm:w-auto"
                    >
                      {t('cart.remove_coupon', 'Xóa')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        placeholder={t('cart.coupon_code', 'Nhập mã giảm giá')}
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        className="text-sm"
                        disabled={isApplying}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyCoupon}
                        disabled={isApplying}
                        className="w-full sm:w-auto"
                      >
                        {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : t('cart.apply_coupon', 'Áp dụng')}
                      </Button>
                    </div>
                  </div>
                )}

                {appliedPromotion && appliedPromotion.promotion.type === 'instructor' && (
                  <div className="rounded bg-muted p-3">
                    <div className="flex items-start gap-2">
                      <Tag className="mt-0.5 h-4 w-4 text-purple-600" />
                      <div className="text-sm">
                        <div className="font-medium text-purple-600">{t('cart.instructor_coupon_title')}</div>
                        <div className="text-muted-foreground">
                          {t('cart.instructor_coupon_description', { count: Object.keys(appliedPromotion.courseDiscounts).length })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center text-sm text-muted-foreground">{t('cart.money_back')}</div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
