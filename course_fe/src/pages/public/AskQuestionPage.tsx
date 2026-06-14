import React, { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { ArrowLeft, X, HelpCircle } from 'lucide-react'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { createQuestion, updateQuestion, getQuestion } from '../../services/qa.api'

export function AskQuestionPage() {
  const { navigate } = useRouter()
  const { user } = useAuth()

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const editId = params.get('edit') ? Number(params.get('edit')) : null

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!!editId)

  useEffect(() => {
    if (!editId) return
    getQuestion(editId)
      .then(q => {
        setTitle(q.title)
        setContent(q.content)
        setTags(q.tags ?? [])
      })
      .catch(() => setError('Không thể tải câu hỏi.'))
      .finally(() => setLoading(false))
  }, [editId])

  if (!user) {
    navigate('/login')
    return null
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags(prev => [...prev, tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('Vui lòng điền tiêu đề và nội dung câu hỏi.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      if (editId) {
        await updateQuestion(editId, { title: title.trim(), content: content.trim(), tags })
        navigate(`/qa/${editId}`)
      } else {
        const question = await createQuestion({ title: title.trim(), content: content.trim(), tags })
        navigate(`/qa/${question.id}`)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-500">
        Đang tải...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/qa')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      <div className="flex items-center gap-2 mb-6">
        <HelpCircle className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">
          {editId ? 'Chỉnh sửa câu hỏi' : 'Đặt câu hỏi'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">
            Tiêu đề <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            placeholder="Câu hỏi của bạn là gì? Hãy ngắn gọn và rõ ràng."
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={255}
          />
          <p className="text-xs text-gray-400">{title.length}/255</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="content">
            Nội dung chi tiết <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="content"
            placeholder="Mô tả chi tiết vấn đề bạn gặp phải. Hãy bao gồm code, thông báo lỗi hoặc các bước bạn đã thử..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="min-h-[200px] text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tags">
            Tags <span className="text-gray-400 font-normal">(tối đa 5)</span>
          </Label>
          <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[40px] focus-within:ring-1 focus-within:ring-ring">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <input
              id="tags"
              className="flex-1 min-w-[80px] outline-none text-sm bg-transparent placeholder:text-gray-400"
              placeholder={tags.length < 5 ? 'Nhập tag rồi Enter...' : 'Đã đủ 5 tags'}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              disabled={tags.length >= 5}
            />
          </div>
          <p className="text-xs text-gray-400">
            Ví dụ: python, django, react, css. Nhấn Enter hoặc dấu phẩy để thêm tag.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting || !title.trim() || !content.trim()}>
            {submitting ? (editId ? 'Đang lưu...' : 'Đang đăng...') : (editId ? 'Lưu thay đổi' : 'Đăng câu hỏi')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/qa')}>
            Hủy
          </Button>
        </div>
      </form>
    </div>
  )
}
