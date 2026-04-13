import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Skeleton } from '../../components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Separator } from '../../components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb'
import {
  ArrowLeft,
  Eye,
  Heart,
  Share2,
  Clock,
  Calendar,
  Tag,
  Bookmark,
  BookmarkCheck,
  Flag,
  MoreVertical,
  Edit,
  Trash2,
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
import { motion } from 'motion/react'
import {
  type BlogPost as ApiBlogPost,
  getPublishedBlogPost,
  getAdminBlogPost,
  increaseViews,
} from '../../services/blog-posts.api'
import { useTranslation } from 'react-i18next'
import { listItemTransition } from '../../lib/motion'

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

interface BlogPostDetail {
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
  publishedAt?: Date
  views: number
  likes: number
  bookmarks: number
  comments: number
  featured: boolean
  readTime: number
}

const getAuthorInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

export function BlogPostDetailPage() {
  const { navigate, currentRoute } = useRouter()
  const { user, hasPermission } = useAuth()
  const { t } = useTranslation()
  const [post, setPost] = useState<BlogPostDetail | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(true)

  const postId = currentRoute.split('/blog/')[1]

  useEffect(() => {
    void loadPost()
  }, [postId])

  const mapApiPostToDetail = (apiPost: ApiBlogPost): BlogPostDetail => {
    const wordCount = apiPost.content.split(/\s+/).length
    const readTime = Math.max(1, Math.ceil(wordCount / 200))

    return {
      id: String(apiPost.id),
      title: apiPost.title,
      content: apiPost.content,
      excerpt: apiPost.summary || `${apiPost.content.substring(0, 150)}...`,
      author: {
        name: apiPost.author_name || t('blog_post_detail_page.fallbacks.unknown_author'),
        avatar: apiPost.author_avatar || '/api/placeholder/60/60',
        role: apiPost.author_title || t('blog_post_detail_page.fallbacks.author_role'),
      },
      category: apiPost.category_name || t('blog_post_detail_page.fallbacks.general_category'),
      tags: apiPost.tags || [],
      publishedAt: apiPost.published_at ? new Date(apiPost.published_at) : undefined,
      views: apiPost.views,
      likes: apiPost.likes,
      bookmarks: 0,
      comments: apiPost.comments_count,
      featured: apiPost.is_featured,
      readTime,
    }
  }

  const loadPost = async () => {
    if (!postId) return

    setLoading(true)
    try {
      const apiPost = await getPublishedBlogPost(Number(postId))
      setPost(mapApiPostToDetail(apiPost))
      try {
        await increaseViews(Number(postId))
      } catch {}
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
    if (!user || !post) return

    setIsLiked(!isLiked)
    setPost({
      ...post,
      likes: isLiked ? post.likes - 1 : post.likes + 1,
    })
  }

  const handleBookmark = () => {
    if (!user || !post) return

    setIsBookmarked(!isBookmarked)
    setPost({
      ...post,
      bookmarks: isBookmarked ? post.bookmarks - 1 : post.bookmarks + 1,
    })
  }

  const handleShare = () => {
    if (!post) return

    if (navigator.share) {
      void navigator.share({
        title: post.title,
        text: post.excerpt,
        url: window.location.href,
      })
      return
    }

    void navigator.clipboard.writeText(window.location.href)
  }

  const canEditPost =
    !!user &&
    (hasPermission('admin.blog.manage') ||
      hasPermission('instructor.blog.edit') ||
      user.email === post?.author.name)

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6 sm:p-6">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-9 w-4/5" />
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-6 sm:p-6">
        <div className="py-12 text-center">
          <h2 className="mb-4 text-2xl">{t('blog_post_detail_page.not_found')}</h2>
          <Button onClick={() => navigate('/blog')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('blog_post_detail_page.back_to_blog')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="container mx-auto max-w-4xl px-4 py-6 sm:p-6"
        variants={sectionStagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeInUp}>
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/')}>
                {t('blog_post_detail_page.breadcrumb.home')}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/blog')}>
                {t('blog_post_detail_page.breadcrumb.blog')}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{post.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        </motion.div>

        <motion.div variants={fadeInUp}>
        <Button variant="ghost" onClick={() => navigate('/blog')} className="mb-6 w-full justify-start sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('blog_post_detail_page.back_to_blog')}
        </Button>
        </motion.div>

        <motion.div className="grid gap-8 lg:grid-cols-4" variants={fadeInUp}>
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={listItemTransition(0)}
          >
            <article>
              <header className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <Badge variant="default">{post.category}</Badge>
                  {post.featured && (
                    <Badge variant="outline">{t('blog_post_detail_page.featured')}</Badge>
                  )}
                  <Badge variant="secondary">
                    <Clock className="mr-1 h-3 w-3" />
                    {t('blog_post_detail_page.read_time', { count: post.readTime })}
                  </Badge>
                </div>

                <h1 className="mb-6 text-2xl sm:text-3xl lg:text-4xl">{post.title}</h1>

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={post.author.avatar} />
                      <AvatarFallback>{getAuthorInitials(post.author.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{post.author.name}</p>
                      <p className="text-sm text-muted-foreground">{post.author.role}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {post.publishedAt?.toLocaleDateString('vi-VN')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {t('blog_post_detail_page.views_count', { count: post.views })}
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
                          <Edit className="mr-2 h-4 w-4" />
                          {t('blog_post_detail_page.actions.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('blog_post_detail_page.actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="mb-6 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="mr-1 h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>

                <Separator />
              </header>

              <div
                className="prose prose-slate mb-8 max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              <div className="flex items-center justify-between border-b border-t py-6">
                <div className="flex items-center gap-4">
                  <Button
                    variant={isLiked ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleLike}
                    disabled={!user}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    {post.likes}
                  </Button>

                  <Button
                    variant={isBookmarked ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleBookmark}
                    disabled={!user}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="mr-2 h-4 w-4" />
                    ) : (
                      <Bookmark className="mr-2 h-4 w-4" />
                    )}
                    {post.bookmarks}
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    {t('blog_post_detail_page.actions.share')}
                  </Button>
                </div>

                <Button variant="ghost" size="sm">
                  <Flag className="mr-2 h-4 w-4" />
                  {t('blog_post_detail_page.actions.report')}
                </Button>
              </div>
            </article>

            <div className="mt-8">
              <h3 className="mb-6 text-xl">
                {t('blog_post_detail_page.comments_title', { count: post.comments })}
              </h3>
              <EnhancedCommentSystem
                postId={post.id}
                postType="blog"
                allowVoting={true}
                showModeration={hasPermission('admin.comments.moderate')}
              />
            </div>
          </motion.div>

          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={listItemTransition(1)}
          >
            <div className="space-y-6 lg:sticky lg:top-8">
              <Card className="app-surface-elevated">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t('blog_post_detail_page.about_author')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <Avatar className="mx-auto mb-4 h-16 w-16">
                      <AvatarImage src={post.author.avatar} />
                      <AvatarFallback>{getAuthorInitials(post.author.name)}</AvatarFallback>
                    </Avatar>
                    <h4 className="font-medium">{post.author.name}</h4>
                    <p className="mb-3 text-sm text-muted-foreground">{post.author.role}</p>
                    {post.author.bio && (
                      <p className="mb-4 text-sm text-muted-foreground">{post.author.bio}</p>
                    )}

                    {post.author.social && (
                      <div className="flex justify-center gap-2">
                        {post.author.social.website && (
                          <Button size="sm" variant="outline">
                            {t('blog_post_detail_page.social.website')}
                          </Button>
                        )}
                        {post.author.social.twitter && (
                          <Button size="sm" variant="outline">
                            {t('blog_post_detail_page.social.twitter')}
                          </Button>
                        )}
                        {post.author.social.linkedin && (
                          <Button size="sm" variant="outline">
                            {t('blog_post_detail_page.social.linkedin')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="app-surface-elevated">
                <CardHeader>
                  <CardTitle className="text-lg">{t('blog_post_detail_page.stats.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>{t('blog_post_detail_page.stats.views')}</span>
                    <span>{post.views}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('blog_post_detail_page.stats.likes')}</span>
                    <span>{post.likes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('blog_post_detail_page.stats.bookmarks')}</span>
                    <span>{post.bookmarks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('blog_post_detail_page.stats.comments')}</span>
                    <span>{post.comments}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>{t('blog_post_detail_page.stats.read_time')}</span>
                    <span>
                      {t('blog_post_detail_page.stats.read_time_value', {
                        count: post.readTime,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="app-surface-elevated">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t('blog_post_detail_page.related_posts.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('blog_post_detail_page.related_posts.description')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
