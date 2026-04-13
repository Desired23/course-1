import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  Save,
  X,
  FileText,
  Settings,
  Paperclip,
  HelpCircle,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Code,
  ChevronRight,
  ChevronLeft,
  CheckCircle2
} from 'lucide-react'
import { cn } from './ui/utils'
import { toast } from 'sonner'
import { BasicTab } from './BasicTab'
import { ContentTab } from './ContentTab'
import { ResourcesTab } from './ResourcesTab'
import { QuizTab } from './QuizTab'
import { SettingsTab } from './SettingsTab'
import { LessonPreviewModal } from './LessonPreviewModal'
import { EnhancedCodeQuizCreator, EnhancedCodeQuizData } from './EnhancedCodeQuizCreator'
import { useTranslation } from 'react-i18next'

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
  quizData?: any
}

interface LessonEditorDialogProps {
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (lesson: Lesson) => void
}

export function LessonEditorDialog({
  lesson,
  open,
  onOpenChange,
  onSave
}: LessonEditorDialogProps) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [editedLesson, setEditedLesson] = useState<Lesson | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showPreview, setShowPreview] = useState(false)


  useEffect(() => {
    if (lesson && open) {
      setEditedLesson({ ...lesson })
      setIsDirty(false)
      setCurrentStep(0)
    }
  }, [lesson, open])


  useEffect(() => {
    if (editedLesson && lesson) {
      const hasChanges = JSON.stringify(editedLesson) !== JSON.stringify(lesson)
      setIsDirty(hasChanges)
    }
  }, [editedLesson, lesson])


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    if (open) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, isDirty, editedLesson])

  const handleClose = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        t('lesson_editor_dialog.unsaved_changes_confirm')
      )
      if (!confirmed) return
    }
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (!editedLesson) return


    if (!editedLesson.title.trim()) {
      toast.error(t('lesson_editor_dialog.enter_lesson_title'))
      setCurrentStep(0)
      return
    }

    setIsSaving(true)

    try {

      await new Promise(resolve => setTimeout(resolve, 500))

      onSave(editedLesson)
      setIsDirty(false)
      setLastSaved(new Date())
      toast.success(t('lesson_editor_dialog.save_success'))
    } catch (error) {
      toast.error(t('lesson_editor_dialog.save_failed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = (updates: Partial<Lesson>) => {
    if (!editedLesson) return
    setEditedLesson({ ...editedLesson, ...updates })
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {

      if (currentStep === 0 && !editedLesson?.title.trim()) {
        toast.error(t('lesson_editor_dialog.enter_lesson_title'))
        return
      }
      setCurrentStep(curr => curr + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1)
    }
  }

  if (!editedLesson) return null

  const contentType = editedLesson.content_type || editedLesson.type
  const steps = [
    {
      id: 'basic',
      title: t('lesson_editor_dialog.steps.basic.title'),
      icon: FileText,
      description: t('lesson_editor_dialog.steps.basic.description'),
    },
    {
      id: 'content',
      title: t('lesson_editor_dialog.steps.content.title'),
      icon: Code,
      description: t('lesson_editor_dialog.steps.content.description'),
    },
    {
      id: 'resources',
      title: t('lesson_editor_dialog.steps.resources.title'),
      icon: Paperclip,
      description: t('lesson_editor_dialog.steps.resources.description'),
    },
    {
      id: 'settings',
      title: t('lesson_editor_dialog.steps.settings.title'),
      icon: Settings,
      description: t('lesson_editor_dialog.steps.settings.description'),
    },
  ]

  const statusConfig = {
    published: {
      icon: CheckCircle,
      color: 'bg-green-500/10 text-green-600 border-green-500/20'
    },
    draft: {
      icon: Clock,
      color: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  const currentStatus = statusConfig[editedLesson.status as keyof typeof statusConfig] || statusConfig.draft


  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <BasicTab lesson={editedLesson} onUpdate={handleUpdate} />
      case 1:
        if (contentType === 'quiz') {
          return <QuizTab lesson={editedLesson} onUpdate={handleUpdate} />
        }
        if (contentType === 'code') {
          return (
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Code className="h-5 w-5 text-red-500" />
                  {t('lesson_editor_dialog.coding_exercise_title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('lesson_editor_dialog.coding_exercise_description')}
                </p>
              </div>
              <div className="flex-1 border rounded-md overflow-hidden bg-background">

                <div className="p-4 h-full overflow-y-auto">
                   <EnhancedCodeQuizCreator
                      initialData={editedLesson.quizData}
                      onChange={(data) => handleUpdate({ quizData: data })}
                      onSave={(data) => handleUpdate({ quizData: data })}

                      onCancel={undefined}
                   />
                </div>
              </div>
            </div>
          )
        }
        return <ContentTab lesson={editedLesson} onUpdate={handleUpdate} />
      case 2:
        return <ResourcesTab lesson={editedLesson} onUpdate={handleUpdate} />
      case 3:
        return <SettingsTab lesson={editedLesson} onUpdate={handleUpdate} />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden bg-background">

        <div className="flex flex-col border-b bg-muted/10">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold mb-2">
                  {editedLesson.id ? t('lesson_editor_dialog.edit_lesson') : t('lesson_editor_dialog.new_lesson')}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-3">
                  <Badge variant="outline" className={cn("gap-1.5 py-1 px-2", currentStatus.color)}>
                    <currentStatus.icon className="h-3.5 w-3.5" />
                    {editedLesson.status === 'published' ? t('lesson_editor_dialog.published') : t('lesson_editor_dialog.draft')}
                  </Badge>
                  <span className="text-muted-foreground">|</span>
                  <span className="font-medium text-foreground">{editedLesson.title || t('lesson_editor_dialog.untitled_lesson')}</span>
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
              </div>
            </div>
          </DialogHeader>


          <div className="px-6 pb-4">
            <div className="relative flex items-center justify-between w-full max-w-3xl mx-auto">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted -z-10" />
              {steps.map((step, index) => {
                const isActive = index === currentStep
                const isCompleted = index < currentStep
                const Icon = step.icon

                return (
                  <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
                    <button
                      onClick={() => setCurrentStep(index)}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground scale-110 shadow-md"
                          : isCompleted
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-muted bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                    </button>
                    <div className="text-center">
                      <p className={cn(
                        "text-xs font-semibold transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>


        <div className="flex-1 overflow-hidden flex flex-col bg-muted/5">
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="max-w-5xl mx-auto h-full">
              <div className={cn(
                "bg-card rounded-xl border shadow-sm p-6 h-full",
                currentStep === 1 && contentType === 'code' ? "p-0 overflow-hidden border-0 shadow-none bg-transparent" : ""
              )}>
                {renderStepContent()}
              </div>
            </div>
          </div>
        </div>


        <DialogFooter className="p-4 border-t bg-background flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
             {lastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t('lesson_editor_dialog.saved_at', { time: lastSaved.toLocaleTimeString() })}
              </span>
             )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="w-24"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              {t('lesson_editor_dialog.back')}
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext} className="w-24">
                {t('lesson_editor_dialog.next')}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowPreview(true)}>
                   {t('lesson_editor_dialog.preview')}
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('lesson_editor_dialog.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('lesson_editor_dialog.complete_and_save')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>


      <LessonPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        lesson={editedLesson}
      />
    </Dialog>
  )
}
