import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { MessageSquare, ThumbsUp, Search, Send, BookOpen, Clock, User, AlertCircle, Reply, CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useRouter } from '../../components/Router'
import { DashboardSidebar } from '../../components/DashboardSidebar'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import {
  type QnA as ApiQnA,
  type QnAAnswer as ApiQnAAnswer,
  createQnA,
  createQnAAnswer,
  getAllQnAAnswers,
  getAllQnAs,
  reportQnA,
  updateQnA,
} from '../../services/qna.api'

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
  return name
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function QnAPage() {
  const { t } = useTranslation()
  const { params, currentRoute } = useRouter()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const courseId = params?.courseId
  const isInstructorView = currentRoute.startsWith('/instructor/')
  const [selectedTab, setSelectedTab] = useState(isInstructorView ? 'unanswered' : 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [selectedCourse, setSelectedCourse] = useState('all')
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    description: '',
    lesson: '',
  })
  const [showAskForm, setShowAskForm] = useState(false)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [qnaData, setQnaData] = useState<UiQuestion[]>([])
  const [loading, setLoading] = useState(true)

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)

    if (diffMin < 1) return t('qna_page.time.just_now')
    if (diffMin < 60) return t('qna_page.time.minutes_ago', { count: diffMin })

    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return t('qna_page.time.hours_ago', { count: diffHours })

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return t('qna_page.time.days_ago', { count: diffDays })

    return date.toLocaleDateString()
  }

  const mapApiAnswer = (answer: ApiQnAAnswer): UiAnswer => {
    const name = answer.user_name || t('qna_page.user_fallback', { id: answer.user })
    return {
      id: answer.id,
      content: answer.answer,
      answeredBy: {
        name,
        avatar: answer.user_avatar || '',
        initials: getInitials(name),
      },
      answeredAt: formatTimeAgo(answer.created_at),
      votes: answer.likes,
      isInstructor: false,
    }
  }

  const mapApiQuestion = (question: ApiQnA, answers: UiAnswer[]): UiQuestion => {
    const name = question.user_name || t('qna_page.user_fallback', { id: question.user })
    return {
      id: question.id,
      question: question.question,
      description: question.description || '',
      askedBy: {
        name,
        avatar: question.user_avatar || '',
        initials: getInitials(name),
      },
      askedAt: formatTimeAgo(question.created_at),
      votes: question.votes,
      resolved: question.status === 'Closed',
      tags: question.tags || [],
      lesson: question.lesson_title || t('qna_page.lesson_fallback', { id: question.lesson }),
      answers,
    }
  }

  useEffect(() => {
    void loadData()
  }, [t])

  const loadData = async () => {
    setLoading(true)
    try {
      const apiQnAs = await getAllQnAs()
      const questions: UiQuestion[] = await Promise.all(
        apiQnAs.map(async (question) => {
          try {
            const apiAnswers = await getAllQnAAnswers(question.id)
            return mapApiQuestion(question, apiAnswers.map(mapApiAnswer))
          } catch {
            return mapApiQuestion(question, [])
          }
        }),
      )
      setQnaData(questions)
    } catch (error) {
      console.error('Failed to load Q&A data:', error)
    } finally {
      setLoading(false)
    }
  }

  const unansweredCount = qnaData.filter((question) => question.answers.length === 0).length

  const instructorCourses = [
    { id: 'all', name: t('qna_page.instructor_courses.all') },
    { id: '1', name: t('qna_page.instructor_courses.react_complete_guide') },
    { id: '2', name: t('qna_page.instructor_courses.javascript_fundamentals') },
    { id: '3', name: t('qna_page.instructor_courses.advanced_typescript') },
  ]

  const lessonOptions = [
    { value: 'intro', label: t('qna_page.lessons.introduction_to_react') },
    { value: 'components', label: t('qna_page.lessons.react_components') },
    { value: 'hooks', label: t('qna_page.lessons.react_hooks') },
    { value: 'routing', label: t('qna_page.lessons.react_router') },
    { value: 'state', label: t('qna_page.lessons.state_management') },
  ]

  const faqTabs = isInstructorView
    ? [
        { value: 'unanswered', label: t('qna_page.tabs.unanswered') },
        { value: 'all', label: t('qna_page.tabs.all_questions') },
        { value: 'unresolved', label: t('qna_page.tabs.unresolved') },
        { value: 'resolved', label: t('qna_page.tabs.resolved') },
      ]
    : [
        { value: 'all', label: t('qna_page.tabs.all_questions') },
        { value: 'unresolved', label: t('qna_page.tabs.unresolved') },
        { value: 'resolved', label: t('qna_page.tabs.resolved') },
        { value: 'my-questions', label: t('qna_page.tabs.my_questions') },
      ]

  const filteredQuestions = qnaData.filter((question) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      question.question.toLowerCase().includes(query) || question.description.toLowerCase().includes(query)

    const matchesCourse = selectedCourse === 'all' || true

    if (selectedTab === 'resolved') return matchesSearch && matchesCourse && question.resolved
    if (selectedTab === 'unresolved') return matchesSearch && matchesCourse && !question.resolved
    if (selectedTab === 'unanswered') return matchesSearch && matchesCourse && question.answers.length === 0
    if (selectedTab === 'my-questions') return matchesSearch && matchesCourse

    return matchesSearch && matchesCourse
  })

  const handleAskQuestion = async (event: FormEvent) => {
    event.preventDefault()
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
      await loadData()
      toast.success(t('qna_page.toast.question_posted'))
    } catch (error) {
      console.error('Failed to ask question:', error)
      toast.error(t('qna_page.toast.question_failed'))
    }
  }

  const handleVote = (questionId: number, answerId?: number) => {
    console.log('Voting:', { questionId, answerId })
    toast.success(t('qna_page.toast.vote_recorded'))
  }

  const handleReply = async (questionId: number) => {
    if (!replyText.trim()) {
      toast.error(t('qna_page.toast.reply_required'))
      return
    }

    try {
      await createQnAAnswer({
        qna: questionId,
        answer: replyText,
        user: Number(user?.id || 0),
      })

      if (isInstructorView) {
        addNotification({
          type: 'qna_response',
          title: t('qna_page.notifications.instructor_replied_title'),
          message: t('qna_page.notifications.instructor_replied_message', {
            name: user?.name || t('qna_page.notifications.instructor_fallback'),
          }),
        })
      }

      toast.success(t('qna_page.toast.reply_posted'))
      setReplyText('')
      setReplyingTo(null)
      await loadData()
    } catch (error) {
      console.error('Failed to post reply:', error)
      toast.error(t('qna_page.toast.reply_failed'))
    }
  }

  const handleMarkResolved = async (questionId: number) => {
    try {
      await updateQnA(questionId, { status: 'Closed' })
      toast.success(t('qna_page.toast.marked_resolved'))
      await loadData()
    } catch (error) {
      console.error('Failed to mark resolved:', error)
      toast.error(t('qna_page.toast.mark_resolved_failed'))
    }
  }

  const handleReportQuestion = async (questionId: number) => {
    if (!user) {
      toast.error(t('qna_page.toast.login_required_report'))
      return
    }

    const reason = window.prompt(t('qna_page.report_prompt'))
    if (reason === null) return

    try {
      await reportQnA(questionId, reason.trim())
      toast.success(t('qna_page.toast.report_submitted'))
      await loadData()
    } catch (error) {
      console.error('Failed to report Q&A:', error)
      toast.error(t('qna_page.toast.report_failed'))
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[400px] items-center justify-center p-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">{t('qna_page.loading')}</p>
        </div>
      </div>
    )
  }

  const content = (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2">{isInstructorView ? t('qna_page.header.instructor_title') : t('qna_page.header.title')}</h1>
          <p className="text-muted-foreground">
            {isInstructorView ? t('qna_page.header.instructor_description') : t('qna_page.header.description')}
          </p>
          {isInstructorView && unansweredCount > 0 && (
            <div className="mt-2 flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{t('qna_page.unanswered_summary', { count: unansweredCount })}</span>
            </div>
          )}
        </div>

        {!isInstructorView && (
          <Button onClick={() => setShowAskForm(true)} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            {t('qna_page.ask_question')}
          </Button>
        )}
      </div>

      {showAskForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('qna_page.form.title')}</CardTitle>
            <CardDescription>{t('qna_page.form.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAskQuestion} className="space-y-4">
              <div className="space-y-2">
                <label>{t('qna_page.form.question_title')}</label>
                <Input
                  placeholder={t('qna_page.form.question_placeholder')}
                  value={newQuestion.title}
                  onChange={(event) => setNewQuestion((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <label>{t('qna_page.form.lesson_label')}</label>
                <Select
                  value={newQuestion.lesson}
                  onValueChange={(value) => setNewQuestion((prev) => ({ ...prev, lesson: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('qna_page.form.lesson_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {lessonOptions.map((lesson) => (
                      <SelectItem key={lesson.value} value={lesson.value}>
                        {lesson.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label>{t('qna_page.form.description_label')}</label>
                <Textarea
                  placeholder={t('qna_page.form.description_placeholder')}
                  value={newQuestion.description}
                  onChange={(event) => setNewQuestion((prev) => ({ ...prev, description: event.target.value }))}
                  className="min-h-[100px]"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="gap-2">
                  <Send className="h-4 w-4" />
                  {t('qna_page.ask_question')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAskForm(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('qna_page.search_placeholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>

        {isInstructorView && (
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder={t('qna_page.filter_by_course')} />
            </SelectTrigger>
            <SelectContent>
              {instructorCourses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t('qna_page.sort_by')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t('qna_page.sort.recent')}</SelectItem>
            <SelectItem value="popular">{t('qna_page.sort.popular')}</SelectItem>
            <SelectItem value="unanswered">{t('qna_page.sort.unanswered')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {faqTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              {tab.value === 'unanswered' && unansweredCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {unansweredCount}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedTab} className="mt-8">
          <div className="space-y-6">
            {filteredQuestions.map((question) => (
              <Card key={question.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="cursor-pointer hover:text-primary">{question.question}</h3>
                          {question.resolved && (
                            <Badge className="bg-green-500 hover:bg-green-600">{t('qna_page.badges.resolved')}</Badge>
                          )}
                        </div>

                        <p className="mb-3 text-muted-foreground">{question.description}</p>

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

                      <div className="ml-4 flex flex-col items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleVote(question.id)}>
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">{question.votes}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {question.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {question.answers.length > 0 && (
                      <div className="space-y-4 border-l-2 border-muted pl-4">
                        <h4 className="font-medium">{t('qna_page.answers_count', { count: question.answers.length })}</h4>

                        {question.answers.map((answer) => (
                          <div key={answer.id} className="space-y-2">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={answer.answeredBy.avatar} />
                                <AvatarFallback>{answer.answeredBy.initials}</AvatarFallback>
                              </Avatar>

                              <div className="flex-1">
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="font-medium">{answer.answeredBy.name}</span>
                                  {answer.isInstructor && (
                                    <Badge variant="outline">{t('qna_page.badges.instructor')}</Badge>
                                  )}
                                  <span className="text-sm text-muted-foreground">{answer.answeredAt}</span>
                                </div>

                                <p className="text-sm">{answer.content}</p>
                              </div>

                              <div className="flex flex-col items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleVote(question.id, answer.id)}>
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                                <span className="text-sm">{answer.votes}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isInstructorView ? (
                      <div className="space-y-3 border-t pt-4">
                        {replyingTo === question.id ? (
                          <div className="space-y-3">
                            <Textarea
                              placeholder={t('qna_page.reply_placeholder')}
                              value={replyText}
                              onChange={(event) => setReplyText(event.target.value)}
                              className="min-h-[100px]"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => void handleReply(question.id)}>
                                <Send className="mr-2 h-4 w-4" />
                                {t('qna_page.post_answer')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReplyingTo(null)
                                  setReplyText('')
                                }}
                              >
                                {t('common.cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              {t('qna_page.summary', {
                                answers: question.answers.length,
                                votes: question.votes,
                              })}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setReplyingTo(question.id)}>
                                <Reply className="mr-2 h-4 w-4" />
                                {t('qna_page.reply')}
                              </Button>
                              {!question.resolved && question.answers.length > 0 && (
                                <Button variant="default" size="sm" onClick={() => void handleMarkResolved(question.id)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  {t('qna_page.mark_resolved')}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-sm text-muted-foreground">
                          {t('qna_page.summary', {
                            answers: question.answers.length,
                            votes: question.votes,
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setReplyingTo(question.id)}>
                            {t('qna_page.answer_question')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => void handleReportQuestion(question.id)}>
                            {t('qna_page.report')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredQuestions.length === 0 && (
              <div className="py-12 text-center">
                <MessageSquare className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                <h3 className="mb-2">{t('qna_page.empty.title')}</h3>
                <p className="mb-4 text-muted-foreground">
                  {searchQuery ? t('qna_page.empty.search_description') : t('qna_page.empty.default_description')}
                </p>
                <Button onClick={() => setShowAskForm(true)}>{t('qna_page.ask_question')}</Button>
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
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl">{content}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">{content}</div>
    </div>
  )
}
