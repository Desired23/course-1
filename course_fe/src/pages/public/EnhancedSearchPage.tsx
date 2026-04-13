import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter } from '../../components/Router'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Avatar } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import {
  Search,
  Filter,
  Star,
  Clock,
  Users,
  BookOpen,
  MessageCircle,
  Eye,
  CheckCircle,
  TrendingUp,
  Calendar,
  User,
  FileText,
  HelpCircle,
  ChevronRight,
  X
} from 'lucide-react'
import { toast } from 'sonner'

type SearchTab = 'all' | 'courses' | 'instructors' | 'articles' | 'qna'

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

export function EnhancedSearchPage() {
  const { navigate, params } = useRouter()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SearchTab>('all')
  const [searchQuery, setSearchQuery] = useState(params?.query || '')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([
    t('enhanced_search_page.recent.default_1'),
    t('enhanced_search_page.recent.default_2'),
    t('enhanced_search_page.recent.default_3'),
    t('enhanced_search_page.recent.default_4')
  ])

  const searchData = {
    courses: [
      {
        id: 1,
        title: t('enhanced_search_page.mock.courses.course_1.title'),
        instructor: 'Jonas Schmedtmann',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop',
        price: 89.99,
        originalPrice: 199.99,
        rating: 4.7,
        students: 45230,
        duration: t('enhanced_search_page.mock.courses.course_1.duration'),
        level: t('enhanced_search_page.mock.courses.course_1.level'),
        bestseller: true,
        category: t('enhanced_search_page.mock.courses.course_1.category'),
        tags: [
          t('enhanced_search_page.mock.courses.course_1.tag_1'),
          t('enhanced_search_page.mock.courses.course_1.tag_2'),
          t('enhanced_search_page.mock.courses.course_1.tag_3')
        ]
      },
      {
        id: 2,
        title: t('enhanced_search_page.mock.courses.course_2.title'),
        instructor: 'Maximilian Schwarzmuller',
        image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&h=200&fit=crop',
        price: 79.99,
        originalPrice: 159.99,
        rating: 4.5,
        students: 23167,
        duration: t('enhanced_search_page.mock.courses.course_2.duration'),
        level: t('enhanced_search_page.mock.courses.course_2.level'),
        bestseller: false,
        category: t('enhanced_search_page.mock.courses.course_2.category'),
        tags: [
          t('enhanced_search_page.mock.courses.course_2.tag_1'),
          t('enhanced_search_page.mock.courses.course_2.tag_2'),
          t('enhanced_search_page.mock.courses.course_2.tag_3')
        ]
      },
      {
        id: 3,
        title: t('enhanced_search_page.mock.courses.course_3.title'),
        instructor: 'Jose Portilla',
        image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=300&h=200&fit=crop',
        price: 94.99,
        originalPrice: 189.99,
        rating: 4.6,
        students: 67890,
        duration: t('enhanced_search_page.mock.courses.course_3.duration'),
        level: t('enhanced_search_page.mock.courses.course_3.level'),
        bestseller: true,
        category: t('enhanced_search_page.mock.courses.course_3.category'),
        tags: [
          t('enhanced_search_page.mock.courses.course_3.tag_1'),
          t('enhanced_search_page.mock.courses.course_3.tag_2'),
          t('enhanced_search_page.mock.courses.course_3.tag_3')
        ]
      }
    ],
    instructors: [
      {
        id: 1,
        name: 'Jonas Schmedtmann',
        title: t('enhanced_search_page.mock.instructors.instructor_1.title'),
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        rating: 4.8,
        students: 892456,
        courses: 12,
        expertise: [
          t('enhanced_search_page.mock.instructors.instructor_1.skill_1'),
          t('enhanced_search_page.mock.instructors.instructor_1.skill_2'),
          t('enhanced_search_page.mock.instructors.instructor_1.skill_3'),
          t('enhanced_search_page.mock.instructors.instructor_1.skill_4')
        ],
        verified: true,
        bio: t('enhanced_search_page.mock.instructors.instructor_1.bio')
      },
      {
        id: 2,
        name: 'Angela Yu',
        title: t('enhanced_search_page.mock.instructors.instructor_2.title'),
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        rating: 4.7,
        students: 564123,
        courses: 8,
        expertise: [
          t('enhanced_search_page.mock.instructors.instructor_2.skill_1'),
          t('enhanced_search_page.mock.instructors.instructor_2.skill_2'),
          t('enhanced_search_page.mock.instructors.instructor_2.skill_3'),
          t('enhanced_search_page.mock.instructors.instructor_2.skill_4')
        ],
        verified: true,
        bio: t('enhanced_search_page.mock.instructors.instructor_2.bio')
      },
      {
        id: 3,
        name: 'Maximilian Schwarzmuller',
        title: t('enhanced_search_page.mock.instructors.instructor_3.title'),
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        rating: 4.6,
        students: 423789,
        courses: 15,
        expertise: [
          t('enhanced_search_page.mock.instructors.instructor_3.skill_1'),
          t('enhanced_search_page.mock.instructors.instructor_3.skill_2'),
          t('enhanced_search_page.mock.instructors.instructor_3.skill_3'),
          t('enhanced_search_page.mock.instructors.instructor_3.skill_4')
        ],
        verified: true,
        bio: t('enhanced_search_page.mock.instructors.instructor_3.bio')
      }
    ],
    articles: [
      {
        id: 1,
        title: t('enhanced_search_page.mock.articles.article_1.title'),
        excerpt: t('enhanced_search_page.mock.articles.article_1.excerpt'),
        author: t('enhanced_search_page.mock.articles.article_1.author'),
        publishDate: '2024-01-15',
        readTime: t('enhanced_search_page.mock.articles.article_1.read_time'),
        tags: [
          t('enhanced_search_page.mock.articles.article_1.tag_1'),
          t('enhanced_search_page.mock.articles.article_1.tag_2'),
          t('enhanced_search_page.mock.articles.article_1.tag_3')
        ],
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop',
        views: 12450
      },
      {
        id: 2,
        title: t('enhanced_search_page.mock.articles.article_2.title'),
        excerpt: t('enhanced_search_page.mock.articles.article_2.excerpt'),
        author: t('enhanced_search_page.mock.articles.article_2.author'),
        publishDate: '2024-01-10',
        readTime: t('enhanced_search_page.mock.articles.article_2.read_time'),
        tags: [
          t('enhanced_search_page.mock.articles.article_2.tag_1'),
          t('enhanced_search_page.mock.articles.article_2.tag_2'),
          t('enhanced_search_page.mock.articles.article_2.tag_3')
        ],
        image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&h=200&fit=crop',
        views: 8750
      },
      {
        id: 3,
        title: t('enhanced_search_page.mock.articles.article_3.title'),
        excerpt: t('enhanced_search_page.mock.articles.article_3.excerpt'),
        author: t('enhanced_search_page.mock.articles.article_3.author'),
        publishDate: '2024-01-05',
        readTime: t('enhanced_search_page.mock.articles.article_3.read_time'),
        tags: [
          t('enhanced_search_page.mock.articles.article_3.tag_1'),
          t('enhanced_search_page.mock.articles.article_3.tag_2'),
          t('enhanced_search_page.mock.articles.article_3.tag_3')
        ],
        image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=300&h=200&fit=crop',
        views: 15230
      }
    ],
    qna: [
      {
        id: 1,
        question: t('enhanced_search_page.mock.qna.question_1.question'),
        excerpt: t('enhanced_search_page.mock.qna.question_1.excerpt'),
        author: 'Sarah Wilson',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
        answers: 15,
        views: 2340,
        tags: [
          t('enhanced_search_page.mock.qna.question_1.tag_1'),
          t('enhanced_search_page.mock.qna.question_1.tag_2'),
          t('enhanced_search_page.mock.qna.question_1.tag_3')
        ],
        isAnswered: true,
        votes: 23
      },
      {
        id: 2,
        question: t('enhanced_search_page.mock.qna.question_2.question'),
        excerpt: t('enhanced_search_page.mock.qna.question_2.excerpt'),
        author: 'Mike Johnson',
        authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        answers: 8,
        views: 1560,
        tags: [
          t('enhanced_search_page.mock.qna.question_2.tag_1'),
          t('enhanced_search_page.mock.qna.question_2.tag_2'),
          t('enhanced_search_page.mock.qna.question_2.tag_3')
        ],
        isAnswered: true,
        votes: 18
      },
      {
        id: 3,
        question: t('enhanced_search_page.mock.qna.question_3.question'),
        excerpt: t('enhanced_search_page.mock.qna.question_3.excerpt'),
        author: 'Alex Chen',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        answers: 22,
        views: 4560,
        tags: [
          t('enhanced_search_page.mock.qna.question_3.tag_1'),
          t('enhanced_search_page.mock.qna.question_3.tag_2'),
          t('enhanced_search_page.mock.qna.question_3.tag_3')
        ],
        isAnswered: true,
        votes: 35
      }
    ]
  }

  const popularSearches = {
    courses: [
      t('enhanced_search_page.popular.courses_1'),
      t('enhanced_search_page.popular.courses_2'),
      t('enhanced_search_page.popular.courses_3'),
      t('enhanced_search_page.popular.courses_4'),
      t('enhanced_search_page.popular.courses_5')
    ],
    instructors: ['Jonas Schmedtmann', 'Angela Yu', 'Maximilian Schwarzmuller'],
    articles: [
      t('enhanced_search_page.popular.articles_1'),
      t('enhanced_search_page.popular.articles_2'),
      t('enhanced_search_page.popular.articles_3')
    ],
    qna: [
      t('enhanced_search_page.popular.qna_1'),
      t('enhanced_search_page.popular.qna_2'),
      t('enhanced_search_page.popular.qna_3')
    ]
  }

  useEffect(() => {
    if (searchQuery.length > 1) {
      const allContent = [
        ...searchData.courses.map((course) => course.title),
        ...searchData.instructors.map((instructor) => instructor.name),
        ...searchData.articles.map((article) => article.title),
        ...searchData.qna.map((qa) => qa.question)
      ]
      const filtered = allContent.filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [searchData, searchQuery])

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setSearchQuery(query)
      setShowSuggestions(false)
      setRecentSearches((prev) => [query, ...prev.filter((item) => item !== query)].slice(0, 5))
      toast.success(t('enhanced_search_page.toasts.searching_for', { query }))
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  const getFilteredResults = () => {
    if (!searchQuery) return { courses: [], instructors: [], articles: [], qna: [] }
    const query = searchQuery.toLowerCase()

    return {
      courses: searchData.courses.filter((course) =>
        course.title.toLowerCase().includes(query) ||
        course.instructor.toLowerCase().includes(query) ||
        course.tags.some((tag) => tag.toLowerCase().includes(query))
      ),
      instructors: searchData.instructors.filter((instructor) =>
        instructor.name.toLowerCase().includes(query) ||
        instructor.expertise.some((skill) => skill.toLowerCase().includes(query))
      ),
      articles: searchData.articles.filter((article) =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.tags.some((tag) => tag.toLowerCase().includes(query))
      ),
      qna: searchData.qna.filter((qa) =>
        qa.question.toLowerCase().includes(query) ||
        qa.excerpt.toLowerCase().includes(query) ||
        qa.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }
  }

  const filteredResults = getFilteredResults()
  const totalResults = Object.values(filteredResults).reduce((sum, arr) => sum + arr.length, 0)

  const renderCourseCard = (course: any) => (
    <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="cursor-pointer" onClick={() => navigate(`/course/${course.id}`)}>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <div className="relative">
          <img src={course.image} alt={course.title} className="w-full h-40 object-cover rounded-t-lg" />
          {course.bestseller && <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">{t('enhanced_search_page.labels.bestseller')}</Badge>}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2 line-clamp-2">{course.title}</h3>
          <p className="text-sm text-muted-foreground mb-2">{course.instructor}</p>
          <div className="flex items-center mb-2">
            <div className="flex items-center">
              <span className="text-sm font-medium mr-1">{course.rating}</span>
              <div className="flex">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.floor(course.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
              </div>
              <span className="text-xs text-muted-foreground ml-1">({course.students.toLocaleString()})</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{course.duration}</span></div>
              <div className="flex items-center gap-1"><Users className="w-3 h-3" /><span>{course.level}</span></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold">${course.price}</span>
              <span className="text-sm text-muted-foreground line-through">${course.originalPrice}</span>
            </div>
            <Badge variant="outline">{course.category}</Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderInstructorCard = (instructor: any) => (
    <motion.div key={instructor.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="cursor-pointer" onClick={() => navigate(`/instructor/${instructor.id}`)}>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16"><img src={instructor.avatar} alt={instructor.name} /></Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{instructor.name}</h3>
                {instructor.verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{instructor.title}</p>
              <p className="text-sm mb-3">{instructor.bio}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /><span>{instructor.rating}</span></div>
                <div className="flex items-center gap-1"><Users className="w-4 h-4" /><span>{t('enhanced_search_page.labels.students_count', { count: instructor.students.toLocaleString() })}</span></div>
                <div className="flex items-center gap-1"><BookOpen className="w-4 h-4" /><span>{t('enhanced_search_page.labels.courses_count', { count: instructor.courses })}</span></div>
              </div>
              <div className="flex flex-wrap gap-1">
                {instructor.expertise.slice(0, 3).map((skill: string) => <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>)}
                {instructor.expertise.length > 3 && <Badge variant="outline" className="text-xs">{t('enhanced_search_page.labels.more_count', { count: instructor.expertise.length - 3 })}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  const renderArticleCard = (article: any) => (
    <motion.div key={article.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="cursor-pointer" onClick={() => navigate(`/blog/${article.id}`)}>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <div className="flex">
          <img src={article.image} alt={article.title} className="w-32 h-24 object-cover rounded-l-lg" />
          <CardContent className="p-4 flex-1">
            <h3 className="font-semibold mb-2 line-clamp-2">{article.title}</h3>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{article.excerpt}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-3">
                <span>{t('enhanced_search_page.labels.by_author', { author: article.author })}</span>
                <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /><span>{new Date(article.publishDate).toLocaleDateString()}</span></div>
                <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{article.readTime}</span></div>
              </div>
              <div className="flex items-center gap-1"><Eye className="w-3 h-3" /><span>{article.views.toLocaleString()}</span></div>
            </div>
            <div className="flex flex-wrap gap-1">
              {article.tags.slice(0, 3).map((tag: string) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  )

  const renderQnACard = (qa: any) => (
    <motion.div key={qa.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="cursor-pointer" onClick={() => navigate(`/qna/${qa.id}`)}>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10"><img src={qa.authorAvatar} alt={qa.author} /></Avatar>
            <div className="flex-1">
              <h3 className="font-semibold mb-2 line-clamp-2">{qa.question}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{qa.excerpt}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span>{t('enhanced_search_page.labels.by_author_lower', { author: qa.author })}</span>
                <div className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /><span>{t('enhanced_search_page.labels.answers_count', { count: qa.answers })}</span></div>
                <div className="flex items-center gap-1"><Eye className="w-4 h-4" /><span>{qa.views}</span></div>
                <div className="flex items-center gap-1"><TrendingUp className="w-4 h-4" /><span>{t('enhanced_search_page.labels.votes_count', { count: qa.votes })}</span></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {qa.tags.slice(0, 3).map((tag: string) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                </div>
                {qa.isAnswered && <div className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /><span className="text-xs">{t('enhanced_search_page.labels.answered')}</span></div>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="border-b bg-card" variants={fadeInUp} initial="hidden" animate="show">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder={t('enhanced_search_page.search_placeholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)} className="pl-10 pr-10 h-12 text-base" />
                {searchQuery && <Button variant="ghost" size="sm" onClick={clearSearch} className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"><X className="h-4 w-4" /></Button>}
              </div>
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50">
                    {suggestions.map((suggestion, index) => (
                      <button key={`${suggestion}-${index}`} onClick={() => handleSearch(suggestion)} className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg">
                        <div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><span>{suggestion}</span></div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-center mt-4"><Button onClick={() => handleSearch(searchQuery)} className="w-32">{t('enhanced_search_page.actions.search')}</Button></div>
          </div>
        </div>
      </motion.div>
      <motion.div className="max-w-7xl mx-auto px-4 py-8" variants={sectionStagger} initial="hidden" animate="show">
        {!searchQuery ? (
          <motion.div className="space-y-8" variants={fadeInUp}>
            <div className="text-center">
              <h1 className="mb-4">{t('enhanced_search_page.empty_state.title')}</h1>
              <p className="text-muted-foreground mb-8">{t('enhanced_search_page.empty_state.description')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="w-5 h-5 text-blue-500" />{t('enhanced_search_page.sections.popular_courses')}</CardTitle></CardHeader><CardContent><div className="space-y-2">{popularSearches.courses.map((term) => <button key={term} onClick={() => handleSearch(term)} className="block w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors">{term}</button>)}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><User className="w-5 h-5 text-green-500" />{t('enhanced_search_page.sections.top_instructors')}</CardTitle></CardHeader><CardContent><div className="space-y-2">{popularSearches.instructors.map((term) => <button key={term} onClick={() => handleSearch(term)} className="block w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors">{term}</button>)}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileText className="w-5 h-5 text-purple-500" />{t('enhanced_search_page.sections.popular_articles')}</CardTitle></CardHeader><CardContent><div className="space-y-2">{popularSearches.articles.map((term) => <button key={term} onClick={() => handleSearch(term)} className="block w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors">{term}</button>)}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><HelpCircle className="w-5 h-5 text-orange-500" />{t('enhanced_search_page.sections.trending_qna')}</CardTitle></CardHeader><CardContent><div className="space-y-2">{popularSearches.qna.map((term) => <button key={term} onClick={() => handleSearch(term)} className="block w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors">{term}</button>)}</div></CardContent></Card>
            </div>
            {recentSearches.length > 0 && <Card><CardHeader><CardTitle>{t('enhanced_search_page.sections.recent_searches')}</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{recentSearches.map((term) => <Badge key={term} variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => handleSearch(term)}>{term}</Badge>)}</div></CardContent></Card>}
          </motion.div>
        ) : (
          <motion.div className="space-y-6" variants={fadeInUp}>
            <div className="flex items-center justify-between">
              <h2>{totalResults > 0 ? t('enhanced_search_page.results.found', { count: totalResults, query: searchQuery }) : t('enhanced_search_page.results.not_found', { query: searchQuery })}</h2>
              {totalResults > 0 && <Button variant="outline" onClick={() => toast.info(t('enhanced_search_page.toasts.advanced_filters_coming_soon'))}><Filter className="w-4 h-4 mr-2" />{t('enhanced_search_page.actions.filters')}</Button>}
            </div>
            {totalResults > 0 && (
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SearchTab)} className="w-full">
                <TabsList className="relative grid w-full grid-cols-5 p-1">
                  <TabsTrigger value="all" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">{activeTab === 'all' && <motion.span layoutId="enhanced-search-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}<span className="relative z-10">{t('enhanced_search_page.tabs.all', { count: totalResults })}</span></TabsTrigger>
                  <TabsTrigger value="courses" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">{activeTab === 'courses' && <motion.span layoutId="enhanced-search-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}<span className="relative z-10">{t('enhanced_search_page.tabs.courses', { count: filteredResults.courses.length })}</span></TabsTrigger>
                  <TabsTrigger value="instructors" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">{activeTab === 'instructors' && <motion.span layoutId="enhanced-search-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}<span className="relative z-10">{t('enhanced_search_page.tabs.instructors', { count: filteredResults.instructors.length })}</span></TabsTrigger>
                  <TabsTrigger value="articles" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">{activeTab === 'articles' && <motion.span layoutId="enhanced-search-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}<span className="relative z-10">{t('enhanced_search_page.tabs.articles', { count: filteredResults.articles.length })}</span></TabsTrigger>
                  <TabsTrigger value="qna" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">{activeTab === 'qna' && <motion.span layoutId="enhanced-search-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}<span className="relative z-10">{t('enhanced_search_page.tabs.qna', { count: filteredResults.qna.length })}</span></TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="space-y-8">
                  {filteredResults.courses.length > 0 && <div><h3 className="text-lg font-semibold mb-4">{t('enhanced_search_page.headings.courses')}</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredResults.courses.slice(0, 3).map(renderCourseCard)}</div>{filteredResults.courses.length > 3 && <div className="text-center mt-4"><Button variant="outline" onClick={() => setActiveTab('courses')}>{t('enhanced_search_page.actions.view_all_courses', { count: filteredResults.courses.length })}<ChevronRight className="w-4 h-4 ml-1" /></Button></div>}</div>}
                  {filteredResults.instructors.length > 0 && <div><h3 className="text-lg font-semibold mb-4">{t('enhanced_search_page.headings.instructors')}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{filteredResults.instructors.slice(0, 2).map(renderInstructorCard)}</div>{filteredResults.instructors.length > 2 && <div className="text-center mt-4"><Button variant="outline" onClick={() => setActiveTab('instructors')}>{t('enhanced_search_page.actions.view_all_instructors', { count: filteredResults.instructors.length })}<ChevronRight className="w-4 h-4 ml-1" /></Button></div>}</div>}
                  {filteredResults.articles.length > 0 && <div><h3 className="text-lg font-semibold mb-4">{t('enhanced_search_page.headings.articles')}</h3><div className="space-y-4">{filteredResults.articles.slice(0, 3).map(renderArticleCard)}</div>{filteredResults.articles.length > 3 && <div className="text-center mt-4"><Button variant="outline" onClick={() => setActiveTab('articles')}>{t('enhanced_search_page.actions.view_all_articles', { count: filteredResults.articles.length })}<ChevronRight className="w-4 h-4 ml-1" /></Button></div>}</div>}
                  {filteredResults.qna.length > 0 && <div><h3 className="text-lg font-semibold mb-4">{t('enhanced_search_page.headings.qna')}</h3><div className="space-y-4">{filteredResults.qna.slice(0, 3).map(renderQnACard)}</div>{filteredResults.qna.length > 3 && <div className="text-center mt-4"><Button variant="outline" onClick={() => setActiveTab('qna')}>{t('enhanced_search_page.actions.view_all_qna', { count: filteredResults.qna.length })}<ChevronRight className="w-4 h-4 ml-1" /></Button></div>}</div>}
                </TabsContent>
                <TabsContent value="courses"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredResults.courses.map(renderCourseCard)}</div></TabsContent>
                <TabsContent value="instructors"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{filteredResults.instructors.map(renderInstructorCard)}</div></TabsContent>
                <TabsContent value="articles"><div className="space-y-4">{filteredResults.articles.map(renderArticleCard)}</div></TabsContent>
                <TabsContent value="qna"><div className="space-y-4">{filteredResults.qna.map(renderQnACard)}</div></TabsContent>
              </Tabs>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
