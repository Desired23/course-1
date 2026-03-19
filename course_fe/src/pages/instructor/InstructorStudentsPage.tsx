import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Progress } from '../../components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { UserPagination } from '../../components/UserPagination'
import { Users, GraduationCap, TrendingUp, Search, Loader2, Star, BookOpen } from 'lucide-react'
import { useRouter } from '../../components/Router'
import { getInstructorDashboardStats, type InstructorDashboardStats } from '../../services/instructor.api'
import { formatPrice } from '../../services/course.api'

export function InstructorStudentsPage() {
  const { navigate } = useRouter()
  const [stats, setStats] = useState<InstructorDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('students')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const data = await getInstructorDashboardStats()
        if (!cancelled) setStats(data)
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const courseStats = useMemo(() => {
    if (!stats) return []
    return [...stats.course_stats]
      .filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (
          statusFilter === 'all' ||
          (statusFilter === 'published' && c.is_published) ||
          (statusFilter === 'draft' && !c.is_published)
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
        <p className="text-destructive mb-4">{error || 'Failed to load data'}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="mb-2">My Students</h1>
            <p className="text-muted-foreground">Track student enrollment and progress across your courses</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
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
                  <p className="text-sm text-muted-foreground">New This Month</p>
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
                  <p className="text-sm text-muted-foreground">Completions</p>
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
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">{stats.average_rating.toFixed(1)}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="md:col-start-3">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="students">Most Students</SelectItem>
                <SelectItem value="new_students">Most New Students</SelectItem>
                <SelectItem value="completion">Highest Completion</SelectItem>
                <SelectItem value="rating">Highest Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Per-Course Student Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Students by Course ({courseStats.length} courses)</CardTitle>
          <CardDescription>Student enrollment and progress breakdown per course</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="text-center">Total Students</TableHead>
                <TableHead className="text-center">New This Month</TableHead>
                <TableHead className="text-center">Completion Rate</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-center">Earnings</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                      <span className="text-muted-foreground">—</span>
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
                      View Details
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
                {searchQuery ? 'No courses match your search' : 'No courses with students yet'}
              </p>
            </div>
          )}

          {courseStats.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-2">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                -
                {Math.min(currentPage * ITEMS_PER_PAGE, courseStats.length)}
                {' '}of {courseStats.length} courses
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
    </div>
  )
}
