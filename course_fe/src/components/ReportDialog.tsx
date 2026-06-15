import { useState } from 'react'
import { Flag } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from './Router'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
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
  const { navigate } = useRouter()
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [description, setDescription] = useState('')
  const [infringingPart, setInfringingPart] = useState('')
  const [originalWorkUrl, setOriginalWorkUrl] = useState('')
  const [ownershipStatement, setOwnershipStatement] = useState('')
  const [evidenceUrls, setEvidenceUrls] = useState('')
  const [goodFaithConfirmed, setGoodFaithConfirmed] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setReason('')
    setDescription('')
    setInfringingPart('')
    setOriginalWorkUrl('')
    setOwnershipStatement('')
    setEvidenceUrls('')
    setGoodFaithConfirmed(false)
    setFiles([])
  }

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Vui lòng chọn lý do báo cáo.')
      return
    }
    if (reason === 'copyright' && !goodFaithConfirmed) {
      toast.error('Vui lòng xác nhận thông tin báo cáo bản quyền là trung thực.')
      return
    }

    setLoading(true)
    try {
      const uploaded = reason === 'copyright' && files.length > 0
        ? await uploadFiles(files, { folder: 'copyright-evidence', resource_type: 'auto' })
        : []
      const res = await createReport({
        target_type: targetType,
        target_id: targetId,
        reason,
        description,
        attachments: uploaded,
        metadata: reason === 'copyright'
          ? {
              infringing_part: infringingPart,
              original_work_url: originalWorkUrl,
              ownership_statement: ownershipStatement,
              evidence_urls: evidenceUrls.split('\n').map((item) => item.trim()).filter(Boolean),
              lesson_id: lessonId ?? undefined,
              lesson_title: lessonTitle ?? undefined,
              timestamp_seconds: timestampSeconds ?? undefined,
              good_faith_confirmed: goodFaithConfirmed,
            }
          : undefined,
      })

      if (reason === 'copyright' && res.case_id) {
        toast.success('Đã gửi báo cáo bản quyền.', {
          action: {
            label: 'Theo dõi báo cáo',
            onClick: () => navigate(`/reports/my/${res.case_id}`),
          },
        })
      } else {
        toast.success('Báo cáo đã được ghi nhận. Cảm ơn bạn!')
      }
      onOpenChange(false)
      resetForm()
    } catch {
      toast.error('Gửi báo cáo thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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

          {reason === 'copyright' && (
            <div className="space-y-4 rounded-md border p-4">
              <div className="space-y-2">
                <Label>Phần bị nghi vi phạm</Label>
                <Textarea
                  value={infringingPart}
                  onChange={(e) => setInfringingPart(e.target.value)}
                  rows={2}
                  placeholder="Ví dụ: video bài 3 từ phút 02:10, slide, tài liệu đính kèm..."
                />
              </div>
              <div className="space-y-2">
                <Label>Nguồn/tác phẩm gốc</Label>
                <Input
                  value={originalWorkUrl}
                  onChange={(e) => setOriginalWorkUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Quan hệ với chủ sở hữu</Label>
                <Textarea
                  value={ownershipStatement}
                  onChange={(e) => setOwnershipStatement(e.target.value)}
                  rows={2}
                  placeholder="Bạn là chủ sở hữu, đại diện, hoặc người phát hiện vi phạm..."
                />
              </div>
              <div className="space-y-2">
                <Label>Link bằng chứng</Label>
                <Textarea
                  value={evidenceUrls}
                  onChange={(e) => setEvidenceUrls(e.target.value)}
                  rows={3}
                  placeholder="Mỗi link một dòng"
                />
              </div>
              <div className="space-y-2">
                <Label>Tệp bằng chứng</Label>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
                {files.length > 0 && (
                  <p className="text-xs text-muted-foreground">{files.length} tệp đã chọn</p>
                )}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={goodFaithConfirmed}
                  onCheckedChange={(value) => setGoodFaithConfirmed(value === true)}
                />
                <span>Tôi xác nhận thông tin cung cấp là trung thực và có cơ sở thiện chí.</span>
              </label>
            </div>
          )}
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
