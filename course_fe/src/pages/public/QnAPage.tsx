import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { MessageSquare, ThumbsUp, Search, Filter, Send, BookOpen, Clock, User, AlertCircle, Reply, CheckCircle2 } from 'lucide-react'
import { useRouter } from '../../components/Router'
import { DashboardSidebar } from '../../components/DashboardSidebar'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { toast } from 'sonner'
import {
  type QnA as ApiQnA,
  type QnAAnswer as ApiQnAAnswer,
  getAllQnAs,
  getAllQnAAnswers,
  createQnA,
  createQnAAnswer,
  updateQnA,
} from '../../services/qna.api'

// UI interfaces matching original design
interface UiAnswer {
  id: number
  content: string
  answeredBy: {
    name: string
    avatar: string
    initials: string
    role?: string
  }
  answeredAt: string
  votes: number
  isInstructor: boolean
}

interface UiQuestion {
  id: number
  question: string
  description: string
  askedBy: {
    name: string
    avatar: string
    initials: string
  }
  askedAt: string
  votes: number
  resolved: boolean
  tags: string[]
  lesson: string
  answers: UiAnswer[]
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} minutes ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} hours ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD} days ago`
  return d.toLocaleDateString()
}

function mapApiAnswer(a: ApiQnAAnswer): UiAnswer {
  const name = a.user_name || `User ${a.user}`
  return {
    id: a.id,
    content: a.answer,
    answeredBy: {
      name,
      avatar: a.user_avatar || '',
      initials: getInitials(name),
    },
    answeredAt: timeAgo(a.created_at),
    votes: a.likes,
    isInstructor: false,
  }
}

function mapApiQuestion(q: ApiQnA, answers: UiAnswer[]): UiQuestion {
  const name = q.user_name || `User ${q.user}`
  return {
    id: q.id,
    question: q.question,
    description: q.description || '',
    askedBy: {
      name,
      avatar: q.user_avatar || '',
      initials: getInitials(name),
    },
    askedAt: timeAgo(q.created_at),
    votes: q.votes,
    resolved: q.status === 'Closed',
    tags: q.tags || [],
    lesson: q.lesson_title || `Lesson #${q.lesson}`,
    answers,
  }
}

export function QnAPage() {
  const { params, currentRoute } = useRouter()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const courseId = params?.courseId
  const isInstructorView = currentRoute.startsWith('/instructor/')
  const [selectedTab, setSelectedTab] = useState(isInstructorView ? "unanswered" : "all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    description: '',
    lesson: ''
  })
  const [showAskForm, setShowAskForm] = useState(false)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState("")
  const [qnaData, setQnaData] = useState<UiQuestion[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const apiQnAs = await getAllQnAs()
      // Load answers for each question
      const questions: UiQuestion[] = await Promise.all(
        apiQnAs.map(async (q) => {
          try {
            const apiAnswers = await getAllQnAAnswers(q.id)
            const uiAnswers = apiAnswers.map(mapApiAnswer)
            return mapApiQuestion(q, uiAnswers)
          } catch {
            return mapApiQuestion(q, [])
          }
        })
      )
      setQnaData(questions)
    } catch (err) {
      console.error('Failed to load Q&A data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get unanswered questions count for instructor
  const unansweredCount = qnaData.filter(q => q.answers.length === 0).length
  
  // Mock course list for instructor
  const instructorCourses = [
    { id: 'all', name: 'All Courses' },
    { id: '1', name: 'React - The Complete Guide' },
    { id: '2', name: 'JavaScript Fundamentals' },
    { id: '3', name: 'Advanced TypeScript' }
  ]

  const filteredQuestions = qnaData.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCourse = selectedCourse === 'all' || true // In real app, filter by actual course
    
    if (selectedTab === "resolved") return matchesSearch && matchesCourse && q.resolved
    if (selectedTab === "unresolved") return matchesSearch && matchesCourse && !q.resolved
    if (selectedTab === "unanswered") return matchesSearch && matchesCourse && q.answers.length === 0
    if (selectedTab === "my-questions") return matchesSearch && matchesCourse // In real app, filter by current user
    
    return matchesSearch && matchesCourse
  })

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      await createQnA({
        course: Number(courseId) || 1,
        lesson: Number(newQuestion.lesson) || 1,
        question: newQuestion.title,
        description: newQuestion.description,
        user: Number(user.id),
      })
      setNewQuestion({ title: '', description: '', lesson: '' })
      setShowAskForm(false)
      loadData()
      toast.success("Question posted successfully!")
    } catch (err) {
      console.error('Failed to ask question:', err)
      toast.error("Failed to post question")
    }
  }

  const handleVote = (questionId: number, answerId?: number) => {
    console.log('Voting:', { questionId, answerId })
    toast.success("Vote recorded!")
  }

  const handleReply = async (questionId: number) => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply")
      return
    }

    try {
      await createQnAAnswer({
        qna: questionId,
        answer: replyText,
        user: Number(user?.id || 0),
      })

      // Send notification to question author
      if (isInstructorView) {
        addNotification({
          type: 'qna_response',
          title: 'Instructor replied to your question',
          message: `${user?.name || 'Instructor'} answered your question`,
        })
      }

      toast.success("Reply posted successfully!")
      setReplyText("")
      setReplyingTo(null)
      loadData()
    } catch (err) {
      console.error('Failed to post reply:', err)
      toast.error("Failed to post reply")
    }
  }

  const handleMarkResolved = async (questionId: number) => {
    try {
      await updateQnA(questionId, { status: 'Closed' })
      toast.success("Question marked as resolved!")
      loadData()
    } catch (err) {
      console.error('Failed to mark resolved:', err)
      toast.error("Failed to mark as resolved")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const content = (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-2">{isInstructorView ? 'Student Questions' : 'Q&A'}</h1>
          <p className="text-muted-foreground">
            {isInstructorView 
              ? 'Answer student questions and provide guidance' 
              : 'Get help from instructors and fellow students'}
          </p>
          {isInstructorView && unansweredCount > 0 && (
            <div className="flex items-center gap-2 mt-2 text-orange-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''} need your attention</span>
            </div>
          )}
        </div>
        
        {!isInstructorView && (
          <Button onClick={() => setShowAskForm(true)} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Ask Question
          </Button>
        )}
      </div>

        {/* Ask Question Form */}
        {showAskForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Ask a Question</CardTitle>
              <CardDescription>
                Get help from instructors and other students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAskQuestion} className="space-y-4">
                <div className="space-y-2">
                  <label>Question Title</label>
                  <Input
                    placeholder="What's your question?"
                    value={newQuestion.title}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label>Lesson (Optional)</label>
                  <Select 
                    value={newQuestion.lesson} 
                    onValueChange={(value) => setNewQuestion(prev => ({ ...prev, lesson: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lesson" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intro">Introduction to React</SelectItem>
                      <SelectItem value="components">React Components</SelectItem>
                      <SelectItem value="hooks">React Hooks</SelectItem>
                      <SelectItem value="routing">React Router</SelectItem>
                      <SelectItem value="state">State Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label>Description</label>
                  <Textarea
                    placeholder="Provide more details about your question..."
                    value={newQuestion.description}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px]"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="gap-2">
                    <Send className="h-4 w-4" />
                    Ask Question
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAskForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {isInstructorView && (
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              {instructorCourses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="unanswered">Unanswered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        {isInstructorView ? (
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="unanswered">
              Unanswered
              {unansweredCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {unansweredCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Questions</TabsTrigger>
            <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Questions</TabsTrigger>
            <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="my-questions">My Questions</TabsTrigger>
          </TabsList>
        )}

          <TabsContent value={selectedTab} className="mt-8">
            <div className="space-y-6">
              {filteredQuestions.map((question) => (
                <Card key={question.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Question Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="cursor-pointer hover:text-primary">
                              {question.question}
                            </h3>
                            {question.resolved && (
                              <Badge className="bg-green-500 hover:bg-green-600">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-muted-foreground mb-3">
                            {question.description}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{question.askedBy.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{question.askedAt}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              <span>{question.lesson}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVote(question.id)}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <span className="text-sm font-medium">{question.votes}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {question.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>

                      {/* Answers */}
                      {question.answers.length > 0 && (
                        <div className="space-y-4 pl-4 border-l-2 border-muted">
                          <h4 className="font-medium">
                            {question.answers.length} Answer{question.answers.length !== 1 ? 's' : ''}
                          </h4>
                          
                          {question.answers.map((answer) => (
                            <div key={answer.id} className="space-y-2">
                              <div className="flex items-start gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={answer.answeredBy.avatar} />
                                  <AvatarFallback>{answer.answeredBy.initials}</AvatarFallback>
                                </Avatar>
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium">{answer.answeredBy.name}</span>
                                    {answer.isInstructor && (
                                      <Badge variant="outline">Instructor</Badge>
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                      {answer.answeredAt}
                                    </span>
                                  </div>
                                  
                                  <p className="text-sm">{answer.content}</p>
                                </div>
                                
                                <div className="flex flex-col items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleVote(question.id, answer.id)}
                                  >
                                    <ThumbsUp className="h-4 w-4" />
                                  </Button>
                                  <span className="text-sm">{answer.votes}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Answer/Reply Section */}
                      {isInstructorView ? (
                        <div className="pt-4 border-t space-y-3">
                          {replyingTo === question.id ? (
                            <div className="space-y-3">
                              <Textarea
                                placeholder="Write your answer..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="min-h-[100px]"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleReply(question.id)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Post Answer
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setReplyingTo(null)
                                    setReplyText("")
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div className="text-sm text-muted-foreground">
                                {question.answers.length} answers • {question.votes} votes
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setReplyingTo(question.id)}
                                >
                                  <Reply className="h-4 w-4 mr-2" />
                                  Reply
                                </Button>
                                {!question.resolved && question.answers.length > 0 && (
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={() => handleMarkResolved(question.id)}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark Resolved
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-between items-center pt-2">
                          <div className="text-sm text-muted-foreground">
                            {question.answers.length} answers • {question.votes} votes
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setReplyingTo(question.id)}>
                            Answer Question
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredQuestions.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="mb-2">No questions found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "Try different keywords" : "Be the first to ask a question!"}
                  </p>
                  <Button onClick={() => setShowAskForm(true)}>
                    Ask Question
                  </Button>
                </div>
              )}
            </div>
        </TabsContent>
      </Tabs>
    </>
  )

  if (isInstructorView) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar type="instructor" />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {content}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {content}
      </div>
    </div>
  )
}
