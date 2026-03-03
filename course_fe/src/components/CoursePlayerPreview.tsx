import { useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  CheckCircle,
  Lock,
  Menu,
  X,
  Download,
  MessageSquare,
  Share2
} from 'lucide-react'
import { cn } from './ui/utils'
import { VideoPlayerPreview } from './VideoPlayerPreview'
import { QuizPreview } from './QuizPreview'
import { ArticlePreview } from './ArticlePreview'

interface Lesson {
  id: number
  title: string
  type: string
  duration: string
  isCompleted?: boolean
  isFree?: boolean
  videoUrl?: string
  content?: string
}

interface Module {
  id: number
  title: string
  lessons: Lesson[]
  isExpanded?: boolean
}

interface CoursePlayerPreviewProps {
  courseName: string
  modules: Module[]
  currentLessonId: number
  onLessonChange?: (lessonId: number) => void
  className?: string
}

export function CoursePlayerPreview({ 
  courseName,
  modules: initialModules,
  currentLessonId,
  onLessonChange,
  className 
}: CoursePlayerPreviewProps) {
  const [modules, setModules] = useState<Module[]>(
    initialModules.map((m, i) => ({ ...m, isExpanded: i === 0 }))
  )
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [showNotes, setShowNotes] = useState(false)

  // Find current lesson
  const currentModule = modules.find(m => 
    m.lessons.some(l => l.id === currentLessonId)
  )
  const currentLesson = currentModule?.lessons.find(l => l.id === currentLessonId)

  // Calculate progress
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)
  const completedLessons = modules.reduce(
    (sum, m) => sum + m.lessons.filter(l => l.isCompleted).length,
    0
  )
  const progressPercent = (completedLessons / totalLessons) * 100

  // Toggle module expansion
  const toggleModule = (moduleId: number) => {
    setModules(modules.map(m => 
      m.id === moduleId ? { ...m, isExpanded: !m.isExpanded } : m
    ))
  }

  // Navigate to lesson
  const goToLesson = (lessonId: number) => {
    onLessonChange?.(lessonId)
  }

  // Get next/prev lesson
  const allLessons = modules.flatMap(m => m.lessons)
  const currentIndex = allLessons.findIndex(l => l.id === currentLessonId)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  const renderLessonContent = () => {
    if (!currentLesson) return null

    switch (currentLesson.type) {
      case 'video':
        return (
          <VideoPlayerPreview
            videoUrl={currentLesson.videoUrl}
            title={currentLesson.title}
            duration={currentLesson.duration}
          />
        )
      case 'quiz':
        return (
          <QuizPreview
            title={currentLesson.title}
            passingScore={70}
          />
        )
      case 'text':
      case 'article':
        return (
          <ArticlePreview
            title={currentLesson.title}
            content={currentLesson.content}
            duration={currentLesson.duration}
          />
        )
      default:
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold">{currentLesson.title}</h3>
          </div>
        )
    }
  }

  return (
    <div className={cn("flex h-screen bg-background", className)}>
      {/* Sidebar */}
      <div 
        className={cn(
          "bg-card border-r flex flex-col transition-all duration-300",
          isSidebarOpen ? "w-80" : "w-0 overflow-hidden"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold truncate">{courseName}</h3>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Course Progress</span>
              <span className="font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {completedLessons} of {totalLessons} lessons completed
            </p>
          </div>
        </div>

        {/* Course Outline */}
        <div className="flex-1 overflow-y-auto">
          {modules.map((module) => (
            <div key={module.id} className="border-b">
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full p-3 hover:bg-muted/50 transition-colors text-left flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{module.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {module.lessons.filter(l => l.isCompleted).length}/{module.lessons.length} completed
                  </p>
                </div>
                {module.isExpanded ? (
                  <ChevronUp className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                )}
              </button>

              {/* Lessons */}
              {module.isExpanded && (
                <div className="bg-muted/30">
                  {module.lessons.map((lesson) => {
                    const isActive = lesson.id === currentLessonId
                    const isLocked = !lesson.isFree && !lesson.isCompleted
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => !isLocked && goToLesson(lesson.id)}
                        disabled={isLocked}
                        className={cn(
                          "w-full p-3 pl-6 hover:bg-muted transition-colors text-left flex items-center gap-3 group",
                          isActive && "bg-primary/10 border-l-4 border-primary",
                          isLocked && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {lesson.isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : isLocked ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <PlayCircle className={cn(
                              "h-4 w-4",
                              isActive ? "text-primary" : "text-muted-foreground"
                            )} />
                          )}
                        </div>

                        {/* Lesson Info */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm truncate",
                            isActive && "font-semibold text-primary"
                          )}>
                            {lesson.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lesson.duration}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-card border-b p-3 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            <h2 className="font-semibold truncate text-sm md:text-base">
              {currentLesson?.title}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNotes(!showNotes)}>
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className={cn(
            "grid transition-all duration-300",
            showNotes ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
          )}>
            {/* Lesson Content */}
            <div className="p-4">
              {renderLessonContent()}
            </div>

            {/* Notes Panel */}
            {showNotes && (
              <div className="p-4 border-l bg-muted/30">
                <Card className="p-4 h-full">
                  <h3 className="font-semibold mb-3">My Notes</h3>
                  <textarea 
                    className="w-full h-[calc(100%-40px)] p-3 rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Take notes while learning..."
                  />
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="bg-card border-t p-4 flex items-center justify-between gap-4 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => prevLesson && goToLesson(prevLesson.id)}
            disabled={!prevLesson}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (currentLesson) {
                  // Mark as complete logic
                  toast.success('Lesson marked as complete!')
                }
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => nextLesson && goToLesson(nextLesson.id)}
            disabled={!nextLesson}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
