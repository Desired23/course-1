import React, { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { ArrowLeft, Upload, X, ImageIcon, Clock, FileText, Save, Send } from 'lucide-react'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { BlogRichEditor } from '../../components/BlogRichEditor'
import { createBlogPost, updateBlogPost, getAdminBlogPost } from '../../services/blog-posts.api'
import { uploadFiles } from '../../services/upload.api'
import { getActiveCategories, type Category } from '../../services/category.api'
import { toast } from 'sonner'
import { getErrorMessage } from '../../lib/apiError'

export function BlogCreatePage() {
  const { navigate, currentRoute } = useRouter()
  const { user } = useAuth()

  const editId = new URLSearchParams(currentRoute.split('?')[1] || '').get('edit')
  const isEditing = !!editId

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [summary, setSummary] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [slug, setSlug] = useState('')
  const [editingSlug, setEditingSlug] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploadingEditorImage, setUploadingEditorImage] = useState(false)

  useEffect(() => {
    getActiveCategories().then((r) => setCategories(r.results)).catch((e) => toast.error(getErrorMessage(e, 'Không thể tải danh mục.')))
  }, [])

  useEffect(() => {
    if (!editId) return
    getAdminBlogPost(Number(editId))
      .then((p) => {
        setTitle(p.title)
        setContent(p.content)
        setSummary(p.summary || '')
        setCategoryId(p.category ? String(p.category) : '')
        setTags(p.tags || [])
        setSlug(p.slug || '')
        if (p.featured_image) setCoverPreview(p.featured_image)
      })
      .catch(() => toast.error('Không thể tải bài viết'))
  }, [editId])

  useEffect(() => {
    if (!editingSlug) {
      setSlug(
        title
          .toLowerCase()
          .replace(/đ/g, 'd')
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
      )
    }
  }, [title, editingSlug])

  const handleCoverChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh bìa phải nhỏ hơn 5MB')
      return
    }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const uploadCover = async (): Promise<string> => {
    if (!coverFile) return ''
    const [uploaded] = await uploadFiles([coverFile], { folder: 'blog_covers', resource_type: 'image' })
    return uploaded.url
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim().replace(/,$/, '')
      if (newTag && !tags.includes(newTag)) {
        setTags((prev) => [...prev, newTag])
      }
      setTagInput('')
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  const handleSave = async (publishStatus: 'draft' | 'published') => {
    if (uploadingEditorImage) return
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài viết')
      return
    }
    if (!content || content.replace(/<[^>]*>/g, '').trim() === '') {
      toast.error('Vui lòng nhập nội dung bài viết')
      return
    }

    const isSavingDraft = publishStatus === 'draft'
    isSavingDraft ? setSaving(true) : setPublishing(true)

    try {
      let imageUrl = ''
      if (coverFile) {
        imageUrl = await uploadCover()
      }

      const payload = {
        title: title.trim(),
        content,
        summary: summary.trim() || undefined,
        slug: slug || undefined,
        category: categoryId ? Number(categoryId) : undefined,
        tags,
        featured_image: imageUrl || undefined,
        status: publishStatus,
      }

      if (isEditing) {
        await updateBlogPost(Number(editId), payload)
        toast.success(isSavingDraft ? 'Đã cập nhật nháp thành công!' : 'Bài viết đã được cập nhật!')
      } else {
        await createBlogPost(payload)
        toast.success(isSavingDraft ? 'Đã lưu nháp thành công!' : 'Bài viết đã được gửi duyệt!')
      }
      navigate('/blog')
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      isSavingDraft ? setSaving(false) : setPublishing(false)
    }
  }

  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/blog')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại Blog
          </Button>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {wordCount > 0 ? `${wordCount.toLocaleString()} từ · ${readingTime} phút đọc` : 'Chưa có nội dung'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave('draft')}
              disabled={saving || publishing || uploadingEditorImage}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Đang lưu...' : isEditing ? 'Cập nhật nháp' : 'Lưu nháp'}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave('published')}
              disabled={saving || publishing || uploadingEditorImage}
            >
              <Send className="mr-2 h-4 w-4" />
              {publishing ? 'Đang lưu...' : isEditing ? 'Cập nhật bài viết' : 'Gửi duyệt'}
            </Button>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
          {/* ── Left: editor area ── */}
          <div className="space-y-6">
            {/* Cover image drop zone */}
            <div
              className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 transition-colors hover:border-primary/40 hover:bg-muted/30"
              onClick={() => document.getElementById('blog-cover-upload')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) handleCoverChange(f)
              }}
            >
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="Ảnh bìa" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Upload className="h-8 w-8 text-white" />
                    <p className="text-sm font-medium text-white">Thay đổi ảnh bìa</p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute right-3 top-3 h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCoverFile(null)
                      setCoverPreview('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 opacity-40" />
                  <div>
                    <p className="font-medium">Thêm ảnh bìa</p>
                    <p className="text-sm opacity-60">Kéo thả hoặc nhấp để chọn · Tối đa 5MB</p>
                  </div>
                </div>
              )}
            </div>
            <input
              id="blog-cover-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleCoverChange(f)
                e.target.value = ''
              }}
            />

            {/* Title */}
            <div className="space-y-1">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề bài viết..."
                className="w-full border-none bg-transparent p-0 text-4xl font-bold leading-tight placeholder:text-muted-foreground/40 focus:outline-none"
              />
              {slug && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="shrink-0">Slug:</span>
                  {editingSlug ? (
                    <input
                      value={slug}
                      onChange={(e) =>
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                      onBlur={() => setEditingSlug(false)}
                      autoFocus
                      className="min-w-0 flex-1 rounded border px-1.5 py-0.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingSlug(true)}
                      className="font-mono text-xs hover:underline truncate max-w-[300px]"
                    >
                      /blog/{slug}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Rich text editor */}
            <BlogRichEditor
              content={content}
              onChange={setContent}
              placeholder="Bắt đầu viết bài của bạn tại đây... Sử dụng thanh công cụ phía trên để định dạng văn bản, thêm ảnh, liên kết và nhiều hơn nữa."
              minHeight="500px"
              onUploadingChange={setUploadingEditorImage}
            />
          </div>

          {/* ── Right: settings sidebar ── */}
          <div className="space-y-5 lg:sticky lg:top-[65px] lg:self-start">
            {/* Post settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Thông tin bài viết</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Danh mục</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Chọn danh mục..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tags</Label>
                  <div className="flex min-h-[42px] flex-wrap gap-1.5 rounded-md border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder={tags.length === 0 ? 'Thêm tag...' : ''}
                      className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Enter hoặc dấu phẩy để thêm tag</p>
                </div>

                <Separator />

                {/* Summary */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tóm tắt</Label>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Mô tả ngắn gọn về bài viết..."
                    rows={3}
                    maxLength={500}
                    className="resize-none text-sm"
                  />
                  <p className="text-right text-xs text-muted-foreground">{summary.length}/500</p>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center rounded-lg bg-muted/40 p-3">
                    <FileText className="mb-1 h-5 w-5 text-muted-foreground" />
                    <span className="text-xl font-bold">{wordCount.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">từ</span>
                  </div>
                  <div className="flex flex-col items-center rounded-lg bg-muted/40 p-3">
                    <Clock className="mb-1 h-5 w-5 text-muted-foreground" />
                    <span className="text-xl font-bold">{readingTime}</span>
                    <span className="text-xs text-muted-foreground">phút đọc</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Author */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                    {user?.avatar && (
                      <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user?.name || 'Tác giả'}</p>
                    <p className="text-xs text-muted-foreground">Tác giả bài viết</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions (repeated for mobile convenience) */}
            <div className="flex gap-2 lg:hidden">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleSave('draft')}
                disabled={saving || publishing || uploadingEditorImage}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Đang lưu...' : isEditing ? 'Cập nhật nháp' : 'Lưu nháp'}
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleSave('published')}
                disabled={saving || publishing || uploadingEditorImage}
              >
                <Send className="mr-2 h-4 w-4" />
                {publishing ? 'Đang lưu...' : isEditing ? 'Cập nhật bài viết' : 'Gửi duyệt'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
