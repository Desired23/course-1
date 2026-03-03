import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Plus, Save } from 'lucide-react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DraggableSectionCard } from './SectionDragDrop'

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
  resources?: string[]
  questions?: number
  quizData?: any
}

interface Section {
  id: number
  title: string
  lessons: Lesson[]
}

interface NewSection {
  title: string
  description: string
}

interface NewLesson {
  title: string
  type: string
  description: string
  duration: string
}

interface LessonEditorMainProps {
  sections: Section[]
  showAddSection: boolean
  showAddLesson: number | null
  newSection: NewSection
  newLesson: NewLesson
  selectedLesson: Lesson | null
  onSectionsChange: (sections: Section[]) => void
  onShowAddSection: (show: boolean) => void
  onShowAddLesson: (sectionId: number | null) => void
  onNewSectionChange: (section: NewSection) => void
  onNewLessonChange: (lesson: NewLesson) => void
  onAddSection: () => void
  onAddLesson: (sectionId: number) => void
  onEditSection: (section: Section) => void
  onDeleteSection: (sectionId: number) => void
  onEditLesson: (lesson: Lesson) => void
  onPreviewLesson: (lesson: Lesson) => void
  onDeleteLesson: (lessonId: number) => void
  onSelectLesson: (lesson: Lesson) => void
  onSaveCurriculum: () => void
  moveSection: (dragIndex: number, hoverIndex: number) => void
  moveLessonWithinSection: (sectionId: number, dragIndex: number, hoverIndex: number) => void
  moveLessonBetweenSections: (fromSectionId: number, toSectionId: number, lessonId: number, toIndex: number) => void
}

export function LessonEditorMain({
  sections,
  showAddSection,
  showAddLesson,
  newSection,
  newLesson,
  selectedLesson,
  onShowAddSection,
  onShowAddLesson,
  onNewSectionChange,
  onNewLessonChange,
  onAddSection,
  onAddLesson,
  onEditSection,
  onDeleteSection,
  onEditLesson,
  onPreviewLesson,
  onDeleteLesson,
  onSelectLesson,
  onSaveCurriculum,
  moveSection,
  moveLessonWithinSection,
  moveLessonBetweenSections
}: LessonEditorMainProps) {
  
  const totalLessons = sections.reduce((total, section) => total + section.lessons.length, 0)

  return (
    <div className="flex-1 space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Curriculum Builder</h2>
          <p className="text-sm text-muted-foreground">
            {sections.length} sections • {totalLessons} lessons
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onShowAddSection(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
          <Button onClick={onSaveCurriculum}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Add Section Form */}
      {showAddSection && (
        <Card className="p-6 border-primary/50 shadow-lg">
          <h3 className="font-semibold mb-4">Add New Section</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Section Title</label>
              <Input
                placeholder="e.g., Introduction to JavaScript"
                value={newSection.title}
                onChange={(e) => onNewSectionChange({ ...newSection, title: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
              <Textarea
                placeholder="Brief description of this section..."
                value={newSection.description}
                onChange={(e) => onNewSectionChange({ ...newSection, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="ghost" 
                onClick={() => {
                  onShowAddSection(false)
                  onNewSectionChange({ title: '', description: '' })
                }}
              >
                Cancel
              </Button>
              <Button onClick={onAddSection}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Sections with Drag & Drop */}
      <DndProvider backend={HTML5Backend}>
        <div className="space-y-4">
          {sections.map((section, index) => (
            <DraggableSectionCard
              key={section.id}
              section={section}
              index={index}
              moveSection={moveSection}
              moveLessonWithinSection={moveLessonWithinSection}
              moveLessonBetweenSections={moveLessonBetweenSections}
              onAddLesson={onShowAddLesson}
              onEditSection={onEditSection}
              onDeleteSection={onDeleteSection}
              onEditLesson={onEditLesson}
              onPreviewLesson={onPreviewLesson}
              onDeleteLesson={onDeleteLesson}
              selectedLessonId={selectedLesson?.id}
              onSelectLesson={onSelectLesson}
              showAddLesson={showAddLesson === section.id}
              addLessonContent={
                showAddLesson === section.id && (
                  <Card className="p-4 bg-muted/30 border-dashed">
                    <h4 className="text-sm font-medium mb-3">Add New Lesson</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Lesson Title</label>
                        <Input
                          placeholder="e.g., Variables and Data Types"
                          value={newLesson.title}
                          onChange={(e) => onNewLessonChange({ ...newLesson, title: e.target.value })}
                          autoFocus
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">Type</label>
                          <Select
                            value={newLesson.type}
                            onValueChange={(value) => onNewLessonChange({ ...newLesson, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="text">Article</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                              <SelectItem value="assignment">Assignment</SelectItem>
                              <SelectItem value="file">File</SelectItem>
                              <SelectItem value="link">Link</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium mb-1 block">Duration</label>
                          <Input
                            placeholder="5:00"
                            value={newLesson.duration}
                            onChange={(e) => onNewLessonChange({ ...newLesson, duration: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium mb-1 block">Description (Optional)</label>
                        <Textarea
                          placeholder="Brief description..."
                          value={newLesson.description}
                          onChange={(e) => onNewLessonChange({ ...newLesson, description: e.target.value })}
                          rows={2}
                        />
                      </div>
                      
                      <div className="flex gap-2 justify-end pt-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            onShowAddLesson(null)
                            onNewLessonChange({ title: '', type: 'video', description: '', duration: '' })
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => onAddLesson(section.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Lesson
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              }
            />
          ))}
        </div>
      </DndProvider>

      {/* Empty State */}
      {sections.length === 0 && !showAddSection && (
        <Card className="p-12 text-center border-dashed">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">No sections yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start building your course curriculum by adding your first section
              </p>
              <Button onClick={() => onShowAddSection(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Section
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
