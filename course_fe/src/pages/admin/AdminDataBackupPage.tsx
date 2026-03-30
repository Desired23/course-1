import { useMemo, useRef, useState, type ChangeEvent } from "react"
import { Download, FileUp, Loader2, RefreshCw, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { AdminConfirmDialog } from "../../components/admin/AdminConfirmDialog"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Checkbox } from "../../components/ui/checkbox"
import { Separator } from "../../components/ui/separator"
import { useAuth } from "../../contexts/AuthContext"
import {
  createSubscriptionPlan,
  createSystemSetting,
  getAdminSubscriptionPlans,
  getSystemSettings,
  managePlanCourses,
  type SystemSetting,
  updateSubscriptionPlan,
  updateSystemSetting,
} from "../../services/admin.api"
import { createCategory, getAllCategories, updateCategory, type Category } from "../../services/category.api"
import { getPaymentAdminConfig, updatePaymentAdminConfig, type PaymentAdminConfigKey } from "../../services/payment.api"
import { createPromotion, getPromotions, updatePromotion, type Promotion } from "../../services/promotions.api"

type BackupModule =
  | "system_settings"
  | "payment_config"
  | "categories"
  | "discounts"
  | "subscription_plans"

interface BackupPackage {
  version: 1
  created_at: string
  created_by: {
    id: string
    name: string
    email: string
  } | null
  modules: BackupModule[]
  resources: Partial<Record<BackupModule, any>>
}

interface RestoreSummary {
  module: BackupModule
  created: number
  updated: number
  failed: number
  notes: string[]
}

const BACKUP_MODULE_KEYS: BackupModule[] = [
  "system_settings",
  "payment_config",
  "categories",
  "discounts",
  "subscription_plans",
]

const PAYMENT_CONFIG_KEYS: PaymentAdminConfigKey[] = ["policies", "instructor-rates", "discounts"]

function pickCategoryPayload(category: Category) {
  return {
    source_id: category.id,
    name: category.name,
    description: category.description,
    icon: category.icon,
    parent_category: category.parent_category,
    status: category.status,
  }
}

function pickPromotionPayload(promotion: Promotion) {
  return {
    code: promotion.code,
    description: promotion.description,
    discount_type: promotion.discount_type,
    discount_value: Number(promotion.discount_value),
    start_date: promotion.start_date,
    end_date: promotion.end_date,
    usage_limit: promotion.usage_limit ?? undefined,
    min_purchase: Number(promotion.min_purchase || 0),
    max_discount: promotion.max_discount ? Number(promotion.max_discount) : undefined,
    applicable_courses: promotion.applicable_courses,
    applicable_categories: promotion.applicable_categories,
    status: promotion.status,
  }
}

function pickPlanPayload(plan: any, planCourses: any[]) {
  return {
    name: plan.name,
    description: plan.description,
    price: Number(plan.price),
    discount_price: plan.discount_price ? Number(plan.discount_price) : undefined,
    duration_type: plan.duration_type,
    duration_days: plan.duration_days,
    status: plan.status,
    is_featured: plan.is_featured,
    max_subscribers: plan.max_subscribers,
    instructor_share_percent: Number(plan.instructor_share_percent || 0),
    yearly_discount_percent: Number(plan.yearly_discount_percent || 0),
    thumbnail: plan.thumbnail,
    features: plan.features || [],
    not_included: plan.not_included || [],
    badge_text: plan.badge_text,
    icon: plan.icon,
    highlight_color: plan.highlight_color,
    plan_courses: planCourses.map((course) => ({
      course_id: course.course,
      added_reason: course.added_reason || "Restored from admin backup",
    })),
  }
}

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

export function AdminDataBackupPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const moduleOptions = useMemo(
    () =>
      BACKUP_MODULE_KEYS.map((key) => ({
        key,
        title: t(`admin_data_backup.modules.${key}.title`),
        description: t(`admin_data_backup.modules.${key}.description`),
      })),
    [t],
  )

  const [selectedModules, setSelectedModules] = useState<BackupModule[]>(BACKUP_MODULE_KEYS)
  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [parsedBackup, setParsedBackup] = useState<BackupPackage | null>(null)
  const [restoreModules, setRestoreModules] = useState<BackupModule[]>([])
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false)
  const [restoreSummaries, setRestoreSummaries] = useState<RestoreSummary[]>([])

  const parsedModuleOptions = useMemo(
    () => moduleOptions.filter((module) => parsedBackup?.modules.includes(module.key)),
    [moduleOptions, parsedBackup],
  )

  const getModuleTitle = (module: BackupModule) => t(`admin_data_backup.modules.${module}.title`)

  const toggleSelection = (module: BackupModule, checked: boolean) => {
    setSelectedModules((prev) => {
      if (checked) return Array.from(new Set([...prev, module]))
      return prev.filter((item) => item !== module)
    })
  }

  const toggleRestoreSelection = (module: BackupModule, checked: boolean) => {
    setRestoreModules((prev) => {
      if (checked) return Array.from(new Set([...prev, module]))
      return prev.filter((item) => item !== module)
    })
  }

  const buildExportPayload = async (): Promise<BackupPackage> => {
    const resources: BackupPackage["resources"] = {}

    if (selectedModules.includes("system_settings")) {
      resources.system_settings = await getSystemSettings()
    }

    if (selectedModules.includes("payment_config")) {
      const configs = await Promise.all(
        PAYMENT_CONFIG_KEYS.map(async (configKey) => {
          const response = await getPaymentAdminConfig(configKey)
          return [configKey, response.value] as const
        }),
      )
      resources.payment_config = Object.fromEntries(configs)
    }

    if (selectedModules.includes("categories")) {
      const response = await getAllCategories({ page: 1, page_size: 500 })
      resources.categories = response.results.map(pickCategoryPayload)
    }

    if (selectedModules.includes("discounts")) {
      const promotions = await getPromotions()
      resources.discounts = promotions.map(pickPromotionPayload)
    }

    if (selectedModules.includes("subscription_plans")) {
      const plans = await getAdminSubscriptionPlans()
      const plansWithCourses = await Promise.all(
        plans.map(async (plan) => {
          const planCourses = await managePlanCourses(plan.id)
          return pickPlanPayload(plan, Array.isArray(planCourses) ? planCourses : [])
        }),
      )
      resources.subscription_plans = plansWithCourses
    }

    return {
      version: 1,
      created_at: new Date().toISOString(),
      created_by: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
          }
        : null,
      modules: selectedModules,
      resources,
    }
  }

  const handleExport = async () => {
    if (selectedModules.length === 0) {
      toast.error(t("admin_data_backup.toasts.select_export_module"))
      return
    }

    try {
      setIsExporting(true)
      const payload = await buildExportPayload()
      downloadJsonFile(`admin-backup-${new Date().toISOString().slice(0, 10)}.json`, payload)
      toast.success(t("admin_data_backup.toasts.export_success"))
    } catch (error) {
      console.error(error)
      toast.error(t("admin_data_backup.toasts.export_failed"))
    } finally {
      setIsExporting(false)
    }
  }

  const handleChooseFile = () => {
    inputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as BackupPackage
      if (parsed.version !== 1 || !Array.isArray(parsed.modules) || !parsed.resources) {
        throw new Error("Unsupported backup file")
      }
      setParsedBackup(parsed)
      setRestoreModules(parsed.modules)
      setRestoreSummaries([])
      toast.success(t("admin_data_backup.toasts.file_loaded"))
    } catch (error) {
      console.error(error)
      setParsedBackup(null)
      setRestoreModules([])
      toast.error(t("admin_data_backup.toasts.invalid_file"))
    }
  }

  const restoreSystemSettings = async (settings: SystemSetting[]): Promise<RestoreSummary> => {
    const existing = await getSystemSettings()
    const existingByKey = new Map(existing.map((item) => [item.key, item]))
    const summary: RestoreSummary = { module: "system_settings", created: 0, updated: 0, failed: 0, notes: [] }

    for (const setting of settings) {
      try {
        const payload = {
          key: setting.key,
          value: setting.value,
          description: setting.description || "",
        }
        const current = existingByKey.get(setting.key)
        if (current) {
          await updateSystemSetting(current.id, payload)
          summary.updated += 1
        } else {
          await createSystemSetting(payload)
          summary.created += 1
        }
      } catch (error) {
        console.error(error)
        summary.failed += 1
        summary.notes.push(t("admin_data_backup.notes.restore_setting_failed", { key: setting.key }))
      }
    }

    return summary
  }

  const restorePaymentConfig = async (
    configs: Partial<Record<PaymentAdminConfigKey, any>>,
  ): Promise<RestoreSummary> => {
    const summary: RestoreSummary = { module: "payment_config", created: 0, updated: 0, failed: 0, notes: [] }

    for (const key of PAYMENT_CONFIG_KEYS) {
      if (!(key in configs)) continue
      try {
        await updatePaymentAdminConfig(key, configs[key])
        summary.updated += 1
      } catch (error) {
        console.error(error)
        summary.failed += 1
        summary.notes.push(t("admin_data_backup.notes.restore_payment_config_failed", { key }))
      }
    }

    return summary
  }

  const restoreCategories = async (
    categories: Array<ReturnType<typeof pickCategoryPayload>>,
  ): Promise<RestoreSummary> => {
    const existingResponse = await getAllCategories({ page: 1, page_size: 500 })
    const existing = existingResponse.results
    const sourceToTarget = new Map<number, number>()
    const summary: RestoreSummary = { module: "categories", created: 0, updated: 0, failed: 0, notes: [] }
    const queue = [...categories].sort(
      (left, right) => Number(Boolean(left.parent_category)) - Number(Boolean(right.parent_category)),
    )

    for (const category of queue) {
      try {
        const targetParentId = category.parent_category
          ? sourceToTarget.get(category.parent_category) ?? null
          : null
        const matched = existing.find(
          (item) => item.name === category.name && (item.parent_category ?? null) === targetParentId,
        )
        const payload = {
          name: category.name,
          description: category.description || "",
          icon: category.icon || null,
          parent_category: targetParentId,
          status: category.status,
        }
        if (matched) {
          const updated = await updateCategory(matched.id, payload)
          sourceToTarget.set(category.source_id, updated.id)
          summary.updated += 1
        } else {
          const created = await createCategory(payload)
          existing.push(created)
          sourceToTarget.set(category.source_id, created.id)
          summary.created += 1
        }
      } catch (error) {
        console.error(error)
        summary.failed += 1
        summary.notes.push(t("admin_data_backup.notes.restore_category_failed", { name: category.name }))
      }
    }

    return summary
  }

  const restoreDiscounts = async (
    promotions: Array<ReturnType<typeof pickPromotionPayload>>,
  ): Promise<RestoreSummary> => {
    const existing = await getPromotions()
    const summary: RestoreSummary = { module: "discounts", created: 0, updated: 0, failed: 0, notes: [] }

    for (const promotion of promotions) {
      try {
        const matched = existing.find((item) => item.code === promotion.code)
        if (matched) {
          await updatePromotion(matched.id, promotion)
          summary.updated += 1
        } else {
          await createPromotion(promotion)
          summary.created += 1
        }
      } catch (error) {
        console.error(error)
        summary.failed += 1
        summary.notes.push(t("admin_data_backup.notes.restore_discount_failed", { code: promotion.code }))
      }
    }

    return summary
  }

  const restoreSubscriptionPlans = async (
    plans: Array<ReturnType<typeof pickPlanPayload>>,
  ): Promise<RestoreSummary> => {
    const existing = await getAdminSubscriptionPlans()
    const summary: RestoreSummary = { module: "subscription_plans", created: 0, updated: 0, failed: 0, notes: [] }

    for (const plan of plans) {
      try {
        const matched = existing.find(
          (item) => item.name === plan.name && item.duration_type === plan.duration_type,
        )
        const { plan_courses: planCourses, ...payload } = plan
        const restoredPlan = matched
          ? await updateSubscriptionPlan(matched.id, payload)
          : await createSubscriptionPlan(payload)

        if (matched) summary.updated += 1
        else summary.created += 1

        for (const planCourse of planCourses) {
          try {
            await managePlanCourses(restoredPlan.id, {
              course_id: planCourse.course_id,
              added_reason: planCourse.added_reason,
            })
          } catch (courseError) {
            console.error(courseError)
            summary.notes.push(
              t("admin_data_backup.notes.attach_course_failed", {
                name: plan.name,
                courseId: planCourse.course_id,
              }),
            )
          }
        }
      } catch (error) {
        console.error(error)
        summary.failed += 1
        summary.notes.push(t("admin_data_backup.notes.restore_plan_failed", { name: plan.name }))
      }
    }

    return summary
  }

  const handleRestore = async () => {
    if (!parsedBackup || restoreModules.length === 0) {
      toast.error(t("admin_data_backup.toasts.select_restore_module"))
      return
    }

    try {
      setIsRestoring(true)
      const summaries: RestoreSummary[] = []

      if (restoreModules.includes("system_settings") && parsedBackup.resources.system_settings) {
        summaries.push(await restoreSystemSettings(parsedBackup.resources.system_settings))
      }
      if (restoreModules.includes("payment_config") && parsedBackup.resources.payment_config) {
        summaries.push(await restorePaymentConfig(parsedBackup.resources.payment_config))
      }
      if (restoreModules.includes("categories") && parsedBackup.resources.categories) {
        summaries.push(await restoreCategories(parsedBackup.resources.categories))
      }
      if (restoreModules.includes("discounts") && parsedBackup.resources.discounts) {
        summaries.push(await restoreDiscounts(parsedBackup.resources.discounts))
      }
      if (
        restoreModules.includes("subscription_plans") &&
        parsedBackup.resources.subscription_plans
      ) {
        summaries.push(await restoreSubscriptionPlans(parsedBackup.resources.subscription_plans))
      }

      setRestoreSummaries(summaries)
      setConfirmRestoreOpen(false)
      toast.success(t("admin_data_backup.toasts.restore_success"))
    } catch (error) {
      console.error(error)
      toast.error(t("admin_data_backup.toasts.restore_failed"))
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{t("admin_data_backup.title")}</h1>
          <p className="text-muted-foreground">{t("admin_data_backup.subtitle")}</p>
        </div>
        <Badge variant="secondary">{t("admin_data_backup.badge")}</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin_data_backup.export.title")}</CardTitle>
            <CardDescription>{t("admin_data_backup.export.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {moduleOptions.map((module) => {
              const checked = selectedModules.includes(module.key)
              return (
                <label
                  key={module.key}
                  className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleSelection(module.key, Boolean(value))}
                  />
                  <div className="space-y-1">
                    <div className="font-medium">{module.title}</div>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </div>
                </label>
              )
            })}
            <Separator />
            <Button onClick={() => void handleExport()} disabled={isExporting} className="gap-2">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t("admin_data_backup.export.button")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin_data_backup.import.title")}</CardTitle>
            <CardDescription>{t("admin_data_backup.import.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={handleChooseFile} className="gap-2">
              <FileUp className="h-4 w-4" />
              {t("admin_data_backup.import.choose_file")}
            </Button>

            {parsedBackup ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">v{parsedBackup.version}</Badge>
                  <span>
                    {t("admin_data_backup.import.created_at", {
                      date: new Date(parsedBackup.created_at).toLocaleString(),
                    })}
                  </span>
                  {parsedBackup.created_by && (
                    <span>
                      {t("admin_data_backup.import.created_by", {
                        name: parsedBackup.created_by.name,
                      })}
                    </span>
                  )}
                </div>

                {parsedModuleOptions.map((module) => (
                  <label
                    key={module.key}
                    className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={restoreModules.includes(module.key)}
                      onCheckedChange={(value) => toggleRestoreSelection(module.key, Boolean(value))}
                    />
                    <div className="space-y-1">
                      <div className="font-medium">{module.title}</div>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </div>
                  </label>
                ))}

                <Button
                  onClick={() => setConfirmRestoreOpen(true)}
                  disabled={isRestoring || restoreModules.length === 0}
                  className="gap-2"
                >
                  {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t("admin_data_backup.import.restore_button")}
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {t("admin_data_backup.import.empty")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {restoreSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin_data_backup.summary.title")}</CardTitle>
            <CardDescription>{t("admin_data_backup.summary.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {restoreSummaries.map((summary) => (
              <div key={summary.module} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{getModuleTitle(summary.module)}</div>
                  <Badge variant="secondary">
                    {t("admin_data_backup.summary.created", { count: summary.created })}
                  </Badge>
                  <Badge variant="secondary">
                    {t("admin_data_backup.summary.updated", { count: summary.updated })}
                  </Badge>
                  <Badge variant={summary.failed > 0 ? "destructive" : "outline"}>
                    {t("admin_data_backup.summary.failed", { count: summary.failed })}
                  </Badge>
                </div>
                {summary.notes.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {summary.notes.map((note) => (
                      <li key={note} className="flex items-start gap-2">
                        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AdminConfirmDialog
        open={confirmRestoreOpen}
        title={t("admin_data_backup.confirm.title")}
        description={t("admin_data_backup.confirm.description")}
        confirmLabel={t("admin_data_backup.confirm.confirm_label")}
        destructive
        loading={isRestoring}
        onConfirm={() => void handleRestore()}
        onOpenChange={setConfirmRestoreOpen}
      />
    </div>
  )
}
