import React, { useEffect, useMemo, useState } from 'react'
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
  HelpCircle,
  PlayCircle,
  Clock,
  Trash2,
  ThumbsUp,
  MessageSquare,
  FileText,
  Download,
  Eye,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { getCourseById, type CourseDetail } from "../services/course.api"

interface PreviewCourseModalProps {
  courseId: string | null
  isOpen: boolean
  onClose: () => void
}

interface PreviewLesson {
  id: number
  title: string
  type: string
  durationLabel: string
  durationMinutes: number
  isFree: boolean
  videoUrl?: string | null
}

interface PreviewSection {
  id: number
  title: string
  lectures: number
  durationLabel: string
  lessons: PreviewLesson[]
}

function formatDurationLabel(durationMinutes: number): string {
  if (!durationMinutes || durationMinutes <= 0) return '0 min'
  if (durationMinutes < 60) return `${durationMinutes} min`
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

export function PreviewCourseModal({ courseId, isOpen, onClose }: PreviewCourseModalProps) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({})
  const [currentLessonId, setCurrentLessonId] = useState<number | null>(null)
  const [newNote, setNewNote] = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
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
  }>>([])
  const [playbackPercent, setPlaybackPercent] = useState(0)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !courseId) return
    let cancelled = false

    async function loadCoursePreview() {
      try {
        setLoading(true)
        setError(null)
        const data = await getCourseById(Number(courseId))
        if (cancelled) return
        setCourse(data)
        const firstLessonId = data.modules.flatMap((module) => module.lessons)[0]?.lesson_id ?? null
        setCurrentLessonId(firstLessonId)
        setExpandedSections(
          data.modules.reduce<Record<number, boolean>>((acc, module, index) => {
            acc[module.module_id] = index === 0
            return acc
          }, {})
        )
        setNotes([])
        setQuestions([])
        setPlaybackPercent(0)
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load course preview')
          setCourse(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCoursePreview()
    return () => {
      cancelled = true
    }
  }, [courseId, isOpen])

  const curriculum = useMemo<PreviewSection[]>(() => {
    if (!course) return []
    return (course.modules || []).map((module) => {
      const lessons = module.lessons.map((lesson) => {
        const durationMinutes = lesson.duration ?? 0
        return {
          id: lesson.lesson_id,
          title: lesson.title,
          type: lesson.content_type || 'video',
          durationLabel: formatDurationLabel(durationMinutes),
          durationMinutes,
          isFree: lesson.is_free,
          videoUrl: lesson.signed_video_url || lesson.video_url || null,
        }
      })

      const totalMinutes = lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0)
      return {
        id: module.module_id,
        title: module.title,
        lectures: lessons.length,
        durationLabel: formatDurationLabel(totalMinutes),
        lessons,
      }
    })
  }, [course])

  const flatLessons = useMemo(() => curriculum.flatMap((section) => section.lessons), [curriculum])
  const currentLesson = useMemo(
    () => flatLessons.find((lesson) => lesson.id === currentLessonId) || flatLessons[0] || null,
    [flatLessons, currentLessonId]
  )
  const currentLessonIndex = currentLesson ? flatLessons.findIndex((lesson) => lesson.id === currentLesson.id) : -1
  const nextLesson = currentLessonIndex >= 0 ? flatLessons[currentLessonIndex + 1] : null
  const previousLesson = currentLessonIndex > 0 ? flatLessons[currentLessonIndex - 1] : null
  const completedLessons = currentLessonIndex >= 0 ? currentLessonIndex : 0
  const progressPercent = flatLessons.length > 0 ? Math.round((completedLessons / flatLessons.length) * 100) : 0

  if (!isOpen) return null

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const handleLessonChange = (lessonId: number) => {
    setCurrentLessonId(lessonId)
    setPlaybackPercent(0)
    setIsSidebarOpen(false)
  }

  const handleAddNote = () => {
    if (!currentLesson || !newNote.trim()) {
      toast.error('Please write a note')
      return
    }
    const note = {
      id: Date.now(),
      lessonId: currentLesson.id,
      timestamp: `${Math.floor(playbackPercent)}%`,
      note: newNote.trim(),
      created: 'Just now',
    }
    setNotes((prev) => [note, ...prev])
    setNewNote('')
    toast.success('Note saved in Preview Mode only')
  }

  const handleDeleteNote = (noteId: number) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId))
    toast.success('Note deleted')
  }

  const handleAddQuestion = () => {
    if (!currentLesson || !newQuestion.trim()) {
      toast.error('Please write a question')
      return
    }
    const question = {
      id: Date.now(),
      lessonId: currentLesson.id,
      question: newQuestion.trim(),
      author: 'Instructor Preview',
      votes: 0,
      replies: 0,
      created: 'Just now',
      upvoted: false,
    }
    setQuestions((prev) => [question, ...prev])
    setNewQuestion('')
    toast.success('Question added in Preview Mode only')
  }

  const handleUpvote = (questionId: number) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question
        const upvoted = !question.upvoted
        return {
          ...question,
          votes: upvoted ? question.votes + 1 : Math.max(0, question.votes - 1),
          upvoted,
        }
      })
    )
  }

  const handleAddAnswer = (questionId: number) => {
    if (!newAnswer.trim()) {
      toast.error('Please write an answer')
      return
    }
    setQuestions((prev) =>
      prev.map((question) => (
        question.id === questionId
          ? { ...question, answer: newAnswer.trim(), replies: question.replies + 1 }
          : question
      ))
    )
    setNewAnswer('')
    setReplyingTo(null)
    toast.success('Answer added in Preview Mode only')
  }

  const handleDownloadResource = (resourceName: string) => {
    toast.info(`Preview Mode: ${resourceName} is shown for layout validation only`)
  }

  const CurriculumSidebar = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Course Content</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {curriculum.length} sections • {flatLessons.length} lessons
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {curriculum.map((section) => (
          <div key={section.id} className="border-b">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 text-left">
                {expandedSections[section.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <div>
                  <p className="font-medium">{section.title}</p>
                  <p className="text-sm text-muted-foreground">{section.lectures} lessons • {section.durationLabel}</p>
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
                      lesson.id === currentLesson?.id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      {lesson.type === 'quiz' ? (
                        <HelpCircle className="w-4 h-4 text-purple-500" />
                      ) : (
                        <PlayCircle className="w-4 h-4" />
                      )}
                      <span className={`text-sm ${lesson.id === currentLesson?.id ? 'font-medium' : ''}`}>{lesson.title}</span>
                      {lesson.type === 'quiz' && <Badge variant="secondary" className="text-xs">Quiz</Badge>}
                      {lesson.isFree && <Badge variant="outline" className="text-xs">Free</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{lesson.durationLabel}</span>
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
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary" />
              <Badge variant="secondary" className="bg-primary/10 text-primary">Preview Mode</Badge>
              <h1 className="font-semibold truncate max-w-[320px] hidden sm:block">{course?.title || 'Course Preview'}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

            <Progress value={progressPercent} className="w-24 hidden sm:block" />
            <span className="text-sm text-muted-foreground hidden sm:inline">{progressPercent}% complete</span>
            <Button onClick={onClose}>Exit Preview</Button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error || !course || !currentLesson ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-destructive">{error || 'Unable to load course preview.'}</p>
          <Button onClick={onClose}>Close Preview</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 min-h-screen">
          <div className="lg:col-span-3 flex flex-col">
            {currentLesson.type === 'quiz' ? (
              <div className="bg-muted/50 p-8 flex-shrink-0">
                <div className="max-w-3xl mx-auto rounded-xl border bg-card p-6 space-y-4">
                  <Badge variant="secondary">Quiz Preview</Badge>
                  <h2 className="text-2xl font-semibold">{currentLesson.title}</h2>
                  <p className="text-muted-foreground">
                    Quiz content is attached to this lesson in the real course data. Preview Mode shows the real lesson structure,
                    but quiz interaction is intentionally non-persistent here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0">
                <VideoPlayer
                  key={currentLesson.id}
                  url={currentLesson.videoUrl || course.promotional_video || undefined}
                  title={currentLesson.title}
                  lessonId={currentLesson.id}
                  onProgress={(payload) => setPlaybackPercent(payload.percentage)}
                  onComplete={() => toast.success('Lesson completed in Preview Mode')}
                  savedProgress={0}
                />
              </div>
            )}

            <div className="border-b bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-medium">{course.title}</h2>
                  <p className="text-sm text-muted-foreground">by {course.instructor?.full_name || 'Instructor'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => previousLesson && handleLessonChange(previousLesson.id)} disabled={!previousLesson} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous Lesson
                </Button>

                <div className="text-center">
                  <p className="text-sm font-medium">{currentLesson.title}</p>
                  <p className="text-xs text-muted-foreground">{currentLesson.durationLabel}</p>
                </div>

                <Button variant="default" onClick={() => nextLesson && handleLessonChange(nextLesson.id)} disabled={!nextLesson} className="flex-1">
                  Next Lesson
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

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
                          <strong>Preview Mode:</strong> Course structure comes from real course data. Notes and Q&A below are temporary.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">About this course</h3>
                        <p className="text-muted-foreground whitespace-pre-line">
                          {course.description || course.shortdescription || 'No course description yet.'}
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="font-medium mb-4">Course Progress Snapshot</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Current lesson playback</span>
                            <span className="text-sm font-medium">{Math.round(playbackPercent)}%</span>
                          </div>
                          <Progress value={playbackPercent} className="h-2" />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{completedLessons} of {flatLessons.length} lessons visited</span>
                            <span>{curriculum.length} modules loaded from API</span>
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
                          placeholder="Add a preview-only note for this lesson..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="mb-2"
                        />
                        <Button size="sm" onClick={handleAddNote}>Save Note</Button>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="font-medium">Preview Notes for this Lesson</h4>
                        {notes.filter((note) => note.lessonId === currentLesson.id).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No preview notes yet.</p>
                        ) : (
                          notes
                            .filter((note) => note.lessonId === currentLesson.id)
                            .map((note) => (
                              <div key={note.id} className="p-3 border rounded space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    <span>{note.timestamp}</span>
                                    <span>•</span>
                                    <span>{note.created}</span>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteNote(note.id)}>
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
                          placeholder="Ask a preview-only question about this lesson..."
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          className="mb-2"
                        />
                        <Button size="sm" onClick={handleAddQuestion}>Post Question</Button>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="font-medium">Preview Questions</h4>
                        {questions.filter((question) => question.lessonId === currentLesson.id).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No preview questions yet.</p>
                        ) : (
                          questions
                            .filter((question) => question.lessonId === currentLesson.id)
                            .map((qa) => (
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
                                    {qa.answer && <p className="text-sm text-muted-foreground mb-2">{qa.answer}</p>}
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
                            ))
                        )}
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
                            <p className="font-medium text-sm">{currentLesson.title}</p>
                            <p className="text-xs text-muted-foreground">{currentLesson.type} • {currentLesson.durationLabel}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadResource(currentLesson.title)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>

                        {course.promotional_video && (
                          <div className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">Promotional Video</p>
                              <p className="text-xs text-muted-foreground">Course landing asset</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => handleDownloadResource('Promotional Video')}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          <div className="hidden lg:block border-l bg-card sticky top-14 h-[calc(100vh-56px)] overflow-hidden">
            <CurriculumSidebar />
          </div>
        </div>
      )}
    </div>
  )
}
