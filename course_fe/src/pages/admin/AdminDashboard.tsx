import { useState, useEffect } from "react"
import { motion } from 'motion/react'
import { useAuth } from "../../contexts/AuthContext"
import { useRouter } from "../../components/Router"
import { toast } from "sonner"
import { StatDetailDialog } from "../../components/StatDetailDialog"
import { PendingTasks } from "../../components/PendingTasks"
import { formatCurrency } from "../../utils/formatters"
import { getAdminDashboardStats, getUsers, type UserItem } from '../../services/admin.api'
import { getCourses, type CourseListItem } from '../../services/course.api'
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Avatar, AvatarFallback } from "../../components/ui/avatar"
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Filter,
  Plus,
  BarChart3
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../../components/ui/dropdown-menu"
import { useTranslation } from "react-i18next"

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function AdminDashboard() {
  const { hasRole } = useAuth()
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const [userSearch, setUserSearch] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUsersLoading, setIsUsersLoading] = useState(true)
  const [isCoursesLoading, setIsCoursesLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentCourses, setRecentCourses] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState<any>({ totalUsers: 0, totalCourses: 0, monthlyRevenue: 0, courseCompletions: 0 })
  const [selectedStat, setSelectedStat] = useState<{
    open: boolean
    title: string
    type: 'users' | 'courses' | 'revenue' | 'completions'
    value: number
  }>({
    open: false,
    title: '',
    type: 'users',
    value: 0
  })

  const fetchDashboard = async () => {
    try {
      const stats = await getAdminDashboardStats()
      setDashboardStats({
        totalUsers: stats.total_users,
        totalCourses: stats.total_courses,
        monthlyRevenue: stats.this_month_revenue,
        courseCompletions: stats.total_enrollments,
      })
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        setIsUsersLoading(true)
        const usersRes = await getUsers({ page: 1, page_size: 10, search: userSearch || undefined })
        if (cancelled) return
        setRecentUsers((usersRes.results || []).map((u: UserItem) => ({
          id: u.id,
          name: u.full_name || u.username,
          email: u.email,
          role: u.user_type || 'student',
          joinDate: u.created_at?.split('T')[0] || '',
          coursesEnrolled: 0,
          status: u.status || 'active',
        })))
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch users list:', err)
      } finally {
        if (!cancelled) setIsUsersLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [userSearch])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        setIsCoursesLoading(true)
        const coursesRes = await getCourses({ page: 1, page_size: 10, search: courseSearch || undefined })
        if (cancelled) return
        setRecentCourses((coursesRes.results || []).map((c: CourseListItem) => ({
          id: c.id,
          title: c.title,
          instructor: c.instructor_name || t('admin_dashboard.unknown'),
          category: c.category_name || t('admin_dashboard.uncategorized'),
          students: c.total_students || 0,
          rating: c.rating || 0,
          price: parseFloat(String(c.price || 0)),
          status: c.status || 'draft',
          createdDate: c.created_at?.split('T')[0] || '',
        })))
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch courses list:', err)
      } finally {
        if (!cancelled) setIsCoursesLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [courseSearch])

  const handleRefreshStats = async () => {
    setIsRefreshing(true)
    await fetchDashboard()
    setIsRefreshing(false)
    toast.success(t('admin_dashboard.toasts.refresh_success'))
  }

  const openStatDetail = (title: string, type: 'users' | 'courses' | 'revenue' | 'completions', value: number) => {
    setSelectedStat({ open: true, title, type, value })
  }

  if (!hasRole('admin')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">{t('admin_dashboard.access_denied')}</h2>
          <p className="text-muted-foreground mb-4">{t('admin_dashboard.access_denied_desc')}</p>
          <Button onClick={() => window.history.back()}>
            {t('admin_dashboard.go_back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="p-4 md:p-8" variants={sectionStagger} initial="hidden" animate="show">
        <motion.div className="flex items-center justify-end mb-4" variants={fadeInUp}>
          <Button variant="outline" size="sm" onClick={handleRefreshStats} disabled={isRefreshing}>
            {isRefreshing ? t('admin_dashboard.refreshing') : t('admin_dashboard.refresh_dashboard')}
          </Button>
        </motion.div>

        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" variants={fadeInUp}>
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow relative group"
            onClick={() => openStatDetail(t('admin_dashboard.total_users'), 'users', dashboardStats.totalUsers || 0)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_dashboard.total_users')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{(dashboardStats.totalUsers || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin_dashboard.from_last_month_12')}
              </p>
            </CardContent>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow relative group"
            onClick={() => openStatDetail(t('admin_dashboard.total_courses'), 'courses', dashboardStats.totalCourses || 0)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_dashboard.total_courses')}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{(dashboardStats.totalCourses || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin_dashboard.from_last_month_8')}
              </p>
            </CardContent>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow relative group"
            onClick={() => openStatDetail(t('admin_dashboard.monthly_revenue'), 'revenue', dashboardStats.monthlyRevenue || 0)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_dashboard.monthly_revenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{formatCurrency(dashboardStats.monthlyRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin_dashboard.from_last_month_23')}
              </p>
            </CardContent>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow relative group"
            onClick={() => openStatDetail(t('admin_dashboard.completions'), 'completions', dashboardStats.courseCompletions || 0)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_dashboard.completions')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{(dashboardStats.courseCompletions || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin_dashboard.from_last_month_15')}
              </p>
            </CardContent>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </Card>
        </motion.div>


        <StatDetailDialog
          open={selectedStat.open}
          onOpenChange={(open) => setSelectedStat({ ...selectedStat, open })}
          title={selectedStat.title}
          type={selectedStat.type}
          currentValue={selectedStat.value}
        />


        <motion.div className="mb-8" variants={fadeInUp}>
          <PendingTasks userRole="admin" />
        </motion.div>

        <motion.div variants={fadeInUp}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex w-full overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             <TabsList className="relative inline-flex min-w-full md:min-w-0 justify-start p-1">
                <TabsTrigger value="users" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  {activeTab === 'users' && <motion.span layoutId="admin-dashboard-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
                  <span className="relative z-10">{t('admin_dashboard.users_tab')}</span>
                </TabsTrigger>
                <TabsTrigger value="courses" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  {activeTab === 'courses' && <motion.span layoutId="admin-dashboard-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
                  <span className="relative z-10">{t('admin_dashboard.courses_tab')}</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  {activeTab === 'analytics' && <motion.span layoutId="admin-dashboard-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
                  <span className="relative z-10">{t('admin_dashboard.analytics_tab')}</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  {activeTab === 'settings' && <motion.span layoutId="admin-dashboard-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
                  <span className="relative z-10">{t('admin_dashboard.settings_tab')}</span>
                </TabsTrigger>
             </TabsList>
          </div>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg md:text-xl">{t('admin_dashboard.user_management')}</CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('admin_dashboard.search_users')}
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-8 text-sm"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => navigate('/admin/users')}>
                      <Filter className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      {t('admin_dashboard.filter')}
                    </Button>
                    <Button size="sm" className="text-xs md:text-sm" onClick={() => navigate('/admin/users/new')}>
                      <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      {t('admin_dashboard.add_user')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin_dashboard.user_col')}</TableHead>
                      <TableHead>{t('admin_dashboard.role_col')}</TableHead>
                      <TableHead>{t('admin_dashboard.join_date_col')}</TableHead>
                      <TableHead>{t('admin_dashboard.activity_col')}</TableHead>
                      <TableHead>{t('admin_dashboard.status_col')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isUsersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          {t('admin_dashboard.loading_users')}
                        </TableCell>
                      </TableRow>
                    ) : recentUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          {t('admin_dashboard.empty_users')}
                        </TableCell>
                      </TableRow>
                    ) : recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'instructor' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.joinDate}</TableCell>
                        <TableCell>
                          {user.coursesEnrolled && t('admin_dashboard.enrolled_count', { count: user.coursesEnrolled })}
                          {user.coursesCreated && t('admin_dashboard.created_count', { count: user.coursesCreated })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                            {user.status === 'active' ? t('admin_dashboard.active') : t('admin_dashboard.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/users/${user.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.view_profile')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/users/${user.id}/edit`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.edit_user')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.open_delete_flow')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg md:text-xl">{t('admin_dashboard.course_management')}</CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('admin_dashboard.search_courses')}
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="pl-8 text-sm"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={() => navigate('/admin/courses')}>
                      <Filter className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      {t('admin_dashboard.filter')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin_dashboard.course_col')}</TableHead>
                      <TableHead>{t('admin_dashboard.instructor_col')}</TableHead>
                      <TableHead>{t('admin_dashboard.category_col')}</TableHead>
                      <TableHead>{t('admin_dashboard.students_col')}</TableHead>
                      <TableHead>{t('admin_dashboard.rating_col')}</TableHead>
                      <TableHead>{t('admin_dashboard.price_col')}</TableHead>
                      <TableHead>{t('admin_dashboard.status_col')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isCoursesLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                          {t('admin_dashboard.loading_courses')}
                        </TableCell>
                      </TableRow>
                    ) : recentCourses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                          {t('admin_dashboard.empty_courses')}
                        </TableCell>
                      </TableRow>
                    ) : recentCourses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{course.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {t('admin_dashboard.created_label', { date: course.createdDate })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{course.instructor}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{course.category}</Badge>
                        </TableCell>
                        <TableCell>{course.students.toLocaleString()}</TableCell>
                        <TableCell>{course.rating}⭐</TableCell>
                        <TableCell>{formatCurrency(course.price)}</TableCell>
                        <TableCell>
                          <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                            {course.status === 'published' ? t('admin_dashboard.active') : t('admin_dashboard.pending')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.view_course')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.edit_course')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate('/admin/courses')}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.open_delete_flow')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin_dashboard.analytics_overview')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-4 space-y-4">
                  <p className="text-muted-foreground">
                    {t('admin_dashboard.analytics_description')}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => navigate('/admin/analytics')}>
                      {t('admin_dashboard.analytics_tab')}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/admin/statistics')}>
                      {t('admin_dashboard.statistics')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin_dashboard.platform_settings')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-4 space-y-4">
                  <p className="text-muted-foreground">
                    {t('admin_dashboard.settings_description')}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => navigate('/admin/settings')}>
                      {t('admin_dashboard.platform_settings')}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/admin/website-settings')}>
                      {t('admin_dashboard.website_settings')}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/admin/payments/methods')}>
                      {t('admin_dashboard.payment_methods')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </motion.div>
      </motion.div>
  )
}
