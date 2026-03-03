import React from 'react'
import { useTranslation } from 'react-i18next'
import { AnalyticsCharts } from "../../components/AnalyticsCharts"
import { BarChart3 } from "lucide-react"

export function InstructorAnalyticsPage() {
  const { t } = useTranslation()
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-medium">{t('instructor_analytics.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('instructor_analytics.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <AnalyticsCharts type="instructor" />
    </div>
  )
}