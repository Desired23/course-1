import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Monitor,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
} from "lucide-react"
import { DynamicHomeSections } from "./DynamicHomeRenderer"
import type { HomeSection, HomeSectionType } from "./schema"
import { Button } from "../../components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"

const SECTION_TYPES: HomeSectionType[] = [
  "hero",
  "course_list",
  "promo_banner",
  "badge_strip",
  "feature_grid",
  "testimonial",
  "stats",
  "custom_html",
  "legacy_component",
]

const VIRTUAL_WIDTHS = { desktop: 1280, mobile: 390 } as const

interface SectionRect {
  id: string
  top: number
  height: number
}

interface MiniLivePreviewProps {
  sections: HomeSection[]
  selectedSectionId: string | null
  hoveredSectionId: string | null
  device: "desktop" | "mobile"
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onDeviceChange: (device: "desktop" | "mobile") => void
  onToggleEnabled: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, dir: "up" | "down") => void
  onInsert: (type: HomeSectionType, index: number) => void
  onReorder: (draggedId: string, targetId: string, pos: "before" | "after") => void
}

export function MiniLivePreview({
  sections,
  selectedSectionId,
  hoveredSectionId,
  device,
  onSelect,
  onHover,
  onDeviceChange,
  onToggleEnabled,
  onDuplicate,
  onDelete,
  onMove,
  onInsert,
  onReorder,
}: MiniLivePreviewProps) {
  const { t } = useTranslation()
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const [outerWidth, setOuterWidth] = useState(0)
  const [naturalHeight, setNaturalHeight] = useState(0)
  const [rects, setRects] = useState<SectionRect[]>([])
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; pos: "before" | "after" } | null>(null)

  const virtualWidth = VIRTUAL_WIDTHS[device]
  const scale = outerWidth > 0 ? Math.min(1, outerWidth / virtualWidth) : 1

  const typeLabel = (type: string) => t(`admin_home_layout.type_names.${type}`, { defaultValue: type })

  const sectionById = useMemo(() => {
    const map = new Map<string, HomeSection>()
    sections.forEach((section) => map.set(section.id, section))
    return map
  }, [sections])

  const measure = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const inner = innerRef.current
      if (!inner) return
      setNaturalHeight(inner.scrollHeight)
      const nodes = Array.from(inner.querySelectorAll<HTMLElement>("[data-home-section-id]"))
      setRects(
        nodes.map((el) => ({
          id: el.dataset.homeSectionId || "",
          top: el.offsetTop,
          height: el.offsetHeight,
        })),
      )
    })
  }, [])

  // Track available width to compute the scale factor.
  useLayoutEffect(() => {
    const el = outerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setOuterWidth(entry.contentRect.width)
    })
    ro.observe(el)
    setOuterWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Re-measure natural height + per-section rects on content/section/device change.
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    measure()
    return () => {
      ro.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [measure, sections, device])

  // Scroll the selected section into view inside the canvas.
  const selectedRect = rects.find((rect) => rect.id === selectedSectionId)
  useEffect(() => {
    const view = outerRef.current
    if (!selectedSectionId || !view || !selectedRect) return
    const top = selectedRect.top * scale
    const bottom = top + selectedRect.height * scale
    if (top < view.scrollTop || bottom > view.scrollTop + view.clientHeight) {
      view.scrollTo({ top: Math.max(0, top - 16), behavior: "smooth" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId])

  const insertMenu = (index: number, variant: "strip" | "empty") => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "strip" ? (
          <button
            type="button"
            aria-label={t("admin_home_layout.actions.insert_section")}
            className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-background transition hover:scale-110"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Button size="sm" className="pointer-events-auto mt-3">
            <Plus className="mr-2 h-4 w-4" />
            {t("admin_home_layout.actions.insert_section")}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="max-h-72 overflow-y-auto">
        {SECTION_TYPES.map((type) => (
          <DropdownMenuItem key={type} onSelect={() => onInsert(type, index)}>
            {typeLabel(type)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const header = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">{t("admin_home_layout.preview.hover_hint")}</p>
      <div className="flex items-center gap-1 rounded-md border p-0.5">
        <button
          type="button"
          aria-label={t("admin_home_layout.options.desktop")}
          onClick={() => onDeviceChange("desktop")}
          className={`flex h-7 w-8 items-center justify-center rounded transition ${
            device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Monitor className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={t("admin_home_layout.options.mobile")}
          onClick={() => onDeviceChange("mobile")}
          className={`flex h-7 w-8 items-center justify-center rounded transition ${
            device === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Smartphone className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  if (sections.length === 0) {
    return (
      <div>
        {header}
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
          <p>{t("admin_home_layout.labels.empty_canvas")}</p>
          {insertMenu(0, "empty")}
        </div>
      </div>
    )
  }

  return (
    <div>
      {header}
      <div
        ref={outerRef}
        className="relative overflow-y-auto rounded-lg border bg-background"
        style={{ maxHeight: "calc(100vh - 240px)" }}
      >
        <div className="relative" style={{ width: outerWidth || "100%", height: naturalHeight * scale }}>
          {/* Scaled, non-interactive faithful render of the real homepage. */}
          <div
            ref={innerRef}
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: virtualWidth, transform: `scale(${scale})`, pointerEvents: "none" }}
          >
            <DynamicHomeSections sections={sections} showAll />
          </div>

          {/* Un-scaled overlay layer: selection chrome, toolbars, insert zones. */}
          <div className="pointer-events-none absolute inset-0">
            {/* Top insert zone */}
            <div
              className="group pointer-events-auto absolute left-0 right-0 flex h-4 items-center justify-center"
              style={{ top: 0 }}
            >
              <div className="absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 bg-primary/40 group-hover:block" />
              <div className="relative hidden group-hover:block">{insertMenu(0, "strip")}</div>
            </div>

            {rects.map((rect, index) => {
              const section = sectionById.get(rect.id)
              if (!section) return null
              const isSelected = selectedSectionId === rect.id
              const isHovered = hoveredSectionId === rect.id
              const disabled = !section.enabled
              const top = rect.top * scale
              const height = rect.height * scale
              const ringClass = isSelected
                ? "ring-2 ring-primary bg-primary/5"
                : isHovered
                  ? "ring-2 ring-primary/50 bg-primary/5"
                  : "ring-0 ring-primary/0 hover:ring-2 hover:ring-primary/30 hover:bg-primary/5"

              return (
                <div key={rect.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${t("admin_home_layout.actions.edit")}: ${typeLabel(section.type)}`}
                    onClick={() => onSelect(rect.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        onSelect(rect.id)
                      }
                    }}
                    onMouseEnter={() => onHover(rect.id)}
                    onMouseLeave={() => onHover(null)}
                    onDragOver={(event) => {
                      if (!draggedId || draggedId === rect.id) return
                      event.preventDefault()
                      const box = event.currentTarget.getBoundingClientRect()
                      const pos = event.clientY < box.top + box.height / 2 ? "before" : "after"
                      setDropTarget({ id: rect.id, pos })
                    }}
                    onDrop={(event) => {
                      if (!draggedId || draggedId === rect.id) return
                      event.preventDefault()
                      onReorder(draggedId, rect.id, dropTarget?.pos ?? "before")
                      setDraggedId(null)
                      setDropTarget(null)
                    }}
                    className={`group pointer-events-auto absolute left-0 right-0 cursor-pointer ring-inset transition ${ringClass}`}
                    style={{ top, height }}
                  >
                    {/* Dim veil for hidden sections */}
                    {disabled ? <div className="absolute inset-0 bg-background/55" /> : null}

                    {/* Drop indicator */}
                    {dropTarget?.id === rect.id ? (
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-primary"
                        style={dropTarget.pos === "before" ? { top: 0 } : { bottom: 0 }}
                      />
                    ) : null}

                    {/* Label chip */}
                    <div
                      className={`pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition ${
                        isSelected || isHovered
                          ? "bg-primary text-primary-foreground"
                          : "bg-background/80 text-foreground opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <span>#{section.order}</span>
                      <span>{typeLabel(section.type)}</span>
                      {disabled ? (
                        <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                          {t("admin_home_layout.preview.hidden_badge")}
                        </span>
                      ) : null}
                    </div>

                    {/* Floating toolbar */}
                    <div
                      className={`absolute right-2 top-2 flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm transition ${
                        isSelected || isHovered ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          setDraggedId(rect.id)
                          event.dataTransfer.effectAllowed = "move"
                        }}
                        onDragEnd={() => {
                          setDraggedId(null)
                          setDropTarget(null)
                        }}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={t("admin_home_layout.actions.move_up")}
                        className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                      <ToolbarButton
                        icon={<Pencil className="h-3.5 w-3.5" />}
                        label={t("admin_home_layout.actions.edit")}
                        onClick={() => onSelect(rect.id)}
                      />
                      <ToolbarButton
                        icon={section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        label={t("admin_home_layout.actions.toggle_visibility")}
                        onClick={() => onToggleEnabled(rect.id)}
                      />
                      <ToolbarButton
                        icon={<Copy className="h-3.5 w-3.5" />}
                        label={t("admin_home_layout.actions.duplicate")}
                        onClick={() => onDuplicate(rect.id)}
                      />
                      <ToolbarButton
                        icon={<ArrowUp className="h-3.5 w-3.5" />}
                        label={t("admin_home_layout.actions.move_up")}
                        disabled={index === 0}
                        onClick={() => onMove(rect.id, "up")}
                      />
                      <ToolbarButton
                        icon={<ArrowDown className="h-3.5 w-3.5" />}
                        label={t("admin_home_layout.actions.move_down")}
                        disabled={index === rects.length - 1}
                        onClick={() => onMove(rect.id, "down")}
                      />
                      <ToolbarButton
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        label={t("admin_home_layout.actions.remove_section")}
                        destructive
                        onClick={() => onDelete(rect.id)}
                      />
                    </div>
                  </div>

                  {/* Insert zone after this section */}
                  <div
                    className="group pointer-events-auto absolute left-0 right-0 flex h-4 -translate-y-1/2 items-center justify-center"
                    style={{ top: top + height }}
                  >
                    <div className="absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 bg-primary/40 group-hover:block" />
                    <div className="relative hidden group-hover:block">{insertMenu(index + 1, "strip")}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`flex h-6 w-6 items-center justify-center rounded transition disabled:opacity-30 ${
        destructive ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {icon}
    </button>
  )
}
