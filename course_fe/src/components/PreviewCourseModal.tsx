import React, { useState, useEffect } from 'react'
import { QuizPlayer } from "./QuizPlayer"
import { VideoPlayer } from "./VideoPlayer"
import { Button } from "./ui/button"
import { Progress } from "./ui/progress"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Textarea } from "./ui/textarea"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet"
import {
  X,
  List,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  HelpCircle,
  PlayCircle,
  Lock,
  Clock,
  Trash2,
  ThumbsUp,
  MessageSquare,
  FileText,
  Download,
  Eye
} from "lucide-react"
import { toast } from "sonner"
import { transformCourseDetail, transformQuizForLesson, getNextLesson, getPreviousLesson } from "../utils/dataAdapters"

const courseData = transformCourseDetail()
const mockCourse = courseData.course
const mockCurriculum = courseData.curriculum
const mockQA: any[] = [] // Empty Q&A for preview mode

interface PreviewCourseModalProps {
  courseId: string | null
  isOpen: boolean
  onClose: () => void
}

export function PreviewCourseModal({ courseId, isOpen, onClose }: PreviewCourseModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState([50])
  const [progress, setProgress] = useState([25])
  const [expandedSections, setExpandedSections] = useState<{[key: number]: boolean}>({1: true})
  const [currentLessonId, setCurrentLessonId] = useState(3)
  const [newNote, setNewNote] = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Preview mode - use temporary state instead of localStorage
  const [notes, setNotes] = useState<Array<{
    id: number
    lessonId: number
    timestamp: string
    note: string
    created: string
  }>>([])
  
  const [questions, setQuestions] = useState<Array<{
    id: number
    lessonId: number
    question: string
    answer?: string
    author: string
    votes: number
    replies: number
    created: string
    upvoted?: boolean
  }>>(mockQA.map((qa: any) => ({
    id: qa.qna_id,
    lessonId: qa.lesson.lesson_id,
    question: qa.question,
    answer: qa.answers && qa.answers.length > 0 ? qa.answers[0].answer : undefined,
    author: qa.user.name,
    votes: qa.answers && qa.answers.length > 0 ? qa.answers[0].likes : 0,
    replies: qa.answers ? qa.answers.length : 0,
    created: new Date(qa.asked_date).toLocaleDateString(),
    upvoted: false
  })))
  
  const [quizProgress, setQuizProgress] = useState<Record<number, any>>({})

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentLessonId(3)
      setProgress([0])
      setIsPlaying(false)
      setNotes([])
      setQuizProgress({})
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error('Please write a note')
      return
    }

    const currentTime = Math.floor(progress[0] * 0.45 * 60)
    const minutes = Math.floor(currentTime / 60)
    const seconds = currentTime % 60
    const timestamp = `${minutes}:${String(seconds).padStart(2, '0')}`

    const note = {
      id: Date.now(),
      lessonId: currentLessonId,
      timestamp,
      note: newNote,
      created: 'Just now'
    }

    setNotes(prev => [note, ...prev])
    setNewNote('')
    toast.success('Note saved (Preview Mode - not persisted)')
  }

  const handleDeleteNote = (noteId: number) => {
    setNotes(prev => prev.filter(n => n.id !== noteId))
    toast.success('Note deleted')
  }

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) {
      toast.error('Please write a question')
      return
    }

    const question = {
      id: Date.now(),
      lessonId: currentLessonId,
      question: newQuestion,
      author: 'You (Preview)',
      votes: 0,
      replies: 0,
      created: 'Just now',
      upvoted: false
    }

    setQuestions(prev => [question, ...prev])
    setNewQuestion('')
    toast.success('Question posted (Preview Mode - not persisted)')
  }

  const handleUpvote = (questionId: number) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        const upvoted = !q.upvoted
        return {
          ...q,
          votes: upvoted ? q.votes + 1 : q.votes - 1,
          upvoted
        }
      }
      return q
    }))
  }

  const handleAddAnswer = (questionId: number) => {
    if (!newAnswer.trim()) {
      toast.error('Please write an answer')
      return
    }

    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          answer: newAnswer,
          replies: q.replies + 1
        }
      }
      return q
    }))

    setNewAnswer('')
    setReplyingTo(null)
    toast.success('Answer posted (Preview Mode)')
  }

  const handleDownloadResource = (resourceName: string) => {
    toast.info(`Preview Mode: Download ${resourceName}`)
  }

  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const getCurrentLesson = () => {
    for (const section of mockCurriculum) {
      const lesson = section.lessons.find(l => l.id === currentLessonId)
      if (lesson) return lesson
    }
    return mockCurriculum[0].lessons[2]
  }

  const currentLessonData = getCurrentLesson()

  const handleLessonChange = (lessonId: number) => {
    setCurrentLessonId(lessonId)
    setIsPlaying(false)
    setProgress([0])
    setIsSidebarOpen(false)
  }

  const goToNextLesson = () => {
    const next = getNextLesson(currentLessonId)
    if (next) {
      handleLessonChange(next.id)
      toast.success(`Playing: ${next.title}`)
    } else {
      toast.info('You have reached the end of the course!')
    }
  }

  const goToPreviousLesson = () => {
    const prev = getPreviousLesson(currentLessonId)
    if (prev) {
      handleLessonChange(prev.id)
      toast.success(`Playing: ${prev.title}`)
    } else {
      toast.info('This is the first lesson')
    }
  }

  const handleLessonComplete = () => {
    toast.success('Lesson completed! (Preview Mode)')
    
    setTimeout(() => {
      const next = getNextLesson(currentLessonId)
      if (next) {
        toast.info(`Auto-playing next lesson: ${next.title}`)
        handleLessonChange(next.id)
      }
    }, 3000)
  }

  const CurriculumSidebar = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Course Content</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {mockCurriculum.length} sections • {mockCurriculum.reduce((acc, s) => acc + s.lectures, 0)} lectures
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {mockCurriculum.map((section) => (
          <div key={section.id} className="border-b">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 text-left">
                {expandedSections[section.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <div>
                  <p className="font-medium">{section.title}</p>
                  <p className="text-sm text-muted-foreground">{section.lectures} lectures • {section.duration}</p>
                </div>
              </div>
            </button>
            
            {expandedSections[section.id] && (
              <div className="bg-muted/50">
                {section.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleLessonChange(lesson.id)}
                    className={`w-full px-4 py-3 pl-12 flex items-center justify-between hover:bg-accent transition-colors ${
                      lesson.id === currentLessonId ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      {lesson.isCompleted ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : lesson.type === 'quiz' ? (
                        <HelpCircle className="w-4 h-4 text-purple-500" />
                      ) : lesson.isFree ? (
                        <PlayCircle className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={`text-sm ${lesson.id === currentLessonId ? 'font-medium' : ''}`}>{lesson.title}</span>
                      {lesson.type === 'quiz' && (
                        <Badge variant="secondary" className="text-xs">Quiz</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      {/* Preview Mode Header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary" />
              <Badge variant="secondary" className="bg-primary/10 text-primary">Preview Mode</Badge>
              <h1 className="font-semibold truncate max-w-[300px] hidden sm:block">{mockCourse.title}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile Curriculum Toggle */}
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <List className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Course Curriculum</SheetTitle>
                  <SheetDescription>Browse and navigate through course lessons</SheetDescription>
                </SheetHeader>
                <CurriculumSidebar />
              </SheetContent>
            </Sheet>
            
            <Progress value={33} className="w-24 hidden sm:block" />
            <span className="text-sm text-muted-foreground hidden sm:inline">33% complete</span>
            
            <Button onClick={onClose} variant="default">
              Exit Preview
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-screen">
        {/* Video Player Area */}
        <div className="lg:col-span-3 flex flex-col">
          {/* Video Player or Quiz */}
          {currentLessonData.type === 'quiz' ? (
            <div className="bg-muted/50 p-6 flex-shrink-0 overflow-y-auto" style={{ maxHeight: '60vh' }}>
              <QuizPlayer
                quiz={transformQuizForLesson(currentLessonId) || { id: currentLessonId, title: 'Quiz', questions: [] }}
                savedProgress={quizProgress[currentLessonId]?.answers}
                onProgressChange={(answers) => {
                  setQuizProgress(prev => ({
                    ...prev,
                    [currentLessonId]: {
                      ...prev[currentLessonId],
                      answers,
                      lastSaved: new Date().toISOString()
                    }
                  }))
                }}
                onComplete={(score, passed) => {
                  console.log('Quiz completed:', { score, passed })
                  setQuizProgress(prev => ({
                    ...prev,
                    [currentLessonId]: {
                      ...prev[currentLessonId],
                      score,
                      passed,
                      completedAt: new Date().toISOString(),
                      lessonId: currentLessonId
                    }
                  }))
                  if (passed) {
                    toast.success('Quiz passed! (Preview Mode)')
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex-shrink-0">
              <VideoPlayer
                key={currentLessonId}
                url={(currentLessonData as any).videoUrl || 'https://www.youtube.com/watch?v=qz0aGYrrlhU'}
                title={currentLessonData.title}
                lessonId={currentLessonId}
                onProgress={(prog) => {
                  setProgress([prog])
                }}
                onComplete={() => {
                  handleLessonComplete()
                }}
                savedProgress={0}
              />
            </div>
          )}

          {/* Course Info Bar */}
          <div className="border-b bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-medium">{mockCourse.title}</h2>
                <p className="text-sm text-muted-foreground">by {mockCourse.instructor}</p>
              </div>
            </div>
            
            {/* Lesson Navigation */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={goToPreviousLesson}
                disabled={!getPreviousLesson(currentLessonId)}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous Lesson
              </Button>
              
              <div className="text-center">
                <p className="text-sm font-medium">{currentLessonData.title}</p>
                <p className="text-xs text-muted-foreground">{currentLessonData.duration}</p>
              </div>
              
              <Button 
                variant="default" 
                onClick={goToNextLesson}
                disabled={!getNextLesson(currentLessonId)}
                className="flex-1"
              >
                Next Lesson
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="pb-8">
            <Tabs defaultValue="overview">
              <div className="border-b">
                <TabsList className="w-full justify-start h-12 rounded-none bg-transparent">
                  <TabsTrigger value="overview" className="rounded-none">Overview</TabsTrigger>
                  <TabsTrigger value="notes" className="rounded-none">Notes</TabsTrigger>
                  <TabsTrigger value="qa" className="rounded-none">Q&A</TabsTrigger>
                  <TabsTrigger value="resources" className="rounded-none">Resources</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <div className="space-y-6">
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm text-primary">
                        <Eye className="inline w-4 h-4 mr-2" />
                        <strong>Preview Mode:</strong> You are viewing this course as an instructor. All interactions are temporary and will not be saved.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">About this lesson</h3>
                      <p className="text-muted-foreground">
                        In this lesson, we'll explore how the internet works and understand the basic concepts of web development. 
                        You'll learn about servers, clients, and the HTTP protocol.
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-4">Course Progress</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Overall Progress</span>
                          <span className="text-sm font-medium">5%</span>
                        </div>
                        <Progress value={5} className="h-2" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>3 of 56 lessons completed</span>
                          <span>1.2 hours watched</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Add a Note</h3>
                      <Textarea
                        placeholder="Add a note at current timestamp..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="mb-2"
                      />
                      <Button size="sm" onClick={handleAddNote}>Save Note</Button>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">Your Notes for this Lesson</h4>
                      {notes.filter(n => n.lessonId === currentLessonId).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No notes yet. Add your first note above!</p>
                      ) : (
                        notes
                          .filter(n => n.lessonId === currentLessonId)
                          .map((note) => (
                            <div key={note.id} className="p-3 border rounded space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{note.timestamp}</span>
                                  <span>•</span>
                                  <span>{note.created}</span>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleDeleteNote(note.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <p className="text-sm">{note.note}</p>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="qa" className="mt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Ask a Question</h3>
                      <Textarea
                        placeholder="Ask a question about this lesson..."
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        className="mb-2"
                      />
                      <Button size="sm" onClick={handleAddQuestion}>Post Question</Button>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Recent Questions</h4>
                      {questions.slice(0, 5).map((qa) => (
                        <div key={qa.id} className="space-y-3 p-4 border rounded">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>{qa.author[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{qa.author}</span>
                                <span className="text-xs text-muted-foreground">{qa.created}</span>
                              </div>
                              <p className="font-medium mb-2">{qa.question}</p>
                              <p className="text-sm text-muted-foreground mb-2">{qa.answer}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{qa.votes} votes</span>
                                <span>{qa.replies} replies</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleUpvote(qa.id)}>
                              <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setReplyingTo(qa.id)}>
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                          {replyingTo === qa.id && (
                            <div className="mt-2">
                              <Textarea
                                placeholder="Add an answer..."
                                value={newAnswer}
                                onChange={(e) => setNewAnswer(e.target.value)}
                                className="mb-2"
                              />
                              <Button size="sm" onClick={() => handleAddAnswer(qa.id)}>Post Answer</Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="resources" className="mt-0">
                  <div className="space-y-4">
                    <h3 className="font-medium">Lesson Resources</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Course Slides - Introduction</p>
                          <p className="text-xs text-muted-foreground">PDF • 2.3 MB</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadResource('Course Slides - Introduction')}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Code Examples</p>
                          <p className="text-xs text-muted-foreground">ZIP • 1.1 MB</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadResource('Code Examples')}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Desktop Curriculum Sidebar */}
        <div className="hidden lg:block border-l bg-card sticky top-14 h-[calc(100vh-56px)] overflow-hidden">
          <CurriculumSidebar />
        </div>
      </div>
    </div>
  )
}