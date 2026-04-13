import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
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
import { useTranslation } from 'react-i18next'
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

const sectionStagger: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp: any = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

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
  const { t } = useTranslation()
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
        toast.error(t('instructor_resources.load_failed'))
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
      toast.error(t('instructor_resources.fill_required'))
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
      toast.success(t('instructor_resources.create_success'))
      setIsCreateDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_resources.create_failed'))
    }
  }

  const handleEditResource = async () => {
    if (!editingResource) return
    if (!formData.title || !formData.url) {
      toast.error(t('instructor_resources.edit_fill_required'))
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
      toast.success(t('instructor_resources.update_success'))
      setEditingResource(null)
      resetForm()
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_resources.update_failed'))
    }
  }

  const handleDeleteResource = async () => {
    if (!deletingResource) return

    try {
      await deleteAttachment(Number(deletingResource.id))
      setRefreshKey((prev) => prev + 1)
      toast.success(t('instructor_resources.delete_success'))
      setDeletingResource(null)
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_resources.delete_failed'))
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
    <motion.div
      className="p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="max-w-7xl mx-auto" variants={sectionStagger} initial="hidden" animate="show">
        <motion.div className="mb-8" variants={fadeInUp}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl mb-2">{t('instructor_resources.title')}</h1>
              <p className="text-muted-foreground">{t('instructor_resources.subtitle')}</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('instructor_resources.upload_resource')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('instructor_resources.upload_new_resource')}</DialogTitle>
                  <DialogDescription>{t('instructor_resources.upload_description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="course">{t('instructor_resources.course')}</Label>
                      <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('instructor_resources.select_course')} />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map(course => (
                            <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lessonId">{t('instructor_resources.lesson_id')}</Label>
                      <Input
                        id="lessonId"
                        value={formData.lessonId}
                        onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
                        placeholder={t('instructor_resources.lesson_id_placeholder')}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">{t('instructor_resources.resource_type')}</Label>
                    <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">{t('instructor_resources.type_pdf')}</SelectItem>
                        <SelectItem value="document">{t('instructor_resources.type_document')}</SelectItem>
                        <SelectItem value="video">{t('instructor_resources.type_video')}</SelectItem>
                        <SelectItem value="image">{t('instructor_resources.type_image')}</SelectItem>
                        <SelectItem value="archive">{t('instructor_resources.type_archive')}</SelectItem>
                        <SelectItem value="link">{t('instructor_resources.type_link')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">{t('instructor_resources.resource_title')}</Label>
                    <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('common.description')}</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">{t('instructor_resources.file_url')}</Label>
                    <Input id="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button onClick={handleCreateResource}>{t('instructor_resources.upload_resource')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg"><File className="h-6 w-6 text-purple-600" /></div>
                  <div><p className="text-sm text-muted-foreground">{t('instructor_resources.total_resources')}</p><p className="text-2xl">{totalResources}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg"><Download className="h-6 w-6 text-blue-600" /></div>
                  <div><p className="text-sm text-muted-foreground">{t('instructor_resources.downloads_current_page')}</p><p className="text-2xl">{totalDownloads}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg"><Upload className="h-6 w-6 text-green-600" /></div>
                  <div><p className="text-sm text-muted-foreground">{t('instructor_resources.public_resources')}</p><p className="text-2xl">{publicResources}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('instructor_resources.search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger className="w-56"><SelectValue placeholder={t('instructor_resources.all_courses')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('instructor_resources.all_courses')}</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48"><SelectValue placeholder={t('instructor_resources.all_types')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('instructor_resources.all_types')}</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="document">{t('instructor_resources.type_document_short')}</SelectItem>
                <SelectItem value="video">{t('instructor_resources.type_video_short')}</SelectItem>
                <SelectItem value="image">{t('instructor_resources.type_image_short')}</SelectItem>
                <SelectItem value="archive">{t('instructor_resources.type_archive_short')}</SelectItem>
                <SelectItem value="link">{t('instructor_resources.type_link_short')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-44"><SelectValue placeholder={t('instructor_resources.sort_by')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('instructor_resources.sort_newest')}</SelectItem>
                <SelectItem value="downloads">{t('instructor_resources.sort_downloads')}</SelectItem>
                <SelectItem value="title">{t('instructor_resources.sort_title')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp}>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('instructor_resources.table_resource')}</TableHead>
                  <TableHead>{t('instructor_resources.table_course')}</TableHead>
                  <TableHead>{t('instructor_resources.table_type')}</TableHead>
                  <TableHead>{t('instructor_resources.table_size')}</TableHead>
                  <TableHead>{t('instructor_resources.table_downloads')}</TableHead>
                  <TableHead className="text-right">{t('instructor_resources.table_actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('instructor_resources.loading_resources')}</TableCell>
                  </TableRow>
                ) : resources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('instructor_resources.no_resources')}</TableCell>
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
        </motion.div>

        {totalCount > 0 && (
          <motion.div className="mt-4" variants={fadeInUp}>
            <div className="text-sm text-muted-foreground mb-3">
              {t('instructor_resources.pagination_summary', {
                from: Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount),
                to: Math.min((currentPage - 1) * ITEMS_PER_PAGE + resources.length, totalCount),
                total: totalCount,
              })}
            </div>
            <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </motion.div>
        )}

        {editingResource && (
          <Dialog open={!!editingResource} onOpenChange={() => setEditingResource(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('instructor_resources.edit_resource')}</DialogTitle>
                <DialogDescription>{t('instructor_resources.edit_description')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">{t('instructor_resources.resource_type')}</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">{t('instructor_resources.type_pdf')}</SelectItem>
                      <SelectItem value="document">{t('instructor_resources.type_document')}</SelectItem>
                      <SelectItem value="video">{t('instructor_resources.type_video')}</SelectItem>
                      <SelectItem value="image">{t('instructor_resources.type_image')}</SelectItem>
                      <SelectItem value="archive">{t('instructor_resources.type_archive')}</SelectItem>
                      <SelectItem value="link">{t('instructor_resources.type_link')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-title">{t('instructor_resources.resource_title')}</Label>
                  <Input id="edit-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-url">{t('instructor_resources.file_url')}</Label>
                  <Input id="edit-url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingResource(null)}>{t('common.cancel')}</Button>
                <Button onClick={handleEditResource}>{t('instructor_resources.save_changes')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <AlertDialog open={!!deletingResource} onOpenChange={() => setDeletingResource(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('instructor_resources.delete_resource')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('instructor_resources.delete_description', { title: deletingResource?.title || '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteResource} className="bg-destructive hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </motion.div>
  )
}
