




import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface UIState {

  theme: Theme
  darkMode: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void


  sidebarOpen: boolean
  sidebarCollapsed: boolean
  adminSidebarGroups: Record<string, boolean>
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarCollapsed: () => void
  setAdminSidebarGroupOpen: (group: string, open: boolean) => void


  mobileMenuOpen: boolean
  toggleMobileMenu: () => void
  setMobileMenuOpen: (open: boolean) => void


  searchOpen: boolean
  toggleSearch: () => void
  setSearchOpen: (open: boolean) => void


  layoutMode: 'grid' | 'list'
  setLayoutMode: (mode: 'grid' | 'list') => void


  floatingNavOpen: boolean
  toggleFloatingNav: () => void
  setFloatingNavOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({

        theme: 'light',
        darkMode: false,

        setTheme: (theme) => {
          set({ theme })


          if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            set({ darkMode: prefersDark })
          } else {
            set({ darkMode: theme === 'dark' })
          }


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


        sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
        sidebarCollapsed: false,
        adminSidebarGroups: {},

        toggleSidebar: () => set((state) => ({
          sidebarOpen: !state.sidebarOpen
        })),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        toggleSidebarCollapsed: () => set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed
        })),

        setAdminSidebarGroupOpen: (group, open) => set((state) => ({
          adminSidebarGroups: {
            ...state.adminSidebarGroups,
            [group]: open,
          },
        })),


        mobileMenuOpen: false,

        toggleMobileMenu: () => set((state) => ({
          mobileMenuOpen: !state.mobileMenuOpen
        })),

        setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),


        searchOpen: false,

        toggleSearch: () => set((state) => ({
          searchOpen: !state.searchOpen
        })),

        setSearchOpen: (open) => set({ searchOpen: open }),


        layoutMode: 'grid',

        setLayoutMode: (mode) => set({ layoutMode: mode }),


        floatingNavOpen: false,

        toggleFloatingNav: () => set((state) => ({
          floatingNavOpen: !state.floatingNavOpen
        })),

        setFloatingNavOpen: (open) => set({ floatingNavOpen: open })
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({

          theme: state.theme,
          darkMode: state.darkMode,
          sidebarCollapsed: state.sidebarCollapsed,
          adminSidebarGroups: state.adminSidebarGroups,
          layoutMode: state.layoutMode

        })
      }
    ),
    { name: 'UI Store' }
  )
)


export const selectTheme = (state: UIState) => state.theme
export const selectDarkMode = (state: UIState) => state.darkMode
export const selectSidebarOpen = (state: UIState) => state.sidebarOpen
export const selectMobileMenuOpen = (state: UIState) => state.mobileMenuOpen


export const useUIStoreCompat = () => {
  const store = useUIStore()
  return {
    ...store,

    isOpen: store.sidebarOpen,
    toggle: store.toggleSidebar,
    close: () => store.setSidebarOpen(false),
    open: () => store.setSidebarOpen(true),
  }
}
