import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Play, BookOpen, Monitor, Columns } from 'lucide-react'
import { LessonPreviewModal } from './LessonPreviewModal'
import { CoursePlayerPreview } from './CoursePlayerPreview'

type PreviewMode = 'lesson' | 'course' | 'split'

export function PreviewDemo() {
  const { t } = useTranslation()

  const mockLesson = {
    id: 1,
    title: t('preview_demo.mock.lesson.title'),
    type: 'video',
    content_type: 'video',
    duration: '12:45',
    status: 'published',
    is_free: true,
    description: t('preview_demo.mock.lesson.description'),
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    content: `<h2>${t('preview_demo.mock.lesson.content_title')}</h2><p>${t('preview_demo.mock.lesson.content_body')}</p>`,
  }

  const mockQuizLesson = {
    id: 2,
    title: t('preview_demo.mock.quiz.title'),
    type: 'quiz',
    content_type: 'quiz',
    duration: '15 min',
    status: 'published',
    is_free: false,
    questions: 10,
  }

  const mockArticleLesson = {
    id: 3,
    title: t('preview_demo.mock.article.title'),
    type: 'text',
    content_type: 'text',
    duration: '8 min read',
    status: 'published',
    is_free: true,
  }

  const mockCourseModules = [
    {
      id: 1,
      title: t('preview_demo.mock.modules.module_1.title'),
      lessons: [
        { id: 1, title: t('preview_demo.mock.modules.module_1.lesson_1'), type: 'video', duration: '10:30', isCompleted: true, isFree: true },
        { id: 2, title: t('preview_demo.mock.modules.module_1.lesson_2'), type: 'video', duration: '15:20', isCompleted: true, isFree: false },
        { id: 3, title: t('preview_demo.mock.modules.module_1.lesson_3'), type: 'video', duration: '12:45', isCompleted: false, isFree: false },
      ],
    },
    {
      id: 2,
      title: t('preview_demo.mock.modules.module_2.title'),
      lessons: [
        { id: 4, title: t('preview_demo.mock.modules.module_2.lesson_1'), type: 'video', duration: '18:30', isCompleted: false, isFree: false },
        { id: 5, title: t('preview_demo.mock.modules.module_2.lesson_2'), type: 'video', duration: '22:15', isCompleted: false, isFree: false },
        { id: 6, title: t('preview_demo.mock.modules.module_2.lesson_3'), type: 'quiz', duration: '15 min', isCompleted: false, isFree: false },
      ],
    },
    {
      id: 3,
      title: t('preview_demo.mock.modules.module_3.title'),
      lessons: [
        { id: 7, title: t('preview_demo.mock.modules.module_3.lesson_1'), type: 'article', duration: '10 min read', isCompleted: false, isFree: false },
        { id: 8, title: t('preview_demo.mock.modules.module_3.lesson_2'), type: 'video', duration: '25:40', isCompleted: false, isFree: false },
      ],
    },
  ]

  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null)
  const [selectedLesson, setSelectedLesson] = useState(mockLesson)
  const [currentLessonId, setCurrentLessonId] = useState(3)
  const [showLessonPreview, setShowLessonPreview] = useState(false)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{t('preview_demo.title')}</h1>
          <p className="text-muted-foreground">{t('preview_demo.subtitle')}</p>
        </div>

        <Tabs value={previewMode || ''} onValueChange={(v) => setPreviewMode(v as PreviewMode)}>
          <TabsList className="grid grid-cols-3 w-full max-w-2xl">
            <TabsTrigger value="lesson" className="gap-2">
              <Play className="h-4 w-4" />
              {t('preview_demo.tabs.lesson')}
            </TabsTrigger>
            <TabsTrigger value="course" className="gap-2">
              <Monitor className="h-4 w-4" />
              {t('preview_demo.tabs.course')}
            </TabsTrigger>
            <TabsTrigger value="split" className="gap-2">
              <Columns className="h-4 w-4" />
              {t('preview_demo.tabs.split')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lesson" className="space-y-6 mt-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">{t('preview_demo.lesson_preview_title')}</h2>
              <p className="text-muted-foreground mb-6">{t('preview_demo.lesson_preview_description')}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      {t('preview_demo.labels.video')}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {t('preview_demo.labels.free')}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{mockLesson.title}</h3>
                    <p className="text-sm text-muted-foreground">{mockLesson.duration}</p>
                  </div>
                  <Button className="w-full" onClick={() => { setSelectedLesson(mockLesson); setShowLessonPreview(true) }}>
                    <Play className="h-4 w-4 mr-2" />
                    {t('preview_demo.labels.preview')}
                  </Button>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      {t('preview_demo.labels.quiz')}
                    </Badge>
                    <Badge variant="outline">{t('preview_demo.labels.premium')}</Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{mockQuizLesson.title}</h3>
                    <p className="text-sm text-muted-foreground">{mockQuizLesson.duration}</p>
                  </div>
                  <Button className="w-full" onClick={() => { setSelectedLesson(mockQuizLesson); setShowLessonPreview(true) }}>
                    <Play className="h-4 w-4 mr-2" />
                    {t('preview_demo.labels.preview')}
                  </Button>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {t('preview_demo.labels.article')}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {t('preview_demo.labels.free')}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{mockArticleLesson.title}</h3>
                    <p className="text-sm text-muted-foreground">{mockArticleLesson.duration}</p>
                  </div>
                  <Button className="w-full" onClick={() => { setSelectedLesson(mockArticleLesson); setShowLessonPreview(true) }}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    {t('preview_demo.labels.preview')}
                  </Button>
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                {t('preview_demo.features_title')}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t('preview_demo.lesson_features.item_1')}</li>
                <li>{t('preview_demo.lesson_features.item_2')}</li>
                <li>{t('preview_demo.lesson_features.item_3')}</li>
                <li>{t('preview_demo.lesson_features.item_4')}</li>
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="course" className="space-y-6 mt-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">{t('preview_demo.course_player_title')}</h2>
              <p className="text-muted-foreground mb-6">{t('preview_demo.course_player_description')}</p>
            </div>

            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <Button
                  size="lg"
                  onClick={() => {
                    const playerContainer = document.getElementById('course-player-container')
                    if (playerContainer) playerContainer.classList.remove('hidden')
                  }}
                >
                  <Monitor className="h-5 w-5 mr-2" />
                  {t('preview_demo.launch_course_player')}
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Monitor className="h-5 w-5 text-purple-600" />
                {t('preview_demo.features_title')}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t('preview_demo.course_features.item_1')}</li>
                <li>{t('preview_demo.course_features.item_2')}</li>
                <li>{t('preview_demo.course_features.item_3')}</li>
                <li>{t('preview_demo.course_features.item_4')}</li>
                <li>{t('preview_demo.course_features.item_5')}</li>
                <li>{t('preview_demo.course_features.item_6')}</li>
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="split" className="space-y-6 mt-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">{t('preview_demo.split_preview_title')}</h2>
              <p className="text-muted-foreground mb-6">{t('preview_demo.split_preview_description')}</p>
            </div>

            <Card className="p-12 text-center bg-muted/50">
              <div className="max-w-md mx-auto space-y-4">
                <Columns className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="text-xl font-semibold">{t('preview_demo.split_coming_soon_title')}</h3>
                <p className="text-muted-foreground">{t('preview_demo.split_coming_soon_description')}</p>
              </div>
            </Card>

            <Card className="p-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Columns className="h-5 w-5 text-green-600" />
                {t('preview_demo.planned_features_title')}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t('preview_demo.split_features.item_1')}</li>
                <li>{t('preview_demo.split_features.item_2')}</li>
                <li>{t('preview_demo.split_features.item_3')}</li>
                <li>{t('preview_demo.split_features.item_4')}</li>
              </ul>
            </Card>
          </TabsContent>
        </Tabs>

        <LessonPreviewModal open={showLessonPreview} onOpenChange={setShowLessonPreview} lesson={selectedLesson} />

        <div id="course-player-container" className="hidden fixed inset-0 z-50 bg-background">
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="outline"
              onClick={() => {
                const playerContainer = document.getElementById('course-player-container')
                if (playerContainer) playerContainer.classList.add('hidden')
              }}
            >
              {t('preview_demo.exit_preview')}
            </Button>
          </div>
          <CoursePlayerPreview
            courseName={t('preview_demo.course_name')}
            modules={mockCourseModules}
            currentLessonId={currentLessonId}
            onLessonChange={setCurrentLessonId}
          />
        </div>
      </div>
    </div>
  )
}
