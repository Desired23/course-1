import { useAuth } from "../contexts/AuthContext"
import { useRouter } from "./Router"
import { useUIStore } from "../stores"
import { cn } from "./ui/utils"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { 
  Menu, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  Search,
  Shield,
  RefreshCw,
  ChevronDown
} from "lucide-react"
import { useTranslation } from "react-i18next"

interface AdminHeaderProps {
  title?: string
  subtitle?: string
  className?: string
  showRefresh?: boolean
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function AdminHeader({ 
  title, 
  subtitle, 
  className,
  showRefresh = false,
  onRefresh,
  isRefreshing = false
}: AdminHeaderProps) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { navigate } = useRouter()
  const { toggleSidebar } = useUIStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className={cn("sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border", className)}>
      <div className="flex items-center justify-between px-4 md:px-8 py-4">
        {/* Left section - Menu toggle + Title */}
        <div className="flex items-center gap-4">
          {/* Menu toggle button - visible on all screen sizes */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            title={t('admin_header.toggle_sidebar')}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Title and subtitle */}
          <div>
            {title && (
              <div className="flex items-center gap-2">
                <h1 className="font-medium">{title}</h1>
                {showRefresh && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  </Button>
                )}
              </div>
            )}
            {subtitle && <p className="text-sm text-muted-foreground hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        {/* Right section - Search, Notifications, Profile */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Search - hidden on small mobile */}
          <div className="hidden md:block relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={t('admin_header.search_placeholder')} 
              className="pl-9 w-64"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.name?.charAt(0) || 'A'}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('admin_header.admin_account')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/profile')}>
                <User className="mr-2 h-4 w-4" />
                {t('common.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                {t('sidebar.settings')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/')}>
                {t('admin_header.view_platform')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                {t('common.log_out')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
