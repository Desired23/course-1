/**
 * Zustand Stores - Central Export
 * All stores exported from here
 */

// UI Store
export { 
  useUIStore,
  selectTheme,
  selectDarkMode,
  selectSidebarOpen,
  selectMobileMenuOpen,
  type Theme
} from './ui.store'

// Modal Store
export {
  useModalStore,
  useModal,
  useConfirm,
  selectIsModalOpen,
  selectModalData,
  type ModalType
} from './modal.store'

// Player Store
export {
  usePlayerStore,
  selectPlaybackRate,
  selectVolume,
  selectQuality,
  selectSubtitles,
  type PlaybackRate,
  type VideoQuality
} from './player.store'

// Toast Store
export {
  useToastStore,
  useToast,
  selectToasts,
  selectLatestToast,
  type Toast,
  type ToastType
} from './toast.store'

// Cart UI Store
export {
  useCartUIStore,
  selectDropdownOpen,
  selectMiniCartOpen,
  selectRecentlyAdded,
  selectCheckoutStep
} from './cart-ui.store'

// Filter Store
export {
  useFilterStore,
  selectSearchQuery,
  selectFilters,
  selectSortAndView,
  selectPagination,
  type SortOption,
  type PriceRange
} from './filter.store'

// Quiz Store
export {
  useQuizStore,
  type QuizAnswer
} from './quiz.store'

// Store DevTools
export { useStoreDevTools } from './devtools'