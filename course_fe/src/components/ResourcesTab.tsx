import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import {
  Upload,
  Paperclip,
  FileText,
  File,
  Image as ImageIcon,
  X,
  Download,
  ExternalLink
} from 'lucide-react'
import { cn } from './ui/utils'
import { toast } from 'sonner@2.0.3'

interface Resource {
  id: string
  name: string
  type: 'pdf' | 'doc' | 'image' | 'zip' | 'link'
  size?: string
  url: string
}

interface Lesson {
  id: number
  title: string
  resources?: Resource[]
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
  link: ExternalLink
}

const RESOURCE_COLORS = {
  pdf: 'text-red-600 bg-red-500/10',
  doc: 'text-blue-600 bg-blue-500/10',
  image: 'text-purple-600 bg-purple-500/10',
  zip: 'text-gray-600 bg-gray-500/10',
  link: 'text-cyan-600 bg-cyan-500/10'
}

export function ResourcesTab({ lesson, onUpdate }: ResourcesTabProps) {
  const [resources, setResources] = useState<Resource[]>(lesson.resources || [])
  const [showAddLink, setShowAddLink] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(async (file) => {
      const newResource: Resource = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: getFileType(file.name),
        size: formatFileSize(file.size),
        url: `https://cloudinary.com/resources/${file.name}` // Mock URL
      }

      const updatedResources = [...resources, newResource]
      setResources(updatedResources)
      onUpdate({ resources: updatedResources })
      toast.success(`Added ${file.name}`)
    })
  }

  const handleAddLink = () => {
    if (!linkName.trim() || !linkUrl.trim()) {
      toast.error('Please enter both name and URL')
      return
    }

    const newResource: Resource = {
      id: Date.now().toString(),
      name: linkName,
      type: 'link',
      url: linkUrl
    }

    const updatedResources = [...resources, newResource]
    setResources(updatedResources)
    onUpdate({ resources: updatedResources })
    
    setLinkName('')
    setLinkUrl('')
    setShowAddLink(false)
    toast.success('Link added successfully')
  }

  const handleRemoveResource = (id: string) => {
    const updatedResources = resources.filter(r => r.id !== id)
    setResources(updatedResources)
    onUpdate({ resources: updatedResources })
    toast.success('Resource removed')
  }

  const getFileType = (filename: string): Resource['type'] => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return 'pdf'
    if (['doc', 'docx'].includes(ext || '')) return 'doc'
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) return 'image'
    if (ext === 'zip') return 'zip'
    return 'pdf'
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
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
              <p className="text-sm text-muted-foreground">
                PDFs, documents, images, or zip files
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('resource-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
              <input
                id="resource-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddLink(!showAddLink)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Add External Link Form */}
      {showAddLink && (
        <Card className="p-4 border-primary/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Add External Link</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddLink(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="link-name">Link Name</Label>
                <Input
                  id="link-name"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="e.g., Official Documentation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link-url">URL</Label>
                <Input
                  id="link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>

              <Button onClick={handleAddLink} className="w-full">
                <Paperclip className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Resources List */}
      {resources.length > 0 && (
        <div className="space-y-2">
          <Label>Attached Resources ({resources.length})</Label>
          <div className="space-y-2">
            {resources.map((resource) => {
              const Icon = RESOURCE_ICONS[resource.type] || File
              const colorClass = RESOURCE_COLORS[resource.type] || 'text-gray-600 bg-gray-500/10'

              return (
                <Card key={resource.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", colorClass)}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {resource.name}
                      </p>
                      {resource.size && (
                        <p className="text-xs text-muted-foreground">
                          {resource.size}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {resource.type === 'link' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(resource.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}

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

      {/* Empty State */}
      {resources.length === 0 && (
        <Card className="p-8 bg-muted/30">
          <div className="text-center text-muted-foreground">
            <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No resources attached yet</p>
          </div>
        </Card>
      )}
    </div>
  )
}