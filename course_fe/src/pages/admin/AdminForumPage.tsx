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
        toast.error('Không thể tải dữ liệu diễn đàn')
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
    confirmLabel: 'Confirm',
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
      toast.success('Topic deleted successfully')
    } catch { toast.error('X??a th???t b???i') }
  }

  const handleCreateCategory = async () => {
    if (!categoryForm.name) {
      toast.error(t('forum.admin.category_name_required'))
      return
    }
    try {
      if (!currentUserId) {
        toast.error('Khong tim thay thong tin admin hien tai')
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
      toast.success('Category deleted successfully')
    } catch { toast.error('X??a th???t b???i') }
  }

  const handleCreateTopic = async () => {
    if (!topicForm.title || !topicForm.category || !topicForm.content) {
      toast.error(t('forum.admin.fill_required_fields'))
      return
    }
    if (!currentUserId) {
      toast.error('Khong tim thay thong tin admin hien tai')
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
        lastActivity: 'Just now',
        status: 'active',
        createdAt: new Date().toLocaleDateString(),
        reportCount: 0,
      }, ...prev])
      setIsCreateTopicOpen(false)
      setTopicForm({ title: '', category: '', content: '', author: 'Admin' })
      toast.success('Topic created successfully!')
    } catch { toast.error('Tạo chủ đề thất bại') }
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
      toast.error('Please select an action')
      return
    }
    const action = moderationAction.action
    const topicId = Number(selectedTopicForModeration.id)
    try {
      if (action === 'approve') {
        await moderateForumTopic(topicId, { action: 'approve', reason: moderationAction.reason })
        setTopics(topics.map(t => t.id === selectedTopicForModeration.id ? { ...t, status: 'active' as const, reportCount: 0 } : t))
        toast.success('Topic approved')
      } else if (action === 'delete') {
        await moderateForumTopic(topicId, { action: 'delete', reason: moderationAction.reason })
        setTopics(topics.filter(t => t.id !== selectedTopicForModeration.id))
        toast.success('Topic deleted')
      } else if (action === 'lock') {
        await moderateForumTopic(topicId, { action: 'lock', reason: moderationAction.reason })
        setTopics(topics.map(t => t.id === selectedTopicForModeration.id ? { ...t, status: 'locked' as const, reportCount: 0 } : t))
        toast.success('Topic locked')
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
        confirmLabel: 'Confirm',
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
              Tạo Chủ Đề Mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tạo Chủ Đề Diễn Đàn Mới</DialogTitle>
              <DialogDescription>
                Tạo chủ đề thảo luận mới cho cộng đồng
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic-title">Tiêu Đề *</Label>
                <Input
                  id="topic-title"
                  placeholder="Nhập tiêu đề chủ đề..."
                  value={topicForm.title}
                  onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-category">Danh Mục *</Label>
                <Select 
                  value={topicForm.category}
                  onValueChange={(value) => setTopicForm({ ...topicForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
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
                <Label htmlFor="topic-content">Nội Dung *</Label>
                <Textarea
                  id="topic-content"
                  placeholder="Nhập nội dung chi tiết..."
                  rows={8}
                  value={topicForm.content}
                  onChange={(e) => setTopicForm({ ...topicForm, content: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-author">Tác Giả</Label>
                <Input
                  id="topic-author"
                  value={topicForm.author}
                  onChange={(e) => setTopicForm({ ...topicForm, author: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateTopicOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreateTopic}>
                Tạo Chủ Đề
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
                    <TableHead className="text-right">{t('subscriptions_page.admin.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTopics.map((topic) => (
                    <TableRow key={topic.id}>
                      <TableCell>
                        <div className="font-medium">{topic.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Created {topic.createdAt}
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
                          {topic.status}
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
                            title="Quick Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openModerationDialog(topic)}
                            title="Moderation"
                          >
                            <Shield className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openConfirm(
                              topic.status === 'pinned' ? 'Unpin topic' : 'Pin topic',
                              topic.status === 'pinned'
                                ? `Remove pin from "${topic.title}"?`
                                : `Pin "${topic.title}" to highlight it?`,
                              topic.status === 'pinned' ? 'Unpin' : 'Pin',
                              () => handlePinTopic(topic.id),
                            )}
                            title={topic.status === 'pinned' ? 'Unpin' : 'Pin'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openConfirm(
                              topic.status === 'locked' ? 'Unlock topic' : 'Lock topic',
                              topic.status === 'locked'
                                ? `Unlock "${topic.title}" so the discussion can continue?`
                                : `Lock "${topic.title}"?`,
                              topic.status === 'locked' ? 'Unlock' : 'Lock',
                              () => handleLockTopic(topic.id),
                            )}
                            title={topic.status === 'locked' ? 'Unlock' : 'Lock'}
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
                              'Delete topic',
                              `Delete "${topic.title}"? This action cannot be undone.`,
                              'Delete',
                              () => handleDeleteTopic(topic.id),
                              true,
                            )}
                            title="Delete"
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
                <CardTitle>Forum Categories</CardTitle>
                <CardDescription>Manage discussion categories</CardDescription>
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
                        placeholder="e.g., React, JavaScript"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="{t('forum.admin.category_description_placeholder')}"
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
                      Cancel
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
                              {category.topicsCount} topics
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Order: {category.order}
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
                            View topics
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => openConfirm(
                              'Delete category',
                              `Delete "${category.name}"? This action cannot be undone.`,
                              'Delete',
                              () => handleDeleteCategory(category.id),
                              true,
                            )}
                          >
                            Delete
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
            label="reported topics selected"
            onClear={() => setSelectedReportedTopicIds([])}
            actions={[
              {
                key: 'dismiss',
                label: 'Dismiss reports',
                onClick: () => openConfirm(
                  'Dismiss selected reports',
                  `Dismiss reports for ${selectedReportedTopicIds.length} selected topics?`,
                  'Dismiss reports',
                  () => bulkReportedAction(selectedReportedTopicIds, dismissReportedTopic, 'Da bo qua report da chon'),
                ),
              },
              {
                key: 'lock',
                label: 'Lock topics',
                onClick: () => openConfirm(
                  'Lock selected topics',
                  `Lock ${selectedReportedTopicIds.length} reported topics?`,
                  'Lock topics',
                  () => bulkReportedAction(selectedReportedTopicIds, (id) => moderateForumTopic(Number(id), { action: 'lock' }).then(() => {
                    setTopics(prev => prev.map(item => item.id === id ? { ...item, status: 'locked', reportCount: 0 } : item))
                  }), 'Da khoa topic da chon'),
                ),
              },
              {
                key: 'delete',
                label: 'Delete topics',
                destructive: true,
                onClick: () => openConfirm(
                  'Delete selected topics',
                  `Delete ${selectedReportedTopicIds.length} reported topics? This action cannot be undone.`,
                  'Delete topics',
                  () => bulkReportedAction(selectedReportedTopicIds, (id) => deleteForumTopic(Number(id)).then(() => {
                    setTopics(prev => prev.filter(item => item.id !== id))
                  }), 'Da xoa topic da chon'),
                  true,
                ),
              },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Reported Topics</CardTitle>
              <CardDescription>Topics that need moderation</CardDescription>
            </CardHeader>
            <CardContent>
              {reportedTopics.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                  <h3 className="font-medium mb-1">All Clear!</h3>
                  <p className="text-sm text-muted-foreground">No reported topics at the moment</p>
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
                      <TableHead>Topic</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Reports</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                          <div className="text-sm text-muted-foreground">in {topic.category}</div>
                        </TableCell>
                        <TableCell>{topic.author}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{topic.reportCount} reports</Badge>
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
                              title="Quick View"
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
                              Review
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openConfirm(
                                'Dismiss report',
                                `Dismiss reports for "${topic.title}" and keep the topic visible?`,
                                'Dismiss report',
                                () => dismissReportedTopic(topic.id).then(() => {
                                  toast.success('Dismissed report')
                                }),
                              )}
                            >
                              Dismiss
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openConfirm(
                                'Delete topic',
                                `Delete "${topic.title}"? This action cannot be undone.`,
                                'Delete',
                                () => handleDeleteTopic(topic.id),
                                true,
                              )}
                            >
                              Delete
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
              Kiểm Duyệt Nội Dung
            </DialogTitle>
            <DialogDescription>
              Thực hiện hành động kiểm duyệt cho chủ đề: <strong>{selectedTopicForModeration?.title}</strong>
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
                      Xem Trước Khi Kiểm Duyệt
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Đọc toàn bộ nội dung và phản hồi để đưa ra quyết định chính xác
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
                    Mở Tab Mới
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
                    Chuyển Đến
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Topic Info */}
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>Thông Tin Chủ Đề</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <div><strong>Tác giả:</strong> {selectedTopicForModeration?.author}</div>
                  <div><strong>Danh mục:</strong> {selectedTopicForModeration?.category}</div>
                  <div><strong>Lượt xem:</strong> {selectedTopicForModeration?.views}</div>
                  <div><strong>Trả lời:</strong> {selectedTopicForModeration?.replies}</div>
                  <div><strong>Ngày tạo:</strong> {selectedTopicForModeration?.createdAt}</div>
                  <div><strong>Trạng thái:</strong> <Badge variant={getStatusColor(selectedTopicForModeration?.status || 'active')}>{selectedTopicForModeration?.status}</Badge></div>
                  <div><strong>Số báo cáo:</strong> {selectedTopicForModeration?.reportCount || 0}</div>
                  {selectedTopicForModeration?.lastReportReason && (
                    <div><strong>Lý do gần nhất:</strong> {selectedTopicForModeration.lastReportReason}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Content Preview */}
            {selectedTopicForModeration?.content && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Nội Dung Preview</CardTitle>
                  <CardDescription>Đọc nội dung để đánh giá trước khi kiểm duyệt</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-secondary/50 p-4 rounded-lg max-h-48 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{selectedTopicForModeration.content}</p>
                  </div>
                  {selectedTopicForModeration.content.length > 200 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      * Hiển thị một phần nội dung. Click "Xem Chi Tiết" để đọc đầy đủ.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Moderation Action */}
            <div className="space-y-2">
              <Label htmlFor="mod-action">Hành Động *</Label>
              <Select 
                value={moderationAction.action}
                onValueChange={(value) => setModerationAction({ ...moderationAction, action: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn hành động" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Duyệt - Cho phép hiển thị
                    </div>
                  </SelectItem>
                  <SelectItem value="lock">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-600" />
                      Khóa - Không cho phép trả lời mới
                    </div>
                  </SelectItem>
                  <SelectItem value="delete">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      Xóa - Xóa chủ đề hoàn toàn
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="mod-reason">Lý Do *</Label>
              <Textarea
                id="mod-reason"
                placeholder="Nhập lý do thực hiện hành động này..."
                rows={4}
                value={moderationAction.reason}
                onChange={(e) => setModerationAction({ ...moderationAction, reason: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Lý do này sẽ được gửi đến tác giả và lưu vào log kiểm duyệt
              </p>
            </div>

            {/* Warning Alert */}
            {(moderationAction.action === 'delete') && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cảnh Báo</AlertTitle>
                <AlertDescription>
                  Hành động này không thể hoàn tác. Vui lòng kiểm tra kỹ trước khi thực hiện.
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
              Hủy
            </Button>
            <Button 
              onClick={handleModeration}
              variant={moderationAction.action === 'delete' ? 'destructive' : 'default'}
            >
              Thực Hiện
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



