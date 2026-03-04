import { useState, useEffect } from 'react'
import { Trash2, Tag, Clock, Star, Check, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import { Input } from '../../components/ui/input'
import { toast } from "sonner@2.0.3"
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { useRouter } from '../../components/Router'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { formatCartPrice } from '../../services/cart.api'
import { DiscountCountdown } from '../../components/DiscountCountdown'

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

  // Sync cart from server on mount
  useEffect(() => {
    if (user?.id) {
      loadCart(parseInt(user.id))
    }
  }, [user?.id])

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

  if (cartItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 1.5M7 13l1.5 1.5M9 19.5h12"/>
            </svg>
          </div>
          <h2 className="text-2xl mb-2">{t('cart.empty_title')}</h2>
          <p className="text-muted-foreground mb-6">{t('cart.empty_subtitle')}</p>
          <Button onClick={() => navigate('/courses')}>
            {t('cart.keep_shopping')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl mb-8">{t('cart.title')}</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="text-sm text-muted-foreground">
              {cartItems.length} {t('cart.courses_in_cart')}
            </div>
            
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-card p-6 rounded-lg border">
                  <div className="flex gap-4">
                    <div className="w-24 h-16 flex-shrink-0">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1 line-clamp-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">By {item.instructor}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
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
                      
                      <div className="flex items-center justify-between mb-4">
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
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {t('cart.remove')}
                        </Button>
                      </div>

                      {/* Course-specific promotion applied */}
                      {item.couponCode && (
                        <div className="flex items-center justify-between bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700 dark:text-green-300">
                              Mã giảm giá: {item.couponCode} (-{formatCartPrice(item.couponDiscount || 0)})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCoupon(item.id)}
                            className="text-green-700 hover:text-green-800"
                          >
                            {t('cart.remove_coupon', 'Xóa')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card p-6 rounded-lg border sticky top-24">
              <h3 className="text-lg mb-4">{t('cart.total')}:</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span>{t('cart.original_price')}:</span>
                  <span className="line-through text-muted-foreground">
                    {formatCartPrice(getOriginalPrice())}
                  </span>
                </div>
                
                {getSavings() > 0 && (
                  <div className="flex justify-between">
                    <span>{t('cart.discounts')}:</span>
                    <span className="text-green-600">
                      -{formatCartPrice(getSavings())}
                    </span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between text-xl font-medium">
                  <span>{t('cart.total')}:</span>
                  <span>{formatCartPrice(getTotalPrice())}</span>
                </div>
              </div>
              
              <Button 
                className="w-full mb-4" 
                size="lg"
                onClick={() => navigate('/checkout')}
              >
                {t('cart.checkout')}
              </Button>
              
              {/* Order-wide Coupon Code */}
              <div className="space-y-3 mb-6">
                {appliedPromotion || orderCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <div>
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          {appliedPromotion?.promotion.code || orderCoupon?.code}
                        </span>
                        {appliedPromotion && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {appliedPromotion.promotion.description || 
                              `Giảm ${appliedPromotion.promotion.discount_type === 'percentage' 
                                ? `${appliedPromotion.promotion.discount_value}%` 
                                : formatCartPrice(parseFloat(appliedPromotion.promotion.discount_value))}`
                            }
                            {' · '}Tiết kiệm {formatCartPrice(appliedPromotion.totalDiscount)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCoupon()}
                      className="text-green-700 hover:text-green-800"
                    >
                      {t('cart.remove_coupon', 'Xóa')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
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
                        onClick={() => handleApplyCoupon()}
                        disabled={isApplying}
                      >
                        {isApplying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t('cart.apply_coupon', 'Áp dụng')
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Promotions info */}
              {appliedPromotion && appliedPromotion.promotion.type === 'instructor' && (
                <div className="mt-4 p-4 bg-muted rounded">
                  <div className="flex items-start gap-2">
                    <Tag className="w-4 h-4 text-purple-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-purple-600">
                        Mã giảm giá của giảng viên
                      </div>
                      <div className="text-muted-foreground">
                        Áp dụng cho {Object.keys(appliedPromotion.courseDiscounts).length} khóa học trong giỏ hàng
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 30-day guarantee */}
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {t('cart.money_back')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}