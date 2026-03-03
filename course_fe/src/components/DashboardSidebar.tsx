import { useRouter } from "./Router"
import { useAuth } from "../contexts/AuthContext"
import { useUIStore } from "../stores"
import { Button } from "./ui/button"
import { cn } from "./ui/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { 
  LayoutDashboard,
  Users,
  GraduationCap,
  Folder,
  PenTool,
  Settings,
  BarChart3,
  BookOpen,
  DollarSign,
  MessageSquare,
  Star,
  FileText,
  CreditCard,
  UserCheck,
  TrendingUp,
  Award,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  LogOut,
  User,
  Flag,
  Tag,
  Shield,
  Upload,
  Heart,
  HelpCircle,
  Package,
  Globe,
  Calendar,
  Crown
} from "lucide-react"

interface SidebarItem {
  label: string
  icon: React.ReactNode
  href: string
  badge?: number
}

interface DashboardSidebarProps {
  type: 'admin' | 'instructor' | 'user'
  className?: string
}

export function DashboardSidebar({ type, className }: DashboardSidebarProps) {
  const { navigate, currentRoute } = useRouter()
  const { user } = useAuth()
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore()

  const adminItems: SidebarItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, href: '/admin' },
    { label: 'Users', icon: <Users className="h-5 w-5" />, href: '/admin/users' },
    { label: 'Courses', icon: <GraduationCap className="h-5 w-5" />, href: '/admin/courses' },
    { label: 'Categories', icon: <Folder className="h-5 w-5" />, href: '/admin/categories' },
    { label: 'Blog Posts', icon: <PenTool className="h-5 w-5" />, href: '/admin/blog' },
    { label: 'Forum', icon: <MessageSquare className="h-5 w-5" />, href: '/admin/forum' },
    { label: 'Reviews', icon: <Star className="h-5 w-5" />, href: '/admin/reviews' },
    { label: 'Reports', icon: <Flag className="h-5 w-5" />, href: '/admin/reports' },
    { label: 'Payments', icon: <CreditCard className="h-5 w-5" />, href: '/admin/payments' },
    { label: 'Subscriptions', icon: <Calendar className="h-5 w-5" />, href: '/admin/subscriptions' },
    { label: 'Discounts', icon: <Tag className="h-5 w-5" />, href: '/admin/discounts' },
    { label: 'Analytics', icon: <BarChart3 className="h-5 w-5" />, href: '/admin/analytics' },
    { label: 'Permissions', icon: <Shield className="h-5 w-5" />, href: '/admin/permissions' },
    { label: 'Website Settings', icon: <Globe className="h-5 w-5" />, href: '/admin/website-settings' },
    { label: 'Home Layout', icon: <Package className="h-5 w-5" />, href: '/admin/home-layout' },
    { label: 'Settings', icon: <Settings className="h-5 w-5" />, href: '/admin/settings' },
  ]

  const instructorItems: SidebarItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, href: '/instructor' },
    { label: 'My Courses', icon: <BookOpen className="h-5 w-5" />, href: '/instructor/courses' },
    { label: 'Communication', icon: <MessageSquare className="h-5 w-5" />, href: '/instructor/communication' },
    { label: 'Students', icon: <UserCheck className="h-5 w-5" />, href: '/instructor/students' },
    { label: 'Resources', icon: <Upload className="h-5 w-5" />, href: '/instructor/resources' },
    { label: 'Quizzes', icon: <FileText className="h-5 w-5" />, href: '/instructor/quizzes' },
    { label: 'Analytics', icon: <TrendingUp className="h-5 w-5" />, href: '/instructor/analytics' },
    { label: 'Earnings', icon: <DollarSign className="h-5 w-5" />, href: '/instructor/earnings' },
    { label: 'Sub. Revenue', icon: <Crown className="h-5 w-5" />, href: '/instructor/subscription-revenue' },
    { label: 'Payouts', icon: <CreditCard className="h-5 w-5" />, href: '/instructor/payouts' },
    { label: 'Discounts', icon: <Tag className="h-5 w-5" />, href: '/instructor/discounts' },
    { label: 'Profile', icon: <User className="h-5 w-5" />, href: '/instructor/profile' },
  ]

  const userItems: SidebarItem[] = [
    { label: 'My Learning', icon: <BookOpen className="h-5 w-5" />, href: '/my-learning' },
    { label: 'Wishlist', icon: <Heart className="h-5 w-5" />, href: '/wishlist' },
    { label: 'Notifications', icon: <Bell className="h-5 w-5" />, href: '/notifications' },
    { label: 'Profile', icon: <User className="h-5 w-5" />, href: '/profile' },
    { label: 'Support', icon: <HelpCircle className="h-5 w-5" />, href: '/support' },
  ]

  const items = type === 'admin' ? adminItems : type === 'instructor' ? instructorItems : userItems

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed md:sticky top-0 left-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300 z-50 overflow-hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        sidebarOpen ? "w-64" : "w-64 md:w-16",
        className
      )}>
        {/* Sidebar Header */}
        <div className={cn(
          "p-4 md:p-6 border-b border-border transition-all duration-300",
          !sidebarOpen && "md:p-2"
        )}>
          <div className={cn(
            "flex items-center gap-3",
            !sidebarOpen && "md:flex-col md:gap-2"
          )}>
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              {type === 'admin' ? <Shield className="h-4 w-4 md:h-5 md:w-5" /> : 
               type === 'instructor' ? <GraduationCap className="h-4 w-4 md:h-5 md:w-5" /> : 
               <User className="h-4 w-4 md:h-5 md:w-5" />}
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h3 className="font-medium truncate text-sm md:text-base">
                  {type === 'admin' ? 'Admin' : type === 'instructor' ? 'Instructor' : 'Student'} Panel
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{user?.name || 'User'}</p>
              </div>
            )}
          </div>
        </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto scrollbar-thin">
        <TooltipProvider delayDuration={300}>
          {items.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button
                  variant={currentRoute === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full gap-3",
                    sidebarOpen ? "justify-start" : "md:justify-center md:px-2",
                    currentRoute === item.href && "bg-secondary"
                  )}
                  onClick={() => {
                    navigate(item.href)
                    if (window.innerWidth < 768) setSidebarOpen(false) // Close on mobile after navigation
                  }}
                >
                  {item.icon}
                  {sidebarOpen && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right" className="hidden md:block">
                  <p>{item.label}</p>
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 md:p-4 border-t border-border">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full gap-2 md:gap-3 text-xs md:text-sm",
                  sidebarOpen ? "justify-start" : "md:justify-center md:px-2"
                )}
                onClick={() => navigate('/')}
              >
                <Package className="h-4 w-4 md:h-5 md:w-5" />
                {sidebarOpen && <span>Back to Platform</span>}
              </Button>
            </TooltipTrigger>
            {!sidebarOpen && (
              <TooltipContent side="right" className="hidden md:block">
                <p>Back to Platform</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
      </aside>
    </>
  )
}