import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  { value: 'video', labelKey: 'lesson_editor.content_types.video', icon: Video, color: 'text-purple-600 dark:text-purple-400' },
  { value: 'text', labelKey: 'lesson_editor.content_types.text', icon: FileText, color: 'text-blue-600 dark:text-blue-400' },
  { value: 'quiz', labelKey: 'lesson_editor.content_types.quiz', icon: HelpCircle, color: 'text-orange-600 dark:text-orange-400' },
  { value: 'code', labelKey: 'lesson_editor.content_types.code', icon: Code, color: 'text-red-600 dark:text-red-400' },
  { value: 'assignment', labelKey: 'lesson_editor.content_types.assignment', icon: ClipboardList, color: 'text-green-600 dark:text-green-400' },
  { value: 'file', labelKey: 'lesson_editor.content_types.file', icon: File, color: 'text-gray-600 dark:text-gray-400' },
  { value: 'link', labelKey: 'lesson_editor.content_types.link', icon: Link, color: 'text-cyan-600 dark:text-cyan-400' }
]

export function BasicTab({ lesson, onUpdate }: BasicTabProps) {
  const { t } = useTranslation()
  const [isQuizInfoOpen, setIsQuizInfoOpen] = useState(false)
  const [isVideoInfoOpen, setIsVideoInfoOpen] = useState(false)

  const contentType = lesson.content_type || lesson.type
  const currentType = CONTENT_TYPES.find(t => t.value === contentType) || CONTENT_TYPES[0]

  return (
    <div className="space-y-6">

      <div className="space-y-2">
        <Label htmlFor="title">{t('lesson_editor.lesson_title')}</Label>
        <Input
          id="title"
          value={lesson.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder={t('lesson_editor.lesson_title_placeholder')}
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">
          {t('lesson_editor.lesson_title_hint')}
        </p>
      </div>


      <div className="space-y-2">
        <Label htmlFor="content-type">{t('lesson_editor.content_type')}</Label>
        <Select
          value={contentType}
          onValueChange={(value) => onUpdate({ content_type: value, type: value })}
        >
          <SelectTrigger id="content-type">
            <SelectValue>
              <div className="flex items-center gap-2">
                <currentType.icon className={`h-4 w-4 ${currentType.color}`} />
                {t(currentType.labelKey)}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className={`h-4 w-4 ${type.color}`} />
                  <span>{t(type.labelKey)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>


      <div className="grid grid-cols-2 gap-4">

        <div className="space-y-2">
          <Label htmlFor="duration">
            <Clock className="h-3.5 w-3.5 inline mr-1" />
            {t('lesson_editor.duration')}
          </Label>
          <Input
            id="duration"
            value={lesson.duration}
            onChange={(e) => onUpdate({ duration: e.target.value })}
            placeholder={t('lesson_editor.duration_placeholder')}
          />
          <p className="text-xs text-muted-foreground">
            {t('lesson_editor.duration_hint')}
          </p>
        </div>


        <div className="space-y-2">
          <Label htmlFor="status">{t('lesson_editor.publication_status')}</Label>
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
                  <span>{t('lesson_editor.draft')}</span>
                </div>
              </SelectItem>
              <SelectItem value="published">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{t('lesson_editor.published')}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>


      <div className="space-y-2">
        <Label htmlFor="description">{t('lesson_editor.description')}</Label>
        <Textarea
          id="description"
          value={lesson.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder={t('lesson_editor.description_placeholder')}
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {t('lesson_editor.description_count', { count: lesson.description?.length || 0, max: 500 })}
        </p>
      </div>


      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="free-preview" className="text-base cursor-pointer flex items-center gap-2">
              {lesson.is_free ? (
                <Eye className="h-4 w-4 text-blue-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              {t('lesson_editor.free_preview')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('lesson_editor.free_preview_hint')}
            </p>
          </div>
          <Switch
            id="free-preview"
            checked={lesson.is_free || false}
            onCheckedChange={(checked) => onUpdate({ is_free: checked })}
          />
        </div>
      </Card>


      {contentType === 'quiz' && (
        <Collapsible open={isQuizInfoOpen} onOpenChange={setIsQuizInfoOpen}>
          <Card className="overflow-hidden border-orange-500/20 bg-orange-500/5">
            <CollapsibleTrigger className="w-full p-3 hover:bg-orange-500/10 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <h4 className="font-semibold text-sm text-orange-900 dark:text-orange-100">
                    {t('lesson_editor.quiz_settings')}
                  </h4>
                  <Badge variant="secondary" className="text-xs h-5 px-2">
                    {t('lesson_editor.questions_count', { count: lesson.questions || 0 })}
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
                    {t('lesson_editor.quiz_settings_hint')}
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}


      {contentType === 'video' && (
        <Card className="overflow-hidden border-purple-500/20 bg-purple-500/5">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                {t('lesson_editor.video_content')}
              </h4>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="break-words leading-relaxed">
                {t('lesson_editor.video_content_hint')}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
