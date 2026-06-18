import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Video, FileText, X, CheckCircle, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Progress as AntProgress } from 'antd'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Card } from './ui/card'
import { uploadFileWithProgress } from '../services/upload.api'
import { cloudinarySecondsToLessonMinutes, formatLessonDurationInput } from '../utils/lessonDuration'

interface Lesson {
  id: number
  title: string
  type: string
  content_type?: string
  duration: string
  is_free?: boolean
  description?: string
  videoUrl?: string
  videoPublicId?: string
  content?: string
}

interface ContentTabProps {
  lesson: Lesson
  onUpdate: (updates: Partial<Lesson>) => void
  onSaveVideo?: (data: { videoUrl: string; videoPublicId: string; durationMinutes?: number }) => Promise<void>
  onUploadingChange?: (uploading: boolean) => void
}

export function ContentTab({ lesson, onUpdate, onSaveVideo, onUploadingChange }: ContentTabProps) {
  const { t } = useTranslation()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(lesson.videoUrl || null)

  const contentType = lesson.content_type || lesson.type

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    onUploadingChange?.(true)
    setUploadProgress(0)

    try {
      const uploaded = await uploadFileWithProgress(file, {
        folder: 'lesson-videos',
        resource_type: 'video',
        delivery_type: 'authenticated',
      }, setUploadProgress)
      setUploadProgress(100)

      const uploadedUrl = uploaded.url
      setUploadedFile(uploadedUrl)
      const durationMinutes = cloudinarySecondsToLessonMinutes(uploaded.duration)
      onUpdate({
        videoUrl: uploadedUrl,
        videoPublicId: uploaded.public_id,
        ...(durationMinutes != null ? { duration: formatLessonDurationInput(durationMinutes) } : {}),
      })
      await onSaveVideo?.({
        videoUrl: uploadedUrl,
        videoPublicId: uploaded.public_id,
        durationMinutes,
      })

      toast.success(t('lesson_editor.video_uploaded_success'))
    } catch (error) {
      console.error(error)
      toast.error(t('lesson_editor.upload_failed_retry'))
    } finally {
      setIsUploading(false)
      onUploadingChange?.(false)
      setTimeout(() => setUploadProgress(0), 900)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      toast.error(t('lesson_editor.upload_video_file_only'))
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error(t('lesson_editor.video_max_size'))
      return
    }
    await handleUpload(file)
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    onUpdate({ videoUrl: '', videoPublicId: '' })
    toast.success(t('lesson_editor.file_removed'))
  }

  if (contentType === 'video') {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>{t('lesson_editor.video_upload')}</Label>

          {!uploadedFile ? (
            <Card className="p-8 border-2 border-dashed">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Video className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">{t('lesson_editor.upload_video')}</h4>
                  <p className="text-sm text-muted-foreground">{t('lesson_editor.drag_drop')}</p>
                  <p className="text-xs text-muted-foreground">{t('lesson_editor.supported_video')}</p>
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
                    accept="video/*"
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
                    <AntProgress percent={uploadProgress} size="small" />
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
                      <h4 className="font-semibold">{t('lesson_editor.video_uploaded')}</h4>
                      <p className="text-sm text-muted-foreground truncate">{uploadedFile}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="text-destructive hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button variant="outline" size="sm" className="mt-3" onClick={() => window.open(uploadedFile, '_blank')}>
                    <Play className="h-3.5 w-3.5 mr-2" />
                    {t('lesson_editor.preview_video')}
                  </Button>
                </div>
              </div>
            </Card>
          )}
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
