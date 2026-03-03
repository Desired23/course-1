import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Search, Eye, Edit, Trash2, Check, X, Clock, Users, Star, DollarSign, BookOpen } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { toast } from 'sonner@2.0.3'
import { getAllCourses, updateCourse, deleteCourse as deleteCourseApi, type CourseListItem } from '../../services/course.api'

export function AdminCoursesPage() {
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const [courses, setCourses] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await getAllCourses()
        setCourses(data.map((c: CourseListItem) => ({
          id: c.id,
          title: c.title,
          instructor: c.instructor_name || 'Unknown',
          thumbnail: c.thumbnail || '',
          status: c.status,
          price: parseFloat(String(c.price || 0)),
          students: c.total_students || 0,
          rating: parseFloat(String(c.rating || 0)),
          reviews: c.total_reviews || 0,
          category: c.category_name || 'Uncategorized',
          level: c.level || 'all_levels',
          createdAt: c.created_at?.split('T')[0] || '',
          lastUpdated: c.updated_at?.split('T')[0] || '',
        })))
      } catch (err) {
        console.error('Failed to fetch courses:', err)
      }
    }
    fetchCourses()
  }, [])

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusBadge = (status: string) => {
    const variants = {
      published: { variant: "default" as const, text: t('admin_courses.status_published'), icon: Check },
      pending: { variant: "secondary" as const, text: t('admin_courses.status_pending'), icon: Clock },
      draft: { variant: "outline" as const, text: t('admin_courses.status_draft'), icon: Edit },
      rejected: { variant: "destructive" as const, text: t('admin_courses.status_rejected'), icon: X }
    }
    const config = variants[status as keyof typeof variants]
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const handleApproveCourse = async (courseId: number) => {
    try {
      await updateCourse(courseId, { status: 'published' })
      setCourses(courses.map(c => 
        c.id === courseId ? { ...c, status: 'published' } : c
      ))
      toast.success('Course approved')
    } catch (err) { toast.error('Failed to approve course') }
  }

  const handleRejectCourse = async (courseId: number) => {
    try {
      await updateCourse(courseId, { status: 'rejected' })
      setCourses(courses.map(c => 
        c.id === courseId ? { ...c, status: 'rejected' } : c
      ))
      toast.success('Course rejected')
    } catch (err) { toast.error('Failed to reject course') }
  }

  const handleDeleteCourse = async (courseId: number) => {
    if (confirm(t('admin_courses.delete_confirm'))) {
      try {
        await deleteCourseApi(courseId)
        setCourses(courses.filter(c => c.id !== courseId))
        toast.success('Course deleted')
      } catch (err) { toast.error('Failed to delete course') }
    }
  }

  const statusCounts = {
    all: courses.length,
    published: courses.filter(c => c.status === 'published').length,
    pending: courses.filter(c => c.status === 'pending').length,
    draft: courses.filter(c => c.status === 'draft').length,
    rejected: courses.filter(c => c.status === 'rejected').length
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="mb-2">Course Management</h1>
        <p className="text-muted-foreground">Manage all courses on the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-semibold mt-1">{courses.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-semibold mt-1 text-green-600">{statusCounts.published}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-semibold mt-1 text-yellow-600">{statusCounts.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-semibold mt-1">{courses.reduce((sum, c) => sum + c.students, 0).toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses or instructors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Development">Development</SelectItem>
            <SelectItem value="Design">Design</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
            <SelectItem value="Data Science">Data Science</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="students">Most Students</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <div className="overflow-x-auto mb-6">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="all" className="whitespace-nowrap">All ({statusCounts.all})</TabsTrigger>
            <TabsTrigger value="published" className="whitespace-nowrap">Published ({statusCounts.published})</TabsTrigger>
            <TabsTrigger value="pending" className="whitespace-nowrap">Pending ({statusCounts.pending})</TabsTrigger>
            <TabsTrigger value="draft" className="whitespace-nowrap">Drafts ({statusCounts.draft})</TabsTrigger>
            <TabsTrigger value="rejected" className="whitespace-nowrap">Rejected ({statusCounts.rejected})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={statusFilter}>
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full md:w-48 h-48 md:h-32 object-cover rounded-lg"
                      />
                    </div>

                    {/* Course Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                            <h3 className="font-semibold line-clamp-2 sm:line-clamp-1">{course.title}</h3>
                            {getStatusBadge(course.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">By {course.instructor}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground mt-2">
                            <span>{course.category} • {course.level}</span>
                            <span className="hidden sm:inline">Created {course.createdAt}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/courses/${course.id}`)}>
                            <Eye className="h-4 w-4 md:mr-1" />
                            <span className="hidden md:inline">View</span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/courses/${course.id}`)}>
                            <Edit className="h-4 w-4 md:mr-1" />
                            <span className="hidden md:inline">Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            <Trash2 className="h-4 w-4 md:mr-1" />
                            <span className="hidden md:inline">Delete</span>
                          </Button>
                        </div>
                      </div>

                      {/* Stats */}
                      {course.status === 'published' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 pt-3 border-t">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <p className="font-semibold text-sm md:text-base">{course.students.toLocaleString()}</p>
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground">Students</p>
                          </div>
                          
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <p className="font-semibold text-sm md:text-base">{course.rating}</p>
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground">{course.reviews} reviews</p>
                          </div>
                          
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <p className="font-semibold text-sm md:text-base">${course.price}</p>
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground">Price</p>
                          </div>
                          
                          <div className="text-center">
                            <p className="font-semibold text-sm md:text-base">${(course.students * course.price * 0.7).toLocaleString()}</p>
                            <p className="text-xs md:text-sm text-muted-foreground">Est. Revenue</p>
                          </div>
                        </div>
                      ) : course.status === 'pending' ? (
                        <div className="flex gap-2 pt-3 border-t">
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleApproveCourse(course.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve Course
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleRejectCourse(course.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject Course
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredCourses.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No courses found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}