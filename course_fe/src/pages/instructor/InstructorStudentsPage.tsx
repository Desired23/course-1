import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Progress } from '../../components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { UserPagination } from '../../components/UserPagination'
import { Users, GraduationCap, TrendingUp, Search, Loader2, Star, BookOpen, Download, Eye } from 'lucide-react'
import { useRouter } from '../../components/Router'
import {
  getInstructorDashboardStats,
  getInstructorStudents,
  exportInstructorStudents,
  getInstructorStudentDetail,
  type InstructorDashboardStats,
  type InstructorStudent,
  type InstructorStudentDetail,
} from '../../services/instructor.api'
import { formatPrice } from '../../services/course.api'
import { useTranslation } from 'react-i18next'

export function InstructorStudentsPage() {
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const [stats, setStats] = useState<InstructorDashboardStats | null>(null)
  const [students, setStudents] = useState<InstructorStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('students')
  const [currentPage, setCurrentPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<InstructorStudentDetail | null>(null)
  const [studentDetailLoading, setStudentDetailLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [data, studentData] = await Promise.all([
          getInstructorDashboardStats(),
          getInstructorStudents(),
        ])
        if (!cancelled) {
          setStats(data)
          setStudents(studentData)
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || t('instructor_students_page.errors.load_data'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [t])

  const courseStats = useMemo(() => {
    if (!stats) return []
    return [...stats.course_stats]
      .filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (
          statusFilter === 'all' ||
          (statusFilter === 'published' && (c as any).is_published) ||
          (statusFilter === 'draft' && !(c as any).is_published) ||
          statusFilter === 'active' ||
          statusFilter === 'completed'
        )
      )
      .sort((a, b) => {
        if (sortBy === 'rating') return b.rating - a.rating
        if (sortBy === 'completion') return b.completion_rate - a.completion_rate
        if (sortBy === 'new_students') return b.new_students_this_month - a.new_students_this_month
        return b.total_students - a.total_students
      })
  }, [stats, searchQuery, statusFilter, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, sortBy])

  const ITEMS_PER_PAGE = 10
  const totalPages = useMemo(() => Math.max(1, Math.ceil(courseStats.length / ITEMS_PER_PAGE)), [courseStats.length])
  const paginatedCourseStats = useMemo(() => {
    return courseStats.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    )
  }, [courseStats, currentPage])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const totalCompleters = useMemo(() => {
    return courseStats.reduce((sum, c) => {
      const completed = Math.round(c.total_students * c.completion_rate / 100)
      return sum + completed
    }, 0)
  }, [courseStats])

  const filteredStudents = useMemo(() => {
    return [...students]
      .filter(student => {
        const matchesSearch =
          student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.courses.some(course => course.title.toLowerCase().includes(searchQuery.toLowerCase()))

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && student.courses.some(course => course.status === 'active')) ||
          (statusFilter === 'completed' && student.completion_count > 0)

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.average_progress - a.average_progress
        if (sortBy === 'completion') return b.completion_count - a.completion_count
        if (sortBy === 'new_students') {
          return new Date(b.enrolled_at || 0).getTime() - new Date(a.enrolled_at || 0).getTime()
        }
        return b.total_courses - a.total_courses
      })
  }, [students, searchQuery, statusFilter, sortBy])

  async function handleExportStudents() {
    try {
      setExporting(true)
      await exportInstructorStudents()
    } catch (err: any) {
      window.alert(err?.message || t('instructor_students_page.errors.export_students'))
    } finally {
      setExporting(false)
    }
  }

  async function handleViewStudent(studentId: number) {
    try {
      setStudentDetailLoading(true)
      const detail = await getInstructorStudentDetail(studentId)
      setSelectedStudent(detail)
    } catch (err: any) {
      window.alert(err?.message || t('instructor_students_page.errors.load_student_details'))
    } finally {
      setStudentDetailLoading(false)
    }
  }

  function getCourseStatusLabel(status: string) {
    if (status === 'active') return t('instructor_students_page.status.active')
    if (status === 'complete') return t('instructor_students_page.status.complete')
    if (status === 'completed') return t('instructor_students_page.status.complete')
    if (status === 'published') return t('instructor_students_page.status.published')
    if (status === 'draft') return t('instructor_students_page.status.draft')
    return status
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
        <p className="text-destructive mb-4">{error || t('instructor_students_page.errors.load_data')}</p>
        <Button onClick={() => window.location.reload()}>{t('instructor_students_page.actions.retry')}</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="mb-2">{t('instructor_students_page.title')}</h1>
            <p className="text-muted-foreground">{t('instructor_students_page.subtitle')}</p>
          </div>
          <Button onClick={handleExportStudents} disabled={exporting || students.length === 0}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {t('instructor_students_page.actions.export_csv')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('instructor_students_page.metrics.total_students')}</p>
                  <p className="text-2xl font-bold">{stats.total_students.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('instructor_students_page.metrics.new_this_month')}</p>
                  <p className="text-2xl font-bold">{stats.new_students_this_month}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('instructor_students_page.metrics.completions')}</p>
                  <p className="text-2xl font-bold">{totalCompleters}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('instructor_students_page.metrics.avg_rating')}</p>
                  <p className="text-2xl font-bold">{stats.average_rating.toFixed(1)}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('instructor_students_page.filters.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('instructor_students_page.filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('instructor_students_page.filters.all_status')}</SelectItem>
                <SelectItem value="published">{t('instructor_students_page.status.published')}</SelectItem>
                <SelectItem value="draft">{t('instructor_students_page.status.draft')}</SelectItem>
                <SelectItem value="active">{t('instructor_students_page.filters.has_active_enrollments')}</SelectItem>
                <SelectItem value="completed">{t('instructor_students_page.filters.has_completions')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="md:col-start-3">
                <SelectValue placeholder={t('instructor_students_page.filters.sort_by')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="students">{t('instructor_students_page.sort.most_students')}</SelectItem>
                <SelectItem value="new_students">{t('instructor_students_page.sort.most_new_students')}</SelectItem>
                <SelectItem value="completion">{t('instructor_students_page.sort.highest_completion')}</SelectItem>
                <SelectItem value="rating">{t('instructor_students_page.sort.highest_rating')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('instructor_students_page.course_table.title', { count: courseStats.length })}</CardTitle>
          <CardDescription>{t('instructor_students_page.course_table.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('instructor_students_page.course_table.headers.course')}</TableHead>
                <TableHead className="text-center">{t('instructor_students_page.course_table.headers.total_students')}</TableHead>
                <TableHead className="text-center">{t('instructor_students_page.course_table.headers.new_this_month')}</TableHead>
                <TableHead className="text-center">{t('instructor_students_page.course_table.headers.completion_rate')}</TableHead>
                <TableHead className="text-center">{t('instructor_students_page.course_table.headers.rating')}</TableHead>
                <TableHead className="text-center">{t('instructor_students_page.course_table.headers.earnings')}</TableHead>
                <TableHead className="text-right">{t('instructor_students_page.course_table.headers.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCourseStats.map((course) => (
                <TableRow key={course.course_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium line-clamp-1">{course.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{course.total_students.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {course.new_students_this_month > 0 ? (
                      <Badge className="bg-green-500/10 text-green-600">+{course.new_students_this_month}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Progress value={course.completion_rate} className="h-2 w-20" />
                      <span className="text-sm">{course.completion_rate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {course.rating > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{course.rating}</span>
                        <span className="text-xs text-muted-foreground">({course.total_reviews})</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-green-600">{formatPrice(course.earnings)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/instructor/courses/${course.course_id}`)}
                    >
                      {t('instructor_students_page.actions.view_details')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {courseStats.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? t('instructor_students_page.empty.no_courses_match')
                  : t('instructor_students_page.empty.no_courses_with_students')}
              </p>
            </div>
          )}

          {courseStats.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-2">
                {t('instructor_students_page.pagination.showing_courses', {
                  from: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  to: Math.min(currentPage * ITEMS_PER_PAGE, courseStats.length),
                  total: courseStats.length,
                })}
              </div>
              <UserPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('instructor_students_page.student_table.title', { count: filteredStudents.length })}</CardTitle>
          <CardDescription>{t('instructor_students_page.student_table.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('instructor_students_page.student_table.headers.student')}</TableHead>
                <TableHead className="text-center">{t('instructor_students_page.student_table.headers.courses')}</TableHead>
                <TableHead className="text-center">{t('instructor_students_page.student_table.headers.avg_progress')}</TableHead>
                <TableHead className="text-center">{t('instructor_students_page.student_table.headers.completions')}</TableHead>
                <TableHead>{t('instructor_students_page.student_table.headers.latest_course')}</TableHead>
                <TableHead>{t('instructor_students_page.student_table.headers.last_access')}</TableHead>
                <TableHead className="text-right">{t('instructor_students_page.student_table.headers.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.student_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{student.total_courses}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Progress value={student.average_progress} className="h-2 w-20" />
                      <span className="text-sm">{student.average_progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{student.completion_count}</TableCell>
                  <TableCell>
                    <div className="max-w-[220px]">
                      <p className="line-clamp-1">{student.courses[0]?.title || '-'}</p>
                      {student.courses[0] && (
                        <p className="text-xs text-muted-foreground">{getCourseStatusLabel(student.courses[0].status)}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.last_access_date ? new Date(student.last_access_date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewStudent(student.student_id)}
                      disabled={studentDetailLoading}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {t('instructor_students_page.actions.view')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredStudents.length === 0 && (
            <div className="text-center py-10">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('instructor_students_page.empty.no_students_match')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedStudent}
        onOpenChange={(open) => {
          if (!open) setSelectedStudent(null)
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.full_name || t('instructor_students_page.dialog.student_details')}</DialogTitle>
            <DialogDescription>
              {selectedStudent?.email || t('instructor_students_page.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t('instructor_students_page.dialog.metrics.total_courses')}</p>
                    <p className="text-2xl font-bold">{selectedStudent.total_courses}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t('instructor_students_page.dialog.metrics.active_courses')}</p>
                    <p className="text-2xl font-bold">{selectedStudent.active_course_count}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t('instructor_students_page.dialog.metrics.avg_progress')}</p>
                    <p className="text-2xl font-bold">{selectedStudent.average_progress}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t('instructor_students_page.dialog.metrics.completions')}</p>
                    <p className="text-2xl font-bold">{selectedStudent.completion_count}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('instructor_students_page.dialog.fields.phone')}</p>
                  <p>{selectedStudent.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('instructor_students_page.dialog.fields.last_access')}</p>
                  <p>{selectedStudent.last_access_date ? new Date(selectedStudent.last_access_date).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('instructor_students_page.dialog.fields.address')}</p>
                  <p>{selectedStudent.address || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('instructor_students_page.dialog.fields.first_enrolled')}</p>
                  <p>{selectedStudent.enrolled_at ? new Date(selectedStudent.enrolled_at).toLocaleString() : '-'}</p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t('instructor_students_page.dialog.progress.title')}</CardTitle>
                  <CardDescription>{t('instructor_students_page.dialog.progress.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('instructor_students_page.dialog.progress.headers.course')}</TableHead>
                        <TableHead>{t('instructor_students_page.dialog.progress.headers.status')}</TableHead>
                        <TableHead className="text-center">{t('instructor_students_page.dialog.progress.headers.progress')}</TableHead>
                        <TableHead className="text-center">{t('instructor_students_page.dialog.progress.headers.lessons')}</TableHead>
                        <TableHead className="text-center">{t('instructor_students_page.dialog.progress.headers.time_spent')}</TableHead>
                        <TableHead>{t('instructor_students_page.dialog.progress.headers.last_access')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedStudent.courses.map((course) => (
                        <TableRow key={course.enrollment_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{course.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {t('instructor_students_page.dialog.progress.enrolled_on', {
                                  date: course.enrollment_date ? new Date(course.enrollment_date).toLocaleDateString() : '-',
                                })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={course.status === 'complete' ? 'default' : 'secondary'}>
                              {getCourseStatusLabel(course.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Progress value={course.progress} className="h-2 w-24" />
                              <span className="text-sm">{course.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {t('instructor_students_page.dialog.progress.lessons_value', {
                              completed: course.completed_lessons,
                              total: course.total_lessons || 0,
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            {t('instructor_students_page.dialog.progress.time_spent_value', {
                              minutes: course.time_spent_minutes,
                            })}
                          </TableCell>
                          <TableCell>
                            {course.last_access_date ? new Date(course.last_access_date).toLocaleString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
