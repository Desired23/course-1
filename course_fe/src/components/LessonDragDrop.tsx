import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { GripVertical, Play, FileText, HelpCircle, Clock, Edit3, Eye, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

interface Lesson {
  id: number
  title: string
  type: string
  duration: string
  status: string
  videoUrl?: string
  description?: string
  resources?: string[]
  questions?: number
}

interface DraggableLessonProps {
  lesson: Lesson
  index: number
  sectionId: number
  moveLesson: (dragIndex: number, hoverIndex: number) => void
  moveLessonBetweenSections?: (fromSectionId: number, toSectionId: number, lessonId: number, toIndex: number) => void
  onEdit: (lesson: Lesson) => void
  onPreview: (lesson: Lesson) => void
  onDelete: (lessonId: number) => void
  isSelected: boolean
  onClick: () => void
  sectionIndex: number
}

interface DragItem {
  lessonId: number
  sectionId: number
  index: number
  type: string
}

const LESSON_TYPE = 'lesson'

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'video':
      return <Play className="h-4 w-4" />
    case 'quiz':
      return <HelpCircle className="h-4 w-4" />
    case 'article':
      return <FileText className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'published':
      return <Badge className="bg-green-500 hover:bg-green-600">Published</Badge>
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>
    case 'pending':
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function DraggableLessonCard({ 
  lesson, 
  index,
  sectionId,
  moveLesson,
  moveLessonBetweenSections,
  onEdit, 
  onPreview,
  onDelete,
  isSelected,
  onClick,
  sectionIndex
}: DraggableLessonProps) {
  const ref = useRef<HTMLDivElement>(null)
  
  const [{ handlerId, isOverCurrent }, drop] = useDrop<DragItem, void, { handlerId: any, isOverCurrent: boolean }>({
    accept: LESSON_TYPE,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
        isOverCurrent: monitor.isOver({ shallow: true })
      }
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return
      }
      
      const dragIndex = item.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (item.sectionId === sectionId && dragIndex === hoverIndex) {
        return
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect()

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

      // Determine mouse position
      const clientOffset = monitor.getClientOffset()

      if (!clientOffset) {
        return
      }

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top

      // Only perform the move when the mouse has crossed half of the items height
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }

      // Handle moving within the same section
      if (item.sectionId === sectionId) {
        moveLesson(dragIndex, hoverIndex)
        item.index = hoverIndex
      } else if (moveLessonBetweenSections) {
        // Handle moving between sections
        moveLessonBetweenSections(item.sectionId, sectionId, item.lessonId, hoverIndex)
        item.sectionId = sectionId
        item.index = hoverIndex
      }
    },
  })

  const [{ isDragging }, drag] = useDrag({
    type: LESSON_TYPE,
    item: () => {
      return { lessonId: lesson.id, sectionId, index, type: LESSON_TYPE }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const opacity = isDragging ? 0.3 : 1
  drag(drop(ref))

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      style={{ opacity }}
      className={`group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:bg-muted/50 hover:shadow-sm ${
        isSelected ? 'bg-muted border-primary shadow-sm' : ''
      } ${isOverCurrent && !isDragging ? 'border-primary border-2' : ''}`}
      onClick={onClick}
    >
      <div className="cursor-grab active:cursor-grabbing transition-transform hover:scale-110">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="text-sm text-muted-foreground w-8">
        {index + 1}.
      </span>
      
      <div className="flex items-center gap-2 flex-1">
        <span className="transition-transform duration-200">{getTypeIcon(lesson.type)}</span>
        <span className="transition-colors duration-200">{lesson.title}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{lesson.duration}</span>
        </div>
        {getStatusBadge(lesson.status)}
      </div>
      
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-primary/10 transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(lesson)
          }}
        >
          <Edit3 className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 w-8 p-0 hover:bg-primary/10 transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation()
            onPreview(lesson)
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 w-8 p-0 hover:bg-destructive/10 transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm('Delete this lesson?')) {
              onDelete(lesson.id)
            }
          }}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  )
}