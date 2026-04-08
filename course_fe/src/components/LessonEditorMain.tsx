import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Plus, Save } from 'lucide-react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DraggableSectionCard } from './SectionDragDrop'
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
  resources?: string[]
  questions?: number
  quizData?: any
}

interface Section {
  id: number
  title: string
  status?: 'Draft' | 'Published' | string
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
  onUpdateSectionStatus?: (sectionId: number, status: 'Draft' | 'Published') => void
  onEditLesson: (lesson: Lesson) => void
  onPreviewLesson: (lesson: Lesson) => void
  onDeleteLesson: (lessonId: number) => void
  onGenerateTranscript?: (lesson: Lesson) => void
  transcriptActionLessonId?: number | null
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
  onUpdateSectionStatus,
  onEditLesson,
  onPreviewLesson,
  onDeleteLesson,
  onGenerateTranscript,
  transcriptActionLessonId,
  onSelectLesson,
  onSaveCurriculum,
  moveSection,
  moveLessonWithinSection,
  moveLessonBetweenSections
}: LessonEditorMainProps) {
  const { t } = useTranslation()
  
  const totalLessons = sections.reduce((total, section) => total + section.lessons.length, 0)

  return (
    <div className="flex-1 space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('lesson_editor_main.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('lesson_editor_main.summary', { sections: sections.length, lessons: totalLessons })}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onShowAddSection(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('lesson_editor_main.add_section')}
          </Button>
          <Button onClick={onSaveCurriculum}>
            <Save className="h-4 w-4 mr-2" />
            {t('lesson_editor_main.save_changes')}
          </Button>
        </div>
      </div>

      {/* Add Section Form */}
      {showAddSection && (
        <Card className="p-6 border-primary/50 shadow-lg">
          <h3 className="font-semibold mb-4">{t('lesson_editor_main.add_new_section')}</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('lesson_editor_main.section_title')}</label>
              <Input
                placeholder={t('lesson_editor_main.section_title_placeholder')}
                value={newSection.title}
                onChange={(e) => onNewSectionChange({ ...newSection, title: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('lesson_editor_main.description_optional')}</label>
              <Textarea
                placeholder={t('lesson_editor_main.section_description_placeholder')}
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
                {t('common.cancel')}
              </Button>
              <Button onClick={onAddSection}>
                <Plus className="h-4 w-4 mr-2" />
                {t('lesson_editor_main.add_section')}
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
              onUpdateSectionStatus={onUpdateSectionStatus}
              onEditLesson={onEditLesson}
              onPreviewLesson={onPreviewLesson}
              onDeleteLesson={onDeleteLesson}
              onGenerateTranscript={onGenerateTranscript}
              transcriptActionLessonId={transcriptActionLessonId}
              selectedLessonId={selectedLesson?.id}
              onSelectLesson={onSelectLesson}
              showAddLesson={showAddLesson === section.id}
              addLessonContent={
                showAddLesson === section.id && (
                  <Card className="p-4 bg-muted/30 border-dashed">
                    <h4 className="text-sm font-medium mb-3">{t('lesson_editor_main.add_new_lesson')}</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">{t('lesson_editor_main.lesson_title')}</label>
                        <Input
                          placeholder={t('lesson_editor_main.lesson_title_placeholder')}
                          value={newLesson.title}
                          onChange={(e) => onNewLessonChange({ ...newLesson, title: e.target.value })}
                          autoFocus
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">{t('lesson_editor_main.type')}</label>
                          <Select
                            value={newLesson.type}
                            onValueChange={(value) => onNewLessonChange({ ...newLesson, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">{t('lesson_editor_main.lesson_types.video')}</SelectItem>
                              <SelectItem value="text">{t('lesson_editor_main.lesson_types.article')}</SelectItem>
                              <SelectItem value="quiz">{t('lesson_editor_main.lesson_types.quiz')}</SelectItem>
                              <SelectItem value="assignment">{t('lesson_editor_main.lesson_types.assignment')}</SelectItem>
                              <SelectItem value="file">{t('lesson_editor_main.lesson_types.file')}</SelectItem>
                              <SelectItem value="link">{t('lesson_editor_main.lesson_types.link')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium mb-1 block">{t('common.duration')}</label>
                          <Input
                            placeholder="5:00"
                            value={newLesson.duration}
                            onChange={(e) => onNewLessonChange({ ...newLesson, duration: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium mb-1 block">{t('lesson_editor_main.description_optional')}</label>
                        <Textarea
                          placeholder={t('lesson_editor_main.lesson_description_placeholder')}
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
                          {t('common.cancel')}
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => onAddLesson(section.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('lesson_editor_main.add_lesson')}
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
              <h3 className="font-semibold mb-2">{t('lesson_editor_main.no_sections_title')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('lesson_editor_main.no_sections_description')}
              </p>
              <Button onClick={() => onShowAddSection(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('lesson_editor_main.add_first_section')}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
