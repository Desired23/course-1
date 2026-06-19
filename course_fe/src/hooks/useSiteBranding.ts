import { useEffect, useState } from "react"
import { getApiTransportHeaders } from "../services/http"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"

const DEFAULT_SITE_NAME = "coursePlatform"
const DEFAULT_SITE_LOGO = ""

export function useSiteBranding() {
  const [siteName, setSiteName] = useState(DEFAULT_SITE_NAME)
  const [siteLogo, setSiteLogo] = useState(DEFAULT_SITE_LOGO)
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const loadBranding = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/platform-settings/public/branding/`, {
          method: "GET",
          headers: { "Content-Type": "application/json", ...getApiTransportHeaders() },
        })
        if (!response.ok || cancelled) return

        const data = await response.json()
        const nextName = String(data.site_name ?? "").trim()
        const nextLogo = String(data.site_logo ?? "").trim()

        if (nextName) setSiteName(nextName)
        if (nextLogo) setSiteLogo(nextLogo)
        if (data.social_links && typeof data.social_links === "object") {
          setSocialLinks(data.social_links as Record<string, string>)
        }
      } catch {
        // network error — keep defaults
      }
    }

    void loadBranding()
    return () => {
      cancelled = true
    }
  }, [])

  return { siteName, siteLogo, socialLinks }
}
