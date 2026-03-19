import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useRouter } from "../../components/Router"
import { toast } from "sonner"
import { StatDetailDialog } from "../../components/StatDetailDialog"
import { PendingTasks } from "../../components/PendingTasks"
import { formatCurrency } from "../../utils/formatters"
import { getAdminDashboardStats, getUsers, type AdminDashboardStats, type UserItem } from '../../services/admin.api'
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
  RefreshCw,
  UserCheck,
  UserX,
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
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { useTranslation } from "react-i18next"

export function AdminDashboard() {
  const { user, hasRole } = useAuth()
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const [userSearch, setUserSearch] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [mockUsers, setMockUsers] = useState<any[]>([])
  const [mockCourses, setMockCourses] = useState<any[]>([])
  const [mockStats, setMockStats] = useState<any>({ totalUsers: 0, totalCourses: 0, monthlyRevenue: 0, courseCompletions: 0 })
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
      setMockStats({
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
        const usersRes = await getUsers({ page: 1, page_size: 10, search: userSearch || undefined })
        if (cancelled) return
        setMockUsers((usersRes.results || []).map((u: UserItem) => ({
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
        const coursesRes = await getCourses({ page: 1, page_size: 10, search: courseSearch || undefined })
        if (cancelled) return
        setMockCourses((coursesRes.results || []).map((c: CourseListItem) => ({
          id: c.id,
          title: c.title,
          instructor: c.instructor_name || 'Unknown',
          category: c.category_name || 'Uncategorized',
          students: c.total_students || 0,
          rating: c.rating || 0,
          price: parseFloat(String(c.price || 0)),
          status: c.status || 'draft',
          createdDate: c.created_at?.split('T')[0] || '',
        })))
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch courses list:', err)
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
    toast.success('Thống kê đã được cập nhật!')
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
    <div className="p-4 md:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow relative group"
            onClick={() => openStatDetail(t('admin_dashboard.total_users'), 'users', mockStats.totalUsers || 0)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_dashboard.total_users')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{(mockStats.totalUsers || 0).toLocaleString()}</div>
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
            onClick={() => openStatDetail(t('admin_dashboard.total_courses'), 'courses', mockStats.totalCourses || 0)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_dashboard.total_courses')}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{(mockStats.totalCourses || 0).toLocaleString()}</div>
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
            onClick={() => openStatDetail(t('admin_dashboard.monthly_revenue'), 'revenue', mockStats.monthlyRevenue || 0)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_dashboard.monthly_revenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{formatCurrency(mockStats.monthlyRevenue || 0)}</div>
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
            onClick={() => openStatDetail(t('admin_dashboard.completions'), 'completions', mockStats.courseCompletions || 0)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin_dashboard.completions')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{(mockStats.courseCompletions || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin_dashboard.from_last_month_15')}
              </p>
            </CardContent>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </Card>
        </div>

        {/* Stat Detail Dialog */}
        <StatDetailDialog
          open={selectedStat.open}
          onOpenChange={(open) => setSelectedStat({ ...selectedStat, open })}
          title={selectedStat.title}
          type={selectedStat.type}
          currentValue={selectedStat.value}
        />

        {/* Pending Tasks */}
        <div className="mb-8">
          <PendingTasks userRole="admin" />
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <div className="flex w-full overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             <TabsList className="inline-flex min-w-full md:min-w-0 justify-start">
                <TabsTrigger value="users">{t('admin_dashboard.users_tab')}</TabsTrigger>
                <TabsTrigger value="courses">{t('admin_dashboard.courses_tab')}</TabsTrigger>
                <TabsTrigger value="analytics">{t('admin_dashboard.analytics_tab')}</TabsTrigger>
                <TabsTrigger value="settings">{t('admin_dashboard.settings_tab')}</TabsTrigger>
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
                    <Button variant="outline" size="sm" className="text-xs md:text-sm">
                      <Filter className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      {t('admin_dashboard.filter')}
                    </Button>
                    <Button size="sm" className="text-xs md:text-sm">
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
                    {mockUsers.map((user) => (
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
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.view_profile')}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.edit_user')}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.delete_user')}
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
                    <Button variant="outline" size="sm" className="text-xs md:text-sm">
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
                    {mockCourses.map((course) => (
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
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.view_course')}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.edit_course')}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('admin_dashboard.delete_course')}
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
                <p className="text-muted-foreground text-center py-8">
                  {t('admin_dashboard.analytics_coming_soon')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin_dashboard.platform_settings')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  {t('admin_dashboard.settings_coming_soon')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}
