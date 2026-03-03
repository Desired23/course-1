/**
 * Cart UI Store - Cart Dropdown & UI State
 * Handles: Cart dropdown, animations, mini cart
 * Note: Actual cart data in CartContext
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface CartUIState {
  // Dropdown
  dropdownOpen: boolean
  openDropdown: () => void
  closeDropdown: () => void
  toggleDropdown: () => void
  
  // Mini cart (mobile)
  miniCartOpen: boolean
  openMiniCart: () => void
  closeMiniCart: () => void
  toggleMiniCart: () => void
  
  // Recently added (for animation)
  recentlyAddedCourseId: string | null
  setRecentlyAdded: (courseId: string) => void
  clearRecentlyAdded: () => void
  
  // Loading states (for UI feedback)
  addingToCart: boolean
  removingFromCart: boolean
  setAddingToCart: (adding: boolean) => void
  setRemovingFromCart: (removing: boolean) => void
  
  // Checkout step (for multi-step checkout)
  checkoutStep: 'cart' | 'payment' | 'confirmation'
  setCheckoutStep: (step: CartUIState['checkoutStep']) => void
  resetCheckout: () => void
}

export const useCartUIStore = create<CartUIState>()(
  devtools(
    (set, get) => ({
      // Dropdown
      dropdownOpen: false,
      
      openDropdown: () => set({ dropdownOpen: true }),
      
      closeDropdown: () => set({ dropdownOpen: false }),
      
      toggleDropdown: () => set((state) => ({ 
        dropdownOpen: !state.dropdownOpen 
      })),
      
      // Mini Cart
      miniCartOpen: false,
      
      openMiniCart: () => set({ miniCartOpen: true }),
      
      closeMiniCart: () => set({ miniCartOpen: false }),
      
      toggleMiniCart: () => set((state) => ({ 
        miniCartOpen: !state.miniCartOpen 
      })),
      
      // Recently Added
      recentlyAddedCourseId: null,
      
      setRecentlyAdded: (courseId) => {
        set({ recentlyAddedCourseId: courseId })
        
        // Auto clear after 3 seconds
        setTimeout(() => {
          if (get().recentlyAddedCourseId === courseId) {
            get().clearRecentlyAdded()
          }
        }, 3000)
      },
      
      clearRecentlyAdded: () => set({ recentlyAddedCourseId: null }),
      
      // Loading States
      addingToCart: false,
      removingFromCart: false,
      
      setAddingToCart: (adding) => set({ addingToCart: adding }),
      
      setRemovingFromCart: (removing) => set({ removingFromCart: removing }),
      
      // Checkout
      checkoutStep: 'cart',
      
      setCheckoutStep: (step) => set({ checkoutStep: step }),
      
      resetCheckout: () => set({ checkoutStep: 'cart' })
    }),
    { name: 'Cart UI Store' }
  )
)

// Selectors
export const selectDropdownOpen = (state: CartUIState) => state.dropdownOpen
export const selectMiniCartOpen = (state: CartUIState) => state.miniCartOpen
export const selectRecentlyAdded = (state: CartUIState) => state.recentlyAddedCourseId
export const selectCheckoutStep = (state: CartUIState) => state.checkoutStep
