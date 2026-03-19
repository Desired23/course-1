import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { useRouter } from '../../components/Router'
import {
  getActiveRegistrationForm,
  getApplicationStatusLabel,
  getMyApplicationDetail,
  getMyApplications,
  resubmitApplication,
  submitApplication,
  type Application,
  type ApplicationListItem,
  type RegistrationForm,
  type RegistrationFormQuestion,
} from '../../services/application.api'
import { uploadFiles } from '../../services/upload.api'
import { Loader2, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'

type FormValues = Record<number, any>

function normalizeOptions(options: any): Array<{ value: string; label: string }> {
  if (!options) return []
  if (Array.isArray(options)) {
    return options.map((opt) => {
      if (typeof opt === 'string') return { value: opt, label: opt }
      return {
        value: String(opt?.value ?? opt?.id ?? opt?.label ?? ''),
        label: String(opt?.label ?? opt?.name ?? opt?.value ?? ''),
      }
    }).filter((opt) => opt.value)
  }
  return []
}

export function InstructorOnboardingPage() {
  const { navigate } = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingQuestionId, setUploadingQuestionId] = useState<number | null>(null)

  const [form, setForm] = useState<RegistrationForm | null>(null)
  const [myLatestApplication, setMyLatestApplication] = useState<ApplicationListItem | null>(null)
  const [myLatestApplicationDetail, setMyLatestApplicationDetail] = useState<Application | null>(null)

  const [values, setValues] = useState<FormValues>({})

  const canEdit = !myLatestApplication || myLatestApplication.status === 'changes_requested'

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      setLoading(true)
      try {
        const [activeForm, myAppsRes] = await Promise.all([
          getActiveRegistrationForm('instructor_application'),
          getMyApplications({ page: 1, page_size: 20 }),
        ])

        if (cancelled) return

        const latest = myAppsRes.results[0] || null
        setForm(activeForm)
        setMyLatestApplication(latest)

        if (latest) {
          const detail = await getMyApplicationDetail(latest.id)
          if (cancelled) return
          setMyLatestApplicationDetail(detail)

          const initialValues: FormValues = {}
          detail.responses.forEach((resp) => {
            if (resp.question_detail?.id) {
              initialValues[resp.question_detail.id] = resp.value
            }
          })
          setValues(initialValues)
        }
      } catch (err: any) {
        toast.error(err?.message || 'Không thể tải biểu mẫu đăng ký')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  const sortedQuestions = useMemo(() => {
    if (!form?.questions) return []
    return [...form.questions].sort((a, b) => a.order - b.order)
  }, [form])

  const updateValue = (questionId: number, value: any) => {
    setValues((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleFileUpload = async (question: RegistrationFormQuestion, file: File | null) => {
    if (!file) return
    setUploadingQuestionId(question.id)
    try {
      const uploaded = await uploadFiles([file])
      if (!uploaded?.length) throw new Error('Upload thất bại')
      updateValue(question.id, uploaded[0].url)
      toast.success('Tải file thành công')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải file lên')
    } finally {
      setUploadingQuestionId(null)
    }
  }

  const validateForm = () => {
    for (const question of sortedQuestions) {
      if (!question.required) continue
      const val = values[question.id]
      if (question.type === 'checkbox') {
        if (!Array.isArray(val) || val.length === 0) {
          toast.error(`Vui lòng trả lời: ${question.label}`)
          return false
        }
      } else if (val === undefined || val === null || String(val).trim() === '') {
        toast.error(`Vui lòng trả lời: ${question.label}`)
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!form) return
    if (!validateForm()) return

    const payload = {
      form_id: form.id,
      responses: sortedQuestions.map((question) => ({
        question_id: question.id,
        value: values[question.id] ?? (question.type === 'checkbox' ? [] : ''),
      })),
    }

    setSubmitting(true)
    try {
      if (myLatestApplication?.status === 'changes_requested') {
        await resubmitApplication(myLatestApplication.id, payload)
        toast.success('Đã gửi lại hồ sơ thành công')
      } else {
        await submitApplication(payload)
        toast.success('Đăng ký thành công, vui lòng chờ xét duyệt')
      }
      navigate('/instructor')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gửi hồ sơ')
    } finally {
      setSubmitting(false)
    }
  }

  const renderQuestion = (question: RegistrationFormQuestion) => {
    const value = values[question.id]
    const options = normalizeOptions(question.options)

    if (question.type === 'textarea') {
      return (
        <Textarea
          value={value ?? ''}
          onChange={(e) => updateValue(question.id, e.target.value)}
          placeholder={question.placeholder || ''}
          rows={5}
          disabled={!canEdit}
        />
      )
    }

    if (question.type === 'number') {
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => updateValue(question.id, e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={question.placeholder || ''}
          disabled={!canEdit}
        />
      )
    }

    if (question.type === 'select') {
      return (
        <select
          className="h-10 w-full rounded-md border px-3 text-sm"
          value={value ?? ''}
          onChange={(e) => updateValue(question.id, e.target.value)}
          disabled={!canEdit}
        >
          <option value="">Chọn</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    }

    if (question.type === 'radio') {
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`q-${question.id}`}
                value={opt.value}
                checked={String(value ?? '') === opt.value}
                onChange={(e) => updateValue(question.id, e.target.value)}
                disabled={!canEdit}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )
    }

    if (question.type === 'checkbox') {
      const checkedValues = Array.isArray(value) ? value : []
      return (
        <div className="space-y-2">
          {options.map((opt) => {
            const checked = checkedValues.includes(opt.value)
            return (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) updateValue(question.id, [...checkedValues, opt.value])
                    else updateValue(question.id, checkedValues.filter((v: string) => v !== opt.value))
                  }}
                  disabled={!canEdit}
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      )
    }

    if (question.type === 'file') {
      return (
        <div className="space-y-2">
          {typeof value === 'string' && value && (
            <a href={value} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
              Xem file đã tải
            </a>
          )}
          <div className="flex items-center gap-3">
            <Input
              type="file"
              disabled={!canEdit || uploadingQuestionId === question.id}
              onChange={(e) => handleFileUpload(question, e.target.files?.[0] || null)}
            />
            {uploadingQuestionId === question.id && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </div>
      )
    }

    return (
      <Input
        type={question.type === 'url' ? 'url' : 'text'}
        value={value ?? ''}
        onChange={(e) => updateValue(question.id, e.target.value)}
        placeholder={question.placeholder || ''}
        disabled={!canEdit}
      />
    )
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  if (!form) {
    return <div className="p-6 text-center text-muted-foreground">Không tìm thấy form đăng ký giảng viên đang hoạt động.</div>
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>{form.title}</CardTitle>
          <CardDescription>{form.description || 'Hoàn thành biểu mẫu để đăng ký trở thành giảng viên.'}</CardDescription>
          {myLatestApplication && (
            <div className="pt-2">
              <Badge variant="outline">Trạng thái hiện tại: {getApplicationStatusLabel(myLatestApplication.status)}</Badge>
              {myLatestApplicationDetail?.admin_notes && (
                <p className="text-sm mt-2 text-muted-foreground">Ghi chú admin: {myLatestApplicationDetail.admin_notes}</p>
              )}
              {myLatestApplicationDetail?.rejection_reason && (
                <p className="text-sm mt-1 text-red-600">Lý do từ chối: {myLatestApplicationDetail.rejection_reason}</p>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {!canEdit ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              Bạn đã có hồ sơ ở trạng thái <strong>{getApplicationStatusLabel(myLatestApplication!.status)}</strong>. Không thể chỉnh sửa lúc này.
            </div>
          ) : (
            <>
              {sortedQuestions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label>
                    {question.label} {question.required && <span className="text-red-500">*</span>}
                  </Label>
                  {question.help_text && <p className="text-xs text-muted-foreground">{question.help_text}</p>}
                  {renderQuestion(question)}
                </div>
              ))}

              <div className="pt-4 flex items-center gap-3">
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {myLatestApplication?.status === 'changes_requested' ? 'Gửi lại hồ sơ' : 'Gửi đăng ký'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/instructor')} disabled={submitting}>Hủy</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
        <UploadCloud className="h-3.5 w-3.5" />
        Trường file sẽ được tải lên cloud trước khi gửi đơn.
      </p>
    </div>
  )
}
