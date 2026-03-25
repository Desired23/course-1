import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Label } from '../../components/ui/label'
import { Separator } from '../../components/ui/separator'
import { TableFilter, FilterConfig } from '../../components/FilterComponents'
import { 
  MessageSquare, 
  Plus, 
  Eye, 
  MessageCircle, 
  Users, 
  Clock, 
  Pin,
  Lock,
  Trash2,
  MoreVertical,
  Flag,
  Star
} from 'lucide-react'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { useTranslation } from 'react-i18next'
import {
  type Forum as ApiForum,
  type ForumTopic as ApiForumTopic,
  getAllForums,
  getAllForumTopics,
  createForum,
  createForumTopic,
  updateForumTopic,
  moderateForumTopic,
  formatForumDate,
} from '../../services/forum.api'

// Forum interfaces matching original UI expectations
interface Forum {
  forum_id: string
  course_id?: string
  title: string
  description?: string
  user_id: string
  created_date: Date
  status: 'active' | 'archived' | 'deleted'
  topic_count: number
  last_activity?: Date
  moderators: string[]
}

interface ForumTopic {
  topic_id: string
  forum_id: string
  title: string
  content: string
  user_id: string
  user_name?: string
  created_date: Date
  updated_date: Date
  views: number
  likes: number
  replies: number
  status: 'active' | 'locked' | 'deleted'
  is_pinned: boolean
  report_count: number
  last_report_reason?: string
  last_reply?: {
    user_name: string
    date: Date
  }
}

interface Course {
  id: string
  title: string
  instructor: string
}

function mapApiForum(f: ApiForum): Forum {
  return {
    forum_id: String(f.id),
    course_id: f.course ? String(f.course) : undefined,
    title: f.title,
    description: f.description || undefined,
    user_id: String(f.user_id),
    created_date: new Date(f.created_at),
    status: f.status,
    topic_count: f.topic_count,
    last_activity: f.last_activity ? new Date(f.last_activity) : undefined,
    moderators: [String(f.user_id)],
  }
}

function mapApiTopic(t: ApiForumTopic): ForumTopic {
  return {
    topic_id: String(t.id),
    forum_id: String(t.forum),
    title: t.title,
    content: t.content,
    user_id: String(t.user),
    user_name: t.user_name || undefined,
    created_date: new Date(t.created_at),
    updated_date: new Date(t.updated_at),
    views: t.views,
    likes: t.likes,
    replies: t.replies_count,
    status: t.status,
    is_pinned: t.is_pinned,
    report_count: t.report_count,
    last_report_reason: t.last_report_reason || undefined,
  }
}

export function ForumPage() {
  const { navigate } = useRouter()
  const { user, hasRole, hasPermission } = useAuth()
  const { t } = useTranslation()
  const [selectedForum, setSelectedForum] = useState<string>('')
  const [showCreateTopic, setShowCreateTopic] = useState(false)
  const [showCreateForum, setShowCreateForum] = useState(false)
  const [forums, setForums] = useState<Forum[]>([])
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [filteredTopics, setFilteredTopics] = useState<ForumTopic[]>([])
  const [filters, setFilters] = useState({})
  const [loading, setLoading] = useState(true)
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null)

  const canCreateForum = hasRole('admin') || hasRole('instructor')
  const canModerateForum = hasRole('admin') || hasPermission('admin.forum.moderate')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [apiForums, apiTopics] = await Promise.all([
        getAllForums(),
        getAllForumTopics(),
      ])
      const mappedForums = apiForums.map(mapApiForum)
      const mappedTopics = apiTopics.map(mapApiTopic)
      setForums(mappedForums)
      setTopics(mappedTopics)
      setFilteredTopics(mappedTopics)
    } catch (err) {
      console.error('Failed to load forum data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Filter topics by selected forum
    let filtered = topics
    if (selectedForum) {
      filtered = topics.filter(topic => topic.forum_id === selectedForum)
    }
    setFilteredTopics(filtered)
  }, [selectedForum, topics])

  const filterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: t('forum.search_label'),
      type: 'search',
      placeholder: t('forum.search_topic_placeholder')
    },
    {
      key: 'forum',
      label: t('forum.forum_label'),
      type: 'select',
      options: [
        { label: t('forum.all_forums'), value: '' },
        ...forums.map(forum => ({
          label: forum.title,
          value: forum.forum_id,
          count: topics.filter(topic => topic.forum_id === forum.forum_id).length
        }))
      ]
    },
    {
      key: 'status',
      label: t('forum.status_label'),
      type: 'select',
      options: [
        { label: t('forum.all_status'), value: '' },
        { label: t('forum.active_status'), value: 'active', count: topics.filter(topic => topic.status === 'active').length },
        { label: t('forum.locked_status'), value: 'locked', count: topics.filter(topic => topic.status === 'locked').length }
      ]
    },
    {
      key: 'pinned',
      label: t('forum.pinned_label'),
      type: 'checkbox',
      placeholder: t('forum.pinned_only')
    }
  ]

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters)
    
    let filtered = topics
    
    // Filter by forum
    if (newFilters.forum) {
      filtered = filtered.filter(topic => topic.forum_id === newFilters.forum)
      setSelectedForum(newFilters.forum)
    } else {
      setSelectedForum('')
    }
    
    // Filter by search
    if (newFilters.search) {
      filtered = filtered.filter(topic => 
        topic.title.toLowerCase().includes(newFilters.search.toLowerCase()) ||
        topic.content.toLowerCase().includes(newFilters.search.toLowerCase())
      )
    }
    
    // Filter by status
    if (newFilters.status) {
      filtered = filtered.filter(topic => topic.status === newFilters.status)
    }
    
    // Filter by pinned
    if (newFilters.pinned) {
      filtered = filtered.filter(topic => topic.is_pinned)
    }
    
    setFilteredTopics(filtered)
  }

  const handleCreateTopic = async (forumId: string, title: string, content: string) => {
    try {
      await createForumTopic({
        forum: Number(forumId),
        title,
        content,
        user: Number(user?.id || 0),
      })
      setShowCreateTopic(false)
      loadData()
    } catch (err) {
      console.error('Failed to create topic:', err)
    }
  }

  const handleCreateForum = async (title: string, description: string, courseId?: string) => {
    try {
      await createForum({
        title,
        description,
        course: courseId ? Number(courseId) : null,
        user_id: Number(user?.id || 0),
        status: 'active',
      })
      setShowCreateForum(false)
      loadData()
    } catch (err) {
      console.error('Failed to create forum:', err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'locked':
        return <Lock className="h-4 w-4 text-orange-500" />
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-red-500" />
      default:
        return <MessageSquare className="h-4 w-4 text-green-500" />
    }
  }

  const reportedTopics = filteredTopics.filter(topic => topic.report_count > 0)

  const applyTopicUpdate = (topicId: string, updater: (topic: ForumTopic) => ForumTopic | null) => {
    setTopics(prev => prev.map(topic => topic.topic_id === topicId ? updater(topic) : topic).filter(Boolean) as ForumTopic[])
    setFilteredTopics(prev => prev.map(topic => topic.topic_id === topicId ? updater(topic) : topic).filter(Boolean) as ForumTopic[])
  }

  const handlePinToggle = async (topic: ForumTopic) => {
    try {
      setModerationBusyId(topic.topic_id)
      const updated = await updateForumTopic(Number(topic.topic_id), { is_pinned: !topic.is_pinned })
      applyTopicUpdate(topic.topic_id, () => mapApiTopic(updated))
    } catch (err) {
      console.error('Failed to update topic pin status:', err)
      window.alert('Failed to update topic pin status')
    } finally {
      setModerationBusyId(null)
    }
  }

  const handleLockToggle = async (topic: ForumTopic) => {
    try {
      setModerationBusyId(topic.topic_id)
      const updated = topic.status === 'locked'
        ? await updateForumTopic(Number(topic.topic_id), { status: 'active' })
        : await moderateForumTopic(Number(topic.topic_id), { action: 'lock', reason: 'Locked from moderation panel' })
      applyTopicUpdate(topic.topic_id, () => mapApiTopic(updated))
    } catch (err) {
      console.error('Failed to update topic lock status:', err)
      window.alert('Failed to update topic lock status')
    } finally {
      setModerationBusyId(null)
    }
  }

  const handleDeleteTopic = async (topic: ForumTopic) => {
    try {
      setModerationBusyId(topic.topic_id)
      const updated = await moderateForumTopic(Number(topic.topic_id), { action: 'delete', reason: 'Deleted from moderation panel' })
      applyTopicUpdate(topic.topic_id, () => mapApiTopic(updated))
    } catch (err) {
      console.error('Failed to delete topic:', err)
      window.alert('Failed to delete topic')
    } finally {
      setModerationBusyId(null)
    }
  }

  const handleReportedTopicAction = async (topic: ForumTopic, action: 'approve' | 'dismiss' | 'lock' | 'delete') => {
    try {
      setModerationBusyId(topic.topic_id)
      const updated = await moderateForumTopic(Number(topic.topic_id), {
        action,
        reason: topic.last_report_reason || 'Handled from forum moderation tab',
      })
      applyTopicUpdate(topic.topic_id, () => mapApiTopic(updated))
    } catch (err) {
      console.error('Failed to moderate reported topic:', err)
      window.alert('Failed to process report')
    } finally {
      setModerationBusyId(null)
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">{t('forum.title')}</h1>
          <p className="text-muted-foreground">{t('forum.community_subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {canCreateForum && (
            <Dialog open={showCreateForum} onOpenChange={setShowCreateForum}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('forum.create_forum')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('forum.create_forum_title')}</DialogTitle>
                  <DialogDescription>
                    {t('forum.create_forum_desc')}
                  </DialogDescription>
                </DialogHeader>
                <CreateForumForm 
                  onSubmit={handleCreateForum}
                  courses={[]}
                />
              </DialogContent>
            </Dialog>
          )}
          
          {user && (
            <Dialog open={showCreateTopic} onOpenChange={setShowCreateTopic}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('forum.create_topic')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('forum.create_topic_title')}</DialogTitle>
                  <DialogDescription>
                    {t('forum.create_topic_desc')}
                  </DialogDescription>
                </DialogHeader>
                <CreateTopicForm 
                  forums={forums}
                  onSubmit={handleCreateTopic}
                  defaultForum={selectedForum}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="topics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="topics">{t('forum.topics_tab')}</TabsTrigger>
          <TabsTrigger value="forums">{t('forum.forums_tab')}</TabsTrigger>
          {canModerateForum && <TabsTrigger value="moderation">{t('forum.moderation_tab')}</TabsTrigger>}
        </TabsList>

        <TabsContent value="topics" className="space-y-6">
          {/* Filters */}
          <TableFilter
            title={t('forum.filter_topics')}
            configs={filterConfigs}
            onFilterChange={handleFilterChange}
            className="mb-6"
          />

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
                    <TableHead>{t('forum.forum_col')}</TableHead>
                    <TableHead>{t('forum.author_col')}</TableHead>
                    <TableHead className="text-center">{t('forum.replies_col')}</TableHead>
                    <TableHead className="text-center">{t('forum.views_col')}</TableHead>
                    <TableHead>{t('forum.last_activity_col')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTopics.map((topic) => {
                    const forum = forums.find(f => f.forum_id === topic.forum_id)
                    return (
                      <TableRow 
                        key={topic.topic_id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/forum/topic/${topic.topic_id}`)}
                      >
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center gap-1 mt-1">
                              {topic.is_pinned && <Pin className="h-4 w-4 text-blue-500" />}
                              {getStatusIcon(topic.status)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium line-clamp-1">{topic.title}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {topic.content}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {topic.likes > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    {topic.likes}
                                  </Badge>
                                )}
                                <Badge 
                                  variant={topic.status === 'active' ? 'default' : 
                                           topic.status === 'locked' ? 'secondary' : 'destructive'}
                                  className="text-xs"
                                >
                                  {topic.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{forum?.title}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{topic.user_name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{topic.user_name || `User ${topic.user_id}`}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{topic.replies}</TableCell>
                        <TableCell className="text-center">{topic.views}</TableCell>
                        <TableCell>
                          {topic.last_reply ? (
                            <div className="text-sm">
                              <p className="font-medium">{topic.last_reply.user_name}</p>
                              <p className="text-muted-foreground text-xs">
                                {topic.last_reply.date.toLocaleDateString()}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {topic.created_date.toLocaleDateString()}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {canModerateForum && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  disabled={moderationBusyId === topic.topic_id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handlePinToggle(topic)
                                  }}
                                >
                                  <Pin className="h-4 w-4 mr-2" />
                                  {topic.is_pinned ? t('forum.unpin') : t('forum.pin_topic')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={moderationBusyId === topic.topic_id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleLockToggle(topic)
                                  }}
                                >
                                  <Lock className="h-4 w-4 mr-2" />
                                  {topic.status === 'locked' ? t('forum.unlock_topic') : t('forum.lock_topic')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  disabled={moderationBusyId === topic.topic_id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteTopic(topic)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('forum.delete_topic')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forums" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forums.map((forum) => (
              <Card key={forum.forum_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{forum.title}</CardTitle>
                      {forum.course_id && (
                        <Badge variant="outline" className="mt-2">
                          Course #{forum.course_id}
                        </Badge>
                      )}
                    </div>
                    <Badge variant={forum.status === 'active' ? 'default' : 'secondary'}>
                      {forum.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{forum.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {t('forum.topics_count_label', { count: forum.topic_count })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {forum.moderators.length} {t('forum.moderators_suffix')}
                      </span>
                    </div>
                  </div>

                  {forum.last_activity && (
                    <p className="text-xs text-muted-foreground mb-4">
                      {t('forum.last_activity_label')} {forum.last_activity.toLocaleDateString()}
                    </p>
                  )}

                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setSelectedForum(forum.forum_id)
                      const tabsTrigger = document.querySelector('[value="topics"]') as HTMLElement
                      tabsTrigger?.click()
                    }}
                  >
                    {t('forum.view_topics')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {canModerateForum && (
          <TabsContent value="moderation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('forum.moderation_title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {reportedTopics.length === 0 ? (
                  <p className="text-muted-foreground">
                    No reported topics match the current filters.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reportedTopics.map((topic) => {
                      const forum = forums.find(item => item.forum_id === topic.forum_id)
                      return (
                        <div key={topic.topic_id} className="rounded-lg border p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="destructive">{topic.report_count} reports</Badge>
                                <Badge variant="outline">{forum?.title || `Forum ${topic.forum_id}`}</Badge>
                                <Badge variant={topic.status === 'locked' ? 'secondary' : 'default'}>
                                  {topic.status}
                                </Badge>
                              </div>
                              <div>
                                <p className="font-medium">{topic.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">{topic.content}</p>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Author: {topic.user_name || `User ${topic.user_id}`}</p>
                                <p>Latest report reason: {topic.last_report_reason || 'No reason provided'}</p>
                                <p>Updated: {formatForumDate(topic.updated_date.toISOString())}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={moderationBusyId === topic.topic_id}
                                onClick={() => navigate(`/forum/topic/${topic.topic_id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={moderationBusyId === topic.topic_id}
                                onClick={() => handleReportedTopicAction(topic, 'approve')}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={moderationBusyId === topic.topic_id}
                                onClick={() => handleReportedTopicAction(topic, 'dismiss')}
                              >
                                Dismiss
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={moderationBusyId === topic.topic_id}
                                onClick={() => handleReportedTopicAction(topic, 'lock')}
                              >
                                Lock
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={moderationBusyId === topic.topic_id}
                                onClick={() => handleReportedTopicAction(topic, 'delete')}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// Create Topic Form Component
function CreateTopicForm({ 
  forums, 
  onSubmit, 
  defaultForum 
}: { 
  forums: Forum[]
  onSubmit: (forumId: string, title: string, content: string) => void
  defaultForum?: string
}) {
  const [formData, setFormData] = useState({
    forumId: defaultForum || '',
    title: '',
    content: ''
  })
  const { t } = useTranslation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.forumId && formData.title && formData.content) {
      onSubmit(formData.forumId, formData.title, formData.content)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>{t('forum.forum_label')}</Label>
        <Select value={formData.forumId} onValueChange={(value) => setFormData({...formData, forumId: value})}>
          <SelectTrigger>
            <SelectValue placeholder={t('forum.select_forum_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {forums.filter(f => f.status === 'active').map((forum) => (
              <SelectItem key={forum.forum_id} value={forum.forum_id}>
                {forum.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t('forum.title_label')}</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder={t('forum.title_placeholder')}
          required
        />
      </div>

      <div>
        <Label>{t('forum.content_label')}</Label>
        <Textarea
          value={formData.content}
          onChange={(e) => setFormData({...formData, content: e.target.value})}
          placeholder={t('forum.content_placeholder')}
          rows={6}
          required
        />
      </div>

      <Button type="submit" className="w-full">
        {t('forum.create_topic_submit')}
      </Button>
    </form>
  )
}

// Create Forum Form Component
function CreateForumForm({ 
  onSubmit, 
  courses 
}: { 
  onSubmit: (title: string, description: string, courseId?: string) => void
  courses: Course[]
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: ''
  })
  const { t } = useTranslation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.title) {
      onSubmit(formData.title, formData.description, formData.courseId || undefined)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>{t('forum.forum_name_label')}</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder={t('forum.forum_name_placeholder')}
          required
        />
      </div>

      <div>
        <Label>{t('forum.description_label')}</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder={t('forum.description_placeholder')}
          rows={3}
        />
      </div>

      <div>
        <Label>{t('forum.course_label')}</Label>
        <Select value={formData.courseId || 'none'} onValueChange={(value) => setFormData({...formData, courseId: value === 'none' ? '' : value})}>
          <SelectTrigger>
            <SelectValue placeholder={t('forum.select_course_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('forum.no_course')}</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full">
        {t('forum.create_forum_submit')}
      </Button>
    </form>
  )
}
