import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  BookOpen,
  Clock,
  FileText,
  Code,
  HelpCircle,
  Video,
} from 'lucide-react'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'

interface Lesson {
  id: number
  title: string
  type: string
  content_type?: string
  duration: string
}

interface Section {
  id: number
  title: string
  lessons: Lesson[]
}

interface CourseStatsHorizontalProps {
  sections: Section[]
}

export function CourseStatsHorizontal({ sections }: CourseStatsHorizontalProps) {
  const { t } = useTranslation()
  const totalSections = sections.length
  const totalLessons = sections.reduce((sum, section) => sum + section.lessons.length, 0)
  const videoCount = sections.reduce((sum, section) => sum + section.lessons.filter((l) => (l.content_type || l.type) === 'video').length, 0)
  const quizCount = sections.reduce((sum, section) => sum + section.lessons.filter((l) => (l.content_type || l.type) === 'quiz').length, 0)
  const codeCount = sections.reduce((sum, section) => sum + section.lessons.filter((l) => (l.content_type || l.type) === 'code').length, 0)

  const totalMinutes = sections.reduce((sum, section) => {
    return sum + section.lessons.reduce((lessonSum, lesson) => {
      const duration = lesson.duration || '0:00'
      const parts = duration.split(':').map(Number)
      if (parts.length === 2) {
        const [hours = 0, minutes = 0] = parts
        return lessonSum + (hours * 60) + minutes
      }
      return lessonSum
    }, 0)
  }, 0)

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  const stats = [
    { label: t('course_stats_horizontal.stats.sections'), value: totalSections, icon: BookOpen, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20' },
    { label: t('course_stats_horizontal.stats.total_lessons'), value: totalLessons, icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
    { label: t('course_stats_horizontal.stats.total_duration'), value: t('course_stats_horizontal.duration_format', { hours, minutes }), icon: Clock, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' },
  ]

  const contentTypes = [
    { label: t('course_stats_horizontal.content_types.videos'), count: videoCount, icon: Video, color: 'text-red-500', bgColor: 'bg-red-500/10' },
    { label: t('course_stats_horizontal.content_types.quizzes'), count: quizCount, icon: HelpCircle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    { label: t('course_stats_horizontal.content_types.code'), count: codeCount, icon: Code, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
            <Card className={`border ${stat.borderColor} hover:shadow-md transition-all cursor-default`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5 truncate">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">{t('course_stats_horizontal.content_types_title')}</h4>
            </div>
            <div className="space-y-2">
              {contentTypes.map((type, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${type.bgColor}`}>
                      <type.icon className={`h-3.5 w-3.5 ${type.color}`} />
                    </div>
                    <span className="text-sm">{type.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {type.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
