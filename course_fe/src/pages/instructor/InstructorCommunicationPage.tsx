import { useState, useEffect } from 'react'
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
import { toast } from 'sonner@2.0.3'
import { useAuth } from '../../contexts/AuthContext'
import { getAllQnAs, type QnA } from '../../services/qna.api'
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

// Mock data for Direct Messages
const mockConversations = [
  {
    id: 1,
    student: {
      name: "Alex Thompson",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face",
      initials: "AT"
    },
    lastMessage: "Thanks for the detailed explanation!",
    timestamp: "10 minutes ago",
    unread: 2,
    online: true
  },
  {
    id: 2,
    student: {
      name: "Jessica Lee",
      avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=40&h=40&fit=crop&crop=face",
      initials: "JL"
    },
    lastMessage: "Can you review my project?",
    timestamp: "1 hour ago",
    unread: 0,
    online: false
  },
  {
    id: 3,
    student: {
      name: "David Park",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40&h=40&fit=crop&crop=face",
      initials: "DP"
    },
    lastMessage: "I have a question about deployment",
    timestamp: "3 hours ago",
    unread: 1,
    online: true
  }
]

// Mock messages for selected conversation
const mockMessages = [
  {
    id: 1,
    sender: "student" as const,
    content: "Hi! I'm having trouble with the deployment section.",
    timestamp: "2:30 PM",
    attachments: [] as string[]
  },
  {
    id: 2,
    sender: "instructor" as const,
    content: "Hi there! What specific issue are you facing?",
    timestamp: "2:32 PM",
    attachments: [] as string[]
  },
  {
    id: 3,
    sender: "student" as const,
    content: "My app works locally but throws errors on Vercel",
    timestamp: "2:35 PM",
    attachments: ["error-log.txt"]
  },
  {
    id: 4,
    sender: "instructor" as const,
    content: "Could you share the error message you're seeing?",
    timestamp: "2:40 PM",
    attachments: [] as string[]
  }
]

// Mock announcements
const mockAnnouncements = [
  {
    id: 1,
    type: "educational" as const,
    title: "New Section Added: Advanced Hooks",
    content: "I've just added a new section covering advanced React hooks including useReducer, useContext, and custom hooks!",
    targetCourses: ["React Advanced Patterns"],
    sentAt: "2 days ago",
    recipientCount: 1250,
    openRate: 68
  },
  {
    id: 2,
    type: "promotional" as const,
    title: "30% Off My New TypeScript Course",
    content: "For a limited time, get 30% off my brand new TypeScript course. Use code EARLY30",
    targetCourses: ["All students"],
    sentAt: "1 week ago",
    recipientCount: 5420,
    openRate: 42
  }
]

export function InstructorCommunicationPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('qna')
  const [qnaFilter, setQnaFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1)
  const [messageInput, setMessageInput] = useState('')
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false)
  const [announcementData, setAnnouncementData] = useState({
    type: 'educational',
    title: '',
    content: '',
    targetCourse: 'all'
  })
  const [questions, setQuestions] = useState<ReturnType<typeof qnaToQuestion>[]>([])

  // Fetch Q&A from API
  useEffect(() => {
    let cancelled = false
    async function fetchQnA() {
      try {
        const allQnAs = await getAllQnAs()
        if (cancelled) return
        setQuestions(allQnAs.map(qnaToQuestion))
      } catch (err) {
        console.error('Failed to load Q&A:', err)
      }
    }
    fetchQnA()
    return () => { cancelled = true }
  }, [])

  // Filter questions based on selected filter
  const filteredQuestions = questions.filter(q => {
    if (qnaFilter === 'unanswered') return q.status === 'unanswered'
    if (qnaFilter === 'answered') return q.status === 'answered' || q.status === 'resolved'
    if (qnaFilter === 'flagged') return q.flagged
    return true
  })

  // Get selected conversation messages
  const currentMessages = selectedConversation ? mockMessages : []
  const currentConversation = mockConversations.find(c => c.id === selectedConversation)

  // Send message
  const handleSendMessage = () => {
    if (!messageInput.trim()) return
    
    toast.success('Tin nhắn đã được gửi!')
    setMessageInput('')
  }

  // Send announcement
  const handleSendAnnouncement = () => {
    if (!announcementData.title.trim() || !announcementData.content.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }

    // Check monthly limits
    const thisMonthEducational = mockAnnouncements.filter(a => a.type === 'educational').length
    const thisMonthPromotional = mockAnnouncements.filter(a => a.type === 'promotional').length

    if (announcementData.type === 'educational' && thisMonthEducational >= 4) {
      toast.error('Bạn đã đạt giới hạn 4 thông báo giáo dục/tháng')
      return
    }

    if (announcementData.type === 'promotional' && thisMonthPromotional >= 2) {
      toast.error('Bạn đã đạt giới hạn 2 thông báo khuyến mãi/tháng')
      return
    }

    toast.success('Thông báo đã được gửi thành công!')
    setShowAnnouncementDialog(false)
    setAnnouncementData({
      type: 'educational',
      title: '',
      content: '',
      targetCourse: 'all'
    })
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="mb-2">Giao tiếp & Hỗ trợ học viên</h1>
        <p className="text-muted-foreground">
          Quản lý câu hỏi, tin nhắn và thông báo của học viên
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Câu hỏi chưa trả lời</p>
                <p className="text-2xl mt-1">12</p>
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
                <p className="text-sm text-muted-foreground">Tin nhắn mới</p>
                <p className="text-2xl mt-1">8</p>
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
                <p className="text-sm text-muted-foreground">Tỷ lệ phản hồi</p>
                <p className="text-2xl mt-1">94%</p>
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
                <p className="text-sm text-muted-foreground">Đánh giá trung bình</p>
                <p className="text-2xl mt-1">4.8</p>
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
            Hỏi đáp (Q&A)
            <Badge variant="destructive" className="ml-2">12</Badge>
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <Mail className="w-4 h-4" />
            Tin nhắn
            <Badge variant="default" className="ml-2">8</Badge>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="w-4 h-4" />
            Thông báo
          </TabsTrigger>
        </TabsList>

        {/* Q&A Tab */}
        <TabsContent value="qna" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Câu hỏi từ học viên</CardTitle>
                  <CardDescription>
                    Trả lời câu hỏi của học viên để tăng sự hài lòng và đánh giá khóa học
                  </CardDescription>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm câu hỏi..."
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
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="unanswered">Chưa trả lời</SelectItem>
                      <SelectItem value="answered">Đã trả lời</SelectItem>
                      <SelectItem value="flagged">Được đánh dấu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredQuestions.map((question) => (
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
                                <Badge variant="destructive">Chưa trả lời</Badge>
                              )}
                              {question.status === 'answered' && (
                                <Badge variant="secondary">Đã trả lời</Badge>
                              )}
                              {question.status === 'resolved' && (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Đã giải quyết
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3">
                            <Button size="sm" variant="default">
                              <Reply className="w-4 h-4 mr-2" />
                              Trả lời ({question.answers})
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Flag className="w-4 h-4 mr-2" />
                              Đánh dấu
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredQuestions.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Không có câu hỏi nào</p>
                  </div>
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
                        placeholder="Tìm kiếm học viên..."
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <ScrollArea className="h-[540px]">
                    {mockConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedConversation === conv.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedConversation(conv.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar>
                              <AvatarImage src={conv.student.avatar} />
                              <AvatarFallback>{conv.student.initials}</AvatarFallback>
                            </Avatar>
                            {conv.online && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm truncate">{conv.student.name}</p>
                              <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessage}
                            </p>
                          </div>

                          {conv.unread > 0 && (
                            <Badge variant="default" className="ml-2">
                              {conv.unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                {/* Chat area */}
                <div className="md:col-span-2 flex flex-col">
                  {selectedConversation ? (
                    <>
                      {/* Chat header */}
                      <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={currentConversation?.student.avatar} />
                              <AvatarFallback>{currentConversation?.student.initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{currentConversation?.student.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {currentConversation?.online ? 'Đang online' : 'Offline'}
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
                                <p className="text-sm">{msg.content}</p>
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
                        </div>
                      </ScrollArea>

                      {/* Message input */}
                      <div className="p-4 border-t">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          <Input
                            placeholder="Nhập tin nhắn..."
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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
                        <p className="text-muted-foreground">Chọn một cuộc trò chuyện để bắt đầu</p>
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
                  <CardTitle>Thông báo</CardTitle>
                  <CardDescription>
                    Gửi thông báo đến học viên của bạn về nội dung mới hoặc khuyến mãi
                  </CardDescription>
                </div>

                <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Tạo thông báo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Tạo thông báo mới</DialogTitle>
                      <DialogDescription>
                        Gửi thông báo đến học viên của bạn. Lưu ý giới hạn: 4 thông báo giáo dục/tháng, 2 thông báo khuyến mãi/tháng.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label>Loại thông báo</Label>
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
                                  Giáo dục
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Nội dung mới, cập nhật khóa học (4/tháng)
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
                                  Khuyến mãi
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Giảm giá, ưu đãi đặc biệt (2/tháng)
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </RadioGroup>
                      </div>

                      <div>
                        <Label htmlFor="title">Tiêu đề</Label>
                        <Input
                          id="title"
                          placeholder="VD: New Section Added: Advanced React Patterns"
                          value={announcementData.title}
                          onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="content">Nội dung</Label>
                        <Textarea
                          id="content"
                          placeholder="Viết nội dung thông báo của bạn..."
                          rows={6}
                          value={announcementData.content}
                          onChange={(e) => setAnnouncementData({ ...announcementData, content: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="targetCourse">Gửi đến</Label>
                        <Select 
                          value={announcementData.targetCourse} 
                          onValueChange={(value) => setAnnouncementData({ ...announcementData, targetCourse: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả học viên</SelectItem>
                            <SelectItem value="react-course">React Advanced Patterns</SelectItem>
                            <SelectItem value="typescript-course">TypeScript Masterclass</SelectItem>
                            <SelectItem value="nodejs-course">Node.js Complete Guide</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                        <div className="flex gap-2">
                          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="mb-1">
                              <strong>Lưu ý:</strong>
                            </p>
                            <ul className="text-xs space-y-0.5 text-muted-foreground">
                              <li>• Thông báo giáo dục: Tối đa 4 lần/tháng</li>
                              <li>• Thông báo khuyến mãi: Tối đa 2 lần/tháng</li>
                              <li>• Học viên có thể hủy đăng ký nhận thông báo</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>
                        Hủy
                      </Button>
                      <Button onClick={handleSendAnnouncement}>
                        <Send className="w-4 h-4 mr-2" />
                        Gửi thông báo
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
                      <span className="text-sm">Thông báo giáo dục tháng này</span>
                      <Badge variant="secondary">2/4</Badge>
                    </div>
                    <Progress value={50} className="h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Thông báo khuyến mãi tháng này</span>
                      <Badge variant="secondary">1/2</Badge>
                    </div>
                    <Progress value={50} className="h-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Announcements list */}
              <div className="space-y-4">
                {mockAnnouncements.map((announcement) => (
                  <Card key={announcement.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={announcement.type === 'educational' ? 'default' : 'secondary'}>
                              {announcement.type === 'educational' ? 'Giáo dục' : 'Khuyến mãi'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{announcement.sentAt}</span>
                          </div>
                          <h3 className="text-base mb-2">{announcement.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {announcement.content}
                          </p>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{announcement.recipientCount.toLocaleString()} người nhận</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              <span>{announcement.openRate}% đã đọc</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
