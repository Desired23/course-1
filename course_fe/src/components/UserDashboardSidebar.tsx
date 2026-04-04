import { useRouter } from "./Router"
import { useAuth } from "../contexts/AuthContext"
import { useUIStore } from "../stores"
import { cn } from "./ui/utils"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { useMinWidth } from "../hooks/useMinWidth"
import { 
  BookOpen, 
  ShoppingCart, 
  Heart, 
  Star, 
  User, 
  Bell, 
  Settings, 
  CreditCard, 
  Package,
  Receipt,
  LogOut,
} from "lucide-react"

interface SidebarItem {
  label: string
  icon: React.ReactNode
  href: string
  dividerAfter?: boolean
}

interface UserDashboardSidebarProps {
  className?: string
}

export function UserDashboardSidebar({ className }: UserDashboardSidebarProps) {
  const { navigate, currentRoute } = useRouter()
  const { user, logout } = useAuth()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const { t } = useTranslation()
  const isDesktopSidebar = useMinWidth(1024)
  const isSidebarVisible = isDesktopSidebar || sidebarOpen

  const menuItems: SidebarItem[] = [
    { label: t('common.my_learning'), icon: <BookOpen className="h-4 w-4" />, href: '/my-learning' },
    { label: t('common.my_cart'), icon: <ShoppingCart className="h-4 w-4" />, href: '/cart' },
    { label: t('common.wishlist'), icon: <Heart className="h-4 w-4" />, href: '/wishlist' },
    { label: t('common.my_reviews'), icon: <Star className="h-4 w-4" />, href: '/user/my-reviews' },
    { label: t('common.profile'), icon: <User className="h-4 w-4" />, href: '/profile' },
    { label: t('common.notifications'), icon: <Bell className="h-4 w-4" />, href: '/notifications', dividerAfter: true },
    { label: t('common.account_settings'), icon: <Settings className="h-4 w-4" />, href: '/account-settings' },
    { label: t('sidebar.payment_methods') || 'Payment methods', icon: <CreditCard className="h-4 w-4" />, href: '/user/payment-methods' },
    { label: t('user_dashboard_sidebar.transaction_history'), icon: <Receipt className="h-4 w-4" />, href: '/user/transactions' },
    { label: t('sidebar.subscriptions') || 'Subscriptions', icon: <Package className="h-4 w-4" />, href: '/user/subscriptions', dividerAfter: true },
  ]

  const handleLogout = () => {
    setSidebarOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <>
      {!isDesktopSidebar && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed top-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col overflow-visible border-r border-white/10 bg-black/60 text-white backdrop-blur-md transition-transform duration-300",
        isSidebarVisible ? "translate-x-0" : "-translate-x-full",
        className
      )}
      style={isDesktopSidebar ? { top: "64px", height: "calc(100vh - 64px)", zIndex: 20 } : undefined}>
        <div className="border-b border-white/10 px-4 py-4 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 sm:h-10 sm:w-10">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="truncate text-xs sm:text-sm">{user?.name || t('user_dashboard_sidebar.default_name')}</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto py-2 scrollbar-thin">
          <div>
            {menuItems.map((item) => (
              <div key={item.href}>
                <button
                  className={cn(
                    "mx-1 w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-white/10 sm:px-4 sm:py-2.5",
                    currentRoute === item.href && "bg-white/10"
                  )}
                  onClick={() => {
                    navigate(item.href)
                    if (!isDesktopSidebar) setSidebarOpen(false)
                  }}
                >
                  <span className="flex items-center gap-2 sm:gap-3">
                    {item.icon}
                    <span className="text-xs sm:text-sm">{item.label}</span>
                  </span>
                </button>
                {item.dividerAfter && (
                  <div className="my-2 border-t border-white/10" />
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-auto px-4 py-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-400">{t('common.language')}</span>
              <LanguageSwitcher />
            </div>
          </div>

          <button
            className="mx-1 w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-white/10 sm:px-4 sm:py-2.5"
            onClick={handleLogout}
          >
            <span className="flex items-center gap-2 sm:gap-3">
              <LogOut className="h-4 w-4" />
              <span className="text-xs sm:text-sm">{t('common.log_out')}</span>
            </span>
          </button>
        </nav>
      </aside>
    </>
  )
}
