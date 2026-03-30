import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  BarChart3,
  BookOpen,
  CheckCircle,
  Clock,
  FileEdit,
  FileText,
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
  status: string
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
  const publishedCount = sections.reduce((sum, section) => sum + section.lessons.filter((l) => l.status === 'published').length, 0)
  const draftCount = sections.reduce((sum, section) => sum + section.lessons.filter((l) => l.status === 'draft').length, 0)
  const videoCount = sections.reduce((sum, section) => sum + section.lessons.filter((l) => (l.content_type || l.type) === 'video').length, 0)
  const textCount = sections.reduce(
    (sum, section) =>
      sum + section.lessons.filter((l) => {
        const type = l.content_type || l.type
        return type === 'text' || type === 'article'
      }).length,
    0,
  )
  const quizCount = sections.reduce((sum, section) => sum + section.lessons.filter((l) => (l.content_type || l.type) === 'quiz').length, 0)

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
  const completionRate = totalLessons > 0 ? Math.round((publishedCount / totalLessons) * 100) : 0

  const stats = [
    { label: t('course_stats_horizontal.stats.sections'), value: totalSections, icon: BookOpen, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20' },
    { label: t('course_stats_horizontal.stats.total_lessons'), value: totalLessons, icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
    { label: t('course_stats_horizontal.stats.published'), value: publishedCount, icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
    { label: t('course_stats_horizontal.stats.draft'), value: draftCount, icon: FileEdit, color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
    { label: t('course_stats_horizontal.stats.total_duration'), value: t('course_stats_horizontal.duration_format', { hours, minutes }), icon: Clock, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' },
    { label: t('course_stats_horizontal.stats.completion'), value: `${completionRate}%`, icon: BarChart3, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  ]

  const contentTypes = [
    { label: t('course_stats_horizontal.content_types.videos'), count: videoCount, icon: Video, color: 'text-red-500', bgColor: 'bg-red-500/10' },
    { label: t('course_stats_horizontal.content_types.articles'), count: textCount, icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: t('course_stats_horizontal.content_types.quizzes'), count: quizCount, icon: HelpCircle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
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

        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t('course_stats_horizontal.completion_progress')}</h4>
                <span className="text-sm font-semibold">{completionRate}%</span>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }} className="bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 h-full rounded-full" />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">{t('course_stats_horizontal.published_count', { count: publishedCount })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span className="text-muted-foreground">{t('course_stats_horizontal.draft_count', { count: draftCount })}</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground">{t('course_stats_horizontal.total_lessons_count', { count: totalLessons })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
