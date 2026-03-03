import { useState, useEffect } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion"
import { HelpCircle, MessageCircle, Phone, Mail, Search, Send, Clock, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner@2.0.3'
import {
  getSupportTickets,
  createSupportTicket,
  type SupportTicket,
} from '../../services/support.api'

export function SupportPage() {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState("help")
  const [searchQuery, setSearchQuery] = useState("")
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: '',
    description: ''
  })

  const fetchTickets = async () => {
    try {
      const data = await getSupportTickets()
      setTickets(Array.isArray(data) ? data : (data as any).results || [])
    } catch {
      // Not logged in or no tickets
    }
  }

  useEffect(() => { fetchTickets() }, [])

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

  const supportTickets = tickets

  const filteredFAQ = faqData.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketForm.subject || !ticketForm.description) {
      toast.error('Please fill in subject and description')
      return
    }
    setIsSubmitting(true)
    try {
      await createSupportTicket({
        subject: ticketForm.subject,
        message: ticketForm.description,
        priority: (ticketForm.priority || 'medium') as any,
      })
      toast.success('Support ticket submitted successfully!')
      setTicketForm({ subject: '', category: '', priority: '', description: '' })
      setSelectedTab('tickets')
      fetchTickets()
    } catch {
      toast.error('Failed to submit ticket. Please try again.')
    } finally {
      setIsSubmitting(false)
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
    <div className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="mb-8">
            <h1 className="mb-2">{t('support.title')}</h1>
            <p className="text-muted-foreground">
              {t('support.subtitle')}
            </p>
          </div>

        {/* Quick Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="p-6">
              <MessageCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="mb-2">{t('support.live_chat')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('support.live_chat_desc')}
              </p>
              <Button className="w-full">{t('support.start_chat')}</Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Phone className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="mb-2">{t('support.phone_support')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('support.phone_support_desc')}
              </p>
              <Button variant="outline" className="w-full">{t('support.call_now')}</Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Mail className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="mb-2">{t('support.email_support')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('support.email_support_desc')}
              </p>
              <Button variant="outline" className="w-full">{t('support.send_email')}</Button>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="help">{t('support.help_center_tab')}</TabsTrigger>
            <TabsTrigger value="tickets">{t('support.my_tickets_tab')}</TabsTrigger>
            <TabsTrigger value="contact">{t('support.contact_us_tab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="help" className="mt-8">
            <div className="space-y-6">
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
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>{t('support.tickets_title')}</CardTitle>
                <CardDescription>
                  {t('support.tickets_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportTickets.map((ticket) => (
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
                      </CardContent>
                    </Card>
                  ))}

                  {supportTickets.length === 0 && (
                    <div className="text-center py-8">
                      <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="mb-2">{t('support.no_tickets')}</h3>
                      <p className="text-muted-foreground">
                        {t('support.no_tickets_desc')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="mt-8">
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
                    {isSubmitting ? t('support.submitting', 'Submitting...') : t('support.submit_ticket')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  )
}