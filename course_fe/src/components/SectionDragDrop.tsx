import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardContent, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { GripVertical, Plus, Edit3, Trash2, MoreVertical, Copy, MoveUp, MoveDown } from 'lucide-react'
import { DraggableLessonCard } from './LessonDragDrop'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Badge } from './ui/badge'

interface Section {
  id: number
  title: string
  status?: 'Draft' | 'Published' | string
  lessons: any[]
}

interface DraggableSectionCardProps {
  section: Section
  index: number
  moveSection: (dragIndex: number, hoverIndex: number) => void
  moveLessonWithinSection: (sectionId: number, dragIndex: number, hoverIndex: number) => void
  moveLessonBetweenSections: (fromSectionId: number, toSectionId: number, lessonId: number, toIndex: number) => void
  onAddLesson: (sectionId: number) => void
  onEditSection: (section: Section) => void
  onDeleteSection: (sectionId: number) => void
  onUpdateSectionStatus?: (sectionId: number, status: 'Draft' | 'Published') => void
  onEditLesson: (lesson: any) => void
  onPreviewLesson: (lesson: any) => void
  onDeleteLesson: (lessonId: number) => void
  onGenerateTranscript?: (lesson: any) => void
  transcriptActionLessonId?: number | null
  selectedLessonId?: number
  onSelectLesson: (lesson: any) => void
  showAddLesson?: boolean
  addLessonContent?: React.ReactNode
}

const SECTION_TYPE = 'section'
const LESSON_TYPE = 'lesson'

export function DraggableSectionCard({
  section,
  index,
  moveSection,
  moveLessonWithinSection,
  moveLessonBetweenSections,
  onAddLesson,
  onEditSection,
  onDeleteSection,
  onUpdateSectionStatus,
  onEditLesson,
  onPreviewLesson,
  onDeleteLesson,
  onGenerateTranscript,
  transcriptActionLessonId,
  selectedLessonId,
  onSelectLesson,
  showAddLesson,
  addLessonContent
}: DraggableSectionCardProps) {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardContentRef = useRef<HTMLDivElement>(null)

  const [{ isDragging }, dragSection] = useDrag({
    type: SECTION_TYPE,
    item: { index, type: SECTION_TYPE },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const [, dropSection] = useDrop({
    accept: SECTION_TYPE,
    hover(item: { index: number, type: string }, monitor) {
      if (!sectionRef.current || item.type !== SECTION_TYPE) return

      const dragIndex = item.index
      const hoverIndex = index

      if (dragIndex === hoverIndex) return

      const hoverBoundingRect = sectionRef.current.getBoundingClientRect()
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset()

      if (!clientOffset) return

      const hoverClientY = clientOffset.y - hoverBoundingRect.top

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return

      moveSection(dragIndex, hoverIndex)
      item.index = hoverIndex
    }
  })

  const [{ isOver }, dropLesson] = useDrop({
    accept: LESSON_TYPE,
    drop: (item: { lessonId: number, sectionId: number, index: number }) => {
      if (!cardContentRef.current) return

      if (item.sectionId !== section.id) {
        moveLessonBetweenSections(
          item.sectionId,
          section.id,
          item.lessonId,
          section.lessons.length
        )
      }
    },
    canDrop: () => true,
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    })
  })

  dragSection(dropSection(sectionRef))
  dropLesson(cardContentRef)

  return (
    <div
      ref={sectionRef}
      id={`section-card-${section.id}`}
      data-section-id={section.id}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="transition-all duration-200"
    >
      <Card className={`transition-all duration-200 ${isOver ? 'ring-2 ring-primary shadow-lg scale-[1.01]' : ''} ${isDragging ? 'shadow-2xl' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 cursor-move group">
              <div className="transition-transform group-hover:scale-110">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <CardTitle className="transition-colors duration-200">
                  {t('section_drag_drop.section_title', { index: index + 1, title: section.title })}
                </CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {t('section_drag_drop.lesson_count', { count: section.lessons.length })}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={(section.status as 'Draft' | 'Published') || 'Draft'}
                onValueChange={(value: 'Draft' | 'Published') => onUpdateSectionStatus?.(section.id, value)}
              >
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">{t('section_drag_drop.status.draft')}</SelectItem>
                  <SelectItem value="Published">{t('section_drag_drop.status.published')}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddLesson(section.id)}
                className="transition-all duration-200 hover:scale-105"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('section_drag_drop.actions.add_lesson')}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEditSection(section)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    {t('section_drag_drop.actions.edit_section')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddLesson(section.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('section_drag_drop.actions.add_lesson')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4 mr-2" />
                    {t('section_drag_drop.actions.duplicate_section')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <MoveUp className="h-4 w-4 mr-2" />
                    {t('section_drag_drop.actions.move_up')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MoveDown className="h-4 w-4 mr-2" />
                    {t('section_drag_drop.actions.move_down')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm(t('section_drag_drop.actions.delete_confirm', { title: section.title, count: section.lessons.length }))) {
                        onDeleteSection(section.id)
                      }
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('section_drag_drop.actions.delete_section')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent ref={cardContentRef} className={`space-y-2 group ${section.lessons.length === 0 ? 'min-h-[120px]' : ''}`}>
          {section.lessons.map((lesson, lessonIndex) => (
            <DraggableLessonCard
              key={lesson.id}
              lesson={lesson}
              index={lessonIndex}
              sectionId={section.id}
              moveLesson={(dragIndex, hoverIndex) =>
                moveLessonWithinSection(section.id, dragIndex, hoverIndex)
              }
              moveLessonBetweenSections={moveLessonBetweenSections}
              onEdit={onEditLesson}
              onPreview={onPreviewLesson}
              onDelete={onDeleteLesson}
              onGenerateTranscript={onGenerateTranscript}
              transcriptActionLessonId={transcriptActionLessonId}
              isSelected={selectedLessonId === lesson.id}
              onClick={() => onSelectLesson(lesson)}
              sectionIndex={index}
            />
          ))}

          {section.lessons.length === 0 && !showAddLesson && (
            <div className={`min-h-[100px] flex items-center justify-center text-center border-2 border-dashed rounded-lg transition-all duration-200 ${
              isOver ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-muted-foreground/25'
            }`}>
              <p className="text-sm text-muted-foreground px-4">
                {isOver ? t('section_drag_drop.empty.drop_here') : t('section_drag_drop.empty.no_lessons')}
              </p>
            </div>
          )}

          {showAddLesson && addLessonContent}
        </CardContent>
      </Card>
    </div>
  )
}
