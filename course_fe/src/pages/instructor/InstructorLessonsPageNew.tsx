import { useState, useCallback, useEffect, useRef } from 'react'
import { BulkActionsBar } from "../../components/BulkActionsBar"
import { DarkModeToggle } from "../../components/DarkModeToggle"
import { useLocalStorage } from "../../hooks/useLocalStorage"
import { useRouter } from "../../components/Router"
import { AnimatePresence } from 'motion/react'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea } from '../../components/AntdCompat'
import { CourseStatsHorizontal } from '../../components/CourseStatsHorizontal'
import { LessonEditorMain } from '../../components/LessonEditorMain'
import { CourseOutlineSidebar } from '../../components/CourseOutlineSidebar'
import { LessonPreviewModal } from '../../components/LessonPreviewModal'
import { CheckSquare, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '../../lib/apiError'
import { formatLessonDurationInput } from '../../utils/lessonDuration'
import { getAllCourseModules, createCourseModule, deleteCourseModule, updateCourseModule } from "../../services/course-modules.api"
import { getAllLessons, getLessonById, createLesson, deleteLesson as deleteLessonApi, updateLesson as updateLessonApi } from "../../services/lessons.api"
import { getLessonQuiz } from "../../services/quiz-questions.api"
import { getCourseById } from "../../services/course.api"
import { generateLessonTranscript } from "../../services/transcript.api"
import { useTranslation } from 'react-i18next'
import { confirmDialog } from '../../utils/confirmDialog'



export function InstructorLessonsPageNew() {
  const { params, navigate } = useRouter()
  const { t } = useTranslation()
  const courseId = params?.courseId


  const [sections, setSections] = useLocalStorage(`courseSections_${courseId}`, [] as any[])
  const [courseTitle, setCourseTitle] = useState('')
  const [selectedLesson, setSelectedLesson] = useState<any>(null)

  const [editingSection, setEditingSection] = useState<any>(null)
  const [editingSectionForm, setEditingSectionForm] = useState({ title: '', description: '' })
  const [showAddSection, setShowAddSection] = useState(false)
  const [showAddLesson, setShowAddLesson] = useState<number | null>(null)
  const [newSection, setNewSection] = useState({ title: '', description: '' })
  const [newLesson, setNewLesson] = useState({
    title: '',
    type: 'video',
    description: '',
    duration: ''
  })

  const lessonPositionRef = useRef<Map<number, { coursemodule: number; order: number }>>(new Map())
  const sectionOrderRef = useRef<Map<number, number>>(new Map())


  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('lessonSidebarCollapsed', false)
  const [showStatsPanel, setShowStatsPanel] = useLocalStorage('showStatsPanel', true)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [previewLesson, setPreviewLesson] = useState<any>(null)
  const [transcriptActionLessonId, setTranscriptActionLessonId] = useState<number | null>(null)
  const hasLoadedInitialDataRef = useRef(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  type SectionOrderUpdate = { id: number; payload: { order_number: number } }
  type LessonOrderUpdate = { id: number; payload: { order?: number; coursemodule?: number } }

  const syncSavedPositionSnapshot = useCallback((nextSections: any[]) => {
    const nextLessonPositions = new Map<number, { coursemodule: number; order: number }>()
    const nextSectionOrders = new Map<number, number>()

    nextSections.forEach((section, sectionIndex) => {
      nextSectionOrders.set(section.id, sectionIndex + 1)
      section.lessons.forEach((lesson: any, lessonIndex: number) => {
        nextLessonPositions.set(lesson.id, {
          coursemodule: section.id,
          order: lessonIndex + 1,
        })
      })
    })

    lessonPositionRef.current = nextLessonPositions
    sectionOrderRef.current = nextSectionOrders
  }, [])

  const scrollToCurriculumNode = useCallback((elementId: string, block: ScrollLogicalPosition = 'center') => {
    if (typeof document === 'undefined') return
    const element = document.getElementById(elementId)
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block })
  }, [])

  const handleSelectLessonFromSidebar = useCallback((lesson: any) => {
    setSelectedLesson(lesson)
    requestAnimationFrame(() => {
      scrollToCurriculumNode(`lesson-card-${lesson.id}`)
    })
  }, [scrollToCurriculumNode])

  const handleSelectSectionFromSidebar = useCallback((sectionId: number) => {
    requestAnimationFrame(() => {
      scrollToCurriculumNode(`section-card-${sectionId}`, 'start')
    })
  }, [scrollToCurriculumNode])

  const buildCurriculumChanges = useCallback((): {
    sectionUpdates: SectionOrderUpdate[]
    lessonUpdates: LessonOrderUpdate[]
  } => {
    const sectionUpdates: SectionOrderUpdate[] = []
    const lessonUpdates: LessonOrderUpdate[] = []

    sections.forEach((section, sectionIndex) => {
      const nextSectionOrder = sectionIndex + 1
      const savedSectionOrder = sectionOrderRef.current.get(section.id)
      if (savedSectionOrder === undefined || savedSectionOrder !== nextSectionOrder) {
        sectionUpdates.push({
          id: section.id,
          payload: { order_number: nextSectionOrder },
        })
      }

      section.lessons.forEach((lesson: any, lessonIndex: number) => {
        const nextOrder = lessonIndex + 1
        const saved = lessonPositionRef.current.get(lesson.id)

        const changedSection = !saved || saved.coursemodule !== section.id
        const changedOrder = !saved || saved.order !== nextOrder
        if (!changedSection && !changedOrder) return

        const payload: { order?: number; coursemodule?: number } = {}
        if (changedSection) payload.coursemodule = section.id
        if (changedOrder) payload.order = nextOrder
        lessonUpdates.push({ id: lesson.id, payload })
      })
    })

    return { sectionUpdates, lessonUpdates }
  }, [sections])

  const persistCurriculumChanges = useCallback(async (options?: {
    silentNoChanges?: boolean
    showSuccessToast?: boolean
  }) => {
    const { silentNoChanges = false, showSuccessToast = false } = options || {}
    const { sectionUpdates, lessonUpdates } = buildCurriculumChanges()
    const totalChanges = sectionUpdates.length + lessonUpdates.length

    if (totalChanges === 0) {
      if (!silentNoChanges) {
        toast.info(t('instructor_lessons_page_new.toasts.no_curriculum_changes'))
      }
      return
    }

    try {
      setIsAutoSaving(true)
      await Promise.all([
        ...sectionUpdates.map(item => updateCourseModule(item.id, item.payload)),
        ...lessonUpdates.map(item => updateLessonApi(item.id, item.payload)),
      ])
      syncSavedPositionSnapshot(sections)
      if (showSuccessToast) {
        toast.success(t('instructor_lessons_page_new.toasts.saved_changes', { count: totalChanges }))
      }
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_lessons_page_new.toasts.failed_to_save_curriculum'))
    } finally {
      setIsAutoSaving(false)
    }
  }, [buildCurriculumChanges, sections, syncSavedPositionSnapshot, t])


  useEffect(() => {
    if (!courseId) return
    let cancelled = false

    async function fetchCourseData() {
      try {

        const course = await getCourseById(Number(courseId))
        if (cancelled) return
        setCourseTitle(course.title)


        const modules = await getAllCourseModules(Number(courseId))
        if (cancelled) return


        const sectionsData = await Promise.all(
          modules.map(async (mod) => {
            const lessons = await getAllLessons(mod.id)
            return {
              id: mod.id,
              title: mod.title,
              lessons: lessons.map((l: any, idx: number) => ({
                id: l.id,
                title: l.title,
                type: l.content_type || 'video',
                content_type: l.content_type || 'video',
                order: typeof l.order === 'number' ? l.order : idx + 1,
                duration: formatLessonDurationInput(l.duration, '0 min'),
                is_free: l.is_free || false,
                videoUrl: l.video_url || '',
                videoPublicId: l.video_public_id || '',
                description: l.description || '',
                transcript_status: l.transcript_status || null,
                has_published_transcript: l.has_published_transcript || false,
                resources: [],
              }))
            }
          })
        )
        if (cancelled) return
        setSections(sectionsData)
        syncSavedPositionSnapshot(sectionsData)
        hasLoadedInitialDataRef.current = true
      } catch (err) {
        console.error(t('instructor_lessons_page_new.errors.load_course_structure_console'), err)
        toast.error(getErrorMessage(err, t('instructor_lessons_page_new.errors.load_course_structure_console')))
      }
    }
    fetchCourseData()
    return () => { cancelled = true }
  }, [courseId, syncSavedPositionSnapshot, t])


  const [showBulkSelection, setShowBulkSelection] = useState(false)
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<number>>(new Set())


  const handleCheckLesson = useCallback((lessonId: number, checked: boolean) => {
    setSelectedLessonIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(lessonId)
      } else {
        newSet.delete(lessonId)
      }
      return newSet
    })
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedLessonIds(new Set())
  }, [])

  const handleBulkDelete = useCallback(async () => {
    if (!await confirmDialog(t('instructor_lessons_page_new.confirms.delete_lessons', { count: selectedLessonIds.size }))) {
      return
    }

    try {
      await Promise.all(
        Array.from(selectedLessonIds).map(id => deleteLessonApi(id))
      )
      setSections(prevSections =>
        prevSections.map(section => ({
          ...section,
            lessons: section.lessons.filter(lesson => !selectedLessonIds.has(lesson.id))
        }))
      )
      toast.success(t('instructor_lessons_page_new.toasts.deleted_lessons', { count: selectedLessonIds.size }))
      handleClearSelection()
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_lessons_page_new.toasts.failed_to_delete_lessons'))
    }
  }, [selectedLessonIds, setSections, handleClearSelection, t])


  const moveSection = useCallback((dragIndex: number, hoverIndex: number) => {
    setSections(prevSections => {
      const newSections = [...prevSections]
      const dragSection = newSections[dragIndex]
      newSections.splice(dragIndex, 1)
      newSections.splice(hoverIndex, 0, dragSection)
      return newSections
    })
  }, [setSections])

  const moveLessonWithinSection = useCallback((sectionId: number, dragIndex: number, hoverIndex: number) => {
    setSections(prevSections => {
      const newSections = [...prevSections]
      const sectionIndex = newSections.findIndex(s => s.id === sectionId)

      if (sectionIndex === -1) return prevSections

      const section = { ...newSections[sectionIndex] }
      const lessons = [...section.lessons]

      const dragLesson = lessons[dragIndex]
      lessons.splice(dragIndex, 1)
      lessons.splice(hoverIndex, 0, dragLesson)

      section.lessons = lessons
      newSections[sectionIndex] = section

      return newSections
    })
  }, [setSections])

  const moveLessonBetweenSections = useCallback((fromSectionId: number, toSectionId: number, lessonId: number, toIndex: number) => {
    setSections(prevSections => {
      const newSections = [...prevSections]

      const fromSectionIndex = newSections.findIndex(s => s.id === fromSectionId)
      const toSectionIndex = newSections.findIndex(s => s.id === toSectionId)

      if (fromSectionIndex === -1 || toSectionIndex === -1) return prevSections

      const fromSection = { ...newSections[fromSectionIndex] }
      const toSection = { ...newSections[toSectionIndex] }

      const lessonIndex = fromSection.lessons.findIndex(l => l.id === lessonId)
      if (lessonIndex === -1) return prevSections

      const [lesson] = fromSection.lessons.splice(lessonIndex, 1)
      toSection.lessons.splice(toIndex, 0, lesson)

      newSections[fromSectionIndex] = fromSection
      newSections[toSectionIndex] = toSection

      toast.success(t('instructor_lessons_page_new.toasts.moved_lesson', {
        lesson: lesson.title,
        section: toSection.title,
      }))

      return newSections
    })
  }, [setSections, t])


  const handleAddSection = async () => {
    if (!newSection.title.trim()) {
      toast.error(t('instructor_lessons_page_new.toasts.enter_section_title'))
      return
    }

    try {
      const created = await createCourseModule({
        course: Number(courseId),
        title: newSection.title,
        description: newSection.description,
        order_number: sections.length + 1,
      })
      const section = {
        id: created.id,
        title: created.title,
        lessons: []
      }
      setSections(prev => [...prev, section])
      sectionOrderRef.current.set(created.id, sections.length + 1)
      setNewSection({ title: '', description: '' })
      setShowAddSection(false)
      toast.success(t('instructor_lessons_page_new.toasts.section_added'))
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_lessons_page_new.toasts.failed_to_add_section'))
    }
  }

  const handleAddLesson = async (sectionId: number) => {
    if (!newLesson.title.trim()) {
      toast.error(t('instructor_lessons_page_new.toasts.enter_lesson_title'))
      return
    }

    try {
      const section = sections.find(s => s.id === sectionId)
      const orderNum = section ? section.lessons.length + 1 : 1

      const created = await createLesson({
        coursemodule: sectionId,
        title: newLesson.title,
        content_type: newLesson.type as any,
        description: newLesson.description,
        duration: 0,
        order: orderNum,
      })

      const lesson: any = {
        id: created.id,
        title: created.title,
        type: created.content_type || newLesson.type,
        content_type: created.content_type || newLesson.type,
        description: created.description || '',
        duration: '',
        order: typeof created.order === 'number' ? created.order : orderNum,
        is_free: false,
        videoUrl: '',
        videoPublicId: '',
        resources: [],
        transcript_status: created.transcript_status || null,
        has_published_transcript: created.has_published_transcript || false,
      }

      if (newLesson.type === 'quiz') {
        lesson.questions = 0
        lesson.quizData = {
          title: newLesson.title,
          description: newLesson.description,
          passingScore: 70,
          questions: []
        }
      }

      setSections(prevSections =>
        prevSections.map(s =>
          s.id === sectionId
            ? { ...s, lessons: [...s.lessons, lesson] }
            : s
        )
      )
      lessonPositionRef.current.set(created.id, {
        coursemodule: sectionId,
        order: typeof created.order === 'number' ? created.order : orderNum,
      })

      setNewLesson({ title: '', type: 'video', description: '', duration: '' })
      setShowAddLesson(null)
      toast.success(
        newLesson.type === 'quiz'
          ? t('instructor_lessons_page_new.toasts.quiz_added')
          : t('instructor_lessons_page_new.toasts.lesson_added')
      )
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_lessons_page_new.toasts.failed_to_add_lesson'))
    }
  }

  const handleDeleteSection = useCallback(async (sectionId: number) => {
    try {
      await deleteCourseModule(sectionId)
      setSections(prevSections => {
        const removed = prevSections.find(section => section.id === sectionId)
        sectionOrderRef.current.delete(sectionId)
        if (removed) {
          removed.lessons.forEach((lesson: any) => {
            lessonPositionRef.current.delete(lesson.id)
          })
        }
        return prevSections.filter(section => section.id !== sectionId)
      })
      toast.success(t('instructor_lessons_page_new.toasts.section_deleted'))
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_lessons_page_new.toasts.failed_to_delete_section'))
    }
  }, [setSections, t])

  const handleDeleteLesson = useCallback(async (lessonId: number) => {
    try {
      await deleteLessonApi(lessonId)
      lessonPositionRef.current.delete(lessonId)
      setSections(prevSections =>
        prevSections.map(section => ({
          ...section,
          lessons: section.lessons.filter(lesson => lesson.id !== lessonId)
        }))
      )
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson(null)
      }
      toast.success(t('instructor_lessons_page_new.toasts.lesson_deleted'))
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_lessons_page_new.toasts.failed_to_delete_lesson'))
    }
  }, [selectedLesson, setSections, t])

  const handleEditSection = (section: any) => {
    setEditingSection(section)
    setEditingSectionForm({
      title: section.title || '',
      description: section.description || '',
    })
  }

  const handleSaveSection = useCallback(async () => {
    if (!editingSection) return
    if (!editingSectionForm.title.trim()) {
      toast.error(t('instructor_lessons_page_new.toasts.enter_section_title'))
      return
    }

    try {
      const updated = await updateCourseModule(editingSection.id, {
        title: editingSectionForm.title.trim(),
        description: editingSectionForm.description.trim(),
      })
      setSections(prevSections =>
        prevSections.map(section =>
          section.id === editingSection.id
            ? {
                ...section,
                title: updated.title,
                description: updated.description || '',
              }
            : section
        )
      )
      setEditingSection(null)
      setEditingSectionForm({ title: '', description: '' })
      toast.success(t('instructor_lessons_page_new.toasts.section_updated'))
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_lessons_page_new.toasts.failed_to_update_section'))
    }
  }, [editingSection, editingSectionForm, setSections, t])

  const handleEditLesson = (lesson: any) => {

    navigate(`/instructor/lessons/${lesson.id}/edit`, undefined, {
      courseId: courseId || '',
    })
  }

  const handleSaveLesson = useCallback(async (updatedLesson: any) => {
    try {
      await updateLessonApi(updatedLesson.id, {
        title: updatedLesson.title,
        description: updatedLesson.description,
        content_type: updatedLesson.content_type || updatedLesson.type,
        video_url: updatedLesson.videoUrl,
        video_public_id: updatedLesson.videoPublicId || undefined,
        is_free: updatedLesson.is_free,
      })
      setSections(prevSections =>
        prevSections.map(section => ({
          ...section,
          lessons: section.lessons.map(lesson =>
            lesson.id === updatedLesson.id ? updatedLesson : lesson
          )
        }))
      )
      toast.success(t('instructor_lessons_page_new.toasts.lesson_saved'))
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_lessons_page_new.toasts.failed_to_save_lesson'))
    }
  }, [setSections, t])

  const handlePreviewLesson = async (lesson: any) => {
    const type = lesson.content_type || lesson.type
    if (type === 'code') {
      try {
        const lessonQuiz = await getLessonQuiz(lesson.id)
        const codeQuestion = lessonQuiz.questions.find((q: any) => q.question_type === 'code')
        if (codeQuestion) {
          setPreviewLesson({
            ...lesson,
            quizData: {
              functionName: codeQuestion.function_name || undefined,
              executionMode: codeQuestion.execution_mode || (codeQuestion.function_name ? 'function' : 'stdin'),
              starterCode: codeQuestion.starter_code
                ? { javascript: codeQuestion.starter_code, 63: codeQuestion.starter_code }
                : undefined,
              testCases: (codeQuestion.test_cases || []).map((tc: any) => ({
                id: tc.id,
                input: tc.input_data,
                expectedOutput: tc.expected_output || '',
                isHidden: tc.is_hidden,
              })),
            },
          })
          return
        }
      } catch (e) {
        // getLessonQuiz failed — fallback to lesson.content (JSON-serialized quizData)
        try {
          const fullLesson = await getLessonById(lesson.id)
          if (fullLesson.content) {
            const quizData = JSON.parse(fullLesson.content)
            setPreviewLesson({ ...lesson, quizData })
            return
          }
        } catch (e2) {
          console.error('Failed to load lesson content for preview', e2)
        }
      }
    }
    setPreviewLesson(lesson)
  }

  const handleGenerateTranscript = useCallback(async (lesson: any) => {
    try {
      setTranscriptActionLessonId(lesson.id)
      const job = await generateLessonTranscript(lesson.id)
      setSections(prevSections =>
        prevSections.map(section => ({
          ...section,
          lessons: section.lessons.map(item =>
            item.id === lesson.id
              ? {
                  ...item,
                  transcript_status: job.status,
                }
              : item
          )
        }))
      )
      toast.success(
        lesson.has_published_transcript
          ? t('instructor_lessons_page_new.toasts.transcript_regenerate_queued')
          : t('instructor_lessons_page_new.toasts.transcript_generation_queued')
      )
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || t('instructor_lessons_page_new.toasts.transcript_queue_failed'))
    } finally {
      setTranscriptActionLessonId(null)
    }
  }, [setSections, t])

  const handleSaveCurriculum = async () => {
    if (sections.length === 0) {
      toast.error(t('instructor_lessons_page_new.toasts.add_section_before_saving'))
      return
    }

    const emptySections = sections.filter(s => s.lessons.length === 0)
    if (emptySections.length > 0) {
      toast.error(t('instructor_lessons_page_new.toasts.all_sections_need_lessons'))
      return
    }

    await persistCurriculumChanges({ showSuccessToast: true })
  }

  useEffect(() => {
    if (!hasLoadedInitialDataRef.current) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    const { sectionUpdates, lessonUpdates } = buildCurriculumChanges()
    if (sectionUpdates.length + lessonUpdates.length === 0) return

    autoSaveTimerRef.current = setTimeout(() => {
      void persistCurriculumChanges({ silentNoChanges: true, showSuccessToast: false })
    }, 1200)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [sections, buildCurriculumChanges, persistCurriculumChanges])

  return (
    <div className="min-h-screen bg-background">
      <div
        className="px-4 py-8 transition-all duration-300 ease-in-out"
        style={{
          paddingRight: isSidebarCollapsed ? 'calc(3rem + 2rem)' : 'calc(22rem + 2rem)',
          paddingLeft: '2rem',
          maxWidth: '100vw'
        }}
      >

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/instructor/courses')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('instructor_lessons_page_new.actions.back_to_courses')}
                </Button>
                {courseId && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/instructor/courses/${courseId}`)}>
                    {t('instructor_lessons_page_new.actions.view_course_detail')}
                  </Button>
                )}
              </div>
              <h1 className="mb-1">{t('instructor_lessons_page_new.title')}</h1>
              <p className="text-muted-foreground">{courseTitle}</p>
            </div>

            <div className="flex gap-2">
              <DarkModeToggle />
              <div className="text-xs text-muted-foreground self-center px-2">
                {isAutoSaving
                  ? t('instructor_lessons_page_new.auto_save.saving')
                  : t('instructor_lessons_page_new.auto_save.enabled')}
              </div>

              <Button
                variant={showBulkSelection ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newBulkMode = !showBulkSelection
                  setShowBulkSelection(newBulkMode)


                  if (newBulkMode && isSidebarCollapsed) {
                    setIsSidebarCollapsed(false)
                  }


                  if (!newBulkMode) {
                    handleClearSelection()
                  }
                }}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                {showBulkSelection
                  ? t('instructor_lessons_page_new.actions.bulk_edit_mode')
                  : t('instructor_lessons_page_new.actions.bulk_edit')}
              </Button>
            </div>
          </div>


          <CourseStatsHorizontal sections={sections} />
        </div>


        <div className="mb-4">

        </div>


        <div className="flex gap-4 h-[calc(100vh-520px)]">

          <div className="flex-1">
            <LessonEditorMain
              sections={sections}
              showAddSection={showAddSection}
              showAddLesson={showAddLesson}
              newSection={newSection}
              newLesson={newLesson}
              selectedLesson={selectedLesson}
              onSectionsChange={setSections}
              onShowAddSection={setShowAddSection}
              onShowAddLesson={setShowAddLesson}
              onNewSectionChange={setNewSection}
              onNewLessonChange={setNewLesson}
              onAddSection={handleAddSection}
              onAddLesson={handleAddLesson}
              onEditSection={handleEditSection}
              onDeleteSection={handleDeleteSection}
              onEditLesson={handleEditLesson}
              onPreviewLesson={handlePreviewLesson}
              onDeleteLesson={handleDeleteLesson}
              onGenerateTranscript={handleGenerateTranscript}
              transcriptActionLessonId={transcriptActionLessonId}
              onSelectLesson={setSelectedLesson}
              onSaveCurriculum={handleSaveCurriculum}
              moveSection={moveSection}
              moveLessonWithinSection={moveLessonWithinSection}
              moveLessonBetweenSections={moveLessonBetweenSections}
            />
          </div>
        </div>
      </div>


      <CourseOutlineSidebar
        sections={sections}
        selectedLesson={selectedLesson}
        onSelectLesson={handleSelectLessonFromSidebar}
        onSelectSection={handleSelectSectionFromSidebar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        showCheckboxes={showBulkSelection}
        selectedLessonIds={selectedLessonIds}
        onCheckLesson={handleCheckLesson}
        onToggleBulkMode={() => {
          setShowBulkSelection(false)
          handleClearSelection()
        }}
      />


      <AnimatePresence>
        {showBulkSelection && selectedLessonIds.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedLessonIds.size}
            onDeleteAll={handleBulkDelete}
            onClearSelection={handleClearSelection}
          />
        )}
      </AnimatePresence>


      {previewLesson && (
        <LessonPreviewModal
          open={!!previewLesson}
          onOpenChange={(open) => {
            if (!open) setPreviewLesson(null)
          }}
          lesson={previewLesson}
        />
      )}
      <Dialog
        open={!!editingSection}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSection(null)
            setEditingSectionForm({ title: '', description: '' })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('instructor_lessons_page_new.dialogs.edit_section_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-section-title">{t('instructor_lessons_page_new.dialogs.section_title')}</Label>
              <Input
                id="edit-section-title"
                value={editingSectionForm.title}
                onChange={(e) => setEditingSectionForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-section-description">{t('instructor_lessons_page_new.dialogs.description')}</Label>
              <Textarea
                id="edit-section-description"
                rows={4}
                value={editingSectionForm.description}
                onChange={(e) => setEditingSectionForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>
              {t('instructor_lessons_page_new.actions.cancel')}
            </Button>
            <Button onClick={handleSaveSection}>{t('instructor_lessons_page_new.actions.save_section')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
