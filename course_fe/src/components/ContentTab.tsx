import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Video, FileText, X, CheckCircle, Play, File } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Card } from './ui/card'
import { Progress } from './ui/progress'
import { uploadFiles } from '../services/upload.api'

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
  videoPublicId?: string
  content?: string
  externalUrl?: string
  filePath?: string
}

interface ContentTabProps {
  lesson: Lesson
  onUpdate: (updates: Partial<Lesson>) => void
}

export function ContentTab({ lesson, onUpdate }: ContentTabProps) {
  const { t } = useTranslation()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(lesson.videoUrl || lesson.filePath || null)

  const contentType = lesson.content_type || lesson.type

  const handleUpload = async (file: File, mode: 'video' | 'file') => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval)
            return prev
          }
          return prev + 5
        })
      }, 180)

      const uploaded = await uploadFiles([file], {
        folder: mode === 'video' ? 'lesson-videos' : 'lesson-files',
        resource_type: mode === 'video' ? 'video' : 'raw',
        delivery_type: mode === 'video' ? 'authenticated' : 'upload',
      })
      if (!uploaded?.length) throw new Error(t('lesson_editor.upload_failed'))

      clearInterval(interval)
      setUploadProgress(100)

      const uploadedUrl = uploaded[0].url
      setUploadedFile(uploadedUrl)
      if (mode === 'video') {
        onUpdate({
          videoUrl: uploadedUrl,
          videoPublicId: uploaded[0].public_id,
        })
      } else {
        onUpdate({
          filePath: uploadedUrl,
        })
      }

      toast.success(
        t(mode === 'video' ? 'lesson_editor.video_uploaded_success' : 'lesson_editor.file_uploaded_success')
      )
    } catch (error) {
      console.error(error)
      toast.error(t('lesson_editor.upload_failed_retry'))
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 900)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (contentType === 'video') {
      if (!file.type.startsWith('video/')) {
        toast.error(t('lesson_editor.upload_video_file_only'))
        return
      }
      if (file.size > 500 * 1024 * 1024) {
        toast.error(t('lesson_editor.video_max_size'))
        return
      }
      await handleUpload(file, 'video')
      return
    }

    await handleUpload(file, 'file')
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    if (contentType === 'video') {
      onUpdate({ videoUrl: '', videoPublicId: '' })
    } else {
      onUpdate({ filePath: '' })
    }
    toast.success(t('lesson_editor.file_removed'))
  }

  if (contentType === 'video' || contentType === 'file') {
    const isVideo = contentType === 'video'
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>{isVideo ? t('lesson_editor.video_upload') : t('lesson_editor.file_upload')}</Label>

          {!uploadedFile ? (
            <Card className="p-8 border-2 border-dashed">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-primary/10">
                    {isVideo ? <Video className="h-8 w-8 text-primary" /> : <File className="h-8 w-8 text-primary" />}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">{isVideo ? t('lesson_editor.upload_video') : t('lesson_editor.upload_file')}</h4>
                  <p className="text-sm text-muted-foreground">{t('lesson_editor.drag_drop')}</p>
                  <p className="text-xs text-muted-foreground">
                    {isVideo ? t('lesson_editor.supported_video') : t('lesson_editor.supported_file')}
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('lesson-content-upload')?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('lesson_editor.choose_file')}
                  </Button>
                  <input
                    id="lesson-content-upload"
                    type="file"
                    accept={isVideo ? 'video/*' : undefined}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {isUploading && (
                  <div className="space-y-2 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('lesson_editor.uploading')}</span>
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
                      <h4 className="font-semibold">{isVideo ? t('lesson_editor.video_uploaded') : t('lesson_editor.file_uploaded')}</h4>
                      <p className="text-sm text-muted-foreground truncate">{uploadedFile}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="text-destructive hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button variant="outline" size="sm" className="mt-3" onClick={() => window.open(uploadedFile, '_blank')}>
                    <Play className="h-3.5 w-3.5 mr-2" />
                    {isVideo ? t('lesson_editor.preview_video') : t('lesson_editor.open_file')}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    )
  }

  if (contentType === 'text' || contentType === 'assignment') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{contentType === 'text' ? t('lesson_editor.article_content') : t('lesson_editor.assignment_instructions')}</Label>
          <Textarea
            value={lesson.content || ''}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder={
              contentType === 'text'
                ? t('lesson_editor.article_placeholder')
                : t('lesson_editor.assignment_placeholder')
            }
            rows={16}
          />
          <p className="text-xs text-muted-foreground">
            {contentType === 'text' ? t('lesson_editor.article_hint') : t('lesson_editor.assignment_hint')}
          </p>
        </div>
      </div>
    )
  }

  if (contentType === 'link') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="link-url">{t('lesson_editor.external_resource_url')}</Label>
          <Input
            id="link-url"
            value={lesson.externalUrl || ''}
            onChange={(e) => onUpdate({ externalUrl: e.target.value })}
            placeholder="https://example.com"
            type="url"
          />
          <p className="text-xs text-muted-foreground">{t('lesson_editor.external_resource_hint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-12 text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
      <p className="text-sm font-medium mb-2">{t('lesson_editor.content_editor')}</p>
      <p className="text-xs">{t('lesson_editor.no_special_editor')}</p>
    </div>
  )
}
