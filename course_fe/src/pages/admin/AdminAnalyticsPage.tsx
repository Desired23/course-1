import { AnalyticsCharts } from "../../components/AnalyticsCharts"
import { BarChart3 } from "lucide-react"

export function AdminAnalyticsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-medium">Platform Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Comprehensive analytics and insights for the entire platform
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <AnalyticsCharts type="platform" />
    </div>
  )
}
