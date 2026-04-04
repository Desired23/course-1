import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../../components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group"
import { ScrollArea } from "../../components/ui/scroll-area"
import { Progress } from "../../components/ui/progress"
import { UserPagination } from "../../components/UserPagination"
import {
  MessageSquare,
  Send,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  Reply,
  Bell,
  Mail,
  Megaphone,
  User,
  Flag,
  MoreVertical,
  Paperclip,
  Trash2,
  Edit,
  BookOpen,
  Users,
  TrendingUp,
  Star,
  Info,
  PlusCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { useChat } from '../../contexts/ChatContext'
import { getCourses, type CourseListItem } from '../../services/course.api'
import { getInstructorDashboardStats, getMyInstructorProfile, type InstructorDashboardStats } from '../../services/instructor.api'
import {
  createInstructorAnnouncement,
  getInstructorAnnouncements,
  revokeInstructorAnnouncement,
  updateInstructorAnnouncement,
  type InstructorAnnouncement,
} from '../../services/notification.api'
import { getQnAs, getAllQnAAnswers, createQnAAnswer, updateQnA, type QnA, type QnAAnswer } from '../../services/qna.api'
import { reportConversationMessage } from '../../services/chat.api'
import { formatRelativeTime } from '../../utils/formatters'

// Q&A data is now fetched from API

// Adapter: map BE QnA → FE question format
function qnaToQuestion(q: QnA) {
  const statusMap: Record<string, 'unanswered' | 'answered' | 'resolved'> = {
    Pending: 'unanswered',
    Answered: 'answered',
    Closed: 'resolved',
  }
  const name = q.user_name || 'Student'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return {
    id: q.id,
    question: q.question,
    description: q.description || '',
    student: {
      name,
      avatar: q.user_avatar || '',
      initials,
    },
    course: q.course_title || 'Unknown Course',
    lesson: q.lesson_title || '',
    timestamp: formatRelativeTime(q.created_at),
    votes: q.votes,
    answers: q.answers_count,
    status: statusMap[q.status] || 'unanswered' as const,
    hasInstructorReply: q.status === 'Answered' || q.status === 'Closed',
    flagged: false,
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

type QuestionItem = ReturnType<typeof qnaToQuestion>

type AnnouncementView = InstructorAnnouncement & {
  id: string
  sentAt: string
  recipientCount: number
  openRate: number
}

function mapAnnouncementToView(item: InstructorAnnouncement): AnnouncementView {
  return {
    ...item,
    id: item.notification_code,
    sentAt: item.sent_at,
    recipientCount: item.recipient_count,
    openRate: item.open_rate,
  }
}

export function InstructorCommunicationPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const {
    state: chatState,
    setActiveConversation,
    sendMessage,
  } = useChat()
  const [activeTab, setActiveTab] = useState('qna')
  const [qnaFilter, setQnaFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQnaSearch, setDebouncedQnaSearch] = useState('')
  const [qnaPage, setQnaPage] = useState(1)
  const [qnaTotalPages, setQnaTotalPages] = useState(1)
  const [qnaLoading, setQnaLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<InstructorDashboardStats | null>(null)
  const [qnaSummary, setQnaSummary] = useState({ total: 0, unanswered: 0 })
  const [conversationQuery, setConversationQuery] = useState('')
  const [conversationPage, setConversationPage] = useState(1)
  const [announcementTypeFilter, setAnnouncementTypeFilter] = useState('all')
  const [announcementPage, setAnnouncementPage] = useState(1)
  const [announcementLoading, setAnnouncementLoading] = useState(false)
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false)
  const [announcementUpdating, setAnnouncementUpdating] = useState(false)
  const [announcements, setAnnouncements] = useState<AnnouncementView[]>([])
  const [instructorCourses, setInstructorCourses] = useState<CourseListItem[]>([])
  const [announcementLimits, setAnnouncementLimits] = useState({
    educational: { used: 0, limit: 4 },
    promotional: { used: 0, limit: 2 },
  })
  const [messageInput, setMessageInput] = useState('')
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false)
  const [showEditAnnouncementDialog, setShowEditAnnouncementDialog] = useState(false)
  const [announcementEditing, setAnnouncementEditing] = useState<AnnouncementView | null>(null)
  const [announcementData, setAnnouncementData] = useState({
    type: 'educational',
    title: '',
    content: '',
    targetCourse: 'all'
  })
  const [editAnnouncementData, setEditAnnouncementData] = useState({
    title: '',
    content: '',
  })
  const [questions, setQuestions] = useState<ReturnType<typeof qnaToQuestion>[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null)
  const [questionAnswers, setQuestionAnswers] = useState<QnAAnswer[]>([])
  const [questionAnswersLoading, setQuestionAnswersLoading] = useState(false)
  const [questionReplyText, setQuestionReplyText] = useState('')
  const [questionReplySubmitting, setQuestionReplySubmitting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQnaSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    let cancelled = false
    async function fetchQnA() {
      try {
        setQnaLoading(true)
        const statusMap: Record<string, 'Pending' | 'Answered' | 'Closed' | undefined> = {
          unanswered: 'Pending',
          answered: 'Answered',
          all: undefined,
          flagged: undefined,
        }
        const res = await getQnAs({
          page: qnaPage,
          page_size: 8,
          status: statusMap[qnaFilter],
          search: debouncedQnaSearch || undefined,
        })
        if (cancelled) return
        setQuestions((res.results || []).map(qnaToQuestion))
        setQnaTotalPages(res.total_pages || 1)
      } catch (err) {
        console.error('Failed to load Q&A:', err)
      } finally {
        if (!cancelled) setQnaLoading(false)
      }
    }
    fetchQnA()
    return () => { cancelled = true }
  }, [qnaPage, qnaFilter, debouncedQnaSearch])

  useEffect(() => {
    setQnaPage(1)
  }, [qnaFilter, debouncedQnaSearch])

  const paginatedQuestions = questions

  useEffect(() => {
    let cancelled = false
    async function fetchCommunicationSummary() {
      try {
        setSummaryLoading(true)
        const [dashboard, qnaAll, qnaPending] = await Promise.all([
          getInstructorDashboardStats(),
          getQnAs({ page: 1, page_size: 1 }),
          getQnAs({ page: 1, page_size: 1, status: 'Pending' }),
        ])
        if (cancelled) return
        setDashboardStats(dashboard)
        setQnaSummary({
          total: qnaAll.count || 0,
          unanswered: qnaPending.count || 0,
        })
      } catch (err) {
        console.error('Failed to load communication summary:', err)
      } finally {
        if (!cancelled) setSummaryLoading(false)
      }
    }
    fetchCommunicationSummary()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function fetchAnnouncementData() {
      try {
        setAnnouncementLoading(true)
        const [announcementRes, profile] = await Promise.all([
          getInstructorAnnouncements(),
          getMyInstructorProfile(user.id),
        ])
        const coursesRes = await getCourses({
          instructor_id: profile.id,
          page: 1,
          page_size: 100,
        })
        if (cancelled) return

        const history = (announcementRes.results || []).map(mapAnnouncementToView)
        setAnnouncements(history)
        setInstructorCourses(coursesRes.results || [])

        const currentMonth = new Date()
        const monthAnnouncements = history.filter((item) => {
          const sentAt = new Date(item.sent_at)
          return (
            sentAt.getFullYear() === currentMonth.getFullYear() &&
            sentAt.getMonth() === currentMonth.getMonth()
          )
        })
        setAnnouncementLimits({
          educational: {
            used: monthAnnouncements.filter((item) => item.type === 'educational').length,
            limit: 4,
          },
          promotional: {
            used: monthAnnouncements.filter((item) => item.type === 'promotional').length,
            limit: 2,
          },
        })
      } catch (err) {
        console.error('Failed to load announcement data:', err)
      } finally {
        if (!cancelled) setAnnouncementLoading(false)
      }
    }

    fetchAnnouncementData()
    return () => { cancelled = true }
  }, [user?.id])

  const filteredConversations = useMemo(() => {
    const keyword = conversationQuery.trim().toLowerCase()
    return chatState.conversations.map((conversation) => {
      const participant = conversation.participants.find((item) => item.id !== user?.id)
      return {
        ...conversation,
        student: {
          name: participant?.name || 'Student',
          avatar: participant?.avatar || '',
          initials: getInitials(participant?.name || 'Student'),
        },
        timestamp: conversation.lastMessage
          ? formatRelativeTime(conversation.lastMessage.timestamp)
          : formatRelativeTime(conversation.updatedAt),
        unread: conversation.unreadCount,
        online: participant?.online ?? false,
        lastMessageText: conversation.lastMessage?.content || 'Chưa có tin nhắn',
      }
    }).filter((conversation) => {
      return conversation.student.name.toLowerCase().includes(keyword)
    })
  }, [chatState.conversations, conversationQuery, user?.id])
  useEffect(() => {
    setConversationPage(1)
  }, [conversationQuery])

  const CONVERSATIONS_PER_PAGE = 8
  const conversationTotalPages = Math.max(1, Math.ceil(filteredConversations.length / CONVERSATIONS_PER_PAGE))
  const paginatedConversations = filteredConversations.slice(
    (conversationPage - 1) * CONVERSATIONS_PER_PAGE,
    conversationPage * CONVERSATIONS_PER_PAGE
  )

  useEffect(() => {
    if (conversationPage > conversationTotalPages) setConversationPage(conversationTotalPages)
  }, [conversationPage, conversationTotalPages])

  useEffect(() => {
    if (chatState.activeConversationId && chatState.conversations.some((conversation) => conversation.id === chatState.activeConversationId)) {
      return
    }

    const firstConversationId = chatState.conversations[0]?.id ?? null
    if (firstConversationId) {
      setActiveConversation(firstConversationId)
      return
    }

    if (chatState.activeConversationId) {
      setActiveConversation(null)
    }
  }, [chatState.activeConversationId, chatState.conversations, setActiveConversation])

  const filteredAnnouncements = announcements.filter((a) =>
    announcementTypeFilter === 'all' ? true : a.type === announcementTypeFilter
  )
  useEffect(() => {
    setAnnouncementPage(1)
  }, [announcementTypeFilter])

  const ANNOUNCEMENTS_PER_PAGE = 5
  const announcementTotalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / ANNOUNCEMENTS_PER_PAGE))
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (announcementPage - 1) * ANNOUNCEMENTS_PER_PAGE,
    announcementPage * ANNOUNCEMENTS_PER_PAGE
  )

  useEffect(() => {
    if (announcementPage > announcementTotalPages) setAnnouncementPage(announcementTotalPages)
  }, [announcementPage, announcementTotalPages])

  // Get selected conversation messages
  const currentConversation = useMemo(() => {
    const conversation = chatState.conversations.find(
      (item) => item.id === chatState.activeConversationId
    )
    if (!conversation) return null
    const participant = conversation.participants.find((item) => item.id !== user?.id)
    return {
      ...conversation,
      student: {
        name: participant?.name || 'Student',
        avatar: participant?.avatar || '',
        initials: getInitials(participant?.name || 'Student'),
      },
      online: participant?.online ?? false,
    }
  }, [chatState.activeConversationId, chatState.conversations, user?.id])
  const currentParticipant = currentConversation?.participants.find((participant) => participant.id !== user?.id)
  const currentMessages = useMemo(() => {
    const messages = chatState.activeConversationId
      ? (chatState.messages[chatState.activeConversationId] || [])
      : []
    return messages.map((message) => ({
      ...message,
      sender: message.senderId === String(user?.id) ? 'instructor' : 'student',
      attachments: [] as string[],
      timestamp: formatRelativeTime(message.timestamp),
    }))
  }, [chatState.activeConversationId, chatState.messages, user?.id])
  const unansweredQuestions = dashboardStats?.pending_questions ?? qnaSummary.unanswered
  const totalQuestions = qnaSummary.total
  const responseRate = totalQuestions > 0
    ? Math.round(((totalQuestions - unansweredQuestions) / totalQuestions) * 100)
    : 0
  const averageRating = dashboardStats?.average_rating ?? 0

  // Send message
  const handleSendMessage = async () => {
    const content = messageInput.trim()
    if (!content || !chatState.activeConversationId || !user) return

    await sendMessage(chatState.activeConversationId, {
      senderId: String(user.id),
      senderName: user.name || user.username || user.email,
      senderAvatar: user.avatar,
      content,
      type: 'text',
    })
    setMessageInput('')
    toast.success(t('instructor_communication_page.message_sent'))
  }

  const handleReportMessage = async (messageId: string) => {
    const reason = window.prompt(t('instructor_communication_page.report_reason_prompt'), '')?.trim()
    if (!reason) return
    try {
      await reportConversationMessage(Number(messageId), { reason })
      toast.success(t('instructor_communication_page.report_sent'))
    } catch (err: any) {
      toast.error(err?.message || t('instructor_communication_page.report_failed'))
    }
  }

  // Send announcement
  const handleSendAnnouncement = async () => {
    if (!announcementData.title.trim() || !announcementData.content.trim()) {
      toast.error(t('instructor_communication_page.fill_required_fields'))
      return
    }

    const selectedLimit = announcementData.type === 'educational'
      ? announcementLimits.educational
      : announcementLimits.promotional

    if (announcementData.type === 'educational' && selectedLimit.used >= selectedLimit.limit) {
      toast.error(t('instructor_communication_page.educational_limit_reached'))
      return
    }

    if (announcementData.type === 'promotional' && selectedLimit.used >= selectedLimit.limit) {
      toast.error(t('instructor_communication_page.promotional_limit_reached'))
      return
    }

    try {
      setAnnouncementUpdating(true)
      const created = await createInstructorAnnouncement({
        type: announcementData.type as 'educational' | 'promotional',
        title: announcementData.title.trim(),
        content: announcementData.content.trim(),
        target_course: announcementData.targetCourse,
      })
      setAnnouncements((prev) => [mapAnnouncementToView(created), ...prev])
      setAnnouncementLimits((prev) => ({
        ...prev,
        [created.type]: {
          used: prev[created.type].used + 1,
          limit: prev[created.type].limit,
        },
      }))
      setShowAnnouncementDialog(false)
      setAnnouncementData({
        type: 'educational',
        title: '',
        content: '',
        targetCourse: 'all'
      })
      return
    } catch (err: any) {
      toast.error(err?.message || t('instructor_communication_page.send_announcement_failed'))
      return
    } finally {
      setAnnouncementSubmitting(false)
    }
  }

  const handleRevokeAnnouncement = async (announcement: AnnouncementView) => {
    try {
      await revokeInstructorAnnouncement(announcement.notification_code)
      setAnnouncements((prev) => prev.filter((item) => item.notification_code !== announcement.notification_code))
      setAnnouncementLimits((prev) => ({
        ...prev,
        [announcement.type]: {
          used: Math.max(0, prev[announcement.type].used - 1),
          limit: prev[announcement.type].limit,
        },
      }))
      toast.success(t('instructor_communication_page.revoke_success'))
    } catch (err: any) {
      toast.error(err?.message || t('instructor_communication_page.revoke_failed'))
    }
  }

  const handleStartEditAnnouncement = (announcement: AnnouncementView) => {
    setAnnouncementEditing(announcement)
    setEditAnnouncementData({
      title: announcement.title,
      content: announcement.content,
    })
    setShowEditAnnouncementDialog(true)
  }

  const handleEditDialogChange = (open: boolean) => {
    setShowEditAnnouncementDialog(open)
    if (!open) {
      setAnnouncementEditing(null)
      setEditAnnouncementData({
        title: '',
        content: '',
      })
    }
  }

  const handleUpdateAnnouncement = async () => {
    if (!announcementEditing) return
    const title = editAnnouncementData.title.trim()
    const content = editAnnouncementData.content.trim()
    if (!title || !content) {
      toast.error(t('instructor_communication_page.fill_required_fields'))
      return
    }

    try {
      setAnnouncementUpdating(true)
      await updateInstructorAnnouncement(announcementEditing.notification_code, {
        title,
        content,
      })
      setAnnouncements((prev) => prev.map((item) =>
        item.notification_code === announcementEditing.notification_code
          ? {
              ...item,
              title,
              content,
            }
          : item
      ))
      handleEditDialogChange(false)
      toast.success(t('instructor_communication_page.update_success'))
    } catch (err: any) {
      toast.error(err?.message || t('instructor_communication_page.update_failed'))
    } finally {
      setAnnouncementUpdating(false)
    }
  }

  const handleOpenQuestion = async (question: QuestionItem) => {
    setSelectedQuestion(question)
    setQuestionReplyText('')
    setQuestionAnswers([])
    try {
      setQuestionAnswersLoading(true)
      const answers = await getAllQnAAnswers(question.id)
      setQuestionAnswers(answers)
    } catch (err) {
      console.error('Failed to load Q&A answers:', err)
      toast.error(t('instructor_communication_page.load_answers_failed'))
    } finally {
      setQuestionAnswersLoading(false)
    }
  }

  const handleSubmitQuestionReply = async () => {
    if (!selectedQuestion || !user?.id) return
    const answer = questionReplyText.trim()
    if (!answer) {
      toast.error(t('instructor_communication_page.reply_required'))
      return
    }

    try {
      setQuestionReplySubmitting(true)
      const created = await createQnAAnswer({
        qna: selectedQuestion.id,
        answer,
        user: Number(user.id),
      })
      await updateQnA(selectedQuestion.id, { status: 'Answered' })
      setQuestionAnswers((prev) => [...prev, created])
      setQuestions((prev) => prev.map((item) =>
        item.id === selectedQuestion.id
          ? {
              ...item,
              answers: item.answers + 1,
              status: 'answered',
              hasInstructorReply: true,
            }
          : item
      ))
      setSelectedQuestion((prev) => prev ? {
        ...prev,
        answers: prev.answers + 1,
        status: 'answered',
        hasInstructorReply: true,
      } : prev)
      setQnaSummary((prev) => ({
        total: prev.total,
        unanswered: Math.max(0, prev.unanswered - (selectedQuestion.status === 'unanswered' ? 1 : 0)),
      }))
      setQuestionReplyText('')
      toast.success(t('instructor_communication_page.reply_sent'))
    } catch (err) {
      console.error('Failed to submit Q&A answer:', err)
      toast.error(t('instructor_communication_page.reply_failed'))
    } finally {
      setQuestionReplySubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="mb-2">{t('instructor_communication_page.title')}</h1>
        <p className="text-muted-foreground">
          {t('instructor_communication_page.description')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('instructor_communication_page.unanswered_questions')}</p>
                <p className="text-2xl mt-1">{summaryLoading ? '...' : unansweredQuestions}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('instructor_communication_page.new_messages')}</p>
                <p className="text-2xl mt-1">{chatState.totalUnreadCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('instructor_communication_page.response_rate')}</p>
                <p className="text-2xl mt-1">{summaryLoading ? '...' : `${responseRate}%`}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('instructor_communication_page.average_rating')}</p>
                <p className="text-2xl mt-1">{summaryLoading ? '...' : averageRating.toFixed(1)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="qna" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            {t('instructor_communication_page.qna_tab')}
            <Badge variant="destructive" className="ml-2">{unansweredQuestions}</Badge>
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <Mail className="w-4 h-4" />
            {t('instructor_communication_page.messages_tab')}
            <Badge variant="default" className="ml-2">{chatState.totalUnreadCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="w-4 h-4" />
            {t('instructor_communication_page.announcements_tab')}
          </TabsTrigger>
        </TabsList>

        {/* Q&A Tab */}
        <TabsContent value="qna" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>{t('instructor_communication_page.qna_title')}</CardTitle>
                  <CardDescription>
                    {t('instructor_communication_page.qna_description')}
                  </CardDescription>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('instructor_communication_page.search_questions_placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={qnaFilter} onValueChange={setQnaFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('instructor_communication_page.all')}</SelectItem>
                      <SelectItem value="unanswered">{t('instructor_communication_page.unanswered')}</SelectItem>
                      <SelectItem value="answered">{t('instructor_communication_page.answered')}</SelectItem>
                      <SelectItem value="flagged">{t('instructor_communication_page.flagged')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qnaLoading && (
                  <div className="text-center py-8 text-muted-foreground">{t('instructor_communication_page.loading_qna')}</div>
                )}
                {!qnaLoading && paginatedQuestions.map((question) => (
                  <Card key={question.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Vote section */}
                        <div className="flex flex-col items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ThumbsUp className="w-4 h-4" />
                          </Button>
                          <span className="text-sm">{question.votes}</span>
                        </div>

                        {/* Question content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="text-base mb-1">{question.question}</h3>
                              <p className="text-sm text-muted-foreground mb-3">
                                {question.description}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={question.student.avatar} />
                                    <AvatarFallback>{question.student.initials}</AvatarFallback>
                                  </Avatar>
                                  <span>{question.student.name}</span>
                                </div>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  <span>{question.lesson}</span>
                                </div>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{question.timestamp}</span>
                                </div>
                              </div>
                            </div>

                            {/* Status badge */}
                            <div className="ml-4">
                              {question.status === 'unanswered' && (
                                <Badge variant="destructive">{t('instructor_communication_page.unanswered')}</Badge>
                              )}
                              {question.status === 'answered' && (
                                <Badge variant="secondary">{t('instructor_communication_page.answered')}</Badge>
                              )}
                              {question.status === 'resolved' && (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {t('instructor_communication_page.resolved')}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3">
                            <Button size="sm" variant="default" onClick={() => void handleOpenQuestion(question)}>
                              <Reply className="w-4 h-4 mr-2" />
                              {t('instructor_communication_page.reply_with_count', { count: question.answers })}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => toast.info(t('instructor_communication_page.flag_workflow_unavailable'))}>
                              <Flag className="w-4 h-4 mr-2" />
                              {t('instructor_communication_page.flag')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {!qnaLoading && paginatedQuestions.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('instructor_communication_page.no_questions')}</p>
                  </div>
                )}
                {!qnaLoading && paginatedQuestions.length > 0 && (
                  <UserPagination
                    currentPage={qnaPage}
                    totalPages={qnaTotalPages}
                    onPageChange={setQnaPage}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Direct Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardContent className="p-0">
              <div className="grid md:grid-cols-3 h-[600px]">
                {/* Conversations list */}
                <div className="border-r">
                  <div className="p-4 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t('instructor_communication_page.search_students_placeholder')}
                        className="pl-10"
                        value={conversationQuery}
                        onChange={(e) => setConversationQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <ScrollArea className="h-[540px]">
                    {paginatedConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          chatState.activeConversationId === conv.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => setActiveConversation(conv.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar>
                              <AvatarFallback>{getInitials(conv.participants.find((item) => item.id !== user?.id)?.name || 'ST')}</AvatarFallback>
                            </Avatar>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm truncate">{conv.participants.find((item) => item.id !== user?.id)?.name || t('instructor_communication_page.student_fallback')}</p>
                              <span className="text-xs text-muted-foreground">
                                {conv.lastMessage ? formatRelativeTime(conv.lastMessage.timestamp) : formatRelativeTime(conv.updatedAt)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessage?.content || t('instructor_communication_page.no_messages_fallback')}
                            </p>
                          </div>

                          {conv.unreadCount > 0 && (
                            <Badge variant="default" className="ml-2">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredConversations.length > 0 && (
                      <div className="p-3 border-t">
                        <UserPagination
                          currentPage={conversationPage}
                          totalPages={conversationTotalPages}
                          onPageChange={setConversationPage}
                        />
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Chat area */}
                <div className="md:col-span-2 flex flex-col">
                  {chatState.activeConversationId ? (
                    <>
                      {/* Chat header */}
                      <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{getInitials(currentParticipant?.name || 'ST')}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{currentParticipant?.name || 'Student'}</p>
                              <p className="text-xs text-muted-foreground">
                                {currentConversation?.online ? t('instructor_communication_page.online') : t('instructor_communication_page.offline')}
                              </p>
                            </div>
                          </div>

                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Messages */}
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {currentMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender === 'instructor' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[70%] ${msg.sender === 'instructor' ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm flex-1">{msg.content}</p>
                                  {msg.sender !== 'instructor' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => void handleReportMessage(msg.id)}
                                    >
                                      <Flag className="w-3 h-3 mr-1" />
                                      {t('instructor_communication_page.report')}
                                    </Button>
                                  )}
                                </div>
                                {msg.attachments.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-current/10">
                                    {msg.attachments.map((file, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-xs">
                                        <Paperclip className="w-3 h-3" />
                                        <span>{file}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs mt-2 opacity-70">{msg.timestamp}</p>
                              </div>
                            </div>
                          ))}
                          {currentMessages.length === 0 && (
                            <div className="text-center py-10 text-sm text-muted-foreground">
                              {t('instructor_communication_page.no_messages_in_conversation')}
                            </div>
                          )}
                        </div>
                      </ScrollArea>

                      {/* Message input */}
                      <div className="p-4 border-t">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          <Input
                            placeholder={t('instructor_communication_page.message_placeholder')}
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && void handleSendMessage()}
                          />
                          <Button onClick={handleSendMessage}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">{t('instructor_communication_page.select_conversation')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>{t('instructor_communication_page.announcements_tab')}</CardTitle>
                  <CardDescription>
                    {t('instructor_communication_page.announcements_description')}
                  </CardDescription>
                </div>

                <Select value={announcementTypeFilter} onValueChange={setAnnouncementTypeFilter}>
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder={t('instructor_communication_page.type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('instructor_communication_page.all_types')}</SelectItem>
                    <SelectItem value="educational">{t('instructor_communication_page.educational')}</SelectItem>
                    <SelectItem value="promotional">{t('instructor_communication_page.promotional')}</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      {t('instructor_communication_page.create_announcement')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{t('instructor_communication_page.create_announcement_title')}</DialogTitle>
                      <DialogDescription>
                        {t('instructor_communication_page.create_announcement_description')}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label>{t('instructor_communication_page.announcement_type')}</Label>
                        <RadioGroup
                          value={announcementData.type}
                          onValueChange={(value) => setAnnouncementData({ ...announcementData, type: value })}
                          className="grid grid-cols-2 gap-4 mt-2"
                        >
                          <Card
                            className={`cursor-pointer ${announcementData.type === 'educational' ? 'border-primary' : ''}`}
                            onClick={() => setAnnouncementData({ ...announcementData, type: 'educational' })}
                          >
                            <CardContent className="p-4 flex items-start gap-3">
                              <RadioGroupItem value="educational" id="educational" />
                              <div className="flex-1">
                                <Label htmlFor="educational" className="cursor-pointer">
                                  {t('instructor_communication_page.educational')}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t('instructor_communication_page.educational_description')}
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card
                            className={`cursor-pointer ${announcementData.type === 'promotional' ? 'border-primary' : ''}`}
                            onClick={() => setAnnouncementData({ ...announcementData, type: 'promotional' })}
                          >
                            <CardContent className="p-4 flex items-start gap-3">
                              <RadioGroupItem value="promotional" id="promotional" />
                              <div className="flex-1">
                                <Label htmlFor="promotional" className="cursor-pointer">
                                  {t('instructor_communication_page.promotional')}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t('instructor_communication_page.promotional_description')}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </RadioGroup>
                      </div>

                      <div>
                        <Label htmlFor="title">{t('instructor_communication_page.title_label')}</Label>
                        <Input
                          id="title"
                          placeholder={t('instructor_communication_page.announcement_title_placeholder')}
                          value={announcementData.title}
                          onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="content">{t('instructor_communication_page.content_label')}</Label>
                        <Textarea
                          id="content"
                          placeholder={t('instructor_communication_page.announcement_content_placeholder')}
                          rows={6}
                          value={announcementData.content}
                          onChange={(e) => setAnnouncementData({ ...announcementData, content: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="targetCourse">{t('instructor_communication_page.send_to')}</Label>
                        <Select 
                          value={announcementData.targetCourse} 
                          onValueChange={(value) => setAnnouncementData({ ...announcementData, targetCourse: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('instructor_communication_page.all_students')}</SelectItem>
                            {instructorCourses.map((course) => (
                              <SelectItem key={course.id} value={String(course.id)}>
                                {course.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                        <div className="flex gap-2">
                          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="mb-1">
                              <strong>{t('instructor_communication_page.note_label')}</strong>
                            </p>
                            <ul className="text-xs space-y-0.5 text-muted-foreground">
                              <li>• {t('instructor_communication_page.note_educational_limit')}</li>
                              <li>• {t('instructor_communication_page.note_promotional_limit')}</li>
                              <li>• {t('instructor_communication_page.note_opt_out')}</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>
                        {t('instructor_communication_page.cancel')}
                      </Button>
                      <Button onClick={handleSendAnnouncement} disabled={announcementSubmitting}>
                        <Send className="w-4 h-4 mr-2" />
                        {t('instructor_communication_page.send_announcement')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showEditAnnouncementDialog} onOpenChange={handleEditDialogChange}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{t('instructor_communication_page.edit_announcement_title')}</DialogTitle>
                      <DialogDescription>
                        {t('instructor_communication_page.edit_announcement_description')}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-title">{t('instructor_communication_page.title_label')}</Label>
                        <Input
                          id="edit-title"
                          value={editAnnouncementData.title}
                          onChange={(e) => setEditAnnouncementData({ ...editAnnouncementData, title: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="edit-content">{t('instructor_communication_page.content_label')}</Label>
                        <Textarea
                          id="edit-content"
                          rows={6}
                          value={editAnnouncementData.content}
                          onChange={(e) => setEditAnnouncementData({ ...editAnnouncementData, content: e.target.value })}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => handleEditDialogChange(false)}>
                        {t('instructor_communication_page.cancel')}
                      </Button>
                      <Button onClick={handleUpdateAnnouncement} disabled={announcementUpdating}>
                        <Edit className="w-4 h-4 mr-2" />
                        {t('instructor_communication_page.save_changes')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Monthly limit indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">{t('instructor_communication_page.educational_this_month')}</span>
                      <Badge variant="secondary">
                        {announcementLimits.educational.used}/{announcementLimits.educational.limit}
                      </Badge>
                    </div>
                    <Progress
                      value={(announcementLimits.educational.used / announcementLimits.educational.limit) * 100}
                      className="h-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">{t('instructor_communication_page.promotional_this_month')}</span>
                      <Badge variant="secondary">
                        {announcementLimits.promotional.used}/{announcementLimits.promotional.limit}
                      </Badge>
                    </div>
                    <Progress
                      value={(announcementLimits.promotional.used / announcementLimits.promotional.limit) * 100}
                      className="h-2"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Announcements list */}
              <div className="space-y-4">
                {paginatedAnnouncements.map((announcement) => (
                  <Card key={announcement.notification_code}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={announcement.type === 'educational' ? 'default' : 'secondary'}>
                              {announcement.type === 'educational'
                                ? t('instructor_communication_page.educational')
                                : t('instructor_communication_page.promotional')}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{formatRelativeTime(announcement.sent_at)}</span>
                          </div>
                          <h3 className="text-base mb-2">{announcement.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {announcement.content}
                          </p>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{t('instructor_communication_page.recipient_count', { count: announcement.recipientCount.toLocaleString() })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              <span>{t('instructor_communication_page.open_rate', { rate: announcement.openRate })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEditAnnouncement(announcement)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleRevokeAnnouncement(announcement)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredAnnouncements.length > 0 && (
                  <UserPagination
                    currentPage={announcementPage}
                    totalPages={announcementTotalPages}
                    onPageChange={setAnnouncementPage}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedQuestion} onOpenChange={(open) => {
        if (!open) {
          setSelectedQuestion(null)
          setQuestionAnswers([])
          setQuestionReplyText('')
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('instructor_communication_page.answer_student_question')}</DialogTitle>
            <DialogDescription>
              {selectedQuestion?.course} {selectedQuestion?.lesson ? `• ${selectedQuestion.lesson}` : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedQuestion && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">{selectedQuestion.question}</p>
                {selectedQuestion.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{selectedQuestion.description}</p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  {selectedQuestion.student.name} • {selectedQuestion.timestamp}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">{t('instructor_communication_page.existing_answers')}</p>
                {questionAnswersLoading && (
                  <p className="text-sm text-muted-foreground">{t('instructor_communication_page.loading_answers')}</p>
                )}
                {!questionAnswersLoading && questionAnswers.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('instructor_communication_page.no_answers')}</p>
                )}
                {!questionAnswersLoading && questionAnswers.map((answer) => (
                  <div key={answer.id} className="rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{answer.user_name || t('instructor_communication_page.instructor_fallback')}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(answer.created_at)}</p>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{answer.answer}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="qna-reply">{t('instructor_communication_page.reply')}</Label>
                <Textarea
                  id="qna-reply"
                  rows={5}
                  value={questionReplyText}
                  onChange={(e) => setQuestionReplyText(e.target.value)}
                  placeholder={t('instructor_communication_page.reply_placeholder')}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedQuestion(null)}>
                  {t('instructor_communication_page.close')}
                </Button>
                <Button onClick={() => void handleSubmitQuestionReply()} disabled={questionReplySubmitting}>
                  <Send className="w-4 h-4 mr-2" />
                  {questionReplySubmitting ? t('instructor_communication_page.sending') : t('instructor_communication_page.send_reply')}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
