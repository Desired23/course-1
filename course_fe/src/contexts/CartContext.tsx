import React from 'react'
import { useCartStore, Course, Coupon } from '../stores/cart.store'

// Re-export types for backward compatibility
export type { Course, Coupon }

// CartProvider is now just a wrapper (State managed by Zustand)
export function CartProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Hook adapter
export function useCart() {
  const store = useCartStore()
  
  return {
    cartItems: store.cartItems,
    orderCoupon: store.orderCoupon,
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
