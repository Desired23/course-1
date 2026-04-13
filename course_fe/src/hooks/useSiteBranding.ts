import { useEffect, useState } from "react"
import { getSystemSettings } from "../services/admin.api"

const DEFAULT_SITE_NAME = "Udemy"
const DEFAULT_SITE_LOGO = ""

function readSettingValue(setting: any): string {
  return String(setting?.value ?? setting?.setting_value ?? "")
}

function readSettingKey(setting: any): string {
  return String(setting?.key ?? setting?.setting_key ?? "")
}

function canReadSystemSettings(): boolean {
  try {
    const raw = localStorage.getItem("auth-storage")
    if (!raw) return false

    const parsed = JSON.parse(raw)
    const roles = parsed?.state?.user?.roles
    return Array.isArray(roles) && roles.includes("admin")
  } catch {
    return false
  }
}

export function useSiteBranding() {
  const [siteName, setSiteName] = useState(DEFAULT_SITE_NAME)
  const [siteLogo, setSiteLogo] = useState(DEFAULT_SITE_LOGO)

  useEffect(() => {
    let cancelled = false
    const loadBranding = async () => {
      if (!canReadSystemSettings()) return

      try {
        const settings = await getSystemSettings()
        if (cancelled) return

        const map = new Map<string, any>()
        settings.forEach((setting: any) => {
          map.set(readSettingKey(setting), setting)
        })

        const nameSetting = map.get("site_name")
        const logoSetting = map.get("site_logo")

        const nextName = readSettingValue(nameSetting).trim()
        const nextLogo = readSettingValue(logoSetting).trim()

        if (nextName) setSiteName(nextName)
        if (nextLogo) setSiteLogo(nextLogo)
      } catch {

      }
    }

    void loadBranding()
    return () => {
      cancelled = true
    }
  }, [])

  return {
    siteName,
    siteLogo,
  }
}
