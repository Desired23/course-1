import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { useState } from 'react'
import {
  Video,
  FileText,
  Code,
  HelpCircle,
  ClipboardList,
  File,
  Link,
  Clock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface Lesson {
  id: number
  title: string
  type: string
  content_type?: string
  duration: string
  status: string
  is_free?: boolean
  description?: string
  videoUrl?: string
  content?: string
  resources?: string[]
  questions?: number
}

interface BasicTabProps {
  lesson: Lesson
  onUpdate: (updates: Partial<Lesson>) => void
}

const CONTENT_TYPES = [
  { value: 'video', label: 'Video Lesson', icon: Video, color: 'text-purple-600 dark:text-purple-400' },
  { value: 'text', label: 'Article/Text', icon: FileText, color: 'text-blue-600 dark:text-blue-400' },
  { value: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'text-orange-600 dark:text-orange-400' },
  { value: 'code', label: 'Coding Exercise', icon: Code, color: 'text-red-600 dark:text-red-400' },
  { value: 'assignment', label: 'Assignment', icon: ClipboardList, color: 'text-green-600 dark:text-green-400' },
  { value: 'file', label: 'Downloadable File', icon: File, color: 'text-gray-600 dark:text-gray-400' },
  { value: 'link', label: 'External Link', icon: Link, color: 'text-cyan-600 dark:text-cyan-400' }
]

export function BasicTab({ lesson, onUpdate }: BasicTabProps) {
  const [isQuizInfoOpen, setIsQuizInfoOpen] = useState(false)
  const [isVideoInfoOpen, setIsVideoInfoOpen] = useState(false)
  
  const contentType = lesson.content_type || lesson.type
  const currentType = CONTENT_TYPES.find(t => t.value === contentType) || CONTENT_TYPES[0]

  return (
    <div className="space-y-6">
      {/* Lesson Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Lesson Title *</Label>
        <Input
          id="title"
          value={lesson.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Enter lesson title..."
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">
          Choose a clear, descriptive title for your lesson
        </p>
      </div>

      {/* Content Type */}
      <div className="space-y-2">
        <Label htmlFor="content-type">Content Type *</Label>
        <Select
          value={contentType}
          onValueChange={(value) => onUpdate({ content_type: value, type: value })}
        >
          <SelectTrigger id="content-type">
            <SelectValue>
              <div className="flex items-center gap-2">
                <currentType.icon className={`h-4 w-4 ${currentType.color}`} />
                {currentType.label}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className={`h-4 w-4 ${type.color}`} />
                  <span>{type.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2 Column Layout: Duration & Status */}
      <div className="grid grid-cols-2 gap-4">
        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration">
            <Clock className="h-3.5 w-3.5 inline mr-1" />
            Duration
          </Label>
          <Input
            id="duration"
            value={lesson.duration}
            onChange={(e) => onUpdate({ duration: e.target.value })}
            placeholder="e.g., 10:30"
          />
          <p className="text-xs text-muted-foreground">
            Format: MM:SS or "X min"
          </p>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Publication Status *</Label>
          <Select
            value={lesson.status}
            onValueChange={(value) => onUpdate({ status: value })}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                  <span>Draft</span>
                </div>
              </SelectItem>
              <SelectItem value="published">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Published</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={lesson.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Provide a brief description of what students will learn..."
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {lesson.description?.length || 0}/500 characters
        </p>
      </div>

      {/* Free Preview Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="free-preview" className="text-base cursor-pointer flex items-center gap-2">
              {lesson.is_free ? (
                <Eye className="h-4 w-4 text-blue-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              Free Preview
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow non-enrolled students to view this lesson
            </p>
          </div>
          <Switch
            id="free-preview"
            checked={lesson.is_free || false}
            onCheckedChange={(checked) => onUpdate({ is_free: checked })}
          />
        </div>
      </Card>

      {/* Quiz-specific info */}
      {contentType === 'quiz' && (
        <Collapsible open={isQuizInfoOpen} onOpenChange={setIsQuizInfoOpen}>
          <Card className="overflow-hidden border-orange-500/20 bg-orange-500/5">
            <CollapsibleTrigger className="w-full p-3 hover:bg-orange-500/10 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <h4 className="font-semibold text-sm text-orange-900 dark:text-orange-100">
                    Quiz Settings
                  </h4>
                  <Badge variant="secondary" className="text-xs h-5 px-2">
                    {lesson.questions || 0} questions
                  </Badge>
                </div>
                {isQuizInfoOpen ? (
                  <ChevronDown className="h-4 w-4 text-orange-600 transition-transform" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-orange-600 transition-transform" />
                )}
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="px-3 pb-3 pt-1">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="break-words leading-relaxed">
                    Configure quiz questions, passing score, time limits, and other quiz-specific settings in the <strong>Quiz</strong> tab.
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Video-specific info */}
      {contentType === 'video' && (
        <Card className="overflow-hidden border-purple-500/20 bg-purple-500/5">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                Video Content
              </h4>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="break-words leading-relaxed">
                Upload your video file, add transcripts, and configure video-specific settings in the <strong>Content</strong> tab.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}