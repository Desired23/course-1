import { useState, useCallback } from "react"
import { Star, Clock, Users, CheckCircle, Play, ShoppingCart, Heart, Loader2, ArrowRight } from "lucide-react"
import { ImageWithFallback } from "./figma/ImageWithFallback"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { useRouter } from "./Router"
import { useCart } from "../contexts/CartContext"
import { useWishlist } from "../contexts/WishlistContext"
import { useAuthAction } from "../hooks/useAuthAction"
import { useAuth } from "../contexts/AuthContext"
import { Progress } from "./ui/progress"
import { DiscountCountdown } from "./DiscountCountdown"
import { toast } from "sonner@2.0.3"

interface CourseCardProps {
  title: string
  instructor: string
  image: string
  rating: number
  reviews: number
  price: string | number
  originalPrice?: string | number
  duration: string
  students: string | number
  level: string
  category?: string
  isOwned?: boolean
  progress?: number // 0-100
  courseId?: string
  variant?: 'vertical' | 'horizontal' | 'compact'
  bestseller?: boolean
  isNew?: boolean
  currency?: 'USD' | 'VND'
  showWishlist?: boolean
  showAddToCart?: boolean
  discountEndDate?: string | null
}

export function CourseCard({
  title,
  instructor,
  image,
  rating,
  reviews,
  price,
  originalPrice,
  duration,
  students,
  level,
  category,
  isOwned = false,
  progress = 0,
  courseId,
  variant = 'vertical',
  bestseller = false,
  isNew = false,
  currency = 'USD',
  showWishlist = true,
  showAddToCart = true,
  discountEndDate
}: CourseCardProps) {
  const { navigate } = useRouter()
  const { addToCart, addToCartFromApi, isInCart, isInCartByCourseId } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const { execute: executeAuth } = useAuthAction()
  const { user, isAuthenticated } = useAuth()
  
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [discountExpired, setDiscountExpired] = useState(false)
  
  const handleDiscountExpire = useCallback(() => {
    setDiscountExpired(true)
  }, [])
  
  const inWishlist = courseId ? isInWishlist(courseId) : false
  const addedToCart = courseId ? isInCart(courseId) : false

  // Format price based on currency
  const formatPrice = (priceValue: string | number): string => {
    if (typeof priceValue === 'string') {
      // Already formatted
      return priceValue
    }
    
    if (currency === 'VND') {
      return `₫${priceValue.toLocaleString()}`
    }
    return `$${priceValue.toFixed(2)}`
  }

  // Format students count
  const formatStudents = (studentsValue: string | number): string => {
    if (typeof studentsValue === 'string') {
      return studentsValue
    }
    if (studentsValue >= 1000000) {
      return `${(studentsValue / 1000000).toFixed(1)}M`
    }
    if (studentsValue >= 1000) {
      return `${(studentsValue / 1000).toFixed(1)}K`
    }
    return studentsValue.toString()
  }

  // When discount expires, show original price as the main price
  const displayPrice = discountExpired && originalPrice ? originalPrice : price
  const displayOriginalPrice = discountExpired ? undefined : originalPrice
  
  const formattedPrice = formatPrice(displayPrice)
  const formattedOriginalPrice = displayOriginalPrice ? formatPrice(displayOriginalPrice) : undefined
  const formattedStudents = formatStudents(students)
  const showCountdown = !discountExpired && !!discountEndDate && !!originalPrice

  // Compute discount percentage
  const discountPercent = (() => {
    if (!originalPrice || !showCountdown) return 0
    const orig = typeof originalPrice === 'string' ? parseFloat(originalPrice.replace(/[^0-9.]/g, '')) : originalPrice
    const curr = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price
    if (!orig || orig <= 0 || curr >= orig) return 0
    return Math.round(((orig - curr) / orig) * 100)
  })()

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (!courseId) return

    executeAuth(() => {
      if (inWishlist) {
        removeFromWishlist(courseId)
      } else {
        // Parse price safely
        const priceValue = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price
        
        addToWishlist(courseId, {
          title, 
          instructor, 
          price: isNaN(priceValue) ? 0 : priceValue, 
          image, 
          rating
        })
      }
    })
  }

  const handleClick = () => {
    if (isOwned && courseId) {
      navigate(`/course-player/${courseId}`)
    } else if (courseId) {
      // Extract numeric ID from courseId (e.g., "course-1" -> "1")
      const numericId = courseId.replace('course-', '')
      navigate(`/course/${numericId}`)
    } else {
      navigate('/courses')
    }
  }
  
  const handleAddToCart = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    
    if (!courseId) return
    
    if (addedToCart) {
      navigate('/cart')
      return
    }

    setIsAddingToCart(true)
    
    try {
      // Extract numeric course ID
      const numericCourseId = parseInt(courseId.replace('course-', ''))
      
      if (isAuthenticated && user?.id && !isNaN(numericCourseId)) {
        // Use API for logged-in users
        if (isInCartByCourseId(numericCourseId)) {
          toast.info('Khóa học này đã có trong giỏ hàng')
          return
        }
        await addToCartFromApi(parseInt(user.id), numericCourseId, {})
      } else {
        // Fallback: local-only for guests
        const currentPriceVal = typeof price === 'string' 
          ? parseFloat(price.replace(/[^0-9.]/g, '')) 
          : price || 0
        const originalPriceVal = originalPrice 
          ? (typeof originalPrice === 'string' 
              ? parseFloat(originalPrice.replace(/[^0-9.]/g, '')) 
              : originalPrice)
          : (currentPriceVal > 0 ? currentPriceVal * 2 : 199.99)
        const studentsVal = typeof students === 'string' 
          ? parseInt(students.replace(/[^0-9]/g, '')) 
          : students || 0

        addToCart({
          id: courseId,
          courseId: numericCourseId,
          title,
          instructor,
          image,
          rating,
          currentPrice: currentPriceVal,
          originalPrice: originalPriceVal,
          studentsCount: studentsVal,
          duration
        })
        toast.success('Đã thêm vào giỏ hàng')
      }
    } finally {
      setIsAddingToCart(false)
    }
  }
  
  // Compact variant for related/recommended courses
  if (variant === 'compact') {
    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow group/card overflow-hidden flex flex-col h-full"
        onClick={handleClick}
      >
        <div className="relative overflow-hidden">
          <ImageWithFallback
            src={image}
            alt={title}
            className="w-full h-32 object-cover group-hover/card:scale-105 transition-transform duration-300"
          />
          {isOwned ? (
            <Badge className="absolute top-2 left-2 bg-green-600 text-white flex items-center gap-1 z-10">
              <CheckCircle className="h-3 w-3" />
              Đã sở hữu
            </Badge>
          ) : (
            <>
              {bestseller && (
                <Badge className="absolute top-2 left-2 bg-yellow-400 text-black z-10">
                  Bestseller
                </Badge>
              )}
              {isNew && (
                <Badge className="absolute top-2 left-2 bg-blue-600 text-white z-10">
                  New
                </Badge>
              )}
            </>
          )}
          
          {/* Hover overlay with Add to Cart */}
          {!isOwned && showAddToCart && (
            <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/60 transition-all duration-300 flex items-center justify-center">
              <Button 
                className="opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 bg-white text-gray-900 hover:bg-gray-100"
                size="sm"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : addedToCart ? (
                  <ArrowRight className="w-4 h-4 mr-2" />
                ) : (
                  <ShoppingCart className="w-4 h-4 mr-2" />
                )}
                {isAddingToCart ? 'Đang thêm...' : addedToCart ? 'Xem giỏ hàng' : 'Thêm vào giỏ'}
              </Button>
            </div>
          )}
        </div>
        
        <CardContent className="p-4 space-y-2 flex-1 flex flex-col">
          <h4 className="font-medium line-clamp-2 flex-1">{title}</h4>
          <p className="text-sm text-muted-foreground">{instructor}</p>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{rating}</span>
            </div>
            <span className="text-muted-foreground">
              ({typeof reviews === 'number' ? reviews.toLocaleString() : reviews})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{formattedPrice}</span>
            {formattedOriginalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formattedOriginalPrice}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="text-xs font-bold text-red-600">-{discountPercent}%</span>
            )}
          </div>
          {showCountdown && (
            <DiscountCountdown endDate={discountEndDate} onExpire={handleDiscountExpire} variant="badge" discountPercent={discountPercent} />
          )}
        </CardContent>
      </Card>
    )
  }

  // Horizontal variant for list view
  if (variant === 'horizontal') {
    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow group/card overflow-hidden min-h-[200px]"
        onClick={handleClick}
      >
        <div className="flex flex-col sm:flex-row">
          <div className="relative sm:w-64 flex-shrink-0">
            <ImageWithFallback
              src={image}
              alt={title}
              className="w-full h-48 sm:h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
            />
            {isOwned ? (
              <Badge className="absolute top-2 left-2 bg-green-600 text-white flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Đã sở hữu
              </Badge>
            ) : (
              <>
                {bestseller && (
                  <Badge className="absolute top-2 left-2 bg-yellow-400 text-black">
                    Bestseller
                  </Badge>
                )}
                {isNew && (
                  <Badge className="absolute top-2 left-2 bg-blue-600 text-white">
                    New
                  </Badge>
                )}
              </>
            )}
            
            {/* Wishlist Button */}
            {showWishlist && (
              <button
                className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-900 transition-colors z-20 hover:scale-110 shadow-sm"
                onClick={handleToggleWishlist}
                title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
              </button>
            )}
          </div>
          
          <CardContent className="p-4 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors text-lg">
                {title}
              </h3>
              
              <p className="text-sm text-muted-foreground">
                {instructor}
              </p>
    
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center space-x-1">
                  <span className="font-semibold text-orange-500">{rating}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(rating) 
                            ? "fill-orange-500 text-orange-500" 
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-muted-foreground">
                  ({typeof reviews === 'number' ? reviews.toLocaleString() : reviews})
                </span>
              </div>
    
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{duration}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{formattedStudents}</span>
                </div>
                <Badge variant="secondary">{level}</Badge>
              </div>
            </div>
    
            {isOwned ? (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tiến độ</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xl">{formattedPrice}</span>
                    {formattedOriginalPrice && (
                      <span className="text-sm text-muted-foreground line-through">{formattedOriginalPrice}</span>
                    )}
                    {discountPercent > 0 && (
                      <span className="text-xs font-bold text-red-600">-{discountPercent}%</span>
                    )}
                  </div>
                  {showAddToCart && (
                    <Button 
                      size="sm"
                      onClick={handleAddToCart}
                      disabled={isAddingToCart}
                    >
                      {isAddingToCart ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : addedToCart ? (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 mr-2" />
                      )}
                      {isAddingToCart ? 'Đang thêm...' : addedToCart ? 'Xem giỏ hàng' : 'Thêm vào giỏ'}
                    </Button>
                  )}
                </div>
                {showCountdown && (
                  <DiscountCountdown endDate={discountEndDate} onExpire={handleDiscountExpire} variant="badge" discountPercent={discountPercent} />
                )}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    )
  }
  
  // Vertical variant (default)
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow group/card relative flex flex-col h-full"
      onClick={handleClick}
    >
      <div className="relative overflow-hidden">
        <ImageWithFallback
          src={image}
          alt={title}
          className="w-full h-48 object-cover rounded-t-lg group-hover/card:scale-105 transition-transform duration-300"
        />
        {isOwned ? (
          <Badge className="absolute top-2 left-2 bg-green-600 text-white flex items-center gap-1 z-10">
            <CheckCircle className="h-3 w-3" />
            Đã sở hữu
          </Badge>
        ) : (
          <>
            {bestseller && (
              <Badge className="absolute top-2 left-2 bg-yellow-400 text-black z-10">
                Bestseller
              </Badge>
            )}
            {isNew && (
              <Badge className="absolute top-2 left-2 bg-blue-600 text-white z-10">
                New
              </Badge>
            )}
          </>
        )}

        {/* Wishlist Button */}
        {showWishlist && (
          <button
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-900 transition-colors z-20 hover:scale-110 shadow-sm"
            onClick={handleToggleWishlist}
            title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
        )}
        
        {/* Add to Cart Overlay - Only show for non-owned courses */}
        {!isOwned && showAddToCart && (
          <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/60 transition-all duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col gap-2 px-4 w-full">
              <Button 
                className="w-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : addedToCart ? (
                  <ArrowRight className="w-4 h-4 mr-2" />
                ) : (
                  <ShoppingCart className="w-4 h-4 mr-2" />
                )}
                {isAddingToCart ? 'Đang thêm...' : addedToCart ? 'Xem giỏ hàng' : 'Thêm vào giỏ'}
              </Button>
              <Button 
                variant="outline"
                className="w-full bg-white dark:bg-gray-800 border-white dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClick()
                }}
              >
                Xem chi tiết
              </Button>
            </div>
          </div>
        )}
        
        {isOwned && (
          <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/40 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover/card:opacity-100 transition-opacity">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-8 h-8 text-gray-900 ml-1" />
              </div>
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="space-y-2 flex-1 flex flex-col">
          <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors min-h-[3rem]">
            {title}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {instructor}
          </p>

          <div className="flex items-center space-x-2 text-sm">
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-orange-500">{rating}</span>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < Math.floor(rating) 
                        ? "fill-orange-500 text-orange-500" 
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
            <span className="text-gray-500 dark:text-gray-400">
              ({typeof reviews === 'number' ? reviews.toLocaleString() : reviews})
            </span>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{duration}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{formattedStudents}</span>
              </div>
            </div>
            <Badge variant="secondary">{level}</Badge>
          </div>

          {isOwned ? (
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tiến độ</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <Button className="w-full mt-2" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Tiếp tục học
              </Button>
            </div>
          ) : (
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg">{formattedPrice}</span>
                  {formattedOriginalPrice && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                      {formattedOriginalPrice}
                    </span>
                  )}                  {discountPercent > 0 && (
                    <span className="text-xs font-bold text-red-600">-{discountPercent}%</span>
                  )}                </div>
                {category && (
                  <Badge variant="outline" className="text-xs">
                    {category}
                  </Badge>
                )}
              </div>
              {showCountdown && (
                <DiscountCountdown endDate={discountEndDate} onExpire={handleDiscountExpire} variant="badge" />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
