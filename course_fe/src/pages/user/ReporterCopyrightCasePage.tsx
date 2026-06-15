import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Upload, AlertTriangle } from 'lucide-react'
import { useRouter } from '../../components/Router'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Input } from '../../components/ui/input'
import {
  getReporterCopyrightCase,
  submitReporterCopyrightEvidence,
  type CopyrightCase,
} from '../../services/report.api'
import { uploadFiles } from '../../services/upload.api'
import { getErrorMessage } from '../../lib/apiError'

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : '-'
}

export function ReporterCopyrightCasePage() {
  const { params } = useRouter()
  const caseId = Number(params.caseId)
  const [data, setData] = useState<CopyrightCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [evidenceUrls, setEvidenceUrls] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const load = async () => {
    setLoading(true)
    try {
      setData(await getReporterCopyrightCase(caseId))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải báo cáo bản quyền.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (caseId) void load()
  }, [caseId])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const uploaded = files.length > 0
        ? await uploadFiles(files, { folder: 'copyright-evidence', resource_type: 'auto' })
        : []
      const updated = await submitReporterCopyrightEvidence(caseId, {
        message,
        attachments: uploaded,
        metadata: {
          evidence_urls: evidenceUrls.split('\n').map((item) => item.trim()).filter(Boolean),
        },
      })
      setData(updated)
      setMessage('')
      setEvidenceUrls('')
      setFiles([])
      toast.success('Đã gửi bổ sung chứng cứ.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể gửi bổ sung chứng cứ.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>
  }

  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">Không tìm thấy báo cáo.</div>
  }

  const canSubmitEvidence = data.status === 'needs_reporter_info' || data.status === 'under_review'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Theo dõi báo cáo bản quyền</h1>
        <p className="text-muted-foreground">{data.title}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">Case #{data.id}</CardTitle>
            <Badge variant="secondary">{data.status}</Badge>
            <Badge variant="outline">{data.severity}</Badge>
            {data.is_reporter_deadline_overdue && <Badge variant="destructive">Quá hạn</Badge>}
          </div>
          <CardDescription>
            Hạn bổ sung: {formatDate(data.reporter_deadline_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div><span className="text-muted-foreground">Khóa học:</span> {data.course_title || '-'}</div>
          <div><span className="text-muted-foreground">Bài học:</span> {data.lesson_title || '-'}</div>
          <div><span className="text-muted-foreground">Giảng viên:</span> {data.instructor_name || '-'}</div>
          <div><span className="text-muted-foreground">Cập nhật:</span> {formatDate(data.updated_at)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data.messages || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có cập nhật.</p>
          ) : data.messages?.map((item) => (
            <div key={item.id} className="rounded-md border p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{item.actor_role}</Badge>
                <span className="font-medium">{item.response_type || 'message'}</span>
                <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
              </div>
              {item.message && <p className="whitespace-pre-wrap">{item.message}</p>}
              {item.attachments?.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">{item.attachments.length} tệp đính kèm</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {canSubmitEvidence && (
        <Card>
          <CardHeader>
            <CardTitle>Bổ sung chứng cứ</CardTitle>
            <CardDescription>Gửi thêm thông tin khi admin yêu cầu hoặc khi bạn có bằng chứng mới.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.status === 'needs_reporter_info' && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <span>Admin đang yêu cầu bổ sung thông tin cho báo cáo này.</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nội dung bổ sung</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
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
              <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </div>
            <Button onClick={handleSubmit} disabled={submitting || (!message.trim() && files.length === 0 && !evidenceUrls.trim())}>
              <Upload className="mr-2 h-4 w-4" />
              {submitting ? 'Đang gửi...' : 'Gửi bổ sung'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
