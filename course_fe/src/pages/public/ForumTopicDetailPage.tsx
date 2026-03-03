import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Separator } from '../../components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../../components/ui/breadcrumb'
import { 
  ArrowLeft, 
  Eye, 
  Heart, 
  MessageCircle, 
  Clock, 
  Calendar,
  Pin,
  Lock,
  MoreVertical,
  Edit,
  Trash2,
  Flag,
  Share2,
  Bookmark,
  BookmarkCheck
} from 'lucide-react'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { EnhancedCommentSystem } from '../../components/EnhancedCommentSystem'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import {
  type ForumTopic as ApiForumTopic,
  getForumTopicById,
  updateForumTopic,
  getAllForumComments,
  createForumComment,
  updateForumComment,
  deleteForumComment,
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
  replies: number
  status: 'active' | 'locked' | 'deleted'
  is_pinned: boolean
  tags?: string[]
}

function mapApiTopicToDetail(t: ApiForumTopic): ForumTopic {
  return {
    topic_id: String(t.id),
    forum_id: String(t.forum),
    forum_title: t.forum_title || 'Forum',
    title: t.title,
    content: t.content,
    user_id: String(t.user),
    user_name: t.user_name || `User ${t.user}`,
    user_avatar: t.user_avatar || undefined,
    user_role: undefined,
    created_date: new Date(t.created_at),
    updated_date: new Date(t.updated_at),
    views: t.views,
    likes: t.likes,
    replies: t.replies_count,
    status: t.status,
    is_pinned: t.is_pinned,
    tags: [],
  }
}

export function ForumTopicDetailPage() {
  const { navigate, currentRoute } = useRouter()
  const { user, hasRole, hasPermission } = useAuth()
  const [topic, setTopic] = useState<ForumTopic | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Extract topic ID from URL
  const topicId = currentRoute.split('/forum/topic/')[1]

  useEffect(() => {
    loadTopic()
  }, [topicId])

  const loadTopic = async () => {
    if (!topicId) return
    setLoading(true)
    try {
      const apiTopic = await getForumTopicById(Number(topicId))
      setTopic(mapApiTopicToDetail(apiTopic))
    } catch (err) {
      console.error('Failed to load topic:', err)
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
        likes: isLiked ? topic.likes - 1 : topic.likes + 1
      })
    }
  }

  const handleBookmark = () => {
    if (!user) return
    setIsBookmarked(!isBookmarked)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: topic?.title,
        text: `Check out this forum discussion: ${topic?.title}`,
        url: window.location.href,
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const canEditTopic = user && (
    hasPermission('admin.forum.moderate') || 
    user.id === topic?.user_id
  )

  const canModerateTopic = hasRole('admin') || hasPermission('admin.forum.moderate')

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

  if (!topic) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Chủ đề không tìm thấy</h2>
          <Button onClick={() => navigate('/forum')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại Diễn đàn
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/')}>Trang chủ</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/forum')}>Diễn đàn</BreadcrumbLink>
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

        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/forum')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại Diễn đàn
        </Button>

        {/* Main content */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Topic content */}
          <div className="lg:col-span-3">
            <article>
              {/* Header */}
              <header className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  {topic.is_pinned && (
                    <Badge variant="default" className="bg-blue-500">
                      <Pin className="h-3 w-3 mr-1" />
                      Đã ghim
                    </Badge>
                  )}
                  {topic.status === 'locked' && (
                    <Badge variant="secondary">
                      <Lock className="h-3 w-3 mr-1" />
                      Đã khóa
                    </Badge>
                  )}
                  <Badge variant="outline">{topic.forum_title}</Badge>
                </div>

                <h1 className="text-4xl mb-6">{topic.title}</h1>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={topic.user_avatar} />
                      <AvatarFallback>{topic.user_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
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
                          {topic.views} lượt xem
                        </span>
                      </div>
                    </div>
                  </div>

                  {(canEditTopic || canModerateTopic) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEditTopic && (
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                        )}
                        {canModerateTopic && (
                          <>
                            <DropdownMenuItem>
                              <Pin className="h-4 w-4 mr-2" />
                              {topic.is_pinned ? 'Bỏ ghim' : 'Ghim chủ đề'}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Lock className="h-4 w-4 mr-2" />
                              {topic.status === 'locked' ? 'Mở khóa' : 'Khóa chủ đề'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa chủ đề
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Tags */}
                {topic.tags && topic.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {topic.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />
              </header>

              {/* Topic content */}
              <div 
                className="prose prose-slate max-w-none dark:prose-invert mb-8"
                dangerouslySetInnerHTML={{ __html: topic.content }}
              />

              {/* Action buttons */}
              <div className="flex items-center justify-between py-6 border-t border-b">
                <div className="flex items-center gap-4">
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    size="sm"
                    onClick={handleLike}
                    disabled={!user}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                    {topic.likes}
                  </Button>

                  <Button
                    variant={isBookmarked ? "default" : "outline"}
                    size="sm"
                    onClick={handleBookmark}
                    disabled={!user}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 mr-2" />
                    ) : (
                      <Bookmark className="h-4 w-4 mr-2" />
                    )}
                    Lưu
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Chia sẻ
                  </Button>
                </div>

                <Button variant="ghost" size="sm">
                  <Flag className="h-4 w-4 mr-2" />
                  Báo cáo
                </Button>
              </div>
            </article>

            {/* Replies section */}
            <div className="mt-8">
              <h3 className="text-xl mb-6">Trả lời ({topic.replies})</h3>
              <EnhancedCommentSystem 
                postId={topic.topic_id}
                postType="forum_topic"
                allowVoting={true}
                showModeration={canModerateTopic}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Topic stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thống kê</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Lượt xem:</span>
                    <span>{topic.views}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lượt thích:</span>
                    <span>{topic.likes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trả lời:</span>
                    <span>{topic.replies}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Tạo lúc:</span>
                    <span className="text-sm">{topic.created_date.toLocaleDateString()}</span>
                  </div>
                  {topic.updated_date.getTime() !== topic.created_date.getTime() && (
                    <div className="flex justify-between">
                      <span>Cập nhật:</span>
                      <span className="text-sm">{topic.updated_date.toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Forum info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Diễn đàn</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="mb-3">{topic.forum_title}</Badge>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/forum')}
                  >
                    Xem diễn đàn
                  </Button>
                </CardContent>
              </Card>

              {/* Related topics placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Chủ đề liên quan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tính năng này sẽ được phát triển trong phiên bản tiếp theo.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
