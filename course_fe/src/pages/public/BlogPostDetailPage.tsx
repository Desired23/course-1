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
  Share2, 
  Clock, 
  Calendar,
  User,
  Tag,
  Bookmark,
  BookmarkCheck,
  Flag,
  MoreVertical,
  Edit,
  Trash2
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
  type BlogPost as ApiBlogPost,
  getPublishedBlogPost,
  getAdminBlogPost,
  increaseViews,
} from '../../services/blog-posts.api'

interface BlogPost {
  id: string
  title: string
  content: string
  excerpt: string
  author: {
    name: string
    avatar: string
    role: string
    bio?: string
    social?: {
      website?: string
      twitter?: string
      linkedin?: string
    }
  }
  category: string
  tags: string[]
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  views: number
  likes: number
  bookmarks: number
  comments: number
  featured: boolean
  readTime: number
  seoMeta?: {
    description: string
    keywords: string[]
  }
}

function mapApiPostToDetail(p: ApiBlogPost): BlogPost {
  const wordCount = p.content.split(/\s+/).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  return {
    id: String(p.id),
    title: p.title,
    content: p.content,
    excerpt: p.summary || p.content.substring(0, 150) + '...',
    author: {
      name: p.author_name || 'Unknown',
      avatar: p.author_avatar || '/api/placeholder/60/60',
      role: 'Author',
    },
    category: p.category_name || 'General',
    tags: p.tags || [],
    status: p.status === 'published' ? 'approved' : p.status === 'draft' ? 'draft' : 'rejected',
    createdAt: new Date(p.created_at),
    updatedAt: new Date(p.updated_at),
    publishedAt: p.published_at ? new Date(p.published_at) : undefined,
    views: p.views,
    likes: p.likes,
    bookmarks: 0,
    comments: p.comments_count,
    featured: p.is_featured,
    readTime,
  }
}

export function BlogPostDetailPage() {
  const { navigate, currentRoute } = useRouter()
  const { user, hasPermission } = useAuth()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Extract post ID from URL
  const postId = currentRoute.split('/blog/')[1]

  useEffect(() => {
    loadPost()
  }, [postId])

  const loadPost = async () => {
    if (!postId) return
    setLoading(true)
    try {
      const apiPost = await getPublishedBlogPost(Number(postId))
      setPost(mapApiPostToDetail(apiPost))
      // Increment view count
      try { await increaseViews(Number(postId)) } catch {}
    } catch {
      try {
        const apiPost = await getAdminBlogPost(Number(postId))
        setPost(mapApiPostToDetail(apiPost))
      } catch {
        setPost(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLike = () => {
    if (!user) return
    setIsLiked(!isLiked)
    if (post) {
      setPost({
        ...post,
        likes: isLiked ? post.likes - 1 : post.likes + 1
      })
    }
  }

  const handleBookmark = () => {
    if (!user) return
    setIsBookmarked(!isBookmarked)
    if (post) {
      setPost({
        ...post,
        bookmarks: isBookmarked ? post.bookmarks - 1 : post.bookmarks + 1
      })
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        text: post?.excerpt,
        url: window.location.href,
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const canEditPost = user && (
    hasPermission('admin.blog.manage') || 
    hasPermission('instructor.blog.edit') ||
    (user.email === post?.author.name) // Simple author check
  )

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

  if (!post) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Bài viết không tìm thấy</h2>
          <Button onClick={() => navigate('/blog')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại Blog
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
              <BreadcrumbLink onClick={() => navigate('/blog')}>Blog</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{post.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/blog')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại Blog
        </Button>

        {/* Main content */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Article content */}
          <div className="lg:col-span-3">
            <article>
              {/* Header */}
              <header className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="default">{post.category}</Badge>
                  {post.featured && <Badge variant="outline">Featured</Badge>}
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {post.readTime} phút đọc
                  </Badge>
                </div>

                <h1 className="text-4xl mb-6">{post.title}</h1>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={post.author.avatar} />
                      <AvatarFallback>{post.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{post.author.name}</p>
                      <p className="text-sm text-muted-foreground">{post.author.role}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {post.publishedAt?.toLocaleDateString('vi-VN')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.views} lượt xem
                        </span>
                      </div>
                    </div>
                  </div>

                  {canEditPost && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa bài viết
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>

                <Separator />
              </header>

              {/* Article body */}
              <div 
                className="prose prose-slate max-w-none dark:prose-invert mb-8"
                dangerouslySetInnerHTML={{ __html: post.content }}
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
                    {post.likes}
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
                    {post.bookmarks}
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

            {/* Comments section */}
            <div className="mt-8">
              <h3 className="text-xl mb-6">Bình luận ({post.comments})</h3>
              <EnhancedCommentSystem 
                postId={post.id}
                postType="blog"
                allowVoting={true}
                showModeration={hasPermission('admin.comments.moderate')}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Author info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Về tác giả</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <Avatar className="h-16 w-16 mx-auto mb-4">
                      <AvatarImage src={post.author.avatar} />
                      <AvatarFallback>{post.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <h4 className="font-medium">{post.author.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{post.author.role}</p>
                    {post.author.bio && (
                      <p className="text-sm text-muted-foreground mb-4">{post.author.bio}</p>
                    )}
                    
                    {post.author.social && (
                      <div className="flex justify-center gap-2">
                        {post.author.social.website && (
                          <Button size="sm" variant="outline">Website</Button>
                        )}
                        {post.author.social.twitter && (
                          <Button size="sm" variant="outline">Twitter</Button>
                        )}
                        {post.author.social.linkedin && (
                          <Button size="sm" variant="outline">LinkedIn</Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thống kê bài viết</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Lượt xem:</span>
                    <span>{post.views}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lượt thích:</span>
                    <span>{post.likes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lưu:</span>
                    <span>{post.bookmarks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bình luận:</span>
                    <span>{post.comments}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Thời gian đọc:</span>
                    <span>{post.readTime} phút</span>
                  </div>
                </CardContent>
              </Card>

              {/* Related posts placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bài viết liên quan</CardTitle>
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
