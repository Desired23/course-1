import { useEffect, useState } from 'react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Plus, Edit2, Trash2, Search, Upload, FileText, Download, File, Link as LinkIcon, Video, Image as ImageIcon, Archive } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import {
  getAttachmentsPage,
  createAttachment,
  updateAttachment,
  deleteAttachment,
  type LessonAttachment,
} from '../../services/lesson-attachments.api'
import { getAllCourses } from '../../services/course.api'
import { getMyInstructorProfile } from '../../services/instructor.api'
import { UserPagination } from '../../components/UserPagination'

interface Resource {
  id: string
  courseId: string
  courseName: string
  title: string
  description: string
  type: 'pdf' | 'video' | 'image' | 'document' | 'archive' | 'link'
  url: string
  fileName?: string
  fileSize?: number
  downloads: number
  isPublic: boolean
  lessonId?: string
  lessonName?: string
  createdAt: string
  updatedAt: string
}

const ITEMS_PER_PAGE = 10

function attachmentToResource(att: LessonAttachment): Resource {
  const typeMap: Record<string, Resource['type']> = {
    pdf: 'pdf', video: 'video', image: 'image', document: 'document', archive: 'archive', link: 'link',
    'application/pdf': 'pdf', 'video/mp4': 'video', 'image/png': 'image', 'image/jpeg': 'image',
    'application/zip': 'archive', 'application/x-rar': 'archive',
  }
  return {
    id: String(att.id),
    courseId: att.course_id ? String(att.course_id) : '',
    courseName: att.course_title || '',
    title: att.title || att.file_path?.split('/').pop() || 'Untitled',
    description: '',
    type: typeMap[att.file_type || ''] || 'document',
    url: att.file_path,
    fileName: att.file_path?.split('/').pop() || undefined,
    fileSize: att.file_size || undefined,
    downloads: att.download_count || 0,
    isPublic: true,
    lessonId: att.lesson ? String(att.lesson) : undefined,
    lessonName: att.lesson_title || undefined,
    createdAt: att.created_at,
    updatedAt: att.created_at,
  }
}

export function InstructorResourcesPage() {
  const { user } = useAuth()

  const [resources, setResources] = useState<Resource[]>([])
  const [courses, setCourses] = useState<{id: string; name: string}[]>([])
  const [instructorId, setInstructorId] = useState<number | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'downloads' | 'title'>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    type: 'pdf' as Resource['type'],
    url: '',
    fileName: '',
    fileSize: 0,
    isPublic: true,
    lessonId: '',
  })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filterCourse, filterType, sortBy])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function fetchBaseData() {
      try {
        const profile = await getMyInstructorProfile(user.id)
        if (cancelled) return
        setInstructorId(profile.id)

        const coursesData = await getAllCourses({ instructor_id: profile.id })
        if (cancelled) return
        setCourses(coursesData.map(c => ({ id: String(c.id), name: c.title })))
      } catch (err) {
        console.error('Failed to load resources base data:', err)
        toast.error('Failed to load resources')
      }
    }

    fetchBaseData()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    if (!instructorId) return
    let cancelled = false

    async function fetchResourcesPage() {
      try {
        setIsLoading(true)
        const res = await getAttachmentsPage({
          instructor_id: instructorId,
          course_id: filterCourse === 'all' ? undefined : Number(filterCourse),
          file_type: filterType === 'all' ? undefined : filterType,
          search: debouncedSearch || undefined,
          sort_by: sortBy,
          page: currentPage,
          page_size: ITEMS_PER_PAGE,
        })
        if (cancelled) return

        const mapped = (Array.isArray(res.results) ? res.results : []).map(attachmentToResource)
        setResources(mapped)
        setTotalCount(res.count || 0)
        setTotalPages(Math.max(1, res.total_pages || Math.ceil((res.count || 0) / ITEMS_PER_PAGE)))
      } catch (err) {
        console.error('Failed to load resources:', err)
        if (!cancelled) {
          setResources([])
          setTotalCount(0)
          setTotalPages(1)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchResourcesPage()
    return () => { cancelled = true }
  }, [instructorId, currentPage, debouncedSearch, filterCourse, filterType, sortBy, refreshKey])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const resetForm = () => {
    setFormData({
      courseId: '',
      title: '',
      description: '',
      type: 'pdf',
      url: '',
      fileName: '',
      fileSize: 0,
      isPublic: true,
      lessonId: '',
    })
  }

  const handleCreateResource = async () => {
    if (!formData.title || !formData.url || !formData.lessonId) {
      toast.error('Please fill title, URL and lesson ID')
      return
    }

    try {
      const created = await createAttachment({
        lesson: Number(formData.lessonId),
        title: formData.title,
        file_path: formData.url,
        file_type: formData.type,
        file_size: formData.fileSize || undefined,
      })
      if (created) {
        setCurrentPage(1)
        setRefreshKey((prev) => prev + 1)
      }
      toast.success('Resource uploaded successfully')
      setIsCreateDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error(err)
      toast.error('Failed to create resource')
    }
  }

  const handleEditResource = async () => {
    if (!editingResource) return
    if (!formData.title || !formData.url) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await updateAttachment(Number(editingResource.id), {
        title: formData.title,
        file_path: formData.url,
        file_type: formData.type,
        file_size: formData.fileSize || undefined,
      })
      setRefreshKey((prev) => prev + 1)
      toast.success('Resource updated successfully')
      setEditingResource(null)
      resetForm()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update resource')
    }
  }

  const handleDeleteResource = async () => {
    if (!deletingResource) return

    try {
      await deleteAttachment(Number(deletingResource.id))
      setRefreshKey((prev) => prev + 1)
      toast.success('Resource deleted successfully')
      setDeletingResource(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete resource')
    }
  }

  const openEditDialog = (resource: Resource) => {
    setEditingResource(resource)
    setFormData({
      courseId: resource.courseId,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      url: resource.url,
      fileName: resource.fileName || '',
      fileSize: resource.fileSize || 0,
      isPublic: resource.isPublic,
      lessonId: resource.lessonId || '',
    })
  }

  const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
      case 'pdf':
      case 'document':
        return <FileText className="h-5 w-5 text-red-500" />
      case 'video':
        return <Video className="h-5 w-5 text-purple-500" />
      case 'image':
        return <ImageIcon className="h-5 w-5 text-blue-500" />
      case 'archive':
        return <Archive className="h-5 w-5 text-yellow-500" />
      case 'link':
        return <LinkIcon className="h-5 w-5 text-green-500" />
      default:
        return <File className="h-5 w-5" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const totalResources = totalCount
  const totalDownloads = resources.reduce((sum, r) => sum + r.downloads, 0)
  const publicResources = totalCount

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl mb-2">Course Resources</h1>
              <p className="text-muted-foreground">Manage downloadable resources for your courses</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload New Resource</DialogTitle>
                  <DialogDescription>Add a downloadable resource for your students</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="course">Course</Label>
                      <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map(course => (
                            <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lessonId">Lesson ID *</Label>
                      <Input
                        id="lessonId"
                        value={formData.lessonId}
                        onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
                        placeholder="e.g. 123"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Resource Type *</Label>
                    <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="archive">Archive (ZIP)</SelectItem>
                        <SelectItem value="link">External Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">File URL *</Label>
                    <Input id="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateResource}>Upload Resource</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg"><File className="h-6 w-6 text-purple-600" /></div>
                  <div><p className="text-sm text-muted-foreground">Total Resources</p><p className="text-2xl">{totalResources}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg"><Download className="h-6 w-6 text-blue-600" /></div>
                  <div><p className="text-sm text-muted-foreground">Downloads (Current Page)</p><p className="text-2xl">{totalDownloads}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg"><Upload className="h-6 w-6 text-green-600" /></div>
                  <div><p className="text-sm text-muted-foreground">Public Resources</p><p className="text-2xl">{publicResources}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search resources..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger className="w-56"><SelectValue placeholder="All Courses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="archive">Archive</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Sort By" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="downloads">Most Downloads</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading resources...</TableCell>
                  </TableRow>
                ) : resources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No resources found.</TableCell>
                  </TableRow>
                ) : resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getResourceIcon(resource.type)}
                        <div>
                          <div className="font-medium">{resource.title}</div>
                          {resource.description && <div className="text-sm text-muted-foreground line-clamp-1">{resource.description}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{resource.courseName || '-'}</div>
                      {resource.lessonName && <div className="text-xs text-muted-foreground">{resource.lessonName}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{resource.type.toUpperCase()}</Badge></TableCell>
                    <TableCell>{resource.fileSize ? formatFileSize(resource.fileSize) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1"><Download className="h-4 w-4 text-muted-foreground" />{resource.downloads}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(resource)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingResource(resource)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {totalCount > 0 && (
          <div className="mt-4">
            <div className="text-sm text-muted-foreground mb-3">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)}-{Math.min((currentPage - 1) * ITEMS_PER_PAGE + resources.length, totalCount)} of {totalCount} resources
            </div>
            <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}

        {editingResource && (
          <Dialog open={!!editingResource} onOpenChange={() => setEditingResource(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Resource</DialogTitle>
                <DialogDescription>Update resource information</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Resource Type *</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="archive">Archive (ZIP)</SelectItem>
                      <SelectItem value="link">External Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input id="edit-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-url">File URL *</Label>
                  <Input id="edit-url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingResource(null)}>Cancel</Button>
                <Button onClick={handleEditResource}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <AlertDialog open={!!deletingResource} onOpenChange={() => setDeletingResource(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Resource</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingResource?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteResource} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
