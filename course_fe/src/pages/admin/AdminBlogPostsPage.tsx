import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../../components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Switch } from "../../components/ui/switch"
import { Checkbox } from "../../components/ui/checkbox"
import { AdminBulkActionBar } from '../../components/admin/AdminBulkActionBar'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { Plus, Edit, Trash2, Eye, Calendar, User, Tag } from 'lucide-react'
import { motion } from 'motion/react'
import { useRouter } from "../../components/Router"
import { toast } from "sonner"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { getAdminBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost } from '../../services/blog-posts.api'
import type { BlogPost as ApiBlogPost } from '../../services/blog-posts.api'
import { uploadFiles } from '../../services/upload.api'
import { getAllCategories, type Category } from '../../services/category.api'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  author: string
  category: string
  tags: string[]
  featuredImage: string
  status: 'draft' | 'published'
  views: number
  publishedAt: string
  createdAt: string
}

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


export function AdminBlogPostsPage() {
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const mapApiBlogPost = (p: ApiBlogPost): BlogPost => ({
    id: String(p.id),
    title: p.title,
    slug: p.slug,
    excerpt: p.summary || '',
    content: p.content,
    author: p.author_name || '',
    category: p.category_name || '',
    tags: p.tags || [],
    featuredImage: p.featured_image || '',
    status: p.status === 'archived' ? 'draft' : p.status as 'draft' | 'published',
    views: p.views,
    publishedAt: p.published_at || '',
    createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString() : ''
  })

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true)
      try {
        const [res, categoriesRes] = await Promise.all([
          getAdminBlogPosts({ page_size: 200 }),
          getAllCategories({ page_size: 200 }),
        ])
        setBlogPosts((res.results ?? []).map(mapApiBlogPost))
        setCategories(categoriesRes.results ?? [])
      } catch {
        toast.error(t('admin_blog_posts.toasts.load_failed'))
      }
      setIsLoading(false)
    }
    fetchPosts()
  }, [])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all')
  const [isUploadingFeaturedImage, setIsUploadingFeaturedImage] = useState(false)
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([])
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

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: '',
    category: '',
    tags: '',
    featuredImage: '',
    status: 'draft' as 'draft' | 'published'
  })

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || post.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleCreatePost = async () => {
    try {
      const created = await createBlogPost({
        title: formData.title,
        content: formData.content,
        summary: formData.excerpt,
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        category: formData.category ? Number(formData.category) : null,
        featured_image: formData.featuredImage || undefined,
        status: formData.status
      })
      setBlogPosts(prev => [...prev, mapApiBlogPost(created)])
      setIsCreateDialogOpen(false)
      resetForm()
      toast.success(t('admin_blog_posts.toasts.create_success'))
    } catch {
      toast.error(t('admin_blog_posts.toasts.create_failed'))
    }
  }

  const handleUpdatePost = async () => {
    if (!selectedPost) return
    try {
      const updated = await updateBlogPost(Number(selectedPost.id), {
        title: formData.title,
        content: formData.content,
        summary: formData.excerpt,
        slug: formData.slug,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        category: formData.category ? Number(formData.category) : null,
        featured_image: formData.featuredImage || undefined,
        status: formData.status
      })
      setBlogPosts(prev => prev.map(p => p.id === selectedPost.id ? mapApiBlogPost(updated) : p))
      setIsEditDialogOpen(false)
      setSelectedPost(null)
      resetForm()
      toast.success(t('admin_blog_posts.toasts.update_success'))
    } catch {
      toast.error(t('admin_blog_posts.toasts.update_failed'))
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteBlogPost(Number(postId))
      setBlogPosts(prev => prev.filter(p => p.id !== postId))
      toast.success(t('admin_blog_posts.toasts.delete_success'))
    } catch { toast.error(t('admin_blog_posts.toasts.delete_failed')) }
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

  const togglePostSelection = (postId: string, checked: boolean) => {
    setSelectedPostIds(prev => checked ? [...prev, postId] : prev.filter(id => id !== postId))
  }

  const toggleAllFilteredPosts = (checked: boolean) => {
    setSelectedPostIds(checked ? filteredPosts.map(post => post.id) : [])
  }

  const changePostStatus = async (postId: string, status: 'draft' | 'published') => {
    const updated = await updateBlogPost(Number(postId), { status })
    setBlogPosts(prev => prev.map(post => post.id === postId ? mapApiBlogPost(updated) : post))
  }

  const bulkDeletePosts = async (ids: string[]) => {
    for (const id of ids) {
      await deleteBlogPost(Number(id))
    }
    setBlogPosts(prev => prev.filter(post => !ids.includes(post.id)))
  }

  const bulkUpdatePosts = async (
    ids: string[],
    updater: (postId: string) => Promise<void>,
    successMessage: string
  ) => {
    try {
      for (const id of ids) {
        await updater(id)
      }
      setSelectedPostIds([])
      toast.success(successMessage)
    } catch {
      toast.error(t('admin_blog_posts.toasts.bulk_failed'))
    }
  }

  const openEditDialog = (post: BlogPost) => {
    setSelectedPost(post)
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      category: categories.find(category => category.name === post.category)?.id?.toString() || '',
      tags: post.tags.join(', '),
      featuredImage: post.featuredImage,
      status: post.status
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      author: '',
      category: '',
      tags: '',
      featuredImage: '',
      status: 'draft'
    })
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleFeaturedImageUpload = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('admin_blog_posts.toasts.invalid_image'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('admin_blog_posts.toasts.image_too_large'))
      return
    }
    try {
      setIsUploadingFeaturedImage(true)
      const uploaded = await uploadFiles([file])
      if (!uploaded?.length) throw new Error('Upload failed')
      setFormData((prev) => ({ ...prev, featuredImage: uploaded[0].url }))
      toast.success(t('admin_blog_posts.toasts.upload_success'))
    } catch (err) {
      console.error('Featured image upload failed:', err)
      toast.error(t('admin_blog_posts.toasts.upload_failed'))
    } finally {
      setIsUploadingFeaturedImage(false)
    }
  }

  return (
    <motion.div className="p-6 space-y-6" variants={sectionStagger} initial="hidden" animate="show">

      <motion.div className="flex items-center justify-between" variants={fadeInUp}>
        <div>
          <h1 className="text-3xl font-bold">{t('admin_blog_posts.title')}</h1>
          <p className="text-muted-foreground">{t('admin_blog_posts.subtitle')}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('admin_blog_posts.create_post')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('admin_blog_posts.dialogs.create_title')}</DialogTitle>
              <DialogDescription>
                {t('admin_blog_posts.dialogs.create_description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="title">{t('admin_blog_posts.form.title')}</Label>
                  <Input
                    id="title"
                    placeholder={t('admin_blog_posts.form.title_placeholder')}
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        title: e.target.value,
                        slug: generateSlug(e.target.value)
                      })
                    }}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="slug">{t('admin_blog_posts.form.slug')}</Label>
                  <Input
                    id="slug"
                    placeholder={t('admin_blog_posts.form.slug_placeholder')}
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">{t('admin_blog_posts.form.author')}</Label>
                  <Input
                    id="author"
                    placeholder={t('admin_blog_posts.form.author_placeholder')}
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">{t('admin_blog_posts.form.category')}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_blog_posts.form.category_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="tags">{t('admin_blog_posts.form.tags')}</Label>
                  <Input
                    id="tags"
                    placeholder={t('admin_blog_posts.form.tags_placeholder')}
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="excerpt">{t('admin_blog_posts.form.excerpt')}</Label>
                  <Textarea
                    id="excerpt"
                    placeholder={t('admin_blog_posts.form.excerpt_placeholder')}
                    rows={3}
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="content">{t('admin_blog_posts.form.content')}</Label>
                  <Textarea
                    id="content"
                    placeholder={t('admin_blog_posts.form.content_placeholder')}
                    rows={8}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="featuredImage">{t('admin_blog_posts.form.featured_image')}</Label>
                  <Input
                    id="featuredImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFeaturedImageUpload(e.target.files?.[0])}
                  />
                  {isUploadingFeaturedImage && <p className="text-sm text-muted-foreground">{t('admin_blog_posts.uploading')}</p>}
                  {formData.featuredImage && (
                    <ImageWithFallback
                      src={formData.featuredImage}
                      alt={t('admin_blog_posts.featured_preview')}
                      className="w-full max-w-sm h-40 rounded object-cover border"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">{t('admin_blog_posts.form.status')}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t('admin_blog_posts.status.draft')}</SelectItem>
                      <SelectItem value="published">{t('admin_blog_posts.status.published')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreatePost}>
                {t('admin_blog_posts.create_post')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>


      <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4" variants={fadeInUp}>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('admin_blog_posts.stats.total_posts')}</CardDescription>
            <CardTitle className="text-3xl">{blogPosts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('admin_blog_posts.stats.published')}</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {blogPosts.filter(p => p.status === 'published').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('admin_blog_posts.stats.drafts')}</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {blogPosts.filter(p => p.status === 'draft').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('admin_blog_posts.stats.total_views')}</CardDescription>
            <CardTitle className="text-3xl">
              {blogPosts.reduce((sum, p) => sum + p.views, 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </motion.div>


      <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle>{t('admin_blog_posts.filter_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('admin_blog_posts.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin_blog_posts.filters.all_status')}</SelectItem>
                <SelectItem value="published">{t('admin_blog_posts.status.published')}</SelectItem>
                <SelectItem value="draft">{t('admin_blog_posts.status.draft')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <AdminBulkActionBar
        count={selectedPostIds.length}
        label={t('admin_blog_posts.bulk.selected_label')}
        onClear={() => setSelectedPostIds([])}
        actions={[
          {
            key: 'publish',
            label: t('admin_blog_posts.bulk.publish'),
            onClick: () => openConfirm(
              t('admin_blog_posts.bulk.publish_title'),
              t('admin_blog_posts.bulk.publish_description', { count: selectedPostIds.length }),
              t('admin_blog_posts.bulk.publish'),
              () => bulkUpdatePosts(selectedPostIds, (id) => changePostStatus(id, 'published'), t('admin_blog_posts.toasts.bulk_publish_success')),
            ),
          },
          {
            key: 'draft',
            label: t('admin_blog_posts.bulk.move_to_draft'),
            onClick: () => openConfirm(
              t('admin_blog_posts.bulk.move_to_draft_title'),
              t('admin_blog_posts.bulk.move_to_draft_description', { count: selectedPostIds.length }),
              t('admin_blog_posts.bulk.move_to_draft'),
              () => bulkUpdatePosts(selectedPostIds, (id) => changePostStatus(id, 'draft'), t('admin_blog_posts.toasts.bulk_move_to_draft_success')),
            ),
          },
          {
            key: 'delete',
            label: t('common.delete'),
            destructive: true,
            onClick: () => openConfirm(
              t('admin_blog_posts.bulk.delete_title'),
              t('admin_blog_posts.bulk.delete_description', { count: selectedPostIds.length }),
              t('common.delete'),
              async () => {
                await bulkDeletePosts(selectedPostIds)
                setSelectedPostIds([])
                toast.success(t('admin_blog_posts.toasts.bulk_delete_success'))
              },
              true,
            ),
          },
        ]}
      />
      </motion.div>


      <motion.div variants={fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle>{t('admin_blog_posts.table.title', { count: filteredPosts.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[48px]">
                  <Checkbox
                    checked={filteredPosts.length > 0 && selectedPostIds.length === filteredPosts.length}
                    onCheckedChange={(checked) => toggleAllFilteredPosts(Boolean(checked))}
                  />
                </TableHead>
                <TableHead>{t('admin_blog_posts.table.post')}</TableHead>
                <TableHead>{t('admin_blog_posts.table.author')}</TableHead>
                <TableHead>{t('admin_blog_posts.table.category')}</TableHead>
                <TableHead>{t('admin_blog_posts.table.status')}</TableHead>
                <TableHead>{t('admin_blog_posts.table.views')}</TableHead>
                <TableHead>{t('admin_blog_posts.table.date')}</TableHead>
                <TableHead className="text-right">{t('admin_blog_posts.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {t('admin_blog_posts.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {t('admin_blog_posts.empty')}
                  </TableCell>
                </TableRow>
              ) : filteredPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPostIds.includes(post.id)}
                      onCheckedChange={(checked) => togglePostSelection(post.id, Boolean(checked))}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {post.featuredImage && (
                        <ImageWithFallback
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-16 h-16 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{post.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {post.excerpt}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {post.tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {post.author}
                    </div>
                  </TableCell>
                  <TableCell>{post.category}</TableCell>
                  <TableCell>
                    <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                      {post.status === 'published' ? t('admin_blog_posts.status.published') : t('admin_blog_posts.status.draft')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      {post.views.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {post.publishedAt || post.createdAt}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/blog/${post.slug}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openConfirm(
                          post.status === 'published' ? t('admin_blog_posts.actions.move_to_draft_title') : t('admin_blog_posts.actions.publish_post_title'),
                          post.status === 'published'
                            ? t('admin_blog_posts.actions.move_to_draft_description', { title: post.title })
                            : t('admin_blog_posts.actions.publish_post_description', { title: post.title }),
                          post.status === 'published' ? t('admin_blog_posts.bulk.move_to_draft') : t('admin_blog_posts.bulk.publish'),
                          () => changePostStatus(post.id, post.status === 'published' ? 'draft' : 'published'),
                        )}
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(post)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openConfirm(
                          t('admin_blog_posts.actions.delete_title'),
                          t('admin_blog_posts.actions.delete_description', { title: post.title }),
                          t('common.delete'),
                          () => handleDeletePost(post.id),
                          true,
                        )}
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
      </motion.div>


      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin_blog_posts.dialogs.edit_title')}</DialogTitle>
            <DialogDescription>
              {t('admin_blog_posts.dialogs.edit_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-title">{t('admin_blog_posts.form.title')}</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-slug">{t('admin_blog_posts.form.slug')}</Label>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-author">{t('admin_blog_posts.form.author')}</Label>
                <Input
                  id="edit-author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">{t('admin_blog_posts.form.category')}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-tags">{t('admin_blog_posts.form.tags_edit')}</Label>
                <Input
                  id="edit-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-excerpt">{t('admin_blog_posts.form.excerpt')}</Label>
                <Textarea
                  id="edit-excerpt"
                  rows={3}
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-content">{t('admin_blog_posts.form.content')}</Label>
                <Textarea
                  id="edit-content"
                  rows={8}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-featuredImage">{t('admin_blog_posts.form.featured_image')}</Label>
                <Input
                  id="edit-featuredImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFeaturedImageUpload(e.target.files?.[0])}
                />
                {isUploadingFeaturedImage && <p className="text-sm text-muted-foreground">{t('admin_blog_posts.uploading')}</p>}
                {formData.featuredImage && (
                  <ImageWithFallback
                    src={formData.featuredImage}
                      alt={t('admin_blog_posts.featured_preview')}
                    className="w-full max-w-sm h-40 rounded object-cover border"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">{t('admin_blog_posts.form.status')}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('admin_blog_posts.status.draft')}</SelectItem>
                    <SelectItem value="published">{t('admin_blog_posts.status.published')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false)
              setSelectedPost(null)
              resetForm()
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdatePost}>
              {t('admin_blog_posts.update_post')}
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
    </motion.div>
  )
}



