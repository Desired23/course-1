





import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface CartUIState {

  dropdownOpen: boolean
  openDropdown: () => void
  closeDropdown: () => void
  toggleDropdown: () => void


  miniCartOpen: boolean
  openMiniCart: () => void
  closeMiniCart: () => void
  toggleMiniCart: () => void


  recentlyAddedCourseId: string | null
  setRecentlyAdded: (courseId: string) => void
  clearRecentlyAdded: () => void


  addingToCart: boolean
  removingFromCart: boolean
  setAddingToCart: (adding: boolean) => void
  setRemovingFromCart: (removing: boolean) => void


  checkoutStep: 'cart' | 'payment' | 'confirmation'
  setCheckoutStep: (step: CartUIState['checkoutStep']) => void
  resetCheckout: () => void
}

export const useCartUIStore = create<CartUIState>()(
  devtools(
    (set, get) => ({

      dropdownOpen: false,

      openDropdown: () => set({ dropdownOpen: true }),

      closeDropdown: () => set({ dropdownOpen: false }),

      toggleDropdown: () => set((state) => ({
        dropdownOpen: !state.dropdownOpen
      })),


      miniCartOpen: false,

      openMiniCart: () => set({ miniCartOpen: true }),

      closeMiniCart: () => set({ miniCartOpen: false }),

      toggleMiniCart: () => set((state) => ({
        miniCartOpen: !state.miniCartOpen
      })),


      recentlyAddedCourseId: null,

      setRecentlyAdded: (courseId) => {
        set({ recentlyAddedCourseId: courseId })


        setTimeout(() => {
          if (get().recentlyAddedCourseId === courseId) {
            get().clearRecentlyAdded()
          }
        }, 3000)
      },

      clearRecentlyAdded: () => set({ recentlyAddedCourseId: null }),


      addingToCart: false,
      removingFromCart: false,

      setAddingToCart: (adding) => set({ addingToCart: adding }),

      setRemovingFromCart: (removing) => set({ removingFromCart: removing }),


      checkoutStep: 'cart',

      setCheckoutStep: (step) => set({ checkoutStep: step }),

      resetCheckout: () => set({ checkoutStep: 'cart' })
    }),
    { name: 'Cart UI Store' }
  )
)


export const selectDropdownOpen = (state: CartUIState) => state.dropdownOpen
export const selectMiniCartOpen = (state: CartUIState) => state.miniCartOpen
export const selectRecentlyAdded = (state: CartUIState) => state.recentlyAddedCourseId
export const selectCheckoutStep = (state: CartUIState) => state.checkoutStep
