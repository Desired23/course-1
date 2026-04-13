import { useState, useEffect } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion"
import { HelpCircle, MessageCircle, Phone, Mail, Search, Send, Clock, CheckCircle, ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import {
  getSupportTickets,
  createSupportTicket,
  getSupportReplies,
  createSupportReply,
  type SupportTicket,
  type SupportReply,
} from '../../services/support.api'
import { UserPagination } from "../../components/UserPagination"

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function SupportPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [selectedTab, setSelectedTab] = useState("help")
  const [searchQuery, setSearchQuery] = useState("")
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [ticketSearch, setTicketSearch] = useState("")
  const [ticketStatus, setTicketStatus] = useState<"all" | "open" | "in_progress" | "resolved">("all")
  const [ticketPriority, setTicketPriority] = useState<"all" | "low" | "medium" | "high" | "urgent">("all")
  const [ticketPage, setTicketPage] = useState(1)
  const [ticketPageSize, setTicketPageSize] = useState(5)
  const [ticketTotalPages, setTicketTotalPages] = useState(1)
  const [ticketTotalCount, setTicketTotalCount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [ticketReplies, setTicketReplies] = useState<Record<number, SupportReply[]>>({})
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({})
  const [replySubmittingId, setReplySubmittingId] = useState<number | null>(null)
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: '',
    description: ''
  })

  const fetchTickets = async () => {
    try {
      const data = await getSupportTickets({
        user_id: user?.id ? Number(user.id) : undefined,
        page: ticketPage,
        page_size: ticketPageSize,
        status: ticketStatus !== 'all' ? ticketStatus : undefined,
        priority: ticketPriority !== 'all' ? ticketPriority : undefined,
        search: ticketSearch || undefined,
        sort_by: 'newest',
      })
      setTickets(data.results || [])
      setTicketTotalPages(data.total_pages || 1)
      setTicketTotalCount(data.count || 0)
    } catch {

      setTickets([])
      setTicketTotalPages(1)
      setTicketTotalCount(0)
    }
  }

  useEffect(() => { fetchTickets() }, [user?.id, ticketPage, ticketPageSize, ticketSearch, ticketStatus, ticketPriority])

  const faqData = [
    {
      question: t('support.faq_q1', "How do I enroll in a course?"),
      answer: t('support.faq_a1', "To enroll in a course, simply browse our course catalog, click on the course you're interested in, and click the 'Enroll Now' button. You'll need to create an account if you don't have one already.")
    },
    {
      question: t('support.faq_q2', "Can I get a refund for a course?"),
      answer: t('support.faq_a2', "Yes, we offer a 30-day money-back guarantee for most courses. If you're not satisfied with your purchase, you can request a refund within 30 days of purchase.")
    },
    {
      question: t('support.faq_q3', "How long do I have access to a course?"),
      answer: t('support.faq_a3', "Once you enroll in a course, you have lifetime access to all course materials, including videos, assignments, and resources.")
    },
    {
      question: t('support.faq_q4', "Can I download course videos for offline viewing?"),
      answer: t('support.faq_a4', "Yes, our mobile app allows you to download course videos for offline viewing. This feature is available for iOS and Android devices.")
    },
    {
      question: t('support.faq_q5', "How do I contact my instructor?"),
      answer: t('support.faq_a5', "You can contact your instructor through the Q&A section of each course. Instructors typically respond within 24-48 hours.")
    },
    {
      question: t('support.faq_q6', "Do I get a certificate after completing a course?"),
      answer: t('support.faq_a6', "Yes, you'll receive a certificate of completion for each course you finish. You can download and share these certificates on LinkedIn and other platforms.")
    }
  ]

  const filteredTickets = tickets

  useEffect(() => {
    setTicketPage(1)
  }, [ticketSearch, ticketStatus, ticketPriority, ticketPageSize])

  const filteredFAQ = faqData.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketForm.subject || !ticketForm.description) {
      toast.error(t('support.fill_subject_description'))
      return
    }
    setIsSubmitting(true)
    try {
      await createSupportTicket({
        subject: ticketForm.subject,
        message: ticketForm.description,
        priority: (ticketForm.priority || 'medium') as any,
      })
      toast.success(t('support.ticket_submitted'))
      setTicketForm({ subject: '', category: '', priority: '', description: '' })
      setSelectedTab('tickets')
      fetchTickets()
    } catch {
      toast.error(t('support.ticket_submit_failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleTicketThread = async (ticketId: number) => {
    if (selectedTicketId === ticketId) {
      setSelectedTicketId(null)
      return
    }

    setSelectedTicketId(ticketId)
    if (ticketReplies[ticketId]) return

    try {
      const replies = await getSupportReplies(ticketId)
      setTicketReplies(prev => ({ ...prev, [ticketId]: replies }))
    } catch {
      toast.error(t('support.ticket_thread_load_failed', 'Không thể tải hội thoại ticket'))
    }
  }

  const handleSubmitReply = async (ticketId: number) => {
    const draft = (replyDrafts[ticketId] || '').trim()
    if (!draft) {
      toast.error(t('support.reply_required', 'Vui lòng nhập nội dung phản hồi'))
      return
    }
    if (!user?.id) {
      toast.error(t('support.login_required', 'Vui lòng đăng nhập để phản hồi'))
      return
    }

    setReplySubmittingId(ticketId)
    try {
      const created = await createSupportReply({
        support: ticketId,
        user: Number(user.id),
        message: draft,
      })
      setTicketReplies(prev => ({
        ...prev,
        [ticketId]: [...(prev[ticketId] || []), created],
      }))
      setReplyDrafts(prev => ({ ...prev, [ticketId]: '' }))
      toast.success(t('support.reply_sent', 'Đã gửi phản hồi'))
    } catch {
      toast.error(t('support.reply_send_failed', 'Gửi phản hồi thất bại'))
    } finally {
      setReplySubmittingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">{t('support.status_open')}</Badge>
      case 'in_progress':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">{t('support.status_in_progress')}</Badge>
      case 'resolved':
        return <Badge className="bg-green-500 hover:bg-green-600">{t('support.status_resolved')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">{t('support.high')}</Badge>
      case 'medium':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">{t('support.medium')}</Badge>
      case 'low':
        return <Badge variant="secondary">{t('support.low')}</Badge>
      default:
        return <Badge variant="secondary">{priority}</Badge>
    }
  }

  return (
    <motion.div
      className="max-w-7xl mx-auto p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
          <motion.div className="mb-8" variants={fadeInUp} initial="hidden" animate="show">
            <h1 className="mb-2">{t('support.title')}</h1>
            <p className="text-muted-foreground">
              {t('support.subtitle')}
            </p>
          </motion.div>


        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" variants={fadeInUp} initial="hidden" animate="show">
          <Card className="text-center">
            <CardContent className="p-6">
              <MessageCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="mb-2">{t('support.live_chat')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('support.live_chat_desc')}
              </p>
              <Button className="w-full" onClick={() => setSelectedTab('tickets')}>
                {t('support.my_tickets_tab')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Phone className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="mb-2">{t('support.phone_support')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('support.phone_support_desc')}
              </p>
              <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {t('support.phone_support_real_hint', 'Hỗ trợ điện thoại chưa có realtime call. Vui lòng gửi ticket để đội ngũ liên hệ lại.')}
              </div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Mail className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="mb-2">{t('support.email_support')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('support.email_support_desc')}
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSelectedTab('contact')}>
                {t('support.submit_ticket')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={sectionStagger} initial="hidden" animate="show">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="relative grid w-full grid-cols-3 p-1">
            <TabsTrigger value="help" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {selectedTab === 'help' && (
                <motion.span
                  layoutId="support-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t('support.help_center_tab')}</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {selectedTab === 'tickets' && (
                <motion.span
                  layoutId="support-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t('support.my_tickets_tab')}</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {selectedTab === 'contact' && (
                <motion.span
                  layoutId="support-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t('support.contact_us_tab')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="help" className="mt-8">
            <motion.div className="space-y-6" variants={fadeInUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    {t('support.faq_title')}
                  </CardTitle>
                  <CardDescription>
                    {t('support.faq_desc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('support.search_answers')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    {filteredFAQ.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {filteredFAQ.length === 0 && (
                    <div className="text-center py-8">
                      <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="mb-2">{t('support.no_faq_results')}</h3>
                      <p className="text-muted-foreground">
                        {t('support.no_faq_results_desc')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="tickets" className="mt-8">
            <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle>{t('support.tickets_title')}</CardTitle>
                <CardDescription>
                  {t('support.tickets_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Card className="mb-4">
                  <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <Input
                      className="h-9"
                      placeholder={t('support.search_tickets')}
                      value={ticketSearch}
                      onChange={(e) => setTicketSearch(e.target.value)}
                    />
                    <select
                      className="h-9 rounded-md border px-3 text-sm"
                      value={ticketStatus}
                      onChange={(e) => setTicketStatus(e.target.value as "all" | "open" | "in_progress" | "resolved")}
                    >
                      <option value="all">{t('support.all_status')}</option>
                      <option value="open">{t('support.status_open')}</option>
                      <option value="in_progress">{t('support.status_in_progress')}</option>
                      <option value="resolved">{t('support.status_resolved')}</option>
                    </select>
                    <select
                      className="h-9 rounded-md border px-3 text-sm"
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as "all" | "low" | "medium" | "high" | "urgent")}
                    >
                      <option value="all">{t('support.all_priority')}</option>
                      <option value="low">{t('support.low')}</option>
                      <option value="medium">{t('support.medium')}</option>
                      <option value="high">{t('support.high')}</option>
                      <option value="urgent">{t('support.urgent')}</option>
                    </select>
                    <select
                      className="h-9 rounded-md border px-3 text-sm"
                      value={String(ticketPageSize)}
                      onChange={(e) => setTicketPageSize(Number(e.target.value))}
                    >
                      <option value="5">{t('support.page_size', { count: 5 })}</option>
                      <option value="10">{t('support.page_size', { count: 10 })}</option>
                      <option value="20">{t('support.page_size', { count: 20 })}</option>
                    </select>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setTicketSearch("")
                        setTicketStatus("all")
                        setTicketPriority("all")
                      }}
                    >
                      {t('support.clear_filters')}
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {filteredTickets.map((ticket) => (
                    <Card key={ticket.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4>{ticket.subject}</h4>
                            <Badge variant="outline">#{ticket.id}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{t('support.created')}: {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}</span>
                          </div>
                          {ticket.updated_at && (
                            <span>{t('support.updated')}: {new Date(ticket.updated_at).toLocaleDateString()}</span>
                          )}
                        </div>

                        {ticket.message && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{ticket.message}</p>
                        )}

                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleToggleTicketThread(ticket.id)}
                          >
                            {selectedTicketId === ticket.id
                              ? t('support.hide_thread', 'Ẩn hội thoại')
                              : t('support.view_thread', 'Xem hội thoại')}
                          </Button>
                        </div>

                        {selectedTicketId === ticket.id && (
                          <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-4">
                            <div className="space-y-3">
                              <div className="rounded-md bg-background p-3 border">
                                <p className="text-xs text-muted-foreground mb-1">{t('support.original_request', 'Yêu cầu ban đầu')}</p>
                                <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                              </div>
                              {(ticketReplies[ticket.id] || []).map((reply) => (
                                <div key={reply.id} className="rounded-md bg-background p-3 border">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium">
                                      {reply.admin ? t('support.support_team', 'Hỗ trợ viên') : t('support.you', 'Bạn')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(reply.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                  <p className="text-sm mt-2 whitespace-pre-wrap">{reply.message}</p>
                                </div>
                              ))}
                              {(ticketReplies[ticket.id] || []).length === 0 && (
                                <p className="text-sm text-muted-foreground">{t('support.no_replies_yet', 'Chưa có phản hồi nào cho ticket này')}</p>
                              )}
                            </div>

                            {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                              <div className="space-y-2">
                                <Textarea
                                  placeholder={t('support.reply_placeholder', 'Nhập phản hồi thêm cho ticket này')}
                                  value={replyDrafts[ticket.id] || ''}
                                  onChange={(e) => setReplyDrafts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                  className="min-h-[100px]"
                                />
                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => void handleSubmitReply(ticket.id)}
                                    disabled={replySubmittingId === ticket.id}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    {replySubmittingId === ticket.id
                                      ? t('support.submitting', 'Đang gửi...')
                                      : t('support.send_reply', 'Gửi phản hồi')}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {filteredTickets.length === 0 && (
                    <div className="text-center py-8">
                      <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="mb-2">{t('support.no_tickets')}</h3>
                      <p className="text-muted-foreground">
                        {t('support.no_tickets_desc')}
                      </p>
                    </div>
                  )}
                </div>

                {filteredTickets.length > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('support.pagination_summary', { page: ticketPage, totalPages: ticketTotalPages, total: ticketTotalCount })}
                    </p>
                    <UserPagination currentPage={ticketPage} totalPages={ticketTotalPages} onPageChange={setTicketPage} />
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="contact" className="mt-8">
            <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle>{t('support.submit_request')}</CardTitle>
                <CardDescription>
                  {t('support.submit_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitTicket} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label>{t('support.subject')}</label>
                      <Input
                        placeholder={t('support.subject_placeholder')}
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label>{t('support.category')}</label>
                      <Select
                        value={ticketForm.category}
                        onValueChange={(value) => setTicketForm(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('support.select_category')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">{t('support.technical')}</SelectItem>
                          <SelectItem value="billing">{t('support.billing')}</SelectItem>
                          <SelectItem value="course">{t('support.course_content')}</SelectItem>
                          <SelectItem value="account">{t('support.account')}</SelectItem>
                          <SelectItem value="other">{t('support.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label>{t('support.priority')}</label>
                    <Select
                      value={ticketForm.priority}
                      onValueChange={(value) => setTicketForm(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('support.select_priority')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('support.low')}</SelectItem>
                        <SelectItem value="medium">{t('support.medium')}</SelectItem>
                        <SelectItem value="high">{t('support.high')}</SelectItem>
                        <SelectItem value="urgent">{t('support.urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label>{t('support.description')}</label>
                    <Textarea
                      placeholder={t('support.description_placeholder')}
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                      className="min-h-[120px]"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                    <Send className="h-4 w-4" />
                    {isSubmitting ? t('support.submitting') : t('support.submit_ticket')}
                  </Button>
                </form>
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
        </motion.div>
    </motion.div>
  )
}
