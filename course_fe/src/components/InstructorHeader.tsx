import { useAuth } from "../contexts/AuthContext"
import { useNotifications } from "../contexts/NotificationContext"
import { useRouter } from "./Router"
import { useUIStore } from "../stores"
import { cn } from "./ui/utils"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Avatar, AvatarFallback } from "./ui/avatar"
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
  ChevronDown,
  MessageSquare,
  HelpCircle,
  Search,
  Globe,
  Check,
  Trash2
} from "lucide-react"

interface InstructorHeaderProps {
  title?: string
  subtitle?: string
  className?: string
}

export function InstructorHeader({ title, subtitle, className }: InstructorHeaderProps) {
  const { user, logout } = useAuth()
  const { navigate } = useRouter()
  const { toggleSidebar, sidebarOpen } = useUIStore()
  const { state: notifState, markAsRead, removeNotification, markAllAsRead } = useNotifications()

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
            title="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Title and subtitle */}
          {(title || subtitle) && (
            <div className="hidden sm:block">
              {title && <h1 className="font-medium">{title}</h1>}
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}
        </div>

        {/* Right section - Search, Notifications, Profile */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* Go to Student View */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/')} 
            title="Go to Student View"
            className="hidden sm:flex text-sm font-medium border-dashed"
          >
            Về Trang Chủ
          </Button>

          {/* Search - hidden on small mobile */}
          <div className="hidden md:block relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search courses, students..." 
              className="pl-9 w-64"
            />
          </div>

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifState.unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h4 className="font-semibold text-sm">Notifications</h4>
                {notifState.unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto px-2 text-xs text-blue-600 hover:text-blue-700"
                    onClick={() => markAllAsRead()}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                {notifState.notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                    <Bell className="h-8 w-8 mb-2 opacity-20" />
                    No notifications
                  </div>
                ) : (
                  notifState.notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`group px-4 py-3 border-b last:border-0 hover:bg-accent/50 transition-colors relative ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notification.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                        <div className="flex-1 space-y-1">
                          <p className={`text-sm leading-tight ${!notification.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground pt-1">
                            {new Date(notification.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {/* Actions - visible on hover */}
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-white dark:bg-gray-800 shadow-sm rounded-md border p-0.5 z-10">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeNotification(notification.id)
                            }}
                            title="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/instructor/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/instructor/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/')}>
                View as Student
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}