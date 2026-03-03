import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { 
  Video, 
  FileText, 
  HelpCircle, 
  ClipboardList, 
  File, 
  Link,
  CheckCircle,
  Clock
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

interface LessonTreeItemProps {
  lesson: Lesson
  lessonIndex: number
  isSelected: boolean
  isChecked?: boolean
  onSelect: () => void
  onCheck?: (checked: boolean) => void
  showCheckbox?: boolean
}

const LESSON_ICONS = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
  assignment: ClipboardList,
  file: File,
  link: Link,
}

const STATUS_CONFIG = {
  published: {
    label: 'Published',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    dotColor: 'bg-green-500'
  },
  draft: {
    label: 'Draft',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    dotColor: 'bg-gray-500'
  }
}

export function LessonTreeItem({
  lesson,
  lessonIndex,
  isSelected,
  onSelect,
  isChecked,
  onCheck,
  showCheckbox
}: LessonTreeItemProps) {
  const type = lesson.content_type || lesson.type
  const Icon = LESSON_ICONS[type as keyof typeof LESSON_ICONS] || FileText
  const statusConfig = STATUS_CONFIG[lesson.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleClick = () => {
    if (!showCheckbox) {
      onSelect()
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all group relative cursor-pointer",
        "hover:bg-muted/70 active:scale-[0.98]",
        isSelected && "bg-primary/10 border border-primary/30 shadow-sm ring-1 ring-primary/20"
      )}
    >
      {/* Checkbox (Left) */}
      {showCheckbox && (
        <div onClick={handleCheckboxClick} className="flex-shrink-0 pt-0.5">
          <Checkbox
            checked={isChecked}
            onCheckedChange={onCheck}
          />
        </div>
      )}

      {/* Icon */}
      <div className={cn(
        "p-1.5 rounded-md transition-all flex-shrink-0",
        isSelected 
          ? "bg-primary/20 text-primary" 
          : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
      )}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm truncate leading-snug",
            isSelected 
              ? "font-semibold text-primary" 
              : "font-medium group-hover:text-foreground"
          )}>
            {lessonIndex + 1}. {lesson.title}
          </p>
          
          {/* Status Badge */}
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 font-semibold flex-shrink-0 border",
              statusConfig.color,
              statusConfig.bgColor,
              statusConfig.borderColor
            )}
          >
            {lesson.status === 'published' ? (
              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
            ) : (
              <Clock className="h-2.5 w-2.5 mr-0.5" />
            )}
            {statusConfig.label}
          </Badge>
        </div>
        
        {/* Meta Info */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn(
            "text-xs transition-colors",
            isSelected ? "text-primary/70" : "text-muted-foreground"
          )}>
            {lesson.duration}
          </span>
          
          {lesson.is_free && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400"
            >
              Free Preview
            </Badge>
          )}
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}
    </div>
  )
}