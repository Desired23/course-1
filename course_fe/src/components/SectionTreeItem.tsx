import { Badge } from './ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from './ui/utils'
import { LessonTreeItem } from './LessonTreeItem'

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

interface SectionTreeItemProps {
  section: Section
  sectionIndex: number
  isExpanded: boolean
  selectedLesson: Lesson | null
  onToggle: () => void
  onSelectSection?: (sectionId: number) => void
  onSelectLesson: (lesson: Lesson) => void
  showCheckboxes?: boolean
  selectedLessonIds?: Set<number>
  onCheckLesson?: (lessonId: number, checked: boolean) => void
}

export function SectionTreeItem({
  section,
  sectionIndex,
  isExpanded,
  selectedLesson,
  onToggle,
  onSelectSection,
  onSelectLesson,
  showCheckboxes,
  selectedLessonIds,
  onCheckLesson
}: SectionTreeItemProps) {
  const publishedCount = section.lessons.filter(l => l.status === 'published').length
  const totalCount = section.lessons.length

  return (
    <div className="space-y-1">
      {/* Section Header */}
      <button
        onClick={() => {
          onToggle()
          onSelectSection?.(section.id)
        }}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-2.5 rounded-lg transition-all group",
          "hover:bg-muted/70 active:scale-[0.98]"
        )}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </motion.div>
        
        <span className="flex-1 text-left text-sm font-semibold truncate group-hover:text-foreground transition-colors">
          {sectionIndex + 1}. {section.title}
        </span>
        
        <div className="flex items-center gap-1.5">
          <Badge 
            variant="secondary" 
            className="text-xs px-1.5 py-0 h-5 font-medium"
          >
            {publishedCount}/{totalCount}
          </Badge>
        </div>
      </button>

      {/* Lessons */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-6 space-y-0.5 border-l-2 border-muted pl-2">
              {section.lessons.map((lesson, lessonIndex) => (
                <LessonTreeItem
                  key={lesson.id}
                  lesson={lesson}
                  lessonIndex={lessonIndex}
                  isSelected={selectedLesson?.id === lesson.id}
                  onSelect={() => onSelectLesson(lesson)}
                  showCheckbox={showCheckboxes}
                  isChecked={selectedLessonIds?.has(lesson.id) || false}
                  onCheck={(checked) => onCheckLesson?.(lesson.id, checked)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
