import { useState } from 'react'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import {
  Upload,
  Video,
  FileText,
  Link as LinkIcon,
  X,
  CheckCircle,
  AlertCircle,
  Play,
  Loader2
} from 'lucide-react'
import { cn } from './ui/utils'
import { toast } from 'sonner@2.0.3'

interface Lesson {
  id: number
  title: string
  type: string
  content_type?: string
  duration: string
  status: string
  is_free?: boolean
  description?: string
  videoUrl?: string
  content?: string
  externalUrl?: string
}

interface ContentTabProps {
  lesson: Lesson
  onUpdate: (updates: Partial<Lesson>) => void
}

export function ContentTab({ lesson, onUpdate }: ContentTabProps) {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(lesson.videoUrl || null)

  const contentType = lesson.content_type || lesson.type

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (contentType === 'video') {
      if (!file.type.startsWith('video/')) {
        toast.error('Please upload a video file')
        return
      }
      if (file.size > 500 * 1024 * 1024) { // 500MB
        toast.error('Video file size must be less than 500MB')
        return
      }
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval)
            return prev
          }
          return prev + 5
        })
      }, 200)

      // Simulate API call to Cloudinary
      await new Promise(resolve => setTimeout(resolve, 3000))

      clearInterval(interval)
      setUploadProgress(100)

      // Simulate uploaded URL
      const mockUrl = `https://cloudinary.com/videos/${file.name}`
      setUploadedFile(mockUrl)
      onUpdate({ videoUrl: mockUrl })
      
      toast.success('Video uploaded successfully!')
    } catch (error) {
      toast.error('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    onUpdate({ videoUrl: '' })
    toast.success('Video removed')
  }

  // VIDEO CONTENT TYPE
  if (contentType === 'video') {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Video Upload</Label>
          
          {!uploadedFile ? (
            <Card className="p-8 border-2 border-dashed">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Video className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Upload Video</h4>
                  <p className="text-sm text-muted-foreground break-words px-4">
                    Drag and drop or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground break-words px-2">
                    Supported formats: MP4, WebM, AVI • Max size: 500MB
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('video-upload')?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {isUploading && (
                  <div className="space-y-2 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Uploading...</span>
                      <span className="font-semibold">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h4 className="font-semibold">Video Uploaded</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {uploadedFile}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button variant="outline" size="sm" className="mt-3">
                    <Play className="h-3.5 w-3.5 mr-2" />
                    Preview Video
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* External Video URL Option */}
        <div className="space-y-2">
          <Label htmlFor="external-url">Or use external video URL</Label>
          <div className="flex gap-2">
            <Input
              id="external-url"
              value={lesson.externalUrl || ''}
              onChange={(e) => onUpdate({ externalUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=... or Vimeo link"
              className="flex-1"
            />
            <Button variant="outline" size="sm">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            YouTube, Vimeo, and Wistia links supported
          </p>
        </div>
      </div>
    )
  }

  // TEXT/ARTICLE CONTENT TYPE
  if (contentType === 'text') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Article Content</Label>
          <Card className="p-6 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 min-w-0 flex-1">
                <h4 className="font-semibold text-sm">Rich Text Editor Coming in Step 7</h4>
                <p className="text-sm text-muted-foreground break-words">
                  TipTap editor with formatting, images, code blocks will be integrated here
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // EXTERNAL LINK CONTENT TYPE
  if (contentType === 'link') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="link-url">External Resource URL *</Label>
          <Input
            id="link-url"
            value={lesson.externalUrl || ''}
            onChange={(e) => onUpdate({ externalUrl: e.target.value })}
            placeholder="https://example.com"
            type="url"
          />
          <p className="text-xs text-muted-foreground">
            Link to external documentation, resources, or websites
          </p>
        </div>
      </div>
    )
  }

  // FILE DOWNLOAD CONTENT TYPE
  if (contentType === 'file') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Downloadable File</Label>
          <Card className="p-6 border-2 border-dashed">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Upload PDF, ZIP, or other downloadable files
              </p>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // DEFAULT / ASSIGNMENT
  return (
    <div className="text-center py-12 text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
      <p className="text-sm font-medium mb-2">Content Editor</p>
      <p className="text-xs">Content editing for this type coming soon</p>
    </div>
  )
}