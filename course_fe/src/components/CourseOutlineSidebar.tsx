import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { cn } from './ui/utils'
import { SectionTreeItem } from './SectionTreeItem'

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

interface CourseOutlineSidebarProps {
  sections: Section[]
  selectedLesson: Lesson | null
  onSelectLesson: (lesson: Lesson) => void
  onSelectSection?: (sectionId: number) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  showCheckboxes?: boolean
  selectedLessonIds?: Set<number>
  onCheckLesson?: (lessonId: number, checked: boolean) => void
  onToggleBulkMode?: () => void
}

export function CourseOutlineSidebar({
  sections,
  selectedLesson,
  onSelectLesson,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
  showCheckboxes,
  selectedLessonIds,
  onCheckLesson,
  onToggleBulkMode,
}: CourseOutlineSidebarProps) {
  const { t } = useTranslation()
  const [expandedSections, setExpandedSections] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('instructor-expanded-sections')
      if (saved) {
        const parsedIds = JSON.parse(saved)
        return new Set(parsedIds)
      }
    } catch (error) {
      console.error('Failed to load expanded sections:', error)
    }
    return new Set(sections.map((s) => s.id))
  })

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      try {
        localStorage.setItem('instructor-expanded-sections', JSON.stringify(Array.from(newSet)))
      } catch (error) {
        console.error('Failed to save expanded sections:', error)
      }
      return newSet
    })
  }

  const collapseAll = () => {
    setExpandedSections(new Set())
    try {
      localStorage.setItem('instructor-expanded-sections', JSON.stringify([]))
    } catch (error) {
      console.error('Failed to save expanded sections:', error)
    }
  }

  const expandAll = () => {
    const allIds = new Set(sections.map((s) => s.id))
    setExpandedSections(allIds)
    try {
      localStorage.setItem('instructor-expanded-sections', JSON.stringify(Array.from(allIds)))
    } catch (error) {
      console.error('Failed to save expanded sections:', error)
    }
  }

  const totalLessons = sections.reduce((sum, section) => sum + section.lessons.length, 0)
  const completedLessons = sections.reduce(
    (sum, section) => sum + section.lessons.filter((l) => l.status === 'published').length,
    0,
  )

  const allExpanded = expandedSections.size === sections.length
  const allCollapsed = expandedSections.size === 0

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? '3rem' : '22rem' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'fixed right-0 top-0 h-screen border-l backdrop-blur-sm transition-colors z-40',
        isCollapsed ? 'bg-card/30' : 'bg-card/50',
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleCollapse}
        className={cn(
          'absolute z-10 h-10 w-10 rounded-full border bg-background p-0 shadow-md hover:shadow-lg transition-all',
          isCollapsed ? '-left-5 top-1/2 -translate-y-1/2 rotate-180' : '-left-4 top-1/2 -translate-y-1/2',
        )}
      >
        {isCollapsed ? <PanelRightClose className="h-8 w-8" /> : <PanelRightOpen className="h-8 w-8" />}
      </Button>

      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onToggleCollapse}
            className="flex flex-col items-center justify-start h-full pt-6 cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <div className="text-center space-y-4">
              <p className="text-2xl font-bold">{totalLessons}</p>
              <div className="h-32" />
              <p className="rotate-90 text-[28px] font-bold tracking-wider whitespace-nowrap mt-16">
                {t('course_outline_sidebar.lessons')}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t('course_outline_sidebar.title')}</h3>
                <Badge variant="outline" className="text-xs">
                  {completedLessons}/{totalLessons}
                </Badge>
              </div>

              {showCheckboxes && onToggleBulkMode && (
                <Button variant="outline" size="sm" onClick={onToggleBulkMode} className="w-full">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {t('course_outline_sidebar.exit_bulk_edit')}
                </Button>
              )}

              {!showCheckboxes && sections.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={expandAll}
                    disabled={allExpanded}
                    className="flex-1 h-8 text-xs"
                  >
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                    {t('course_outline_sidebar.expand_all')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={collapseAll}
                    disabled={allCollapsed}
                    className="flex-1 h-8 text-xs"
                  >
                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                    {t('course_outline_sidebar.collapse_all')}
                  </Button>
                </div>
              )}

              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all duration-300"
                  style={{ width: `${totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {sections.map((section, sectionIndex) => (
                <SectionTreeItem
                  key={section.id}
                  section={section}
                  sectionIndex={sectionIndex}
                  isExpanded={expandedSections.has(section.id)}
                  selectedLesson={selectedLesson}
                  onToggle={() => toggleSection(section.id)}
                  onSelectSection={onSelectSection}
                  onSelectLesson={onSelectLesson}
                  showCheckboxes={showCheckboxes}
                  selectedLessonIds={selectedLessonIds}
                  onCheckLesson={onCheckLesson}
                  onToggleCheckboxMode={onToggleBulkMode}
                />
              ))}

              {sections.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">{t('course_outline_sidebar.empty_title')}</p>
                  <p className="text-xs">{t('course_outline_sidebar.empty_description')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
