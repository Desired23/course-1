import React from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { AnalyticsCharts } from "../../components/AnalyticsCharts"
import { BarChart3 } from "lucide-react"

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

export function InstructorAnalyticsPage() {
  const { t } = useTranslation()
  return (
    <motion.div
      className="p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-8" variants={sectionStagger} initial="hidden" animate="show">

      <motion.div className="mb-8" variants={fadeInUp}>
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
      </motion.div>


      <motion.div variants={fadeInUp}>
        <AnalyticsCharts type="instructor" />
      </motion.div>
      </motion.div>
    </motion.div>
  )
}