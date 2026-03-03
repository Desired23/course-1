/**
 * UI Store - Global UI State Management
 * Handles: Theme, Sidebar, Layout preferences
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface UIState {
  // Theme
  theme: Theme
  darkMode: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarCollapsed: () => void
  
  // Mobile
  mobileMenuOpen: boolean
  toggleMobileMenu: () => void
  setMobileMenuOpen: (open: boolean) => void
  
  // Search
  searchOpen: boolean
  toggleSearch: () => void
  setSearchOpen: (open: boolean) => void
  
  // Layout
  layoutMode: 'grid' | 'list'
  setLayoutMode: (mode: 'grid' | 'list') => void
  
  // Floating Navigation
  floatingNavOpen: boolean
  toggleFloatingNav: () => void
  setFloatingNavOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Theme - Default
        theme: 'light',
        darkMode: false,
        
        setTheme: (theme) => {
          set({ theme })
          
          // Auto detect dark mode from system
          if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            set({ darkMode: prefersDark })
          } else {
            set({ darkMode: theme === 'dark' })
          }
          
          // Apply to document
          if (get().darkMode) {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        },
        
        toggleTheme: () => {
          const currentTheme = get().theme
          const newTheme = currentTheme === 'light' ? 'dark' : 'light'
          get().setTheme(newTheme)
        },
        
        // Sidebar - Default open on desktop, closed on mobile
        sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
        sidebarCollapsed: false,
        
        toggleSidebar: () => set((state) => ({ 
          sidebarOpen: !state.sidebarOpen 
        })),
        
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        
        toggleSidebarCollapsed: () => set((state) => ({ 
          sidebarCollapsed: !state.sidebarCollapsed 
        })),
        
        // Mobile Menu - Default closed
        mobileMenuOpen: false,
        
        toggleMobileMenu: () => set((state) => ({ 
          mobileMenuOpen: !state.mobileMenuOpen 
        })),
        
        setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
        
        // Search - Default closed
        searchOpen: false,
        
        toggleSearch: () => set((state) => ({ 
          searchOpen: !state.searchOpen 
        })),
        
        setSearchOpen: (open) => set({ searchOpen: open }),
        
        // Layout Mode - Default grid
        layoutMode: 'grid',
        
        setLayoutMode: (mode) => set({ layoutMode: mode }),
        
        // Floating Navigation - Default closed
        floatingNavOpen: false,
        
        toggleFloatingNav: () => set((state) => ({ 
          floatingNavOpen: !state.floatingNavOpen 
        })),
        
        setFloatingNavOpen: (open) => set({ floatingNavOpen: open })
      }),
      {
        name: 'ui-store', // LocalStorage key
        partialize: (state) => ({
          // Only persist these fields
          theme: state.theme,
          darkMode: state.darkMode,
          sidebarCollapsed: state.sidebarCollapsed,
          layoutMode: state.layoutMode
          // Don't persist: sidebarOpen, mobileMenuOpen, searchOpen, floatingNavOpen
        })
      }
    ),
    { name: 'UI Store' } // DevTools name
  )
)

// Selectors (for performance)
export const selectTheme = (state: UIState) => state.theme
export const selectDarkMode = (state: UIState) => state.darkMode
export const selectSidebarOpen = (state: UIState) => state.sidebarOpen
export const selectMobileMenuOpen = (state: UIState) => state.mobileMenuOpen

// Compatibility aliases for legacy code
export const useUIStoreCompat = () => {
  const store = useUIStore()
  return {
    ...store,
    // Aliases for sidebar
    isOpen: store.sidebarOpen,
    toggle: store.toggleSidebar,
    close: () => store.setSidebarOpen(false),
    open: () => store.setSidebarOpen(true),
  }
}