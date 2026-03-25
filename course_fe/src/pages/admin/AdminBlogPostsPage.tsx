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
import { Switch } from "../../components/ui/switch"
import { Checkbox } from "../../components/ui/checkbox"
import { AdminBulkActionBar } from '../../components/admin/AdminBulkActionBar'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { Plus, Edit, Trash2, Eye, Calendar, User, Tag } from 'lucide-react'
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


export function AdminBlogPostsPage() {
  const { navigate } = useRouter()
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
      } catch { toast.error('Không thể tải bài viết') }
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
    confirmLabel: 'Confirm',
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
      toast.success('Blog post created successfully!')
    } catch { toast.error('Tạo bài viết thất bại') }
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
      toast.success('Blog post updated successfully!')
    } catch { toast.error('Cập nhật thất bại') }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteBlogPost(Number(postId))
      setBlogPosts(prev => prev.filter(p => p.id !== postId))
      toast.success('Blog post deleted successfully!')
    } catch { toast.error('X??a th???t b???i') }
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
      toast.error('Bulk blog action failed')
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
      toast.error('Vui lòng chọn file ảnh hợp lệ')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB')
      return
    }
    try {
      setIsUploadingFeaturedImage(true)
      const uploaded = await uploadFiles([file])
      if (!uploaded?.length) throw new Error('Upload failed')
      setFormData((prev) => ({ ...prev, featuredImage: uploaded[0].url }))
      toast.success('Tải ảnh lên thành công')
    } catch (err) {
      console.error('Featured image upload failed:', err)
      toast.error('Tải ảnh thất bại')
    } finally {
      setIsUploadingFeaturedImage(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blog Posts</h1>
          <p className="text-muted-foreground">Manage all blog posts and articles</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Blog Post</DialogTitle>
              <DialogDescription>
                Add a new blog post to your website
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter post title"
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
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    placeholder="post-url-slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author *</Label>
                  <Input
                    id="author"
                    placeholder="Author name"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="tag1, tag2, tag3"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="excerpt">Excerpt *</Label>
                  <Textarea
                    id="excerpt"
                    placeholder="Short description of the post"
                    rows={3}
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    placeholder="Full content of the post (supports markdown)"
                    rows={8}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="featuredImage">Featured Image</Label>
                  <Input
                    id="featuredImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFeaturedImageUpload(e.target.files?.[0])}
                  />
                  {isUploadingFeaturedImage && <p className="text-sm text-muted-foreground">Đang tải ảnh lên...</p>}
                  {formData.featuredImage && (
                    <ImageWithFallback
                      src={formData.featuredImage}
                      alt="Featured preview"
                      className="w-full max-w-sm h-40 rounded object-cover border"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select 
                    value={formData.status}
                    onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePost}>
                Create Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Posts</CardDescription>
            <CardTitle className="text-3xl">{blogPosts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Published</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {blogPosts.filter(p => p.status === 'published').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Drafts</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {blogPosts.filter(p => p.status === 'draft').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Views</CardDescription>
            <CardTitle className="text-3xl">
              {blogPosts.reduce((sum, p) => sum + p.views, 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by title, author, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <AdminBulkActionBar
        count={selectedPostIds.length}
        label="posts selected"
        onClear={() => setSelectedPostIds([])}
        actions={[
          {
            key: 'publish',
            label: 'Publish',
            onClick: () => openConfirm(
              'Publish selected posts',
              `Publish ${selectedPostIds.length} selected blog posts?`,
              'Publish',
              () => bulkUpdatePosts(selectedPostIds, (id) => changePostStatus(id, 'published'), 'Da xuat ban bai viet da chon'),
            ),
          },
          {
            key: 'draft',
            label: 'Move to draft',
            onClick: () => openConfirm(
              'Move selected posts to draft',
              `Move ${selectedPostIds.length} selected posts back to draft?`,
              'Move to draft',
              () => bulkUpdatePosts(selectedPostIds, (id) => changePostStatus(id, 'draft'), 'Da chuyen bai viet ve draft'),
            ),
          },
          {
            key: 'delete',
            label: 'Delete',
            destructive: true,
            onClick: () => openConfirm(
              'Delete selected posts',
              `Delete ${selectedPostIds.length} selected blog posts? This action cannot be undone.`,
              'Delete',
              async () => {
                await bulkDeletePosts(selectedPostIds)
                setSelectedPostIds([])
                toast.success('Da xoa bai viet da chon')
              },
              true,
            ),
          },
        ]}
      />

      {/* Blog Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Blog Posts ({filteredPosts.length})</CardTitle>
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
                <TableHead>Post</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Loading blog posts...
                  </TableCell>
                </TableRow>
              ) : filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No blog posts match the current filters.
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
                      {post.status}
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
                          post.status === 'published' ? 'Move post to draft' : 'Publish post',
                          post.status === 'published'
                            ? `Move "${post.title}" back to draft?`
                            : `Publish "${post.title}" now?`,
                          post.status === 'published' ? 'Move to draft' : 'Publish',
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
                          'Delete blog post',
                          `Delete "${post.title}"? This action cannot be undone.`,
                          'Delete',
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>
              Make changes to your blog post
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-slug">URL Slug *</Label>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-author">Author *</Label>
                <Input
                  id="edit-author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
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
                <Label htmlFor="edit-tags">Tags</Label>
                <Input
                  id="edit-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-excerpt">Excerpt *</Label>
                <Textarea
                  id="edit-excerpt"
                  rows={3}
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-content">Content *</Label>
                <Textarea
                  id="edit-content"
                  rows={8}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-featuredImage">Featured Image</Label>
                <Input
                  id="edit-featuredImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFeaturedImageUpload(e.target.files?.[0])}
                />
                {isUploadingFeaturedImage && <p className="text-sm text-muted-foreground">Đang tải ảnh lên...</p>}
                {formData.featuredImage && (
                  <ImageWithFallback
                    src={formData.featuredImage}
                    alt="Featured preview"
                    className="w-full max-w-sm h-40 rounded object-cover border"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status *</Label>
                <Select 
                  value={formData.status}
                  onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
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
              Cancel
            </Button>
            <Button onClick={handleUpdatePost}>
              Update Post
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

