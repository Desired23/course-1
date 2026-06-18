import { useState } from 'react'
import { Flag } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  createReport,
  REPORT_REASON_LABELS,
  type ReportTargetType,
  type ReportReason,
} from '../services/report.api'
import { uploadFiles } from '../services/upload.api'

const MAX_REPORT_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024
const ALLOWED_REPORT_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
])
const REPORT_ATTACHMENT_ACCEPT = Array.from(ALLOWED_REPORT_ATTACHMENT_MIME_TYPES).join(',')

function getReportFileValidationError(files: File[]): string | null {
  for (const file of files) {
    const mimeType = file.type || 'application/octet-stream'
    if (file.size > MAX_REPORT_ATTACHMENT_SIZE_BYTES) {
      return `"${file.name}" vượt quá giới hạn 25MB.`
    }
    if (!ALLOWED_REPORT_ATTACHMENT_MIME_TYPES.has(mimeType)) {
      return `"${file.name}" không đúng định dạng. Chỉ hỗ trợ ảnh, video, PDF, Word, Excel, PowerPoint, ZIP hoặc TXT.`
    }
  }
  return null
}

function getSubmitErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Gửi báo cáo thất bại. Vui lòng thử lại.'
}

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: ReportTargetType
  targetId: number
  contentLabel?: string
  lessonId?: number | null
  lessonTitle?: string | null
  timestampSeconds?: number | null
}

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  contentLabel,
  lessonId,
  lessonTitle,
  timestampSeconds,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setReason('')
    setDescription('')
    setFiles([])
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    const validationError = getReportFileValidationError(selectedFiles)
    if (validationError) {
      toast.error(validationError)
      setFiles([])
      event.target.value = ''
      return
    }
    setFiles(selectedFiles)
  }

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Vui lòng chọn lý do báo cáo.')
      return
    }

    const validationError = getReportFileValidationError(files)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoading(true)
    try {
      const uploaded = files.length > 0
        ? await uploadFiles(files, { folder: 'report-attachments', resource_type: 'auto' })
        : []
      await createReport({
        target_type: targetType,
        target_id: targetId,
        reason,
        description,
        attachments: uploaded,
        metadata: (lessonId || lessonTitle || timestampSeconds)
          ? {
              lesson_id: lessonId ?? undefined,
              lesson_title: lessonTitle ?? undefined,
              timestamp_seconds: timestampSeconds ?? undefined,
            }
          : undefined,
      })
      toast.success('Báo cáo đã được ghi nhận. Cảm ơn bạn!')
      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast.error(getSubmitErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" />
            Báo cáo nội dung
          </DialogTitle>
          {contentLabel && (
            <p className="text-sm text-muted-foreground truncate">{contentLabel}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Lý do báo cáo <span className="text-red-500">*</span></Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn lý do..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mô tả thêm (tuỳ chọn)</Label>
            <Textarea
              placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
          </div>

          <div className="space-y-2">
            <Label>Tệp đính kèm (tuỳ chọn)</Label>
            <Input
              type="file"
              multiple
              accept={REPORT_ATTACHMENT_ACCEPT}
              onChange={handleFileChange}
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">{files.length} tệp đã chọn</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !reason} variant="destructive">
            {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
