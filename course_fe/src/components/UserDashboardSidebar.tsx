import { useRouter } from "./Router"
import { useAuth } from "../contexts/AuthContext"
import { useUIStore } from "../stores"
import { cn } from "./ui/utils"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "./LanguageSwitcher"
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
  ChevronLeft,
  ChevronRight,
  X,
  Menu
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
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore()
  const { t } = useTranslation()

  const menuItems: SidebarItem[] = [
    { label: t('common.my_learning'), icon: <BookOpen className="h-4 w-4" />, href: '/my-learning' },
    { label: t('common.my_cart'), icon: <ShoppingCart className="h-4 w-4" />, href: '/cart' },
    { label: t('common.wishlist'), icon: <Heart className="h-4 w-4" />, href: '/wishlist' },
    { label: t('common.my_reviews'), icon: <Star className="h-4 w-4" />, href: '/user/my-reviews' }, // Added to translation? I'll use raw string if not in key, but I should probably add it. I used generic common keys.
    { label: t('common.profile'), icon: <User className="h-4 w-4" />, href: '/profile' },
    { label: t('common.notifications'), icon: <Bell className="h-4 w-4" />, href: '/notifications', dividerAfter: true },
    { label: t('common.account_settings'), icon: <Settings className="h-4 w-4" />, href: '/account-settings' },
    { label: t('sidebar.payment_methods') || 'Payment methods', icon: <CreditCard className="h-4 w-4" />, href: '/user/payment-methods' },
    { label: t('user_dashboard_sidebar.transaction_history'), icon: <Receipt className="h-4 w-4" />, href: '/user/transactions' },
    { label: t('sidebar.subscriptions') || 'Subscriptions', icon: <Package className="h-4 w-4" />, href: '/user/subscriptions', dividerAfter: true },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Overlay for Popup Mode */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 hidden md:block top-16"
          onClick={() => setSidebarOpen(false)}
        />
      )}


      {/* Toggle Button - Desktop (Moved to bottom) */}


      <aside className={cn(
        "fixed top-0 left-0 h-screen md:top-16 md:h-[calc(100vh-64px)] bg-black/60 backdrop-blur-md border-r border-white/10 text-white flex flex-col shrink-0 transition-all duration-300 z-50 md:z-20 overflow-visible",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        sidebarOpen ? "w-64" : "w-64 md:w-16",
        className
      )}>
        {/* User Info */}
        <div className={cn(
          "px-4 py-4 md:py-6 border-b border-white/10 transition-all duration-300",
          !sidebarOpen && "md:px-2 md:py-4"
        )}>
          <div className={cn(
            "flex items-center gap-3",
            !sidebarOpen && "md:flex-col md:gap-2"
          )}>
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden min-w-0">
                <p className="truncate text-xs md:text-sm">{user?.name || t('user_dashboard_sidebar.default_name')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin">
          <TooltipProvider delayDuration={300}>
            {menuItems.map((item) => (
              <div key={item.href}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "w-full px-3 md:px-4 py-2 md:py-2.5 text-left hover:bg-white/10 transition-colors rounded-md mx-1",
                        currentRoute === item.href && "bg-white/10",
                        !sidebarOpen && "md:px-2 md:flex md:justify-center"
                      )}
                      onClick={() => {
                        navigate(item.href)
                        if (window.innerWidth < 768) setSidebarOpen(false) // Close on mobile after navigation
                      }}
                    >
                      <span className={cn(
                        "flex items-center gap-2 md:gap-3",
                        !sidebarOpen && "md:justify-center"
                      )}>
                        {item.icon}
                        {sidebarOpen && <span className="text-xs md:text-sm">{item.label}</span>}
                      </span>
                    </button>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right" className="hidden md:block">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                {item.dividerAfter && sidebarOpen && (
                  <div className="my-2 border-t border-white/10" />
                )}
              </div>
            ))}
          </TooltipProvider>
          
          <div className="mt-auto px-4 py-2">
            {sidebarOpen ? (
               <div className="flex items-center justify-between mb-2">
                 <span className="text-xs text-gray-400">{t('common.language')}</span>
                 <LanguageSwitcher />
               </div>
            ) : (
              <div className="flex justify-center mb-2">
                 <LanguageSwitcher />
              </div>
            )}
          </div>

          {/* Logout Button */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "w-full px-3 md:px-4 py-2 md:py-2.5 text-left hover:bg-white/10 transition-colors rounded-md mx-1",
                    !sidebarOpen && "md:px-2 md:flex md:justify-center"
                  )}
                  onClick={handleLogout}
                >
                  <span className={cn(
                    "flex items-center gap-2 md:gap-3",
                    !sidebarOpen && "md:justify-center"
                  )}>
                    <LogOut className="h-4 w-4" />
                    {sidebarOpen && <span className="text-xs md:text-sm">{t('common.log_out')}</span>}
                  </span>
                </button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right" className="hidden md:block">
                  <p>{t('common.log_out')}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </nav>

          {/* Middle Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-50 rounded-full h-8 w-8 bg-black/80 hover:bg-black text-white border border-white/20 shadow-lg backdrop-blur-md transition-all duration-300 left-full -translate-x-1/2"
            onClick={toggleSidebar}
            title={sidebarOpen ? t('user_dashboard_sidebar.collapse') : t('user_dashboard_sidebar.expand')}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
      </aside>
    </>
  )
}
