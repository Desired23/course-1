import { Card } from './ui/card'
import { Badge } from './ui/badge'
import {
  Video,
  Code,
  HelpCircle,
  PlayCircle
} from 'lucide-react'
import { cn } from './ui/utils'
import { useTranslation } from 'react-i18next'

interface Lesson {
  id: number
  title: string
  type: string
  content_type?: string
  duration: string
  is_free?: boolean
}

interface Section {
  id: number
  title: string
  lessons: Lesson[]
}

interface QuickStatsPanelProps {
  sections: Section[]
  className?: string
}

export function QuickStatsPanel({ sections, className }: QuickStatsPanelProps) {
  const { t } = useTranslation()

  const allLessons = sections.flatMap(s => s.lessons)
  const totalLessons = allLessons.length


  const totalMinutes = allLessons.reduce((sum, lesson) => {
    const durationStr = lesson.duration

    let minutes = 0

    if (durationStr.includes(':')) {
      const [mins, secs] = durationStr.split(':').map(Number)
      minutes = mins + (secs / 60)
    } else if (durationStr.includes('min')) {
      minutes = parseInt(durationStr)
    } else if (durationStr.includes('h')) {
      const [hours, mins] = durationStr.split('h')
      minutes = parseInt(hours) * 60 + (mins ? parseInt(mins) : 0)
    }

    return sum + minutes
  }, 0)

  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)


  const contentTypeCounts = allLessons.reduce((acc, lesson) => {
    const type = lesson.content_type || lesson.type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const contentTypeStats = [
    { type: 'video', label: t('quick_stats.video'), icon: Video, count: contentTypeCounts.video || 0, color: 'text-purple-600 dark:text-purple-400' },
    { type: 'quiz', label: t('quick_stats.quiz'), icon: HelpCircle, count: contentTypeCounts.quiz || 0, color: 'text-orange-600 dark:text-orange-400' },
    { type: 'code', label: t('quick_stats.code'), icon: Code, count: contentTypeCounts.code || 0, color: 'text-red-600 dark:text-red-400' },
  ].filter(stat => stat.count > 0)

  return (
    <Card className={cn("p-4 space-y-4", className)}>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('quick_stats.title')}</h3>
        <PlayCircle className="h-4 w-4 text-muted-foreground" />
      </div>


      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">{t('quick_stats.total_lessons')}</p>
          <p className="text-2xl font-bold">{totalLessons}</p>
        </div>


        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">{t('quick_stats.total_duration')}</p>
          <p className="text-lg font-semibold">
            {hours > 0 && <span>{hours}h </span>}
            {minutes}m
          </p>
        </div>
      </div>


      {contentTypeStats.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('quick_stats.content_types')}</p>

          {contentTypeStats.map(stat => (
            <div key={stat.type} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                <span className="text-sm">{stat.label}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stat.count}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
