import { useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import {
  Play,
  BookOpen,
  Monitor,
  Columns
} from 'lucide-react'
import { LessonPreviewModal } from './LessonPreviewModal'
import { CoursePlayerPreview } from './CoursePlayerPreview'
import { cn } from './ui/utils'

// Mock data
const mockLesson = {
  id: 1,
  title: 'Introduction to React Hooks',
  type: 'video',
  content_type: 'video',
  duration: '12:45',
  status: 'published',
  is_free: true,
  description: 'Learn the basics of React Hooks and how to use them in your applications.',
  videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  content: '<h2>What are React Hooks?</h2><p>React Hooks are functions that let you use state and other React features...</p>'
}

const mockQuizLesson = {
  id: 2,
  title: 'React Quiz - Test Your Knowledge',
  type: 'quiz',
  content_type: 'quiz',
  duration: '15 min',
  status: 'published',
  is_free: false,
  questions: 10
}

const mockArticleLesson = {
  id: 3,
  title: 'Understanding useEffect',
  type: 'text',
  content_type: 'text',
  duration: '8 min read',
  status: 'published',
  is_free: true
}

const mockCourseModules = [
  {
    id: 1,
    title: 'Module 1: Getting Started',
    lessons: [
      {
        id: 1,
        title: 'Introduction to React',
        type: 'video',
        duration: '10:30',
        isCompleted: true,
        isFree: true
      },
      {
        id: 2,
        title: 'Setting Up Your Environment',
        type: 'video',
        duration: '15:20',
        isCompleted: true,
        isFree: false
      },
      {
        id: 3,
        title: 'Your First Component',
        type: 'video',
        duration: '12:45',
        isCompleted: false,
        isFree: false
      }
    ]
  },
  {
    id: 2,
    title: 'Module 2: React Hooks',
    lessons: [
      {
        id: 4,
        title: 'Introduction to Hooks',
        type: 'video',
        duration: '18:30',
        isCompleted: false,
        isFree: false
      },
      {
        id: 5,
        title: 'useState Hook',
        type: 'video',
        duration: '22:15',
        isCompleted: false,
        isFree: false
      },
      {
        id: 6,
        title: 'Hooks Quiz',
        type: 'quiz',
        duration: '15 min',
        isCompleted: false,
        isFree: false
      }
    ]
  },
  {
    id: 3,
    title: 'Module 3: Advanced Concepts',
    lessons: [
      {
        id: 7,
        title: 'Custom Hooks',
        type: 'article',
        duration: '10 min read',
        isCompleted: false,
        isFree: false
      },
      {
        id: 8,
        title: 'Performance Optimization',
        type: 'video',
        duration: '25:40',
        isCompleted: false,
        isFree: false
      }
    ]
  }
]

type PreviewMode = 'lesson' | 'course' | 'split'

export function PreviewDemo() {
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null)
  const [selectedLesson, setSelectedLesson] = useState(mockLesson)
  const [currentLessonId, setCurrentLessonId] = useState(3)
  const [showLessonPreview, setShowLessonPreview] = useState(false)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Preview System Demo</h1>
          <p className="text-muted-foreground">
            Explore all preview modes for the Udemy Clone course system
          </p>
        </div>

        {/* Preview Mode Selector */}
        <Tabs value={previewMode || ''} onValueChange={(v) => setPreviewMode(v as PreviewMode)}>
          <TabsList className="grid grid-cols-3 w-full max-w-2xl">
            <TabsTrigger value="lesson" className="gap-2">
              <Play className="h-4 w-4" />
              Lesson Preview
            </TabsTrigger>
            <TabsTrigger value="course" className="gap-2">
              <Monitor className="h-4 w-4" />
              Course Player
            </TabsTrigger>
            <TabsTrigger value="split" className="gap-2">
              <Columns className="h-4 w-4" />
              Split View
            </TabsTrigger>
          </TabsList>

          {/* Lesson Preview Mode */}
          <TabsContent value="lesson" className="space-y-6 mt-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Lesson Preview Modal</h2>
              <p className="text-muted-foreground mb-6">
                Preview individual lessons with device switcher and view mode toggle (Enrolled vs Free User)
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Video Lesson */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      Video
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Free
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{mockLesson.title}</h3>
                    <p className="text-sm text-muted-foreground">{mockLesson.duration}</p>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setSelectedLesson(mockLesson)
                      setShowLessonPreview(true)
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </Card>

              {/* Quiz Lesson */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      Quiz
                    </Badge>
                    <Badge variant="outline">Premium</Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{mockQuizLesson.title}</h3>
                    <p className="text-sm text-muted-foreground">{mockQuizLesson.duration}</p>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setSelectedLesson(mockQuizLesson)
                      setShowLessonPreview(true)
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </Card>

              {/* Article Lesson */}
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      Article
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Free
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{mockArticleLesson.title}</h3>
                    <p className="text-sm text-muted-foreground">{mockArticleLesson.duration}</p>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setSelectedLesson(mockArticleLesson)
                      setShowLessonPreview(true)
                    }}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </Card>
            </div>

            {/* Features */}
            <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                Features
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Device preview (Desktop, Tablet, Mobile)</li>
                <li>• View mode toggle (Enrolled vs Free User)</li>
                <li>• Locked content preview for premium lessons</li>
                <li>• Responsive design simulation</li>
              </ul>
            </Card>
          </TabsContent>

          {/* Course Player Mode */}
          <TabsContent value="course" className="space-y-6 mt-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Full Course Player</h2>
              <p className="text-muted-foreground mb-6">
                Experience the complete course learning interface with sidebar, navigation, and progress tracking
              </p>
            </div>

            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <Button 
                  size="lg"
                  onClick={() => {
                    // This would open fullscreen player
                    const playerContainer = document.getElementById('course-player-container')
                    if (playerContainer) {
                      playerContainer.classList.remove('hidden')
                    }
                  }}
                >
                  <Monitor className="h-5 w-5 mr-2" />
                  Launch Course Player
                </Button>
              </div>
            </Card>

            {/* Features */}
            <Card className="p-6 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Monitor className="h-5 w-5 text-purple-600" />
                Features
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Collapsible sidebar with course outline</li>
                <li>• Progress tracking per module and overall</li>
                <li>• Next/Previous lesson navigation</li>
                <li>• Notes panel for taking lesson notes</li>
                <li>• Download resources and share options</li>
                <li>• Mark lesson as complete</li>
              </ul>
            </Card>
          </TabsContent>

          {/* Split View Mode */}
          <TabsContent value="split" className="space-y-6 mt-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Split Preview Mode</h2>
              <p className="text-muted-foreground mb-6">
                Edit and preview side-by-side with real-time updates (Coming Soon)
              </p>
            </div>

            <Card className="p-12 text-center bg-muted/50">
              <div className="max-w-md mx-auto space-y-4">
                <Columns className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="text-xl font-semibold">Split View Coming Soon</h3>
                <p className="text-muted-foreground">
                  This feature will allow you to edit lesson content on the left and see live preview on the right.
                </p>
              </div>
            </Card>

            {/* Features */}
            <Card className="p-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Columns className="h-5 w-5 text-green-600" />
                Planned Features
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Real-time preview updates as you type</li>
                <li>• Synchronized scrolling between editor and preview</li>
                <li>• Toggle preview on/off</li>
                <li>• Adjustable split ratio</li>
              </ul>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Lesson Preview Modal */}
        <LessonPreviewModal
          open={showLessonPreview}
          onOpenChange={setShowLessonPreview}
          lesson={selectedLesson}
        />

        {/* Course Player Fullscreen Container */}
        <div id="course-player-container" className="hidden fixed inset-0 z-50 bg-background">
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="outline"
              onClick={() => {
                const playerContainer = document.getElementById('course-player-container')
                if (playerContainer) {
                  playerContainer.classList.add('hidden')
                }
              }}
            >
              Exit Preview
            </Button>
          </div>
          <CoursePlayerPreview
            courseName="Complete React Course 2024"
            modules={mockCourseModules}
            currentLessonId={currentLessonId}
            onLessonChange={setCurrentLessonId}
          />
        </div>
      </div>
    </div>
  )
}