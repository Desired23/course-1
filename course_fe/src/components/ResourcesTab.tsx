import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card } from './ui/card'
import {
  Upload,
  Paperclip,
  FileText,
  File,
  Image as ImageIcon,
  X,
  Download,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { cn } from './ui/utils'
import { toast } from 'sonner'
import { uploadFiles } from '../services/upload.api'
import {
  createAttachment,
  deleteAttachment,
  getAttachmentsByLesson,
  type LessonAttachment,
} from '../services/lesson-attachments.api'

interface Lesson {
  id: number
  title: string
}

interface ResourcesTabProps {
  lesson: Lesson
  onUpdate: (updates: Partial<Lesson>) => void
}

const RESOURCE_ICONS = {
  pdf: FileText,
  doc: FileText,
  image: ImageIcon,
  zip: File,
  link: ExternalLink,
}

const RESOURCE_COLORS = {
  pdf: 'text-red-600 bg-red-500/10',
  doc: 'text-blue-600 bg-blue-500/10',
  image: 'text-purple-600 bg-purple-500/10',
  zip: 'text-gray-600 bg-gray-500/10',
  link: 'text-cyan-600 bg-cyan-500/10',
}

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx'].includes(ext || '')) return 'doc'
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return 'image'
  if (['zip', 'rar', '7z'].includes(ext || '')) return 'zip'
  return ext || 'file'
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ResourcesTab({ lesson }: ResourcesTabProps) {
  const [resources, setResources] = useState<LessonAttachment[]>([])
  const [showAddLink, setShowAddLink] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const loadResources = async () => {
    if (!lesson?.id) return
    setIsLoading(true)
    try {
      const list = await getAttachmentsByLesson(lesson.id)
      setResources(list)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load resources')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadResources()
  }, [lesson?.id])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const uploaded = await uploadFiles(Array.from(files), {
        folder: `lesson-resources/${lesson.id}`,
        resource_type: 'auto',
      })

      await Promise.all(
        uploaded.map((item, idx) =>
          createAttachment({
            lesson: lesson.id,
            title: files[idx]?.name || `resource-${idx + 1}`,
            file_path: item.url,
            file_type: files[idx]?.type || getFileType(files[idx]?.name || ''),
            file_size: files[idx]?.size,
          })
        )
      )

      toast.success(`Uploaded ${uploaded.length} resource(s)`)
      await loadResources()
      e.target.value = ''
    } catch (error) {
      console.error(error)
      toast.error('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddLink = async () => {
    if (!linkName.trim() || !linkUrl.trim()) {
      toast.error('Please enter both name and URL')
      return
    }

    try {
      await createAttachment({
        lesson: lesson.id,
        title: linkName.trim(),
        file_path: linkUrl.trim(),
        file_type: 'link',
      })
      toast.success('Link added successfully')
      setLinkName('')
      setLinkUrl('')
      setShowAddLink(false)
      await loadResources()
    } catch (error) {
      console.error(error)
      toast.error('Failed to add link')
    }
  }

  const handleRemoveResource = async (id: number) => {
    try {
      await deleteAttachment(id)
      setResources(prev => prev.filter(r => r.id !== id))
      toast.success('Resource removed')
    } catch (error) {
      console.error(error)
      toast.error('Failed to remove resource')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Attach Resources</Label>
        <Card className="p-6 border-2 border-dashed">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Upload Files</h4>
              <p className="text-sm text-muted-foreground">PDFs, documents, images, archives or links</p>
            </div>

            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => document.getElementById('resource-upload')?.click()}
              >
                {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Choose Files
              </Button>
              <input
                id="resource-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />

              <Button variant="outline" size="sm" onClick={() => setShowAddLink(!showAddLink)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {showAddLink && (
        <Card className="p-4 border-primary/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Add External Link</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowAddLink(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="link-name">Link Name</Label>
                <Input id="link-name" value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="e.g., Official Documentation" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link-url">URL</Label>
                <Input id="link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" type="url" />
              </div>

              <Button onClick={handleAddLink} className="w-full">
                <Paperclip className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>
          </div>
        </Card>
      )}

      {resources.length > 0 && (
        <div className="space-y-2">
          <Label>Attached Resources ({resources.length})</Label>
          <div className="space-y-2">
            {resources.map((resource) => {
              const resourceType = (resource.file_type || getFileType(resource.file_path || '')).toLowerCase()
              const iconKey = (['pdf', 'doc', 'image', 'zip', 'link'].includes(resourceType) ? resourceType : 'doc') as keyof typeof RESOURCE_ICONS
              const Icon = RESOURCE_ICONS[iconKey]
              const colorClass = RESOURCE_COLORS[iconKey]
              const displayName = resource.title || resource.file_path.split('/').pop() || `Attachment ${resource.id}`

              return (
                <Card key={resource.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', colorClass)}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(resource.file_size)}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => window.open(resource.file_path, '_blank')}>
                        {iconKey === 'link' ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveResource(resource.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {resources.length === 0 && (
        <Card className="p-8 bg-muted/30">
          <div className="text-center text-muted-foreground">
            {isLoading ? <Loader2 className="h-8 w-8 mx-auto mb-2 opacity-70 animate-spin" /> : <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-20" />}
            <p className="text-sm">{isLoading ? 'Loading resources...' : 'No resources attached yet'}</p>
          </div>
        </Card>
      )}
    </div>
  )
}
