import { useRouter } from "./Router"
import { useUIStore } from "../stores"
import { cn } from "./ui/utils"
import { useCart } from "../contexts/CartContext"
import { useAuth } from "../contexts/AuthContext"
import { useNotifications } from "../contexts/NotificationContext"
import { useChat } from "../contexts/ChatContext"
import { NotificationPopup } from "./NotificationPopup"
import { OnlineStatus } from "./OnlineStatus"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { GlobalSearch } from "./GlobalSearch"
import { CategoryMegaMenu } from "./CategoryMegaMenu"
import { CartSidebar } from "./CartSidebar"
import { NotificationSidebar } from "./NotificationSidebar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "./ui/dropdown-menu"
import { MessageCircle, Sun, Moon, User, LogOut, BookOpen, Settings, LayoutDashboard, GraduationCap, Heart, Globe, Menu, Search } from "lucide-react"
import { Badge } from "./ui/badge"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "./LanguageSwitcher"

interface HeaderProps {
  hideMobileMenu?: boolean
}

export function Header({ hideMobileMenu = false }: HeaderProps = {}) {
  const { t } = useTranslation()
  const { navigate, currentRoute } = useRouter()
  const { darkMode, toggleTheme, setSidebarOpen } = useUIStore()
  const { user, logout, isAuthenticated, hasRole } = useAuth()

  // Check if current route is a user dashboard route
  const isUserDashboard = 
    currentRoute.startsWith('/my-learning') ||
    currentRoute.startsWith('/cart') ||
    currentRoute.startsWith('/wishlist') ||
    currentRoute.startsWith('/user/') ||
    currentRoute.startsWith('/profile') ||
    currentRoute.startsWith('/notifications') ||
    currentRoute.startsWith('/account-settings');
  const { state: chatState, toggleChat } = useChat()
  const [isNotificationPopupOpen, setIsNotificationPopupOpen] = useState(false)
  
  // Auto-hide mobile menu for layout pages
  const shouldHideMobileMenu = hideMobileMenu || 
    currentRoute.startsWith('/instructor') || 
    currentRoute.startsWith('/admin') ||
    currentRoute.startsWith('/my-learning') ||
    currentRoute.startsWith('/profile') ||
    currentRoute.startsWith('/wishlist')
  
  // Determine user role for notification popup
  const getUserRole = () => {
    if (hasRole('admin')) return 'admin'
    if (hasRole('instructor')) return 'instructor'
    return 'user'
  }
  
  return (
    <header className="border-b bg-background sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo and Category Menu */}
          <div className="flex items-center gap-4">
            {shouldHideMobileMenu && <div className="w-10 md:hidden" />} {/* Spacer */}
            
            {/* Mobile Sidebar Toggle (User Dashboard) */}
            {isUserDashboard && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden -ml-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}

            <button 
              onClick={() => navigate('/')}
              className={cn(
                "flex items-center space-x-1 hover:opacity-80 transition-opacity flex-shrink-0",
                isUserDashboard && "md:relative absolute left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0"
              )}
            >
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground font-bold">U</span>
              </div>
              <span className="font-bold text-xl hidden lg:block">Udemy</span>
            </button>
            
            {/* Category Mega Menu - Desktop */}
            <div className="hidden lg:block">
              <CategoryMegaMenu />
            </div>
          </div>

          {/* Global Search - Center */}
          <div className="hidden md:block flex-1 max-w-2xl">
            <GlobalSearch />
          </div>
          
          {/* Mobile Search Icon */}
          {!isUserDashboard && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="sm:hidden"
              onClick={() => navigate('/search')}
            >
              <Search className="w-5 h-5" />
            </Button>
          )}

          {/* Right Side Navigation */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden md:flex hover:bg-blue-50 dark:hover:bg-blue-900/20 text-foreground font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200" 
              onClick={() => navigate('/udemy-business')}
            >
              Udemy Business
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden md:flex hover:bg-blue-50 dark:hover:bg-blue-900/20 text-foreground font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200" 
              onClick={() => navigate('/teach')}
            >
              {t('common.teach_on_udemy')}
            </Button>
            
            {/* Theme Toggle - Hidden on mobile */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden md:flex hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-110 hover:rotate-12" 
              onClick={toggleTheme}
            >
              {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>

            {/* Cart Sidebar - Always visible (Desktop) */}
            <div className="hidden sm:block">
              <CartSidebar />
            </div>
            
            {/* Chat - Only show when authenticated - Hidden on mobile */}
            {isAuthenticated && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative hidden sm:flex hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-110"
                  onClick={toggleChat}
                >
                  <MessageCircle className="w-5 h-5" />
                  {chatState.totalUnreadCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs animate-pulse">
                      {chatState.totalUnreadCount}
                    </Badge>
                  )}
                </Button>
                
                {/* Notification Sidebar with Hover */}
                <NotificationSidebar />
              </>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-8 h-8 rounded-full p-0">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 px-2 py-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user?.name}</div>
                        <OnlineStatus 
                          isOnline={user?.isOnline} 
                          lastSeen={user?.lastSeen} 
                          size="sm" 
                          showText 
                        />
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/my-learning')}>{t('common.my_learning')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/cart')}>{t('common.my_cart')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/wishlist')}>{t('common.wishlist')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>{t('common.profile')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/notifications')}>{t('common.notifications')}</DropdownMenuItem>
                    {hasRole('instructor') && (
                      <DropdownMenuItem onClick={() => navigate('/instructor')}>{t('common.instructor')}</DropdownMenuItem>
                    )}
                    {hasRole('admin') && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>{t('common.admin')}</DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/account-settings')}>{t('common.account_settings')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/user/payment-methods')}>{t('sidebar.payment_methods') || 'Payment methods'}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/user/subscriptions')}>{t('sidebar.subscriptions') || 'Subscriptions'}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>{t('common.log_out')}</DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/login')}>{t('auth.login')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/signup')}>{t('auth.signup')}</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Language */}
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  )
}
