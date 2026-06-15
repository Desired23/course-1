import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '../../components/Router'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import {
  getInstructorCopyrightCase,
  submitInstructorCopyrightFix,
  submitInstructorCopyrightResponse,
  type CopyrightCase,
} from '../../services/report.api'
import { uploadFiles } from '../../services/upload.api'
import { getErrorMessage } from '../../lib/apiError'

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : '-'
}

export function InstructorReportDetailPage() {
  const { params, navigate } = useRouter()
  const caseId = Number(params.caseId)
  const [data, setData] = useState<CopyrightCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [responseType, setResponseType] = useState<'dispute' | 'accept_and_fix' | 'request_clarification'>('dispute')
  const [message, setMessage] = useState('')
  const [licenseUrl, setLicenseUrl] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fixMessage, setFixMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      setData(await getInstructorCopyrightCase(caseId))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải case bản quyền.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (caseId) void load()
  }, [caseId])

  const handleSubmitResponse = async () => {
    setSubmitting(true)
    try {
      const uploaded = files.length > 0
        ? await uploadFiles(files, { folder: 'copyright-instructor-evidence', resource_type: 'auto' })
        : []
      const updated = await submitInstructorCopyrightResponse(caseId, {
        response_type: responseType,
        message,
        attachments: uploaded,
        metadata: { license_url: licenseUrl || undefined },
      })
      setData(updated)
      setMessage('')
      setLicenseUrl('')
      setFiles([])
      toast.success('Đã gửi phản hồi.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể gửi phản hồi.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitFix = async () => {
    setSubmitting(true)
    try {
      const updated = await submitInstructorCopyrightFix(caseId, { message: fixMessage })
      setData(updated)
      setFixMessage('')
      toast.success('Đã báo admin rằng bạn đã sửa xong.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể gửi trạng thái đã sửa.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>
  }

  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">Không tìm thấy case.</div>
  }

  const canRespond = data.status === 'awaiting_instructor_response'
  const canSubmitFix = data.status === 'awaiting_instructor_fix'

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phản hồi tố cáo bản quyền</h1>
          <p className="text-muted-foreground">{data.title}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/instructor/reports')}>Danh sách case</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">Case #{data.id}</CardTitle>
            <Badge variant={canRespond ? 'destructive' : 'secondary'}>{data.status}</Badge>
            <Badge variant="outline">{data.severity}</Badge>
            {data.is_instructor_deadline_overdue && <Badge variant="destructive">Quá hạn</Badge>}
          </div>
          <CardDescription>Hạn phản hồi: {formatDate(data.instructor_deadline_at)}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div><span className="text-muted-foreground">Khóa học:</span> {data.course_title || '-'}</div>
          <div><span className="text-muted-foreground">Bài học:</span> {data.lesson_title || '-'}</div>
          <div><span className="text-muted-foreground">Action tạm thời:</span> {data.content_action}</div>
          <div><span className="text-muted-foreground">Earning/payout:</span> {data.financial_action}</div>
          <div><span className="text-muted-foreground">Số tiền đang hold:</span> {Number(data.held_amount || 0).toLocaleString('vi-VN')} VND</div>
        </CardContent>
      </Card>

      {(data.content_action !== 'none' || data.financial_action !== 'none') && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>Case này có action tạm thời. Vui lòng phản hồi đúng hạn để admin xem xét restore/release.</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timeline và bằng chứng được chia sẻ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data.messages || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Admin chưa chia sẻ bằng chứng trong case này.</p>
          ) : data.messages?.map((item) => (
            <div key={item.id} className="rounded-md border p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{item.actor_role}</Badge>
                <span className="font-medium">{item.response_type || 'message'}</span>
                <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
              </div>
              {item.message && <p className="whitespace-pre-wrap">{item.message}</p>}
              {Array.isArray(item.metadata?.evidence_urls) && item.metadata.evidence_urls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {item.metadata.evidence_urls.map((url: string) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <ExternalLink className="h-3 w-3" />
                      {url}
                    </a>
                  ))}
                </div>
              )}
              {item.attachments?.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">{item.attachments.length} tệp đính kèm</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {canRespond && (
        <Card>
          <CardHeader>
            <CardTitle>Gửi phản hồi</CardTitle>
            <CardDescription>Cung cấp license/chứng cứ hoặc yêu cầu admin làm rõ thêm.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Loại phản hồi</Label>
              <Select value={responseType} onValueChange={(value) => setResponseType(value as typeof responseType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dispute">Tôi có quyền sử dụng nội dung này</SelectItem>
                  <SelectItem value="accept_and_fix">Tôi đồng ý sửa/gỡ</SelectItem>
                  <SelectItem value="request_clarification">Tôi cần thêm thông tin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nội dung phản hồi</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Link license/nguồn được cấp phép</Label>
              <Input value={licenseUrl} onChange={(e) => setLicenseUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Tệp license/chứng cứ</Label>
              <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </div>
            <Button onClick={handleSubmitResponse} disabled={submitting || !message.trim()}>
              <Upload className="mr-2 h-4 w-4" />
              {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
            </Button>
          </CardContent>
        </Card>
      )}

      {canSubmitFix && (
        <Card>
          <CardHeader>
            <CardTitle>Đã sửa/gỡ nội dung</CardTitle>
            <CardDescription>Sửa course/lesson ở trang edit hiện có, sau đó báo admin kiểm tra lại.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {data.lesson ? (
                <Button variant="outline" onClick={() => navigate(`/instructor/lessons/${data.lesson}/edit`)}>
                  Mở bài học để sửa
                </Button>
              ) : data.course ? (
                <Button variant="outline" onClick={() => navigate(`/instructor/course-landing/${data.course}`)}>
                  Mở khóa học để sửa
                </Button>
              ) : null}
            </div>
            <Textarea
              value={fixMessage}
              onChange={(e) => setFixMessage(e.target.value)}
              rows={3}
              placeholder="Mô tả phần đã sửa/gỡ..."
            />
            <Button onClick={handleSubmitFix} disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Đã sửa xong'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
