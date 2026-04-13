import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { Input } from "../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Edit3, Eye, FileText, Plus, Save, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { QuizEditor } from "../../components/QuizEditor"
import { useRouter } from "../../components/Router"
import { DraggableSectionCard } from "../../components/SectionDragDrop"
import { useLocalStorage } from "../../hooks/useLocalStorage"

type LessonType = 'video' | 'quiz' | 'article'
type LessonStatus = 'published' | 'draft' | 'pending'

type LessonItem = {
  id: number
  title: string
  type: LessonType
  duration: string
  status: LessonStatus
  description: string
  videoUrl?: string
  resources?: string[]
  questions?: number
  quizData?: any
}

type SectionItem = {
  id: number
  title: string
  lessons: LessonItem[]
}

function createLegacyCourseStructure(t: (key: string) => string) {
  return {
    courseId: "1",
    title: t('instructor_lessons_page.mock.course_title'),
    sections: [
      {
        id: 1,
        title: t('instructor_lessons_page.mock.section_intro'),
        lessons: [
          {
            id: 1,
            title: t('instructor_lessons_page.mock.lesson_course_intro'),
            type: "video" as const,
            duration: "5:30",
            status: "published" as const,
            videoUrl: "intro.mp4",
            description: t('instructor_lessons_page.mock.desc_course_intro'),
            resources: ["course-outline.pdf"],
          },
          {
            id: 2,
            title: t('instructor_lessons_page.mock.lesson_setup_env'),
            type: "video" as const,
            duration: "8:45",
            status: "published" as const,
            videoUrl: "setup.mp4",
            description: t('instructor_lessons_page.mock.desc_setup_env'),
            resources: ["setup-guide.pdf"],
          },
        ],
      },
      {
        id: 2,
        title: t('instructor_lessons_page.mock.section_fundamentals'),
        lessons: [
          {
            id: 3,
            title: t('instructor_lessons_page.mock.lesson_variables'),
            type: "video" as const,
            duration: "12:20",
            status: "published" as const,
            videoUrl: "variables.mp4",
            description: t('instructor_lessons_page.mock.desc_variables'),
            resources: ["variables-cheatsheet.pdf"],
          },
          {
            id: 4,
            title: t('instructor_lessons_page.mock.lesson_functions'),
            type: "video" as const,
            duration: "15:30",
            status: "draft" as const,
            videoUrl: "",
            description: t('instructor_lessons_page.mock.desc_functions'),
            resources: [],
          },
          {
            id: 5,
            title: t('instructor_lessons_page.mock.lesson_quiz_basics'),
            type: "quiz" as const,
            duration: "10 min",
            status: "published" as const,
            questions: 10,
            description: t('instructor_lessons_page.mock.desc_quiz_basics'),
          },
        ],
      },
      {
        id: 3,
        title: t('instructor_lessons_page.mock.section_dom'),
        lessons: [
          {
            id: 6,
            title: t('instructor_lessons_page.mock.lesson_dom'),
            type: "video" as const,
            duration: "18:15",
            status: "published" as const,
            videoUrl: "dom-selection.mp4",
            description: t('instructor_lessons_page.mock.desc_dom'),
            resources: ["dom-reference.pdf"],
          },
        ],
      },
    ],
  }
}

const sectionStagger: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp: any = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

export function InstructorLessonsPage() {
  const { t } = useTranslation()
  const { params } = useRouter()
  const courseId = params?.courseId
  const legacyCourse = useMemo(() => createLegacyCourseStructure(t), [t])

  const [sections, setSections] = useLocalStorage<SectionItem[]>('courseSections', legacyCourse.sections)
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null)
  const [editingLesson, setEditingLesson] = useState<LessonItem | null>(null)
  const [showAddSection, setShowAddSection] = useState(false)
  const [showAddLesson, setShowAddLesson] = useState<number | null>(null)
  const [newSection, setNewSection] = useState({ title: '', description: '' })
  const [newLesson, setNewLesson] = useState({ title: '', type: 'video' as LessonType, description: '', duration: '' })

  const moveSection = useCallback((dragIndex: number, hoverIndex: number) => {
    setSections((prevSections) => {
      const next = [...prevSections]
      const dragged = next[dragIndex]
      next.splice(dragIndex, 1)
      next.splice(hoverIndex, 0, dragged)
      return next
    })
  }, [setSections])

  const moveLessonWithinSection = useCallback((sectionId: number, dragIndex: number, hoverIndex: number) => {
    setSections((prevSections) => {
      const next = [...prevSections]
      const sectionIndex = next.findIndex((section) => section.id === sectionId)
      if (sectionIndex === -1) return prevSections
      const section = { ...next[sectionIndex] }
      const lessons = [...section.lessons]
      const dragged = lessons[dragIndex]
      lessons.splice(dragIndex, 1)
      lessons.splice(hoverIndex, 0, dragged)
      section.lessons = lessons
      next[sectionIndex] = section
      return next
    })
  }, [setSections])

  const moveLessonBetweenSections = useCallback((fromSectionId: number, toSectionId: number, lessonId: number, toIndex: number) => {
    setSections((prevSections) => {
      const next = [...prevSections]
      const fromIndex = next.findIndex((section) => section.id === fromSectionId)
      const toIndexSection = next.findIndex((section) => section.id === toSectionId)
      if (fromIndex === -1 || toIndexSection === -1) return prevSections
      const fromSection = { ...next[fromIndex], lessons: [...next[fromIndex].lessons] }
      const toSection = { ...next[toIndexSection], lessons: [...next[toIndexSection].lessons] }
      const lessonIndex = fromSection.lessons.findIndex((lesson) => lesson.id === lessonId)
      if (lessonIndex === -1) return prevSections
      const [lesson] = fromSection.lessons.splice(lessonIndex, 1)
      toSection.lessons.splice(toIndex, 0, lesson)
      next[fromIndex] = fromSection
      next[toIndexSection] = toSection
      toast.success(t('instructor_lessons_page.lesson_moved', { title: lesson.title, section: toSection.title }))
      return next
    })
  }, [setSections, t])

  const handleDeleteSection = useCallback((sectionId: number) => {
    setSections((prevSections) => prevSections.filter((section) => section.id !== sectionId))
    toast.success(t('instructor_lessons_page.section_deleted'))
  }, [setSections, t])

  const handleDeleteLesson = useCallback((lessonId: number) => {
    setSections((prevSections) => prevSections.map((section) => ({ ...section, lessons: section.lessons.filter((lesson) => lesson.id !== lessonId) })))
    if (selectedLesson?.id === lessonId) setSelectedLesson(null)
    toast.success(t('instructor_lessons_page.lesson_deleted'))
  }, [selectedLesson, setSections, t])

  const handlePreviewLesson = (lesson: LessonItem) => {
    console.log('Preview lesson:', lesson)
    toast.info(t('instructor_lessons_page.preview_coming_soon'))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500 hover:bg-green-600">{t('instructor_lessons_page.status_published')}</Badge>
      case 'draft':
        return <Badge variant="secondary">{t('instructor_lessons_page.status_draft')}</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">{t('instructor_lessons_page.status_pending')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleSaveCurriculum = () => {
    if (sections.length === 0) {
      toast.error(t('instructor_lessons_page.add_section_before_saving'))
      return
    }
    if (sections.some((section) => section.lessons.length === 0)) {
      toast.error(t('instructor_lessons_page.all_sections_need_lessons'))
      return
    }
    console.log('Saving curriculum:', { courseId: courseId || 'course-1', sections })
    toast.success(t('instructor_lessons_page.curriculum_saved'))
  }

  const handleAddSection = () => {
    if (!newSection.title.trim()) {
      toast.error(t('instructor_lessons_page.enter_section_title'))
      return
    }
    setSections((prev) => [...prev, { id: Date.now(), title: newSection.title, lessons: [] }])
    setNewSection({ title: '', description: '' })
    setShowAddSection(false)
    toast.success(t('instructor_lessons_page.section_added'))
  }

  const handleAddLesson = (sectionId: number) => {
    if (!newLesson.title.trim()) {
      toast.error(t('instructor_lessons_page.enter_lesson_title'))
      return
    }
    const lesson: LessonItem & { quizData?: any } = {
      id: Date.now(),
      title: newLesson.title,
      type: newLesson.type,
      description: newLesson.description,
      duration: newLesson.duration || '5:00',
      status: 'draft',
    }
    if (newLesson.type === 'video') {
      lesson.videoUrl = ''
      lesson.resources = []
    } else if (newLesson.type === 'quiz') {
      lesson.questions = 0
      lesson.quizData = { title: newLesson.title, description: newLesson.description, passingScore: 70, questions: [] }
    }
    setSections((prevSections) => prevSections.map((section) => section.id === sectionId ? { ...section, lessons: [...section.lessons, lesson] } : section))
    const createdType = newLesson.type
    setNewLesson({ title: '', type: 'video', description: '', duration: '' })
    setShowAddLesson(null)
    toast.success(t(createdType === 'quiz' ? 'instructor_lessons_page.quiz_added' : 'instructor_lessons_page.lesson_added'))
    if (createdType === 'quiz') setTimeout(() => setEditingLesson(lesson), 100)
  }

  const handleSaveLesson = () => {
    if (!editingLesson) return
    setSections((prevSections) => prevSections.map((section) => ({ ...section, lessons: section.lessons.map((lesson) => lesson.id === editingLesson.id ? editingLesson : lesson) })))
    toast.success(t('instructor_lessons_page.lesson_updated'))
    setEditingLesson(null)
    if (selectedLesson?.id === editingLesson.id) setSelectedLesson(editingLesson)
  }

  const totalLessons = sections.reduce((total, section) => total + section.lessons.length, 0)
  const publishedLessons = sections.reduce((total, section) => total + section.lessons.filter((lesson) => lesson.status === 'published').length, 0)

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="container mx-auto px-4 py-8" variants={sectionStagger} initial="hidden" animate="show">
        <motion.div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" variants={fadeInUp}>
          {t('instructor_lessons_page.legacy_notice')}
        </motion.div>
        <motion.div className="mb-8" variants={fadeInUp}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="mb-2">{t('instructor_lessons_page.course_curriculum')}</h1>
              <p className="text-muted-foreground">{legacyCourse.title}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddSection(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('instructor_lessons_page.add_section')}
              </Button>
              <Button onClick={handleSaveCurriculum}>
                <Save className="h-4 w-4 mr-2" />
                {t('instructor_lessons_page.save_changes')}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{sections.length}</p><p className="text-sm text-muted-foreground">{t('instructor_lessons_page.sections')}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{totalLessons}</p><p className="text-sm text-muted-foreground">{t('instructor_lessons_page.total_lessons')}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{publishedLessons}</p><p className="text-sm text-muted-foreground">{t('instructor_lessons_page.published')}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{totalLessons - publishedLessons}</p><p className="text-sm text-muted-foreground">{t('instructor_lessons_page.drafts')}</p></CardContent></Card>
          </div>
        </motion.div>
        <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-8" variants={fadeInUp}>
          <div className="lg:col-span-2 space-y-6">
            <DndProvider backend={HTML5Backend}>
              {sections.map((section, sectionIndex) => (
                <DraggableSectionCard
                  key={section.id}
                  section={section}
                  index={sectionIndex}
                  moveSection={moveSection}
                  moveLessonWithinSection={moveLessonWithinSection}
                  moveLessonBetweenSections={moveLessonBetweenSections}
                  onAddLesson={(sectionId) => setShowAddLesson(sectionId)}
                  onEditSection={() => undefined}
                  onDeleteSection={handleDeleteSection}
                  onEditLesson={(lesson) => setEditingLesson(lesson)}
                  onPreviewLesson={handlePreviewLesson}
                  onDeleteLesson={handleDeleteLesson}
                  selectedLessonId={selectedLesson?.id}
                  onSelectLesson={(lesson) => setSelectedLesson(lesson)}
                  showAddLesson={showAddLesson === section.id}
                  addLessonContent={<div className="p-4 border rounded-lg bg-muted/30"><h4 className="font-medium mb-3">{t('instructor_lessons_page.add_new_lesson')}</h4><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Input placeholder={t('instructor_lessons_page.lesson_title_placeholder')} value={newLesson.title} onChange={(e) => setNewLesson((prev) => ({ ...prev, title: e.target.value }))} /><Select value={newLesson.type} onValueChange={(value) => setNewLesson((prev) => ({ ...prev, type: value as LessonType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="video">{t('instructor_lessons_page.video')}</SelectItem><SelectItem value="quiz">{t('instructor_lessons_page.quiz')}</SelectItem><SelectItem value="article">{t('instructor_lessons_page.article')}</SelectItem></SelectContent></Select></div><Textarea placeholder={t('instructor_lessons_page.lesson_description_placeholder')} value={newLesson.description} onChange={(e) => setNewLesson((prev) => ({ ...prev, description: e.target.value }))} /><div className="flex gap-2"><Button size="sm" onClick={() => handleAddLesson(section.id)}>{t('instructor_lessons_page.add_lesson')}</Button><Button size="sm" variant="outline" onClick={() => setShowAddLesson(null)}>{t('instructor_lessons_page.cancel')}</Button></div></div></div>}
                />
              ))}
            </DndProvider>
            {showAddSection && (
              <Card>
                <CardHeader><CardTitle>{t('instructor_lessons_page.add_new_section')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder={t('instructor_lessons_page.section_title_placeholder')} value={newSection.title} onChange={(e) => setNewSection((prev) => ({ ...prev, title: e.target.value }))} />
                  <Textarea placeholder={t('instructor_lessons_page.section_description_placeholder')} value={newSection.description} onChange={(e) => setNewSection((prev) => ({ ...prev, description: e.target.value }))} />
                  <div className="flex gap-2"><Button onClick={handleAddSection}>{t('instructor_lessons_page.add_section')}</Button><Button variant="outline" onClick={() => setShowAddSection(false)}>{t('instructor_lessons_page.cancel')}</Button></div>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-6">
            {selectedLesson ? (
              <Card>
                <CardHeader><CardTitle>{t('instructor_lessons_page.lesson_details')}</CardTitle><CardDescription>{t('instructor_lessons_page.edit_selected_lesson')}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><label className="text-sm font-medium">{t('instructor_lessons_page.title')}</label><Input value={selectedLesson.title} readOnly /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">{t('instructor_lessons_page.type_label')}</label><Badge variant="outline">{selectedLesson.type}</Badge></div>
                  <div className="space-y-2"><label className="text-sm font-medium">{t('instructor_lessons_page.duration')}</label><Input value={selectedLesson.duration} readOnly /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">{t('instructor_lessons_page.status')}</label>{getStatusBadge(selectedLesson.status)}</div>
                  <div className="space-y-2"><label className="text-sm font-medium">{t('instructor_lessons_page.description')}</label><Textarea value={selectedLesson.description} readOnly /></div>
                  {selectedLesson.type === 'video' && <div className="space-y-2"><label className="text-sm font-medium">{t('instructor_lessons_page.video')}</label><div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center"><Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">{selectedLesson.videoUrl ? t('instructor_lessons_page.video_uploaded') : t('instructor_lessons_page.upload_video_file')}</p><Button variant="outline" size="sm" className="mt-2">{selectedLesson.videoUrl ? t('instructor_lessons_page.change_video') : t('instructor_lessons_page.upload_video')}</Button></div></div>}
                  <div className="flex gap-2"><Button onClick={() => setEditingLesson(selectedLesson)} className="flex-1"><Edit3 className="h-4 w-4 mr-2" />{t('instructor_lessons_page.edit')}</Button><Button variant="outline"><Eye className="h-4 w-4 mr-2" />{t('instructor_lessons_page.preview')}</Button></div>
                </CardContent>
              </Card>
            ) : (
              <Card><CardContent className="p-8 text-center"><FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-medium mb-2">{t('instructor_lessons_page.select_a_lesson')}</h3><p className="text-sm text-muted-foreground">{t('instructor_lessons_page.select_a_lesson_desc')}</p></CardContent></Card>
            )}
          </div>
        </motion.div>
        {editingLesson && editingLesson.type !== 'quiz' && (
          <Dialog open={!!editingLesson} onOpenChange={() => setEditingLesson(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{t('instructor_lessons_page.edit_lesson')}</DialogTitle><DialogDescription>{t('instructor_lessons_page.update_lesson_content')}</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><label className="text-sm font-medium">{t('instructor_lessons_page.title')}</label><Input value={editingLesson.title} onChange={(e) => setEditingLesson((prev) => prev ? { ...prev, title: e.target.value } : prev)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">{t('instructor_lessons_page.description')}</label><Textarea value={editingLesson.description} onChange={(e) => setEditingLesson((prev) => prev ? { ...prev, description: e.target.value } : prev)} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-sm font-medium">{t('instructor_lessons_page.duration')}</label><Input value={editingLesson.duration} onChange={(e) => setEditingLesson((prev) => prev ? { ...prev, duration: e.target.value } : prev)} /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">{t('instructor_lessons_page.status')}</label><Select value={editingLesson.status} onValueChange={(value) => setEditingLesson((prev) => prev ? { ...prev, status: value as LessonStatus } : prev)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">{t('instructor_lessons_page.status_draft')}</SelectItem><SelectItem value="published">{t('instructor_lessons_page.status_published')}</SelectItem><SelectItem value="pending">{t('instructor_lessons_page.status_pending_review')}</SelectItem></SelectContent></Select></div>
                </div>
                <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={() => setEditingLesson(null)}>{t('instructor_lessons_page.cancel')}</Button><Button onClick={handleSaveLesson}>{t('instructor_lessons_page.save_changes')}</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {editingLesson && editingLesson.type === 'quiz' && (
          <Dialog open={!!editingLesson} onOpenChange={() => setEditingLesson(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t('instructor_lessons_page.edit_quiz')}</DialogTitle><DialogDescription>{t('instructor_lessons_page.manage_quiz_questions')}</DialogDescription></DialogHeader>
              <DndProvider backend={HTML5Backend}>
                <QuizEditor
                  quizData={editingLesson.quizData}
                  onSave={(quizData) => {
                    const updatedLesson = { ...editingLesson, quizData, questions: quizData.questions.length, duration: quizData.timeLimit ? `${quizData.timeLimit} min` : t('instructor_lessons_page.no_time_limit') }
                    setSections((prevSections) => prevSections.map((section) => ({ ...section, lessons: section.lessons.map((lesson) => lesson.id === updatedLesson.id ? updatedLesson : lesson) })))
                    if (selectedLesson?.id === updatedLesson.id) setSelectedLesson(updatedLesson)
                    toast.success(t('instructor_lessons_page.quiz_saved'))
                    setEditingLesson(null)
                  }}
                  onCancel={() => setEditingLesson(null)}
                />
              </DndProvider>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>
    </motion.div>
  )
}
