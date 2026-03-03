import { useState, useCallback, useEffect } from 'react'
import { QuickStatsPanel } from "../../components/QuickStatsPanel"
import { BulkActionsBar } from "../../components/BulkActionsBar"
import { LessonEditorDialog } from "../../components/LessonEditorDialog"
import { DarkModeToggle } from "../../components/DarkModeToggle"
import { useLocalStorage } from "../../hooks/useLocalStorage"
import { useRouter } from "../../components/Router"
import { AnimatePresence } from 'motion/react'
import { Button } from '../../components/ui/button'
import { CourseStatsHorizontal } from '../../components/CourseStatsHorizontal'
import { LessonEditorMain } from '../../components/LessonEditorMain'
import { CourseOutlineSidebar } from '../../components/CourseOutlineSidebar'
import { LayoutDashboard, CheckSquare } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { getAllCourseModules, createCourseModule, deleteCourseModule } from "../../services/course-modules.api"
import { getLessons, createLesson, deleteLesson as deleteLessonApi, updateLesson as updateLessonApi } from "../../services/lessons.api"
import { getCourseById } from "../../services/course.api"

// Course structure is now fetched from API in the component's useEffect

export function InstructorLessonsPageNew() {
  const { params, navigate } = useRouter()
  const courseId = params?.courseId
  
  // State management
  const [sections, setSections] = useLocalStorage(`courseSections_${courseId}`, [] as any[])
  const [courseTitle, setCourseTitle] = useState('')
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  // const [editingLesson, setEditingLesson] = useState<any>(null) // No longer needed
  const [editingSection, setEditingSection] = useState<any>(null)
  const [showAddSection, setShowAddSection] = useState(false)
  const [showAddLesson, setShowAddLesson] = useState<number | null>(null)
  const [newSection, setNewSection] = useState({ title: '', description: '' })
  const [newLesson, setNewLesson] = useState({
    title: '',
    type: 'video',
    description: '',
    duration: ''
  })
  
  // Layout state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('lessonSidebarCollapsed', false)
  const [showStatsPanel, setShowStatsPanel] = useLocalStorage('showStatsPanel', true)

  // Fetch course modules and lessons from API
  useEffect(() => {
    if (!courseId) return
    let cancelled = false

    async function fetchCourseData() {
      try {
        // Fetch course title
        const course = await getCourseById(Number(courseId))
        if (cancelled) return
        setCourseTitle(course.title)

        // Fetch modules
        const modules = await getAllCourseModules(Number(courseId))
        if (cancelled) return

        // Fetch lessons for each module
        const sectionsData = await Promise.all(
          modules.map(async (mod) => {
            const lessonsRes = await getLessons(mod.id)
            return {
              id: mod.id,
              title: mod.title,
              lessons: lessonsRes.results.map((l: any) => ({
                id: l.id,
                title: l.title,
                type: l.content_type || 'video',
                content_type: l.content_type || 'video',
                duration: l.duration ? `${Math.floor(l.duration / 60)}:${String(l.duration % 60).padStart(2, '0')}` : '0:00',
                status: l.status || 'draft',
                is_free: l.is_free || false,
                videoUrl: l.video_url || '',
                description: l.description || '',
                resources: [],
              }))
            }
          })
        )
        if (cancelled) return
        setSections(sectionsData)
      } catch (err) {
        console.error('Failed to load course structure:', err)
        // Keep local storage data as fallback
      }
    }
    fetchCourseData()
    return () => { cancelled = true }
  }, [courseId])

  // Bulk selection state
  const [showBulkSelection, setShowBulkSelection] = useState(false)
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<number>>(new Set())

  // Bulk selection handlers
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

  const handleBulkPublish = useCallback(async () => {
    try {
      await Promise.all(
        Array.from(selectedLessonIds).map(id => updateLessonApi(id, { status: 'published' }))
      )
      setSections(prevSections => 
        prevSections.map(section => ({
          ...section,
          lessons: section.lessons.map(lesson =>
            selectedLessonIds.has(lesson.id)
              ? { ...lesson, status: 'published' }
              : lesson
          )
        }))
      )
      toast.success(`Published ${selectedLessonIds.size} lesson(s)`)
      handleClearSelection()
    } catch (err) {
      console.error(err)
      toast.error('Failed to publish some lessons')
    }
  }, [selectedLessonIds, setSections, handleClearSelection])

  const handleBulkUnpublish = useCallback(async () => {
    try {
      await Promise.all(
        Array.from(selectedLessonIds).map(id => updateLessonApi(id, { status: 'draft' }))
      )
      setSections(prevSections => 
        prevSections.map(section => ({
          ...section,
          lessons: section.lessons.map(lesson =>
            selectedLessonIds.has(lesson.id)
              ? { ...lesson, status: 'draft' }
              : lesson
          )
        }))
      )
      toast.success(`Unpublished ${selectedLessonIds.size} lesson(s)`)
      handleClearSelection()
    } catch (err) {
      console.error(err)
      toast.error('Failed to unpublish some lessons')
    }
  }, [selectedLessonIds, setSections, handleClearSelection])

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`Are you sure you want to delete ${selectedLessonIds.size} lesson(s)? This action cannot be undone.`)) {
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
      toast.success(`Deleted ${selectedLessonIds.size} lesson(s)`)
      handleClearSelection()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete some lessons')
    }
  }, [selectedLessonIds, setSections, handleClearSelection])

  // Drag & Drop handlers
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
      
      toast.success(`Moved "${lesson.title}" to ${toSection.title}`)
      
      return newSections
    })
  }, [setSections])

  // CRUD handlers
  const handleAddSection = async () => {
    if (!newSection.title.trim()) {
      toast.error('Please enter a section title')
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
      setNewSection({ title: '', description: '' })
      setShowAddSection(false)
      toast.success('Section added successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to add section')
    }
  }

  const handleAddLesson = async (sectionId: number) => {
    if (!newLesson.title.trim()) {
      toast.error('Please enter a lesson title')
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
        duration: newLesson.duration ? parseInt(newLesson.duration.split(':')[0]) * 60 + parseInt(newLesson.duration.split(':')[1] || '0') : 300,
        order: orderNum,
        status: 'draft',
      })

      const lesson: any = {
        id: created.id,
        title: created.title,
        type: created.content_type || newLesson.type,
        content_type: created.content_type || newLesson.type,
        description: created.description || '',
        duration: newLesson.duration || '5:00',
        status: 'draft',
        is_free: false,
        videoUrl: '',
        resources: [],
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

      setNewLesson({ title: '', type: 'video', description: '', duration: '' })
      setShowAddLesson(null)
      toast.success(`${newLesson.type === 'quiz' ? 'Quiz' : 'Lesson'} added successfully`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to add lesson')
    }
  }

  const handleDeleteSection = useCallback(async (sectionId: number) => {
    try {
      await deleteCourseModule(sectionId)
      setSections(prevSections => prevSections.filter(section => section.id !== sectionId))
      toast.success('Section deleted successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete section')
    }
  }, [setSections])

  const handleDeleteLesson = useCallback(async (lessonId: number) => {
    try {
      await deleteLessonApi(lessonId)
      setSections(prevSections => 
        prevSections.map(section => ({
          ...section,
          lessons: section.lessons.filter(lesson => lesson.id !== lessonId)
        }))
      )
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson(null)
      }
      toast.success('Lesson deleted successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete lesson')
    }
  }, [selectedLesson, setSections])

  const handleEditSection = (section: any) => {
    setEditingSection(section)
    toast.info('Edit section dialog (coming in next step)')
  }

  const handleEditLesson = (lesson: any) => {
    // Navigate to full-page editor
    navigate(`/instructor/lessons/${lesson.id}/edit`)
  }

  const handleSaveLesson = useCallback(async (updatedLesson: any) => {
    try {
      await updateLessonApi(updatedLesson.id, {
        title: updatedLesson.title,
        description: updatedLesson.description,
        content_type: updatedLesson.content_type || updatedLesson.type,
        video_url: updatedLesson.videoUrl,
        is_free: updatedLesson.is_free,
        status: updatedLesson.status,
      })
      setSections(prevSections =>
        prevSections.map(section => ({
          ...section,
          lessons: section.lessons.map(lesson =>
            lesson.id === updatedLesson.id ? updatedLesson : lesson
          )
        }))
      )
      toast.success('Lesson saved successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save lesson')
    }
  }, [setSections])

  const handlePreviewLesson = (lesson: any) => {
    toast.info('Preview feature coming soon')
  }

  const handleSaveCurriculum = async () => {
    if (sections.length === 0) {
      toast.error('Add at least one section before saving')
      return
    }

    const emptySections = sections.filter(s => s.lessons.length === 0)
    if (emptySections.length > 0) {
      toast.error('All sections must have at least one lesson')
      return
    }

    try {
      // Update order numbers for all sections and their lessons
      await Promise.all(
        sections.map(async (section, sIdx) => {
          // Update section order (no dedicated endpoint, but keep local state consistent)
          await Promise.all(
            section.lessons.map(async (lesson: any, lIdx: number) => {
              await updateLessonApi(lesson.id, { order: lIdx + 1 })
            })
          )
        })
      )
      toast.success('Course curriculum saved successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save curriculum')
    }
  }

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
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="mb-1">Course Curriculum</h1>
              <p className="text-muted-foreground">{courseTitle}</p>
            </div>
            
            <div className="flex gap-2">
              <DarkModeToggle />
              
              <Button 
                variant={showBulkSelection ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newBulkMode = !showBulkSelection
                  setShowBulkSelection(newBulkMode)
                  
                  // Auto-open sidebar when entering bulk mode
                  if (newBulkMode && isSidebarCollapsed) {
                    setIsSidebarCollapsed(false)
                  }
                  
                  // Clear selection when exiting bulk mode
                  if (!newBulkMode) {
                    handleClearSelection()
                  }
                }}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                {showBulkSelection ? 'Bulk Edit Mode' : 'Bulk Edit'}
              </Button>
            </div>
          </div>

          {/* Course Statistics - Horizontal */}
          <CourseStatsHorizontal sections={sections} />
        </div>

        {/* Main Content - Removed Quick Stats Panel */}
        <div className="mb-4">
          {/* Lesson Editor Main */}
        </div>

        {/* 2 Column Layout: Main Editor + Sidebar */}
        <div className="flex gap-4 h-[calc(100vh-520px)]">{/* Adjusted height */}
          {/* Main Content - Left */}
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
              onSelectLesson={setSelectedLesson}
              onSaveCurriculum={handleSaveCurriculum}
              moveSection={moveSection}
              moveLessonWithinSection={moveLessonWithinSection}
              moveLessonBetweenSections={moveLessonBetweenSections}
            />
          </div>
        </div>
      </div>

      {/* Sidebar - Fixed Right (Collapsible) */}
      <CourseOutlineSidebar
        sections={sections}
        selectedLesson={selectedLesson}
        onSelectLesson={setSelectedLesson}
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

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {showBulkSelection && selectedLessonIds.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedLessonIds.size}
            onPublishAll={handleBulkPublish}
            onUnpublishAll={handleBulkUnpublish}
            onDeleteAll={handleBulkDelete}
            onClearSelection={handleClearSelection}
          />
        )}
      </AnimatePresence>

      {/* Lesson Editor Dialog - REMOVED, using full page editor now
      <LessonEditorDialog
        lesson={editingLesson}
        open={editingLesson !== null}
        onOpenChange={(open) => !open && setEditingLesson(null)}
        onSave={handleSaveLesson}
      />
      */}
    </div>
  )
}