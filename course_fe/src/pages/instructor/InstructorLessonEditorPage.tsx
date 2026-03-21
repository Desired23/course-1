import { useState, useEffect } from 'react'
import { useRouter } from '../../components/Router'
import { useUIStore } from '../../stores'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Switch } from '../../components/ui/switch'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import {
  Save,
  X,
  FileText,
  Settings,
  Paperclip,
  Code,
  Loader2,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react'
import { cn } from '../../components/ui/utils'
import { toast } from 'sonner'
import { BasicTab } from '../../components/BasicTab'
import { ContentTab } from '../../components/ContentTab'
import { ResourcesTab } from '../../components/ResourcesTab'
import { QuizTab } from '../../components/QuizTab'
import { SettingsTab } from '../../components/SettingsTab'
import { LessonPreviewModal } from '../../components/LessonPreviewModal'
import { EnhancedCodeQuizCreator } from '../../components/EnhancedCodeQuizCreator'
import { InstructorLayout } from '../../components/layouts'
import { getLessonById, updateLesson as updateLessonApi } from '../../services/lessons.api'
import { getCourseModuleById } from '../../services/course-modules.api'
import { getQuestionsByLesson } from '../../services/quiz-questions.api'
import { getAttachmentsByLesson } from '../../services/lesson-attachments.api'

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
  videoPublicId?: string
  content?: string
  filePath?: string
  externalUrl?: string
  settings?: Record<string, any>
  resources?: string[]
  questions?: number
  quizData?: any
}

const STEPS = [
  { id: 'basic', title: 'Basic Info', icon: FileText, description: 'Title, type & metadata' },
  { id: 'content', title: 'Content', icon: Code, description: 'Main lesson content' },
  { id: 'resources', title: 'Resources', icon: Paperclip, description: 'Attachments & links' },
  { id: 'settings', title: 'Settings', icon: Settings, description: 'Visibility & access' },
]

export function InstructorLessonEditorPage() {
  const { navigate, params } = useRouter()
  // params might not be available directly via useRouter depending on implementation, 
  // but typically we can get them. If not, we'll rely on path parsing or just mock it.
  // Assuming a route like /instructor/courses/:courseId/lessons/:lessonId/edit
  
  const { darkMode } = useUIStore()

  // FORCE FIX: Ensure theme state is synchronized correctly when entering this page
  // This addresses the issue where the page might incorrectly switch to dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])
  
  const [currentStep, setCurrentStep] = useState(0)
  const [editedLesson, setEditedLesson] = useState<Lesson | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [returnCourseId, setReturnCourseId] = useState<number | null>(null)

  const parseDurationToSeconds = (raw?: string): number | undefined => {
    if (!raw) return undefined
    const normalized = raw.trim().toLowerCase()
    if (!normalized) return undefined

    const mmss = normalized.match(/^(\d+):(\d{1,2})$/)
    if (mmss) {
      return Number(mmss[1]) * 60 + Number(mmss[2])
    }

    const minText = normalized.match(/^(\d+)\s*min/)
    if (minText) {
      return Number(minText[1]) * 60
    }

    const asNumber = Number(normalized)
    if (!Number.isNaN(asNumber) && asNumber >= 0) {
      return asNumber
    }

    return undefined
  }

  // Fetch lesson data from API
  useEffect(() => {
    const lessonId = params?.lessonId
    if (!lessonId) return
    let cancelled = false

    async function fetchLesson() {
      try {
        const lesson = await getLessonById(Number(lessonId))
        if (cancelled) return

        const mapped: any = {
          id: lesson.id,
          title: lesson.title,
          type: lesson.content_type || 'video',
          content_type: lesson.content_type || 'video',
          duration: lesson.duration ? `${Math.floor(lesson.duration / 60)}:${String(lesson.duration % 60).padStart(2, '0')}` : '5:00',
          status: lesson.status || 'draft',
          is_free: lesson.is_free || false,
          description: lesson.description || '',
          videoUrl: lesson.video_url || '',
          videoPublicId: lesson.video_public_id || '',
          content: lesson.content || '',
          filePath: lesson.file_path || '',
          externalUrl: lesson.content_type === 'link' ? (lesson.file_path || '') : '',
          resources: [],
          questions: 0,
          quizData: undefined,
          settings: {},
        }

        // Fetch quiz data if it's a quiz or code type
        if (lesson.content_type === 'quiz' || lesson.content_type === 'code') {
          try {
            const questions = await getQuestionsByLesson(lesson.id)
            mapped.questions = questions.length
            // If there's quiz data stored in content as JSON, parse it
            if (lesson.content) {
              try {
                mapped.quizData = JSON.parse(lesson.content)
              } catch {
                // content is not JSON, leave quizData undefined
              }
            }
          } catch {
            // No quiz questions yet
          }
        }

        // Fetch attachments
        try {
          const attachments = await getAttachmentsByLesson(lesson.id)
          mapped.resources = attachments.map((a: any) => a.file_name || a.title || 'attachment')
        } catch {
          // No attachments yet
        }

        // Resolve where to navigate back to
        const queryCourseId = new URLSearchParams(window.location.search).get('courseId')
        if (queryCourseId && /^\d+$/.test(queryCourseId)) {
          setReturnCourseId(Number(queryCourseId))
        } else if (lesson.coursemodule) {
          try {
            const module = await getCourseModuleById(lesson.coursemodule)
            if (typeof module.course === 'number') {
              setReturnCourseId(module.course)
            }
          } catch {
            // keep fallback
          }
        }

        setEditedLesson(mapped)
        setIsDirty(false)
        setCurrentStep(0)
      } catch (err) {
        console.error('Failed to load lesson:', err)
        toast.error('Failed to load lesson data')
      }
    }
    fetchLesson()
    return () => { cancelled = true }
  }, [params?.lessonId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDirty, editedLesson])

  const handleBackNavigation = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      )
      if (!confirmed) return
    }
    if (returnCourseId) {
      navigate(`/instructor/lessons/${returnCourseId}`)
      return
    }
    navigate('/instructor/lessons')
  }

  const handleSave = async () => {
    if (!editedLesson) return

    // Validation
    if (!editedLesson.title.trim()) {
      toast.error('Please enter a lesson title')
      setCurrentStep(0)
      return
    }

    setIsSaving(true)

    try {
      const updateData: any = {
        title: editedLesson.title,
        description: editedLesson.description,
        content_type: editedLesson.content_type || editedLesson.type,
        video_url: editedLesson.videoUrl,
        video_public_id: editedLesson.videoPublicId || undefined,
        file_path: editedLesson.filePath || undefined,
        duration: parseDurationToSeconds(editedLesson.duration),
        is_free: editedLesson.is_free,
        status: editedLesson.status,
        content: editedLesson.content,
      }

      if ((editedLesson.content_type || editedLesson.type) === 'link') {
        updateData.file_path = editedLesson.externalUrl || editedLesson.filePath || undefined
        updateData.content = editedLesson.content || editedLesson.description || ''
      }

      // Store quiz data as JSON in content field
      if ((editedLesson.type === 'quiz' || editedLesson.type === 'code') && editedLesson.quizData) {
        updateData.content = JSON.stringify(editedLesson.quizData)
      }

      await updateLessonApi(editedLesson.id, updateData)
      
      setIsDirty(false)
      setLastSaved(new Date())
      toast.success('Lesson saved successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save lesson')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = (updates: Partial<Lesson>) => {
    if (!editedLesson) return
    setIsDirty(true)
    setEditedLesson({ ...editedLesson, ...updates })
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      // Validation before moving from Basic
      if (currentStep === 0 && !editedLesson?.title.trim()) {
        toast.error('Please enter a lesson title')
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

  if (!editedLesson) return <div className="p-8 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  const contentType = editedLesson.content_type || editedLesson.type
  
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

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic
        return <BasicTab lesson={editedLesson} onUpdate={handleUpdate} />
      case 1: // Content
        if (contentType === 'quiz') {
          return <QuizTab lesson={editedLesson} onUpdate={handleUpdate} />
        }
        if (contentType === 'code') {
          return (
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Code className="h-5 w-5 text-red-500" />
                  Coding Exercise Configuration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure the coding problem, test cases, and constraints.
                </p>
              </div>
              <div className="flex-1 border rounded-md overflow-hidden bg-background">
                {/* Embedded Code Quiz Creator */}
                <div className="p-0 h-full overflow-y-auto">
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
      case 2: // Resources
        return <ResourcesTab lesson={editedLesson} onUpdate={handleUpdate} />
      case 3: // Settings
        return <SettingsTab lesson={editedLesson} onUpdate={handleUpdate} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
       {/* Top Bar - No Header/Footer from layout to maximize space, 
           but we need to ensure it looks consistent. 
           Actually user wanted a "separate page". 
           I'll keep it clean. */}
        
        {/* Header */}
        <div className="border-b bg-background sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={handleBackNavigation}>
                 <ArrowLeft className="h-5 w-5" />
               </Button>
               <div>
                <h1 className="text-xl font-bold flex items-center gap-3">
                  {editedLesson.id ? 'Edit Lesson' : 'New Lesson'}
                </h1>
                <p className="text-sm text-muted-foreground">{editedLesson.title || 'Untitled Lesson'}</p>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
               {/* Status & Settings Controls */}
               <div className="flex items-center gap-4 mr-2 border-r pr-4 h-8">
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="free-preview" 
                      checked={editedLesson.is_free}
                      onCheckedChange={(checked) => handleUpdate({ is_free: checked })}
                    />
                    <Label htmlFor="free-preview" className="text-sm cursor-pointer font-medium">Free Preview</Label>
                  </div>
                  
                  <Select 
                    value={editedLesson.status} 
                    onValueChange={(value) => handleUpdate({ status: value })}
                  >
                    <SelectTrigger className={cn(
                      "w-[140px] h-9 border-dashed",
                      editedLesson.status === 'published' ? "border-green-500/50 bg-green-500/5 text-green-700" : "border-muted-foreground/30"
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Draft</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="published">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Published</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
               </div>

               {lastSaved && (
                <span className="text-xs text-muted-foreground mr-4 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
               )}
               <Button variant="secondary" onClick={() => setShowPreview(true)}>
                  Preview
               </Button>
               <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
               </Button>
            </div>
          </div>

          {/* Stepper */}
          <div className="px-6 pb-0">
            <div className="flex items-center justify-center gap-12 pb-4">
              {STEPS.map((step, index) => {
                const isActive = index === currentStep
                const isCompleted = index < currentStep
                const Icon = step.icon

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(index)}
                    className="group flex items-center gap-3"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200",
                      isActive 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : isCompleted 
                          ? "border-primary text-primary bg-primary/10" 
                          : "border-muted-foreground/30 text-muted-foreground"
                    )}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="text-left">
                      <p className={cn(
                        "text-sm font-medium transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}>
                        {step.title}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-muted/10 p-6 overflow-hidden flex flex-col">
          <div className="max-w-5xl mx-auto w-full h-full flex flex-col">
             <div className={cn(
                "bg-card rounded-xl border shadow-sm p-8 flex-1 overflow-y-auto",
                // Remove padding/border for code editor to give it max space
                currentStep === 1 && contentType === 'code' ? "p-0 overflow-hidden border-0 shadow-none bg-transparent" : ""
              )}>
                {renderStepContent()}
              </div>
              
              <div className="mt-6 flex justify-between items-center">
                 <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className="w-32"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  
                  {currentStep < STEPS.length - 1 ? (
                    <Button onClick={handleNext} className="w-32">
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={handleSave} className="w-32">
                      Finish
                    </Button>
                  )}
              </div>
          </div>
        </div>
      
      {/* Preview Modal */}
      <LessonPreviewModal 
        open={showPreview} 
        onOpenChange={setShowPreview} 
        lesson={editedLesson} 
      />
    </div>
  )
}
