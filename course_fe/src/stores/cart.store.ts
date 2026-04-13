





import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import i18n from '../utils/i18n'
import { toast } from 'sonner'
import {
  getAllCartByUser,
  addToCart as addToCartApi,
  removeFromCart as removeFromCartApi,
  type CartItem,
  getCartEffectivePrice,
  getCartOriginalPrice,
  formatCartPrice,
} from '../services/cart.api'
import {
  validatePromotionCode,
  type ValidatePromotionResponse,
  type PromotionInfo,
} from '../services/promotion.api'


export interface Course {
  id: string
  courseId: number
  title: string
  instructor: string
  originalPrice: number
  currentPrice: number
  image: string
  rating: number
  studentsCount: number
  duration: string
  couponCode?: string
  couponDiscount?: number
  promotionId?: number
  discountEndDate?: string | null
}

export interface Coupon {
  code: string
  type: 'course' | 'order'
  discount: number
  discountType: 'percentage' | 'fixed'
  minAmount?: number
  courseId?: string
  expiresAt?: Date
  isActive: boolean
}


export interface AppliedPromotion {
  promotion: PromotionInfo
  totalDiscount: number
  courseDiscounts: Record<number, number>
  validationResponse: ValidatePromotionResponse
}


function cartItemToCourse(item: CartItem): Course {
  const course = item.course_detail
  const effectivePrice = getCartEffectivePrice(course)
  const originalPrice = getCartOriginalPrice(course)
  return {
    id: String(item.id),
    courseId: item.course,
    title: course.title,
    instructor: course.instructor_name || 'Instructor',
    originalPrice,
    currentPrice: effectivePrice,
    image: course.thumbnail || '',
    rating: typeof course.rating === 'string' ? parseFloat(course.rating) || 0 : (course.rating ?? 0),
    studentsCount: course.enrollment_count || 0,
    duration: course.duration ? `${Math.floor(course.duration / 60)}h ${course.duration % 60}m` : '',
    discountEndDate: course.discount_end_date || null,
  }
}

interface CartState {
  cartItems: Course[]
  orderCoupon: Coupon | null
  appliedPromotion: AppliedPromotion | null
  _synced: boolean


  loadCart: (userId: number) => Promise<void>
  addToCart: (course: Course) => void
  addToCartFromApi: (userId: number, courseId: number, courseMeta: Partial<Course>) => Promise<void>
  removeFromCart: (courseId: string) => void
  clearCart: () => void
  mergeCart: (serverItems: Course[]) => void
  applyCoupon: (couponCode: string, courseId?: string) => Promise<boolean>
  removeCoupon: (courseId?: string) => void


  getOriginalPrice: () => number
  getTotalPrice: () => number
  getSavings: () => number
  isInCart: (courseId: string) => boolean
  isInCartByCourseId: (courseId: number) => boolean
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        cartItems: [],
        orderCoupon: null,
        appliedPromotion: null,
        _synced: false,


        loadCart: async (userId) => {
          try {
            const items = await getAllCartByUser(userId)
            const courses = items.map(cartItemToCourse)
            set({ cartItems: courses, _synced: true })
          } catch {

            set({ cartItems: [], _synced: true })
          }
        },


        addToCart: (course) => {
          const state = get()
          if (state.cartItems.find(item => item.id === course.id)) {
            toast.info(i18n.t('cart_store.already_in_cart'))
            return
          }
          set({ cartItems: [...state.cartItems, course] })
          toast.success(i18n.t('cart_store.added_to_cart'))
        },


        addToCartFromApi: async (userId, courseId, courseMeta) => {
          const state = get()
          if (state.cartItems.find(item => item.courseId === courseId)) {
            toast.info(i18n.t('cart_store.already_in_cart'))
            return
          }
          try {
            const created = await addToCartApi({ user: userId, course: courseId })
            const newCourse = cartItemToCourse(created)
            set({ cartItems: [...get().cartItems, newCourse] })
            toast.success(i18n.t('cart_store.added_to_cart'))
          } catch {
            toast.error(i18n.t('cart_store.add_to_cart_failed'))
          }
        },

        removeFromCart: async (courseId) => {

          const item = get().cartItems.find(i => i.id === courseId)
          set((state) => ({
            cartItems: state.cartItems.filter(item => item.id !== courseId)
          }))

          if (courseId && !isNaN(parseInt(courseId))) {
            try {
              await removeFromCartApi(parseInt(courseId))
            } catch {

              if (item) {
                set((state) => ({ cartItems: [...state.cartItems, item] }))
              }
            }
          }
        },

        clearCart: () => set({ cartItems: [], orderCoupon: null, appliedPromotion: null }),

        mergeCart: (serverItems) => {
          const state = get()
          const currentIds = new Set(state.cartItems.map(item => item.id))
          const newItems = serverItems.filter(item => !currentIds.has(item.id))
          if (newItems.length > 0) {
            set({ cartItems: [...state.cartItems, ...newItems] })
          }
        },

        applyCoupon: async (couponCode, courseId) => {
          const state = get()
          const courseIds = state.cartItems.map(item => item.courseId)

          if (courseIds.length === 0) return false

          try {
            const result = await validatePromotionCode(couponCode, courseIds)
            const promoInfo = result.promotion
            const totalDiscount = parseFloat(result.total_discount)


            const courseDiscounts: Record<number, number> = {}
            for (const c of result.courses) {
              const disc = parseFloat(c.discount)
              if (disc > 0) {
                courseDiscounts[c.course_id] = disc
              }
            }

            if (promoInfo.type === 'instructor') {

              const updatedItems = state.cartItems.map(item => {
                const disc = courseDiscounts[item.courseId]
                if (disc && disc > 0) {
                  return {
                    ...item,
                    couponCode: promoInfo.code,
                    couponDiscount: disc,
                    promotionId: promoInfo.id,
                  }
                }
                return item
              })

              set({
                cartItems: updatedItems,
                appliedPromotion: {
                  promotion: promoInfo,
                  totalDiscount,
                  courseDiscounts,
                  validationResponse: result,
                },
              })
            } else {

              set({
                orderCoupon: {
                  code: promoInfo.code,
                  type: 'order',
                  discount: totalDiscount,
                  discountType: 'fixed',
                  isActive: true,
                  minAmount: parseFloat(promoInfo.min_purchase),
                },
                appliedPromotion: {
                  promotion: promoInfo,
                  totalDiscount,
                  courseDiscounts,
                  validationResponse: result,
                },
              })
            }

            return true
          } catch (err: any) {

            const msg = err?.error?.error || err?.message || 'Mã giảm giá không hợp lệ'
            toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
            return false
          }
        },

        removeCoupon: (courseId) => {
          if (courseId) {
            set((state) => ({
              cartItems: state.cartItems.map(item => {
                if (item.id === courseId) {
                  const { couponCode, couponDiscount, promotionId, ...rest } = item
                  return rest as Course
                }
                return item
              }),
              appliedPromotion: null,
            }))
          } else {
            set({ orderCoupon: null, appliedPromotion: null })
          }
        },

        getOriginalPrice: () => {
          return get().cartItems.reduce((total, item) => total + item.currentPrice, 0)
        },

        getTotalPrice: () => {
          const state = get()
          let total = state.cartItems.reduce((sum, item) => {
            const itemPrice = item.couponDiscount
              ? item.currentPrice - item.couponDiscount
              : item.currentPrice
            return sum + itemPrice
          }, 0)

          if (state.orderCoupon) {
            const orderDiscount = state.orderCoupon.discountType === 'percentage'
              ? (total * state.orderCoupon.discount / 100)
              : state.orderCoupon.discount
            total = Math.max(0, total - orderDiscount)
          }
          return total
        },

        getSavings: () => {
          const originalTotal = get().cartItems.reduce((total, item) => total + item.originalPrice, 0)
          return originalTotal - get().getTotalPrice()
        },

        isInCart: (courseId) => {
          return get().cartItems.some(item => item.id === courseId)
        },

        isInCartByCourseId: (courseId) => {
          return get().cartItems.some(item => item.courseId === courseId)
        },
      }),
      {
        name: 'cart-storage',
      }
    ),
    { name: 'Cart Store' }
  )
)
