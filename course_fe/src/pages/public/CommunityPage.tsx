import React, { useState, useEffect, useMemo } from 'react'
import {
  BookOpen, MessageSquare, ArrowRight, ChevronLeft,
  Search, Flame, Tag, Edit3, Eye,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Skeleton } from '../../components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import { getAllPublishedBlogPosts, type BlogPost } from '../../services/blog-posts.api'
import { getQuestions, type Question, formatQADate } from '../../services/qa.api'
import { QuestionCard } from '../../components/qa/QuestionCard'

const BLOG_CATEGORIES = ['all', 'Education', 'Technology', 'Business', 'Design', 'Content Creation']
const QA_POPULAR_TAGS = ['python', 'django', 'javascript', 'react', 'css', 'sql', 'api', 'html', 'git', 'testing']
const BLOG_PAGE_SIZE = 6
const QA_PAGE_SIZE = 8

function BlogPostCard({ post, onClick }: { post: BlogPost; onClick: () => void }) {
  return (
    <Card
      className="overflow-hidden hover:shadow-md transition-all cursor-pointer group border shadow-sm"
      onClick={onClick}
    >
      <div className="h-36 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20">
        {post.featured_image ? (
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-blue-300" />
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors leading-snug">
          {post.title}
        </h3>
        {post.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{post.summary}</p>
        )}
        <div className="flex items-center gap-1.5 mb-2">
          <Avatar className="h-4 w-4">
            <AvatarImage src={post.author_avatar ?? undefined} />
            <AvatarFallback className="text-xs">{post.author_name?.charAt(0) ?? '?'}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">{post.author_name ?? 'Ẩn danh'}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{formatQADate(post.created_at)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {post.tags?.slice(0, 2).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 h-4">{tag}</Badge>
            ))}
          </div>
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Eye className="w-3 h-3" /> {post.views}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function CommunityPage() {
  const { currentRoute, navigate } = useRouter()
  const { isAuthenticated } = useAuth()

  const focus = useMemo(() => {
    const qs = currentRoute.includes('?') ? currentRoute.split('?')[1] : ''
    const val = new URLSearchParams(qs).get('focus')
    return val === 'blog' || val === 'qa' ? val : 'overview'
  }, [currentRoute])

  // Blog
  const [allBlogPosts, setAllBlogPosts] = useState<BlogPost[]>([])
  const [blogLoading, setBlogLoading] = useState(true)
  const [blogPage, setBlogPage] = useState(1)
  const [blogSearchInput, setBlogSearchInput] = useState('')
  const [blogSearch, setBlogSearch] = useState('')
  const [blogCategory, setBlogCategory] = useState('all')

  // QA
  const [questions, setQuestions] = useState<Question[]>([])
  const [qaLoading, setQaLoading] = useState(true)
  const [qaPage, setQaPage] = useState(1)
  const [qaTotalPages, setQaTotalPages] = useState(1)
  const [qaSearchInput, setQaSearchInput] = useState('')
  const [qaSearch, setQaSearch] = useState('')
  const [qaTag, setQaTag] = useState('')
  const [qaSort, setQaSort] = useState<'newest' | 'votes' | 'unanswered'>('newest')

  // Overview sidebar
  const [hotQuestions, setHotQuestions] = useState<Question[]>([])
  const [activeTab, setActiveTab] = useState<'blog' | 'qa'>('blog')

  useEffect(() => {
    setBlogLoading(true)
    getAllPublishedBlogPosts()
      .then(posts => { setAllBlogPosts(posts); setBlogLoading(false) })
      .catch(() => setBlogLoading(false))
  }, [])

  useEffect(() => {
    if (focus !== 'overview') return
    getQuestions({ sort: 'votes', page_size: 5 })
      .then(res => setHotQuestions(res.results))
      .catch(() => {})
  }, [focus])

  useEffect(() => {
    setQaLoading(true)
    getQuestions({
      search: qaSearch || undefined,
      tag: qaTag || undefined,
      sort: qaSort,
      page: qaPage,
      page_size: QA_PAGE_SIZE,
    })
      .then(res => { setQuestions(res.results); setQaTotalPages(res.total_pages); setQaLoading(false) })
      .catch(() => setQaLoading(false))
  }, [qaPage, qaSearch, qaTag, qaSort])

  useEffect(() => { setBlogPage(1) }, [blogSearch, blogCategory])
  useEffect(() => { setQaPage(1) }, [qaSearch, qaTag, qaSort])

  const featuredPosts = useMemo(() => allBlogPosts.filter(p => p.is_featured).slice(0, 3), [allBlogPosts])

  const filteredBlogPosts = useMemo(() =>
    allBlogPosts.filter(p => {
      const matchSearch = !blogSearch ||
        p.title.toLowerCase().includes(blogSearch.toLowerCase()) ||
        (p.summary ?? '').toLowerCase().includes(blogSearch.toLowerCase())
      const matchCat = blogCategory === 'all' || p.category_name === blogCategory
      return matchSearch && matchCat
    }), [allBlogPosts, blogSearch, blogCategory])

  const blogTotalPages = Math.max(1, Math.ceil(filteredBlogPosts.length / BLOG_PAGE_SIZE))
  const pagedBlogPosts = filteredBlogPosts.slice((blogPage - 1) * BLOG_PAGE_SIZE, blogPage * BLOG_PAGE_SIZE)

  // ── Shared sections ───────────────────────────────────────────────────────

  const BlogContent = (
    <div>
      <div className="flex gap-2 mb-4">
        <form
          className="flex-1 relative"
          onSubmit={e => { e.preventDefault(); setBlogSearch(blogSearchInput) }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Tìm bài viết..."
            value={blogSearchInput}
            onChange={e => { setBlogSearchInput(e.target.value); if (!e.target.value) setBlogSearch('') }}
          />
        </form>
        <Select value={blogCategory} onValueChange={v => setBlogCategory(v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLOG_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat === 'all' ? 'Tất cả chủ đề' : cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {blogLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: BLOG_PAGE_SIZE }).map((_, i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
        </div>
      ) : pagedBlogPosts.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Không có bài viết nào.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {pagedBlogPosts.map(post => (
            <BlogPostCard key={post.id} post={post} onClick={() => navigate(`/blog/${post.slug}`)} />
          ))}
        </div>
      )}

      {blogTotalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={blogPage <= 1} onClick={() => setBlogPage(p => p - 1)}>Trước</Button>
          <span className="text-sm text-muted-foreground">{blogPage} / {blogTotalPages}</span>
          <Button variant="outline" size="sm" disabled={blogPage >= blogTotalPages} onClick={() => setBlogPage(p => p + 1)}>Sau</Button>
        </div>
      )}
    </div>
  )

  const QAContent = (
    <div>
      <form className="mb-3" onSubmit={e => { e.preventDefault(); setQaSearch(qaSearchInput) }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Tìm câu hỏi..."
            value={qaSearchInput}
            onChange={e => { setQaSearchInput(e.target.value); if (!e.target.value) setQaSearch('') }}
          />
        </div>
      </form>

      <div className="flex items-center justify-between mb-3">
        <Tabs value={qaSort} onValueChange={v => setQaSort(v as 'newest' | 'votes' | 'unanswered')}>
          <TabsList className="h-8">
            <TabsTrigger value="newest" className="text-xs h-6">Mới nhất</TabsTrigger>
            <TabsTrigger value="votes" className="text-xs h-6">Nhiều vote</TabsTrigger>
            <TabsTrigger value="unanswered" className="text-xs h-6">Chưa trả lời</TabsTrigger>
          </TabsList>
        </Tabs>
        {isAuthenticated && (
          <Button size="sm" onClick={() => navigate('/qa/ask')}>
            <Edit3 className="w-3 h-3 mr-1" /> Đặt câu hỏi
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {QA_POPULAR_TAGS.map(tag => (
          <Badge
            key={tag}
            variant={qaTag === tag ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setQaTag(qaTag === tag ? '' : tag)}
          >
            {tag}
          </Badge>
        ))}
        {qaTag && (
          <Badge
            variant="destructive"
            className="cursor-pointer text-xs"
            onClick={() => setQaTag('')}
          >
            × Bỏ lọc
          </Badge>
        )}
      </div>

      {qaLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : questions.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Không có câu hỏi nào.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden divide-y">
          {questions.map(q => <QuestionCard key={q.id} question={q} />)}
        </div>
      )}

      {qaTotalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={qaPage <= 1} onClick={() => setQaPage(p => p - 1)}>Trước</Button>
          <span className="text-sm text-muted-foreground">{qaPage} / {qaTotalPages}</span>
          <Button variant="outline" size="sm" disabled={qaPage >= qaTotalPages} onClick={() => setQaPage(p => p + 1)}>Sau</Button>
        </div>
      )}
    </div>
  )

  // ── Focus mode ────────────────────────────────────────────────────────────
  if (focus !== 'overview') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate('/community')}
            >
              <ChevronLeft className="w-4 h-4" /> Quay lại tổng quan
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm gap-1"
              onClick={() => navigate(`/community?focus=${focus === 'blog' ? 'qa' : 'blog'}`)}
            >
              Chuyển sang {focus === 'blog' ? 'Hỏi & Đáp' : 'Blog'} <ArrowRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              {focus === 'blog'
                ? <BookOpen className="w-6 h-6 text-blue-500" />
                : <MessageSquare className="w-6 h-6 text-green-500" />}
              <h1 className="text-2xl font-bold">
                {focus === 'blog' ? 'Bài viết Blog' : 'Hỏi & Đáp'}
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {focus === 'blog'
                ? 'Khám phá các bài viết kiến thức từ cộng đồng học tập'
                : 'Đặt câu hỏi và tìm câu trả lời từ cộng đồng'}
            </p>
          </div>

          {focus === 'blog' ? BlogContent : QAContent}
        </div>
      </div>
    )
  }

  // ── Overview mode ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 text-white py-14 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold mb-3">Cộng đồng học tập</h1>
          <p className="text-blue-100 text-lg mb-8">
            Thảo luận, chia sẻ kiến thức và kết nối với hàng nghìn học viên
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {isAuthenticated && (
              <Button variant="secondary" onClick={() => navigate('/blog')} className="gap-2">
                <BookOpen className="w-4 h-4" /> Viết bài
              </Button>
            )}
            <Button
              variant={isAuthenticated ? 'outline' : 'secondary'}
              onClick={() => navigate('/qa/ask')}
              className={`gap-2 ${isAuthenticated ? 'border-white/60 text-white hover:bg-white/10' : ''}`}
            >
              <MessageSquare className="w-4 h-4" /> Đặt câu hỏi
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {featuredPosts.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-yellow-500">★</span> Bài viết nổi bật
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/community?focus=blog')}
                className="gap-1 text-sm"
              >
                Xem tất cả <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featuredPosts.map(post => (
                <BlogPostCard key={post.id} post={post} onClick={() => navigate(`/blog/${post.slug}`)} />
              ))}
            </div>
          </section>
        )}

        <div className="flex gap-8 items-start">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'blog' | 'qa')}>
              <div className="flex items-center justify-between mb-5">
                <TabsList>
                  <TabsTrigger value="blog" className="gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Blog
                  </TabsTrigger>
                  <TabsTrigger value="qa" className="gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Hỏi & Đáp
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm gap-1"
                  onClick={() => navigate(`/community?focus=${activeTab}`)}
                >
                  Chỉ xem {activeTab === 'blog' ? 'Blog' : 'Hỏi & Đáp'} <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
              <TabsContent value="blog">{BlogContent}</TabsContent>
              <TabsContent value="qa">{QAContent}</TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="w-72 shrink-0 space-y-5">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" /> Q&A Hot
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                {hotQuestions.length === 0 ? (
                  <div className="px-4 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                  </div>
                ) : (
                  hotQuestions.map(q => (
                    <div
                      key={q.id}
                      className="px-4 py-2.5 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors"
                      onClick={() => navigate(`/qa/${q.id}`)}
                    >
                      <p className="text-sm font-medium line-clamp-2 text-blue-700 hover:text-blue-900 leading-snug mb-1">
                        {q.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-green-600 font-medium">{q.score} vote</span>
                        <span>{q.answer_count} trả lời</span>
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3" />{q.views}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div className="px-4 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => navigate('/community?focus=qa')}
                  >
                    Xem tất cả Hỏi & Đáp <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-500" /> Chủ đề phổ biến
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-wrap gap-1.5">
                  {QA_POPULAR_TAGS.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 text-xs"
                      onClick={() => { setActiveTab('qa'); setQaTag(tag); setQaPage(1) }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {!isAuthenticated && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-medium mb-3">Tham gia để đặt câu hỏi và chia sẻ bài viết</p>
                  <Button size="sm" className="w-full" onClick={() => navigate('/signup')}>
                    Đăng ký miễn phí
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full mt-1.5 text-xs"
                    onClick={() => navigate('/login')}
                  >
                    Đã có tài khoản? Đăng nhập
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
