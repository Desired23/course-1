import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Skeleton } from '../../components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Label } from '../../components/ui/label'
import { Separator } from '../../components/ui/separator'
import { Search, Plus, Eye, MessageCircle, Heart, Share2, Clock, Filter, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { motion } from 'motion/react'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import {
  type BlogPost as ApiBlogPost,
  type BlogComment as ApiBlogComment,
  getAllPublishedBlogPosts,
  getAdminBlogPosts,
  createBlogPost,
  updateBlogPost,
  getAllBlogComments,
  createBlogComment,
} from '../../services/blog-posts.api'
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



interface BlogPost {
  id: string
  title: string
  content: string
  excerpt: string
  author: {
    name: string
    avatar: string
    role: string
  }
  category: string
  tags: string[]
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  createdAt: Date
  updatedAt: Date
  views: number
  likes: number
  comments: number
  featured: boolean
}

interface Comment {
  id: string
  postId: string
  author: {
    name: string
    avatar: string
  }
  content: string
  createdAt: Date
  likes: number
  replies: Comment[]
}

function mapApiPostToUi(p: ApiBlogPost): BlogPost {
  const statusMap: Record<string, BlogPost['status']> = {
    published: 'approved',
    draft: 'draft',
    archived: 'rejected',
  }
  return {
    id: String(p.id),
    title: p.title,
    content: p.content,
    excerpt: p.summary || p.content.substring(0, 150) + '...',
    author: {
      name: p.author_name || 'Unknown',
      avatar: p.author_avatar || '/api/placeholder/40/40',
      role: 'Author',
    },
    category: p.category_name || 'General',
    tags: p.tags || [],
    status: statusMap[p.status] || 'draft',
    createdAt: new Date(p.created_at),
    updatedAt: new Date(p.updated_at),
    views: p.views,
    likes: p.likes,
    comments: p.comments_count,
    featured: p.is_featured,
  }
}

function mapApiCommentToUi(c: ApiBlogComment, allComments: ApiBlogComment[]): Comment {
  return {
    id: String(c.id),
    postId: String(c.blog_post),
    author: {
      name: c.user_name || 'Unknown',
      avatar: c.user_avatar || '/api/placeholder/32/32',
    },
    content: c.content,
    createdAt: new Date(c.created_at),
    likes: c.likes,
    replies: allComments
      .filter(r => r.parent === c.id)
      .map(r => mapApiCommentToUi(r, allComments)),
  }
}

export function BlogPage() {
  const { user, hasPermission, hasRole } = useAuth()
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('published')
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    tags: ''
  })


  const [posts, setPosts] = useState<BlogPost[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const isAdmin = hasRole('admin') || hasRole('instructor')
      let apiPosts: ApiBlogPost[]
      if (isAdmin) {
        const res = await getAdminBlogPosts({ page_size: 100 })
        apiPosts = res.results
      } else {
        apiPosts = await getAllPublishedBlogPosts()
      }
      setPosts(apiPosts.map(mapApiPostToUi))
    } catch (err) {
      console.error('Failed to load blog posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCommentsForPost = async (postId: string) => {
    try {
      const apiComments = await getAllBlogComments(Number(postId))
      const rootComments = apiComments.filter(c => c.parent === null)
      setComments(rootComments.map(c => mapApiCommentToUi(c, apiComments)))
    } catch (err) {
      console.error('Failed to load comments:', err)
    }
  }

  const canCreatePosts = hasPermission('instructor.blog.create')
  const canApprovePosts = hasPermission('admin.blog.approve')

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'published' && post.status === 'approved') ||
                      (activeTab === 'pending' && post.status === 'pending') ||
                      (activeTab === 'drafts' && post.status === 'draft') ||
                      (activeTab === 'my-posts' && post.author.name === user?.name)

    return matchesSearch && matchesCategory && matchesTab
  })

  const handleCreatePost = async () => {
    try {
      await createBlogPost({
        title: newPost.title,
        content: newPost.content,
        summary: newPost.excerpt,
        category: undefined,
        tags: newPost.tags.split(',').map(t => t.trim()).filter(Boolean),
        slug: newPost.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      })
      setIsCreateDialogOpen(false)
      setNewPost({ title: '', content: '', excerpt: '', category: '', tags: '' })
      loadPosts()
    } catch (err) {
      console.error('Failed to create post:', err)
    }
  }

  const handleApprovePost = async (postId: string) => {
    try {
      await updateBlogPost(Number(postId), { status: 'published' })
      loadPosts()
    } catch (err) {
      console.error('Failed to approve post:', err)
    }
  }

  const handleRejectPost = async (postId: string) => {
    try {
      await updateBlogPost(Number(postId), { status: 'archived' })
      loadPosts()
    } catch (err) {
      console.error('Failed to reject post:', err)
    }
  }

  const getStatusIcon = (status: BlogPost['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const renderPostCard = (post: BlogPost) => (
    <Card key={post.id} className="app-interactive hover:shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(post.status)}
              <Badge variant={post.status === 'approved' ? 'default' :
                             post.status === 'pending' ? 'secondary' : 'destructive'}>
                {post.status === 'approved' ? t('blog.status_approved') :
                 post.status === 'pending' ? t('blog.status_pending') :
                 post.status === 'rejected' ? t('blog.status_rejected') :
                 t('blog.status_draft')}
              </Badge>
              {post.featured && <Badge variant="outline">{t('blog.featured_badge')}</Badge>}
            </div>
            <CardTitle className="line-clamp-2">{post.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-2">{post.excerpt}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.author.avatar} />
              <AvatarFallback>{post.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{post.author.name}</p>
              <p className="text-xs text-muted-foreground">{post.author.role}</p>
            </div>
          </div>
          <Badge variant="outline">{post.category}</Badge>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {post.tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {post.views}
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {post.likes}
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {post.comments}
            </div>
          </div>
          <p>{post.createdAt.toLocaleDateString()}</p>
        </div>


        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPost(post)
              loadCommentsForPost(post.id)
            }}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            {t('blog.quick_view')}
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`/blog/${post.id}`)}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {t('blog.view_detail')}
          </Button>
        </div>

        {canApprovePosts && post.status === 'pending' && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleApprovePost(post.id) }}>
              {t('blog.approve')}
            </Button>
            <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleRejectPost(post.id) }}>
              {t('blog.reject')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`blog-skeleton-${index}`} className="rounded-lg border bg-card p-4 space-y-3">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="container mx-auto p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="flex justify-between items-center" variants={fadeInUp} initial="hidden" animate="show">
        <div>
          <h1 className="text-3xl font-bold">{t('blog.title')}</h1>
          <p className="text-muted-foreground">{t('blog.articles_subtitle')}</p>
        </div>
        {canCreatePosts && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('blog.create_post')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('blog.create_post_title')}</DialogTitle>
                <DialogDescription>
                  {t('blog.create_post_desc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">{t('blog.title_field')}</Label>
                  <Input
                    id="title"
                    value={newPost.title}
                    onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                    placeholder={t('blog.title_placeholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="excerpt">{t('blog.excerpt_field')}</Label>
                  <Input
                    id="excerpt"
                    value={newPost.excerpt}
                    onChange={(e) => setNewPost({...newPost, excerpt: e.target.value})}
                    placeholder={t('blog.excerpt_placeholder')}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="category">{t('blog.category_field')}</Label>
                    <Select value={newPost.category} onValueChange={(value) => setNewPost({...newPost, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('blog.select_category')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Education">{t('blog.categories.education')}</SelectItem>
                        <SelectItem value="Technology">{t('blog.categories.technology')}</SelectItem>
                        <SelectItem value="Business">{t('blog.categories.business')}</SelectItem>
                        <SelectItem value="Design">{t('blog.categories.design')}</SelectItem>
                        <SelectItem value="Content Creation">{t('blog.categories.content_creation')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tags">{t('blog.tags_field')}</Label>
                    <Input
                      id="tags"
                      value={newPost.tags}
                      onChange={(e) => setNewPost({...newPost, tags: e.target.value})}
                      placeholder={t('blog.tags_placeholder')}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="content">{t('blog.content_field')}</Label>
                  <Textarea
                    id="content"
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    placeholder={t('blog.content_placeholder')}
                    rows={10}
                  />
                </div>
                <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
                    {t('blog.cancel')}
                  </Button>
                  <Button onClick={handleCreatePost} className="w-full sm:w-auto">
                    {t('blog.submit_for_review')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>


      <motion.div className="app-surface-elevated flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:gap-4" variants={fadeInUp} initial="hidden" animate="show">
        <div className="relative w-full flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('blog.search_posts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('blog.all_categories')}</SelectItem>
            <SelectItem value="Education">{t('blog.categories.education')}</SelectItem>
            <SelectItem value="Technology">{t('blog.categories.technology')}</SelectItem>
            <SelectItem value="Business">{t('blog.categories.business')}</SelectItem>
            <SelectItem value="Design">{t('blog.categories.design')}</SelectItem>
            <SelectItem value="Content Creation">{t('blog.categories.content_creation')}</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div variants={sectionStagger} initial="hidden" animate="show">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="relative w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="published" className="relative shrink-0 whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'published' && <motion.span layoutId="blog-page-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('blog.published_tab')}</span>
          </TabsTrigger>
          {canApprovePosts && <TabsTrigger value="pending" className="relative shrink-0 whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:shadow-none">{activeTab === 'pending' && <motion.span layoutId="blog-page-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}<span className="relative z-10">{t('blog.pending_tab')}</span></TabsTrigger>}
          {canCreatePosts && <TabsTrigger value="my-posts" className="relative shrink-0 whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:shadow-none">{activeTab === 'my-posts' && <motion.span layoutId="blog-page-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}<span className="relative z-10">{t('blog.my_posts_tab')}</span></TabsTrigger>}
          {canCreatePosts && <TabsTrigger value="drafts" className="relative shrink-0 whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:shadow-none">{activeTab === 'drafts' && <motion.span layoutId="blog-page-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}<span className="relative z-10">{t('blog.drafts_tab')}</span></TabsTrigger>}
          {hasRole('admin') && <TabsTrigger value="all" className="relative shrink-0 whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:shadow-none">{activeTab === 'all' && <motion.span layoutId="blog-page-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}<span className="relative z-10">{t('blog.all_tab')}</span></TabsTrigger>}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <motion.div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" variants={fadeInUp}>
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={listItemTransition(index)}
                whileHover={{ y: -2 }}
              >
                {renderPostCard(post)}
              </motion.div>
            ))}
          </motion.div>

          {filteredPosts.length === 0 && (
            <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">{t('blog.no_posts_found')}</p>
              </CardContent>
            </Card>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
      </motion.div>


      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(selectedPost.status)}
                <Badge variant={selectedPost.status === 'approved' ? 'default' :
                               selectedPost.status === 'pending' ? 'secondary' : 'destructive'}>
                  {selectedPost.status === 'approved' ? t('blog.status_approved') :
                   selectedPost.status === 'pending' ? t('blog.status_pending') :
                   selectedPost.status === 'rejected' ? t('blog.status_rejected') :
                   t('blog.status_draft')}
                </Badge>
                {selectedPost.featured && <Badge variant="outline">{t('blog.featured_badge')}</Badge>}
              </div>
              <DialogTitle className="text-2xl">{selectedPost.title}</DialogTitle>
              <DialogDescription>
                {t('blog.post_details')}
              </DialogDescription>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedPost.author.avatar} />
                    <AvatarFallback>{selectedPost.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{selectedPost.author.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedPost.author.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {selectedPost.views}
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {selectedPost.likes}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {selectedPost.comments}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-1">
                {selectedPost.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <Separator />

              <div className="prose max-w-none">
                <p>{selectedPost.content}</p>
              </div>

              <Separator />


              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('blog.comments_count', { count: selectedPost.comments })}</h3>
                <div className="space-y-4">
                  {comments.filter(comment => comment.postId === selectedPost.id).map((comment) => (
                    <div key={comment.id} className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.author.avatar} />
                          <AvatarFallback>{comment.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{comment.author.name}</p>
                            <p className="text-xs text-muted-foreground">{comment.createdAt.toLocaleDateString()}</p>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="h-8 px-2">
                              <Heart className="h-3 w-3 mr-1" />
                              {comment.likes}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2">
                              {t('blog.reply')}
                            </Button>
                          </div>
                        </div>
                      </div>


                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="ml-11 flex items-start gap-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={reply.author.avatar} />
                            <AvatarFallback>{reply.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium">{reply.author.name}</p>
                              <p className="text-xs text-muted-foreground">{reply.createdAt.toLocaleDateString()}</p>
                            </div>
                            <p className="text-xs">{reply.content}</p>
                            <Button size="sm" variant="ghost" className="h-6 px-1 text-xs">
                              <Heart className="h-3 w-3 mr-1" />
                              {reply.likes}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>


                {user && (
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea placeholder={t('blog.add_comment_placeholder')} rows={3} />
                      <Button size="sm">{t('blog.submit_comment')}</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Heart className="h-4 w-4 mr-2" />
                  {t('blog.like')}
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('blog.share')}
                </Button>
              </div>

              {canApprovePosts && selectedPost.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprovePost(selectedPost.id)}>
                    {t('blog.approve')}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleRejectPost(selectedPost.id)}>
                    {t('blog.reject')}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  )
}
