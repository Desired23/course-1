import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from "../../contexts/AuthContext"
import { useRouter } from "../../components/Router"
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  Star, 
  Plus, 
  Eye, 
  Edit, 
  Loader2
} from 'lucide-react'
import { getInstructorDashboardStats, type InstructorDashboardStats } from '../../services/instructor.api'
import { formatPrice } from '../../services/course.api'

export function InstructorDashboard() {
  const { user, hasRole } = useAuth()
  const { navigate } = useRouter()
  const { t } = useTranslation()

  const [stats, setStats] = useState<InstructorDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasRole('instructor')) return
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const data = await getInstructorDashboardStats()
        if (!cancelled) setStats(data)
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [hasRole])

  if (!hasRole('instructor')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">{t('instructor_dashboard.access_denied')}</h2>
          <p className="text-muted-foreground mb-4">{t('instructor_dashboard.access_denied_desc')}</p>
          <Button onClick={() => window.history.back()}>
            {t('instructor_dashboard.go_back')}
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error || 'Failed to load dashboard'}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('instructor_dashboard.total_courses')}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.total_courses}</div>
              <p className="text-xs text-muted-foreground">
                {t('instructor_dashboard.published_draft_count', { published: stats.published_courses, draft: stats.draft_courses })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('instructor_dashboard.total_students')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.total_students.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {t('instructor_dashboard.this_month_gain', { count: stats.new_students_this_month })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('instructor_dashboard.total_earnings')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{formatPrice(stats.total_earnings)}</div>
              <p className="text-xs text-muted-foreground">
                {t('instructor_dashboard.this_month_revenue_gain', { amount: formatPrice(stats.this_month_earnings) })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('instructor_dashboard.avg_rating')}</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.average_rating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_reviews} {t('instructor_dashboard.reviews_suffix')} • {stats.pending_questions} Q&A pending
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="courses">{t('instructor_dashboard.courses_tab')}</TabsTrigger>
            <TabsTrigger value="analytics">{t('instructor_dashboard.analytics_tab')}</TabsTrigger>
            <TabsTrigger value="earnings">{t('instructor_dashboard.earnings_tab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('instructor_dashboard.course_management')}</CardTitle>
                  <Button onClick={() => navigate('/instructor/courses/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('instructor_dashboard.create_new_course')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.course_stats.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No courses yet. Create your first course!</p>
                  ) : (
                    stats.course_stats.map((course) => (
                      <div key={course.course_id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-2">
                            <div>
                              <h3 className="font-medium text-lg sm:text-base">{course.title}</h3>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground mt-1 sm:mt-0">
                                <span>{course.total_students.toLocaleString()} {t('instructor_dashboard.students_suffix')}</span>
                                {course.rating > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span>{course.rating}</span>
                                    <span className="hidden sm:inline">({course.total_reviews} {t('instructor_dashboard.reviews_suffix')})</span>
                                  </div>
                                )}
                                <span className="font-medium text-green-600">{formatPrice(course.earnings)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/course/${course.course_id}`)}>
                                <Eye className="h-4 w-4 mr-1" />
                                {t('instructor_dashboard.view_course')}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/instructor/courses/${course.course_id}`)}>
                                <Edit className="h-4 w-4 mr-1" />
                                {t('instructor_dashboard.edit_course')}
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <span>{t('instructor_dashboard.completion_rate_label')}</span>
                            <div className="flex-1 max-w-[200px]">
                              <Progress value={course.completion_rate} className="h-2" />
                            </div>
                            <span>{course.completion_rate}%</span>
                          </div>
                          
                          {course.new_students_this_month > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              +{course.new_students_this_month} new students this month
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('instructor_dashboard.performance_metrics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('instructor_dashboard.student_satisfaction')}</span>
                      <span className="font-medium">{stats.average_rating.toFixed(1)}/5</span>
                    </div>
                    <Progress value={stats.average_rating * 20} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Reviews</span>
                      <span className="font-medium">{stats.total_reviews}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending Q&A</span>
                      <span className="font-medium">{stats.pending_questions}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Published Courses</span>
                      <span className="font-medium">{stats.published_courses}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Draft Courses</span>
                      <span className="font-medium">{stats.draft_courses}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">New Students This Month</span>
                      <span className="font-medium">{stats.new_students_this_month}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">This Month Earnings</span>
                      <span className="font-medium text-green-600">{formatPrice(stats.this_month_earnings)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>{t('instructor_dashboard.earnings_overview')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-medium">{formatPrice(stats.this_month_earnings)}</div>
                    <p className="text-sm text-muted-foreground">{t('instructor_dashboard.this_month')}</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-medium">{formatPrice(stats.this_month_earnings * 12)}</div>
                    <p className="text-sm text-muted-foreground">{t('instructor_dashboard.projected_annual')}</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-medium">{formatPrice(stats.total_earnings)}</div>
                    <p className="text-sm text-muted-foreground">{t('instructor_dashboard.all_time')}</p>
                  </div>
                </div>
                
                <div className="text-center">
                  <Button variant="outline" onClick={() => navigate('/instructor/earnings')}>
                    View Detailed Earnings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  )
}