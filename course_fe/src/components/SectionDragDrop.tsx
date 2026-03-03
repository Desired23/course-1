import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { Card, CardHeader, CardContent, CardTitle } from './ui/card'
import { Button } from './ui/button'
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
  onEditLesson: (lesson: any) => void
  onPreviewLesson: (lesson: any) => void
  onDeleteLesson: (lessonId: number) => void
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
  onEditLesson,
  onPreviewLesson,
  onDeleteLesson,
  selectedLessonId,
  onSelectLesson,
  showAddLesson,
  addLessonContent
}: DraggableSectionCardProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardContentRef = useRef<HTMLDivElement>(null)

  // Drag configuration for section
  const [{ isDragging }, dragSection] = useDrag({
    type: SECTION_TYPE,
    item: { index, type: SECTION_TYPE },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  // Drop configuration for section (reordering sections)
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

      // Only perform the move when the mouse has crossed half of the items height
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return

      moveSection(dragIndex, hoverIndex)
      item.index = hoverIndex
    }
  })

  // Drop configuration for lessons (accept lessons from any section)
  const [{ isOver, canDrop }, dropLesson] = useDrop({
    accept: LESSON_TYPE,
    drop: (item: { lessonId: number, sectionId: number, index: number }, monitor) => {
      if (!cardContentRef.current) return

      // Always allow drop - if dropping in a different section, move to end
      if (item.sectionId !== section.id) {
        moveLessonBetweenSections(
          item.sectionId,
          section.id,
          item.lessonId,
          section.lessons.length
        )
      }
    },
    canDrop: () => true, // Always allow drop
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop()
    })
  })

  // Combine drag and drop refs for section
  dragSection(dropSection(sectionRef))
  
  // Apply drop ref to card content for lesson drops
  dropLesson(cardContentRef)

  return (
    <div
      ref={sectionRef}
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
                <CardTitle className="transition-colors duration-200">Section {index + 1}: {section.title}</CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {section.lessons.length} {section.lessons.length === 1 ? 'lesson' : 'lessons'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddLesson(section.id)}
                className="transition-all duration-200 hover:scale-105"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Lesson
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
                    Edit Section
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddLesson(section.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Lesson
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Section
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <MoveUp className="h-4 w-4 mr-2" />
                    Move Up
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MoveDown className="h-4 w-4 mr-2" />
                    Move Down
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      if (confirm(`Delete section "${section.title}"? This will delete all ${section.lessons.length} lessons inside.`)) {
                        onDeleteSection(section.id)
                      }
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Section
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
                {isOver ? '✨ Drop lesson here!' : 'No lessons yet. Add your first lesson or drag one here!'}
              </p>
            </div>
          )}

          {/* Add Lesson Form */}
          {showAddLesson && addLessonContent}
        </CardContent>
      </Card>
    </div>
  )
}