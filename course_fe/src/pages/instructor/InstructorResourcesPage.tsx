import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Plus, Edit2, Trash2, Search, Upload, FileText, Download, File, Link as LinkIcon, Video, Image as ImageIcon, Archive } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { getAttachments, createAttachment, updateAttachment, deleteAttachment, type LessonAttachment } from '../../services/lesson-attachments.api'
import { getAllCourses } from '../../services/course.api'
import { getMyInstructorProfile } from '../../services/instructor.api'

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

// Adapter: map BE attachment → FE Resource
function attachmentToResource(att: LessonAttachment): Resource {
  const typeMap: Record<string, Resource['type']> = {
    pdf: 'pdf', video: 'video', image: 'image', document: 'document', archive: 'archive', link: 'link',
    'application/pdf': 'pdf', 'video/mp4': 'video', 'image/png': 'image', 'image/jpeg': 'image',
    'application/zip': 'archive', 'application/x-rar': 'archive',
  }
  return {
    id: String(att.id),
    courseId: '',
    courseName: '',
    title: att.title || att.file_path?.split('/').pop() || 'Untitled',
    description: '',
    type: typeMap[att.file_type || ''] || 'document',
    url: att.file_path,
    fileName: att.file_path?.split('/').pop() || undefined,
    fileSize: att.file_size || undefined,
    downloads: att.download_count || 0,
    isPublic: true,
    lessonId: att.lesson ? String(att.lesson) : undefined,
    createdAt: att.created_at,
    updatedAt: att.created_at,
  }
}

export function InstructorResourcesPage() {
  const { navigate } = useRouter()
  const { user } = useAuth()
  const [resources, setResources] = useState<Resource[]>([])
  const [courses, setCourses] = useState<{id: string; name: string}[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCourse, setFilterCourse] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    type: 'pdf' as Resource['type'],
    url: '',
    fileName: '',
    fileSize: 0,
    isPublic: true,
    lessonId: ''
  })

  // Fetch resources and courses from API
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function fetchData() {
      try {
        const profile = await getMyInstructorProfile(user!.id)
        if (cancelled) return

        // Fetch courses for filter and form
        const coursesData = await getAllCourses({ instructor_id: profile.id })
        if (cancelled) return
        setCourses(coursesData.map(c => ({ id: String(c.id), name: c.title })))

        // Fetch all attachments
        const attachments = await getAttachments()
        if (cancelled) return
        setResources(attachments.map(attachmentToResource))
      } catch (err) {
        console.error('Failed to load resources:', err)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [user?.id])

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
      lessonId: ''
    })
  }

  const handleCreateResource = async () => {
    if (!formData.title || !formData.url) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const created = await createAttachment({
        lesson: formData.lessonId ? Number(formData.lessonId) : 0,
        title: formData.title,
        file_path: formData.url,
        file_type: formData.type,
        file_size: formData.fileSize || undefined,
      })
      setResources([...resources, attachmentToResource(created)])
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
      setResources(resources.map(res =>
        res.id === editingResource.id
          ? { ...res, title: formData.title, url: formData.url, type: formData.type, description: formData.description, updatedAt: new Date().toISOString() }
          : res
      ))
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
      setResources(resources.filter(res => res.id !== deletingResource.id))
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
      lessonId: resource.lessonId || ''
    })
  }

  // Filter resources
  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = filterCourse === 'all' || resource.courseId === filterCourse
    const matchesType = filterType === 'all' || resource.type === filterType
    return matchesSearch && matchesCourse && matchesType
  })

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
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const totalResources = resources.length
  const totalDownloads = resources.reduce((sum, r) => sum + r.downloads, 0)
  const publicResources = resources.filter(r => r.isPublic).length

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl mb-2">Course Resources</h1>
              <p className="text-muted-foreground">
                Manage downloadable resources for your courses
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload New Resource</DialogTitle>
                  <DialogDescription>
                    Add a downloadable resource for your students
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="course">Course *</Label>
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
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Course Syllabus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the resource"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">
                      {formData.type === 'link' ? 'URL *' : 'File URL *'}
                    </Label>
                    <Input
                      id="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder={formData.type === 'link' ? 'https://example.com' : '/resources/file.pdf'}
                    />
                  </div>
                  {formData.type !== 'link' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fileName">File Name</Label>
                        <Input
                          id="fileName"
                          value={formData.fileName}
                          onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                          placeholder="file.pdf"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fileSize">File Size (bytes)</Label>
                        <Input
                          id="fileSize"
                          type="number"
                          value={formData.fileSize}
                          onChange={(e) => setFormData({ ...formData, fileSize: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="isPublic">Make public (available to all students)</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateResource}>
                    Upload Resource
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <File className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Resources</p>
                    <p className="text-2xl">{totalResources}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Download className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Downloads</p>
                    <p className="text-2xl">{totalDownloads}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <Upload className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Public Resources</p>
                    <p className="text-2xl">{publicResources}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
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
          </div>
        </div>

        {/* Resources Table */}
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
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getResourceIcon(resource.type)}
                        <div>
                          <div className="font-medium">{resource.title}</div>
                          {resource.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {resource.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{resource.courseName}</div>
                      {resource.lessonName && (
                        <div className="text-xs text-muted-foreground">{resource.lessonName}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{resource.type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      {resource.fileSize ? formatFileSize(resource.fileSize) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        {resource.downloads}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={resource.isPublic ? 'default' : 'secondary'}>
                        {resource.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(resource)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingResource(resource)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        {editingResource && (
          <Dialog open={!!editingResource} onOpenChange={() => setEditingResource(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Resource</DialogTitle>
                <DialogDescription>
                  Update resource information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Resource Type *</Label>
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
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-url">
                    {formData.type === 'link' ? 'URL *' : 'File URL *'}
                  </Label>
                  <Input
                    id="edit-url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="edit-isPublic">Make public (available to all students)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingResource(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEditResource}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingResource} onOpenChange={() => setDeletingResource(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Resource</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingResource?.title}"? This action cannot be undone.
                Students will no longer be able to access this resource.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteResource}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
