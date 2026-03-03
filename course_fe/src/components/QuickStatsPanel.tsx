import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { 
  Video, 
  FileText, 
  HelpCircle, 
  ClipboardList,
  File,
  Link,
  CheckCircle,
  Clock,
  PlayCircle
} from 'lucide-react'
import { cn } from './ui/utils'

interface Lesson {
  id: number
  title: string
  type: string
  content_type?: string
  duration: string
  status: string
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
  // Calculate stats
  const allLessons = sections.flatMap(s => s.lessons)
  const totalLessons = allLessons.length
  const publishedLessons = allLessons.filter(l => l.status === 'published').length
  const draftLessons = allLessons.filter(l => l.status === 'draft').length
  
  // Calculate total duration
  const totalMinutes = allLessons.reduce((sum, lesson) => {
    const durationStr = lesson.duration
    // Parse duration like "5:30", "10 min", "1h 30m"
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
  
  // Count by content type
  const contentTypeCounts = allLessons.reduce((acc, lesson) => {
    const type = lesson.content_type || lesson.type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const contentTypeStats = [
    { type: 'video', label: 'Videos', icon: Video, count: contentTypeCounts.video || 0, color: 'text-purple-600 dark:text-purple-400' },
    { type: 'text', label: 'Articles', icon: FileText, count: contentTypeCounts.text || 0, color: 'text-blue-600 dark:text-blue-400' },
    { type: 'quiz', label: 'Quizzes', icon: HelpCircle, count: contentTypeCounts.quiz || 0, color: 'text-orange-600 dark:text-orange-400' },
    { type: 'assignment', label: 'Assignments', icon: ClipboardList, count: contentTypeCounts.assignment || 0, color: 'text-green-600 dark:text-green-400' },
    { type: 'file', label: 'Files', icon: File, count: contentTypeCounts.file || 0, color: 'text-gray-600 dark:text-gray-400' },
    { type: 'link', label: 'Links', icon: Link, count: contentTypeCounts.link || 0, color: 'text-cyan-600 dark:text-cyan-400' }
  ].filter(stat => stat.count > 0)
  
  return (
    <Card className={cn("p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Quick Stats</h3>
        <PlayCircle className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Total Lessons */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">Total Lessons</p>
          <p className="text-2xl font-bold">{totalLessons}</p>
        </div>
        
        {/* Duration */}
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">Total Duration</p>
          <p className="text-lg font-semibold">
            {hours > 0 && <span>{hours}h </span>}
            {minutes}m
          </p>
        </div>
      </div>
      
      {/* Status Breakdown */}
      <div className="space-y-2 pt-2 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm">Published</span>
          </div>
          <Badge 
            variant="outline" 
            className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
          >
            {publishedLessons}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm">Draft</span>
          </div>
          <Badge 
            variant="outline" 
            className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
          >
            {draftLessons}
          </Badge>
        </div>
      </div>
      
      {/* Content Type Breakdown */}
      {contentTypeStats.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content Types</p>
          
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
      
      {/* Completion Progress */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completion</p>
          <p className="text-sm font-semibold">
            {totalLessons > 0 ? Math.round((publishedLessons / totalLessons) * 100) : 0}%
          </p>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2.5">
          <div 
            className="bg-gradient-to-r from-primary to-primary/80 rounded-full h-2.5 transition-all duration-500"
            style={{ width: `${totalLessons > 0 ? (publishedLessons / totalLessons) * 100 : 0}%` }}
          />
        </div>
      </div>
    </Card>
  )
}
