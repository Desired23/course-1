import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Skeleton } from '../../components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Search, HelpCircle } from 'lucide-react'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { type Question, getQuestions } from '../../services/qa.api'
import { QuestionCard } from '../../components/qa/QuestionCard'

type SortOption = 'newest' | 'votes' | 'unanswered'

const POPULAR_TAGS = ['python', 'django', 'javascript', 'react', 'css', 'sql', 'api', 'html', 'git', 'testing']

export function QuestionsPage() {
  const { navigate, location } = useRouter()
  const { user } = useAuth()

  const params = new URLSearchParams(location?.search ?? '')
  const initialTag = params.get('tag') ?? ''
  const initialSearch = params.get('search') ?? ''

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(initialSearch)
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [activeTag, setActiveTag] = useState(initialTag)
  const [sort, setSort] = useState<SortOption>('newest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getQuestions({
        search: search || undefined,
        tag: activeTag || undefined,
        sort,
        page,
        page_size: 20,
      })
      setQuestions(res.results)
      setTotalPages(res.total_pages)
      setTotalCount(res.count)
    } catch {
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [search, activeTag, sort, page])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleTagClick = (tag: string) => {
    setActiveTag(prev => prev === tag ? '' : tag)
    setPage(1)
  }

  const handleSortChange = (value: string) => {
    setSort(value as SortOption)
    setPage(1)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Tìm kiếm câu hỏi..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">Tìm</Button>
          </form>

          {/* Sort tabs */}
          <div className="flex items-center justify-between mb-4">
            <Tabs value={sort} onValueChange={handleSortChange}>
              <TabsList>
                <TabsTrigger value="newest">Mới nhất</TabsTrigger>
                <TabsTrigger value="votes">Nhiều vote</TabsTrigger>
                <TabsTrigger value="unanswered">Chưa trả lời</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Active filters */}
          {(activeTag || search) && (
            <div className="flex flex-wrap gap-2 mb-4 text-sm text-gray-500">
              {activeTag && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  tag: {activeTag}
                  <button onClick={() => setActiveTag('')} className="ml-1 text-blue-400 hover:text-blue-700">×</button>
                </span>
              )}
              {search && (
                <span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  "{search}"
                  <button onClick={() => { setSearch(''); setSearchInput('') }} className="ml-1 hover:text-gray-900">×</button>
                </span>
              )}
            </div>
          )}

          {/* Questions list */}
          <div className="border rounded-lg overflow-hidden bg-white">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border-b">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : questions.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <HelpCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Không tìm thấy câu hỏi nào</p>
                {user && (
                  <Button variant="link" onClick={() => navigate('/qa/ask')}>
                    Đặt câu hỏi đầu tiên →
                  </Button>
                )}
              </div>
            ) : (
              questions.map(q => <QuestionCard key={q.id} question={q} />)
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Trước
              </Button>
              <span className="flex items-center text-sm text-gray-600">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Sau →
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-52 shrink-0 hidden md:block">
          <div className="sticky top-4 space-y-4">
            {!user && (
              <div className="border rounded-lg p-4 bg-blue-50 text-center">
                <p className="text-sm text-blue-700 mb-3 font-medium">
                  Đăng nhập để đặt câu hỏi và vote
                </p>
                <Button size="sm" className="w-full" onClick={() => navigate('/login')}>
                  Đăng nhập
                </Button>
              </div>
            )}

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Tags phổ biến</h3>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={activeTag === tag ? 'default' : 'secondary'}
                    className="cursor-pointer text-xs hover:bg-blue-100"
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
