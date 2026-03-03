/**
 * Cart Store - Cart Data Management
 * Backed by BE /api/carts/ API.
 * Local Zustand state for fast UX, syncs with server on load.
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { toast } from 'sonner@2.0.3'
import {
  getAllCartByUser,
  addToCart as addToCartApi,
  removeFromCart as removeFromCartApi,
  type CartItem,
  getCartEffectivePrice,
  getCartOriginalPrice,
  formatCartPrice,
} from '../services/cart.api'

// ─── Re-export Course type for backward compat with CartContext / CartPage ────
export interface Course {
  id: string               // cart item id (as string for compat)
  courseId: number          // real course FK id
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

/** Convert a BE CartItem to the local Course shape. */
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
  }
}

interface CartState {
  cartItems: Course[]
  orderCoupon: Coupon | null
  _synced: boolean

  // Actions
  loadCart: (userId: number) => Promise<void>
  addToCart: (course: Course) => void
  addToCartFromApi: (userId: number, courseId: number, courseMeta: Partial<Course>) => Promise<void>
  removeFromCart: (courseId: string) => void
  clearCart: () => void
  mergeCart: (serverItems: Course[]) => void
  applyCoupon: (couponCode: string, courseId?: string) => boolean
  removeCoupon: (courseId?: string) => void

  // Getters
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
        _synced: false,

        /** Fetch cart items from server & replace local state. */
        loadCart: async (userId) => {
          try {
            const items = await getAllCartByUser(userId)
            const courses = items.map(cartItemToCourse)
            set({ cartItems: courses, _synced: true })
          } catch {
            // If 404 / empty, just set empty
            set({ cartItems: [], _synced: true })
          }
        },

        /** Legacy: add locally (used by CartContext adapter). */
        addToCart: (course) => {
          const state = get()
          if (state.cartItems.find(item => item.id === course.id)) {
            toast.info('Khóa học này đã có trong giỏ hàng')
            return
          }
          set({ cartItems: [...state.cartItems, course] })
          toast.success('Đã thêm vào giỏ hàng')
        },

        /** Add to cart via API, then update local state. */
        addToCartFromApi: async (userId, courseId, courseMeta) => {
          const state = get()
          if (state.cartItems.find(item => item.courseId === courseId)) {
            toast.info('Khóa học này đã có trong giỏ hàng')
            return
          }
          try {
            const created = await addToCartApi({ user: userId, course: courseId })
            const newCourse = cartItemToCourse(created)
            set({ cartItems: [...get().cartItems, newCourse] })
            toast.success('Đã thêm vào giỏ hàng')
          } catch {
            toast.error('Không thể thêm vào giỏ hàng')
          }
        },

        removeFromCart: async (courseId) => {
          // Optimistic local remove
          const item = get().cartItems.find(i => i.id === courseId)
          set((state) => ({
            cartItems: state.cartItems.filter(item => item.id !== courseId)
          }))
          // Then call API
          if (courseId && !isNaN(parseInt(courseId))) {
            try {
              await removeFromCartApi(parseInt(courseId))
            } catch {
              // Revert on failure
              if (item) {
                set((state) => ({ cartItems: [...state.cartItems, item] }))
              }
            }
          }
        },

        clearCart: () => set({ cartItems: [], orderCoupon: null }),

        mergeCart: (serverItems) => {
          const state = get()
          const currentIds = new Set(state.cartItems.map(item => item.id))
          const newItems = serverItems.filter(item => !currentIds.has(item.id))
          if (newItems.length > 0) {
            set({ cartItems: [...state.cartItems, ...newItems] })
          }
        },

        applyCoupon: (couponCode, courseId) => {
          // Coupons remain client-side for now (no BE promotion validation endpoint yet)
          if (couponCode === 'UDEMY10' || couponCode === 'SAVE20') {
            const discount = couponCode === 'UDEMY10' ? 10 : 20
            const discountType = couponCode === 'UDEMY10' ? 'percentage' : 'fixed' as const
            set({
              orderCoupon: {
                code: couponCode, type: 'order', discount, discountType,
                isActive: true, minAmount: couponCode === 'UDEMY10' ? 50000 : 0
              }
            })
            return true
          }
          return false
        },

        removeCoupon: (courseId) => {
          if (courseId) {
            set((state) => ({
              cartItems: state.cartItems.map(item => {
                if (item.id === courseId) {
                  const { couponCode, couponDiscount, ...rest } = item
                  return rest as Course
                }
                return item
              })
            }))
          } else {
            set({ orderCoupon: null })
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
