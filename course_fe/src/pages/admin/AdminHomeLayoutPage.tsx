import { useEffect, useMemo, useRef, useState, type DragEvent } from "react"
import { motion } from 'motion/react'
import { toast } from "sonner"
import { ChevronDown, Copy, Eye, EyeOff, GripVertical, Plus, Redo2, Save, Trash2, Undo2 } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Switch } from "../../components/ui/switch"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/collapsible"
import { AdminConfirmDialog } from "../../components/admin/AdminConfirmDialog"
import { Trans, useTranslation } from "react-i18next"
import { MiniLivePreview } from "../../features/home/MiniLivePreview"
import { useHistoryState } from "../../hooks/useHistoryState"
import {
  loadHomeSchemaV2,
  saveHomeSchemaV2,
} from "../../features/home/service"
import { HARDCODED_BACKUP_HOME_SCHEMA } from "../../features/home/hardcodedBackupSchema"
import {
  createDefaultSection,
  getDefaultHomeSchemaV2,
  LEGACY_COMPONENT_NAMES,
  normalizeHomeSchemaV2,
  validateHomeSection,
  type HomeSchemaV2,
  type HomeSection,
  type HomeSectionType,
} from "../../features/home/schema"
import { getCourses, type CourseListItem } from "../../services/course.api"
import { getAllCategories, type Category } from "../../services/category.api"
import { getAllReviews, type Review } from "../../services/review.api"

const SECTION_TYPES: HomeSectionType[] = [
  "hero",
  "course_list",
  "promo_banner",
  "badge_strip",
  "feature_grid",
  "testimonial",
  "stats",
  "newsletter",
  "custom_html",
  "legacy_component",
]

const LEGACY_COMPONENT_OPTIONS = LEGACY_COMPONENT_NAMES

type ConfirmState = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  destructive: boolean
  loading: boolean
  action: null | (() => Promise<void> | void)
}

function normalizeOrder(sections: HomeSection[]): HomeSection[] {
  return sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({ ...section, order: index + 1 }))
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {

  }
  return {}
}

function getLocalizedValue(value: unknown, locale: "vi" | "en"): string {
  if (typeof value === "string") return value
  if (!value || typeof value !== "object") return ""
  const record = value as Record<string, unknown>
  return typeof record[locale] === "string" ? (record[locale] as string) : ""
}

function setLocalizedValue(value: unknown, locale: "vi" | "en", text: string): Record<string, string> {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  return {
    vi: typeof record.vi === "string" ? (record.vi as string) : "",
    en: typeof record.en === "string" ? (record.en as string) : "",
    [locale]: text,
  }
}

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function AdminHomeLayoutPage() {
  const { t } = useTranslation()
  const {
    state: schema,
    set: setSchema,
    reset: resetSchema,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistoryState<HomeSchemaV2>(getDefaultHomeSchemaV2())
  const savedSnapshotRef = useRef<string>("")
  const [settingId, setSettingId] = useState<number | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null)
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop")
  const [listOpen, setListOpen] = useState(true)
  const [newSectionType, setNewSectionType] = useState<HomeSectionType>("hero")
  const [isSaving, setIsSaving] = useState(false)
  const [loadedSource, setLoadedSource] = useState<"v2" | "legacy_layout" | "default">("default")
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [categoryOptions, setCategoryOptions] = useState<Category[]>([])
  const [subcategoryOptions, setSubcategoryOptions] = useState<Category[]>([])
  const [pinnedCourseOptions, setPinnedCourseOptions] = useState<CourseListItem[]>([])
  const [courseSearch, setCourseSearch] = useState("")
  const [courseSearchLoading, setCourseSearchLoading] = useState(false)
  const [reviewOptions, setReviewOptions] = useState<Review[]>([])
  const [reviewSearch, setReviewSearch] = useState("")
  const [reviewSearchLoading, setReviewSearchLoading] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: "",
    description: "",
    confirmLabel: t("common.confirm"),
    destructive: false,
    loading: false,
    action: null,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await loadHomeSchemaV2()
        resetSchema(loaded.schema)
        savedSnapshotRef.current = JSON.stringify(normalizeOrder(loaded.schema.sections))
        setSettingId(loaded.settingId)
        setLoadedSource(loaded.source)
        const firstSectionId = loaded.schema.sections[0]?.id || null
        setSelectedSectionId(firstSectionId)
      } catch {
        const fallback = getDefaultHomeSchemaV2()
        resetSchema(fallback)
        savedSnapshotRef.current = JSON.stringify(normalizeOrder(fallback.sections))
        setSelectedSectionId(fallback.sections[0]?.id || null)
        setLoadedSource("default")
        toast.error(t("admin_home_layout.toasts.load_failed"))
      }
    }

    void load()
  }, [])

  const sections = useMemo(() => normalizeOrder(schema.sections), [schema.sections])
  const isDirty = useMemo(
    () => JSON.stringify(sections) !== savedSnapshotRef.current,
    [sections],
  )
  const selectedSection = sections.find((section) => section.id === selectedSectionId) || null
  const selectedSectionErrors = useMemo(
    () => (selectedSection ? validateHomeSection(selectedSection) : []),
    [selectedSection],
  )

  useEffect(() => {
    const loadCategoryOptions = async () => {
      if (selectedSection?.type !== "course_list") return
      try {
        const response = await getAllCategories({ page: 1, page_size: 300 })
        const rows = Array.isArray(response.results) ? response.results : []
        setCategoryOptions(rows.filter((item) => item.parent_category === null))
        setSubcategoryOptions(rows.filter((item) => item.parent_category !== null))
      } catch {
        setCategoryOptions([])
        setSubcategoryOptions([])
      }
    }
    void loadCategoryOptions()
  }, [selectedSection?.id, selectedSection?.type])

  useEffect(() => {
    const loadPinnedCourseOptions = async () => {
      if (selectedSection?.type !== "course_list") return
      setCourseSearchLoading(true)
      try {
        const params = {
          page: 1,
          page_size: 20,
          search: courseSearch.trim() || undefined,
          status: "published",
        } as const
        const response = await getCourses(params)
        setPinnedCourseOptions(Array.isArray(response.results) ? response.results : [])
      } catch {
        setPinnedCourseOptions([])
      } finally {
        setCourseSearchLoading(false)
      }
    }
    const timeout = window.setTimeout(() => {
      void loadPinnedCourseOptions()
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [selectedSection?.id, selectedSection?.type, courseSearch])

  useEffect(() => {
    const loadReviewOptions = async () => {
      if (selectedSection?.type !== "testimonial") return
      setReviewSearchLoading(true)
      try {
        const reviews = await getAllReviews()
        setReviewOptions(
          reviews.filter(
            (review) => review.status === "approved" && Boolean(review.comment?.trim()),
          ),
        )
      } catch {
        setReviewOptions([])
      } finally {
        setReviewSearchLoading(false)
      }
    }

    void loadReviewOptions()
  }, [selectedSection?.id, selectedSection?.type])

  // Keyboard: Ctrl/Cmd+Z undo, Ctrl+Shift+Z / Ctrl+Y redo, Esc deselect.
  // Skipped while focus is in an editable field so native text undo still works.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const editable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      if (event.key === "Escape") {
        setSelectedSectionId(null)
        return
      }
      if (editable) return
      const ctrl = event.ctrlKey || event.metaKey
      if (!ctrl) return
      const key = event.key.toLowerCase()
      if (key === "z" && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [undo, redo])

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  const setSections = (nextSections: HomeSection[], opts?: { coalesce?: boolean }) => {
    const normalized = normalizeOrder(nextSections)
    setSchema((prev) => normalizeHomeSchemaV2({ ...prev, sections: normalized }), opts)
    if (selectedSectionId && !normalized.some((item) => item.id === selectedSectionId)) {
      setSelectedSectionId(normalized[0]?.id || null)
    }
  }

  const updateSection = (
    sectionId: string,
    updater: (section: HomeSection) => HomeSection,
    opts?: { coalesce?: boolean },
  ) => {
    setSections(sections.map((section) => (section.id === sectionId ? updater(section) : section)), opts)
  }

  const updateSectionContent = (sectionId: string, key: string, value: unknown) => {
    updateSection(
      sectionId,
      (section) => ({
        ...section,
        content: {
          ...section.content,
          [key]: value,
        },
      }),
      { coalesce: true },
    )
  }

  const updateSectionDataSource = (sectionId: string, key: string, value: unknown) => {
    updateSection(
      sectionId,
      (section) => ({
        ...section,
        data_source: {
          ...section.data_source,
          [key]: value,
        },
      }),
      { coalesce: true },
    )
  }

  const resetSelectedSectionToDefault = () => {
    if (!selectedSection) return
    const replacement = createDefaultSection(selectedSection.type, selectedSection.order)
    updateSection(selectedSection.id, (current) => ({
      ...replacement,
      id: current.id,
      enabled: current.enabled,
      order: current.order,
      layout: current.layout,
      display_rules: current.display_rules,
    }))
    toast.success(t("admin_home_layout.toasts.reset_section_success"))
  }

  const addSection = () => {
    const section = createDefaultSection(newSectionType, sections.length + 1)
    setSections([...sections, section])
    setSelectedSectionId(section.id)
    toast.success(t("admin_home_layout.toasts.add_section_success"))
  }

  const duplicateSection = (sectionId: string) => {
    const source = sections.find((section) => section.id === sectionId)
    if (!source) return

    const duplicated: HomeSection = {
      ...source,
      id: `${source.id}_copy_${Date.now()}`,
      order: sections.length + 1,
    }

    setSections([...sections, duplicated])
    setSelectedSectionId(duplicated.id)
    toast.success(t("admin_home_layout.toasts.duplicate_section_success"))
  }

  const removeSection = (sectionId: string) => {
    setSections(sections.filter((section) => section.id !== sectionId))
    toast.success(t("admin_home_layout.toasts.section_removed"))
  }

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const next = sections.slice()
    const [dragged] = next.splice(draggedIndex, 1)
    if (!dragged) return
    next.splice(dropIndex, 0, dragged)

    setDraggedIndex(null)
    setSections(next)
  }

  const moveSection = (sectionId: string, dir: "up" | "down") => {
    const index = sections.findIndex((section) => section.id === sectionId)
    if (index === -1) return
    const target = dir === "up" ? index - 1 : index + 1
    if (target < 0 || target >= sections.length) return
    const next = sections.slice()
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setSections(next)
  }

  const insertSection = (type: HomeSectionType, index: number) => {
    const created = createDefaultSection(type, index + 1)
    const next = sections.slice()
    next.splice(index, 0, created)
    setSections(next)
    setSelectedSectionId(created.id)
    toast.success(t("admin_home_layout.toasts.add_section_success"))
  }

  const reorderSection = (draggedId: string, targetId: string, pos: "before" | "after") => {
    if (draggedId === targetId) return
    const from = sections.findIndex((section) => section.id === draggedId)
    const targetIndex = sections.findIndex((section) => section.id === targetId)
    if (from === -1 || targetIndex === -1) return
    const next = sections.slice()
    const [moved] = next.splice(from, 1)
    let insertAt = next.findIndex((section) => section.id === targetId)
    if (pos === "after") insertAt += 1
    next.splice(insertAt, 0, moved)
    setSections(next)
  }

  const saveCurrentSchema = async () => {
    try {
      setIsSaving(true)
      const normalized = normalizeHomeSchemaV2({ ...schema, sections })
      const result = await saveHomeSchemaV2(normalized, settingId, 0)
      setSettingId(result.settingId)

      const reloaded = await loadHomeSchemaV2()
      setLoadedSource(reloaded.source)
      resetSchema(reloaded.schema)
      savedSnapshotRef.current = JSON.stringify(normalizeOrder(reloaded.schema.sections))
      setSelectedSectionId((prev) => prev || reloaded.schema.sections[0]?.id || null)

      const expected = JSON.stringify(normalized.sections)
      const actual = JSON.stringify(reloaded.schema.sections)
      if (reloaded.source !== "v2" || expected !== actual) {
        toast.error(t("admin_home_layout.toasts.save_schema_mismatch"))
        return
      }

      try {
        window.localStorage.removeItem("homepage_schema_v2_cached")
      } catch {

      }

      toast.success(t("admin_home_layout.toasts.save_schema_success"))
    } catch {
      toast.error(t("admin_home_layout.toasts.save_schema_failed"))
    } finally {
      setIsSaving(false)
    }
  }

  const restoreOriginalUiFromDefault = async () => {
    try {
      setIsSaving(true)
      const normalized = normalizeHomeSchemaV2(HARDCODED_BACKUP_HOME_SCHEMA)
      resetSchema(normalized)
      setSelectedSectionId(normalized.sections[0]?.id || null)

      const result = await saveHomeSchemaV2(normalized, settingId, 0)
      setSettingId(result.settingId)

      const reloaded = await loadHomeSchemaV2()
      setLoadedSource(reloaded.source)
      resetSchema(reloaded.schema)
      savedSnapshotRef.current = JSON.stringify(normalizeOrder(reloaded.schema.sections))
      setSelectedSectionId((prev) => prev || reloaded.schema.sections[0]?.id || null)

      const expected = JSON.stringify(normalized.sections)
      const actual = JSON.stringify(reloaded.schema.sections)
      if (reloaded.source !== "v2" || expected !== actual) {
        toast.error(t("admin_home_layout.toasts.save_schema_mismatch"))
        return
      }

      try {
        window.localStorage.removeItem("homepage_schema_v2_cached")
      } catch {

      }

      toast.success(t("admin_home_layout.toasts.save_schema_success"))
    } catch {
      toast.error(t("admin_home_layout.toasts.save_schema_failed"))
    } finally {
      setIsSaving(false)
    }
  }

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void> | void,
    destructive = false,
  ) => {
    setConfirmState({
      open: true,
      title,
      description,
      confirmLabel,
      destructive,
      loading: false,
      action,
    })
  }

  const runConfirm = async () => {
    if (!confirmState.action) return

    try {
      setConfirmState((prev) => ({ ...prev, loading: true }))
      await confirmState.action()
      setConfirmState({
        open: false,
        title: "",
        description: "",
        confirmLabel: t("common.confirm"),
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState((prev) => ({ ...prev, loading: false }))
    }
  }

  const sectionTypeLabel = (type: string) =>
    t(`admin_home_layout.type_names.${type}`, { defaultValue: type })

  const fieldLabel = (key: string) =>
    t(`admin_home_layout.field_labels.${key}`, { defaultValue: key })

  const renderLocalizedField = (
    sectionId: string,
    sourceValue: unknown,
    key: string,
    target: "content" | "data_source" = "content",
    labelKey: string = key,
  ) => (
    <div className="grid gap-2 md:grid-cols-2">
      <div>
        <Label>{fieldLabel(labelKey)} (Tiếng Việt)</Label>
        <Input
          value={getLocalizedValue(sourceValue, "vi")}
          onChange={(event) => {
            const nextValue = setLocalizedValue(sourceValue, "vi", event.target.value)
            if (target === "content") updateSectionContent(sectionId, key, nextValue)
            else updateSectionDataSource(sectionId, key, nextValue)
          }}
        />
      </div>
      <div>
        <Label>{fieldLabel(labelKey)} (English)</Label>
        <Input
          value={getLocalizedValue(sourceValue, "en")}
          onChange={(event) => {
            const nextValue = setLocalizedValue(sourceValue, "en", event.target.value)
            if (target === "content") updateSectionContent(sectionId, key, nextValue)
            else updateSectionDataSource(sectionId, key, nextValue)
          }}
        />
      </div>
    </div>
  )

  const renderBasicEditor = (section: HomeSection) => {
    if (section.type === "hero") {
      return (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">{t("admin_home_layout.labels.hero_settings")}</p>
          {renderLocalizedField(section.id, section.content.badge, "badge")}
          {renderLocalizedField(section.id, section.content.title, "title")}
          {renderLocalizedField(section.id, section.content.subtitle, "subtitle")}
          {renderLocalizedField(section.id, section.content.primary_cta_label, "primary_cta_label")}
          {renderLocalizedField(section.id, section.content.secondary_cta_label, "secondary_cta_label")}
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label>{t("admin_home_layout.fields.primary_cta_link")}</Label>
              <Input
                value={typeof section.content.primary_cta_link === "string" ? section.content.primary_cta_link : ""}
                onChange={(event) => updateSectionContent(section.id, "primary_cta_link", event.target.value)}
              />
            </div>
            <div>
              <Label>{t("admin_home_layout.fields.secondary_cta_link")}</Label>
              <Input
                value={typeof section.content.secondary_cta_link === "string" ? section.content.secondary_cta_link : ""}
                onChange={(event) => updateSectionContent(section.id, "secondary_cta_link", event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>{t("admin_home_layout.fields.image_url")}</Label>
            <Input
              value={typeof section.content.image_url === "string" ? section.content.image_url : ""}
              onChange={(event) => updateSectionContent(section.id, "image_url", event.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={section.content.show_search !== false}
                onCheckedChange={(checked) => updateSectionContent(section.id, "show_search", checked)}
              />
              {t("admin_home_layout.fields.show_search")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={section.content.show_stats !== false}
                onCheckedChange={(checked) => updateSectionContent(section.id, "show_stats", checked)}
              />
              {t("admin_home_layout.fields.show_stats")}
            </label>
          </div>
        </div>
      )
    }

    if (section.type === "course_list") {
      const filters = parseJsonObject(JSON.stringify(section.data_source.filters || {}))
      const selectedCategoryIds = Array.isArray(filters.category_ids)
        ? filters.category_ids.map((item) => Number(item)).filter((item) => Number.isFinite(item))
        : []
      const selectedTopicIds = Array.isArray(filters.topic_ids)
        ? filters.topic_ids.map((item) => Number(item)).filter((item) => Number.isFinite(item))
        : []
      const selectedPinnedIds = Array.isArray(section.data_source.pinned_course_ids)
        ? section.data_source.pinned_course_ids
            .map((item) => Number(item))
            .filter((item) => Number.isFinite(item))
        : []
      const visibleSubcategories = selectedCategoryIds.length
        ? subcategoryOptions.filter((item) => selectedCategoryIds.includes(item.parent_category || -1))
        : subcategoryOptions

      const updateFilters = (nextFilters: Record<string, unknown>) => {
        updateSectionDataSource(section.id, "filters", nextFilters)
      }

      const toggleCategory = (categoryId: number, checked: boolean) => {
        const nextCategoryIds = checked
          ? Array.from(new Set([...selectedCategoryIds, categoryId]))
          : selectedCategoryIds.filter((item) => item !== categoryId)
        const nextTopicIds = selectedTopicIds.filter((topicId) =>
          visibleSubcategories.some(
            (subcategory) => subcategory.id === topicId && (nextCategoryIds.length === 0 || nextCategoryIds.includes(subcategory.parent_category || -1)),
          ),
        )
        updateFilters({
          ...filters,
          category_ids: nextCategoryIds,
          topic_ids: nextTopicIds,
        })
      }

      const toggleTopic = (topicId: number, checked: boolean) => {
        const nextTopicIds = checked
          ? Array.from(new Set([...selectedTopicIds, topicId]))
          : selectedTopicIds.filter((item) => item !== topicId)
        updateFilters({ ...filters, topic_ids: nextTopicIds })
      }

      const togglePinnedCourse = (courseId: number, checked: boolean) => {
        const nextPinnedIds = checked
          ? [...selectedPinnedIds, courseId]
          : selectedPinnedIds.filter((item) => item !== courseId)
        updateSectionDataSource(section.id, "pinned_course_ids", nextPinnedIds)
      }

      const movePinnedCourse = (courseId: number, direction: "up" | "down") => {
        const currentIndex = selectedPinnedIds.findIndex((item) => item === courseId)
        if (currentIndex < 0) return
        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
        if (targetIndex < 0 || targetIndex >= selectedPinnedIds.length) return
        const next = selectedPinnedIds.slice()
        const [picked] = next.splice(currentIndex, 1)
        if (typeof picked !== "number") return
        next.splice(targetIndex, 0, picked)
        updateSectionDataSource(section.id, "pinned_course_ids", next)
      }

      return (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">{t("admin_home_layout.labels.course_list_settings")}</p>
          {renderLocalizedField(section.id, section.content.heading, "heading")}
          {renderLocalizedField(section.id, section.content.subheading, "subheading")}
          {renderLocalizedField(section.id, section.content.view_all_label, "view_all_label")}
          <div>
            <Label>{t("admin_home_layout.fields.view_all_link")}</Label>
            <Input
              value={typeof section.content.view_all_link === "string" ? section.content.view_all_link : ""}
              onChange={(event) => updateSectionContent(section.id, "view_all_link", event.target.value)}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <Label>{t("admin_home_layout.fields.mode")}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                value={typeof section.data_source.mode === "string" ? section.data_source.mode : "hybrid"}
                onChange={(event) => updateSectionDataSource(section.id, "mode", event.target.value)}
              >
                <option value="auto">{t("admin_home_layout.options.auto")}</option>
                <option value="manual">{t("admin_home_layout.options.manual")}</option>
                <option value="hybrid">{t("admin_home_layout.options.hybrid")}</option>
              </select>
            </div>
            <div>
              <Label>{t("admin_home_layout.fields.sort")}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                value={typeof section.data_source.sort === "string" ? section.data_source.sort : "featured"}
                onChange={(event) => updateSectionDataSource(section.id, "sort", event.target.value)}
              >
                <option value="featured">{t("admin_home_layout.options.sort_featured")}</option>
                <option value="newest">{t("admin_home_layout.options.sort_newest")}</option>
                <option value="rating">{t("admin_home_layout.options.sort_rating")}</option>
                <option value="popular">{t("admin_home_layout.options.sort_popular")}</option>
              </select>
            </div>
            <div>
              <Label>{t("admin_home_layout.fields.limit")}</Label>
              <Input
                type="number"
                value={typeof section.data_source.limit === "number" ? section.data_source.limit : 8}
                onChange={(event) => updateSectionDataSource(section.id, "limit", Number(event.target.value) || 8)}
              />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label>{t("admin_home_layout.fields.pinned_course_ids")}</Label>
              <div className="mt-1 rounded-md border p-2 text-sm">
                {selectedPinnedIds.length === 0 ? (
                  <p className="text-muted-foreground">{t("admin_home_layout.fields.no_pinned_courses")}</p>
                ) : (
                  <div className="space-y-1">
                    {selectedPinnedIds.map((id) => (
                      <div key={id} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                        <span className="line-clamp-1">
                          {pinnedCourseOptions.find((course) => course.id === id)?.title
                            || t("admin_home_layout.fields.pinned_course_item", { id })}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => movePinnedCourse(id, "up")}>
                            ↑
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => movePinnedCourse(id, "down")}>
                            ↓
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => togglePinnedCourse(id, false)}>
                            {t("admin_home_layout.fields.remove")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>{t("admin_home_layout.fields.filters_level")}</Label>
              <Input
                value={typeof filters.level === "string" ? filters.level : ""}
                onChange={(event) => updateFilters({ ...filters, level: event.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label>{t("admin_home_layout.fields.filters_category_ids")}</Label>
              <div className="mt-1 max-h-40 space-y-1 overflow-auto rounded-md border p-2 text-sm">
                {categoryOptions.length === 0 ? (
                  <p className="text-muted-foreground">{t("admin_home_layout.fields.no_categories")}</p>
                ) : (
                  categoryOptions.map((item) => (
                    <label key={item.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(item.id)}
                        onChange={(event) => toggleCategory(item.id, event.target.checked)}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div>
              <Label>{t("admin_home_layout.fields.filters_topic_ids")}</Label>
              <div className="mt-1 max-h-40 space-y-1 overflow-auto rounded-md border p-2 text-sm">
                {visibleSubcategories.length === 0 ? (
                  <p className="text-muted-foreground">{t("admin_home_layout.fields.no_topics")}</p>
                ) : (
                  visibleSubcategories.map((item) => (
                    <label key={item.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTopicIds.includes(item.id)}
                        onChange={(event) => toggleTopic(item.id, event.target.checked)}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div>
              <Label>{t("admin_home_layout.fields.filters_rating_min")}</Label>
              <Input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={typeof filters.rating_min === "number" ? filters.rating_min : 0}
                onChange={(event) =>
                  updateFilters({ ...filters, rating_min: Number(event.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>{t("admin_home_layout.fields.filters_price_type")}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                value={typeof filters.price_type === "string" ? filters.price_type : "all"}
                onChange={(event) => updateFilters({ ...filters, price_type: event.target.value })}
              >
                <option value="all">{t("admin_home_layout.options.price_all")}</option>
                <option value="free">{t("admin_home_layout.options.price_free")}</option>
                <option value="paid">{t("admin_home_layout.options.price_paid")}</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("admin_home_layout.fields.manual_pin_picker")}</Label>
            <Input
              placeholder={t("admin_home_layout.fields.course_search")}
              value={courseSearch}
              onChange={(event) => setCourseSearch(event.target.value)}
            />
            <div className="max-h-44 space-y-1 overflow-auto rounded-md border p-2 text-sm">
              {courseSearchLoading ? (
                <p className="text-muted-foreground">{t("admin_home_layout.fields.loading_courses")}</p>
              ) : pinnedCourseOptions.length === 0 ? (
                <p className="text-muted-foreground">{t("admin_home_layout.fields.no_results")}</p>
              ) : (
                pinnedCourseOptions.map((course) => (
                  <label key={course.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedPinnedIds.includes(course.id)}
                      onChange={(event) => togglePinnedCourse(course.id, event.target.checked)}
                    />
                    <span className="line-clamp-1">{course.title}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      )
    }

    if (section.type === "promo_banner") {
      return (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">{sectionTypeLabel(section.type)}</p>
          {renderLocalizedField(section.id, section.content.title, "title")}
          {renderLocalizedField(section.id, section.content.description, "description")}
          {renderLocalizedField(section.id, section.content.cta_label, "cta_label")}
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label>{t("admin_home_layout.fields.cta_link")}</Label>
              <Input
                value={typeof section.content.cta_link === "string" ? section.content.cta_link : ""}
                onChange={(event) => updateSectionContent(section.id, "cta_link", event.target.value)}
              />
            </div>
            <div>
              <Label>{t("admin_home_layout.fields.image_url")}</Label>
              <Input
                value={typeof section.content.image_url === "string" ? section.content.image_url : ""}
                onChange={(event) => updateSectionContent(section.id, "image_url", event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>{t("admin_home_layout.fields.style_variant")}</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
              value={typeof section.content.style_variant === "string" ? section.content.style_variant : "solid"}
              onChange={(event) => updateSectionContent(section.id, "style_variant", event.target.value)}
            >
              <option value="solid">{t("admin_home_layout.options.style_solid")}</option>
              <option value="outline">{t("admin_home_layout.options.style_outline")}</option>
            </select>
          </div>
        </div>
      )
    }

    if (section.type === "newsletter") {
      return (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">{sectionTypeLabel(section.type)}</p>
          {renderLocalizedField(section.id, section.content.title, "title")}
          {renderLocalizedField(section.id, section.content.subtitle, "subtitle")}
          {renderLocalizedField(section.id, section.content.email_placeholder, "email_placeholder")}
          {renderLocalizedField(section.id, section.content.subscribe_label, "subscribe_label")}
          {renderLocalizedField(section.id, section.content.privacy_note, "privacy_note")}
        </div>
      )
    }

    if (section.type === "badge_strip" || section.type === "feature_grid") {
      const items = Array.isArray(section.content.items) ? section.content.items : []
      const primaryKey = section.type === "badge_strip" ? "label" : "title"
      const secondaryKey = section.type === "badge_strip" ? "sublabel" : "description"

      const updateItemField = (index: number, patch: Record<string, unknown>) => {
        const current = items[index] && typeof items[index] === "object" ? (items[index] as Record<string, unknown>) : {}
        const next = items.slice()
        next[index] = { ...current, ...patch }
        updateSectionContent(section.id, "items", next)
      }

      return (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">{sectionTypeLabel(section.type)}</p>
          {renderLocalizedField(section.id, section.content.heading, "heading")}
          {renderLocalizedField(section.id, section.content.subheading, "subheading")}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("admin_home_layout.fields.items")}</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = section.type === "badge_strip"
                    ? [...items, { icon: "Award", label: { vi: "", en: "" }, sublabel: { vi: "", en: "" } }]
                    : [...items, { icon: "Zap", title: { vi: "", en: "" }, description: { vi: "", en: "" } }]
                  updateSectionContent(section.id, "items", next)
                }}
              >
                {t("admin_home_layout.fields.add_item")}
              </Button>
            </div>
            {items.map((item, index) => {
              const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
              return (
                <div key={index} className="space-y-2 rounded-md border p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t("admin_home_layout.fields.item_index", { index: index + 1 })}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => updateSectionContent(section.id, "items", items.filter((_, i) => i !== index))}
                    >
                      {t("common.delete")}
                    </Button>
                  </div>
                  <div>
                    <Label>{t("admin_home_layout.fields.icon")}</Label>
                    <Input
                      value={typeof row.icon === "string" ? row.icon : ""}
                      onChange={(event) => updateItemField(index, { icon: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <Label>{fieldLabel(primaryKey)} (Tiếng Việt)</Label>
                      <Input
                        value={getLocalizedValue(row[primaryKey], "vi")}
                        onChange={(event) => updateItemField(index, { [primaryKey]: setLocalizedValue(row[primaryKey], "vi", event.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>{fieldLabel(primaryKey)} (English)</Label>
                      <Input
                        value={getLocalizedValue(row[primaryKey], "en")}
                        onChange={(event) => updateItemField(index, { [primaryKey]: setLocalizedValue(row[primaryKey], "en", event.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>{fieldLabel(secondaryKey)} (Tiếng Việt)</Label>
                      <Input
                        value={getLocalizedValue(row[secondaryKey], "vi")}
                        onChange={(event) => updateItemField(index, { [secondaryKey]: setLocalizedValue(row[secondaryKey], "vi", event.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>{fieldLabel(secondaryKey)} (English)</Label>
                      <Input
                        value={getLocalizedValue(row[secondaryKey], "en")}
                        onChange={(event) => updateItemField(index, { [secondaryKey]: setLocalizedValue(row[secondaryKey], "en", event.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (section.type === "testimonial") {
      const items = Array.isArray(section.content.items) ? section.content.items : []
      const selectedReviewIds = Array.isArray(section.data_source.selected_review_ids)
        ? section.data_source.selected_review_ids
            .map((item) => Number(item))
            .filter((item) => Number.isFinite(item))
        : []
      const reviewMode = typeof section.data_source.mode === "string" ? section.data_source.mode : "hybrid"
      const reviewLimit = typeof section.data_source.limit === "number" ? section.data_source.limit : 6
      const searchTerm = reviewSearch.trim().toLowerCase()
      const visibleReviewOptions = reviewOptions
        .filter((review) => {
          if (!searchTerm) return true
          const fields = [
            review.user_info?.full_name,
            review.course_detail?.title,
            review.comment,
          ]
          return fields.some((value) => (value || "").toLowerCase().includes(searchTerm))
        })
        .slice(0, 40)

      const updateStaticItem = (index: number, patch: Record<string, unknown>) => {
        const current = items[index] && typeof items[index] === "object"
          ? (items[index] as Record<string, unknown>)
          : {}
        const next = items.slice()
        next[index] = { ...current, ...patch }
        updateSectionContent(section.id, "items", next)
      }

      const toggleSelectedReview = (reviewId: number, checked: boolean) => {
        const nextIds = checked
          ? Array.from(new Set([...selectedReviewIds, reviewId]))
          : selectedReviewIds.filter((item) => item !== reviewId)
        updateSectionDataSource(section.id, "selected_review_ids", nextIds)
      }

      const moveSelectedReview = (reviewId: number, direction: "up" | "down") => {
        const currentIndex = selectedReviewIds.findIndex((item) => item === reviewId)
        if (currentIndex < 0) return
        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
        if (targetIndex < 0 || targetIndex >= selectedReviewIds.length) return
        const next = selectedReviewIds.slice()
        const [picked] = next.splice(currentIndex, 1)
        if (typeof picked !== "number") return
        next.splice(targetIndex, 0, picked)
        updateSectionDataSource(section.id, "selected_review_ids", next)
      }

      return (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">{t("admin_home_layout.labels.testimonial_settings")}</p>
          {renderLocalizedField(section.id, section.content.heading, "heading")}
          {renderLocalizedField(section.id, section.content.subheading, "subheading")}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>{t("admin_home_layout.fields.review_mode")}</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                value={reviewMode}
                onChange={(event) => updateSectionDataSource(section.id, "mode", event.target.value)}
              >
                <option value="hybrid">{t("admin_home_layout.options.hybrid")}</option>
                <option value="selected_reviews">{t("admin_home_layout.options.selected_reviews")}</option>
                <option value="static">{t("admin_home_layout.options.static")}</option>
              </select>
            </div>
            <div>
              <Label>{t("admin_home_layout.fields.testimonial_limit")}</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={reviewLimit}
                onChange={(event) => updateSectionDataSource(section.id, "limit", Number(event.target.value) || 6)}
              />
            </div>
          </div>

          {reviewMode !== "static" ? (
            <div className="space-y-3 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{t("admin_home_layout.labels.testimonial_real_reviews")}</p>
                <p className="text-xs text-muted-foreground">{t("admin_home_layout.labels.testimonial_real_reviews_description")}</p>
              </div>

              <div>
                <Label>{t("admin_home_layout.fields.selected_review_ids")}</Label>
                <div className="mt-1 rounded-md border p-2 text-sm">
                  {selectedReviewIds.length === 0 ? (
                    <p className="text-muted-foreground">{t("admin_home_layout.fields.no_selected_reviews")}</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedReviewIds.map((id) => {
                        const review = reviewOptions.find((item) => item.review_id === id)
                        return (
                          <div key={id} className="flex items-start justify-between gap-2 rounded border px-2 py-1">
                            <div className="min-w-0">
                              <p className="line-clamp-1 font-medium">
                                {review?.user_info?.full_name || `Review #${id}`}
                              </p>
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {review?.course_detail?.title || t("admin_home_layout.fields.review_not_available")}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => moveSelectedReview(id, "up")}>
                                ↑
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => moveSelectedReview(id, "down")}>
                                ↓
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => toggleSelectedReview(id, false)}>
                                {t("admin_home_layout.fields.remove")}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("admin_home_layout.fields.review_search")}</Label>
                <Input
                  value={reviewSearch}
                  onChange={(event) => setReviewSearch(event.target.value)}
                  placeholder={t("admin_home_layout.fields.review_search_placeholder")}
                />
                <div className="max-h-72 space-y-2 overflow-auto rounded-md border p-2 text-sm">
                  {reviewSearchLoading ? (
                    <p className="text-muted-foreground">{t("admin_home_layout.fields.loading_reviews")}</p>
                  ) : visibleReviewOptions.length === 0 ? (
                    <p className="text-muted-foreground">{t("admin_home_layout.fields.no_reviews")}</p>
                  ) : (
                    visibleReviewOptions.map((review) => (
                      <label key={review.review_id} className="flex items-start gap-2 rounded-md border p-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedReviewIds.includes(review.review_id)}
                          onChange={(event) => toggleSelectedReview(review.review_id, event.target.checked)}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{review.user_info?.full_name || `Review #${review.review_id}`}</span>
                            <Badge variant="outline">{review.rating}/5</Badge>
                          </div>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{review.course_detail?.title}</p>
                          <p className="line-clamp-2">{review.comment}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{t("admin_home_layout.labels.static_testimonials")}</p>
                <p className="text-xs text-muted-foreground">{t("admin_home_layout.labels.static_testimonials_description")}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateSectionContent(section.id, "items", [
                    ...items,
                    { name: "", role: "", course: "", avatar: "", rating: 5, content: { vi: "", en: "" } },
                  ])
                }
              >
                {t("admin_home_layout.actions.add_testimonial")}
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                {t("admin_home_layout.labels.default_static_testimonials_hint")}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
                  return (
                    <div key={index} className="space-y-3 rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">#{index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => updateSectionContent(section.id, "items", items.filter((_, i) => i !== index))}
                        >
                          {t("common.delete")}
                        </Button>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <Label>{t("admin_home_layout.fields.name")}</Label>
                          <Input
                            value={typeof row.name === "string" ? row.name : ""}
                            onChange={(event) => updateStaticItem(index, { name: event.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{t("admin_home_layout.fields.role")}</Label>
                          <Input
                            value={typeof row.role === "string" ? row.role : ""}
                            onChange={(event) => updateStaticItem(index, { role: event.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{t("admin_home_layout.fields.course")}</Label>
                          <Input
                            value={typeof row.course === "string" ? row.course : ""}
                            onChange={(event) => updateStaticItem(index, { course: event.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{t("admin_home_layout.fields.avatar_url")}</Label>
                          <Input
                            value={typeof row.avatar === "string" ? row.avatar : ""}
                            onChange={(event) => updateStaticItem(index, { avatar: event.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{t("admin_home_layout.fields.rating")}</Label>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            value={typeof row.rating === "number" ? row.rating : 5}
                            onChange={(event) => updateStaticItem(index, { rating: Number(event.target.value) || 5 })}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <Label>{t("admin_home_layout.fields.content")} (vi)</Label>
                          <Textarea
                            rows={3}
                            value={getLocalizedValue(row.content, "vi")}
                            onChange={(event) => updateStaticItem(index, { content: setLocalizedValue(row.content, "vi", event.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>{t("admin_home_layout.fields.content")} (en)</Label>
                          <Textarea
                            rows={3}
                            value={getLocalizedValue(row.content, "en")}
                            onChange={(event) => updateStaticItem(index, { content: setLocalizedValue(row.content, "en", event.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )
    }

    if (section.type === "stats") {
      const items = Array.isArray(section.content.items) ? section.content.items : []
      const usePublicStats = section.content.use_public_stats !== false

      const updateStatItem = (index: number, patch: Record<string, unknown>) => {
        const current = items[index] && typeof items[index] === "object" ? (items[index] as Record<string, unknown>) : {}
        const next = items.slice()
        next[index] = { ...current, ...patch }
        updateSectionContent(section.id, "items", next)
      }

      return (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">{sectionTypeLabel(section.type)}</p>
          {renderLocalizedField(section.id, section.content.heading, "heading")}
          {renderLocalizedField(section.id, section.content.subheading, "subheading")}
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={usePublicStats}
              onCheckedChange={(checked) => updateSectionContent(section.id, "use_public_stats", checked)}
            />
            {t("admin_home_layout.fields.use_public_stats")}
          </label>
          {!usePublicStats ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("admin_home_layout.fields.items")}</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateSectionContent(section.id, "items", [...items, { icon: "Award", value: "", label: { vi: "", en: "" }, sublabel: { vi: "", en: "" } }])}
                >
                  {t("admin_home_layout.fields.add_item")}
                </Button>
              </div>
              {items.map((item, index) => {
                const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
                return (
                  <div key={index} className="space-y-2 rounded-md border p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t("admin_home_layout.fields.item_index", { index: index + 1 })}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => updateSectionContent(section.id, "items", items.filter((_, i) => i !== index))}
                      >
                        {t("common.delete")}
                      </Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <Label>{t("admin_home_layout.fields.icon")}</Label>
                        <Input value={typeof row.icon === "string" ? row.icon : ""} onChange={(event) => updateStatItem(index, { icon: event.target.value })} />
                      </div>
                      <div>
                        <Label>{t("admin_home_layout.fields.stat_value")}</Label>
                        <Input value={typeof row.value === "string" ? row.value : ""} onChange={(event) => updateStatItem(index, { value: event.target.value })} />
                      </div>
                      <div>
                        <Label>{fieldLabel("label")} (Tiếng Việt)</Label>
                        <Input value={getLocalizedValue(row.label, "vi")} onChange={(event) => updateStatItem(index, { label: setLocalizedValue(row.label, "vi", event.target.value) })} />
                      </div>
                      <div>
                        <Label>{fieldLabel("label")} (English)</Label>
                        <Input value={getLocalizedValue(row.label, "en")} onChange={(event) => updateStatItem(index, { label: setLocalizedValue(row.label, "en", event.target.value) })} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      )
    }

    if (section.type === "custom_html") {
      return (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">{sectionTypeLabel(section.type)}</p>
          {renderLocalizedField(section.id, section.content.title, "title")}
          <div>
            <Label>{t("admin_home_layout.fields.html")}</Label>
            <Textarea
              rows={6}
              value={typeof section.content.html === "string" ? section.content.html : ""}
              onChange={(event) => updateSectionContent(section.id, "html", event.target.value)}
            />
          </div>
        </div>
      )
    }

    if (section.type === "legacy_component") {
      return (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">{sectionTypeLabel(section.type)}</p>
          <Label>{t("admin_home_layout.fields.component")}</Label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={typeof section.data_source.component === "string" ? section.data_source.component : "HeroSection"}
            onChange={(event) => updateSectionDataSource(section.id, "component", event.target.value)}
          >
            {LEGACY_COMPONENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )
    }

    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        {t("admin_home_layout.validation.unsupported_form")}
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="flex flex-wrap items-center justify-between gap-3" variants={fadeInUp}>
        <div>
          <h1 className="text-3xl font-semibold">{t("admin_home_layout.title")}</h1>
          <p className="text-muted-foreground">
            {t("admin_home_layout.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirty ? (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
              {t("admin_home_layout.labels.unsaved")}
            </Badge>
          ) : null}
          <Button variant="outline" size="icon" onClick={undo} disabled={!canUndo} aria-label={t("admin_home_layout.actions.undo")} title={t("admin_home_layout.actions.undo")}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={redo} disabled={!canRedo} aria-label={t("admin_home_layout.actions.redo")} title={t("admin_home_layout.actions.redo")}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button onClick={saveCurrentSchema} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? t("common.loading") : t("admin_home_layout.actions.save_layout")}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              openConfirm(
                t("admin_home_layout.confirm.load_fake_data_title"),
                t("admin_home_layout.confirm.load_fake_data_description"),
                t("admin_home_layout.confirm.load_fake_data_confirm"),
                restoreOriginalUiFromDefault,
                false,
              )
            }
            disabled={isSaving}
          >
            {isSaving ? t("common.loading") : t("admin_home_layout.confirm.load_fake_data_title")}
          </Button>
        </div>
      </motion.div>

      <motion.div className="grid grid-cols-1 gap-6 xl:grid-cols-12" variants={fadeInUp}>
        {/* LEFT: interactive mini preview */}
        <div className="space-y-4 self-start xl:sticky xl:top-6 xl:col-span-5">
          {loadedSource !== "v2" ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <Trans
                i18nKey="admin_home_layout.source_fallback_notice"
                values={{ source: loadedSource }}
                components={{ save: <span className="font-semibold" /> }}
              />
            </div>
          ) : (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
              {t("admin_home_layout.source_db_notice")}
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t("admin_home_layout.labels.live_preview")}</CardTitle>
              <CardDescription>{t("admin_home_layout.labels.preview_click_hint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <MiniLivePreview
                sections={sections}
                selectedSectionId={selectedSectionId}
                hoveredSectionId={hoveredSectionId}
                device={previewDevice}
                onSelect={setSelectedSectionId}
                onHover={setHoveredSectionId}
                onDeviceChange={setPreviewDevice}
                onToggleEnabled={(id) => updateSection(id, (current) => ({ ...current, enabled: !current.enabled }))}
                onDuplicate={duplicateSection}
                onDelete={(id) =>
                  openConfirm(
                    t("admin_home_layout.confirm.remove_section_title"),
                    t("admin_home_layout.confirm.remove_section_description"),
                    t("common.delete"),
                    () => removeSection(id),
                    true,
                  )
                }
                onMove={moveSection}
                onInsert={insertSection}
                onReorder={reorderSection}
              />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: component list + inspector */}
        <div className="space-y-4 xl:col-span-7">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={newSectionType}
              onChange={(event) => setNewSectionType(event.target.value as HomeSectionType)}
            >
              {SECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {sectionTypeLabel(type)}
                </option>
              ))}
            </select>
            <Button onClick={addSection}>
              <Plus className="mr-2 h-4 w-4" />
              {t("admin_home_layout.actions.add_section")}
            </Button>
          </div>

          <Card>
            <Collapsible open={listOpen} onOpenChange={setListOpen}>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex w-full items-center justify-between p-4 text-left">
                  <span className="flex items-center gap-2 font-medium">
                    {t("admin_home_layout.labels.components_on_page")}
                    <Badge variant="outline">{sections.length}</Badge>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition ${listOpen ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 p-4 pt-0">
                  {sections.length === 0 ? (
                    <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                      {t("admin_home_layout.labels.empty_canvas")}
                    </p>
                  ) : (
                    sections.map((section, index) => (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={(_event: DragEvent) => setDraggedIndex(index)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleDrop(index)}
                        onMouseEnter={() => setHoveredSectionId(section.id)}
                        onMouseLeave={() => setHoveredSectionId(null)}
                        className={`rounded-lg border p-3 transition ${
                          section.id === selectedSectionId || section.id === hoveredSectionId ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button className="flex flex-1 items-center gap-2 text-left" onClick={() => setSelectedSectionId(section.id)}>
                            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                            <Badge variant="outline">#{section.order}</Badge>
                            <span className={`font-medium ${section.enabled ? "" : "text-muted-foreground line-through"}`}>
                              {sectionTypeLabel(section.type)}
                            </span>
                          </button>

                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => updateSection(section.id, (current) => ({ ...current, enabled: !current.enabled }))}
                            >
                              {section.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => duplicateSection(section.id)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() =>
                                openConfirm(
                                  t("admin_home_layout.confirm.remove_section_title"),
                                  t("admin_home_layout.confirm.remove_section_description"),
                                  t("common.delete"),
                                  () => removeSection(section.id),
                                  true,
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin_home_layout.labels.section_editor")}</CardTitle>
              <CardDescription>{t("admin_home_layout.labels.section_editor_description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSection ? (
                <div className="space-y-4">
                      <div className="rounded-md border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{t("admin_home_layout.fields.section_order", { order: selectedSection.order })}</Badge>
                          <Badge>{sectionTypeLabel(selectedSection.type)}</Badge>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{t("admin_home_layout.labels.basic_information")}</p>
                            <p className="text-xs text-muted-foreground">{t("admin_home_layout.labels.basic_information_description")}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={resetSelectedSectionToDefault}>
                            {t("admin_home_layout.actions.reset_section")}
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>{t("admin_home_layout.fields.type")}</Label>
                            <select
                              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                              value={selectedSection.type}
                              onChange={(event) =>
                                updateSection(selectedSection.id, (section) => ({
                                  ...createDefaultSection(event.target.value as HomeSectionType, section.order),
                                  id: section.id,
                                  enabled: section.enabled,
                                  order: section.order,
                                  layout: section.layout,
                                  display_rules: section.display_rules,
                                }))
                              }
                            >
                              {SECTION_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {sectionTypeLabel(type)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2 pt-7">
                            <Switch
                              checked={selectedSection.enabled}
                              onCheckedChange={(checked) => updateSection(selectedSection.id, (section) => ({ ...section, enabled: checked }))}
                            />
                            <span className="text-sm">{t("admin_home_layout.fields.visible_section")}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-md border p-3">
                        <div>
                          <p className="text-sm font-medium">{t("admin_home_layout.labels.display_layout")}</p>
                          <p className="text-xs text-muted-foreground">{t("admin_home_layout.labels.display_layout_description")}</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>{t("admin_home_layout.fields.container")}</Label>
                            <select
                              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                              value={selectedSection.layout.container}
                              onChange={(event) =>
                                updateSection(selectedSection.id, (section) => ({
                                  ...section,
                                  layout: {
                                    ...section.layout,
                                    container: event.target.value as HomeSection["layout"]["container"],
                                  },
                                }))
                              }
                            >
                              <option value="default">{t("admin_home_layout.options.default")}</option>
                              <option value="wide">{t("admin_home_layout.options.wide")}</option>
                              <option value="full">{t("admin_home_layout.options.full")}</option>
                            </select>
                          </div>

                          <div>
                            <Label>{t("admin_home_layout.fields.background")}</Label>
                            <select
                              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                              value={selectedSection.layout.background}
                              onChange={(event) =>
                                updateSection(selectedSection.id, (section) => ({
                                  ...section,
                                  layout: {
                                    ...section.layout,
                                    background: event.target.value as HomeSection["layout"]["background"],
                                  },
                                }))
                              }
                            >
                              <option value="none">{t("admin_home_layout.options.none")}</option>
                              <option value="muted">{t("admin_home_layout.options.muted")}</option>
                              <option value="brand">{t("admin_home_layout.options.brand")}</option>
                            </select>
                          </div>

                          <div>
                            <Label>{t("admin_home_layout.fields.spacing_top")}</Label>
                            <select
                              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                              value={selectedSection.layout.spacing_top}
                              onChange={(event) =>
                                updateSection(selectedSection.id, (section) => ({
                                  ...section,
                                  layout: {
                                    ...section.layout,
                                    spacing_top: event.target.value as HomeSection["layout"]["spacing_top"],
                                  },
                                }))
                              }
                            >
                              <option value="sm">{t("admin_home_layout.options.size_sm")}</option>
                              <option value="md">{t("admin_home_layout.options.size_md")}</option>
                              <option value="lg">{t("admin_home_layout.options.size_lg")}</option>
                            </select>
                          </div>

                          <div>
                            <Label>{t("admin_home_layout.fields.spacing_bottom")}</Label>
                            <select
                              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                              value={selectedSection.layout.spacing_bottom}
                              onChange={(event) =>
                                updateSection(selectedSection.id, (section) => ({
                                  ...section,
                                  layout: {
                                    ...section.layout,
                                    spacing_bottom: event.target.value as HomeSection["layout"]["spacing_bottom"],
                                  },
                                }))
                              }
                            >
                              <option value="sm">{t("admin_home_layout.options.size_sm")}</option>
                              <option value="md">{t("admin_home_layout.options.size_md")}</option>
                              <option value="lg">{t("admin_home_layout.options.size_lg")}</option>
                            </select>
                          </div>

                          <div>
                            <Label>{t("admin_home_layout.fields.audience")}</Label>
                            <select
                              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                              value={selectedSection.display_rules.audience}
                              onChange={(event) =>
                                updateSection(selectedSection.id, (section) => ({
                                  ...section,
                                  display_rules: {
                                    ...section.display_rules,
                                    audience: event.target.value as HomeSection["display_rules"]["audience"],
                                  },
                                }))
                              }
                            >
                              <option value="all">{t("admin_home_layout.options.all")}</option>
                              <option value="guest">{t("admin_home_layout.options.guest")}</option>
                              <option value="logged_in">{t("admin_home_layout.options.logged_in")}</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <Label>{t("admin_home_layout.fields.devices")}</Label>
                            <div className="mt-2 flex flex-wrap gap-4">
                              <label className="flex items-center gap-2 text-sm">
                                <Switch
                                  checked={selectedSection.display_rules.devices.includes("mobile")}
                                  onCheckedChange={(checked) =>
                                    updateSection(selectedSection.id, (section) => {
                                      const current = section.display_rules.devices
                                      const next = checked
                                        ? Array.from(new Set([...current, "mobile"]))
                                        : current.filter((item) => item !== "mobile")
                                      return {
                                        ...section,
                                        display_rules: {
                                          ...section.display_rules,
                                          devices: next.length > 0 ? next : ["mobile", "desktop"],
                                        },
                                      } as HomeSection
                                    })
                                  }
                                />
                                {t("admin_home_layout.options.mobile")}
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <Switch
                                  checked={selectedSection.display_rules.devices.includes("desktop")}
                                  onCheckedChange={(checked) =>
                                    updateSection(selectedSection.id, (section) => {
                                      const current = section.display_rules.devices
                                      const next = checked
                                        ? Array.from(new Set([...current, "desktop"]))
                                        : current.filter((item) => item !== "desktop")
                                      return {
                                        ...section,
                                        display_rules: {
                                          ...section.display_rules,
                                          devices: next.length > 0 ? next : ["mobile", "desktop"],
                                        },
                                      } as HomeSection
                                    })
                                  }
                                />
                                {t("admin_home_layout.options.desktop")}
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-md border p-3">
                        <div>
                          <p className="text-sm font-medium">{t("admin_home_layout.labels.section_type_configuration")}</p>
                          <p className="text-xs text-muted-foreground">{t("admin_home_layout.labels.section_type_configuration_description")}</p>
                        </div>
                        {renderBasicEditor(selectedSection)}
                      </div>

                      <div className="space-y-2 rounded-md border p-3">
                        <p className="text-sm font-medium">{t("admin_home_layout.labels.configuration_validation")}</p>
                        {selectedSectionErrors.length > 0 ? (
                          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                            {selectedSectionErrors.map((error, index) => (
                              <div key={index}>- {error}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                            {t("admin_home_layout.validation.no_errors")}
                          </div>
                        )}
                      </div>
                </div>
              ) : (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t("admin_home_layout.labels.inspector_placeholder")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <AdminConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        loading={confirmState.loading}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        onConfirm={runConfirm}
      />
      </motion.div>
    </motion.div>
  )
}




