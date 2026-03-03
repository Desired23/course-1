import { useState, useCallback } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Plus, Edit3, Trash2, GripVertical, Play, Upload, FileText, HelpCircle, Clock, Eye, Save, Code, Image as ImageIcon, X, LayoutDashboard } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DraggableSectionCard } from "../../components/SectionDragDrop"
import { QuizEditor } from "../../components/QuizEditor"
import { toast } from 'sonner@2.0.3'
import { CourseOutlineSidebar } from "../../components/CourseOutlineSidebar"
import { QuickStatsPanel } from "../../components/QuickStatsPanel"
import { LessonEditorMain } from "../../components/LessonEditorMain"
import { useLocalStorage } from "../../hooks/useLocalStorage"

// Mock course structure data
const courseStructure = {
  courseId: "1",
  title: "The Complete JavaScript Course 2024: From Zero to Expert!",
  sections: [
    {
      id: 1,
      title: "Introduction and Setup",
      lessons: [
        {
          id: 1,
          title: "Course Introduction",
          type: "video",
          duration: "5:30",
          status: "published",
          videoUrl: "intro.mp4",
          description: "Welcome to the complete JavaScript course!",
          resources: ["course-outline.pdf"]
        },
        {
          id: 2,
          title: "Setting up your development environment",
          type: "video",
          duration: "8:45",
          status: "published",
          videoUrl: "setup.mp4",
          description: "Learn how to set up VS Code and Node.js",
          resources: ["setup-guide.pdf"]
        }
      ]
    },
    {
      id: 2,
      title: "JavaScript Fundamentals",
      lessons: [
        {
          id: 3,
          title: "Variables and Data Types",
          type: "video",
          duration: "12:20",
          status: "published",
          videoUrl: "variables.mp4",
          description: "Understanding JavaScript variables and data types",
          resources: ["variables-cheatsheet.pdf"]
        },
        {
          id: 4,
          title: "Functions Deep Dive",
          type: "video",
          duration: "15:30",
          status: "draft",
          videoUrl: "",
          description: "Master JavaScript functions",
          resources: []
        },
        {
          id: 5,
          title: "Quiz: JavaScript Basics",
          type: "quiz",
          duration: "10 min",
          status: "published",
          questions: 10,
          description: "Test your knowledge of JavaScript basics"
        }
      ]
    },
    {
      id: 3,
      title: "DOM Manipulation",
      lessons: [
        {
          id: 6,
          title: "Selecting and Modifying Elements",
          type: "video",
          duration: "18:15",
          status: "published",
          videoUrl: "dom-selection.mp4",
          description: "Learn how to interact with the DOM",
          resources: ["dom-reference.pdf"]
        }
      ]
    }
  ]
}

export function InstructorLessonsPage() {
  const { params } = useRouter()
  const courseId = params?.courseId
  const [sections, setSections] = useLocalStorage('courseSections', courseStructure.sections)
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [editingLesson, setEditingLesson] = useState<any>(null)
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

  const moveSection = useCallback((dragIndex: number, hoverIndex: number) => {
    setSections(prevSections => {
      const newSections = [...prevSections]
      const dragSection = newSections[dragIndex]
      newSections.splice(dragIndex, 1)
      newSections.splice(hoverIndex, 0, dragSection)
      return newSections
    })
  }, [])

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
  }, [])

  const moveLessonBetweenSections = useCallback((fromSectionId: number, toSectionId: number, lessonId: number, toIndex: number) => {
    setSections(prevSections => {
      const newSections = [...prevSections]
      
      // Find source and target sections
      const fromSectionIndex = newSections.findIndex(s => s.id === fromSectionId)
      const toSectionIndex = newSections.findIndex(s => s.id === toSectionId)
      
      if (fromSectionIndex === -1 || toSectionIndex === -1) return prevSections
      
      const fromSection = { ...newSections[fromSectionIndex] }
      const toSection = { ...newSections[toSectionIndex] }
      
      // Find and remove lesson from source section
      const lessonIndex = fromSection.lessons.findIndex(l => l.id === lessonId)
      if (lessonIndex === -1) return prevSections
      
      const [lesson] = fromSection.lessons.splice(lessonIndex, 1)
      
      // Add lesson to target section
      toSection.lessons.splice(toIndex, 0, lesson)
      
      newSections[fromSectionIndex] = fromSection
      newSections[toSectionIndex] = toSection
      
      toast.success(`Moved "${lesson.title}" to ${toSection.title}`)
      
      return newSections
    })
  }, [])

  const handleDeleteSection = useCallback((sectionId: number) => {
    setSections(prevSections => prevSections.filter(section => section.id !== sectionId))
    toast.success('Section deleted successfully')
  }, [])

  const handleDeleteLesson = useCallback((lessonId: number) => {
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
  }, [selectedLesson])

  const handlePreviewLesson = (lesson: any) => {
    console.log('Preview lesson:', lesson)
    toast.info('Preview feature coming soon')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500 hover:bg-green-600">Published</Badge>
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="h-4 w-4" />
      case 'quiz':
        return <HelpCircle className="h-4 w-4" />
      case 'article':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const handleSaveCurriculum = () => {
    // Validate that we have at least one section
    if (sections.length === 0) {
      toast.error('Add at least one section before saving')
      return
    }

    // Validate that each section has at least one lesson
    const emptySections = sections.filter(s => s.lessons.length === 0)
    if (emptySections.length > 0) {
      toast.error('All sections must have at least one lesson')
      return
    }

    // Save to backend (mock)
    console.log('Saving curriculum:', {
      courseId: 'course-1',
      sections: sections
    })

    toast.success('Course curriculum saved successfully!')
  }

  const handleAddSection = () => {
    if (!newSection.title.trim()) {
      toast.error('Please enter a section title')
      return
    }

    const section = {
      id: Date.now(),
      title: newSection.title,
      lessons: []
    }

    setSections(prev => [...prev, section])
    setNewSection({ title: '', description: '' })
    setShowAddSection(false)
    toast.success('Section added successfully')
  }

  const handleAddLesson = (sectionId: number) => {
    if (!newLesson.title.trim()) {
      toast.error('Please enter a lesson title')
      return
    }

    const lesson: any = {
      id: Date.now(),
      title: newLesson.title,
      type: newLesson.type,
      description: newLesson.description,
      duration: newLesson.duration || '5:00',
      status: 'draft'
    }

    // Add type-specific fields
    if (newLesson.type === 'video') {
      lesson.videoUrl = ''
      lesson.resources = []
    } else if (newLesson.type === 'quiz') {
      lesson.questions = 0
      lesson.quizData = {
        title: newLesson.title,
        description: newLesson.description,
        passingScore: 70,
        questions: []
      }
    }

    setSections(prevSections => 
      prevSections.map(section => 
        section.id === sectionId 
          ? { ...section, lessons: [...section.lessons, lesson] }
          : section
      )
    )

    setNewLesson({ title: '', type: 'video', description: '', duration: '' })
    setShowAddLesson(null)
    toast.success(`${newLesson.type === 'quiz' ? 'Quiz' : 'Lesson'} added successfully`)

    // Auto-open quiz editor if it's a quiz
    if (newLesson.type === 'quiz') {
      setTimeout(() => {
        setEditingLesson(lesson)
      }, 100)
    }
  }

  const handleSaveLesson = () => {
    if (!editingLesson) return

    setSections(prevSections =>
      prevSections.map(section => ({
        ...section,
        lessons: section.lessons.map(lesson =>
          lesson.id === editingLesson.id ? editingLesson : lesson
        )
      }))
    )

    toast.success('Lesson updated successfully')
    setEditingLesson(null)
    
    // Update selectedLesson if it's the same lesson
    if (selectedLesson?.id === editingLesson.id) {
      setSelectedLesson(editingLesson)
    }
  }

  const totalLessons = sections.reduce((total, section) => total + section.lessons.length, 0)
  const publishedLessons = sections.reduce((total, section) => 
    total + section.lessons.filter(lesson => lesson.status === 'published').length, 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="mb-2">Course Curriculum</h1>
              <p className="text-muted-foreground">{courseStructure.title}</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddSection(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
              <Button onClick={handleSaveCurriculum}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>

          {/* Course Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{sections.length}</p>
                  <p className="text-sm text-muted-foreground">Sections</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{totalLessons}</p>
                  <p className="text-sm text-muted-foreground">Total Lessons</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{publishedLessons}</p>
                  <p className="text-sm text-muted-foreground">Published</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{totalLessons - publishedLessons}</p>
                  <p className="text-sm text-muted-foreground">Drafts</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Curriculum Structure */}
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
                  onEditSection={(section) => setEditingSection(section)}
                  onDeleteSection={handleDeleteSection}
                  onEditLesson={(lesson) => setEditingLesson(lesson)}
                  onPreviewLesson={handlePreviewLesson}
                  onDeleteLesson={handleDeleteLesson}
                  selectedLessonId={selectedLesson?.id}
                  onSelectLesson={(lesson) => setSelectedLesson(lesson)}
                  showAddLesson={showAddLesson === section.id}
                  addLessonContent={
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <h4 className="font-medium mb-3">Add New Lesson</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Lesson title"
                            value={newLesson.title}
                            onChange={(e) => setNewLesson(prev => ({ ...prev, title: e.target.value }))}
                          />
                          <Select 
                            value={newLesson.type} 
                            onValueChange={(value) => setNewLesson(prev => ({ ...prev, type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                              <SelectItem value="article">Article</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Textarea
                          placeholder="Lesson description"
                          value={newLesson.description}
                          onChange={(e) => setNewLesson(prev => ({ ...prev, description: e.target.value }))}
                        />
                        
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAddLesson(section.id)}>
                            Add Lesson
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowAddLesson(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  }
                />
              ))}
            </DndProvider>

            {/* Add Section Form */}
            {showAddSection && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Section</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Section title"
                    value={newSection.title}
                    onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Section description (optional)"
                    value={newSection.description}
                    onChange={(e) => setNewSection(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddSection}>Add Section</Button>
                    <Button variant="outline" onClick={() => setShowAddSection(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Lesson Editor */}
          <div className="space-y-6">
            {selectedLesson && (
              <Card>
                <CardHeader>
                  <CardTitle>Lesson Details</CardTitle>
                  <CardDescription>
                    Edit the selected lesson content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input value={selectedLesson.title} readOnly />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <Badge variant="outline">{selectedLesson.type}</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration</label>
                    <Input value={selectedLesson.duration} readOnly />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    {getStatusBadge(selectedLesson.status)}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea value={selectedLesson.description} readOnly />
                  </div>
                  
                  {selectedLesson.type === 'video' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Video</label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {selectedLesson.videoUrl ? 'Video uploaded' : 'Upload video file'}
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          {selectedLesson.videoUrl ? 'Change Video' : 'Upload Video'}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setEditingLesson(selectedLesson)}
                      className="flex-1"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!selectedLesson && (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Select a lesson</h3>
                  <p className="text-sm text-muted-foreground">
                    Click on a lesson from the curriculum to view and edit its details.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Edit Lesson Dialog */}
        {editingLesson && editingLesson.type !== 'quiz' && (
          <Dialog open={!!editingLesson} onOpenChange={() => setEditingLesson(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Lesson</DialogTitle>
                <DialogDescription>
                  Update lesson content and settings
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editingLesson.title}
                    onChange={(e) => setEditingLesson(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editingLesson.description}
                    onChange={(e) => setEditingLesson(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration</label>
                    <Input
                      value={editingLesson.duration}
                      onChange={(e) => setEditingLesson(prev => ({ ...prev, duration: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select 
                      value={editingLesson.status} 
                      onValueChange={(value) => setEditingLesson(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="pending">Pending Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingLesson(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveLesson}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Quiz Dialog */}
        {editingLesson && editingLesson.type === 'quiz' && (
          <Dialog open={!!editingLesson} onOpenChange={() => setEditingLesson(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Quiz</DialogTitle>
                <DialogDescription>
                  Create and manage quiz questions
                </DialogDescription>
              </DialogHeader>
              
              <DndProvider backend={HTML5Backend}>
                <QuizEditor
                  quizData={editingLesson.quizData}
                  onSave={(quizData) => {
                    // Update lesson with quiz data
                    const updatedLesson = {
                      ...editingLesson,
                      quizData,
                      questions: quizData.questions.length,
                      duration: quizData.timeLimit ? `${quizData.timeLimit} min` : 'No time limit'
                    }
                    
                    setSections(prevSections =>
                      prevSections.map(section => ({
                        ...section,
                        lessons: section.lessons.map(lesson =>
                          lesson.id === updatedLesson.id ? updatedLesson : lesson
                        )
                      }))
                    )
                    
                    // Update selectedLesson if it's the same
                    if (selectedLesson?.id === updatedLesson.id) {
                      setSelectedLesson(updatedLesson)
                    }
                    
                    toast.success('Quiz saved successfully')
                    setEditingLesson(null)
                  }}
                  onCancel={() => setEditingLesson(null)}
                />
              </DndProvider>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}