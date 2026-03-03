import { useState, useEffect, useRef } from 'react'
import { Button } from './ui/button'
import { ShoppingCart, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

interface CourseStickyNavProps {
  courseTitle: string
  price: number
  originalPrice?: number
  isInCart: boolean
  isWishlisted: boolean
  onAddToCart: () => void
  onBuyNow: () => void
  onToggleWishlist: () => void
  sidebarCardRef?: React.RefObject<HTMLDivElement> // Ref to sidebar card container
}

export function CourseStickyNav({
  courseTitle,
  price,
  originalPrice,
  isInCart,
  isWishlisted,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  sidebarCardRef
}: CourseStickyNavProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (sidebarCardRef?.current) {
        // Smart display: Show when sidebar card scrolls out of view
        const cardRect = sidebarCardRef.current.getBoundingClientRect()
        const headerHeight = 64 // Header height is 16 * 4 = 64px (h-16)
        
        // Show sticky nav when the bottom of sidebar card goes above viewport
        // This means user has scrolled past the card and can't see Buy Now button
        setIsVisible(cardRect.bottom < headerHeight + 100)
      } else {
        // Fallback: Show after scrolling past 500px if no ref provided
        setIsVisible(window.scrollY > 500)
      }
    }

    // Initial check
    handleScroll()
    
    window.addEventListener('scroll', handleScroll)
    // Also check on resize in case layout changes
    window.addEventListener('resize', handleScroll)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [sidebarCardRef])

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
              {/* Course Title */}
              <div className="flex-1 min-w-0">
                <h2 className="truncate font-semibold">{courseTitle}</h2>
              </div>

              {/* Price and Actions */}
              <div className="flex items-center gap-3">
                {/* Price - Always visible, smaller size */}
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-purple-600">
                    ₫{(price || 0).toLocaleString('vi-VN')}
                  </span>
                  {originalPrice && (
                    <span className="hidden sm:inline text-xs text-muted-foreground line-through">
                      ₫{originalPrice.toLocaleString('vi-VN')}
                    </span>
                  )}
                </div>

                {/* Wishlist Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onToggleWishlist}
                  className={isWishlisted ? 'text-red-500 hover:text-red-600' : ''}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </Button>

                {/* Add to Cart / Buy Now */}
                {isInCart ? (
                  <Button onClick={onBuyNow} size="lg">
                    Go to Cart
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={onAddToCart} 
                      variant="outline"
                      size="lg"
                      className="hidden md:flex"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Add to Cart
                    </Button>
                    <Button 
                      onClick={onBuyNow}
                      size="lg"
                    >
                      Buy Now
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