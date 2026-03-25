import { useEffect, useMemo } from 'react'
import {
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Flag,
  Folder,
  Globe,
  GraduationCap,
  Heart,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Shield,
  Star,
  Tag,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  Users,
  Bell,
  X,
  Activity,
  Database,
  Crown,
  DollarSign,
} from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'
import { useUIStore } from '../stores'
import { useRouter } from './Router'
import { Button } from './ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { cn } from './ui/utils'

interface SidebarItem {
  label: string
  icon: React.ReactNode
  href: string
}

interface SidebarGroup {
  key: string
  label: string
  items: SidebarItem[]
}

interface DashboardSidebarProps {
  type: 'admin' | 'instructor' | 'user'
  className?: string
}

const adminGroups: SidebarGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, href: '/admin' },
      { label: 'Analytics', icon: <BarChart3 className="h-5 w-5" />, href: '/admin/analytics' },
      { label: 'Statistics', icon: <TrendingUp className="h-5 w-5" />, href: '/admin/statistics' },
      { label: 'Activity Log', icon: <Activity className="h-5 w-5" />, href: '/admin/activity-log' },
    ],
  },
  {
    key: 'people',
    label: 'People',
    items: [
      { label: 'Users', icon: <Users className="h-5 w-5" />, href: '/admin/users' },
      { label: 'Instructor Apps', icon: <Award className="h-5 w-5" />, href: '/admin/instructor-applications' },
      { label: 'Permissions', icon: <Shield className="h-5 w-5" />, href: '/admin/permissions' },
    ],
  },
  {
    key: 'learning',
    label: 'Learning',
    items: [
      { label: 'Courses', icon: <GraduationCap className="h-5 w-5" />, href: '/admin/courses' },
      { label: 'Categories', icon: <Folder className="h-5 w-5" />, href: '/admin/categories' },
      { label: 'Reviews', icon: <Star className="h-5 w-5" />, href: '/admin/reviews' },
      { label: 'Reports', icon: <Flag className="h-5 w-5" />, href: '/admin/reports' },
    ],
  },
  {
    key: 'content',
    label: 'Content',
    items: [
      { label: 'Blog Posts', icon: <FileText className="h-5 w-5" />, href: '/admin/blog' },
      { label: 'Forum', icon: <MessageSquare className="h-5 w-5" />, href: '/admin/forum' },
    ],
  },
  {
    key: 'commerce',
    label: 'Commerce',
    items: [
      { label: 'Payments', icon: <CreditCard className="h-5 w-5" />, href: '/admin/payments' },
      { label: 'Refunds', icon: <DollarSign className="h-5 w-5" />, href: '/admin/refunds' },
      { label: 'Payment Methods', icon: <CreditCard className="h-5 w-5" />, href: '/admin/payments/methods' },
      { label: 'Subscriptions', icon: <Calendar className="h-5 w-5" />, href: '/admin/subscriptions' },
      { label: 'Discounts', icon: <Tag className="h-5 w-5" />, href: '/admin/discounts' },
    ],
  },
  {
    key: 'website',
    label: 'Website',
    items: [
      { label: 'Website Settings', icon: <Globe className="h-5 w-5" />, href: '/admin/website-settings' },
      { label: 'Website Management', icon: <Package className="h-5 w-5" />, href: '/admin/website-management' },
      { label: 'Home Layout', icon: <Package className="h-5 w-5" />, href: '/admin/home-layout' },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    items: [
      { label: 'Settings', icon: <Settings className="h-5 w-5" />, href: '/admin/settings' },
      { label: 'Data Backup', icon: <Database className="h-5 w-5" />, href: '/admin/data-backup' },
    ],
  },
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

function getRoutePath(route: string) {
  return route.split('?')[0]
}

function isRouteActive(currentRoute: string, href: string) {
  const path = getRoutePath(currentRoute)
  if (href === '/admin' || href === '/instructor') return path === href
  return path === href || path.startsWith(`${href}/`)
}

export function DashboardSidebar({ type, className }: DashboardSidebarProps) {
  const { navigate, currentRoute } = useRouter()
  const { user } = useAuth()
  const {
    sidebarOpen,
    sidebarCollapsed,
    adminSidebarGroups,
    toggleSidebarCollapsed,
    setSidebarOpen,
    setAdminSidebarGroupOpen,
  } = useUIStore()

  const currentPath = getRoutePath(currentRoute)
  const activeAdminGroup = useMemo(
    () => adminGroups.find((group) => group.items.some((item) => isRouteActive(currentPath, item.href)))?.key,
    [currentPath]
  )

  useEffect(() => {
    if (type === 'admin' && activeAdminGroup && !adminSidebarGroups[activeAdminGroup]) {
      setAdminSidebarGroupOpen(activeAdminGroup, true)
    }
  }, [activeAdminGroup, adminSidebarGroups, setAdminSidebarGroupOpen, type])

  const goTo = (href: string) => {
    navigate(href)
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  const renderItem = (item: SidebarItem) => {
    const active = isRouteActive(currentPath, item.href)
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>
          <Button
            variant={active ? 'secondary' : 'ghost'}
            className={cn(
              'w-full gap-3 transition-all',
              sidebarCollapsed ? 'justify-center px-2' : 'justify-start',
              active && 'bg-secondary'
            )}
            onClick={() => goTo(item.href)}
          >
            {item.icon}
            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
          </Button>
        </TooltipTrigger>
        {sidebarCollapsed && (
          <TooltipContent side="right" className="hidden md:block">
            <p>{item.label}</p>
          </TooltipContent>
        )}
      </Tooltip>
    )
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-r border-border bg-card transition-all duration-300 md:sticky',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          sidebarCollapsed ? 'w-20' : 'w-72',
          className
        )}
      >
        <div className={cn('border-b border-border p-4', sidebarCollapsed && 'px-3')}>
          <div className="flex items-center justify-between gap-3">
            <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {type === 'admin' ? (
                  <Shield className="h-5 w-5" />
                ) : type === 'instructor' ? (
                  <GraduationCap className="h-5 w-5" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h3 className="truncate font-medium">
                    {type === 'admin' ? 'Admin' : type === 'instructor' ? 'Instructor' : 'Student'} Panel
                  </h3>
                  <p className="truncate text-sm text-muted-foreground">{user?.name || 'User'}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex"
                onClick={toggleSidebarCollapsed}
              >
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto p-3">
          <TooltipProvider delayDuration={250}>
            {type === 'admin'
              ? adminGroups.map((group) => {
                  const groupOpen = sidebarCollapsed ? false : adminSidebarGroups[group.key] ?? group.key === activeAdminGroup
                  const groupActive = group.items.some((item) => isRouteActive(currentPath, item.href))
                  return (
                    <Collapsible
                      key={group.key}
                      open={groupOpen}
                      onOpenChange={(open) => setAdminSidebarGroupOpen(group.key, open)}
                    >
                      <div className="rounded-xl border border-transparent bg-background/40">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(
                              'w-full px-3',
                              sidebarCollapsed ? 'justify-center' : 'justify-between',
                              groupActive && 'bg-secondary/60'
                            )}
                          >
                            {sidebarCollapsed ? (
                              group.items[0]?.icon
                            ) : (
                              <>
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  {group.label}
                                </span>
                                <ChevronDown className={cn('h-4 w-4 transition-transform', groupOpen && 'rotate-180')} />
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        {sidebarCollapsed ? (
                          <div className="mt-2 space-y-1">{group.items.map(renderItem)}</div>
                        ) : (
                          <CollapsibleContent className="space-y-1 px-1 pb-1">
                            {group.items.map(renderItem)}
                          </CollapsibleContent>
                        )}
                      </div>
                    </Collapsible>
                  )
                })
              : (type === 'instructor' ? instructorItems : userItems).map(renderItem)}
          </TooltipProvider>
        </nav>

        <div className="border-t border-border p-3">
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full gap-3', sidebarCollapsed ? 'justify-center px-2' : 'justify-start')}
                  onClick={() => goTo('/')}
                >
                  <Package className="h-5 w-5" />
                  {!sidebarCollapsed && <span>Back to Platform</span>}
                </Button>
              </TooltipTrigger>
              {sidebarCollapsed && (
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
