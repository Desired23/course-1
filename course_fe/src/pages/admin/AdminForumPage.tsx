import { useState, useEffect } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../../components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert"
import { Checkbox } from "../../components/ui/checkbox"
import { AdminBulkActionBar } from '../../components/admin/AdminBulkActionBar'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { Plus, Edit, Trash2, Eye, MessageSquare, Users, AlertTriangle, CheckCircle, Lock, Unlock, FileText, Shield, UserX, ExternalLink } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { toast } from "sonner"
import { QuickTopicPreview } from "../../components/QuickTopicPreview"
import { getAllForums, createForum, deleteForum, getAllForumTopics, createForumTopic, updateForumTopic, deleteForumTopic, moderateForumTopic } from '../../services/forum.api'
import type { Forum, ForumTopic as ApiForumTopic } from '../../services/forum.api'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/auth.store'

interface ForumTopic {
  id: string
  title: string
  category: string
  author: string
  replies: number
  views: number
  lastActivity: string
  status: 'active' | 'locked' | 'pinned' | 'reported'
  createdAt: string
  content?: string
  excerpt?: string
  reportCount: number
  lastReportReason?: string
}

interface ForumCategory {
  id: string
  name: string
  description: string
  topicsCount: number
  order: number
}



export function AdminForumPage() {
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const currentUserId = useAuthStore(state => state.user?.id)
  const [activeTab, setActiveTab] = useState('topics')
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [categories, setCategories] = useState<ForumCategory[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [forumsData, topicsData] = await Promise.all([
          getAllForums(),
          getAllForumTopics()
        ])
        setCategories(forumsData.map((f: Forum, i: number) => ({
          id: String(f.id),
          name: f.title,
          description: f.description || '',
          topicsCount: f.topic_count || 0,
          order: i + 1
        })))
        setTopics(topicsData.map((t: ApiForumTopic) => {
          const forum = forumsData.find(f => f.id === t.forum)
          return {
            id: String(t.id),
            title: t.title,
            category: forum?.title || '',
            author: t.user_name || '',
            replies: t.replies_count,
            views: t.views,
            lastActivity: t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '',
            status: (t.report_count > 0 ? 'reported' : t.is_pinned ? 'pinned' : t.status === 'locked' ? 'locked' : 'active') as ForumTopic['status'],
            createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString() : '',
            content: t.content,
            excerpt: t.content ? t.content.substring(0, 100) + '...' : '',
            reportCount: t.report_count || 0,
            lastReportReason: t.last_report_reason || undefined,
          }
        }))
      } catch {
        toast.error(t('forum.admin.load_failed'))
      }
    }
    fetchData()
  }, [])
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false)
  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false)
  const [isModerationDialogOpen, setIsModerationDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedTopicForModeration, setSelectedTopicForModeration] = useState<ForumTopic | null>(null)
  const [selectedTopicForPreview, setSelectedTopicForPreview] = useState<ForumTopic | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | ForumTopic['status']>('all')
  const [selectedReportedTopicIds, setSelectedReportedTopicIds] = useState<string[]>([])
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
    loading: boolean
    action: null | (() => Promise<void>)
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: '',
    destructive: false,
    loading: false,
    action: null,
  })

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    order: 1
  })

  const [topicForm, setTopicForm] = useState({
    title: '',
    category: '',
    content: '',
    author: 'Admin'
  })

  const [moderationAction, setModerationAction] = useState({
    action: '',
    reason: '',
    duration: ''
  })

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         topic.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         topic.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || topic.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const reportedTopics = topics.filter(t => t.status === 'reported')
  const totalTopics = topics.length
  const totalReplies = topics.reduce((sum, t) => sum + t.replies, 0)
  const totalViews = topics.reduce((sum, t) => sum + t.views, 0)

  const getStatusColor = (status: ForumTopic['status']) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'locked':
        return 'secondary'
      case 'pinned':
        return 'outline'
      case 'reported':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getStatusIcon = (status: ForumTopic['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />
      case 'locked':
        return <Lock className="h-4 w-4" />
      case 'pinned':
        return <CheckCircle className="h-4 w-4" />
      case 'reported':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: ForumTopic['status']) => {
    switch (status) {
      case 'active':
        return t('forum.active_status')
      case 'locked':
        return t('forum.locked_status')
      case 'pinned':
        return t('forum.pinned_label')
      case 'reported':
        return t('forum.admin.reported_label')
      default:
        return status
    }
  }

  const handleLockTopic = async (topicId: string) => {
    const topic = topics.find(t => t.id === topicId)
    if (!topic) return
    const newStatus = topic.status === 'locked' ? 'active' : 'locked'
    try {
      await updateForumTopic(Number(topicId), { status: newStatus })
      setTopics(topics.map(t => t.id === topicId ? { ...t, status: newStatus === 'locked' ? 'locked' : 'active' } : t))
      toast.success(t('forum.admin.topic_status_updated'))
    } catch { toast.error(t('forum.admin.action_failed')) }
  }

  const handlePinTopic = async (topicId: string) => {
    const topic = topics.find(t => t.id === topicId)
    if (!topic) return
    try {
      await updateForumTopic(Number(topicId), { is_pinned: topic.status !== 'pinned' })
      setTopics(topics.map(t => t.id === topicId ? { ...t, status: t.status === 'pinned' ? 'active' : 'pinned' } : t))
      toast.success(t('forum.admin.topic_status_updated'))
    } catch { toast.error(t('forum.admin.action_failed')) }
  }

  const handleDeleteTopic = async (topicId: string) => {
    try {
      await deleteForumTopic(Number(topicId))
      setTopics(topics.filter(t => t.id !== topicId))
      toast.success(t('forum.admin.topic_deleted'))
    } catch { toast.error(t('forum.admin.delete_failed')) }
  }

  const handleCreateCategory = async () => {
    if (!categoryForm.name) {
      toast.error(t('forum.admin.category_name_required'))
      return
    }
    try {
      if (!currentUserId) {
        toast.error(t('forum.admin.current_admin_missing'))
        return
      }
      const created = await createForum({
        title: categoryForm.name,
        description: categoryForm.description,
        user_id: Number(currentUserId),
      })
      setCategories(prev => [...prev, {
        id: String(created.id),
        name: created.title,
        description: created.description || '',
        topicsCount: 0,
        order: prev.length + 1
      }])
      setIsCreateCategoryOpen(false)
      setCategoryForm({ name: '', description: '', order: 1 })
      toast.success(t('forum.admin.category_created'))
    } catch { toast.error(t('forum.admin.category_create_failed')) }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    if (category && category.topicsCount > 0) {
      toast.error(t('forum.admin.category_delete_blocked'))
      return
    }
    try {
      await deleteForum(Number(categoryId))
      setCategories(categories.filter(c => c.id !== categoryId))
      toast.success(t('forum.admin.category_deleted'))
    } catch { toast.error(t('forum.admin.delete_failed')) }
  }

  const handleCreateTopic = async () => {
    if (!topicForm.title || !topicForm.category || !topicForm.content) {
      toast.error(t('forum.admin.fill_required_fields'))
      return
    }
    if (!currentUserId) {
      toast.error(t('forum.admin.current_admin_missing'))
      return
    }
    try {
      const forumId = Number(topicForm.category)
      const created = await createForumTopic({
        forum: forumId,
        title: topicForm.title,
        content: topicForm.content,
        user: Number(currentUserId),
      })
      const forum = categories.find(c => c.id === topicForm.category)
      setTopics(prev => [{
        id: String(created.id),
        title: created.title,
        category: forum?.name || '',
        author: created.user_name || 'Admin',
        replies: 0,
        views: 0,
        lastActivity: t('forum.admin.just_now'),
        status: 'active',
        createdAt: new Date().toLocaleDateString(),
        reportCount: 0,
      }, ...prev])
      setIsCreateTopicOpen(false)
      setTopicForm({ title: '', category: '', content: '', author: 'Admin' })
      toast.success(t('forum.admin.topic_created'))
    } catch { toast.error(t('forum.admin.topic_create_failed')) }
  }

  const openModerationDialog = (topic: ForumTopic) => {
    setSelectedTopicForModeration(topic)
    setIsModerationDialogOpen(true)
  }

  const openPreviewDialog = (topic: ForumTopic) => {
    setSelectedTopicForPreview(topic)
    setIsPreviewOpen(true)
  }

  const handleModeration = async () => {
    if (!selectedTopicForModeration || !moderationAction.action) {
      toast.error(t('forum.admin.select_action'))
      return
    }
    const action = moderationAction.action
    const topicId = Number(selectedTopicForModeration.id)
    try {
      if (action === 'approve') {
        await moderateForumTopic(topicId, { action: 'approve', reason: moderationAction.reason })
        setTopics(topics.map(t => t.id === selectedTopicForModeration.id ? { ...t, status: 'active' as const, reportCount: 0 } : t))
        toast.success(t('forum.admin.topic_approved'))
      } else if (action === 'delete') {
        await moderateForumTopic(topicId, { action: 'delete', reason: moderationAction.reason })
        setTopics(topics.filter(t => t.id !== selectedTopicForModeration.id))
        toast.success(t('forum.admin.topic_deleted'))
      } else if (action === 'lock') {
        await moderateForumTopic(topicId, { action: 'lock', reason: moderationAction.reason })
        setTopics(topics.map(t => t.id === selectedTopicForModeration.id ? { ...t, status: 'locked' as const, reportCount: 0 } : t))
        toast.success(t('forum.admin.topic_locked'))
      }
    } catch { toast.error(t('forum.admin.action_failed')) }

    setIsModerationDialogOpen(false)
    setSelectedTopicForModeration(null)
    setModerationAction({ action: '', reason: '', duration: '' })
  }

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void>,
    destructive = false
  ) => {
    setConfirmState({
      open: true,
      title,
      description,
      confirmLabel,
      destructive,
      loading: false,
      action,
    })
  }

  const runConfirmedAction = async () => {
    if (!confirmState.action) return
    try {
      setConfirmState(prev => ({ ...prev, loading: true }))
      await confirmState.action()
      setConfirmState({
        open: false,
        title: '',
        description: '',
        confirmLabel: '',
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState(prev => ({ ...prev, loading: false }))
    }
  }

  const dismissReportedTopic = async (topicId: string) => {
    await moderateForumTopic(Number(topicId), { action: 'dismiss' })
    setTopics(prev => prev.map(item => item.id === topicId ? { ...item, status: 'active', reportCount: 0 } : item))
  }

  const toggleReportedSelection = (topicId: string, checked: boolean) => {
    setSelectedReportedTopicIds(prev => checked ? [...prev, topicId] : prev.filter(id => id !== topicId))
  }

  const toggleAllReported = (checked: boolean) => {
    setSelectedReportedTopicIds(checked ? reportedTopics.map(topic => topic.id) : [])
  }

  const bulkReportedAction = async (
    ids: string[],
    action: (topicId: string) => Promise<void>,
    successMessage: string
  ) => {
    try {
      for (const id of ids) {
        await action(id)
      }
      setSelectedReportedTopicIds([])
      toast.success(successMessage)
    } catch {
      toast.error(t('forum.admin.action_failed'))
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('forum.admin.title')}</h1>
          <p className="text-muted-foreground">{t('forum.admin.subtitle')}</p>
        </div>
        <Dialog open={isCreateTopicOpen} onOpenChange={setIsCreateTopicOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('forum.admin.create_topic_button')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('forum.admin.create_topic_dialog_title')}</DialogTitle>
              <DialogDescription>
                {t('forum.admin.create_topic_dialog_description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic-title">{t('forum.admin.topic_title')} *</Label>
                <Input
                  id="topic-title"
                  placeholder={t('forum.admin.topic_title_placeholder')}
                  value={topicForm.title}
                  onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-category">{t('forum.admin.topic_category')} *</Label>
                <Select 
                  value={topicForm.category}
                  onValueChange={(value) => setTopicForm({ ...topicForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('forum.admin.category_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-content">{t('forum.admin.topic_content')} *</Label>
                <Textarea
                  id="topic-content"
                  placeholder={t('forum.admin.topic_content_placeholder')}
                  rows={8}
                  value={topicForm.content}
                  onChange={(e) => setTopicForm({ ...topicForm, content: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-author">{t('forum.admin.topic_author')}</Label>
                <Input
                  id="topic-author"
                  value={topicForm.author}
                  onChange={(e) => setTopicForm({ ...topicForm, author: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateTopicOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateTopic}>
                {t('forum.admin.create_topic_button')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>{t('forum.admin.total_topics')}</CardDescription>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTopics}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('forum.admin.across_all_categories')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>{t('forum.admin.total_replies')}</CardDescription>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReplies}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('forum.admin.community_engagement')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>{t('forum.admin.total_views')}</CardDescription>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('forum.admin.forum_reach')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>{t('forum.admin.reported_topics')}</CardDescription>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{reportedTopics.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('forum.admin.needs_moderation')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="topics">{t('forum.topics_tab')}</TabsTrigger>
          <TabsTrigger value="categories">{t('forum.forums_tab')}</TabsTrigger>
          <TabsTrigger value="reported">
            {t('forum.admin.reported_tab', { count: reportedTopics.length })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>{t('forum.filter_topics')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder={t('forum.search_topic_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('forum.all_status')}</SelectItem>
                    <SelectItem value="active">{t('forum.active_status')}</SelectItem>
                    <SelectItem value="locked">{t('forum.locked_status')}</SelectItem>
                    <SelectItem value="pinned">{t('forum.pinned_label')}</SelectItem>
                    <SelectItem value="reported">{t('forum.admin.reported_label')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Topics Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('forum.topics_count', { count: filteredTopics.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('forum.topic_col')}</TableHead>
                    <TableHead>{t('forum.category')}</TableHead>
                    <TableHead>{t('forum.author_col')}</TableHead>
                    <TableHead>{t('forum.replies_col')}</TableHead>
                    <TableHead>{t('forum.views_col')}</TableHead>
                    <TableHead>{t('forum.status_label')}</TableHead>
                    <TableHead>{t('forum.last_activity_col')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTopics.map((topic) => (
                    <TableRow key={topic.id}>
                      <TableCell>
                        <div className="font-medium">{topic.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {t('forum.admin.field_created_at')}: {topic.createdAt}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{topic.category}</Badge>
                      </TableCell>
                      <TableCell>{topic.author}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          {topic.replies}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          {topic.views}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(topic.status)} className="gap-1">
                          {getStatusIcon(topic.status)}
                          {getStatusLabel(topic.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {topic.lastActivity}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPreviewDialog(topic)}
                            title={t('forum.admin.preview_before_moderation')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openModerationDialog(topic)}
                            title={t('forum.admin.review')}
                          >
                            <Shield className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openConfirm(
                              topic.status === 'pinned' ? t('forum.unpin') : t('forum.pin_topic'),
                              topic.status === 'pinned'
                                ? t('forum.admin.unpin_topic_description', { title: topic.title })
                                : t('forum.admin.pin_topic_description', { title: topic.title }),
                              topic.status === 'pinned' ? t('forum.unpin') : t('forum.pin_topic'),
                              () => handlePinTopic(topic.id),
                            )}
                            title={topic.status === 'pinned' ? t('forum.unpin') : t('forum.pin_topic')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openConfirm(
                              topic.status === 'locked' ? t('forum.unlock_topic') : t('forum.lock_topic'),
                              topic.status === 'locked'
                                ? t('forum.admin.unlock_topic_description', { title: topic.title })
                                : t('forum.admin.lock_topic_description', { title: topic.title }),
                              topic.status === 'locked' ? t('forum.unlock_topic') : t('forum.lock_topic'),
                              () => handleLockTopic(topic.id),
                            )}
                            title={topic.status === 'locked' ? t('forum.unlock_topic') : t('forum.lock_topic')}
                          >
                            {topic.status === 'locked' ? (
                              <Unlock className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openConfirm(
                              t('forum.delete_topic'),
                              t('forum.admin.confirm_delete_topic'),
                              t('common.delete'),
                              () => handleDeleteTopic(topic.id),
                              true,
                            )}
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('forum.admin.forum_categories_title')}</CardTitle>
                <CardDescription>{t('forum.admin.forum_categories_description')}</CardDescription>
              </div>
              <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('forum.admin.add_category')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('forum.admin.create_new_category')}</DialogTitle>
                    <DialogDescription>
                      {t('forum.admin.add_new_discussion_category')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('forum.admin.category_name')} *</Label>
                      <Input
                        id="name"
                        placeholder={t('forum.admin.category_name_placeholder')}
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">{t('forum.admin.description_label')}</Label>
                      <Textarea
                        id="description"
                        placeholder={t('forum.admin.category_description_placeholder')}
                        rows={3}
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="order">{t('forum.admin.display_order')}</Label>
                      <Input
                        id="order"
                        type="number"
                        min="1"
                        value={categoryForm.order}
                        onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateCategoryOpen(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleCreateCategory}>
                      {t('forum.admin.create_category')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.sort((a, b) => a.order - b.order).map((category) => (
                  <Card key={category.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-lg">{category.name}</div>
                          <div className="text-sm text-muted-foreground">{category.description}</div>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2 text-sm">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              {t('forum.topics_count', { count: category.topicsCount })}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {t('forum.admin.order_value', { order: category.order })}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchQuery(category.name)
                              setFilterStatus('all')
                              setActiveTab('topics')
                            }}
                          >
                            {t('forum.admin.view_topics')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => openConfirm(
                              t('forum.delete_category'),
                              t('forum.admin.confirm_delete_category'),
                              t('common.delete'),
                              () => handleDeleteCategory(category.id),
                              true,
                            )}
                          >
                            {t('common.delete')}
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

        <TabsContent value="reported" className="space-y-4">
          <AdminBulkActionBar
            count={selectedReportedTopicIds.length}
            label={t('forum.admin.bulk_selected_label')}
            onClear={() => setSelectedReportedTopicIds([])}
            actions={[
              {
                key: 'dismiss',
                label: t('forum.admin.dismiss_reports'),
                onClick: () => openConfirm(
                  t('forum.admin.dismiss_reports_title'),
                  t('forum.admin.dismiss_reports_description', { count: selectedReportedTopicIds.length }),
                  t('forum.admin.dismiss_reports'),
                  () => bulkReportedAction(selectedReportedTopicIds, dismissReportedTopic, t('forum.admin.bulk_dismiss_success')),
                ),
              },
              {
                key: 'lock',
                label: t('forum.admin.lock_topics'),
                onClick: () => openConfirm(
                  t('forum.admin.lock_topics_title'),
                  t('forum.admin.lock_topics_description', { count: selectedReportedTopicIds.length }),
                  t('forum.admin.lock_topics'),
                  () => bulkReportedAction(selectedReportedTopicIds, (id) => moderateForumTopic(Number(id), { action: 'lock' }).then(() => {
                    setTopics(prev => prev.map(item => item.id === id ? { ...item, status: 'locked', reportCount: 0 } : item))
                  }), t('forum.admin.bulk_lock_success')),
                ),
              },
              {
                key: 'delete',
                label: t('forum.admin.delete_topics'),
                destructive: true,
                onClick: () => openConfirm(
                  t('forum.admin.delete_topics_title'),
                  t('forum.admin.delete_topics_description', { count: selectedReportedTopicIds.length }),
                  t('forum.admin.delete_topics'),
                  () => bulkReportedAction(selectedReportedTopicIds, (id) => deleteForumTopic(Number(id)).then(() => {
                    setTopics(prev => prev.filter(item => item.id !== id))
                  }), t('forum.admin.bulk_delete_success')),
                  true,
                ),
              },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>{t('forum.admin.reported_topics_title')}</CardTitle>
              <CardDescription>{t('forum.admin.reported_topics_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {reportedTopics.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                  <h3 className="font-medium mb-1">{t('forum.admin.all_clear_title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('forum.admin.all_clear_description')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[48px]">
                        <Checkbox
                          checked={reportedTopics.length > 0 && selectedReportedTopicIds.length === reportedTopics.length}
                          onCheckedChange={(checked) => toggleAllReported(Boolean(checked))}
                        />
                      </TableHead>
                      <TableHead>{t('forum.topic_col')}</TableHead>
                      <TableHead>{t('forum.author_col')}</TableHead>
                      <TableHead>{t('forum.admin.field_reports')}</TableHead>
                      <TableHead>{t('forum.last_activity_col')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportedTopics.map((topic) => (
                      <TableRow key={topic.id} className="bg-destructive/5">
                        <TableCell>
                          <Checkbox
                            checked={selectedReportedTopicIds.includes(topic.id)}
                            onCheckedChange={(checked) => toggleReportedSelection(topic.id, Boolean(checked))}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{topic.title}</div>
                          <div className="text-sm text-muted-foreground">{t('forum.admin.in_category', { category: topic.category })}</div>
                        </TableCell>
                        <TableCell>{topic.author}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{t('forum.admin.reports_count', { count: topic.reportCount })}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {topic.lastActivity}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost"
                              size="icon"
                              onClick={() => openPreviewDialog(topic)}
                              title={t('forum.admin.preview_before_moderation')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-1"
                              onClick={() => openModerationDialog(topic)}
                            >
                              <Shield className="h-3 w-3" />
                              {t('forum.admin.review')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openConfirm(
                                t('forum.admin.dismiss_report_title'),
                                t('forum.admin.dismiss_report_description', { title: topic.title }),
                                t('forum.admin.dismiss_report'),
                                () => dismissReportedTopic(topic.id).then(() => {
                                  toast.success(t('forum.admin.dismissed_report'))
                                }),
                              )}
                            >
                              {t('forum.admin.dismiss_report')}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openConfirm(
                                t('forum.delete_topic'),
                                t('forum.admin.confirm_delete_topic'),
                                t('common.delete'),
                                () => handleDeleteTopic(topic.id),
                                true,
                              )}
                            >
                              {t('common.delete')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Topic Preview */}
      <QuickTopicPreview
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        topic={selectedTopicForPreview}
        onModerate={() => {
          if (selectedTopicForPreview) {
            openModerationDialog(selectedTopicForPreview)
          }
        }}
      />

      {/* Moderation Dialog */}
      <Dialog open={isModerationDialogOpen} onOpenChange={setIsModerationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              {t('forum.admin.moderation_dialog_title')}
            </DialogTitle>
            <DialogDescription>
              {t('forum.admin.moderation_dialog_description', { title: selectedTopicForModeration?.title || '' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* View Topic Buttons */}
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2 mb-3">
                  <Eye className="h-4 w-4 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {t('forum.admin.preview_before_moderation')}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {t('forum.admin.preview_before_moderation_description')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 flex-1"
                    onClick={() => window.open(`/forum/topic/${selectedTopicForModeration?.id}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('forum.admin.open_new_tab')}
                  </Button>
                  <Button
                    variant="default"
                    className="gap-2 flex-1"
                    onClick={() => {
                      setIsModerationDialogOpen(false)
                      navigate(`/forum/topic/${selectedTopicForModeration?.id}`)
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    {t('forum.admin.go_to_topic')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Topic Info */}
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>{t('forum.admin.topic_info_title')}</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <div><strong>{t('forum.admin.field_author')}:</strong> {selectedTopicForModeration?.author}</div>
                  <div><strong>{t('forum.admin.field_category')}:</strong> {selectedTopicForModeration?.category}</div>
                  <div><strong>{t('forum.admin.field_views')}:</strong> {selectedTopicForModeration?.views}</div>
                  <div><strong>{t('forum.admin.field_replies')}:</strong> {selectedTopicForModeration?.replies}</div>
                  <div><strong>{t('forum.admin.field_created_at')}:</strong> {selectedTopicForModeration?.createdAt}</div>
                  <div><strong>{t('forum.admin.field_status')}:</strong> <Badge variant={getStatusColor(selectedTopicForModeration?.status || 'active')}>{selectedTopicForModeration?.status ? getStatusLabel(selectedTopicForModeration.status) : getStatusLabel('active')}</Badge></div>
                  <div><strong>{t('forum.admin.field_reports')}:</strong> {selectedTopicForModeration?.reportCount || 0}</div>
                  {selectedTopicForModeration?.lastReportReason && (
                    <div><strong>{t('forum.admin.field_last_reason')}:</strong> {selectedTopicForModeration.lastReportReason}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Content Preview */}
            {selectedTopicForModeration?.content && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('forum.admin.content_preview_title')}</CardTitle>
                  <CardDescription>{t('forum.admin.content_preview_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-secondary/50 p-4 rounded-lg max-h-48 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{selectedTopicForModeration.content}</p>
                  </div>
                  {selectedTopicForModeration.content.length > 200 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('forum.admin.truncated_preview_hint')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Moderation Action */}
            <div className="space-y-2">
              <Label htmlFor="mod-action">{t('forum.admin.moderation_action_label')} *</Label>
              <Select 
                value={moderationAction.action}
                onValueChange={(value) => setModerationAction({ ...moderationAction, action: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('forum.admin.moderation_action_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {t('forum.admin.moderation_action_approve')}
                    </div>
                  </SelectItem>
                  <SelectItem value="lock">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-600" />
                      {t('forum.admin.moderation_action_lock')}
                    </div>
                  </SelectItem>
                  <SelectItem value="delete">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      {t('forum.admin.moderation_action_delete')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="mod-reason">{t('forum.admin.moderation_reason_label')} *</Label>
              <Textarea
                id="mod-reason"
                placeholder={t('forum.admin.moderation_reason_placeholder')}
                rows={4}
                value={moderationAction.reason}
                onChange={(e) => setModerationAction({ ...moderationAction, reason: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {t('forum.admin.moderation_reason_help')}
              </p>
            </div>

            {/* Warning Alert */}
            {(moderationAction.action === 'delete') && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('forum.admin.warning_title')}</AlertTitle>
                <AlertDescription>
                  {t('forum.admin.warning_description')}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsModerationDialogOpen(false)
                setSelectedTopicForModeration(null)
                setModerationAction({ action: '', reason: '', duration: '' })
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleModeration}
              variant={moderationAction.action === 'delete' ? 'destructive' : 'default'}
            >
              {t('forum.admin.execute')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AdminConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        loading={confirmState.loading}
        onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}
        onConfirm={runConfirmedAction}
      />
    </div>
  )
}



