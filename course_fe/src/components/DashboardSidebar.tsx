import { useEffect, useMemo } from "react"
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Crown,
  Database,
  DollarSign,
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
  X,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAuth } from "../contexts/AuthContext"
import { useUIStore } from "../stores"
import { cn } from "./ui/utils"
import { useRouter } from "./Router"
import { Button } from "./ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

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
  type: "admin" | "instructor" | "user"
  className?: string
}

function getRoutePath(route: string) {
  return route.split("?")[0]
}

function isRouteActive(currentRoute: string, href: string) {
  const path = getRoutePath(currentRoute)
  if (href === "/admin" || href === "/instructor") return path === href
  return path === href || path.startsWith(`${href}/`)
}

export function DashboardSidebar({ type, className }: DashboardSidebarProps) {
  const { t } = useTranslation()
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

  const adminGroups: SidebarGroup[] = [
    {
      key: "overview",
      label: t("dashboard_sidebar.groups.overview"),
      items: [
        { label: t("dashboard_sidebar.items.dashboard"), icon: <LayoutDashboard className="h-5 w-5" />, href: "/admin" },
        { label: t("dashboard_sidebar.items.analytics"), icon: <BarChart3 className="h-5 w-5" />, href: "/admin/analytics" },
        { label: t("dashboard_sidebar.items.statistics"), icon: <TrendingUp className="h-5 w-5" />, href: "/admin/statistics" },
        { label: t("dashboard_sidebar.items.activity_log"), icon: <Activity className="h-5 w-5" />, href: "/admin/activity-log" },
      ],
    },
    {
      key: "people",
      label: t("dashboard_sidebar.groups.people"),
      items: [
        { label: t("dashboard_sidebar.items.users"), icon: <Users className="h-5 w-5" />, href: "/admin/users" },
        { label: t("dashboard_sidebar.items.instructor_apps"), icon: <Award className="h-5 w-5" />, href: "/admin/instructor-applications" },
        { label: t("dashboard_sidebar.items.permissions"), icon: <Shield className="h-5 w-5" />, href: "/admin/permissions" },
      ],
    },
    {
      key: "learning",
      label: t("dashboard_sidebar.groups.learning"),
      items: [
        { label: t("dashboard_sidebar.items.courses"), icon: <GraduationCap className="h-5 w-5" />, href: "/admin/courses" },
        { label: t("dashboard_sidebar.items.categories"), icon: <Folder className="h-5 w-5" />, href: "/admin/categories" },
        { label: t("dashboard_sidebar.items.reviews"), icon: <Star className="h-5 w-5" />, href: "/admin/reviews" },
        { label: t("dashboard_sidebar.items.reports"), icon: <Flag className="h-5 w-5" />, href: "/admin/reports" },
      ],
    },
    {
      key: "content",
      label: t("dashboard_sidebar.groups.content"),
      items: [
        { label: t("dashboard_sidebar.items.blog_posts"), icon: <FileText className="h-5 w-5" />, href: "/admin/blog" },
        { label: t("dashboard_sidebar.items.forum"), icon: <MessageSquare className="h-5 w-5" />, href: "/admin/forum" },
      ],
    },
    {
      key: "commerce",
      label: t("dashboard_sidebar.groups.commerce"),
      items: [
        { label: t("dashboard_sidebar.items.payments"), icon: <CreditCard className="h-5 w-5" />, href: "/admin/payments" },
        { label: t("dashboard_sidebar.items.refunds"), icon: <DollarSign className="h-5 w-5" />, href: "/admin/refunds" },
        { label: t("dashboard_sidebar.items.payment_methods"), icon: <CreditCard className="h-5 w-5" />, href: "/admin/payments/methods" },
        { label: t("dashboard_sidebar.items.subscriptions"), icon: <Calendar className="h-5 w-5" />, href: "/admin/subscriptions" },
        { label: t("dashboard_sidebar.items.discounts"), icon: <Tag className="h-5 w-5" />, href: "/admin/discounts" },
      ],
    },
    {
      key: "website",
      label: t("dashboard_sidebar.groups.website"),
      items: [
        { label: t("dashboard_sidebar.items.website_settings"), icon: <Globe className="h-5 w-5" />, href: "/admin/website-settings" },
        { label: t("dashboard_sidebar.items.website_management"), icon: <Package className="h-5 w-5" />, href: "/admin/website-management" },
        { label: t("dashboard_sidebar.items.home_layout"), icon: <Package className="h-5 w-5" />, href: "/admin/home-layout" },
      ],
    },
    {
      key: "operations",
      label: t("dashboard_sidebar.groups.operations"),
      items: [
        { label: t("dashboard_sidebar.items.settings"), icon: <Settings className="h-5 w-5" />, href: "/admin/settings" },
        { label: t("dashboard_sidebar.items.data_backup"), icon: <Database className="h-5 w-5" />, href: "/admin/data-backup" },
      ],
    },
  ]

  const instructorItems: SidebarItem[] = [
    { label: t("dashboard_sidebar.items.dashboard"), icon: <LayoutDashboard className="h-5 w-5" />, href: "/instructor" },
    { label: t("dashboard_sidebar.items.my_courses"), icon: <BookOpen className="h-5 w-5" />, href: "/instructor/courses" },
    { label: t("dashboard_sidebar.items.communication"), icon: <MessageSquare className="h-5 w-5" />, href: "/instructor/communication" },
    { label: t("dashboard_sidebar.items.students"), icon: <UserCheck className="h-5 w-5" />, href: "/instructor/students" },
    { label: t("dashboard_sidebar.items.resources"), icon: <Upload className="h-5 w-5" />, href: "/instructor/resources" },
    { label: t("dashboard_sidebar.items.quizzes"), icon: <FileText className="h-5 w-5" />, href: "/instructor/quizzes" },
    { label: t("dashboard_sidebar.items.analytics"), icon: <TrendingUp className="h-5 w-5" />, href: "/instructor/analytics" },
    { label: t("dashboard_sidebar.items.earnings"), icon: <DollarSign className="h-5 w-5" />, href: "/instructor/earnings" },
    { label: t("dashboard_sidebar.items.subscription_revenue"), icon: <Crown className="h-5 w-5" />, href: "/instructor/subscription-revenue" },
    { label: t("dashboard_sidebar.items.payouts"), icon: <CreditCard className="h-5 w-5" />, href: "/instructor/payouts" },
    { label: t("dashboard_sidebar.items.discounts"), icon: <Tag className="h-5 w-5" />, href: "/instructor/discounts" },
    { label: t("dashboard_sidebar.items.profile"), icon: <User className="h-5 w-5" />, href: "/instructor/profile" },
  ]

  const userItems: SidebarItem[] = [
    { label: t("dashboard_sidebar.items.my_learning"), icon: <BookOpen className="h-5 w-5" />, href: "/my-learning" },
    { label: t("dashboard_sidebar.items.wishlist"), icon: <Heart className="h-5 w-5" />, href: "/wishlist" },
    { label: t("dashboard_sidebar.items.notifications"), icon: <Bell className="h-5 w-5" />, href: "/notifications" },
    { label: t("dashboard_sidebar.items.profile"), icon: <User className="h-5 w-5" />, href: "/profile" },
    { label: t("dashboard_sidebar.items.support"), icon: <HelpCircle className="h-5 w-5" />, href: "/support" },
  ]

  const currentPath = getRoutePath(currentRoute)
  const activeAdminGroup = useMemo(
    () => adminGroups.find((group) => group.items.some((item) => isRouteActive(currentPath, item.href)))?.key,
    [adminGroups, currentPath]
  )

  useEffect(() => {
    if (type === "admin" && activeAdminGroup && !adminSidebarGroups[activeAdminGroup]) {
      setAdminSidebarGroupOpen(activeAdminGroup, true)
    }
  }, [activeAdminGroup, adminSidebarGroups, setAdminSidebarGroupOpen, type])

  const goTo = (href: string) => {
    navigate(href)
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const renderItem = (item: SidebarItem) => {
    const active = isRouteActive(currentPath, item.href)
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>
          <Button
            variant={active ? "secondary" : "ghost"}
            className={cn(
              "w-full gap-3 transition-all",
              sidebarCollapsed ? "justify-center px-2" : "justify-start",
              active && "bg-secondary"
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

  const panelTitle =
    type === "admin"
      ? t("dashboard_sidebar.panel.admin")
      : type === "instructor"
        ? t("dashboard_sidebar.panel.instructor")
        : t("dashboard_sidebar.panel.student")

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-r border-border bg-card transition-all duration-300 md:sticky",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          sidebarCollapsed ? "w-20" : "w-72",
          className
        )}
      >
        <div className={cn("border-b border-border p-4", sidebarCollapsed && "px-3")}>
          <div className="flex items-center justify-between gap-3">
            <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {type === "admin" ? (
                  <Shield className="h-5 w-5" />
                ) : type === "instructor" ? (
                  <GraduationCap className="h-5 w-5" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{panelTitle}</h3>
                  <p className="truncate text-sm text-muted-foreground">{user?.name || t("dashboard_sidebar.panel.user_fallback")}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={toggleSidebarCollapsed}>
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto p-3">
          <TooltipProvider delayDuration={250}>
            {type === "admin"
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
                              "w-full px-3",
                              sidebarCollapsed ? "justify-center" : "justify-between",
                              groupActive && "bg-secondary/60"
                            )}
                          >
                            {sidebarCollapsed ? (
                              group.items[0]?.icon
                            ) : (
                              <>
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  {group.label}
                                </span>
                                <ChevronDown className={cn("h-4 w-4 transition-transform", groupOpen && "rotate-180")} />
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        {sidebarCollapsed ? (
                          <div className="mt-2 space-y-1">{group.items.map(renderItem)}</div>
                        ) : (
                          <CollapsibleContent className="space-y-1 px-1 pb-1">{group.items.map(renderItem)}</CollapsibleContent>
                        )}
                      </div>
                    </Collapsible>
                  )
                })
              : (type === "instructor" ? instructorItems : userItems).map(renderItem)}
          </TooltipProvider>
        </nav>

        <div className="border-t border-border p-3">
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full gap-3", sidebarCollapsed ? "justify-center px-2" : "justify-start")}
                  onClick={() => goTo("/")}
                >
                  <Package className="h-5 w-5" />
                  {!sidebarCollapsed && <span>{t("dashboard_sidebar.back_to_platform")}</span>}
                </Button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" className="hidden md:block">
                  <p>{t("dashboard_sidebar.back_to_platform")}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </aside>
    </>
  )
}
