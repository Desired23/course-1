export type HomeLocale = "vi" | "en"

export type HomeSectionType =
  | "hero"
  | "course_list"
  | "promo_banner"
  | "badge_strip"
  | "feature_grid"
  | "testimonial"
  | "stats"
  | "newsletter"
  | "custom_html"
  | "legacy_component"

export interface LocalizedText {
  vi?: string
  en?: string
}

export interface HomeSectionLayout {
  container: "default" | "wide" | "full"
  spacing_top: "sm" | "md" | "lg"
  spacing_bottom: "sm" | "md" | "lg"
  background: "none" | "muted" | "brand"
}

export interface HomeSectionDisplayRules {
  devices: Array<"mobile" | "desktop">
  audience: "all" | "guest" | "logged_in"
}

export interface HomeSection {
  id: string
  type: HomeSectionType
  enabled: boolean
  order: number
  layout: HomeSectionLayout
  content: Record<string, unknown>
  data_source: Record<string, unknown>
  display_rules: HomeSectionDisplayRules
}

export interface HomeSchemaV2 {
  version: 2
  meta: {
    updated_at: string
    updated_by: number
  }
  sections: HomeSection[]
}

const DEFAULT_LAYOUT: HomeSectionLayout = {
  container: "default",
  spacing_top: "md",
  spacing_bottom: "md",
  background: "none",
}

const DEFAULT_DISPLAY_RULES: HomeSectionDisplayRules = {
  devices: ["mobile", "desktop"],
  audience: "all",
}

const DEFAULT_LEGACY_LAYOUT = [
  { component: "HeroSection", enabled: true, order: 1 },
  { component: "TrustedCompanies", enabled: true, order: 2 },
  { component: "FeaturesSection", enabled: true, order: 3 },
  { component: "Categories", enabled: true, order: 4 },
  { component: "FeaturedCourses", enabled: true, order: 5 },
  { component: "LearningGoals", enabled: true, order: 6 },
  { component: "TrendingCourses", enabled: true, order: 7 },
  { component: "PopularSkills", enabled: true, order: 8 },
  { component: "TestimonialsSection", enabled: true, order: 9 },
  { component: "StatsSection", enabled: true, order: 10 },
  { component: "InstructorPromo", enabled: true, order: 11 },
  { component: "NewsletterSection", enabled: true, order: 12 },
]

export const LEGACY_COMPONENT_NAMES = DEFAULT_LEGACY_LAYOUT.map((item) => item.component)

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => asNumber(item, Number.NaN))
    .filter((item) => Number.isFinite(item))
}

function normalizeLocalizedText(value: unknown): LocalizedText {
  if (typeof value === "string") {
    return { vi: value, en: value }
  }

  const record = asRecord(value)
  return {
    vi: asString(record.vi),
    en: asString(record.en),
  }
}

function normalizeLayout(value: unknown): HomeSectionLayout {
  const record = asRecord(value)
  const container = asString(record.container, DEFAULT_LAYOUT.container)
  const spacingTop = asString(record.spacing_top, DEFAULT_LAYOUT.spacing_top)
  const spacingBottom = asString(record.spacing_bottom, DEFAULT_LAYOUT.spacing_bottom)
  const background = asString(record.background, DEFAULT_LAYOUT.background)

  return {
    container: ["default", "wide", "full"].includes(container)
      ? (container as HomeSectionLayout["container"])
      : DEFAULT_LAYOUT.container,
    spacing_top: ["sm", "md", "lg"].includes(spacingTop)
      ? (spacingTop as HomeSectionLayout["spacing_top"])
      : DEFAULT_LAYOUT.spacing_top,
    spacing_bottom: ["sm", "md", "lg"].includes(spacingBottom)
      ? (spacingBottom as HomeSectionLayout["spacing_bottom"])
      : DEFAULT_LAYOUT.spacing_bottom,
    background: ["none", "muted", "brand"].includes(background)
      ? (background as HomeSectionLayout["background"])
      : DEFAULT_LAYOUT.background,
  }
}

function normalizeDisplayRules(value: unknown): HomeSectionDisplayRules {
  const record = asRecord(value)
  const devices = asStringArray(record.devices)
  const normalizedDevices = devices.filter(
    (item): item is "mobile" | "desktop" => item === "mobile" || item === "desktop",
  )
  const audience = asString(record.audience, DEFAULT_DISPLAY_RULES.audience)

  return {
    devices: normalizedDevices.length > 0 ? normalizedDevices : DEFAULT_DISPLAY_RULES.devices,
    audience: ["all", "guest", "logged_in"].includes(audience)
      ? (audience as HomeSectionDisplayRules["audience"])
      : DEFAULT_DISPLAY_RULES.audience,
  }
}

function normalizeCourseMode(value: unknown): "auto" | "manual" | "hybrid" {
  const mode = asString(value, "hybrid")
  return ["auto", "manual", "hybrid"].includes(mode)
    ? (mode as "auto" | "manual" | "hybrid")
    : "hybrid"
}

function createDefaultsByType(type: HomeSectionType): {
  content: Record<string, unknown>
  data_source: Record<string, unknown>
} {
  switch (type) {
    case "hero":
      return {
        content: {
          badge: { vi: "Hoc truc tuyen", en: "Online Learning" },
          title: { vi: "Nang cap ky nang moi ngay", en: "Upgrade Your Skills Daily" },
          subtitle: {
            vi: "Kham pha khoa hoc chat luong cao va bat dau lo trinh hoc cua ban.",
            en: "Discover high-quality courses and start your learning journey.",
          },
          primary_cta_label: { vi: "Kham pha khoa hoc", en: "Explore Courses" },
          primary_cta_link: "/courses",
          secondary_cta_label: { vi: "Dang ky", en: "Sign Up" },
          secondary_cta_link: "/signup",
          image_url: "",
          show_search: true,
          show_stats: true,
        },
        data_source: {},
      }
    case "course_list":
      return {
        content: {
          heading: { vi: "Khoa hoc noi bat", en: "Featured Courses" },
          subheading: {
            vi: "Lua chon pho bien tu giang vien hang dau",
            en: "Popular picks from top instructors",
          },
          view_all_label: { vi: "Xem tat ca", en: "View all" },
          view_all_link: "/courses",
        },
        data_source: {
          mode: "hybrid",
          filters: {
            category_ids: [],
            topic_ids: [],
            level: "",
            rating_min: 0,
            price_type: "all",
            is_featured: true,
          },
          sort: "featured",
          limit: 8,
          pinned_course_ids: [],
        },
      }
    case "promo_banner":
      return {
        content: {
          title: { vi: "Uu dai moi tuan", en: "Weekly Promotion" },
          description: {
            vi: "Nhan uu dai dac biet cho khoa hoc va goi dich vu.",
            en: "Get special offers for courses and subscriptions.",
          },
          cta_label: { vi: "Xem uu dai", en: "View Offer" },
          cta_link: "/courses",
          image_url: "",
          style_variant: "solid",
        },
        data_source: {},
      }
    case "badge_strip":
      return {
        content: {
          heading: { vi: "Ly do hoc tai day", en: "Why Learn Here" },
          subheading: { vi: "Loi ich noi bat", en: "Key benefits" },
          items: [
            { icon: "Award", label: { vi: "Chung chi", en: "Certificate" }, sublabel: { vi: "Sau khi hoan thanh", en: "After completion" } },
            { icon: "Users", label: { vi: "Cong dong", en: "Community" }, sublabel: { vi: "Nguoi hoc toan cau", en: "Global learners" } },
          ],
        },
        data_source: {},
      }
    case "feature_grid":
      return {
        content: {
          heading: { vi: "Tinh nang noi bat", en: "Key Features" },
          subheading: { vi: "Nen tang hoc tap linh hoat", en: "Flexible learning platform" },
          items: [
            {
              icon: "Zap",
              title: { vi: "Hoc moi luc", en: "Learn Anytime" },
              description: { vi: "Noi dung cap nhat lien tuc", en: "Content updated regularly" },
            },
            {
              icon: "Shield",
              title: { vi: "Truy cap tron doi", en: "Lifetime Access" },
              description: { vi: "Hoc theo toc do rieng", en: "Study at your own pace" },
            },
          ],
        },
        data_source: {},
      }
    case "testimonial":
      return {
        content: {
          heading: { vi: "Hoc vien noi gi", en: "What Learners Say" },
          subheading: { vi: "Phan hoi thuc te", en: "Real feedback" },
          items: [],
        },
        data_source: {},
      }
    case "stats":
      return {
        content: {
          heading: { vi: "Con so an tuong", en: "Impressive Stats" },
          subheading: { vi: "Tu du lieu nen tang", en: "From platform data" },
          use_public_stats: true,
          items: [],
        },
        data_source: {},
      }
    case "newsletter":
      return {
        content: {
          title: { vi: "Nhan ban tin tuan", en: "Get Weekly Updates" },
          subtitle: {
            vi: "Nhan thong bao khoa hoc moi va uu dai moi nhat.",
            en: "Receive new courses and latest promotions.",
          },
          email_placeholder: { vi: "Nhap email cua ban", en: "Enter your email" },
          subscribe_label: { vi: "Dang ky", en: "Subscribe" },
          privacy_note: {
            vi: "Chung toi ton trong quyen rieng tu cua ban.",
            en: "We respect your privacy.",
          },
        },
        data_source: {},
      }
    case "custom_html":
      return {
        content: {
          title: { vi: "Noi dung tuy bien", en: "Custom Content" },
          html: "<div class='container mx-auto py-12'><h2>Custom section</h2></div>",
        },
        data_source: {},
      }
    case "legacy_component":
    default:
      return {
        content: {},
        data_source: {
          component: "",
        },
      }
  }
}

export function createDefaultSection(type: HomeSectionType, order = 1): HomeSection {
  const defaults = createDefaultsByType(type)
  return {
    id: createId(type),
    type,
    enabled: true,
    order,
    layout: { ...DEFAULT_LAYOUT },
    content: defaults.content,
    data_source: defaults.data_source,
    display_rules: { ...DEFAULT_DISPLAY_RULES },
  }
}

function normalizeSectionContent(type: HomeSectionType, value: unknown): Record<string, unknown> {
  const input = asRecord(value)
  const defaults = createDefaultsByType(type).content
  const merged = { ...defaults, ...input }

  switch (type) {
    case "hero":
      return {
        ...merged,
        badge: normalizeLocalizedText(merged.badge),
        title: normalizeLocalizedText(merged.title),
        subtitle: normalizeLocalizedText(merged.subtitle),
        primary_cta_label: normalizeLocalizedText(merged.primary_cta_label),
        primary_cta_link: asString(merged.primary_cta_link, "/courses"),
        secondary_cta_label: normalizeLocalizedText(merged.secondary_cta_label),
        secondary_cta_link: asString(merged.secondary_cta_link, "/signup"),
        image_url: asString(merged.image_url),
        show_search: asBoolean(merged.show_search, true),
        show_stats: asBoolean(merged.show_stats, true),
      }
    case "course_list":
      return {
        ...merged,
        heading: normalizeLocalizedText(merged.heading),
        subheading: normalizeLocalizedText(merged.subheading),
        view_all_label: normalizeLocalizedText(merged.view_all_label),
        view_all_link: asString(merged.view_all_link, "/courses"),
      }
    case "promo_banner":
      return {
        ...merged,
        title: normalizeLocalizedText(merged.title),
        description: normalizeLocalizedText(merged.description),
        cta_label: normalizeLocalizedText(merged.cta_label),
        cta_link: asString(merged.cta_link, "/courses"),
        image_url: asString(merged.image_url),
        style_variant: asString(merged.style_variant, "solid"),
      }
    case "badge_strip":
    case "feature_grid":
    case "testimonial":
    case "stats":
    case "newsletter":
    case "custom_html":
      return merged
    case "legacy_component":
    default:
      return merged
  }
}

function normalizeSectionDataSource(type: HomeSectionType, value: unknown): Record<string, unknown> {
  const input = asRecord(value)
  const defaults = createDefaultsByType(type).data_source
  const merged = { ...defaults, ...input }

  if (type === "course_list") {
    const filters = asRecord(merged.filters)
    return {
      mode: normalizeCourseMode(merged.mode),
      filters: {
        category_ids: asNumberArray(filters.category_ids),
        topic_ids: asNumberArray(filters.topic_ids),
        level: asString(filters.level),
        rating_min: asNumber(filters.rating_min, 0),
        price_type: ["all", "free", "paid"].includes(asString(filters.price_type, "all"))
          ? asString(filters.price_type, "all")
          : "all",
        is_featured: asBoolean(filters.is_featured, false),
      },
      sort: asString(merged.sort, "featured"),
      limit: Math.max(1, Math.min(24, asNumber(merged.limit, 8))),
      pinned_course_ids: asNumberArray(merged.pinned_course_ids),
    }
  }

  if (type === "legacy_component") {
    return {
      component: asString(merged.component),
    }
  }

  return merged
}

function hasLocalizedText(value: unknown): boolean {
  const text = normalizeLocalizedText(value)
  return Boolean(text.vi || text.en)
}

export function validateHomeSection(section: HomeSection): string[] {
  const errors: string[] = []
  const content = asRecord(section.content)
  const dataSource = asRecord(section.data_source)

  if (!section.id) errors.push("section.id is required")
  if (section.order <= 0) errors.push("section.order must be > 0")

  switch (section.type) {
    case "hero":
      if (!hasLocalizedText(content.title)) errors.push("hero.title (vi/en) is required")
      if (!hasLocalizedText(content.subtitle)) errors.push("hero.subtitle (vi/en) is required")
      if (!asString(content.primary_cta_link)) errors.push("hero.primary_cta_link is required")
      break
    case "course_list": {
      if (!hasLocalizedText(content.heading)) errors.push("course_list.heading (vi/en) is required")
      const mode = asString(dataSource.mode, "hybrid")
      if (!["auto", "manual", "hybrid"].includes(mode)) errors.push("course_list.mode is invalid")
      const limit = asNumber(dataSource.limit, 0)
      if (limit <= 0) errors.push("course_list.limit must be > 0")
      if (limit > 24) errors.push("course_list.limit must be <= 24")
      const filters = asRecord(dataSource.filters)
      const ratingMin = asNumber(filters.rating_min, 0)
      if (ratingMin < 0 || ratingMin > 5) errors.push("course_list.filters.rating_min must be in [0, 5]")
      const priceType = asString(filters.price_type, "all")
      if (!["all", "free", "paid"].includes(priceType)) errors.push("course_list.filters.price_type is invalid")
      break
    }
    case "promo_banner":
      if (!hasLocalizedText(content.title)) errors.push("promo_banner.title (vi/en) is required")
      if (!asString(content.cta_link)) errors.push("promo_banner.cta_link is required")
      break
    case "badge_strip": {
      const items = Array.isArray(content.items) ? content.items : []
      if (items.length === 0) errors.push("badge_strip.items should not be empty")
      break
    }
    case "feature_grid": {
      const items = Array.isArray(content.items) ? content.items : []
      if (items.length === 0) errors.push("feature_grid.items should not be empty")
      break
    }
    case "testimonial": {
      const items = Array.isArray(content.items) ? content.items : []
      for (const [index, row] of items.entries()) {
        const record = asRecord(row)
        const rating = asNumber(record.rating, 5)
        if (rating < 1 || rating > 5) errors.push(`testimonial.items[${index}].rating must be in [1, 5]`)
      }
      break
    }
    case "stats":
      if (content.use_public_stats === false) {
        const items = Array.isArray(content.items) ? content.items : []
        if (items.length === 0) errors.push("stats.items should not be empty when use_public_stats=false")
      }
      break
    case "newsletter":
      if (!hasLocalizedText(content.title)) errors.push("newsletter.title (vi/en) is required")
      if (!hasLocalizedText(content.subscribe_label)) errors.push("newsletter.subscribe_label (vi/en) is required")
      break
    case "custom_html":
      if (!asString(content.html)) errors.push("custom_html.html is required")
      break
    case "legacy_component": {
      const component = asString(dataSource.component)
      if (!LEGACY_COMPONENT_NAMES.includes(component)) {
        errors.push("legacy_component.component is invalid")
      }
      break
    }
    default:
      break
  }

  return errors
}

function normalizeSection(value: unknown, fallbackOrder: number): HomeSection | null {
  const record = asRecord(value)
  const typeRaw = asString(record.type, "legacy_component")
  const type: HomeSectionType = [
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
  ].includes(typeRaw)
    ? (typeRaw as HomeSectionType)
    : "legacy_component"

  if (typeRaw !== type && typeRaw) {
    console.warn(`[home-schema] Unknown section type: ${typeRaw}. Fallback to legacy_component.`)
  }

  const section = createDefaultSection(type, fallbackOrder)
  section.id = asString(record.id, section.id)
  section.enabled = asBoolean(record.enabled, true)
  section.order = asNumber(record.order, fallbackOrder)
  section.layout = normalizeLayout(record.layout)
  section.content = normalizeSectionContent(type, record.content)
  section.data_source = normalizeSectionDataSource(type, record.data_source)
  section.display_rules = normalizeDisplayRules(record.display_rules)

  return section
}

export function resolveLocalizedText(value: unknown, locale: string): string {
  const text = normalizeLocalizedText(value)
  const lang = locale.toLowerCase().startsWith("en") ? "en" : "vi"
  if (lang === "en") return text.en || text.vi || ""
  return text.vi || text.en || ""
}

export function normalizeHomeSchemaV2(value: unknown): HomeSchemaV2 {
  const record = asRecord(value)
  const sectionsRaw = Array.isArray(record.sections) ? record.sections : []
  const sections = sectionsRaw
    .map((section, index) => normalizeSection(section, index + 1))
    .filter((section): section is HomeSection => Boolean(section))
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({ ...section, order: index + 1 }))

  return {
    version: 2,
    meta: {
      updated_at: asString(asRecord(record.meta).updated_at, new Date().toISOString()),
      updated_by: asNumber(asRecord(record.meta).updated_by, 0),
    },
    sections,
  }
}

export function getDefaultHomeSchemaV2(): HomeSchemaV2 {
  return mapLegacyLayoutToSchema(DEFAULT_LEGACY_LAYOUT)
}

interface LegacySectionSetting {
  component: string
  enabled?: boolean
  order?: number
}

function mapLegacySection(component: string, order: number): HomeSection {
  if (component === "HeroSection") {
    const section = createDefaultSection("hero", order)
    section.layout = {
      ...section.layout,
      container: "full",
    }
    return section
  }

  if (component === "FeaturedCourses") {
    const section = createDefaultSection("course_list", order)
    section.content = {
      ...section.content,
      heading: { vi: "Khoa hoc noi bat", en: "Featured Courses" },
      subheading: { vi: "Lua chon noi bat", en: "Top picks" },
    }
    section.data_source = {
      ...section.data_source,
      sort: "featured",
      filters: {
        ...asRecord(section.data_source.filters),
        is_featured: true,
      },
    }
    return section
  }

  if (component === "TrendingCourses") {
    const section = createDefaultSection("course_list", order)
    section.content = {
      ...section.content,
      heading: { vi: "Khoa hoc thinh hanh", en: "Trending Courses" },
      subheading: { vi: "Dang duoc quan tam", en: "Most popular now" },
    }
    section.data_source = {
      ...section.data_source,
      sort: "popular",
      filters: {
        ...asRecord(section.data_source.filters),
        is_featured: false,
      },
    }
    return section
  }

  if (component === "NewsletterSection") {
    return createDefaultSection("newsletter", order)
  }

  if (component === "StatsSection") {
    return createDefaultSection("stats", order)
  }

  if (component === "TestimonialsSection") {
    return createDefaultSection("testimonial", order)
  }

  if (component === "FeaturesSection") {
    return createDefaultSection("feature_grid", order)
  }

  if (component === "PopularSkills") {
    return createDefaultSection("badge_strip", order)
  }

  const section = createDefaultSection("legacy_component", order)
  section.data_source = { component }
  return section
}

export function mapLegacyLayoutToSchema(
  layout: unknown,
  legacyConfig?: unknown,
): HomeSchemaV2 {
  const layoutItems = Array.isArray(layout)
    ? layout
        .map((item, index) => {
          const record = asRecord(item)
          return {
            component: asString(record.component),
            enabled: asBoolean(record.enabled, true),
            order: asNumber(record.order, index + 1),
          } as LegacySectionSetting
        })
        .filter((item) => item.component)
    : DEFAULT_LEGACY_LAYOUT

  const sections = layoutItems
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((item, index) => {
      const section = mapLegacySection(item.component, index + 1)
      section.enabled = item.enabled !== false
      return section
    })

  const schema = normalizeHomeSchemaV2({ version: 2, meta: {}, sections })

  const configRecord = asRecord(legacyConfig)
  const heroConfig = asRecord(configRecord.hero)
  if (Object.keys(heroConfig).length > 0) {
    const heroSection = schema.sections.find((section) => section.type === "hero")
    if (heroSection) {
      heroSection.enabled = asBoolean(heroConfig.enabled, heroSection.enabled)
      heroSection.content = {
        ...heroSection.content,
        title: normalizeLocalizedText(heroConfig.title),
        subtitle: normalizeLocalizedText(heroConfig.subtitle),
        primary_cta_label: normalizeLocalizedText(heroConfig.cta_primary),
        secondary_cta_label: normalizeLocalizedText(heroConfig.cta_secondary),
        image_url: asString(heroConfig.background_image),
        show_search: asBoolean(heroConfig.show_search, true),
        show_stats: asBoolean(heroConfig.show_stats, true),
      }
    }
  }

  return schema
}

export function serializeHomeSchemaV2(schema: HomeSchemaV2, updatedBy = 0): string {
  const normalized = normalizeHomeSchemaV2(schema)
  normalized.meta = {
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  }
  return JSON.stringify(normalized)
}
