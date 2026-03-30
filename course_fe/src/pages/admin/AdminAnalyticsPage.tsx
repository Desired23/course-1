import { AnalyticsCharts } from "../../components/AnalyticsCharts"
import { BarChart3 } from "lucide-react"
import { useTranslation } from "react-i18next"

export function AdminAnalyticsPage() {
  const { t } = useTranslation()

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-medium">{t("admin_analytics.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin_analytics.subtitle")}</p>
          </div>
        </div>
      </div>

      <AnalyticsCharts type="platform" />
    </div>
  )
}
