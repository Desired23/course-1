import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Mail, Send, Users } from 'lucide-react'
import { toast } from "sonner"
import {
  getSubscribers,
  sendNewsletter,
  type Subscriber,
} from '../../services/newsletter.api'

type Audience = 'subscribers' | 'all_users' | 'instructors' | 'students'

export function AdminNewsletterPage() {
  const { t } = useTranslation()
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [audience, setAudience] = useState<Audience>('subscribers')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const fetchSubscribers = async () => {
      setIsLoading(true)
      try {
        const res = await getSubscribers({ page_size: 200 })
        setSubscribers(res.results ?? [])
        setTotal(res.count ?? 0)
      } catch {
        toast.error(t('admin_newsletter.toasts.load_failed'))
      }
      setIsLoading(false)
    }
    fetchSubscribers()
  }, [])

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error(t('admin_newsletter.fill_required'))
      return
    }
    setIsSending(true)
    try {
      const res = await sendNewsletter({ subject, content, audience })
      toast.success(t('admin_newsletter.toasts.send_success', { count: res.recipient_count }))
      setSubject('')
      setContent('')
    } catch {
      toast.error(t('admin_newsletter.toasts.send_failed'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" /> {t('admin_newsletter.title')}
        </h1>
        <p className="text-muted-foreground">{t('admin_newsletter.subtitle')}</p>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">{t('admin_newsletter.tabs.compose')}</TabsTrigger>
          <TabsTrigger value="subscribers">
            {t('admin_newsletter.tabs.subscribers')} ({total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_newsletter.compose.title')}</CardTitle>
              <CardDescription>{t('admin_newsletter.compose.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('admin_newsletter.compose.audience')}</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscribers">{t('admin_newsletter.compose.audience_subscribers')}</SelectItem>
                    <SelectItem value="all_users">{t('admin_newsletter.compose.audience_all_users')}</SelectItem>
                    <SelectItem value="instructors">{t('admin_newsletter.compose.audience_instructors')}</SelectItem>
                    <SelectItem value="students">{t('admin_newsletter.compose.audience_students')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('admin_newsletter.compose.subject')}</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('admin_newsletter.compose.subject_placeholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin_newsletter.compose.content')}</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('admin_newsletter.compose.content_placeholder')}
                  rows={10}
                />
              </div>
              <p className="text-sm text-muted-foreground">{t('admin_newsletter.compose.async_note')}</p>
              <Button onClick={handleSend} disabled={isSending}>
                <Send className="h-4 w-4 mr-2" />
                {isSending ? t('admin_newsletter.compose.sending') : t('admin_newsletter.compose.send')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> {t('admin_newsletter.subscribers.title')}
              </CardTitle>
              <CardDescription>{t('admin_newsletter.subscribers.count', { count: total })}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">{t('admin_newsletter.subscribers.loading')}</p>
              ) : subscribers.length === 0 ? (
                <p className="text-muted-foreground">{t('admin_newsletter.subscribers.empty')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin_newsletter.subscribers.email')}</TableHead>
                      <TableHead>{t('admin_newsletter.subscribers.status')}</TableHead>
                      <TableHead>{t('admin_newsletter.subscribers.subscribed_at')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map((s) => (
                      <TableRow key={s.subscriber_id}>
                        <TableCell>{s.email}</TableCell>
                        <TableCell>
                          <Badge variant={s.is_active ? 'default' : 'secondary'}>
                            {s.is_active
                              ? t('admin_newsletter.subscribers.active')
                              : t('admin_newsletter.subscribers.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
