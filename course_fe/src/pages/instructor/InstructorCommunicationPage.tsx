import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  Button as AntButton,
  Form as AntForm,
  Input as AntInput,
  Radio as AntRadio,
  Select as AntSelect,
} from 'antd'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../../components/ui/dialog"
import { Progress } from "../../components/ui/progress"
import { UserPagination } from "../../components/UserPagination"
import {
  Send,
  Trash2,
  Edit,
  Users,
  TrendingUp,
  Info,
  PlusCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { getCourses, type CourseListItem } from '../../services/course.api'
import { getMyInstructorProfile } from '../../services/instructor.api'
import {
  createInstructorAnnouncement,
  getInstructorAnnouncements,
  revokeInstructorAnnouncement,
  updateInstructorAnnouncement,
  type InstructorAnnouncement,
} from '../../services/notification.api'
import { formatRelativeTime } from '../../utils/formatters'

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
      setAnnouncementSubmitting(true)
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
      toast.success(t('instructor_communication_page.announcement_sent'))
      setShowAnnouncementDialog(false)
      setAnnouncementData({
        type: 'educational',
        title: '',
        content: '',
        targetCourse: 'all'
      })
    } catch (err: any) {
      toast.error(err?.message || t('instructor_communication_page.send_announcement_failed'))
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

  return (
    <motion.div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl" variants={sectionStagger} initial="hidden" animate="show">

      <motion.div className="mb-6 md:mb-8" variants={fadeInUp}>
        <h1 className="mb-2">{t('instructor_communication_page.title')}</h1>
        <p className="text-muted-foreground">
          {t('instructor_communication_page.description')}
        </p>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <div className="space-y-4">
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

                    <AntForm layout="vertical" onFinish={handleSendAnnouncement} className="mt-1">
                      <AntForm.Item
                        label={t('instructor_communication_page.announcement_type')}
                        required
                      >
                        <AntRadio.Group
                          value={announcementData.type}
                          onChange={(event) => setAnnouncementData({ ...announcementData, type: event.target.value })}
                          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2"
                        >
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                              announcementData.type === 'educational' ? 'border-primary' : 'border-border'
                            }`}
                          >
                            <AntRadio value="educational" />
                            <span className="min-w-0">
                              <span className="block font-medium">
                                {t('instructor_communication_page.educational')}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {t('instructor_communication_page.educational_description')}
                              </span>
                            </span>
                          </label>

                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                              announcementData.type === 'promotional' ? 'border-primary' : 'border-border'
                            }`}
                          >
                            <AntRadio value="promotional" />
                            <span className="min-w-0">
                              <span className="block font-medium">
                                {t('instructor_communication_page.promotional')}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {t('instructor_communication_page.promotional_description')}
                              </span>
                            </span>
                          </label>
                        </AntRadio.Group>
                      </AntForm.Item>

                      <AntForm.Item
                        label={t('instructor_communication_page.title_label')}
                        required
                      >
                        <AntInput
                          placeholder={t('instructor_communication_page.announcement_title_placeholder')}
                          value={announcementData.title}
                          onChange={(event) => setAnnouncementData({ ...announcementData, title: event.target.value })}
                        />
                      </AntForm.Item>

                      <AntForm.Item
                        label={t('instructor_communication_page.content_label')}
                        required
                      >
                        <AntInput.TextArea
                          placeholder={t('instructor_communication_page.announcement_content_placeholder')}
                          rows={4}
                          value={announcementData.content}
                          onChange={(event) => setAnnouncementData({ ...announcementData, content: event.target.value })}
                        />
                      </AntForm.Item>

                      <AntForm.Item label={t('instructor_communication_page.send_to')}>
                        <AntSelect
                          value={announcementData.targetCourse}
                          onChange={(value) => setAnnouncementData({ ...announcementData, targetCourse: value })}
                          getPopupContainer={(triggerNode) => triggerNode.parentElement ?? document.body}
                          options={[
                            {
                              value: 'all',
                              label: t('instructor_communication_page.all_students'),
                            },
                            ...instructorCourses.map((course) => ({
                              value: String(course.id),
                              label: course.title,
                            })),
                          ]}
                        />
                      </AntForm.Item>

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
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <AntButton onClick={() => setShowAnnouncementDialog(false)}>
                          {t('instructor_communication_page.cancel')}
                        </AntButton>
                        <AntButton
                          type="primary"
                          htmlType="submit"
                          loading={announcementSubmitting}
                          icon={<Send className="h-4 w-4" />}
                        >
                          {t('instructor_communication_page.send_announcement')}
                        </AntButton>
                      </div>
                    </AntForm>
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
        </div>
      </motion.div>

    </motion.div>
  )
}
