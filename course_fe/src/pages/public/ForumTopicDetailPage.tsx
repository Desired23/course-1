import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../../components/ui/breadcrumb'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Separator } from '../../components/ui/separator'
import { EnhancedCommentSystem } from '../../components/EnhancedCommentSystem'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { useChat } from '../../contexts/ChatContext'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Edit,
  Eye,
  Flag,
  Heart,
  Lock,
  MessageCircle,
  MoreVertical,
  Pin,
  Share2,
  Trash2,
} from 'lucide-react'
import {
  createForumComment,
  deleteForumComment,
  getAllForumComments,
  getForumTopicById,
  reportForumTopic,
  type ForumTopic as ApiForumTopic,
  updateForumComment,
  updateForumTopic,
} from '../../services/forum.api'

interface ForumTopic {
  topic_id: string
  forum_id: string
  forum_title: string
  title: string
  content: string
  user_id: string
  user_name: string
  user_avatar?: string
  user_role?: string
  created_date: Date
  updated_date: Date
  views: number
  likes: number
  report_count: number
  replies: number
  status: 'active' | 'locked' | 'deleted'
  is_pinned: boolean
  tags?: string[]
}

function mapApiTopicToDetail(topic: ApiForumTopic): ForumTopic {
  return {
    topic_id: String(topic.id),
    forum_id: String(topic.forum),
    forum_title: topic.forum_title || 'Forum',
    title: topic.title,
    content: topic.content,
    user_id: String(topic.user),
    user_name: topic.user_name || `User ${topic.user}`,
    user_avatar: topic.user_avatar || undefined,
    user_role: undefined,
    created_date: new Date(topic.created_at),
    updated_date: new Date(topic.updated_at),
    views: topic.views,
    likes: topic.likes,
    report_count: topic.report_count || 0,
    replies: topic.replies_count,
    status: topic.status,
    is_pinned: topic.is_pinned,
    tags: [],
  }
}

export function ForumTopicDetailPage() {
  const { t } = useTranslation()
  const { navigate, currentRoute } = useRouter()
  const { user, hasPermission, hasRole } = useAuth()
  const { openChatWithUser } = useChat()
  const [topic, setTopic] = useState<ForumTopic | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(true)

  const topicId = currentRoute.split('/forum/topic/')[1]

  useEffect(() => {
    void loadTopic()
  }, [topicId])

  const loadTopic = async () => {
    if (!topicId) return
    setLoading(true)
    try {
      const apiTopic = await getForumTopicById(Number(topicId))
      setTopic(mapApiTopicToDetail(apiTopic))
    } catch (error) {
      console.error('Failed to load topic:', error)
      setTopic(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = () => {
    if (!user) return
    setIsLiked(!isLiked)
    if (topic) {
      setTopic({
        ...topic,
        likes: isLiked ? topic.likes - 1 : topic.likes + 1,
      })
    }
  }

  const handleBookmark = () => {
    if (!user) return
    setIsBookmarked(!isBookmarked)
  }

  const handleReportTopic = async () => {
    if (!user || !topic) return
    const reason = window.prompt(t('forum_topic_detail.report_prompt'), '')
    if (reason === null) return
    try {
      const updated = await reportForumTopic(Number(topic.topic_id), reason)
      setTopic(mapApiTopicToDetail(updated))
    } catch (error) {
      console.error('Failed to report topic:', error)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      void navigator.share({
        title: topic?.title,
        text: t('forum_topic_detail.share_text', { title: topic?.title || '' }),
        url: window.location.href,
      })
    } else {
      void navigator.clipboard.writeText(window.location.href)
    }
  }

  const canEditTopic = user && (hasPermission('admin.forum.moderate') || user.id === topic?.user_id)
  const canModerateTopic = hasRole('admin') || hasPermission('admin.forum.moderate')
  const canMessageTopicAuthor = !!user && !!topic && String(user.id) !== topic.user_id

  const handleMessageAuthor = async () => {
    if (!topic) return
    if (!user) {
      navigate('/login')
      return
    }
    await openChatWithUser(Number(topic.user_id), topic.user_name)
  }

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[400px] items-center justify-center p-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">{t('forum_topic_detail.loading')}</p>
        </div>
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="container mx-auto p-6">
        <div className="py-12 text-center">
          <h2 className="mb-4 text-2xl">{t('forum_topic_detail.not_found')}</h2>
          <Button onClick={() => navigate('/forum')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('forum_topic_detail.back_to_forum')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-6">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/')}>{t('forum_topic_detail.breadcrumb.home')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/forum')}>{t('forum_topic_detail.breadcrumb.forum')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/forum')}>{topic.forum_title}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{topic.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button variant="ghost" onClick={() => navigate('/forum')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('forum_topic_detail.back_to_forum')}
        </Button>

        <div className="grid gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <article>
              <header className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  {topic.is_pinned && (
                    <Badge variant="default" className="bg-blue-500">
                      <Pin className="mr-1 h-3 w-3" />
                      {t('forum_topic_detail.badges.pinned')}
                    </Badge>
                  )}
                  {topic.status === 'locked' && (
                    <Badge variant="secondary">
                      <Lock className="mr-1 h-3 w-3" />
                      {t('forum_topic_detail.badges.locked')}
                    </Badge>
                  )}
                  <Badge variant="outline">{topic.forum_title}</Badge>
                </div>

                <h1 className="mb-6 text-4xl">{topic.title}</h1>

                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={topic.user_avatar} />
                      <AvatarFallback>{topic.user_name.split(' ').map((part) => part[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{topic.user_name}</p>
                      <p className="text-sm text-muted-foreground">{topic.user_role}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {topic.created_date.toLocaleDateString('vi-VN')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {t('forum_topic_detail.views_count', { count: topic.views })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(canEditTopic || canModerateTopic || canMessageTopicAuthor) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canMessageTopicAuthor && (
                          <>
                            <DropdownMenuItem onClick={() => void handleMessageAuthor()}>
                              <MessageCircle className="mr-2 h-4 w-4" />
                              {t('forum_topic_detail.actions.message')}
                            </DropdownMenuItem>
                            {(canEditTopic || canModerateTopic) && <DropdownMenuSeparator />}
                          </>
                        )}
                        {canEditTopic && (
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            {t('forum_topic_detail.actions.edit')}
                          </DropdownMenuItem>
                        )}
                        {!canModerateTopic && user && String(user.id) !== topic.user_id && (
                          <DropdownMenuItem onClick={() => void handleReportTopic()}>
                            <Flag className="mr-2 h-4 w-4" />
                            {t('forum_topic_detail.actions.report_topic')}
                          </DropdownMenuItem>
                        )}
                        {canModerateTopic && (
                          <>
                            <DropdownMenuItem>
                              <Pin className="mr-2 h-4 w-4" />
                              {topic.is_pinned ? t('forum_topic_detail.actions.unpin') : t('forum_topic_detail.actions.pin')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Lock className="mr-2 h-4 w-4" />
                              {topic.status === 'locked' ? t('forum_topic_detail.actions.unlock') : t('forum_topic_detail.actions.lock')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('forum_topic_detail.actions.delete')}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {topic.tags && topic.tags.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {topic.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />
              </header>

              <div className="prose prose-slate mb-8 max-w-none whitespace-pre-wrap break-words dark:prose-invert">
                {topic.content}
              </div>

              <div className="flex items-center justify-between border-b border-t py-6">
                <div className="flex items-center gap-4">
                  <Button variant={isLiked ? 'default' : 'outline'} size="sm" onClick={handleLike} disabled={!user}>
                    <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    {topic.likes}
                  </Button>

                  <Button variant={isBookmarked ? 'default' : 'outline'} size="sm" onClick={handleBookmark} disabled={!user}>
                    {isBookmarked ? <BookmarkCheck className="mr-2 h-4 w-4" /> : <Bookmark className="mr-2 h-4 w-4" />}
                    {t('forum_topic_detail.actions.save')}
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    {t('forum_topic_detail.actions.share')}
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!user || String(user.id) === topic.user_id}
                  onClick={() => void handleReportTopic()}
                >
                  <Flag className="mr-2 h-4 w-4" />
                  {t('forum_topic_detail.actions.report')}
                </Button>
              </div>
            </article>

            <div className="mt-8">
              <h3 className="mb-6 text-xl">{t('forum_topic_detail.replies', { count: topic.replies })}</h3>
              <EnhancedCommentSystem
                postId={topic.topic_id}
                postType="forum_topic"
                allowVoting={true}
                showModeration={canModerateTopic}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('forum_topic_detail.sidebar.stats_title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>{t('forum_topic_detail.sidebar.views')}</span>
                    <span>{topic.views}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('forum_topic_detail.sidebar.likes')}</span>
                    <span>{topic.likes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('forum_topic_detail.sidebar.replies')}</span>
                    <span>{topic.replies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('forum_topic_detail.sidebar.reports')}</span>
                    <span>{topic.report_count}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>{t('forum_topic_detail.sidebar.created_at')}</span>
                    <span className="text-sm">{topic.created_date.toLocaleDateString()}</span>
                  </div>
                  {topic.updated_date.getTime() !== topic.created_date.getTime() && (
                    <div className="flex justify-between">
                      <span>{t('forum_topic_detail.sidebar.updated_at')}</span>
                      <span className="text-sm">{topic.updated_date.toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('forum_topic_detail.sidebar.forum_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="mb-3">
                    {topic.forum_title}
                  </Badge>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/forum')}>
                    {t('forum_topic_detail.sidebar.view_forum')}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('forum_topic_detail.sidebar.related_topics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t('forum_topic_detail.sidebar.related_placeholder')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
