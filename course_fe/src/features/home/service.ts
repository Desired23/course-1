import {
  createSystemSetting,
  getSystemSettings,
  updateSystemSetting,
  type SystemSetting,
} from "../../services/admin.api"
import { API_BASE_URL, getApiTransportHeaders } from "../../services/http"
import {
  createDefaultSection,
  getDefaultHomeSchemaV2,
  mapLegacyLayoutToSchema,
  normalizeHomeSchemaV2,
  serializeHomeSchemaV2,
  type HomeSchemaV2,
} from "./schema"

export const HOMEPAGE_SCHEMA_V2_KEY = "homepage_schema_v2"
export const HOMEPAGE_SCHEMA_V2_INITIAL_BACKUP_KEY = "homepage_schema_v2_initial_backup"
const HOMEPAGE_LAYOUT_KEY = "homepage_layout"
const HOMEPAGE_CONFIG_KEY = "homepage_config"
const LEGACY_COMPONENTS_DEFAULT_ORDER = [
  "HeroSection",
  "TrustedCompanies",
  "FeaturesSection",
  "Categories",
  "FeaturedCourses",
  "LearningGoals",
  "TrendingCourses",
  "PopularSkills",
  "TestimonialsSection",
  "StatsSection",
  "InstructorPromo",
  "NewsletterSection",
]

export interface HomeSchemaLoadResult {
  schema: HomeSchemaV2
  settingId: number | null
  source: "v2" | "legacy_layout" | "default"
}

function canReadAdminSystemSettings(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = window.localStorage.getItem("auth-storage")
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const roles = parsed?.state?.user?.roles
    return Array.isArray(roles) && roles.includes("admin")
  } catch {
    return false
  }
}

function parseJson(value: string | null | undefined): unknown {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function findByKey(settings: SystemSetting[], key: string): SystemSetting | null {
  return settings.find((item) => item.key === key) || null
}

type PublicHomeSettingsPayload = {
  homepage_schema_v2?: string
  homepage_layout?: string
  homepage_config?: string
}

async function getPublicHomeSettings(): Promise<PublicHomeSettingsPayload | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/systems_settings/public/homepage/`, {
      method: "GET",
      headers: {
        ...getApiTransportHeaders(),
      },
    })
    if (!response.ok) return null
    const data = (await response.json()) as PublicHomeSettingsPayload
    return data && typeof data === "object" ? data : null
  } catch {
    return null
  }
}

export async function loadHomeSchemaV2(): Promise<HomeSchemaLoadResult> {
  const publicSettings = await getPublicHomeSettings()
  if (publicSettings) {
    const parsedSchema = parseJson(publicSettings.homepage_schema_v2)
    if (parsedSchema) {
      try {
        return {
          schema: normalizeHomeSchemaV2(parsedSchema),
          settingId: null,
          source: "v2",
        }
      } catch {

      }
    }

    const legacyLayout = parseJson(publicSettings.homepage_layout)
    const legacyConfig = parseJson(publicSettings.homepage_config)
    if (legacyLayout || legacyConfig) {
      return {
        schema: mapLegacyLayoutToSchema(legacyLayout, legacyConfig),
        settingId: null,
        source: "legacy_layout",
      }
    }
  }


  if (!canReadAdminSystemSettings()) {
    return {
      schema: getDefaultHomeSchemaV2(),
      settingId: null,
      source: "default",
    }
  }

  const settings = await getSystemSettings()

  const schemaSetting = findByKey(settings, HOMEPAGE_SCHEMA_V2_KEY)
  const parsedSchema = parseJson(schemaSetting?.value)

  if (parsedSchema) {
    try {
      return {
        schema: normalizeHomeSchemaV2(parsedSchema),
        settingId: schemaSetting?.id || null,
        source: "v2",
      }
    } catch {

    }
  }

  const legacyLayoutSetting = findByKey(settings, HOMEPAGE_LAYOUT_KEY)
  const legacyConfigSetting = findByKey(settings, HOMEPAGE_CONFIG_KEY)
  const legacyLayout = parseJson(legacyLayoutSetting?.value)
  const legacyConfig = parseJson(legacyConfigSetting?.value)

  if (legacyLayout || legacyConfig) {
    return {
      schema: mapLegacyLayoutToSchema(legacyLayout, legacyConfig),
      settingId: schemaSetting?.id || null,
      source: "legacy_layout",
    }
  }

  return {
    schema: getDefaultHomeSchemaV2(),
    settingId: schemaSetting?.id || null,
    source: "default",
  }
}

export async function loadLegacyHomeSchemaV2(): Promise<{
  schema: HomeSchemaV2
  source: "legacy_settings" | "legacy_default"
}> {
  const settings = await getSystemSettings()
  const legacyLayoutSetting = findByKey(settings, HOMEPAGE_LAYOUT_KEY)
  const legacyConfigSetting = findByKey(settings, HOMEPAGE_CONFIG_KEY)
  const legacyLayout = parseJson(legacyLayoutSetting?.value)
  const legacyConfig = parseJson(legacyConfigSetting?.value)

  const hasLegacySettings = Boolean(legacyLayout || legacyConfig)
  return {
    schema: mapLegacyLayoutToSchema(legacyLayout, legacyConfig),
    source: hasLegacySettings ? "legacy_settings" : "legacy_default",
  }
}

export async function loadPreSchemaDrivenLegacySchemaV2(): Promise<{
  schema: HomeSchemaV2
  source: "legacy_settings" | "legacy_default"
}> {
  const settings = await getSystemSettings()
  const legacyLayoutSetting = findByKey(settings, HOMEPAGE_LAYOUT_KEY)
  const legacyLayout = parseJson(legacyLayoutSetting?.value)

  const layoutItems = Array.isArray(legacyLayout)
    ? legacyLayout
        .map((item, index) => {
          const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
          return {
            component: typeof row.component === "string" ? row.component : "",
            enabled: typeof row.enabled === "boolean" ? row.enabled : true,
            order:
              typeof row.order === "number" && Number.isFinite(row.order)
                ? row.order
                : index + 1,
          }
        })
        .filter((item) => item.component)
    : LEGACY_COMPONENTS_DEFAULT_ORDER.map((component, index) => ({
        component,
        enabled: true,
        order: index + 1,
      }))

  const sections = layoutItems
    .sort((a, b) => a.order - b.order)
    .map((item, index) => {
      const section = createDefaultSection("legacy_component", index + 1)
      section.enabled = item.enabled
      section.data_source = { component: item.component }
      return section
    })

  return {
    schema: normalizeHomeSchemaV2({ version: 2, meta: {}, sections }),
    source: Array.isArray(legacyLayout) ? "legacy_settings" : "legacy_default",
  }
}

export async function saveHomeSchemaV2(
  schema: HomeSchemaV2,
  settingId: number | null,
  updatedBy = 0,
): Promise<{ settingId: number }> {
  const value = serializeHomeSchemaV2(schema, updatedBy)

  if (settingId) {
    const updated = await updateSystemSetting(settingId, { value })
    return { settingId: updated.id }
  }

  const allSettings = await getSystemSettings()
  const existing = findByKey(allSettings, HOMEPAGE_SCHEMA_V2_KEY)

  if (existing) {
    const updated = await updateSystemSetting(existing.id, { value })
    return { settingId: updated.id }
  }

  const created = await createSystemSetting({
    key: HOMEPAGE_SCHEMA_V2_KEY,
    value,
    description: "Dynamic homepage schema v2",
  })

  return { settingId: created.id }
}

export async function ensureInitialHomeSchemaBackup(schema: HomeSchemaV2): Promise<void> {
  const allSettings = await getSystemSettings()
  const existing = findByKey(allSettings, HOMEPAGE_SCHEMA_V2_INITIAL_BACKUP_KEY)
  if (existing) return

  await createSystemSetting({
    key: HOMEPAGE_SCHEMA_V2_INITIAL_BACKUP_KEY,
    value: JSON.stringify(normalizeHomeSchemaV2(schema)),
    description: "Initial homepage schema v2 backup",
  })
}

export async function saveInitialHomeSchemaBackup(schema: HomeSchemaV2): Promise<void> {
  const allSettings = await getSystemSettings()
  const existing = findByKey(allSettings, HOMEPAGE_SCHEMA_V2_INITIAL_BACKUP_KEY)
  const value = JSON.stringify(normalizeHomeSchemaV2(schema))

  if (existing) {
    await updateSystemSetting(existing.id, { value })
    return
  }

  await createSystemSetting({
    key: HOMEPAGE_SCHEMA_V2_INITIAL_BACKUP_KEY,
    value,
    description: "Initial homepage schema v2 backup",
  })
}

export async function loadInitialHomeSchemaBackup(): Promise<HomeSchemaV2 | null> {
  const allSettings = await getSystemSettings()
  const backup = findByKey(allSettings, HOMEPAGE_SCHEMA_V2_INITIAL_BACKUP_KEY)
  const parsed = parseJson(backup?.value)
  if (!parsed) return null
  try {
    return normalizeHomeSchemaV2(parsed)
  } catch {
    return null
  }
}
