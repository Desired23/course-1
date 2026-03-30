import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, UploadCloud } from "lucide-react"
import { toast } from "sonner"

import { useRouter } from "../../components/Router"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
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
} from "../../services/application.api"
import { uploadFiles } from "../../services/upload.api"

type FormValues = Record<number, any>

function normalizeOptions(options: any): Array<{ value: string; label: string }> {
  if (!options) return []

  if (Array.isArray(options)) {
    return options
      .map((opt) => {
        if (typeof opt === "string") return { value: opt, label: opt }

        return {
          value: String(opt?.value ?? opt?.id ?? opt?.label ?? ""),
          label: String(opt?.label ?? opt?.name ?? opt?.value ?? ""),
        }
      })
      .filter((opt) => opt.value)
  }

  return []
}

export function InstructorOnboardingPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingQuestionId, setUploadingQuestionId] = useState<number | null>(null)

  const [form, setForm] = useState<RegistrationForm | null>(null)
  const [myLatestApplication, setMyLatestApplication] = useState<ApplicationListItem | null>(null)
  const [myLatestApplicationDetail, setMyLatestApplicationDetail] = useState<Application | null>(null)
  const [values, setValues] = useState<FormValues>({})

  const canEdit = !myLatestApplication || myLatestApplication.status === "changes_requested"

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)

      try {
        const [activeForm, myAppsRes] = await Promise.all([
          getActiveRegistrationForm("instructor_application"),
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
        toast.error(err?.message || t("instructor_onboarding_page.load_form_failed"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [t])

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
      if (!uploaded?.length) throw new Error(t("instructor_onboarding_page.upload_failed"))

      updateValue(question.id, uploaded[0].url)
      toast.success(t("instructor_onboarding_page.upload_success"))
    } catch (err: any) {
      toast.error(err?.message || t("instructor_onboarding_page.upload_failed"))
    } finally {
      setUploadingQuestionId(null)
    }
  }

  const validateForm = () => {
    for (const question of sortedQuestions) {
      if (!question.required) continue
      const val = values[question.id]

      if (question.type === "checkbox") {
        if (!Array.isArray(val) || val.length === 0) {
          toast.error(t("instructor_onboarding_page.answer_required", { label: question.label }))
          return false
        }
      } else if (val === undefined || val === null || String(val).trim() === "") {
        toast.error(t("instructor_onboarding_page.answer_required", { label: question.label }))
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!form || !validateForm()) return

    const payload = {
      form_id: form.id,
      responses: sortedQuestions.map((question) => ({
        question_id: question.id,
        value: values[question.id] ?? (question.type === "checkbox" ? [] : ""),
      })),
    }

    setSubmitting(true)
    try {
      if (myLatestApplication?.status === "changes_requested") {
        await resubmitApplication(myLatestApplication.id, payload)
        toast.success(t("instructor_onboarding_page.resubmit_success"))
      } else {
        await submitApplication(payload)
        toast.success(t("instructor_onboarding_page.submit_success"))
      }
      navigate("/instructor")
    } catch (err: any) {
      toast.error(err?.message || t("instructor_onboarding_page.submit_failed"))
    } finally {
      setSubmitting(false)
    }
  }

  const renderQuestion = (question: RegistrationFormQuestion) => {
    const value = values[question.id]
    const options = normalizeOptions(question.options)

    if (question.type === "textarea") {
      return (
        <Textarea
          value={value ?? ""}
          onChange={(e) => updateValue(question.id, e.target.value)}
          placeholder={question.placeholder || ""}
          rows={5}
          disabled={!canEdit}
        />
      )
    }

    if (question.type === "number") {
      return (
        <Input
          type="number"
          value={value ?? ""}
          onChange={(e) => updateValue(question.id, e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={question.placeholder || ""}
          disabled={!canEdit}
        />
      )
    }

    if (question.type === "select") {
      return (
        <select
          className="h-10 w-full rounded-md border px-3 text-sm"
          value={value ?? ""}
          onChange={(e) => updateValue(question.id, e.target.value)}
          disabled={!canEdit}
        >
          <option value="">{t("instructor_onboarding_page.select_placeholder")}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }

    if (question.type === "radio") {
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`q-${question.id}`}
                value={opt.value}
                checked={String(value ?? "") === opt.value}
                onChange={(e) => updateValue(question.id, e.target.value)}
                disabled={!canEdit}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )
    }

    if (question.type === "checkbox") {
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

    if (question.type === "file") {
      return (
        <div className="space-y-2">
          {typeof value === "string" && value && (
            <a href={value} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
              {t("instructor_onboarding_page.view_uploaded_file")}
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
        type={question.type === "url" ? "url" : "text"}
        value={value ?? ""}
        onChange={(e) => updateValue(question.id, e.target.value)}
        placeholder={question.placeholder || ""}
        disabled={!canEdit}
      />
    )
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!form) {
    return <div className="p-6 text-center text-muted-foreground">{t("instructor_onboarding_page.no_active_form")}</div>
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>{form.title}</CardTitle>
          <CardDescription>{form.description || t("instructor_onboarding_page.default_description")}</CardDescription>
          {myLatestApplication && (
            <div className="pt-2">
              <Badge variant="outline">
                {t("instructor_onboarding_page.current_status", { status: getApplicationStatusLabel(myLatestApplication.status) })}
              </Badge>
              {myLatestApplicationDetail?.admin_notes && (
                <p className="text-sm mt-2 text-muted-foreground">
                  {t("instructor_onboarding_page.admin_notes", { notes: myLatestApplicationDetail.admin_notes })}
                </p>
              )}
              {myLatestApplicationDetail?.rejection_reason && (
                <p className="text-sm mt-1 text-red-600">
                  {t("instructor_onboarding_page.rejection_reason", { reason: myLatestApplicationDetail.rejection_reason })}
                </p>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {!canEdit ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              {t("instructor_onboarding_page.cannot_edit_notice", {
                status: getApplicationStatusLabel(myLatestApplication!.status),
              })}
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
                  {myLatestApplication?.status === "changes_requested"
                    ? t("instructor_onboarding_page.resubmit")
                    : t("instructor_onboarding_page.submit")}
                </Button>
                <Button variant="outline" onClick={() => navigate("/instructor")} disabled={submitting}>
                  {t("instructor_onboarding_page.cancel")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
        <UploadCloud className="h-3.5 w-3.5" />
        {t("instructor_onboarding_page.file_upload_note")}
      </p>
    </div>
  )
}
