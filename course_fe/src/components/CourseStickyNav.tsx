import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Heart, ShoppingCart } from 'lucide-react'
import { Button } from './ui/button'

interface CourseStickyNavProps {
  courseTitle: string
  price: number
  originalPrice?: number
  isInCart: boolean
  isWishlisted: boolean
  primaryActionLabel?: string
  showAddToCart?: boolean
  onAddToCart: () => void
  onBuyNow: () => void
  onToggleWishlist: () => void
  sidebarCardRef?: React.RefObject<HTMLDivElement>
}

export function CourseStickyNav({
  courseTitle,
  price,
  originalPrice,
  isInCart,
  isWishlisted,
  primaryActionLabel,
  showAddToCart = true,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  sidebarCardRef,
}: CourseStickyNavProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (sidebarCardRef?.current) {
        const cardRect = sidebarCardRef.current.getBoundingClientRect()
        const headerHeight = 64
        setIsVisible(cardRect.bottom < headerHeight + 100)
      } else {
        setIsVisible(window.scrollY > 500)
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [sidebarCardRef])

  const formatPrice = (value: number) => `VND ${value.toLocaleString('vi-VN')}`
  const primaryLabel = primaryActionLabel ?? t('course_sticky_nav.buy_now')

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-16 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg border-b"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="truncate font-semibold">{courseTitle}</h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-purple-600">{formatPrice(price || 0)}</span>
                  {originalPrice && (
                    <span className="hidden sm:inline text-xs text-muted-foreground line-through">
                      {formatPrice(originalPrice)}
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={onToggleWishlist}
                  className={isWishlisted ? 'text-red-500 hover:text-red-600' : ''}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </Button>

                {isInCart ? (
                  <Button onClick={onBuyNow} size="lg">
                    {t('course_sticky_nav.go_to_cart')}
                  </Button>
                ) : (
                  <>
                    {showAddToCart && (
                      <Button onClick={onAddToCart} variant="outline" size="lg" className="hidden md:flex">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {t('course_sticky_nav.add_to_cart')}
                      </Button>
                    )}
                    <Button onClick={onBuyNow} size="lg">
                      {primaryLabel}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
