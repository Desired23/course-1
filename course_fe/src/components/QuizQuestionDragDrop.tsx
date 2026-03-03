import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { GripVertical, Edit, Trash2, Image, Code } from 'lucide-react'

interface QuizQuestion {
  id: string
  question: string
  type: 'single' | 'multiple' | 'text'
  options?: string[]
  correctAnswer?: string | string[]
  points: number
  explanation?: string
  order: number
  image?: string
  code?: string
  codeLanguage?: string
}

interface DraggableQuestionProps {
  question: QuizQuestion
  index: number
  moveQuestion: (dragIndex: number, hoverIndex: number) => void
  onEdit: (question: QuizQuestion) => void
  onDelete: (questionId: string) => void
}

interface DragItem {
  id: string
  index: number
}

export function DraggableQuestionCard({ 
  question, 
  index, 
  moveQuestion, 
  onEdit, 
  onDelete 
}: DraggableQuestionProps) {
  const ref = useRef<HTMLDivElement>(null)
  
  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: any }>({
    accept: 'QUIZ_QUESTION',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      }
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return
      }
      const dragIndex = item.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
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
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }

      // Time to actually perform the action
      moveQuestion(dragIndex, hoverIndex)

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex
    },
  })

  const [{ isDragging }, drag] = useDrag({
    type: 'QUIZ_QUESTION',
    item: () => {
      return { id: question.id, index }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const opacity = isDragging ? 0.4 : 1
  drag(drop(ref))

  return (
    <Card 
      ref={ref}
      data-handler-id={handlerId}
      style={{ opacity }}
      className="cursor-move hover:shadow-md transition-shadow"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="mt-1 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline">{question.type}</Badge>
                  <Badge>{question.points} pts</Badge>
                  {question.image && (
                    <Badge variant="secondary" className="gap-1">
                      <Image className="h-3 w-3" />
                      Image
                    </Badge>
                  )}
                  {question.code && (
                    <Badge variant="secondary" className="gap-1">
                      <Code className="h-3 w-3" />
                      Code
                    </Badge>
                  )}
                </div>
                <p className="font-medium">Q{index + 1}. {question.question}</p>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(question)
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(question.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {question.options && (
              <ul className="text-sm text-muted-foreground ml-4 list-disc">
                {question.options.map((option, i) => (
                  <li 
                    key={i} 
                    className={
                      (typeof question.correctAnswer === 'string' && question.correctAnswer === option) ||
                      (Array.isArray(question.correctAnswer) && question.correctAnswer.includes(option))
                        ? 'text-green-600 font-medium'
                        : ''
                    }
                  >
                    {option}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
