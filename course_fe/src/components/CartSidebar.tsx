import { useState, useRef, useEffect } from "react"
import { ShoppingCart, X, Trash2, Tag } from "lucide-react"
import { Button } from "./ui/button"
import { useRouter } from "./Router"
import { useCart } from "../contexts/CartContext"
import { useTranslation } from "react-i18next"

interface CartSidebarProps {
  onHover?: (isHovered: boolean) => void
}

export function CartSidebar({ onHover }: CartSidebarProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const { cartItems, removeFromCart, getTotalPrice, getSavings } = useCart()
  const { navigate } = useRouter()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()

  // Handle mouse enter with delay
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(true)
      onHover?.(true)
    }, 300) // 300ms delay before opening
  }

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
      onHover?.(false)
    }, 300) // 300ms delay before closing
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {/* Cart Icon Button */}
      <button
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        onClick={() => navigate('/cart')}
      >
        <ShoppingCart className="w-5 h-5" />
        {cartItems.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
            {cartItems.length}
          </span>
        )}
      </button>

      {/* Sidebar Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[400px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t('cart.title')} ({cartItems.length})
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-sm">{t('cart.empty_title')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    navigate('/courses')
                    setIsOpen(false)
                  }}
                >
                  {t('wishlist.browse_courses')}
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    {/* Course Thumbnail */}
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-20 h-14 object-cover rounded flex-shrink-0 cursor-pointer"
                      onClick={() => {
                        navigate(`/course/${item.id}`)
                        setIsOpen(false)
                      }}
                    />

                    {/* Course Info */}
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                        onClick={() => {
                          navigate(`/course/${item.id}`)
                          setIsOpen(false)
                        }}
                      >
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {item.instructor}
                      </p>
                      
                      {/* Coupon Badge */}
                      {item.couponCode && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                          <Tag className="w-3 h-3" />
                          <span>{item.couponCode}</span>
                        </div>
                      )}

                      {/* Price */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-semibold text-primary">
                          ₫{(item.currentPrice - (item.couponDiscount || 0)).toLocaleString('vi-VN')}
                        </span>
                        {item.originalPrice > item.currentPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            ₫{item.originalPrice.toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                      title={t('cart.remove')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              {/* Savings */}
              {getSavings() > 0 && (
                <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                  <span>{t('cart.you_save')}:</span>
                  <span className="font-semibold">
                    ₫{getSavings().toLocaleString('vi-VN')}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t('cart.total')}:</span>
                <span className="text-xl font-bold text-primary">
                  ₫{getTotalPrice().toLocaleString('vi-VN')}
                </span>
              </div>

              {/* Checkout Button */}
              <Button
                className="w-full"
                onClick={() => {
                  navigate('/checkout')
                  setIsOpen(false)
                }}
              >
                {t('cart.checkout')}
              </Button>

              {/* View Cart Link */}
              <button
                onClick={() => {
                  navigate('/cart')
                  setIsOpen(false)
                }}
                className="w-full text-sm text-center text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
              >
                {t('cart_sidebar.view_full_cart')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
