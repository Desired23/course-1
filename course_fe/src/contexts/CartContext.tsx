import React, { useEffect } from 'react'
import { useCartStore, Course, Coupon, AppliedPromotion } from '../stores/cart.store'
import { useAuthStore } from '../stores/auth.store'


export type { Course, Coupon, AppliedPromotion }


export function CartProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((state) => state.user?.id)
  const loadCart = useCartStore((state) => state.loadCart)
  const clearCart = useCartStore((state) => state.clearCart)

  useEffect(() => {
    if (userId) {
      loadCart(Number(userId))
      return
    }
    clearCart()
  }, [userId, loadCart, clearCart])

  return <>{children}</>
}


export function useCart() {
  const store = useCartStore()

  return {
    cartItems: store.cartItems,
    orderCoupon: store.orderCoupon,
    appliedPromotion: store.appliedPromotion,
    addToCart: store.addToCart,
    addToCartFromApi: store.addToCartFromApi,
    removeFromCart: store.removeFromCart,
    clearCart: store.clearCart,
    loadCart: store.loadCart,
    applyCoupon: store.applyCoupon,
    removeCoupon: store.removeCoupon,
    getTotalPrice: store.getTotalPrice,
    getOriginalPrice: store.getOriginalPrice,
    getSavings: store.getSavings,
    isInCart: store.isInCart,
    isInCartByCourseId: store.isInCartByCourseId,
  }
}
